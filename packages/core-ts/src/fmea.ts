/**
 * FMEA scoring for falsification triggers, plus the defense-independence audit.
 *
 * Port of `tfg_core/fmea.py`. A one-dimensional MINOR/MAJOR/EXIT label answers
 * "how bad is it?" and ignores the two questions that decide whether a risk is
 * survivable: how likely is it, and how early would you see it coming?
 *
 * Detection is inverted relative to intuition: **1 means immediate, 10 means
 * undetectable.** Higher is worse, so RPN rises with poor detectability.
 */

export const SCORE_MIN = 1;
export const SCORE_MAX = 10;

/** Action band implied by a Risk Priority Number. */
export enum Priority {
  Low = 'LOW',
  Moderate = 'MODERATE',
  High = 'HIGH',
  Critical = 'CRITICAL',
  Extreme = 'EXTREME',
}

/** Defense-independence grade (the 'Swiss cheese' score). */
export enum Grade {
  A = 'A', B = 'B', C = 'C', D = 'D',
}

/** Upper bound of each RPN band, lowest first. The last is open-ended. */
export const RPN_BANDS: ReadonlyArray<readonly [number, Priority]> = [
  [50, Priority.Low],
  [150, Priority.Moderate],
  [300, Priority.High],
  [500, Priority.Critical],
  [Infinity, Priority.Extreme],
];

/** Recommended action per priority band. */
export const ACTIONS: Readonly<Record<Priority, string>> = {
  [Priority.Low]: 'Monitor passively. Check during scheduled scans.',
  [Priority.Moderate]: 'Active monitoring. Include in every scan.',
  [Priority.High]: 'Priority monitoring. Consider reducing position size preemptively.',
  [Priority.Critical]: 'Immediate action required. Re-run theory. Consider partial exit.',
  [Priority.Extreme]: 'This risk alone justifies not entering, or exiting, the position.',
};

/** Lower bound of each independence grade, highest first. */
export const GRADE_THRESHOLDS: ReadonlyArray<readonly [number, Grade]> = [
  [0.80, Grade.A],
  [0.60, Grade.B],
  [0.40, Grade.C],
  [0.0, Grade.D],
];

/** Detection score at or above which a trigger needs a leading indicator. */
export const POOR_DETECTION_THRESHOLD = 7;

/** Cluster size above which consolidation is recommended. */
export const CLUSTER_CONSOLIDATION_THRESHOLD = 2;

/** A falsification trigger scored on all three FMEA dimensions. */
export type Trigger = {
  readonly name: string;
  readonly severity: number;
  readonly occurrence: number;
  readonly detection: number;
  readonly cluster?: string;
};

/** A trigger with its derived scores resolved for serialisation. */
export type ScoredTrigger = {
  readonly name: string;
  readonly severity: number;
  readonly occurrence: number;
  readonly detection: number;
  readonly cluster: string;
  readonly rpn: number;
  readonly priority: string;
  readonly action: string;
  readonly needs_leading_indicator: boolean;
};

/** How many genuinely independent defence layers a trigger set provides. */
export type IndependenceAudit = {
  readonly n_triggers: number;
  readonly n_clusters: number;
  readonly independence: number;
  readonly grade: string;
  readonly clusters: Readonly<Record<string, readonly string[]>>;
  readonly redundant_clusters: readonly string[];
  readonly recommendations: readonly string[];
};

/** Validate a trigger's three dimensions, throwing on an out-of-range score. */
export function validate(trigger: Trigger): void {
  for (const field of ['severity', 'occurrence', 'detection'] as const) {
    const value = trigger[field];
    if (!(value >= SCORE_MIN && value <= SCORE_MAX)) {
      throw new Error(`${field} must be in [${SCORE_MIN}, ${SCORE_MAX}], got ${value}`);
    }
  }
}

/** Risk Priority Number: S x O x D, from 1 to 1000. */
export function rpn(trigger: Trigger): number {
  validate(trigger);
  return trigger.severity * trigger.occurrence * trigger.detection;
}

/**
 * Whether poor detectability is this trigger's dominant problem.
 *
 * A severe, likely risk you can see coming is manageable. One you cannot see
 * coming needs an earlier proxy, not a tighter threshold.
 */
export function needsLeadingIndicator(trigger: Trigger): boolean {
  return trigger.detection >= POOR_DETECTION_THRESHOLD;
}

/** Map an RPN onto its action band. */
export function priorityFor(value: number): Priority {
  for (const [upper, priority] of RPN_BANDS) {
    if (value <= upper) return priority;
  }
  return Priority.Extreme;
}

/** Map an independence ratio onto its letter grade. */
export function gradeFor(independence: number): Grade {
  for (const [threshold, grade] of GRADE_THRESHOLDS) {
    if (independence >= threshold) return grade;
  }
  return Grade.D;
}

/** Resolve a trigger's derived fields. */
export function scoreTrigger(trigger: Trigger): ScoredTrigger {
  const value = rpn(trigger);
  const priority = priorityFor(value);
  return {
    name: trigger.name,
    severity: trigger.severity,
    occurrence: trigger.occurrence,
    detection: trigger.detection,
    cluster: trigger.cluster ?? '',
    rpn: value,
    priority,
    action: ACTIONS[priority],
    needs_leading_indicator: needsLeadingIndicator(trigger),
  };
}

/** Score and sort triggers by RPN, highest risk first. */
export function rank(triggers: readonly Trigger[]): ScoredTrigger[] {
  return triggers
    .map((t, i) => ({ scored: scoreTrigger(t), i }))
    .sort((a, b) => b.scored.rpn - a.scored.rpn || a.i - b.i)
    .map(({ scored }) => scored);
}

/**
 * Grade a trigger set on how independent its defence layers really are.
 *
 * Seven triggers that all fire on the same earnings miss are one layer, not
 * seven. Triggers with no declared cluster are each treated as their own, since
 * an unclassified trigger cannot be shown to be redundant.
 */
export function auditIndependence(triggers: readonly Trigger[]): IndependenceAudit {
  const clusters = new Map<string, string[]>();
  triggers.forEach((trigger, i) => {
    validate(trigger);
    const key = trigger.cluster || `__unclustered_${i}`;
    const members = clusters.get(key);
    if (members) members.push(trigger.name);
    else clusters.set(key, [trigger.name]);
  });

  const nTriggers = triggers.length;
  const nClusters = clusters.size;
  const independence = nTriggers ? nClusters / nTriggers : 0;
  const grade = gradeFor(independence);

  const redundant: string[] = [];
  for (const [name, members] of clusters) {
    if (members.length > CLUSTER_CONSOLIDATION_THRESHOLD && !name.startsWith('__unclustered_')) {
      redundant.push(name);
    }
  }

  const recommendations: string[] = [];
  for (const name of redundant) {
    const members = clusters.get(name)!;
    const inCluster = triggers.filter((t) => members.includes(t.name));
    const best = inCluster.reduce((a, b) => (b.detection < a.detection ? b : a));
    recommendations.push(
      `Consolidate the ${name} cluster (${members.length} triggers): keep ${best.name} ` +
      `(best detection at D=${best.detection}), relax the rest.`,
    );
  }
  if (grade === Grade.C || grade === Grade.D) {
    recommendations.push(
      'Add triggers from under-represented event types — the current set is ' +
      'effectively a single-layer defence.',
    );
  }
  for (const trigger of triggers) {
    if (needsLeadingIndicator(trigger)) {
      recommendations.push(
        `${trigger.name} has poor detectability (D=${trigger.detection}); find a leading indicator.`,
      );
    }
  }

  const publicClusters: Record<string, readonly string[]> = {};
  for (const [name, members] of clusters) {
    if (!name.startsWith('__unclustered_')) publicClusters[name] = members;
  }

  return {
    n_triggers: nTriggers,
    n_clusters: nClusters,
    independence,
    grade,
    clusters: publicClusters,
    redundant_clusters: redundant,
    recommendations,
  };
}
