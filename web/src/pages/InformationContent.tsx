/**
 * Shannon information content: evidence measured in bits.
 *
 * The plate's job is to make an uncomfortable point concrete — most of what an
 * analysis gathers carries almost no information, and stacking more of it does
 * not fix that.
 */

import { useMemo, useState } from 'react';

import { information } from '@tfg/core';
import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, Tooltip, plotArea, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { ControlRow, ResetButton, Slider } from '../controls/Controls';
import { bits, fixed } from '../charts/format';
import { band, linear } from '../charts/scale';

const WIDTH = 720;
const HEIGHT = 300;
const MARGINS = { top: 18, right: 24, bottom: 46, left: 56 };

/** An illustrative ACH matrix, the kind the gauntlet builds for a real name. */
const EVIDENCE = [
  { label: 'AI spending is growing', consistent: 4 },
  { label: 'P/E at 35 vs 60 average', consistent: 4 },
  { label: 'Revenue grew last quarter', consistent: 3 },
  { label: 'Revenue +80% year over year', consistent: 2 },
  { label: 'Gross margin held at 75%', consistent: 2 },
  { label: 'CUDA ecosystem retention 95%', consistent: 1 },
  { label: 'No competitor within 3 years on perf', consistent: 1 },
] as const;

export default function InformationContent() {
  const [hypotheses, setHypotheses] = useState(4);
  const [priorSkew, setPriorSkew] = useState(0.7);

  const scored = useMemo(
    () =>
      EVIDENCE.map((e) =>
        information.score(e.label, hypotheses, Math.min(e.consistent, hypotheses)),
      ),
    [hypotheses],
  );

  /** IC as a continuous function of how many hypotheses the evidence fits. */
  const curve = useMemo(() => {
    const points: Array<{ consistent: number; bits: number }> = [];
    for (let c = 1; c <= hypotheses; c += 0.02) {
      points.push({ consistent: c, bits: Math.log2(hypotheses / c) });
    }
    return points;
  }, [hypotheses]);

  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const maxBits = Math.log2(hypotheses) || 1;
  const x = linear([1, hypotheses], [area.left, area.right]);
  const y = linear([0, maxBits * 1.08], [area.bottom, area.top]);

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<number | null>(null);

  const admissible = scored.filter((s) => s.admissible);
  const material = scored.filter((s) => s.material);

  // Entropy before and after: how much the analysis actually learned.
  const uniform = Array.from({ length: hypotheses }, () => 1 / hypotheses);
  const skewed = useMemo(() => {
    const rest = (1 - priorSkew) / Math.max(1, hypotheses - 1);
    return Array.from({ length: hypotheses }, (_, i) => (i === 0 ? priorSkew : rest));
  }, [priorSkew, hypotheses]);
  const reduction = information.entropyReduction(uniform, skewed);

  const rows = band(scored.length, [8, scored.length * 30 + 8], 0.28);
  const barWidth = WIDTH - 300;

  return (
    <Plate
      title="Shannon information content"
      question="How much does a piece of evidence actually narrow the field — and may it enter the chain at all?"
      source="theory/information-content.md"
    >
      <ControlRow>
        <Slider
          label="Competing hypotheses"
          value={hypotheses}
          min={2}
          max={8}
          step={1}
          onChange={setHypotheses}
          format={(v) => `${v}`}
          hint="The ACH matrix typically runs 4"
        />
        <Slider
          label="Posterior concentration"
          value={priorSkew}
          min={1 / 8}
          max={0.98}
          step={0.01}
          onChange={setPriorSkew}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          hint="Weight on the leading hypothesis"
        />
        <ResetButton
          onClick={() => {
            setHypotheses(4);
            setPriorSkew(0.7);
          }}
        />
      </ControlRow>

      <Readouts
        items={[
          { label: 'Max possible IC', value: bits(maxBits) },
          { label: 'Admissible', value: `${admissible.length} of ${scored.length}`, hint: '> 0.5 bits' },
          { label: 'Material', value: `${material.length} of ${scored.length}`, hint: '> 1.0 bits' },
          { label: 'Entropy reduced', value: bits(reduction), tone: reduction > 0 ? 'good' : 'warning' },
        ]}
      />

      <Figure
        caption="Information content against the number of hypotheses a piece of evidence is consistent with. The threshold line is the chain's admission gate."
      >
        <div
          ref={wrapperRef}
          style={{ position: 'relative' }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <Plot
            width={WIDTH}
            height={HEIGHT}
            margins={MARGINS}
            x={x}
            y={y}
            title="Shannon information content as a function of hypothesis consistency"
            xLabel="Hypotheses the evidence is consistent with"
            yLabel="Information content (bits)"
            formatX={(v) => (Number.isInteger(v) ? `${v}` : '')}
            formatY={(v) => v.toFixed(1)}
            hideXGrid
          >
            {/* Below this line, evidence may not enter the Bayesian chain. */}
            <rect
              x={area.left}
              y={y(information.CHAIN_ADMISSION_THRESHOLD)}
              width={area.right - area.left}
              height={Math.max(0, area.bottom - y(information.CHAIN_ADMISSION_THRESHOLD))}
              fill="var(--series-2)"
              opacity={0.07}
            />
            <line
              x1={area.left}
              x2={area.right}
              y1={y(information.CHAIN_ADMISSION_THRESHOLD)}
              y2={y(information.CHAIN_ADMISSION_THRESHOLD)}
              stroke="var(--series-2)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <text x={area.left + 6} y={y(information.CHAIN_ADMISSION_THRESHOLD) + 14} fontSize={10.5} fill="var(--series-2)">
              0.5 bits — below this, excluded from the chain
            </text>

            <line
              x1={area.left}
              x2={area.right}
              y1={y(information.MATERIAL_THRESHOLD)}
              y2={y(information.MATERIAL_THRESHOLD)}
              stroke="var(--series-3)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <text x={area.left + 6} y={y(information.MATERIAL_THRESHOLD) - 6} fontSize={10.5} fill="var(--series-3)">
              1.0 bits — material
            </text>

            <path
              d={curve.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.consistent)},${y(p.bits)}`).join('')}
              fill="none"
              stroke="var(--series-1)"
              strokeWidth={2}
            />

            {scored.map((s, i) => (
              <circle
                key={i}
                cx={x(s.n_consistent)}
                cy={y(s.bits)}
                r={5}
                fill="var(--series-1)"
                stroke="var(--surface-1)"
                strokeWidth={2}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
            ))}
          </Plot>

          {anchor && hover !== null && scored[hover] && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 200)}
              heading={scored[hover]!.label}
              rows={[
                { label: 'Bits', value: fixed(scored[hover]!.bits, 2), color: 'var(--series-1)' },
                { label: 'Band', value: scored[hover]!.band },
                { label: 'Admissible', value: scored[hover]!.admissible ? 'yes' : 'no' },
              ]}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'Information content', color: 'var(--series-1)' },
            { label: 'Admission gate', color: 'var(--series-2)', dashed: true },
            { label: 'Material threshold', color: 'var(--series-3)', dashed: true },
          ]}
        />
      </Figure>

      <Figure
        caption={`A sample ACH matrix scored against ${hypotheses} competing hypotheses, sorted by information content.`}
        table={
          <DataTable
            columns={['Evidence', 'Consistent with', 'Bits', 'Band', 'Enters chain']}
            align={['left', 'right', 'right', 'left', 'left']}
            rows={[...scored]
              .sort((a, b) => b.bits - a.bits)
              .map((s) => [
                s.label,
                `${s.n_consistent} of ${s.n_hypotheses}`,
                fixed(s.bits, 2),
                s.band,
                s.admissible ? 'yes' : 'no',
              ])}
          />
        }
      >
        <svg viewBox={`0 0 ${WIDTH} ${scored.length * 30 + 20}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
          <title>Evidence rows sorted by information content, with the admission gate marked</title>
          {[...scored]
            .sort((a, b) => b.bits - a.bits)
            .map((s, i) => {
              const scale = linear([0, maxBits], [268, 268 + barWidth]);
              const width = Math.max(1, scale(s.bits) - 268);
              return (
                <g key={s.label}>
                  <text x={258} y={rows.position(i) + rows.width / 2} textAnchor="end" dominantBaseline="central" fontSize={11.5} fill="var(--text-secondary)">
                    {s.label.length > 32 ? `${s.label.slice(0, 31)}…` : s.label}
                  </text>
                  <rect
                    x={268}
                    y={rows.position(i)}
                    width={width}
                    height={rows.width}
                    rx={3}
                    fill={s.material ? 'var(--series-1)' : s.admissible ? 'var(--series-3)' : 'var(--series-2)'}
                    opacity={s.admissible ? 0.9 : 0.5}
                  />
                  <text
                    x={268 + width + 8}
                    y={rows.position(i) + rows.width / 2}
                    dominantBaseline="central"
                    fontSize={11}
                    fill="var(--text-primary)"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {fixed(s.bits, 2)}
                  </text>
                </g>
              );
            })}
          <line
            x1={linear([0, maxBits], [268, 268 + barWidth])(information.CHAIN_ADMISSION_THRESHOLD)}
            x2={linear([0, maxBits], [268, 268 + barWidth])(information.CHAIN_ADMISSION_THRESHOLD)}
            y1={4}
            y2={scored.length * 30 + 10}
            stroke="var(--series-2)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
        </svg>
        <Legend
          items={[
            { label: 'Material (> 1 bit)', color: 'var(--series-1)' },
            { label: 'Admissible (> 0.5)', color: 'var(--series-3)' },
            { label: 'Excluded', color: 'var(--series-2)' },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          Evidence consistent with every hypothesis scores exactly <strong>zero bits</strong>, no
          matter how true or how dramatic it sounds. “AI spending is growing” is certainly true and
          eliminates nothing, so it may not enter the chain at all. That rule removes most of what
          a normal research note contains.
        </p>
        <p>
          Raise the <strong>hypothesis count</strong>. Every piece of evidence gains bits, because
          eliminating one of eight possibilities is worth more than eliminating one of two. Taking
          competing explanations seriously is what makes evidence informative — a two-hypothesis
          analysis caps out at one bit no matter what it finds.
        </p>
        <p>
          Ten pieces of 0.2-bit evidence total two bits on paper and are worth far less than one
          2-bit finding, because every piece carries noise as well as signal. The system's rule
          follows: spend the effort finding high-IC evidence, not accumulating more low-IC evidence.
        </p>
        <p>
          A caution the methodology is explicit about: information content and likelihood ratios
          are different quantities in different units. IC decides what is <em>allowed in</em>; the
          likelihood ratio decides what it <em>does</em> once there. Combining them would be a
          category error.
        </p>
      </Note>
    </Plate>
  );
}
