/**
 * The Kelly criterion as an entry gate.
 *
 * The growth curve is the whole argument: it has a peak, and it falls off a cliff
 * to the right of it. Betting double the optimal fraction is not twice as
 * aggressive — it is negative-growth.
 */

import { useMemo, useState } from 'react';

import { kelly } from '@tfg/core';
import { DataTable, Figure, Flag, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, Tooltip, plotArea, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { ControlRow, ResetButton, Slider } from '../controls/Controls';
import { fixed, pct } from '../charts/format';
import { linear } from '../charts/scale';

const WIDTH = 720;
const HEIGHT = 330;
const MARGINS = { top: 18, right: 24, bottom: 46, left: 60 };

const DEFAULTS = { probability: 0.632, upside: 0.523, downside: 0.25 };

export default function KellyGate() {
  const [state, setState] = useState(DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(key: K, value: number) =>
    setState((s) => ({ ...s, [key]: value }));

  const result = useMemo(
    () => kelly.evaluate(state.probability, state.upside, state.downside),
    [state],
  );

  const b = result.win_loss_ratio;
  const breakeven = kelly.breakevenProbability(b);

  /** Growth rate sampled across staked fractions, which is the curve. */
  const curve = useMemo(() => {
    const points: Array<{ fraction: number; growth: number }> = [];
    for (let f = 0; f <= 0.98; f += 0.005) {
      const growth = kelly.growthRate(state.probability, b, f);
      if (Number.isFinite(growth)) points.push({ fraction: f, growth });
    }
    return points;
  }, [state.probability, b]);

  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const growths = curve.map((p) => p.growth);
  const maxGrowth = Math.max(...growths, 0.001);
  // Clip the y-axis below: the curve dives to -infinity and would flatten everything.
  const minGrowth = Math.max(Math.min(...growths), -maxGrowth * 2.2);

  const x = linear([0, 1], [area.left, area.right]);
  const y = linear([minGrowth, maxGrowth * 1.12], [area.bottom, area.top]);

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);

  const path = curve
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.fraction)},${y(Math.max(minGrowth, p.growth))}`)
    .join('');

  const fStar = result.fraction;
  const hoverGrowth =
    hoverFraction === null ? null : kelly.growthRate(state.probability, b, hoverFraction);

  return (
    <Plate
      title="Kelly gate"
      question="Does this trade have positive expected value — and what does overbetting actually cost?"
      source="sizing/kelly.md"
    >
      <ControlRow>
        <Slider
          label="P(win)"
          value={state.probability}
          min={0.05}
          max={0.95}
          step={0.001}
          onChange={(v) => set('probability', v)}
          format={(v) => pct(v, 1)}
          hint="From the Bayesian posterior, not a hunch"
        />
        <Slider
          label="Upside"
          value={state.upside}
          min={0.02}
          max={3}
          step={0.01}
          onChange={(v) => set('upside', v)}
          format={(v) => `+${pct(v)}`}
        />
        <Slider
          label="Downside"
          value={state.downside}
          min={0.02}
          max={1}
          step={0.01}
          onChange={(v) => set('downside', v)}
          format={(v) => `−${pct(v)}`}
        />
        <ResetButton onClick={() => setState(DEFAULTS)} />
      </ControlRow>

      <Readouts
        items={[
          { label: 'Payoff ratio b', value: `${fixed(b, 2)}×` },
          { label: 'Breakeven P(win)', value: pct(breakeven, 1) },
          {
            label: 'Full Kelly f*',
            value: fixed(fStar, 3),
            tone: fStar > 0 ? 'good' : 'critical',
          },
          { label: 'Half Kelly', value: fixed(result.half, 3) },
          { label: 'Quarter Kelly', value: fixed(result.quarter, 3) },
          {
            label: 'Gate',
            value: result.gate,
            tone: result.gate === 'EXCLUDED' ? 'critical' : result.gate === 'MARGINAL' ? 'warning' : 'good',
          },
        ]}
      />

      {result.gate === kelly.Gate.Excluded ? (
        <Flag tone="critical">{result.reason} Kelly is a binary gate here, not a sizer — a negative fraction removes the position from consideration, and Black-Litterman never gets to see it.</Flag>
      ) : result.gate === kelly.Gate.Marginal ? (
        <Flag tone="warning">{result.reason}</Flag>
      ) : (
        <Flag tone="good">{result.reason} The position passes to the allocator, which decides the actual weight.</Flag>
      )}

      <Figure
        caption="Expected log growth per bet against the fraction staked. The peak is full Kelly; everything right of the zero crossing destroys capital."
        table={
          <DataTable
            columns={['Fraction staked', 'Expected log growth']}
            rows={[0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 0.9]
              .filter((f) => f <= 0.98)
              .map((f) => [fixed(f, 2), fixed(kelly.growthRate(state.probability, b, f), 5)])}
          />
        }
      >
        <div
          ref={wrapperRef}
          style={{ position: 'relative' }}
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            onPointerLeave();
            setHoverFraction(null);
          }}
        >
          <Plot
            width={WIDTH}
            height={HEIGHT}
            margins={MARGINS}
            x={x}
            y={y}
            title="Expected log growth rate as a function of the fraction of capital staked"
            xLabel="Fraction of capital staked"
            yLabel="Expected log growth"
            formatX={(v) => pct(v)}
            formatY={(v) => v.toFixed(3)}
            onHover={(point) => setHoverFraction(point ? Math.min(0.98, Math.max(0, point.x)) : null)}
          >
            {/* Zero growth: right of this crossing the bankroll shrinks. */}
            <line
              x1={area.left}
              x2={area.right}
              y1={y(0)}
              y2={y(0)}
              stroke="var(--text-primary)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />

            {/* The region beyond full Kelly, shaded as the danger zone. */}
            {fStar > 0 && (
              <rect
                x={x(fStar)}
                y={area.top}
                width={Math.max(0, area.right - x(fStar))}
                height={area.bottom - area.top}
                fill="var(--series-2)"
                opacity={0.07}
              />
            )}

            <path d={path} fill="none" stroke="var(--series-1)" strokeWidth={2} />

            {fStar > 0 && (
              <>
                <line
                  x1={x(fStar)}
                  x2={x(fStar)}
                  y1={y(kelly.growthRate(state.probability, b, fStar))}
                  y2={area.bottom}
                  stroke="var(--series-7)"
                  strokeWidth={2}
                />
                <circle
                  cx={x(fStar)}
                  cy={y(kelly.growthRate(state.probability, b, fStar))}
                  r={5}
                  fill="var(--series-7)"
                  stroke="var(--surface-1)"
                  strokeWidth={2}
                />
                <text
                  x={x(fStar)}
                  y={area.top + 12}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="var(--series-7)"
                >
                  f* = {fixed(fStar, 3)}
                </text>

                {/* Half Kelly: the industry default, marked for comparison. */}
                <line
                  x1={x(result.half)}
                  x2={x(result.half)}
                  y1={y(kelly.growthRate(state.probability, b, result.half))}
                  y2={area.bottom}
                  stroke="var(--series-3)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
                <text
                  x={x(result.half)}
                  y={area.top + 27}
                  textAnchor="middle"
                  fontSize={10.5}
                  fill="var(--series-3)"
                >
                  half
                </text>
              </>
            )}

            {hoverFraction !== null && (
              <line
                x1={x(hoverFraction)}
                x2={x(hoverFraction)}
                y1={area.top}
                y2={area.bottom}
                stroke="var(--text-muted)"
                strokeWidth={1}
              />
            )}
          </Plot>

          {anchor && hoverFraction !== null && hoverGrowth !== null && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH)}
              heading={`Staking ${pct(hoverFraction, 1)}`}
              rows={[
                {
                  label: 'Log growth',
                  value: Number.isFinite(hoverGrowth) ? hoverGrowth.toFixed(5) : '−∞',
                  color: 'var(--series-1)',
                },
                {
                  label: 'vs full Kelly',
                  value: fStar > 0 ? `${(hoverFraction / fStar).toFixed(2)}×` : 'n/a',
                },
              ]}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'Growth rate', color: 'var(--series-1)' },
            { label: 'Full Kelly', color: 'var(--series-7)' },
            { label: 'Half Kelly', color: 'var(--series-3)', dashed: true },
            { label: 'Zero growth', color: 'var(--text-primary)', dashed: true },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          The curve is <strong>asymmetric</strong>. Underbetting costs you a little growth;
          overbetting falls off a cliff. Stake twice full Kelly and the growth rate is back to zero
          — all that risk bought nothing. Past that it goes negative, and the bankroll shrinks in
          expectation no matter how good the edge was.
        </p>
        <p>
          That asymmetry is the entire reason this system uses Kelly as a <em>gate</em> rather than
          a sizer. f* is only optimal if p and b are known exactly. They never are, and since
          errors to the right cost far more than errors to the left, the honest move is to use the
          sign and let a different method choose the size.
        </p>
        <p>
          Drag <strong>P(win)</strong> down toward {pct(breakeven, 1)} — the breakeven rate for this
          payoff ratio. The peak slides to zero and the gate flips to EXCLUDED. Below that line no
          payoff ratio rescues the trade, which is why the gate takes no argument.
        </p>
      </Note>
    </Plate>
  );
}
