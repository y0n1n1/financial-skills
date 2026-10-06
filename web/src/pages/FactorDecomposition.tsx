/**
 * Fama-French factor decomposition.
 *
 * Grouped bars per factor, so the question "are these the same bet three times"
 * is answered by whether the bars move together.
 */

import { useState } from 'react';

import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Tooltip, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { CORRELATIONS, CORRELATION_TICKERS, FACTOR_LOADINGS } from '../lib/samples';
import { fixed } from '../charts/format';
import { band, linear, niceTicks } from '../charts/scale';

const WIDTH = 700;
const HEIGHT = 300;
const LEFT = 86;

const FACTORS = [
  { key: 'market', label: 'Market', color: 'var(--series-1)' },
  { key: 'size', label: 'Size (SMB)', color: 'var(--series-2)' },
  { key: 'value', label: 'Value (HML)', color: 'var(--series-3)' },
] as const;

export default function FactorDecomposition() {
  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<{ ticker: string; factor: string } | null>(null);

  const values = FACTOR_LOADINGS.flatMap((r) => FACTORS.map((f) => r[f.key]));
  const x = linear([Math.min(0, ...values) - 0.1, Math.max(...values) + 0.15], [LEFT, WIDTH - 30]);
  const groups = band(FACTOR_LOADINGS.length, [12, HEIGHT - 44], 0.24);

  const avgCorrelation =
    CORRELATIONS.flatMap((row, i) => row.filter((_, j) => j > i)).reduce((a, b) => a + b, 0) /
    ((CORRELATION_TICKERS.length * (CORRELATION_TICKERS.length - 1)) / 2);

  return (
    <Plate
      title="Factor decomposition"
      question="Is this book diversified, or is it the same factor exposure wearing five tickers?"
      source="tools/factor_decomposition.py"
    >
      <Readouts
        items={[
          { label: 'Positions', value: `${FACTOR_LOADINGS.length}` },
          { label: 'Avg pairwise correlation', value: fixed(avgCorrelation, 2), tone: avgCorrelation > 0.5 ? 'warning' : 'good' },
          { label: 'Mean market beta', value: fixed(FACTOR_LOADINGS.reduce((s, r) => s + r.market, 0) / FACTOR_LOADINGS.length, 2) },
          { label: 'Mean R²', value: fixed(FACTOR_LOADINGS.reduce((s, r) => s + r.r2, 0) / FACTOR_LOADINGS.length, 2), hint: 'variance explained by factors' },
        ]}
      />

      <Figure
        caption="Factor loadings per position. Bars pointing the same way across every row mean one shared bet, not five independent ones."
        table={
          <DataTable
            columns={['Ticker', 'Market', 'Size', 'Value', 'Momentum', 'Alpha', 'R²']}
            rows={FACTOR_LOADINGS.map((r) => [r.ticker, fixed(r.market, 2), fixed(r.size, 2), fixed(r.value, 2), fixed(r.momentum, 2), fixed(r.alpha, 2), fixed(r.r2, 2)])}
          />
        }
      >
        <div ref={wrapperRef} style={{ position: 'relative' }} onPointerMove={onPointerMove} onPointerLeave={() => { onPointerLeave(); setHover(null); }}>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
            <title>Fama-French factor loadings for each position</title>
            {niceTicks(x.domain[0], x.domain[1], 6).map((tick) => (
              <g key={tick}>
                <line x1={x(tick)} x2={x(tick)} y1={8} y2={HEIGHT - 36} stroke="var(--grid)" strokeWidth={1} shapeRendering="crispEdges" />
                <text x={x(tick)} y={HEIGHT - 20} textAnchor="middle" fontSize={11} fill="var(--text-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {tick.toFixed(1)}
                </text>
              </g>
            ))}

            {FACTOR_LOADINGS.map((row, i) => {
              const barHeight = groups.width / FACTORS.length;
              return (
                <g key={row.ticker}>
                  <text x={LEFT - 10} y={groups.position(i) + groups.width / 2} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--text-secondary)">
                    {row.ticker}
                  </text>
                  {FACTORS.map((factor, j) => {
                    const value = row[factor.key];
                    const zero = x(0);
                    const end = x(value);
                    const active = hover === null || hover.ticker === row.ticker;
                    return (
                      <rect
                        key={factor.key}
                        x={Math.min(zero, end)}
                        y={groups.position(i) + j * barHeight + 1}
                        width={Math.max(1, Math.abs(end - zero))}
                        height={barHeight - 2}
                        rx={2}
                        fill={factor.color}
                        opacity={active ? 0.88 : 0.3}
                        onPointerEnter={() => setHover({ ticker: row.ticker, factor: factor.key })}
                      />
                    );
                  })}
                </g>
              );
            })}

            <line x1={x(0)} x2={x(0)} y1={8} y2={HEIGHT - 36} stroke="var(--axis)" strokeWidth={1.5} />
            <text x={(LEFT + WIDTH) / 2} y={HEIGHT - 4} textAnchor="middle" fontSize={11} fill="var(--text-secondary)">
              Factor loading
            </text>
          </svg>

          {anchor && hover && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 190)}
              heading={hover.ticker}
              rows={FACTORS.map((f) => ({
                label: f.label,
                value: fixed(FACTOR_LOADINGS.find((r) => r.ticker === hover.ticker)![f.key], 2),
                color: f.color,
              }))}
            />
          )}
        </div>
        <Legend items={FACTORS.map((f) => ({ label: f.label, color: f.color }))} />
      </Figure>

      <Figure caption="Pairwise return correlation. A sequential ramp, light to dark — darker means the two names move together more.">
        <svg viewBox={`0 0 ${WIDTH} ${CORRELATION_TICKERS.length * 44 + 36}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
          <title>Pairwise correlation matrix between positions</title>
          {CORRELATION_TICKERS.map((ticker, j) => (
            <text key={`col-${ticker}`} x={120 + j * 92 + 42} y={16} textAnchor="middle" fontSize={11.5} fill="var(--text-secondary)">
              {ticker}
            </text>
          ))}
          {CORRELATION_TICKERS.map((ticker, i) => (
            <g key={ticker}>
              <text x={112} y={30 + i * 44 + 20} textAnchor="end" dominantBaseline="central" fontSize={11.5} fill="var(--text-secondary)">
                {ticker}
              </text>
              {CORRELATION_TICKERS.map((other, j) => {
                const value = CORRELATIONS[i]![j]!;
                // One hue, stepped by magnitude — the sequential rule.
                const step = value >= 0.8 ? 600 : value >= 0.65 ? 500 : value >= 0.5 ? 400 : value >= 0.4 ? 300 : 200;
                return (
                  <g key={other}>
                    <rect x={120 + j * 92 + 1} y={30 + i * 44 + 1} width={84} height={38} rx={3} fill={`var(--seq-${step})`} opacity={i === j ? 0.25 : 0.9} />
                    <text
                      x={120 + j * 92 + 42}
                      y={30 + i * 44 + 20}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={12}
                      fontWeight={600}
                      fill={step >= 500 ? '#fff' : 'var(--text-primary)'}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {fixed(value, 2)}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </Figure>

      <Note title="What to look for">
        <p>
          Every position loads positively on market and negatively on value. That is one bet —
          long growth, long beta — expressed five ways. The position count says diversified; the
          factor loadings say otherwise, and only one of them is right.
        </p>
        <p>
          Alpha is what is left once the factors are stripped out, and it is small everywhere.
          Most of what feels like stock picking is factor exposure you could have bought far more
          cheaply, which is the uncomfortable thing this decomposition is for.
        </p>
        <p>
          Correlations near {fixed(avgCorrelation, 2)} on average matter most exactly when they
          matter most: in a drawdown they converge toward one, which is the regime the cluster caps
          in the sizing stage exist to survive.
        </p>
      </Note>
    </Plate>
  );
}
