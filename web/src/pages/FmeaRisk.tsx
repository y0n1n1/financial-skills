/**
 * FMEA risk scoring for falsification triggers.
 *
 * The chart puts occurrence on one axis and detection on the other, with severity
 * as area. The top-right corner — likely and invisible — is where positions die,
 * and a severity-only view cannot show you that corner at all.
 */

import { useMemo, useState } from 'react';

import { fmea } from '@tfg/core';
import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, Tooltip, plotArea, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { ControlRow, ResetButton, Slider } from '../controls/Controls';
import { linear } from '../charts/scale';

const WIDTH = 620;
const HEIGHT = 430;
const MARGINS = { top: 20, right: 28, bottom: 50, left: 58 };

const BASE_TRIGGERS: readonly fmea.Trigger[] = [
  { name: 'Revenue deceleration', severity: 7, occurrence: 5, detection: 4, cluster: 'EARNINGS' },
  { name: 'Margin compression', severity: 6, occurrence: 4, detection: 4, cluster: 'EARNINGS' },
  { name: 'Earnings miss', severity: 5, occurrence: 5, detection: 5, cluster: 'EARNINGS' },
  { name: 'Price breaks 200DMA', severity: 4, occurrence: 6, detection: 1, cluster: 'PRICE' },
  { name: 'Competitor reaches parity', severity: 9, occurrence: 3, detection: 8, cluster: 'COMPETITIVE' },
  { name: 'Rate shock', severity: 6, occurrence: 3, detection: 2, cluster: 'MACRO' },
  { name: 'Hidden liability', severity: 10, occurrence: 2, detection: 10, cluster: 'ACCOUNTING' },
];

export default function FmeaRisk() {
  const [extraSeverity, setExtraSeverity] = useState(9);
  const [extraOccurrence, setExtraOccurrence] = useState(3);
  const [extraDetection, setExtraDetection] = useState(8);

  const triggers = useMemo(
    () =>
      BASE_TRIGGERS.map((t) =>
        t.name === 'Competitor reaches parity'
          ? { ...t, severity: extraSeverity, occurrence: extraOccurrence, detection: extraDetection }
          : t,
      ),
    [extraSeverity, extraOccurrence, extraDetection],
  );

  const ranked = useMemo(() => fmea.rank(triggers), [triggers]);

  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const x = linear([0.5, 10.5], [area.left, area.right]);
  const y = linear([0.5, 10.5], [area.bottom, area.top]);

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<string | null>(null);

  const worst = ranked[0];
  const undetectable = ranked.filter((t) => t.needs_leading_indicator);

  /** Colour by priority band — a reserved status ramp, never a series colour. */
  const priorityColor = (priority: string) =>
    priority === fmea.Priority.Extreme || priority === fmea.Priority.Critical
      ? 'var(--status-critical)'
      : priority === fmea.Priority.High
        ? 'var(--status-serious)'
        : priority === fmea.Priority.Moderate
          ? 'var(--status-warning)'
          : 'var(--status-good)';

  return (
    <Plate
      title="FMEA risk cube"
      question="Which failure mode deserves attention — the severe one, or the one you won't see coming?"
      source="parameters/fmea-scoring.md"
    >
      <ControlRow>
        <Slider label="“Competitor parity” severity" value={extraSeverity} min={1} max={10} step={1} onChange={setExtraSeverity} format={(v) => `${v}`} />
        <Slider label="…occurrence" value={extraOccurrence} min={1} max={10} step={1} onChange={setExtraOccurrence} format={(v) => `${v}`} />
        <Slider label="…detection (10 = invisible)" value={extraDetection} min={1} max={10} step={1} onChange={setExtraDetection} format={(v) => `${v}`} hint="Higher is worse" />
        <ResetButton
          onClick={() => {
            setExtraSeverity(9);
            setExtraOccurrence(3);
            setExtraDetection(8);
          }}
        />
      </ControlRow>

      <Readouts
        items={[
          { label: 'Highest RPN', value: `${worst?.rpn ?? 0}`, tone: 'critical', hint: worst?.name },
          { label: 'Priority', value: worst?.priority ?? '—' },
          { label: 'Need leading indicators', value: `${undetectable.length}` },
          { label: 'Triggers', value: `${ranked.length}` },
        ]}
      />

      <Figure
        caption="Occurrence against detection, with severity as marker area. Detection is inverted — 10 means you will not see it until the damage is done."
        table={
          <DataTable
            columns={['Trigger', 'S', 'O', 'D', 'RPN', 'Priority', 'Action']}
            align={['left', 'right', 'right', 'right', 'right', 'left', 'left']}
            rows={ranked.map((t) => [t.name, t.severity, t.occurrence, t.detection, t.rpn, t.priority, t.action])}
          />
        }
      >
        <div
          ref={wrapperRef}
          style={{ position: 'relative' }}
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            onPointerLeave();
            setHover(null);
          }}
        >
          <Plot
            width={WIDTH}
            height={HEIGHT}
            margins={MARGINS}
            x={x}
            y={y}
            title="Failure modes plotted by occurrence and detection, sized by severity"
            xLabel="Occurrence — how likely"
            yLabel="Detection — how late you find out"
            formatX={(v) => (Number.isInteger(v) ? `${v}` : '')}
            formatY={(v) => (Number.isInteger(v) ? `${v}` : '')}
            xTicks={10}
            yTicks={10}
          >
            {/* The killing field: likely and invisible. */}
            <rect
              x={x(5.5)}
              y={area.top}
              width={area.right - x(5.5)}
              height={y(5.5) - area.top}
              fill="var(--status-critical)"
              opacity={0.08}
            />
            <text x={area.right - 8} y={area.top + 15} textAnchor="end" fontSize={10.5} fill="var(--status-critical)">
              likely and invisible
            </text>

            {ranked.map((t, index) => {
              const radius = 5 + t.severity * 1.5;
              const active = hover === null || hover === t.name;
              // Labels sit above their marker by default, but markers can land
              // close enough for the text to collide. Any marker with an earlier
              // neighbour nearby flips its label underneath instead.
              const collides = ranked
                .slice(0, index)
                .some(
                  (other) =>
                    Math.abs(x(other.occurrence) - x(t.occurrence)) < 92 &&
                    Math.abs(y(other.detection) - y(t.detection)) < 24,
                );
              const labelY = collides
                ? y(t.detection) + radius + 13
                : y(t.detection) - radius - 5;
              return (
                <g key={t.name}>
                  <circle
                    cx={x(t.occurrence)}
                    cy={y(t.detection)}
                    r={radius}
                    fill={priorityColor(t.priority)}
                    opacity={active ? 0.55 : 0.2}
                    stroke="var(--surface-1)"
                    strokeWidth={2}
                    onPointerEnter={() => setHover(t.name)}
                  />
                  {/* Direct label: status colour never carries meaning alone. */}
                  <text
                    x={x(t.occurrence)}
                    y={labelY}
                    textAnchor="middle"
                    fontSize={10}
                    fill={active ? 'var(--text-secondary)' : 'var(--text-muted)'}
                  >
                    {t.name.length > 20 ? `${t.name.slice(0, 19)}…` : t.name}
                  </text>
                  <text
                    x={x(t.occurrence)}
                    y={y(t.detection)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
                    fontWeight={600}
                    fill="var(--text-primary)"
                    style={{ fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}
                  >
                    {t.rpn}
                  </text>
                </g>
              );
            })}
          </Plot>

          {anchor && hover && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 210)}
              heading={hover}
              rows={(() => {
                const t = ranked.find((r) => r.name === hover)!;
                return [
                  { label: 'Severity', value: `${t.severity}` },
                  { label: 'Occurrence', value: `${t.occurrence}` },
                  { label: 'Detection', value: `${t.detection}` },
                  { label: 'RPN', value: `${t.rpn}`, color: priorityColor(t.priority) },
                  { label: 'Priority', value: t.priority },
                ];
              })()}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'Low', color: 'var(--status-good)' },
            { label: 'Moderate', color: 'var(--status-warning)' },
            { label: 'High', color: 'var(--status-serious)' },
            { label: 'Critical / Extreme', color: 'var(--status-critical)' },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          Drag <strong>detection</strong> on “competitor parity” from 8 down to 1 — imagine you
          found a leading indicator that gives a quarter's warning. Severity and likelihood are
          unchanged; the company is in exactly the same danger. But the RPN collapses and the
          trigger drops down the ranking, because a risk you can see coming is a risk you can act on.
        </p>
        <p>
          That is the dimension a MINOR/MAJOR/EXIT label throws away. “Hidden liability” has the
          highest severity on the board and only a 2 for likelihood, yet it ranks at the top
          because detection is 10 — by the time it shows up, the damage is done. No threshold
          tightening helps; only a different kind of monitoring does.
        </p>
        <p>
          The shaded corner is where positions actually die: things that are both likely and
          invisible. A trigger set with nothing in that corner is not necessarily safe — it may
          just not be looking there.
        </p>
      </Note>
    </Plate>
  );
}
