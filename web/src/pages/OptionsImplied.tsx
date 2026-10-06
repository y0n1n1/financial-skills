/**
 * Options-implied scenario probabilities.
 *
 * The point of the plate: these probabilities are not an opinion. They are read
 * off the options market, they sum to one by construction, and they cannot be
 * nudged to make a thesis look better.
 */

import { useMemo, useState } from 'react';

import { options } from '@tfg/core';
import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, Tooltip, plotArea, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { ControlRow, ResetButton, Slider } from '../controls/Controls';
import { fixed, pct, signedPct } from '../charts/format';
import { linear } from '../charts/scale';

const WIDTH = 720;
const HEIGHT = 320;
const MARGINS = { top: 18, right: 22, bottom: 46, left: 54 };

const DEFAULTS = { spot: 178, iv: 0.39, rf: 0.045, years: 1, b1: 130, b2: 155, b3: 250, b4: 360 };
const LABELS = ['worst', 'bear', 'base', 'bull', 'moon'] as const;

export default function OptionsImplied() {
  const [state, setState] = useState(DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(key: K, value: number) =>
    setState((s) => ({ ...s, [key]: value }));

  const boundaries = useMemo(
    () => [state.b1, state.b2, state.b3, state.b4].sort((a, b) => a - b),
    [state.b1, state.b2, state.b3, state.b4],
  );

  const result = useMemo(
    () =>
      options.scenarioProbabilities({
        spot: state.spot,
        iv: state.iv,
        rf: state.rf,
        expiry_years: state.years,
        scenario_boundaries: boundaries,
        scenario_labels: [...LABELS],
      }),
    [state, boundaries],
  );

  /** The lognormal density, for the shape behind the buckets. */
  const density = useMemo(() => {
    const mu = Math.log(state.spot) + (state.rf - 0.5 * state.iv ** 2) * state.years;
    const vol = state.iv * Math.sqrt(state.years);
    const lo = Math.max(1, state.spot * Math.exp(-3.5 * vol));
    const hi = state.spot * Math.exp(3.5 * vol);
    const points: Array<{ price: number; p: number }> = [];
    const steps = 240;
    for (let i = 0; i <= steps; i++) {
      const price = lo + ((hi - lo) * i) / steps;
      const z = (Math.log(price) - mu) / vol;
      const p = Math.exp(-(z * z) / 2) / (price * vol * Math.sqrt(2 * Math.PI));
      points.push({ price, p });
    }
    return { points, lo, hi };
  }, [state]);

  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const x = linear([density.lo, density.hi], [area.left, area.right]);
  const maxP = Math.max(...density.points.map((p) => p.p));
  const y = linear([0, maxP * 1.1], [area.bottom, area.top]);

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hoverBucket, setHoverBucket] = useState<number | null>(null);

  const probabilitySum = result.scenarios.reduce((s, b) => s + b.probability, 0);

  // Bucket edges in price space, with the open ends clipped to the plotted range.
  const bucketEdges = [density.lo, ...boundaries, density.hi];

  return (
    <Plate
      title="Options-implied probability"
      question="What is the market already pricing for each scenario, rather than what would be convenient to assume?"
      source="tools/options_implied_prob.py"
    >
      <ControlRow>
        <Slider label="Spot" value={state.spot} min={20} max={500} step={1} onChange={(v) => set('spot', v)} format={(v) => `$${v.toFixed(0)}`} />
        <Slider label="Implied volatility" value={state.iv} min={0.1} max={1.2} step={0.01} onChange={(v) => set('iv', v)} format={(v) => pct(v)} />
        <Slider label="Risk-free rate" value={state.rf} min={0} max={0.1} step={0.0025} onChange={(v) => set('rf', v)} format={(v) => pct(v, 2)} />
        <Slider label="Horizon" value={state.years} min={0.08} max={3} step={0.02} onChange={(v) => set('years', v)} format={(v) => `${v.toFixed(2)} yr`} />
        <Slider label="Boundary 1" value={state.b1} min={10} max={500} step={5} onChange={(v) => set('b1', v)} format={(v) => `$${v.toFixed(0)}`} />
        <Slider label="Boundary 2" value={state.b2} min={10} max={500} step={5} onChange={(v) => set('b2', v)} format={(v) => `$${v.toFixed(0)}`} />
        <Slider label="Boundary 3" value={state.b3} min={10} max={800} step={5} onChange={(v) => set('b3', v)} format={(v) => `$${v.toFixed(0)}`} />
        <Slider label="Boundary 4" value={state.b4} min={10} max={800} step={5} onChange={(v) => set('b4', v)} format={(v) => `$${v.toFixed(0)}`} />
        <ResetButton onClick={() => setState(DEFAULTS)} />
      </ControlRow>

      <Readouts
        items={[
          { label: 'Implied EV', value: signedPct(result.ev, 1), tone: result.ev > 0 ? 'good' : 'critical' },
          { label: 'P(below spot)', value: pct(options.probabilityBelow(state.spot, state.spot, state.years, state.rf, state.iv), 1) },
          { label: 'Buckets', value: `${result.scenarios.length}` },
          { label: 'Σ probability', value: fixed(probabilitySum, 6), hint: 'exactly 1 by construction' },
        ]}
      />

      <Figure
        caption="The risk-neutral terminal price density, partitioned at your boundaries. Each band's area is that scenario's implied probability."
        table={
          <DataTable
            columns={['Scenario', 'Price range', 'Implied probability', 'Representative return']}
            rows={result.scenarios.map((s) => [s.label, s.range, pct(s.probability, 2), signedPct(s.return, 1)])}
          />
        }
      >
        <div
          ref={wrapperRef}
          style={{ position: 'relative' }}
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            onPointerLeave();
            setHoverBucket(null);
          }}
        >
          <Plot
            width={WIDTH}
            height={HEIGHT}
            margins={MARGINS}
            x={x}
            y={y}
            title="Lognormal terminal price density with scenario buckets shaded"
            xLabel="Terminal price"
            yLabel="Density"
            formatX={(v) => `$${v.toFixed(0)}`}
            formatY={() => ''}
            hideXGrid
            hideYGrid
          >
            {/* One shaded band per bucket, alternating between two series slots so
                adjacent regions stay distinguishable, with a 2px surface gap. */}
            {result.scenarios.map((scenario, i) => {
              const left = x(bucketEdges[i] ?? density.lo);
              const right = x(bucketEdges[i + 1] ?? density.hi);
              const clipped = density.points.filter(
                (p) => p.price >= (bucketEdges[i] ?? density.lo) && p.price <= (bucketEdges[i + 1] ?? density.hi),
              );
              if (clipped.length < 2) return null;
              const path =
                `M${x(clipped[0]!.price)},${y(0)}` +
                clipped.map((p) => `L${x(p.price)},${y(p.p)}`).join('') +
                `L${x(clipped[clipped.length - 1]!.price)},${y(0)}Z`;
              const active = hoverBucket === null || hoverBucket === i;
              return (
                <g key={i}>
                  <path
                    d={path}
                    fill={i % 2 === 0 ? 'var(--series-1)' : 'var(--series-3)'}
                    opacity={active ? 0.5 : 0.18}
                  />
                  <rect
                    x={left + 1}
                    y={area.top}
                    width={Math.max(1, right - left - 2)}
                    height={area.bottom - area.top}
                    fill="transparent"
                    onPointerEnter={() => setHoverBucket(i)}
                  />
                  {/* Direct label, so each band is identified without the legend. */}
                  {right - left > 44 && (
                    <text
                      x={(left + right) / 2}
                      y={area.top + 13}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      fill="var(--text-primary)"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {pct(scenario.probability)}
                    </text>
                  )}
                  {right - left > 44 && (
                    <text x={(left + right) / 2} y={area.top + 26} textAnchor="middle" fontSize={10} fill="var(--text-secondary)">
                      {scenario.label}
                    </text>
                  )}
                </g>
              );
            })}

            <path
              d={density.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.price)},${y(p.p)}`).join('')}
              fill="none"
              stroke="var(--text-primary)"
              strokeWidth={2}
            />

            {boundaries.map((boundary, i) => (
              <line
                key={`boundary-${i}`}
                x1={x(boundary)}
                x2={x(boundary)}
                y1={area.top}
                y2={area.bottom}
                stroke="var(--axis)"
                strokeWidth={1}
              />
            ))}

            <line x1={x(state.spot)} x2={x(state.spot)} y1={area.top} y2={area.bottom} stroke="var(--series-2)" strokeWidth={2} strokeDasharray="4 3" />
            <text x={x(state.spot)} y={area.bottom - 6} textAnchor="middle" fontSize={10.5} fill="var(--series-2)">
              spot
            </text>
          </Plot>

          {anchor && hoverBucket !== null && result.scenarios[hoverBucket] && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH)}
              heading={result.scenarios[hoverBucket]!.label}
              rows={[
                { label: 'Range', value: result.scenarios[hoverBucket]!.range },
                { label: 'Implied P', value: pct(result.scenarios[hoverBucket]!.probability, 2) },
                { label: 'Return', value: signedPct(result.scenarios[hoverBucket]!.return, 1) },
              ]}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'Risk-neutral density', color: 'var(--text-primary)' },
            { label: 'Scenario bucket', color: 'var(--series-1)' },
            { label: 'Spot price', color: 'var(--series-2)', dashed: true },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          The probabilities sum to {fixed(probabilitySum, 6)}. Not approximately — the buckets
          partition the whole real line, so the sum is exactly one no matter where you drag the
          boundaries. That is the property an asserted scenario table never has, and the reason
          this replaces one.
        </p>
        <p>
          Push <strong>implied volatility</strong> up. Both tails fatten and the base case drains.
          High IV is the market saying it does not know, and it mechanically transfers probability
          from your comfortable middle scenario to the ones you would rather not think about.
        </p>
        <p>
          Shorten the <strong>horizon</strong> toward a month. The density collapses around spot:
          over short windows almost nothing can happen, so a thesis needing a large move soon is
          fighting the distribution. Lengthen it and the distribution skews right — lognormal
          returns have unbounded upside and a floor at zero.
        </p>
        <p>
          One caveat the plate cannot remove: these are <em>risk-neutral</em> probabilities. They
          carry the market's risk premium, so they are the market's pricing of a scenario rather
          than its honest forecast. The gauntlet uses them as the thing a view must disagree with,
          not as truth.
        </p>
      </Note>
    </Plate>
  );
}
