/**
 * Free-parameter extraction and value-of-information ranking.
 *
 * The bars rank parameters by how much resolving each one would change the
 * sizing decision, which is a different question from how uncertain they are.
 */

import { useState } from 'react';

import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Tooltip, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { FREE_PARAMETERS } from '../lib/samples';
import { fixed } from '../charts/format';
import { band, linear } from '../charts/scale';

const WIDTH = 700;
const LABEL = 196;

export default function QuestionGenerator() {
  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<string | null>(null);

  const sorted = [...FREE_PARAMETERS].sort((a, b) => b.evppi - a.evppi);
  const asked = sorted.filter((p) => p.asked);
  const withDeps = sorted.filter((p) => p.depends.length > 0);

  const x = linear([0, Math.max(...sorted.map((p) => p.evppi)) * 1.15], [LABEL, WIDTH - 70]);
  const bands = band(sorted.length, [10, sorted.length * 34 + 10], 0.3);
  const height = sorted.length * 34 + 42;

  return (
    <Plate
      title="Free-parameter extraction"
      question="Which unknown, if you resolved it, would most change what you do?"
      source="tools/question_generator.py"
    >
      <Readouts
        items={[
          { label: 'Free parameters', value: `${sorted.length}` },
          { label: 'Worth asking', value: `${asked.length}`, tone: 'good' },
          { label: 'Dependent', value: `${withDeps.length}`, hint: 'not independently askable' },
          { label: 'Top EVPPI', value: fixed(sorted[0]?.evppi ?? 0, 2) },
        ]}
      />

      <Figure
        caption="Expected value of perfect information per parameter. Shaded bars are dependent on another parameter, so asking them separately double-counts."
        table={
          <DataTable
            columns={['Parameter', 'Unit', 'Kind', 'Depends on', 'EVPPI', 'Asked']}
            align={['left', 'left', 'left', 'left', 'right', 'left']}
            rows={sorted.map((p) => [p.name, p.unit, p.kind, p.depends.join(', ') || '—', fixed(p.evppi, 2), p.asked ? 'yes' : 'no'])}
          />
        }
      >
        <div ref={wrapperRef} style={{ position: 'relative' }} onPointerMove={onPointerMove} onPointerLeave={() => { onPointerLeave(); setHover(null); }}>
          <svg viewBox={`0 0 ${WIDTH} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
            <title>Free parameters ranked by expected value of perfect information</title>
            {sorted.map((parameter, i) => {
              const width = Math.max(2, x(parameter.evppi) - LABEL);
              const dependent = parameter.depends.length > 0;
              const active = hover === null || hover === parameter.name;
              return (
                <g key={parameter.name} onPointerEnter={() => setHover(parameter.name)}>
                  <text x={LABEL - 12} y={bands.position(i) + bands.width / 2} textAnchor="end" dominantBaseline="central" fontSize={11.5} fill={parameter.asked ? 'var(--text-primary)' : 'var(--text-muted)'}>
                    {parameter.name}
                  </text>
                  <rect
                    x={LABEL}
                    y={bands.position(i)}
                    width={width}
                    height={bands.width}
                    rx={3}
                    fill={dependent ? 'var(--series-2)' : 'var(--series-1)'}
                    opacity={active ? (parameter.asked ? 0.88 : 0.4) : 0.25}
                  />
                  <text
                    x={LABEL + width + 8}
                    y={bands.position(i) + bands.width / 2}
                    dominantBaseline="central"
                    fontSize={11}
                    fill="var(--text-primary)"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {fixed(parameter.evppi, 2)}
                  </text>
                </g>
              );
            })}
          </svg>

          {anchor && hover && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 220)}
              heading={hover}
              rows={(() => {
                const p = sorted.find((q) => q.name === hover)!;
                return [
                  { label: 'EVPPI', value: fixed(p.evppi, 2) },
                  { label: 'Unit', value: p.unit },
                  { label: 'Kind', value: p.kind },
                  { label: 'Depends on', value: p.depends.join(', ') || 'nothing' },
                ];
              })()}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'Independently askable', color: 'var(--series-1)' },
            { label: 'Depends on another parameter', color: 'var(--series-2)' },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          The ranking is by decision impact, not by uncertainty. A parameter can be wildly unknown
          and still rank last, because resolving it would not change the size of the position — and
          research time spent there buys nothing but comfort.
        </p>
        <p>
          The dependency check matters more than it looks. Terminal multiple depends on net margin,
          so asking about both as if they were independent double-counts the same belief and
          produces a posterior that is falsely narrow. The generator refuses to ask them separately.
        </p>
        <p>
          Below the top few, the bars flatten. That flattening is the stop signal: when the marginal
          value of the next question drops below the value of acting, more research is procrastination
          with a spreadsheet.
        </p>
      </Note>
    </Plate>
  );
}
