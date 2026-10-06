/**
 * Pre-registration drift: catching motivated reasoning by committing first.
 *
 * The asymmetry is the whole design, so the plate makes it geometric — one half
 * of the plane is flagged and the other is not, and which half depends on the
 * lean you declared before you started.
 */

import { useMemo, useState } from 'react';

import { prereg } from '@tfg/core';
import { DataTable, Figure, Flag, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, plotArea } from '../charts/Plot';
import { ControlRow, ResetButton, Segmented, Slider } from '../controls/Controls';
import { pct, signedPct } from '../charts/format';
import { linear } from '../charts/scale';

const WIDTH = 560;
const HEIGHT = 420;
const MARGINS = { top: 18, right: 22, bottom: 48, left: 60 };

const LEANS = [
  { value: prereg.Lean.Bullish, label: 'Bullish' },
  { value: prereg.Lean.Neutral, label: 'Neutral' },
  { value: prereg.Lean.Bearish, label: 'Bearish' },
] as const;

export default function PreRegistration() {
  const [expected, setExpected] = useState(0.4);
  const [actual, setActual] = useState(0.55);
  const [lean, setLean] = useState<string>(prereg.Lean.Bullish);

  const result = useMemo(() => prereg.compare(expected, actual, lean), [expected, actual, lean]);

  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const x = linear([0, 1], [area.left, area.right]);
  const y = linear([0, 1], [area.bottom, area.top]);

  /**
   * The flagged half-plane for the current lean. Bullish flags upward drift,
   * bearish flags downward, neutral flags both at a wider threshold.
   */
  const threshold = prereg.BULLISH_LEANS.includes(lean) || prereg.BEARISH_LEANS.includes(lean)
    ? prereg.CONFIRMING_DRIFT_THRESHOLD
    : prereg.UNDIRECTED_DRIFT_THRESHOLD;

  const flagRegions = useMemo(() => {
    const regions: Array<{ key: string; d: string }> = [];
    const bullish = prereg.BULLISH_LEANS.includes(lean);
    const bearish = prereg.BEARISH_LEANS.includes(lean);

    if (bullish || !bearish) {
      // Above the +threshold diagonal.
      regions.push({
        key: 'above',
        d: `M${x(0)},${y(threshold)} L${x(1 - threshold)},${y(1)} L${x(0)},${y(1)} Z`,
      });
    }
    if (bearish || (!bullish && !bearish)) {
      // Below the −threshold diagonal.
      regions.push({
        key: 'below',
        d: `M${x(threshold)},${y(0)} L${x(1)},${y(1 - threshold)} L${x(1)},${y(0)} Z`,
      });
    }
    return regions;
  }, [lean, threshold, x, y]);

  return (
    <Plate
      title="Pre-registration drift"
      question="Did the analysis land where you predicted, or further in the direction you already leaned?"
      source="tools/pre_register.py"
    >
      <ControlRow>
        <Segmented
          label="Declared lean, before analysing"
          value={lean}
          options={LEANS.map((l) => ({ value: l.value as string, label: l.label }))}
          onChange={setLean}
        />
        <Slider label="Expected posterior" value={expected} min={0.05} max={0.95} step={0.01} onChange={setExpected} format={(v) => pct(v)} />
        <Slider label="Actual posterior" value={actual} min={0.05} max={0.95} step={0.01} onChange={setActual} format={(v) => pct(v)} />
        <ResetButton
          onClick={() => {
            setExpected(0.4);
            setActual(0.55);
            setLean(prereg.Lean.Bullish);
          }}
        />
      </ControlRow>

      <Readouts
        items={[
          { label: 'Expected', value: pct(expected) },
          { label: 'Actual', value: pct(actual) },
          { label: 'Drift', value: signedPct(result.divergence) },
          { label: 'Threshold', value: `±${pct(threshold)}` },
          {
            label: 'Verdict',
            value: result.motivated_reasoning_flag ? 'flagged' : 'clean',
            tone: result.motivated_reasoning_flag ? 'critical' : 'good',
          },
        ]}
      />

      {result.motivated_reasoning_flag ? (
        <Flag tone="critical">{result.reason}</Flag>
      ) : (
        <Flag tone="good">{result.reason}</Flag>
      )}

      <Figure
        caption="Expected posterior against the one the analysis produced. The shaded region is where drift gets flagged for the declared lean."
        table={
          <DataTable
            columns={['Declared lean', 'Drift', 'Threshold', 'Flagged']}
            rows={[prereg.Lean.Bullish, prereg.Lean.Neutral, prereg.Lean.Bearish].map((l) => {
              const r = prereg.compare(expected, actual, l);
              return [
                l,
                signedPct(r.divergence),
                prereg.BULLISH_LEANS.includes(l) || prereg.BEARISH_LEANS.includes(l)
                  ? `±${pct(prereg.CONFIRMING_DRIFT_THRESHOLD)}`
                  : `±${pct(prereg.UNDIRECTED_DRIFT_THRESHOLD)}`,
                r.motivated_reasoning_flag ? 'yes' : 'no',
              ];
            })}
          />
        }
      >
        <Plot
          width={WIDTH}
          height={HEIGHT}
          margins={MARGINS}
          x={x}
          y={y}
          title="Pre-registered expectation against the actual posterior, with the flagged region shaded"
          xLabel="Pre-registered expectation"
          yLabel="Actual posterior"
          formatX={(v) => pct(v)}
          formatY={(v) => pct(v)}
        >
          {flagRegions.map((region) => (
            <path key={region.key} d={region.d} fill="var(--status-critical)" opacity={0.12} />
          ))}

          {/* Perfect agreement. */}
          <line x1={x(0)} x2={x(1)} y1={y(0)} y2={y(1)} stroke="var(--text-primary)" strokeWidth={1.5} strokeDasharray="4 4" />

          <circle
            cx={x(expected)}
            cy={y(actual)}
            r={7}
            fill={result.motivated_reasoning_flag ? 'var(--status-critical)' : 'var(--series-3)'}
            stroke="var(--surface-1)"
            strokeWidth={2.5}
          />
          <text
            x={x(expected) + 12}
            y={y(actual) - 10}
            fontSize={11.5}
            fontWeight={600}
            fill="var(--text-primary)"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {signedPct(result.divergence)}
          </text>

          <text x={area.left + 8} y={area.top + 14} fontSize={10.5} fill="var(--text-secondary)">
            posterior came in higher than predicted
          </text>
          <text x={area.right - 8} y={area.bottom - 10} fontSize={10.5} textAnchor="end" fill="var(--text-secondary)">
            came in lower
          </text>
        </Plot>
        <Legend
          items={[
            { label: 'This analysis', color: result.motivated_reasoning_flag ? 'var(--status-critical)' : 'var(--series-3)' },
            { label: 'Flagged region', color: 'var(--status-critical)' },
            { label: 'Prediction met exactly', color: 'var(--text-primary)', dashed: true },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          The shaded region is <strong>not symmetric</strong>, and that is the point. Declare a
          bullish lean and only upward drift is flagged — if the analysis comes in far more bearish
          than you predicted, nothing fires. That is the analysis doing its job: changing your mind
          against your prior inclination is evidence of rigour, not bias.
        </p>
        <p>
          Switch the lean to <strong>Bearish</strong> with the same numbers and the flag flips. The
          data never moved. What changed is what you committed to beforehand, which is the only
          thing that makes drift interpretable at all.
        </p>
        <p>
          <strong>Neutral</strong> widens the threshold from 10 to 15 points and flags both
          directions. With no declared lean there is no confirming direction to watch, so only a
          large unexplained move is suspicious.
        </p>
        <p>
          None of this works retrospectively. The expectation has to be written down before the
          analysis runs — which is the one discipline the tool enforces and the one most
          forecasters skip.
        </p>
      </Note>
    </Plate>
  );
}
