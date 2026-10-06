/**
 * Calibration and Brier scoring: a reliability diagram.
 *
 * The diagonal is perfect calibration. Where the dots sit relative to it is the
 * only honest answer to "are my probabilities any good" — and it is a question
 * most forecasters never let themselves be asked.
 */

import { useMemo, useState } from 'react';

import { calibration, random } from '@tfg/core';
import { DataTable, Figure, Flag, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, Tooltip, plotArea, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { ControlRow, ResetButton, Segmented, Slider } from '../controls/Controls';
import { fixed, pct } from '../charts/format';
import { linear } from '../charts/scale';

const WIDTH = 560;
const HEIGHT = 420;
const MARGINS = { top: 18, right: 22, bottom: 48, left: 56 };

/** Forecaster archetypes, each a different way of being wrong. */
enum Archetype {
  Calibrated = 'calibrated',
  Overconfident = 'overconfident',
  Underconfident = 'underconfident',
  Clueless = 'clueless',
}

const ARCHETYPES = [
  { value: Archetype.Calibrated, label: 'Calibrated' },
  { value: Archetype.Overconfident, label: 'Overconfident' },
  { value: Archetype.Underconfident, label: 'Cautious' },
  { value: Archetype.Clueless, label: 'Noise' },
] as const;

/**
 * Generate a synthetic track record for an archetype.
 *
 * Seeded, so the diagram is stable while a slider moves — a reshuffling chart
 * would make the effect of the slider impossible to see.
 */
function generate(archetype: Archetype, n: number, seed: number): calibration.Forecast[] {
  const rng = random.createRng(seed);
  const forecasts: calibration.Forecast[] = [];

  for (let i = 0; i < n; i++) {
    const stated = 0.05 + rng.next() * 0.9;
    // True probability behind the stated one, per archetype.
    const trueP =
      archetype === Archetype.Calibrated
        ? stated
        : archetype === Archetype.Overconfident
          ? 0.5 + (stated - 0.5) * 0.45
          : archetype === Archetype.Underconfident
            ? Math.min(0.98, Math.max(0.02, 0.5 + (stated - 0.5) * 1.5))
            : 0.5;
    forecasts.push({ probability: stated, outcome: rng.next() < trueP ? 1 : 0 });
  }
  return forecasts;
}

export default function Calibration() {
  const [archetype, setArchetype] = useState<Archetype>(Archetype.Overconfident);
  const [n, setN] = useState(160);

  const forecasts = useMemo(() => generate(archetype, n, 11), [archetype, n]);
  const report = useMemo(() => calibration.scoreCalibration(forecasts), [forecasts]);

  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const x = linear([0, 1], [area.left, area.right]);
  const y = linear([0, 1], [area.bottom, area.top]);

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<number | null>(null);

  return (
    <Plate
      title="Calibration & Brier score"
      question="Do the things forecast at 70% actually happen about 70% of the time?"
      source="tools/calibration.py"
    >
      <ControlRow>
        <Segmented
          label="Forecaster"
          value={archetype}
          options={ARCHETYPES.map((a) => ({ value: a.value as string, label: a.label }))}
          onChange={(v) => setArchetype(v as Archetype)}
        />
        <Slider
          label="Resolved forecasts"
          value={n}
          min={10}
          max={600}
          step={10}
          onChange={setN}
          format={(v) => `${v}`}
          hint="Calibration needs a track record"
        />
        <ResetButton
          onClick={() => {
            setArchetype(Archetype.Overconfident);
            setN(160);
          }}
        />
      </ControlRow>

      <Readouts
        items={[
          {
            label: 'Mean Brier',
            value: fixed(report.mean_brier, 4),
            tone:
              report.mean_brier < calibration.GOOD_BRIER
                ? 'good'
                : report.mean_brier < calibration.UNINFORMED_BRIER
                  ? 'warning'
                  : 'critical',
          },
          { label: 'Verdict', value: report.verdict },
          { label: 'Resolved', value: `${report.n_resolved}` },
          {
            label: 'Overconfident',
            value: report.overconfident ? 'yes' : 'no',
            tone: report.overconfident ? 'critical' : 'good',
          },
        ]}
      />

      {report.overconfident && <Flag tone="critical">{report.overconfidence_detail}</Flag>}
      {report.mean_brier >= calibration.UNINFORMED_BRIER && (
        <Flag tone="warning">
          A mean Brier of {fixed(report.mean_brier, 4)} is at or above 0.25 — the score you would
          get by saying “50%” to everything. These forecasts are carrying less information than a
          coin flip, whatever confidence they were stated with.
        </Flag>
      )}

      <Figure
        caption="Each dot is a confidence bucket: stated probability against how often those forecasts came true. Dot area is the number of forecasts in the bucket."
        table={
          <DataTable
            columns={['Bucket', 'Count', 'Avg forecast', 'Actual rate', 'Gap', 'Calibrated']}
            rows={report.buckets.map((b) => [
              `${pct(b.low)}–${pct(Math.min(1, b.high))}`,
              b.count,
              pct(b.avg_forecast),
              pct(b.actual_rate),
              `${b.gap >= 0 ? '+' : ''}${pct(b.gap)}`,
              b.calibrated ? 'yes' : 'no',
            ])}
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
            title="Reliability diagram: stated probability against observed frequency"
            xLabel="Stated probability"
            yLabel="Observed frequency"
            formatX={(v) => pct(v)}
            formatY={(v) => pct(v)}
          >
            {/* Perfect calibration. */}
            <line
              x1={x(0)}
              x2={x(1)}
              y1={y(0)}
              y2={y(1)}
              stroke="var(--text-primary)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <text x={x(0.72)} y={y(0.78)} fontSize={10.5} fill="var(--text-secondary)" transform={`rotate(-45 ${x(0.72)} ${y(0.78)})`}>
              perfect calibration
            </text>

            {report.buckets.map((bucket, i) => {
              const radius = Math.min(18, 5 + Math.sqrt(bucket.count) * 1.5);
              return (
                <g key={i}>
                  {/* The gap, drawn as a drop line to the diagonal. */}
                  <line
                    x1={x(bucket.avg_forecast)}
                    x2={x(bucket.avg_forecast)}
                    y1={y(bucket.avg_forecast)}
                    y2={y(bucket.actual_rate)}
                    stroke={bucket.calibrated ? 'var(--series-3)' : 'var(--series-2)'}
                    strokeWidth={2}
                  />
                  <circle
                    cx={x(bucket.avg_forecast)}
                    cy={y(bucket.actual_rate)}
                    r={radius}
                    fill={bucket.calibrated ? 'var(--series-3)' : 'var(--series-2)'}
                    opacity={hover === null || hover === i ? 0.75 : 0.35}
                    stroke="var(--surface-1)"
                    strokeWidth={2}
                    onPointerEnter={() => setHover(i)}
                  />
                </g>
              );
            })}
          </Plot>

          {anchor && hover !== null && report.buckets[hover] && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 190)}
              heading={`${pct(report.buckets[hover]!.low)}–${pct(Math.min(1, report.buckets[hover]!.high))} bucket`}
              rows={[
                { label: 'Forecasts', value: `${report.buckets[hover]!.count}` },
                { label: 'Avg stated', value: pct(report.buckets[hover]!.avg_forecast) },
                { label: 'Actually happened', value: pct(report.buckets[hover]!.actual_rate) },
                { label: 'Gap', value: `${report.buckets[hover]!.gap >= 0 ? '+' : ''}${pct(report.buckets[hover]!.gap)}` },
              ]}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'Within tolerance', color: 'var(--series-3)' },
            { label: 'Miscalibrated', color: 'var(--series-2)' },
            { label: 'Perfect calibration', color: 'var(--text-primary)', dashed: true },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          Switch to <strong>Overconfident</strong>. The dots bow <em>below</em> the diagonal on the
          right and above it on the left: things called at 90% happen far less often, things
          dismissed at 10% happen far more. This is the characteristic signature, and it is
          invisible to anyone who only remembers their good calls.
        </p>
        <p>
          <strong>Cautious</strong> bows the other way — the hedge-everything forecaster, whose
          90% calls come in near-certain. Less embarrassing, equally miscalibrated, and it costs
          real money through positions sized too small.
        </p>
        <p>
          <strong>Noise</strong> flattens every bucket onto the 50% line no matter what was stated.
          Its Brier score sits at roughly 0.25, the value you get by forecasting 50% for everything
          — which is what makes 0.25 the meaningful threshold rather than an arbitrary one.
        </p>
        <p>
          Drag the track record down to ten forecasts. The dots scatter wildly and the verdict
          becomes unreliable. Calibration is a long-run property; the system refuses to report
          bucket statistics below three resolved forecasts for exactly this reason.
        </p>
      </Note>
    </Plate>
  );
}
