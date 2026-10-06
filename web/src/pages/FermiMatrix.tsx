/**
 * The revenue × multiple matrix every EV estimate comes from.
 *
 * A heatmap is the right form here: the data is a grid of magnitudes, and the
 * question is which cells carry the weight. One sequential hue, light to dark —
 * never a rainbow.
 */

import { useMemo, useState } from 'react';

import { ev } from '@tfg/core';
import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Tooltip, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { ControlRow, ResetButton, Segmented, Slider } from '../controls/Controls';
import { pct, signedPct, usdB } from '../charts/format';

const WIDTH = 680;
const CELL_HEIGHT = 56;
const LABEL_COL = 92;

const REVENUES = [365, 300, 240, 180];
const REVENUE_PROBS = [0.2, 0.4, 0.25, 0.15];
const MULTIPLES = [30, 22, 15];
const MULTIPLE_PROBS = [0.2, 0.5, 0.3];

enum Shade {
  Contribution = 'contribution',
  Return = 'return',
}

const SHADES = [
  { value: Shade.Contribution, label: 'EV contribution' },
  { value: Shade.Return, label: 'Return' },
] as const;

export default function FermiMatrix() {
  const [currentMcap, setCurrentMcap] = useState(4400);
  const [margin, setMargin] = useState(0.65);
  const [shade, setShade] = useState<Shade>(Shade.Contribution);

  const cells = useMemo(
    () =>
      REVENUES.flatMap((revenue, i) =>
        MULTIPLES.map((multiple, j) => {
          const impliedMcap = revenue * margin * multiple;
          const ret = (impliedMcap - currentMcap) / currentMcap;
          const weight = REVENUE_PROBS[i]! * MULTIPLE_PROBS[j]!;
          return { i, j, revenue, multiple, impliedMcap, ret, weight, contribution: weight * ret };
        }),
      ),
    [currentMcap, margin],
  );

  const totalEv = useMemo(
    () =>
      ev.deterministicEv({
        current_mcap: currentMcap,
        revenue_scenarios: REVENUES,
        revenue_probs: REVENUE_PROBS,
        multiple_scenarios: MULTIPLES,
        multiple_probs: MULTIPLE_PROBS,
        margin,
      }),
    [currentMcap, margin],
  );

  /** The market cap the matrix must reach for EV to be exactly zero. */
  const breakEvenMcap = useMemo(
    () =>
      cells.reduce((sum, cell) => sum + cell.weight * cell.revenue * margin * cell.multiple, 0),
    [cells, margin],
  );

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<string | null>(null);

  const values = cells.map((c) => (shade === Shade.Contribution ? c.contribution : c.ret));
  const maxAbs = Math.max(...values.map(Math.abs)) || 1;

  /**
   * Diverging fill: two poles with a neutral grey midpoint, never a hue at zero.
   * Returns straddle zero, so a diverging scale is the correct encoding.
   */
  const fillFor = (value: number) => {
    const t = Math.min(1, Math.abs(value) / maxAbs);
    const pole = value >= 0 ? 'var(--div-pos)' : 'var(--div-neg)';
    return { fill: pole, opacity: 0.1 + t * 0.78 };
  };

  const cellWidth = (WIDTH - LABEL_COL - 24) / MULTIPLES.length;
  const svgHeight = REVENUES.length * CELL_HEIGHT + 46;

  return (
    <Plate
      title="Revenue × multiple matrix"
      question="Which cells of the valuation grid actually carry the expected value?"
      source="theory/fermi-decomposition.md"
    >
      <ControlRow>
        <Slider label="Current market cap" value={currentMcap} min={1000} max={9000} step={100} onChange={setCurrentMcap} format={usdB} />
        <Slider label="Net margin" value={margin} min={0.15} max={0.9} step={0.01} onChange={setMargin} format={(v) => pct(v)} />
        <Segmented
          label="Shade cells by"
          value={shade}
          options={SHADES.map((s) => ({ value: s.value as string, label: s.label }))}
          onChange={(v) => setShade(v as Shade)}
        />
        <ResetButton
          onClick={() => {
            setCurrentMcap(4400);
            setMargin(0.65);
            setShade(Shade.Contribution);
          }}
        />
      </ControlRow>

      <Readouts
        items={[
          { label: 'Expected value', value: signedPct(totalEv, 1), tone: totalEv > 0 ? 'good' : 'critical' },
          { label: 'Probability-weighted cap', value: usdB(breakEvenMcap) },
          { label: 'Break-even cap', value: usdB(breakEvenMcap), hint: 'where EV = 0' },
          { label: 'Cells', value: `${cells.length}` },
        ]}
      />

      <Figure
        caption={`Each cell is one revenue × multiple outcome. Shading is ${shade === Shade.Contribution ? 'its contribution to expected value' : 'its return'}; the small figure is its probability weight.`}
        table={
          <DataTable
            columns={['Revenue', 'Multiple', 'Implied cap', 'Return', 'Weight', 'EV contribution']}
            rows={cells.map((c) => [
              usdB(c.revenue),
              `${c.multiple}×`,
              usdB(c.impliedMcap),
              signedPct(c.ret, 1),
              pct(c.weight, 1),
              signedPct(c.contribution, 2),
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
          <svg viewBox={`0 0 ${WIDTH} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
            <title>Revenue by multiple matrix, with each cell shaded by its expected-value contribution</title>

            {MULTIPLES.map((multiple, j) => (
              <text
                key={`col-${multiple}`}
                x={LABEL_COL + j * cellWidth + cellWidth / 2}
                y={16}
                textAnchor="middle"
                fontSize={11.5}
                fill="var(--text-secondary)"
              >
                {multiple}× · {pct(MULTIPLE_PROBS[j] ?? 0)}
              </text>
            ))}

            {REVENUES.map((revenue, i) => (
              <g key={`row-${revenue}`}>
                <text
                  x={LABEL_COL - 10}
                  y={28 + i * CELL_HEIGHT + CELL_HEIGHT / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={11.5}
                  fill="var(--text-secondary)"
                >
                  {usdB(revenue)} · {pct(REVENUE_PROBS[i] ?? 0)}
                </text>
                {MULTIPLES.map((_multiple, j) => {
                  const cell = cells.find((c) => c.i === i && c.j === j)!;
                  const key = `${i}-${j}`;
                  const value = shade === Shade.Contribution ? cell.contribution : cell.ret;
                  const { fill, opacity } = fillFor(value);
                  const active = hover === null || hover === key;
                  return (
                    <g key={key} onPointerEnter={() => setHover(key)}>
                      {/* 2px gap between cells keeps adjacent fills distinct. */}
                      <rect
                        x={LABEL_COL + j * cellWidth + 1}
                        y={28 + i * CELL_HEIGHT + 1}
                        width={cellWidth - 2}
                        height={CELL_HEIGHT - 2}
                        rx={3}
                        fill={fill}
                        opacity={active ? opacity : opacity * 0.4}
                      />
                      <text
                        x={LABEL_COL + j * cellWidth + cellWidth / 2}
                        y={28 + i * CELL_HEIGHT + CELL_HEIGHT / 2 - 6}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={13}
                        fontWeight={600}
                        fill="var(--text-primary)"
                        style={{ fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}
                      >
                        {signedPct(cell.ret, 0)}
                      </text>
                      <text
                        x={LABEL_COL + j * cellWidth + cellWidth / 2}
                        y={28 + i * CELL_HEIGHT + CELL_HEIGHT / 2 + 11}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={10}
                        fill="var(--text-secondary)"
                        style={{ fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}
                      >
                        w {pct(cell.weight, 0)} · {signedPct(cell.contribution, 1)}
                      </text>
                    </g>
                  );
                })}
              </g>
            ))}

            <text x={LABEL_COL} y={svgHeight - 8} fontSize={11.5} fill="var(--text-secondary)">
              Σ contributions = expected value ={' '}
              <tspan fontWeight={600} fill={totalEv > 0 ? 'var(--delta-up)' : 'var(--status-critical)'}>
                {signedPct(totalEv, 1)}
              </tspan>
            </text>
          </svg>

          {anchor && hover && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 210)}
              heading={(() => {
                const [i, j] = hover.split('-').map(Number);
                const cell = cells.find((c) => c.i === i && c.j === j)!;
                return `${usdB(cell.revenue)} at ${cell.multiple}×`;
              })()}
              rows={(() => {
                const [i, j] = hover.split('-').map(Number);
                const cell = cells.find((c) => c.i === i && c.j === j)!;
                return [
                  { label: 'Implied cap', value: usdB(cell.impliedMcap) },
                  { label: 'Return', value: signedPct(cell.ret, 1) },
                  { label: 'Probability', value: pct(cell.weight, 1) },
                  { label: 'EV contribution', value: signedPct(cell.contribution, 2) },
                ];
              })()}
            />
          )}
        </div>
      </Figure>

      <Note title="What to look for">
        <p>
          The extreme cells draw the eye and carry almost nothing. The top-left corner has the
          biggest return on the board and a 4% probability weight; the middle cells are unexciting
          and decide the answer. Expected value is a weighted sum, and weight is where attention
          should go.
        </p>
        <p>
          Drag <strong>current market cap</strong> until the total crosses zero. The cap where that
          happens — {usdB(breakEvenMcap)} — is the reverse-Fermi result: the valuation at which
          this whole scenario set is already priced in. Above it you are paying for outcomes better
          than the ones you just described.
        </p>
        <p>
          <strong>Net margin</strong> multiplies every cell at once, which is why it tends to
          dominate the sensitivity ranking. A single assumption that scales the entire grid deserves
          more scrutiny than any individual scenario, and it is usually the one stated most casually.
        </p>
      </Note>
    </Plate>
  );
}
