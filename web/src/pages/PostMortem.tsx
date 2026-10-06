/**
 * Post-mortem meta-analysis.
 *
 * One review per closed position is useful; the pattern across all of them is
 * where the system actually learns, so the plate leads with the aggregate.
 */

import { useState } from 'react';

import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, Tooltip, plotArea, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { POST_MORTEMS } from '../lib/samples';
import { signedPct } from '../charts/format';
import { linear } from '../charts/scale';

const WIDTH = 620;
const HEIGHT = 340;
const MARGINS = { top: 18, right: 26, bottom: 48, left: 60 };

export default function PostMortem() {
  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const x = linear([0, 24], [area.left, area.right]);
  const y = linear([-0.6, 0.5], [area.bottom, area.top]);

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<string | null>(null);

  const wins = POST_MORTEMS.filter((p) => p.outcome === 'win');
  const meanHoldWin = wins.reduce((s, p) => s + p.held, 0) / wins.length;
  const losses = POST_MORTEMS.filter((p) => p.outcome === 'loss');
  const meanHoldLoss = losses.reduce((s, p) => s + p.held, 0) / losses.length;

  return (
    <Plate
      title="Post-mortem meta-analysis"
      question="Across every closed position, what keeps going wrong?"
      source="tools/post_mortem.py"
    >
      <Readouts
        items={[
          { label: 'Closed', value: `${POST_MORTEMS.length}` },
          { label: 'Win rate', value: `${Math.round((wins.length / POST_MORTEMS.length) * 100)}%` },
          { label: 'Mean hold, wins', value: `${meanHoldWin.toFixed(0)} mo`, tone: 'good' },
          { label: 'Mean hold, losses', value: `${meanHoldLoss.toFixed(0)} mo`, tone: 'warning' },
        ]}
      />

      <Figure
        caption="Return against holding period for every closed position. The asymmetry in holding time is the pattern worth noticing."
        table={
          <DataTable
            columns={['Ticker', 'Outcome', 'Return', 'Held', 'Cause', 'Lesson']}
            rows={POST_MORTEMS.map((p) => [p.ticker, p.outcome, signedPct(p.ret, 0), `${p.held} mo`, p.cause, p.lesson])}
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
            title="Realised return against months held for each closed position"
            xLabel="Months held"
            yLabel="Realised return"
            formatX={(v) => `${v.toFixed(0)}`}
            formatY={(v) => signedPct(v, 0)}
          >
            <line x1={area.left} x2={area.right} y1={y(0)} y2={y(0)} stroke="var(--text-primary)" strokeWidth={1.5} strokeDasharray="3 3" />

            {POST_MORTEMS.map((p) => (
              <g key={p.ticker}>
                <circle
                  cx={x(p.held)}
                  cy={y(p.ret)}
                  r={hover === p.ticker ? 9 : 7}
                  fill={p.ret >= 0 ? 'var(--div-pos)' : 'var(--div-neg)'}
                  opacity={hover === null || hover === p.ticker ? 0.78 : 0.3}
                  stroke="var(--surface-1)"
                  strokeWidth={2}
                  onPointerEnter={() => setHover(p.ticker)}
                />
                <text
                  x={x(p.held)}
                  y={y(p.ret) - 14}
                  textAnchor="middle"
                  fontSize={10.5}
                  fill="var(--text-secondary)"
                  style={{ pointerEvents: 'none' }}
                >
                  {p.ticker}
                </text>
              </g>
            ))}
          </Plot>

          {anchor && hover && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 220)}
              heading={hover}
              rows={(() => {
                const p = POST_MORTEMS.find((m) => m.ticker === hover)!;
                return [
                  { label: 'Return', value: signedPct(p.ret, 0) },
                  { label: 'Held', value: `${p.held} months` },
                  { label: 'Lesson', value: p.lesson },
                ];
              })()}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'Profitable', color: 'var(--div-pos)' },
            { label: 'Loss', color: 'var(--div-neg)' },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          Wins are held about {meanHoldWin.toFixed(0)} months, losses about {meanHoldLoss.toFixed(0)}.
          That gap is the disposition effect, visible in the data rather than argued about —
          winners run and losers get cut, or the reverse, and only the record can say which.
        </p>
        <p>
          The lessons column repeats. “Reflexivity check skipped” and “competitive triggers too
          loose” are process failures, not bad luck, and they are fixable in a way that a single
          bad outcome never is. One post-mortem is an anecdote; six start to be a diagnosis.
        </p>
        <p>
          This is why a post-mortem is mandatory on every close, including the profitable ones. A
          position that made money for a reason you did not anticipate is a process failure with a
          pleasant outcome, and it will not stay pleasant.
        </p>
      </Note>
    </Plate>
  );
}
