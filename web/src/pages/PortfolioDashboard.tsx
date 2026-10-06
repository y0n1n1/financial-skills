/**
 * Portfolio and theory status.
 *
 * Two things in one view: what is held, and how stale the reasoning behind each
 * holding has become. The second is the one people forget to look at.
 */

import { DataTable, Figure, Flag, Note, Plate, Readouts } from '../charts/Plate';
import { Legend } from '../charts/Plot';
import { POSITIONS } from '../lib/samples';
import { pct, signedPct } from '../charts/format';
import { linear } from '../charts/scale';

const WIDTH = 700;

/** Theory cards older than this are treated as stale. */
const STALE_DAYS = 60;

export default function PortfolioDashboard() {
  const totalPnl = POSITIONS.reduce((sum, p) => sum + p.weight * p.pnl, 0);
  const stale = POSITIONS.filter((p) => p.theoryAge !== null && p.theoryAge > STALE_DAYS);

  const scale = linear([0, 1], [0, WIDTH - 24]);
  let cursor = 0;

  return (
    <Plate
      title="Portfolio & theory status"
      question="What is held, and how old is the reasoning behind each position?"
      source="tools/portfolio_dashboard.py"
    >
      <Readouts
        items={[
          { label: 'Positions', value: `${POSITIONS.length - 1}` },
          { label: 'Weighted P&L', value: signedPct(totalPnl, 1), tone: totalPnl > 0 ? 'good' : 'critical' },
          { label: 'Cash', value: pct(POSITIONS.find((p) => p.ticker === 'CASH')?.weight ?? 0) },
          { label: 'Stale theories', value: `${stale.length}`, tone: stale.length > 0 ? 'warning' : 'good' },
        ]}
      />

      {stale.length > 0 && (
        <Flag tone="warning">
          {stale.length} theory {stale.length === 1 ? 'card is' : 'cards are'} more than {STALE_DAYS}{' '}
          days old ({stale.map((s) => s.ticker).join(', ')}). A position whose reasoning has not been
          revisited since entry is being held on momentum, not on a thesis.
        </Flag>
      )}

      <Figure caption="Allocation by position. Width is weight; the label is the role each holding plays.">
        <svg viewBox={`0 0 ${WIDTH} 128`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
          <title>Portfolio allocation by position</title>
          {POSITIONS.map((position, i) => {
            const left = scale(cursor);
            cursor += position.weight;
            const right = scale(cursor);
            const width = Math.max(0, right - left - 2);
            const color = position.ticker === 'CASH' ? 'var(--text-muted)' : `var(--series-${(i % 8) + 1})`;
            return (
              <g key={position.ticker}>
                <rect x={left + 12 + 1} y={12} width={width} height={44} rx={3} fill={color} opacity={0.86} />
                {width > 46 && (
                  <>
                    <text x={left + 13 + width / 2} y={28} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="#fff">
                      {position.ticker}
                    </text>
                    <text x={left + 13 + width / 2} y={44} textAnchor="middle" fontSize={10.5} fill="#fff" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {pct(position.weight)}
                    </text>
                  </>
                )}
                {/* Theory-age marker below each slice. */}
                {position.theoryAge !== null && width > 30 && (
                  <rect
                    x={left + 13}
                    y={62}
                    width={width}
                    height={6}
                    rx={2}
                    fill={position.theoryAge > STALE_DAYS ? 'var(--status-warning)' : 'var(--status-good)'}
                  />
                )}
              </g>
            );
          })}
          <text x={12} y={92} fontSize={11} fill="var(--text-secondary)">
            The bar beneath each slice is theory freshness.
          </text>
        </svg>
        <Legend
          items={[
            { label: 'Theory current', color: 'var(--status-good)' },
            { label: `Stale (> ${STALE_DAYS} days)`, color: 'var(--status-warning)' },
          ]}
        />
      </Figure>

      <Figure caption="Positions with their lifecycle state and theory age.">
        <DataTable
          columns={['Ticker', 'Role', 'Weight', 'P&L', 'Lifecycle state', 'Theory age']}
          rows={POSITIONS.map((p) => [
            p.ticker,
            p.role,
            pct(p.weight),
            p.ticker === 'CASH' ? '—' : signedPct(p.pnl, 1),
            p.state,
            p.theoryAge === null ? '—' : `${p.theoryAge} days`,
          ])}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          The position with the worst P&L also has the oldest theory card. That pairing is the one
          worth noticing: a losing position whose reasoning has not been re-examined in three
          months is usually being held because selling would make the loss real.
        </p>
        <p>
          Theory age is tracked as a first-class number for that reason. The gauntlet's output is
          perishable — regime, competitive position and the evidence base all move — and a card
          written before the last two earnings seasons is a historical document, not a thesis.
        </p>
      </Note>
    </Plate>
  );
}
