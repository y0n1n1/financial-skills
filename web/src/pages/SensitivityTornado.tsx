/**
 * The sensitivity tornado: which input actually moves expected value.
 *
 * A tornado is one of the few charts whose form is already the answer — the bars
 * are sorted, so the top one is where the next hour of research should go.
 */

import { useMemo, useState } from 'react';

import { sensitivity } from '@tfg/core';
import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Tooltip, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { ControlRow, ResetButton, Slider } from '../controls/Controls';
import { signedPct, usdB } from '../charts/format';
import { band, linear, niceTicks } from '../charts/scale';

const WIDTH = 720;
const ROW_HEIGHT = 26;
const LABEL_WIDTH = 236;
const MARGIN_RIGHT = 56;

const DEFAULTS = { currentMcap: 4400, margin: 0.65, revenueStd: 35 };

export default function SensitivityTornado() {
  const [state, setState] = useState(DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(key: K, value: number) =>
    setState((s) => ({ ...s, [key]: value }));

  const results = useMemo(
    () =>
      sensitivity.runSensitivity({
        current_mcap: state.currentMcap,
        revenue_scenarios: [365, 300, 240, 180],
        revenue_probs: [0.2, 0.4, 0.25, 0.15],
        revenue_stds: [state.revenueStd, state.revenueStd, state.revenueStd, state.revenueStd],
        multiple_scenarios: [30, 22, 15],
        multiple_probs: [0.2, 0.5, 0.3],
        margin: state.margin,
      }),
    [state],
  );

  const baseEv = results[0]?.base_ev ?? 0;
  const height = results.length * ROW_HEIGHT + 46;

  // Centre the axis on the base EV so each bar reads as a deviation from it.
  const allValues = results.flatMap((r) => [r.ev_low, r.ev_high]);
  const lo = Math.min(...allValues, baseEv);
  const hi = Math.max(...allValues, baseEv);
  const x = linear([lo, hi], [LABEL_WIDTH, WIDTH - MARGIN_RIGHT]);
  const rows = band(results.length, [10, results.length * ROW_HEIGHT + 10], 0.3);

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<number | null>(null);

  const dominant = results[0];

  return (
    <Plate
      title="Sensitivity tornado"
      question="Which single input, if you learned it, would most change the decision?"
      source="theory/attention-allocation.md"
    >
      <ControlRow>
        <Slider label="Current market cap" value={state.currentMcap} min={1000} max={8000} step={100} onChange={(v) => set('currentMcap', v)} format={usdB} />
        <Slider label="Net margin" value={state.margin} min={0.2} max={0.9} step={0.01} onChange={(v) => set('margin', v)} format={(v) => `${(v * 100).toFixed(0)}%`} />
        <Slider label="Revenue σ per scenario" value={state.revenueStd} min={5} max={90} step={5} onChange={(v) => set('revenueStd', v)} format={usdB} />
        <ResetButton onClick={() => setState(DEFAULTS)} />
      </ControlRow>

      <Readouts
        items={[
          { label: 'Base EV', value: signedPct(baseEv, 1), tone: baseEv > 0 ? 'good' : 'critical' },
          { label: 'Widest swing', value: signedPct(dominant?.ev_swing ?? 0, 1) },
          { label: 'Inputs tested', value: `${results.length}` },
        ]}
      />

      <Figure
        caption="Each bar spans the expected value when that input is moved down and up alone. The vertical line is the unperturbed base case."
        table={
          <DataTable
            columns={['Input', 'EV low', 'EV high', 'Swing']}
            align={['left', 'right', 'right', 'right']}
            rows={results.map((r) => [r.parameter, signedPct(r.ev_low, 1), signedPct(r.ev_high, 1), signedPct(r.ev_swing, 1)])}
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
          <svg viewBox={`0 0 ${WIDTH} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
            <title>Expected value swing for each perturbed input, sorted widest first</title>

            {niceTicks(lo, hi, 6).map((tick) => (
              <g key={tick}>
                <line x1={x(tick)} x2={x(tick)} y1={6} y2={height - 36} stroke="var(--grid)" strokeWidth={1} shapeRendering="crispEdges" />
                <text x={x(tick)} y={height - 20} textAnchor="middle" fontSize={11} fill="var(--text-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {signedPct(tick, 0)}
                </text>
              </g>
            ))}

            {results.map((row, i) => {
              const left = Math.min(x(row.ev_low), x(row.ev_high));
              const right = Math.max(x(row.ev_low), x(row.ev_high));
              const active = hover === null || hover === i;
              // Up and down halves get the two diverging poles, so direction reads
              // without consulting the legend.
              const baseX = x(row.base_ev);
              return (
                <g key={row.parameter} onPointerEnter={() => setHover(i)}>
                  <text
                    x={LABEL_WIDTH - 12}
                    y={rows.position(i) + rows.width / 2}
                    textAnchor="end"
                    dominantBaseline="central"
                    fontSize={11.5}
                    fill={active ? 'var(--text-secondary)' : 'var(--text-muted)'}
                  >
                    {row.parameter.length > 34 ? `${row.parameter.slice(0, 33)}…` : row.parameter}
                  </text>

                  {/* Downside half */}
                  <rect
                    x={left}
                    y={rows.position(i)}
                    width={Math.max(1, baseX - left - 1)}
                    height={rows.width}
                    rx={3}
                    fill="var(--div-neg)"
                    opacity={active ? 0.85 : 0.3}
                  />
                  {/* Upside half, separated from the downside by a 2px surface gap */}
                  <rect
                    x={baseX + 1}
                    y={rows.position(i)}
                    width={Math.max(1, right - baseX - 1)}
                    height={rows.width}
                    rx={3}
                    fill="var(--div-pos)"
                    opacity={active ? 0.85 : 0.3}
                  />

                  <text
                    x={right + 8}
                    y={rows.position(i) + rows.width / 2}
                    dominantBaseline="central"
                    fontSize={11}
                    fill="var(--text-primary)"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {signedPct(row.ev_swing, 1)}
                  </text>

                  <rect x={LABEL_WIDTH} y={rows.position(i) - 2} width={WIDTH - LABEL_WIDTH - MARGIN_RIGHT} height={rows.width + 4} fill="transparent" onPointerEnter={() => setHover(i)} />
                </g>
              );
            })}

            <line x1={x(baseEv)} x2={x(baseEv)} y1={6} y2={height - 36} stroke="var(--text-primary)" strokeWidth={1.5} />
            <text x={x(baseEv)} y={height - 4} textAnchor="middle" fontSize={10.5} fill="var(--text-secondary)">
              base {signedPct(baseEv, 1)}
            </text>
          </svg>

          {anchor && hover !== null && results[hover] && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 210)}
              heading={results[hover]!.parameter}
              rows={[
                { label: 'EV low', value: signedPct(results[hover]!.ev_low, 2), color: 'var(--div-neg)' },
                { label: 'EV high', value: signedPct(results[hover]!.ev_high, 2), color: 'var(--div-pos)' },
                { label: 'Swing', value: signedPct(results[hover]!.ev_swing, 2) },
              ]}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'Input moved down', color: 'var(--div-neg)' },
            { label: 'Input moved up', color: 'var(--div-pos)' },
            { label: 'Base case', color: 'var(--text-primary)' },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          The ranking is the output. Everything below the top two or three bars is noise you could
          research for a week without changing the decision — and the instinct to research the
          interesting input rather than the influential one is exactly what this chart is built to
          interrupt.
        </p>
        <p>
          Raise <strong>revenue σ</strong> and the revenue-level bars stretch while the probability
          bars stay put. Perturbation size is part of what makes an input influential: a parameter
          you know precisely cannot move the answer much even if the answer is very sensitive to it.
        </p>
        <p>
          Drag <strong>net margin</strong> toward its extremes and watch its own bar climb the
          ranking. Margin enters every cell of the matrix multiplicatively, so once it is uncertain
          it dominates — which is the kind of structural fact a tornado surfaces and a table of
          point estimates hides.
        </p>
      </Note>
    </Plate>
  );
}
