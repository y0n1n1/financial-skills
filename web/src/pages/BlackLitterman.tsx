/**
 * Black-Litterman allocation.
 *
 * Three stacked weight vectors — market, view, posterior — so the blend is
 * visible as movement rather than asserted in prose. Confidence is the dial that
 * slides the answer between the two ends.
 */

import { useMemo, useState } from 'react';

import { portfolio } from '@tfg/core';
import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Tooltip, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { ControlRow, ResetButton, Slider } from '../controls/Controls';
import { fixed, pct, signedPct } from '../charts/format';
import { band, linear } from '../charts/scale';

const WIDTH = 720;
const TICKERS = ['NVDA', 'GOOGL', 'META'] as const;

/**
 * A fixed, well-conditioned covariance matrix.
 *
 * Real covariance needs price history, which a static page cannot fetch — and
 * the allocation maths is what this plate is about, so the matrix is a constant
 * rather than a fiction dressed up as live data.
 */
const SIGMA = [
  [0.16, 0.072, 0.064],
  [0.072, 0.09, 0.054],
  [0.064, 0.054, 0.1225],
];

const MARKET_CAPS = [4.4e12, 2.1e12, 1.3e12];

const DEFAULTS = {
  viewNvda: -3.9,
  viewGoogl: -8.3,
  viewMeta: 0,
  confidence: 45,
  riskAversion: 2.5,
};

export default function BlackLitterman() {
  const [state, setState] = useState(DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(key: K, value: number) =>
    setState((s) => ({ ...s, [key]: value }));

  const result = useMemo(
    () =>
      portfolio.blackLitterman({
        tickers: [...TICKERS],
        market_caps: MARKET_CAPS,
        views: [state.viewNvda, state.viewGoogl, state.viewMeta],
        confidences: [state.confidence, state.confidence, state.confidence],
        sigma: SIGMA,
        risk_aversion: state.riskAversion,
      }),
    [state],
  );

  const rows = [
    {
      key: 'market',
      label: 'Market equilibrium',
      color: 'var(--series-1)',
      weights: TICKERS.map((t) => result.market_weights[t] ?? 0),
    },
    {
      key: 'bl',
      label: 'Black-Litterman posterior',
      color: 'var(--series-3)',
      weights: TICKERS.map((t) => result.bl_weights[t] ?? 0),
    },
  ];

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<{ row: string; ticker: string } | null>(null);

  const chartHeight = rows.length * 58 + 40;
  const bands = band(rows.length, [10, rows.length * 58 + 10], 0.34);
  const scale = linear([0, 1], [168, WIDTH - 40]);

  return (
    <Plate
      title="Black-Litterman"
      question="Given what the market already believes, how far should your view move the weights?"
      source="tools/portfolio_optimizer.py"
    >
      <ControlRow>
        <Slider label="View: NVDA" value={state.viewNvda} min={-30} max={40} step={0.5} onChange={(v) => set('viewNvda', v)} format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`} />
        <Slider label="View: GOOGL" value={state.viewGoogl} min={-30} max={40} step={0.5} onChange={(v) => set('viewGoogl', v)} format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`} />
        <Slider label="View: META" value={state.viewMeta} min={-30} max={40} step={0.5} onChange={(v) => set('viewMeta', v)} format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`} />
        <Slider label="Confidence in views" value={state.confidence} min={0} max={100} step={1} onChange={(v) => set('confidence', v)} format={(v) => `${v.toFixed(0)}%`} hint="0 trusts the market entirely" />
        <Slider label="Risk aversion δ" value={state.riskAversion} min={1} max={6} step={0.1} onChange={(v) => set('riskAversion', v)} format={(v) => v.toFixed(1)} />
        <ResetButton onClick={() => setState(DEFAULTS)} />
      </ControlRow>

      <Readouts
        items={[
          { label: 'Portfolio vol', value: `${fixed(result.portfolio_vol, 1)}%` },
          ...TICKERS.map((t) => ({
            label: t,
            value: pct(result.bl_weights[t] ?? 0, 1),
            hint: `from ${pct(result.market_weights[t] ?? 0, 1)}`,
          })),
        ]}
      />

      <Figure
        caption="Market-cap weights against the Black-Litterman posterior. The gap between the rows is everything your view contributed."
        table={
          <DataTable
            columns={['Ticker', 'Market weight', 'Equilibrium return', 'Your view', 'BL return', 'BL weight', 'Risk contribution']}
            rows={TICKERS.map((t) => [
              t,
              pct(result.market_weights[t] ?? 0, 1),
              `${signedPct((result.equilibrium_returns[t] ?? 0) / 100, 1)}`,
              `${signedPct((result.views_used[t] ?? 0) / 100, 1)}`,
              `${signedPct((result.bl_returns[t] ?? 0) / 100, 1)}`,
              pct(result.bl_weights[t] ?? 0, 1),
              `${fixed(result.risk_contribution[t] ?? 0, 1)}%`,
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
          <svg viewBox={`0 0 ${WIDTH} ${chartHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
            <title>Market equilibrium weights compared with Black-Litterman posterior weights</title>
            {rows.map((row, i) => {
              let cursor = 0;
              return (
                <g key={row.key}>
                  <text x={158} y={bands.position(i) + bands.width / 2} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--text-secondary)">
                    {row.label}
                  </text>
                  {row.weights.map((weight, j) => {
                    const left = scale(cursor);
                    cursor += weight;
                    const right = scale(cursor);
                    const ticker = TICKERS[j]!;
                    const active = hover === null || hover.ticker === ticker;
                    // A 2px surface gap separates stacked segments.
                    const width = Math.max(0, right - left - 2);
                    return (
                      <g key={ticker}>
                        <rect
                          x={left + 1}
                          y={bands.position(i)}
                          width={width}
                          height={bands.width}
                          rx={3}
                          fill={`var(--series-${j + 1})`}
                          opacity={active ? 0.88 : 0.3}
                          onPointerEnter={() => setHover({ row: row.key, ticker })}
                        />
                        {width > 42 && (
                          <text
                            x={left + 1 + width / 2}
                            y={bands.position(i) + bands.width / 2}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={11}
                            fontWeight={600}
                            fill="#fff"
                            style={{ fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}
                          >
                            {pct(weight)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Connector lines showing how each holding's weight shifted. */}
            {TICKERS.map((ticker, j) => {
              const marketStart = rows[0]!.weights.slice(0, j).reduce((a, b) => a + b, 0);
              const blStart = rows[1]!.weights.slice(0, j).reduce((a, b) => a + b, 0);
              return (
                <line
                  key={`link-${ticker}`}
                  x1={scale(marketStart)}
                  y1={bands.position(0) + bands.width}
                  x2={scale(blStart)}
                  y2={bands.position(1)}
                  stroke="var(--axis)"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
              );
            })}
          </svg>

          {anchor && hover && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 200)}
              heading={hover.ticker}
              rows={[
                { label: 'Market weight', value: pct(result.market_weights[hover.ticker] ?? 0, 1), color: 'var(--series-1)' },
                { label: 'BL weight', value: pct(result.bl_weights[hover.ticker] ?? 0, 1), color: 'var(--series-3)' },
                { label: 'Equilibrium return', value: signedPct((result.equilibrium_returns[hover.ticker] ?? 0) / 100, 1) },
                { label: 'Your view', value: signedPct((result.views_used[hover.ticker] ?? 0) / 100, 1) },
                { label: 'Blended return', value: signedPct((result.bl_returns[hover.ticker] ?? 0) / 100, 1) },
              ]}
            />
          )}
        </div>
        <Legend items={TICKERS.map((t, j) => ({ label: t, color: `var(--series-${j + 1})` }))} />
      </Figure>

      <Note title="What to look for">
        <p>
          Drag <strong>confidence</strong> to zero. The posterior row snaps onto the market row —
          with no confidence in your view, the optimal portfolio is the market portfolio. That is
          the property that makes Black-Litterman usable where naive mean-variance optimisation is
          not: it degrades to the sensible default instead of to nonsense.
        </p>
        <p>
          Now take it to 100. The weights swing hard toward whichever name your view favours. Mean-
          variance optimisers are notorious for this — small changes in expected returns produce
          enormous changes in weights — and the confidence parameter is what lets you sit somewhere
          between "I know nothing" and "I am certain" rather than being forced to one end.
        </p>
        <p>
          Watch the <strong>equilibrium returns</strong> in the table. They are not forecasts;
          they are reverse-engineered from what the market is holding — the returns the market must
          expect for current cap weights to be rational. Starting there means your view has to earn
          its deviation, instead of starting from a blank sheet and smuggling in a view unnoticed.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          The covariance matrix here is a fixed, well-conditioned constant. Real covariance needs
          price history this page cannot fetch; in the Python tool it comes from two years of daily
          returns at the adapter boundary, deliberately outside the allocation maths.
        </p>
      </Note>
    </Plate>
  );
}
