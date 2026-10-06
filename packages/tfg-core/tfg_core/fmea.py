"""FMEA scoring for falsification triggers, plus the defense-independence audit.

Borrowed from reliability engineering. A one-dimensional MINOR/MAJOR/EXIT label
answers "how bad is it?" and ignores the two questions that decide whether a risk
is survivable: how likely is it, and how early would you see it coming?

The dangerous risk is rarely the severe one. It is the moderate one that is
invisible until too late — which is why Detection is scored at all, and why high-D
triggers are the ones worth finding leading indicators for.

Detection is inverted relative to intuition: **1 means immediate, 10 means
undetectable.** Higher is worse, so RPN rises with poor detectability.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

#: Valid range for each FMEA dimension.
SCORE_MIN = 1
SCORE_MAX = 10


class Priority(str, Enum):
    """Action band implied by a Risk Priority Number."""

    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    EXTREME = "EXTREME"


class Grade(str, Enum):
    """Defense-independence grade (the 'Swiss cheese' score)."""

    A = "A"
    B = "B"
    C = "C"
    D = "D"


#: Upper bound of each RPN band, lowest first. The last band is open-ended.
RPN_BANDS: tuple[tuple[float, Priority], ...] = (
    (50, Priority.LOW),
    (150, Priority.MODERATE),
    (300, Priority.HIGH),
    (500, Priority.CRITICAL),
    (float("inf"), Priority.EXTREME),
)

#: Recommended action per priority band.
ACTIONS: dict[Priority, str] = {
    Priority.LOW: "Monitor passively. Check during scheduled scans.",
    Priority.MODERATE: "Active monitoring. Include in every scan.",
    Priority.HIGH: "Priority monitoring. Consider reducing position size preemptively.",
    Priority.CRITICAL: "Immediate action required. Re-run theory. Consider partial exit.",
    Priority.EXTREME: "This risk alone justifies not entering, or exiting, the position.",
}

#: Lower bound of each independence grade, highest first.
GRADE_THRESHOLDS: tuple[tuple[float, Grade], ...] = (
    (0.80, Grade.A),
    (0.60, Grade.B),
    (0.40, Grade.C),
    (0.0, Grade.D),
)

#: Detection score at or above which a trigger needs a leading indicator.
POOR_DETECTION_THRESHOLD = 7

#: Cluster size above which consolidation is recommended.
CLUSTER_CONSOLIDATION_THRESHOLD = 2


@dataclass(frozen=True, slots=True)
class Trigger:
    """A falsification trigger scored on all three FMEA dimensions."""

    name: str
    severity: int
    occurrence: int
    detection: int
    cluster: str = ""

    def __post_init__(self) -> None:
        for field_name, value in (
            ("severity", self.severity),
            ("occurrence", self.occurrence),
            ("detection", self.detection),
        ):
            if not SCORE_MIN <= value <= SCORE_MAX:
                raise ValueError(
                    f"{field_name} must be in [{SCORE_MIN}, {SCORE_MAX}], got {value}"
                )

    @property
    def rpn(self) -> int:
        """Risk Priority Number: S x O x D, from 1 to 1000."""
        return self.severity * self.occurrence * self.detection

    @property
    def priority(self) -> Priority:
        """Action band for this trigger's RPN."""
        return priority_for(self.rpn)

    @property
    def needs_leading_indicator(self) -> bool:
        """Whether poor detectability is this trigger's dominant problem.

        A severe, likely risk you can see coming is manageable. One you cannot
        see coming needs an earlier proxy, not a tighter threshold.
        """
        return self.detection >= POOR_DETECTION_THRESHOLD


@dataclass(frozen=True, slots=True)
class ScoredTrigger:
    """A trigger with its derived scores resolved for serialisation."""

    name: str
    severity: int
    occurrence: int
    detection: int
    cluster: str
    rpn: int
    priority: str
    action: str
    needs_leading_indicator: bool


@dataclass(frozen=True, slots=True)
class IndependenceAudit:
    """How many genuinely independent defence layers a trigger set provides."""

    n_triggers: int
    n_clusters: int
    independence: float
    grade: str
    clusters: dict[str, list[str]]
    redundant_clusters: list[str]
    recommendations: list[str]


def priority_for(rpn: float) -> Priority:
    """Map an RPN onto its action band."""
    for upper, priority in RPN_BANDS:
        if rpn <= upper:
            return priority
    return Priority.EXTREME


def grade_for(independence: float) -> Grade:
    """Map an independence ratio onto its letter grade."""
    for threshold, grade in GRADE_THRESHOLDS:
        if independence >= threshold:
            return grade
    return Grade.D


def score_trigger(trigger: Trigger) -> ScoredTrigger:
    """Resolve a trigger's derived fields."""
    priority = trigger.priority
    return ScoredTrigger(
        name=trigger.name,
        severity=trigger.severity,
        occurrence=trigger.occurrence,
        detection=trigger.detection,
        cluster=trigger.cluster,
        rpn=trigger.rpn,
        priority=priority.value,
        action=ACTIONS[priority],
        needs_leading_indicator=trigger.needs_leading_indicator,
    )


def rank(triggers: list[Trigger]) -> list[ScoredTrigger]:
    """Score and sort triggers by RPN, highest risk first."""
    return sorted(
        (score_trigger(t) for t in triggers), key=lambda s: s.rpn, reverse=True,
    )


def audit_independence(triggers: list[Trigger]) -> IndependenceAudit:
    """Grade a trigger set on how independent its defence layers really are.

    Seven triggers that all fire on the same earnings miss are one layer, not
    seven. Independence is the count of distinct clusters over the count of
    triggers — the 'Swiss cheese' score, where overlapping holes stop being
    separate defences.

    Triggers with no declared cluster are each treated as their own, since an
    unclassified trigger cannot be shown to be redundant.
    """
    clusters: dict[str, list[str]] = {}
    for i, trigger in enumerate(triggers):
        key = trigger.cluster or f"__unclustered_{i}"
        clusters.setdefault(key, []).append(trigger.name)

    n_triggers = len(triggers)
    n_clusters = len(clusters)
    independence = n_clusters / n_triggers if n_triggers else 0.0
    grade = grade_for(independence)

    redundant = [
        name for name, members in clusters.items()
        if len(members) > CLUSTER_CONSOLIDATION_THRESHOLD
        and not name.startswith("__unclustered_")
    ]

    recommendations: list[str] = []
    for name in redundant:
        members = clusters[name]
        best = min(
            (t for t in triggers if t.name in members), key=lambda t: t.detection,
        )
        recommendations.append(
            f"Consolidate the {name} cluster ({len(members)} triggers): keep "
            f"{best.name} (best detection at D={best.detection}), relax the rest."
        )
    if grade in (Grade.C, Grade.D):
        recommendations.append(
            "Add triggers from under-represented event types — the current set is "
            "effectively a single-layer defence."
        )
    for trigger in triggers:
        if trigger.needs_leading_indicator:
            recommendations.append(
                f"{trigger.name} has poor detectability (D={trigger.detection}); "
                "find a leading indicator."
            )

    return IndependenceAudit(
        n_triggers=n_triggers,
        n_clusters=n_clusters,
        independence=independence,
        grade=grade.value,
        clusters={k: v for k, v in clusters.items() if not k.startswith("__unclustered_")},
        redundant_clusters=redundant,
        recommendations=recommendations,
    )
