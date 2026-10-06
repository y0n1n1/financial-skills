/**
 * Intuition versus the model: did overriding it help?
 *
 * Every point is one disagreement. Below the diagonal the human was closer; above
 * it the model was. The honest version of "trust your gut" is a scatter plot.
 */

import { useMemo, useState } from 'react';

import { intuition } from '@tfg/core';
import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, Tooltip, plotArea, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { DIVERGENCES } from '../lib/samples';
import { fixed } from '../charts/format';
import { linear } from '../charts/scale';

const WIDTH = 560;
const HEIGHT = 400;
const MARGINS = { top: 18, right: 24, bottom: 48, left: 58 };

/** At most three categorical hues on a scatter: the all-pairs CVD cap. */
const CATEGORY_COLORS: Readonly<Record<string, string>> = {
  financial_forecast: 'var(--series-1)',
  competitive_dynamics: 'var(--series-2)',
  macro_cycle: 'var(--series-3)',
};
const OTHER_COLOR = 'var(--text-muted)';

export default function IntuitionTracker() {
  const resolved = useMemo(
    () =>
      DIVERGENCES.map((d) => {
        const divergence: intuition.Divergence = {
          parameter: d.parameter,
          model_recommendation: d.model,
          human_answer: d.human,
          certainty: d.certainty,
        };
        return { ...d, ...intuition.resolve(divergence, d.actual), category: intuition.categorize(d.parameter) };
      }),
    [],
  );

  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const maxError = Math.max(...resolved.flatMap((r) => [r.model_error, r.human_error])) * 1.15;
  const x = linear([0, maxError], [area.left, area.right]);
  const y = linear([0, maxError], [area.bottom, area.top]);

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<number | null>(null);

  const better = resolved.filter((r) => r.human_was_better);
  const netReduction = resolved.reduce((sum, r) => sum + r.error_reduction, 0);

  const colorFor = (category: string) => CATEGORY_COLORS[category] ?? OTHER_COLOR;

  return (
    <Plate
      title="Intuition vs model"
      question="When judgement overrode the model, did the estimate get better or worse?"
      source="tools/intuition_tracker.py"
    >
      <Readouts
        items={[
          { label: 'Overrides', value: `${resolved.length}` },
          {
            label: 'Human closer',
            value: `${better.length} of ${resolved.length}`,
            tone: better.length > resolved.length / 2 ? 'good' : 'warning',
          },
          {
            label: 'Net error reduced',
            value: fixed(netReduction, 1),
            tone: netReduction > 0 ? 'good' : 'critical',
          },
          { label: 'Hit rate', value: `${Math.round((better.length / resolved.length) * 100)}%` },
        ]}
      />

      <Figure
        caption="Model error against human error for the same parameter. Points below the diagonal are overrides that helped."
        table={
          <DataTable
            columns={['Parameter', 'Model', 'Human', 'Actual', 'Model error', 'Human error', 'Helped']}
            rows={resolved.map((r) => [
              r.parameter,
              r.model,
              r.human,
              r.actual,
              fixed(r.model_error, 1),
              fixed(r.human_error, 1),
              r.human_was_better ? 'yes' : 'no',
            ])}
          />
        }
      >
        <div ref={wrapperRef} style={{ position: 'relative' }} onPointerMove={onPointerMove} onPointerLeave={() => { onPointerLeave(); setHover(null); }}>
          <Plot
            width={WIDTH}
            height={HEIGHT}
            margins={MARGINS}
            x={x}
            y={y}
            title="Model error compared with human error for each override"
            xLabel="Model error"
            yLabel="Human error"
            formatX={(v) => v.toFixed(0)}
            formatY={(v) => v.toFixed(0)}
          >
            <path
              d={`M${x(0)},${y(0)} L${x(maxError)},${y(maxError)} L${x(maxError)},${y(0)} Z`}
              fill="var(--status-good)"
              opacity={0.07}
            />
            <text x={area.right - 10} y={area.bottom - 14} textAnchor="end" fontSize={10.5} fill="var(--status-good)">
              intuition helped
            </text>
            <text x={area.left + 10} y={area.top + 14} fontSize={10.5} fill="var(--status-critical)">
              intuition hurt
            </text>

            <line x1={x(0)} x2={x(maxError)} y1={y(0)} y2={y(maxError)} stroke="var(--text-primary)" strokeWidth={1.5} strokeDasharray="4 4" />

            {resolved.map((r, i) => (
              <circle
                key={r.parameter}
                cx={x(r.model_error)}
                cy={y(r.human_error)}
                r={hover === i ? 8 : 6}
                fill={colorFor(r.category)}
                opacity={hover === null || hover === i ? 0.85 : 0.35}
                stroke="var(--surface-1)"
                strokeWidth={2}
                onPointerEnter={() => setHover(i)}
              />
            ))}
          </Plot>

          {anchor && hover !== null && resolved[hover] && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 200)}
              heading={resolved[hover]!.parameter}
              rows={[
                { label: 'Model said', value: `${resolved[hover]!.model}` },
                { label: 'Human said', value: `${resolved[hover]!.human}` },
                { label: 'Actual', value: `${resolved[hover]!.actual}` },
                { label: 'Error reduced', value: fixed(resolved[hover]!.error_reduction, 1) },
              ]}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'Financial forecast', color: 'var(--series-1)' },
            { label: 'Competitive dynamics', color: 'var(--series-2)' },
            { label: 'Macro cycle', color: 'var(--series-3)' },
            { label: 'Other', color: OTHER_COLOR },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          The categories separate. Overrides on competitive dynamics and product adoption — things
          observable from inside the industry — cluster below the diagonal. Overrides on macro and
          on institutional decisions sit above it. The same person's intuition is genuinely useful
          in one domain and actively harmful in another.
        </p>
        <p>
          That is the finding worth having, and it is unavailable to anyone who only tracks whether
          they were right overall. Aggregate hit rate would hide it completely.
        </p>
        <p>
          The quantity to aggregate is error <em>reduction</em>, not direction. A run of overrides
          that nudge the estimate the right way by a rounding error is not evidence of useful
          intuition — it is noise with a favourable sign.
        </p>
      </Note>
    </Plate>
  );
}
