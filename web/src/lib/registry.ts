/**
 * The gallery index.
 *
 * One entry per plate, grouped the way the system itself is grouped: the
 * gauntlet's own stages first, then the epistemics that audit them, then the
 * market-data tools. `kind` records whether a plate recomputes live from
 * `@tfg/core` or renders a bundled sample, which the UI labels honestly.
 */

/** Whether a plate computes live or renders bundled sample data. */
export enum Kind {
  /** Recomputes from @tfg/core on every interaction. */
  Live = 'live',
  /** Driven by a bundled snapshot, because the real input needs market data. */
  Sample = 'sample',
}

/** Which stage of the system a plate belongs to. */
export enum Group {
  Valuation = 'Valuation & uncertainty',
  Epistemics = 'Epistemics',
  Risk = 'Risk & sizing',
  Fundamentals = 'Fundamentals & factors',
  Process = 'Process & portfolio',
}

export type Entry = {
  readonly slug: string;
  readonly title: string;
  /** One line on what the plate shows, for the index cards. */
  readonly blurb: string;
  readonly group: Group;
  readonly kind: Kind;
  /** The tool or doc this plate visualises. */
  readonly origin: string;
};

export const ENTRIES: readonly Entry[] = [
  // --- Valuation & uncertainty -------------------------------------------
  {
    slug: 'monte-carlo-ev',
    title: 'Monte Carlo EV',
    blurb: 'Expected value as a distribution, not a point estimate — and whether its interval straddles zero.',
    group: Group.Valuation,
    kind: Kind.Live,
    origin: 'tools/monte_carlo_ev.py',
  },
  {
    slug: 'options-implied',
    title: 'Options-implied probability',
    blurb: 'What the options market is already pricing for each scenario, instead of an asserted guess.',
    group: Group.Valuation,
    kind: Kind.Live,
    origin: 'tools/options_implied_prob.py',
  },
  {
    slug: 'sensitivity-tornado',
    title: 'Sensitivity tornado',
    blurb: 'Which input actually drives expected value, ranked by how far it moves when perturbed alone.',
    group: Group.Valuation,
    kind: Kind.Live,
    origin: 'tools/sensitivity_tornado.py',
  },
  {
    slug: 'fermi-matrix',
    title: 'Revenue × multiple matrix',
    blurb: 'The valuation grid every EV estimate comes from, with each cell’s contribution made visible.',
    group: Group.Valuation,
    kind: Kind.Live,
    origin: 'theory/fermi-decomposition.md',
  },

  // --- Epistemics --------------------------------------------------------
  {
    slug: 'bayesian-chain',
    title: 'Bayesian posterior chain',
    blurb: 'A posterior accumulating evidence, carrying its confidence interval through every update.',
    group: Group.Epistemics,
    kind: Kind.Live,
    origin: 'tools/ci_propagation.py',
  },
  {
    slug: 'lens-reliability',
    title: 'Lens reliability',
    blurb: 'Why a SUPPORTS verdict from an 80%-accurate lens is worth 59%, not 80%, when most theories fail.',
    group: Group.Epistemics,
    kind: Kind.Live,
    origin: 'theory/lens-reliability.md',
  },
  {
    slug: 'information-content',
    title: 'Shannon information content',
    blurb: 'Evidence measured in bits — and the threshold below which it may not enter the chain at all.',
    group: Group.Epistemics,
    kind: Kind.Live,
    origin: 'theory/information-content.md',
  },
  {
    slug: 'calibration',
    title: 'Calibration & Brier score',
    blurb: 'Whether things forecast at 70% actually happen 70% of the time, on a reliability diagram.',
    group: Group.Epistemics,
    kind: Kind.Live,
    origin: 'tools/calibration.py',
  },
  {
    slug: 'pre-registration',
    title: 'Pre-registration drift',
    blurb: 'Catching motivated reasoning by committing to an expected posterior before the analysis runs.',
    group: Group.Epistemics,
    kind: Kind.Live,
    origin: 'tools/pre_register.py',
  },
  {
    slug: 'intuition-tracker',
    title: 'Intuition vs model',
    blurb: 'Whether overriding the model with judgement made the estimate better or worse.',
    group: Group.Epistemics,
    kind: Kind.Sample,
    origin: 'tools/intuition_tracker.py',
  },
  {
    slug: 'question-generator',
    title: 'Free-parameter extraction',
    blurb: 'The model’s open parameters, classified and dependency-checked before anyone is asked about them.',
    group: Group.Epistemics,
    kind: Kind.Sample,
    origin: 'tools/question_generator.py',
  },
  {
    slug: 'edge-questions',
    title: 'Edge mapping',
    blurb: 'Questions about the analyst’s own world, mapped onto the tickers each answer bears on.',
    group: Group.Epistemics,
    kind: Kind.Sample,
    origin: 'tools/edge_questions.py',
  },

  // --- Risk & sizing -----------------------------------------------------
  {
    slug: 'kelly-gate',
    title: 'Kelly gate',
    blurb: 'The growth-optimal fraction, used as a binary entry gate — and why overbetting ruins you.',
    group: Group.Risk,
    kind: Kind.Live,
    origin: 'sizing/kelly.md',
  },
  {
    slug: 'black-litterman',
    title: 'Black-Litterman',
    blurb: 'Market equilibrium blended with explicit views, weighted by how confident each view is.',
    group: Group.Risk,
    kind: Kind.Live,
    origin: 'tools/portfolio_optimizer.py',
  },
  {
    slug: 'fmea-risk',
    title: 'FMEA risk cube',
    blurb: 'Severity × occurrence × detection — because the risk that kills you is the one you can’t see coming.',
    group: Group.Risk,
    kind: Kind.Live,
    origin: 'parameters/fmea-scoring.md',
  },
  {
    slug: 'defense-independence',
    title: 'Defense independence',
    blurb: 'Seven triggers that all fire on one earnings miss are one defence layer, not seven.',
    group: Group.Risk,
    kind: Kind.Live,
    origin: 'parameters/defense-independence.md',
  },
  {
    slug: 'parameter-monitor',
    title: 'Parameter monitoring',
    blurb: 'Update rules written before the data arrives, so the reading can’t be rationalised after it.',
    group: Group.Risk,
    kind: Kind.Sample,
    origin: 'tools/parameter_monitor.py',
  },

  // --- Fundamentals & factors -------------------------------------------
  {
    slug: 'piotroski',
    title: 'Piotroski F-Score',
    blurb: 'Nine binary accounting signals, scored without the chance to weight whichever one flatters the thesis.',
    group: Group.Fundamentals,
    kind: Kind.Live,
    origin: 'tools/piotroski_fscore.py',
  },
  {
    slug: 'factor-decomposition',
    title: 'Factor decomposition',
    blurb: 'Fama-French exposures: are these positions diversified, or the same factor three times?',
    group: Group.Fundamentals,
    kind: Kind.Sample,
    origin: 'tools/factor_decomposition.py',
  },
  {
    slug: 'stock-screener',
    title: 'Universe screening',
    blurb: 'Filtering a universe down to the names where a specific analytical edge is strongest.',
    group: Group.Fundamentals,
    kind: Kind.Sample,
    origin: 'tools/stock_screener.py',
  },
  {
    slug: 'earnings-language',
    title: 'Earnings-call language',
    blurb: 'Tracking how hyperscaler capex language shifts quarter over quarter, as a leading indicator.',
    group: Group.Fundamentals,
    kind: Kind.Sample,
    origin: 'tools/earnings_language.py',
  },

  // --- Process & portfolio ----------------------------------------------
  {
    slug: 'position-lifecycle',
    title: 'Position lifecycle',
    blurb: 'The state machine every position moves through, with the rules that gate each transition.',
    group: Group.Process,
    kind: Kind.Sample,
    origin: 'tools/lifecycle.py',
  },
  {
    slug: 'portfolio-dashboard',
    title: 'Portfolio & theory status',
    blurb: 'Positions, P&L, and how stale each theory card has become.',
    group: Group.Process,
    kind: Kind.Sample,
    origin: 'tools/portfolio_dashboard.py',
  },
  {
    slug: 'post-mortem',
    title: 'Post-mortem meta-analysis',
    blurb: 'What closed positions reveal across the book, once every one gets a structured review.',
    group: Group.Process,
    kind: Kind.Sample,
    origin: 'tools/post_mortem.py',
  },
  {
    slug: 'mosaic-update',
    title: 'Weekly mosaic',
    blurb: 'Every data stream for an active thesis, synthesised into one weekly signal.',
    group: Group.Process,
    kind: Kind.Sample,
    origin: 'tools/mosaic_update.py',
  },
];

/** Groups in display order. */
export const GROUP_ORDER: readonly Group[] = [
  Group.Valuation,
  Group.Epistemics,
  Group.Risk,
  Group.Fundamentals,
  Group.Process,
];

/** Entries belonging to one group, in registry order. */
export function entriesIn(group: Group): readonly Entry[] {
  return ENTRIES.filter((entry) => entry.group === group);
}

/** Look up one entry by slug. */
export function findEntry(slug: string): Entry | undefined {
  return ENTRIES.find((entry) => entry.slug === slug);
}

/** How many plates recompute live. */
export const LIVE_COUNT = ENTRIES.filter((e) => e.kind === Kind.Live).length;
