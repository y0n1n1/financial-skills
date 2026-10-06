/**
 * Earnings-call language tracking.
 *
 * A multi-series line over time — the one form where change-over-time is the
 * whole question, and where a turn two quarters before the numbers is the signal.
 */

import { useState } from 'react';

import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, Tooltip, plotArea, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { EARNINGS_COMPANIES, EARNINGS_LANGUAGE } from '../lib/samples';
import { fixed } from '../charts/format';
import { linear } from '../charts/scale';

const WIDTH = 700;
const HEIGHT = 330;
const MARGINS = { top: 18, right: 64, bottom: 50, left: 54 };

const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'] as const;

export default function EarningsLanguage() {
  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const x = linear([0, EARNINGS_LANGUAGE.length - 1], [area.left, area.right]);
  const y = linear([0.2, 0.7], [area.bottom, area.top]);

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const latest = EARNINGS_LANGUAGE[EARNINGS_LANGUAGE.length - 1]!;
  const prior = EARNINGS_LANGUAGE[EARNINGS_LANGUAGE.length - 2]!;
  const meanLatest = EARNINGS_COMPANIES.reduce((s, c) => s + latest[c], 0) / EARNINGS_COMPANIES.length;
  const meanPrior = EARNINGS_COMPANIES.reduce((s, c) => s + prior[c], 0) / EARNINGS_COMPANIES.length;

  return (
    <Plate
      title="Earnings-call language"
      question="Is the tone on capex turning before the capex numbers do?"
      source="tools/earnings_language.py"
    >
      <Readouts
        items={[
          { label: 'Latest mean sentiment', value: fixed(meanLatest, 2), tone: meanLatest < meanPrior ? 'warning' : 'good' },
          { label: 'Quarter-on-quarter', value: `${meanLatest - meanPrior >= 0 ? '+' : ''}${fixed(meanLatest - meanPrior, 2)}` },
          { label: 'Quarters tracked', value: `${EARNINGS_LANGUAGE.length}` },
          { label: 'Consecutive declines', value: '2', tone: 'warning' },
        ]}
      />

      <Figure
        caption="Capex sentiment extracted from each hyperscaler's earnings call, by quarter. Higher means more committed language."
        table={
          <DataTable
            columns={['Quarter', ...EARNINGS_COMPANIES]}
            rows={EARNINGS_LANGUAGE.map((row) => [row.quarter, ...EARNINGS_COMPANIES.map((c) => fixed(row[c], 2))])}
          />
        }
      >
        <div ref={wrapperRef} style={{ position: 'relative' }} onPointerMove={onPointerMove} onPointerLeave={() => { onPointerLeave(); setHoverIndex(null); }}>
          <Plot
            width={WIDTH}
            height={HEIGHT}
            margins={MARGINS}
            x={x}
            y={y}
            title="Capex sentiment by company across quarters"
            xLabel="Quarter"
            yLabel="Capex sentiment"
            formatX={(v) => EARNINGS_LANGUAGE[Math.round(v)]?.quarter ?? ''}
            formatY={(v) => v.toFixed(1)}
            xTicks={EARNINGS_LANGUAGE.length}
            hideXGrid
            onHover={(point) => setHoverIndex(point ? Math.max(0, Math.min(EARNINGS_LANGUAGE.length - 1, Math.round(point.x))) : null)}
          >
            {hoverIndex !== null && (
              <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={area.top} y2={area.bottom} stroke="var(--text-muted)" strokeWidth={1} />
            )}

            {EARNINGS_COMPANIES.map((company, i) => (
              <g key={company}>
                <path
                  d={EARNINGS_LANGUAGE.map((row, j) => `${j === 0 ? 'M' : 'L'}${x(j)},${y(row[company])}`).join('')}
                  fill="none"
                  stroke={COLORS[i]}
                  strokeWidth={2}
                />
                {EARNINGS_LANGUAGE.map((row, j) => (
                  <circle key={j} cx={x(j)} cy={y(row[company])} r={hoverIndex === j ? 5 : 3.5} fill={COLORS[i]} stroke="var(--surface-1)" strokeWidth={1.5} />
                ))}
                {/* Direct label at the series end. */}
                <text x={area.right + 6} y={y(latest[company])} fontSize={10.5} dominantBaseline="central" fill={COLORS[i]}>
                  {company}
                </text>
              </g>
            ))}
          </Plot>

          {anchor && hoverIndex !== null && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 180)}
              heading={EARNINGS_LANGUAGE[hoverIndex]!.quarter}
              rows={EARNINGS_COMPANIES.map((company, i) => ({
                label: company,
                value: fixed(EARNINGS_LANGUAGE[hoverIndex]![company], 2),
                color: COLORS[i],
              }))}
            />
          )}
        </div>
        <Legend items={EARNINGS_COMPANIES.map((c, i) => ({ label: c, color: COLORS[i]! }))} />
      </Figure>

      <Note title="What to look for">
        <p>
          All four lines turn together, two quarters before any capex number would show it. That
          correlation is the point and also the warning: language moves as a group because these
          companies watch each other, so four confirming readings are closer to one observation
          than to four.
        </p>
        <p>
          In the demand-chain framing this is a leading indicator with one to three quarters of
          advance notice, which makes it exactly the kind of signal an FMEA detection score rewards.
          It is also soft, easily over-read, and worth little on its own — hence a weekly mosaic
          rather than a trigger.
        </p>
      </Note>
    </Plate>
  );
}
