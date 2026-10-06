/**
 * Universe screening.
 *
 * A ranked table is the right form for "which names clear the bar" — the scatter
 * beside it answers the different question of where the edge concentrates.
 */

import { useMemo, useState } from 'react';

import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, Tooltip, plotArea, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { SCREENER_ROWS } from '../lib/samples';
import { ControlRow, Slider } from '../controls/Controls';
import { pct } from '../charts/format';
import { linear } from '../charts/scale';

const WIDTH = 580;
const HEIGHT = 380;
const MARGINS = { top: 18, right: 24, bottom: 48, left: 58 };

/** Three categorical hues only — the all-pairs cap for scatter forms. */
const EDGE_COLORS: Readonly<Record<string, string>> = {
  High: 'var(--series-1)',
  Medium: 'var(--series-2)',
  Low: 'var(--series-3)',
};

export default function StockScreener() {
  const [minScore, setMinScore] = useState(50);

  const passing = useMemo(() => SCREENER_ROWS.filter((r) => r.score >= minScore), [minScore]);

  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const x = linear([0, 0.7], [area.left, area.right]);
  const y = linear([0.4, 0.9], [area.bottom, area.top]);

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<string | null>(null);

  return (
    <Plate
      title="Universe screening"
      question="Out of a thousand names, which few are worth a full gauntlet run?"
      source="tools/stock_screener.py"
    >
      <ControlRow>
        <Slider label="Minimum edge score" value={minScore} min={0} max={100} step={1} onChange={setMinScore} format={(v) => `${v}`} hint="Where your analytical edge is strongest" />
      </ControlRow>

      <Readouts
        items={[
          { label: 'Universe', value: `${SCREENER_ROWS.length}` },
          { label: 'Passing', value: `${passing.length}`, tone: passing.length > 0 ? 'good' : 'warning' },
          { label: 'Top score', value: `${SCREENER_ROWS[0]?.score ?? 0}` },
          { label: 'High-edge names', value: `${passing.filter((r) => r.edge === 'High').length}` },
        ]}
      />

      <Figure
        caption="Revenue growth against gross margin, sized by edge score. The screener's job is to narrow a universe, not to pick."
        table={
          <DataTable
            columns={['Ticker', 'Score', 'Revenue growth', 'Gross margin', 'P/E', 'Moat', 'Edge']}
            rows={passing.map((r) => [r.ticker, r.score, pct(r.revenueGrowth), pct(r.grossMargin), r.pe || '—', r.moat, r.edge])}
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
            title="Screened names by revenue growth and gross margin"
            xLabel="Revenue growth"
            yLabel="Gross margin"
            formatX={(v) => pct(v)}
            formatY={(v) => pct(v)}
          >
            {SCREENER_ROWS.map((row) => {
              const included = row.score >= minScore;
              const radius = 5 + (row.score / 100) * 11;
              return (
                <g key={row.ticker}>
                  <circle
                    cx={x(row.revenueGrowth)}
                    cy={y(row.grossMargin)}
                    r={radius}
                    fill={EDGE_COLORS[row.edge] ?? 'var(--text-muted)'}
                    opacity={included ? (hover === null || hover === row.ticker ? 0.72 : 0.3) : 0.1}
                    stroke="var(--surface-1)"
                    strokeWidth={2}
                    onPointerEnter={() => setHover(row.ticker)}
                  />
                  {/* Direct labels: identity never rests on colour alone. */}
                  <text
                    x={x(row.revenueGrowth)}
                    y={y(row.grossMargin) - radius - 5}
                    textAnchor="middle"
                    fontSize={10.5}
                    fill={included ? 'var(--text-secondary)' : 'var(--text-muted)'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {row.ticker}
                  </text>
                </g>
              );
            })}
          </Plot>

          {anchor && hover && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 200)}
              heading={hover}
              rows={(() => {
                const r = SCREENER_ROWS.find((s) => s.ticker === hover)!;
                return [
                  { label: 'Edge score', value: `${r.score}`, color: EDGE_COLORS[r.edge] },
                  { label: 'Revenue growth', value: pct(r.revenueGrowth) },
                  { label: 'Gross margin', value: pct(r.grossMargin) },
                  { label: 'Moat', value: r.moat },
                ];
              })()}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'High edge', color: 'var(--series-1)' },
            { label: 'Medium edge', color: 'var(--series-2)' },
            { label: 'Low edge', color: 'var(--series-3)' },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          The screen does not rank by quality. It ranks by where <em>this analyst's</em> edge is
          strongest — ecosystem lock-in, developer behaviour, enterprise switching costs — because
          a cheap stock in a domain you cannot read is not an opportunity.
        </p>
        <p>
          Raising the threshold narrows the field fast. That is the intent: the gauntlet is
          expensive to run, so the screener's only job is to decide what deserves it. Everything
          downstream assumes the universe was already cut on something other than price.
        </p>
      </Note>
    </Plate>
  );
}
