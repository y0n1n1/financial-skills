/**
 * Monte Carlo EV: the return distribution, not a point estimate.
 *
 * The plate's real argument is visual: the mean sits in one place, and the 5th-to-
 * 95th percentile band sprawls across zero. Anyone reading only the mean would
 * have a completely different impression of the trade.
 */

import { useMemo, useState } from 'react';

import { ev } from '@tfg/core';
import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, Tooltip, plotArea, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { ControlRow, ResetButton, Slider } from '../controls/Controls';
import { count, fixed, signedPct, usdB } from '../charts/format';
import { extent, linear } from '../charts/scale';

const WIDTH = 720;
const HEIGHT = 320;
const MARGINS = { top: 18, right: 20, bottom: 44, left: 52 };

const DEFAULTS = {
  currentMcap: 4400,
  bullRevenue: 365,
  bearRevenue: 180,
  bullProb: 0.2,
  revenueStd: 35,
  bullMultiple: 30,
  bearMultiple: 15,
  margin: 0.65,
  paths: 60_000,
};

export default function MonteCarloEv() {
  const [state, setState] = useState(DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(key: K, value: (typeof DEFAULTS)[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const result = useMemo(() => {
    // Four revenue scenarios interpolated between the bull and bear ends, so one
    // slider pair controls the whole matrix without twelve separate inputs.
    const span = state.bullRevenue - state.bearRevenue;
    const revenues = [
      state.bullRevenue,
      state.bearRevenue + span * 0.66,
      state.bearRevenue + span * 0.33,
      state.bearRevenue,
    ];
    const remaining = 1 - state.bullProb;
    const revenueProbs = [state.bullProb, remaining * 0.5, remaining * 0.3, remaining * 0.2];

    return ev.monteCarlo({
      current_mcap: state.currentMcap,
      revenue_scenarios: revenues,
      revenue_probs: revenueProbs,
      revenue_stds: revenues.map(() => state.revenueStd),
      multiple_scenarios: [
        state.bullMultiple,
        (state.bullMultiple + state.bearMultiple) / 2,
        state.bearMultiple,
      ],
      multiple_probs: [0.2, 0.5, 0.3],
      net_margin: state.margin,
      n_simulations: state.paths,
      seed: 42,
    });
  }, [state]);

  const { counts, edges } = result.histogram;
  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const x = linear([edges[0] ?? 0, edges[edges.length - 1] ?? 1], [area.left, area.right]);
  const y = linear([0, extent(counts)[1]], [area.bottom, area.top]);

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hoverBin, setHoverBin] = useState<number | null>(null);

  const p5 = result.percentiles.p5;
  const p95 = result.percentiles.p95;
  const straddlesZero = p5 < 0 && p95 > 0;

  return (
    <Plate
      title="Monte Carlo EV"
      question="What is the distribution of outcomes, and does its confidence interval cross zero?"
      source="tools/monte_carlo_ev.py"
    >
      <ControlRow>
        <Slider
          label="Current market cap"
          value={state.currentMcap}
          min={500}
          max={8000}
          step={100}
          onChange={(v) => set('currentMcap', v)}
          format={usdB}
        />
        <Slider
          label="Bull revenue"
          value={state.bullRevenue}
          min={state.bearRevenue + 20}
          max={600}
          step={5}
          onChange={(v) => set('bullRevenue', v)}
          format={usdB}
        />
        <Slider
          label="Bear revenue"
          value={state.bearRevenue}
          min={40}
          max={state.bullRevenue - 20}
          step={5}
          onChange={(v) => set('bearRevenue', v)}
          format={usdB}
        />
        <Slider
          label="P(bull revenue)"
          value={state.bullProb}
          min={0.02}
          max={0.6}
          step={0.01}
          onChange={(v) => set('bullProb', v)}
          format={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <Slider
          label="Revenue uncertainty (σ)"
          value={state.revenueStd}
          min={0}
          max={90}
          step={5}
          onChange={(v) => set('revenueStd', v)}
          format={usdB}
          hint="0 collapses to the closed form"
        />
        <Slider
          label="Bull multiple"
          value={state.bullMultiple}
          min={state.bearMultiple + 2}
          max={60}
          step={1}
          onChange={(v) => set('bullMultiple', v)}
          format={(v) => `${v.toFixed(0)}×`}
        />
        <Slider
          label="Bear multiple"
          value={state.bearMultiple}
          min={5}
          max={state.bullMultiple - 2}
          step={1}
          onChange={(v) => set('bearMultiple', v)}
          format={(v) => `${v.toFixed(0)}×`}
        />
        <Slider
          label="Net margin"
          value={state.margin}
          min={0.1}
          max={0.9}
          step={0.01}
          onChange={(v) => set('margin', v)}
          format={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <Slider
          label="Simulation paths"
          value={state.paths}
          min={5000}
          max={200_000}
          step={5000}
          onChange={(v) => set('paths', v)}
          format={count}
        />
        <ResetButton onClick={() => setState(DEFAULTS)} />
      </ControlRow>

      <Readouts
        items={[
          { label: 'Mean EV', value: signedPct(result.ev_mean, 1), tone: result.ev_mean > 0 ? 'good' : 'critical' },
          { label: 'Median', value: signedPct(result.ev_median, 1) },
          { label: '5th pct', value: signedPct(p5, 1) },
          { label: '95th pct', value: signedPct(p95, 1) },
          { label: 'P(profit)', value: `${(result.p_positive * 100).toFixed(1)}%` },
          {
            label: 'Kelly f*',
            value: fixed(result.kelly_fraction, 3),
            tone: result.kelly_fraction > 0 ? 'good' : 'critical',
            hint: result.kelly_fraction > 0 ? 'passes the gate' : 'excluded',
          },
        ]}
      />

      <Figure
        caption={`${count(result.n_simulations)} simulated paths. The band marks the 5th to 95th percentile; the solid line is the mean.`}
        table={
          <DataTable
            columns={['Percentile', 'Return']}
            rows={[
              ['5th', signedPct(result.percentiles.p5, 1)],
              ['10th', signedPct(result.percentiles.p10, 1)],
              ['25th', signedPct(result.percentiles.p25, 1)],
              ['50th (median)', signedPct(result.percentiles.p50, 1)],
              ['75th', signedPct(result.percentiles.p75, 1)],
              ['90th', signedPct(result.percentiles.p90, 1)],
              ['95th', signedPct(result.percentiles.p95, 1)],
              ['Mean', signedPct(result.ev_mean, 1)],
              ['Std deviation', fixed(result.ev_std, 3)],
            ]}
          />
        }
      >
        <div
          ref={wrapperRef}
          style={{ position: 'relative' }}
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            onPointerLeave();
            setHoverBin(null);
          }}
        >
          <Plot
            width={WIDTH}
            height={HEIGHT}
            margins={MARGINS}
            x={x}
            y={y}
            title="Histogram of simulated returns, with the 5th-95th percentile band and mean marked"
            xLabel="Return on current market cap"
            yLabel="Paths"
            formatX={(v) => `${(v * 100).toFixed(0)}%`}
            formatY={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v.toFixed(0)}`)}
            hideXGrid
          >
            {/* The percentile band, drawn under the bars. */}
            <rect
              x={x(p5)}
              y={area.top}
              width={Math.max(0, x(p95) - x(p5))}
              height={area.bottom - area.top}
              fill="var(--series-1)"
              opacity={0.08}
            />

            {counts.map((c, i) => {
              const left = x(edges[i] ?? 0);
              const right = x(edges[i + 1] ?? 0);
              // A 2px surface gap between adjacent fills keeps bars legible.
              const width = Math.max(1, right - left - 2);
              const negative = (edges[i + 1] ?? 0) <= 0;
              return (
                <rect
                  key={i}
                  x={left + 1}
                  y={y(c)}
                  width={width}
                  height={Math.max(0, area.bottom - y(c))}
                  fill={negative ? 'var(--series-2)' : 'var(--series-1)'}
                  opacity={hoverBin === null || hoverBin === i ? 0.9 : 0.45}
                  onPointerEnter={() => setHoverBin(i)}
                />
              );
            })}

            {/* Zero: the only line on this chart that is a decision boundary. */}
            <line
              x1={x(0)}
              x2={x(0)}
              y1={area.top}
              y2={area.bottom}
              stroke="var(--text-primary)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <text x={x(0) + 5} y={area.top + 11} fontSize={10.5} fill="var(--text-secondary)">
              break even
            </text>

            <line
              x1={x(result.ev_mean)}
              x2={x(result.ev_mean)}
              y1={area.top}
              y2={area.bottom}
              stroke="var(--series-7)"
              strokeWidth={2}
            />
          </Plot>

          {anchor && hoverBin !== null && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH)}
              heading={`${signedPct(edges[hoverBin] ?? 0, 1)} to ${signedPct(edges[hoverBin + 1] ?? 0, 1)}`}
              rows={[
                { label: 'Paths', value: count(counts[hoverBin] ?? 0) },
                {
                  label: 'Share',
                  value: `${(((counts[hoverBin] ?? 0) / result.n_simulations) * 100).toFixed(2)}%`,
                },
              ]}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'Gain', color: 'var(--series-1)' },
            { label: 'Loss', color: 'var(--series-2)' },
            { label: 'Mean EV', color: 'var(--series-7)' },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          Drag <strong>revenue uncertainty</strong> up. The mean barely moves; the distribution
          sprawls. Two trades with an identical expected value can have completely different
          survivability, and the single number cannot tell you which you are holding.
        </p>
        <p>
          {straddlesZero ? (
            <>
              Right now the 5th-to-95th percentile band runs from {signedPct(p5, 1)} to{' '}
              {signedPct(p95, 1)} — it <strong>crosses zero</strong>. The methodology requires
              saying so out loud: at this input quality the analysis has not established that the
              trade is profitable, whatever the mean reads.
            </>
          ) : (
            <>
              The band runs {signedPct(p5, 1)} to {signedPct(p95, 1)} and stays on one side of
              zero, so the direction is resolved at this input quality — the rarer and more
              valuable case.
            </>
          )}
        </p>
        <p>
          Set uncertainty to zero and the simulation collapses toward the closed-form expectation;
          the residual spread is the ±10% noise applied to the multiple, which never switches off.
        </p>
      </Note>
    </Plate>
  );
}
