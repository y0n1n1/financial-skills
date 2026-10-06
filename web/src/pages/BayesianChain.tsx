/**
 * The Bayesian posterior chain, with its confidence interval carried throughout.
 *
 * This is the system's centrepiece, and the plate is built around the claim the
 * methodology actually makes: the interval is the output, the point estimate is
 * the least interesting part. The fan is the argument.
 */

import { useMemo, useState } from 'react';

import { bayes, constants } from '@tfg/core';
import { DataTable, Figure, Flag, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, Tooltip, plotArea, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { ControlRow, ResetButton, Segmented, Slider, Toggle } from '../controls/Controls';
import { fixed, interval, pct, range } from '../charts/format';
import { linear } from '../charts/scale';

const WIDTH = 720;
const HEIGHT = 340;
const MARGINS = { top: 18, right: 100, bottom: 44, left: 52 };

/** The ordinal directions, strongest-for first, for the evidence pickers. */
const DIRECTIONS = [
  { value: constants.Direction.StrongFor, label: '++' },
  { value: constants.Direction.ModerateFor, label: '+' },
  { value: constants.Direction.WeakFor, label: '·+' },
  { value: constants.Direction.Ambiguous, label: 'N' },
  { value: constants.Direction.WeakAgainst, label: '·−' },
  { value: constants.Direction.ModerateAgainst, label: '−' },
  { value: constants.Direction.StrongAgainst, label: '−−' },
] as const;

type Evidence = { direction: string; quality: number; label: string };

const DEFAULT_EVIDENCE: readonly Evidence[] = [
  { direction: constants.Direction.StrongFor, quality: 0.9, label: 'CUDA retention at 95%' },
  { direction: constants.Direction.StrongAgainst, quality: 0.85, label: 'OpenAI signs AMD' },
  { direction: constants.Direction.ModerateFor, quality: 0.7, label: 'Hyperscaler capex guide' },
  { direction: constants.Direction.ModerateAgainst, quality: 0.75, label: 'MI400 sampling early' },
  { direction: constants.Direction.ModerateAgainst, quality: 0.7, label: 'Inference share shift' },
];

export default function BayesianChain() {
  const [prior, setPrior] = useState(0.4);
  const [priorStd, setPriorStd] = useState(0.08);
  const [biasCorrection, setBiasCorrection] = useState(true);
  const [evidence, setEvidence] = useState<readonly Evidence[]>(DEFAULT_EVIDENCE);

  const result = useMemo(
    () => bayes.runChain(prior, priorStd, evidence, biasCorrection),
    [prior, priorStd, evidence, biasCorrection],
  );

  // Step 0 is the prior, so the chain is plotted with an origin.
  const points = useMemo(
    () => [
      { step: 0, mean: prior, std: priorStd, label: 'Prior', direction: '—', lr: 1 },
      ...result.chain.map((s) => ({
        step: s.step,
        mean: s.posterior_mean,
        std: s.posterior_std,
        label: s.label,
        direction: s.direction,
        lr: s.lr_final,
      })),
    ],
    [result, prior, priorStd],
  );

  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const x = linear([0, Math.max(1, points.length - 1)], [area.left, area.right]);
  const y = linear([0, 1], [area.bottom, area.top]);

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<number | null>(null);

  const posterior = result.posterior;
  const straddles = bayes.crosses(posterior, 0.5);

  // The fan: mean ± 2σ at each step, forward along the top and back along the bottom.
  const fanPath = useMemo(() => {
    const upper = points.map((p) => `${x(p.step)},${y(Math.min(1, p.mean + 2 * p.std))}`);
    const lower = [...points]
      .reverse()
      .map((p) => `${x(p.step)},${y(Math.max(0, p.mean - 2 * p.std))}`);
    return `M${upper.join('L')}L${lower.join('L')}Z`;
  }, [points, x, y]);

  const innerFanPath = useMemo(() => {
    const upper = points.map((p) => `${x(p.step)},${y(Math.min(1, p.mean + p.std))}`);
    const lower = [...points]
      .reverse()
      .map((p) => `${x(p.step)},${y(Math.max(0, p.mean - p.std))}`);
    return `M${upper.join('L')}L${lower.join('L')}Z`;
  }, [points, x, y]);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.step)},${y(p.mean)}`).join('');

  const setDirection = (index: number, direction: string) =>
    setEvidence((list) => list.map((e, i) => (i === index ? { ...e, direction } : e)));

  const setQuality = (index: number, quality: number) =>
    setEvidence((list) => list.map((e, i) => (i === index ? { ...e, quality } : e)));

  return (
    <Plate
      title="Bayesian posterior chain"
      question="How should a belief move as evidence arrives — and how wide is it still?"
      source="theory/bayesian-engine.md"
    >
      <ControlRow>
        <Slider
          label="Prior"
          value={prior}
          min={0.05}
          max={0.95}
          step={0.01}
          onChange={setPrior}
          format={(v) => pct(v)}
          hint="From base rates, before stock-specific data"
        />
        <Slider
          label="Prior σ"
          value={priorStd}
          min={0.01}
          max={0.25}
          step={0.01}
          onChange={setPriorStd}
          format={(v) => pct(v)}
          hint="How firm the base rate is"
        />
        <Toggle
          label="Bias corrections"
          checked={biasCorrection}
          onChange={setBiasCorrection}
          hint="Inside-view dampening + interval inflation"
        />
        <ResetButton
          onClick={() => {
            setPrior(0.4);
            setPriorStd(0.08);
            setBiasCorrection(true);
            setEvidence(DEFAULT_EVIDENCE);
          }}
        />
      </ControlRow>

      <Readouts
        items={[
          { label: 'Prior', value: pct(prior) },
          { label: 'Posterior', value: pct(posterior.mean) },
          { label: 'Interval', value: interval(posterior.mean, posterior.std_corrected) },
          { label: '95% CI', value: range(posterior.ci_95[0], posterior.ci_95[1]) },
          {
            label: 'Direction',
            value: straddles ? 'unresolved' : posterior.mean > 0.5 ? 'for' : 'against',
            tone: straddles ? 'warning' : 'neutral',
          },
        ]}
      />

      {straddles ? (
        <Flag tone="warning">
          The 95% interval {range(posterior.ci_95[0], posterior.ci_95[1])} crosses 50%. At this
          input quality the analysis has not resolved which way the question falls, and reporting
          the midpoint alone would be false precision. This announcement is mandatory, not optional.
        </Flag>
      ) : (
        <Flag tone="good">
          The 95% interval stays on one side of 50%, so the chain has resolved a direction —
          {posterior.mean > 0.5 ? ' for' : ' against'} the thesis — at this input quality.
        </Flag>
      )}

      <Figure
        caption="The line is the posterior mean; the bands are ±1σ and ±2σ carried through every update. Hover a step for its likelihood ratio."
        table={
          <DataTable
            columns={['Step', 'Evidence', 'Direction', 'Quality', 'LR raw', 'LR final', 'Posterior', '±σ']}
            rows={result.chain.map((s) => [
              s.step,
              s.label,
              s.direction,
              fixed(s.quality, 2),
              fixed(s.lr_raw, 3),
              fixed(s.lr_final, 3),
              pct(s.posterior_mean, 1),
              pct(s.posterior_std, 1),
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
          <Plot
            width={WIDTH}
            height={HEIGHT}
            margins={MARGINS}
            x={x}
            y={y}
            title="Posterior probability with confidence bands across each evidence update"
            xLabel="Evidence step"
            yLabel="P(thesis correct)"
            formatX={(v) => (Number.isInteger(v) ? `${v}` : '')}
            formatY={(v) => pct(v)}
            hideXGrid
            yTicks={5}
          >
            {/* The 50% decision boundary. */}
            <line
              x1={area.left}
              x2={area.right}
              y1={y(0.5)}
              y2={y(0.5)}
              stroke="var(--text-primary)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <text x={area.right + 6} y={y(0.5)} fontSize={10.5} dominantBaseline="central" fill="var(--text-secondary)">
              50%
            </text>

            {/* Clamp lines: no finite chain of ordinal evidence earns certainty. */}
            {[constants.POSTERIOR_FLOOR, constants.POSTERIOR_CEILING].map((bound) => (
              <line
                key={bound}
                x1={area.left}
                x2={area.right}
                y1={y(bound)}
                y2={y(bound)}
                stroke="var(--axis)"
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            ))}

            <path d={fanPath} fill="var(--series-1)" opacity={0.12} />
            <path d={innerFanPath} fill="var(--series-1)" opacity={0.18} />
            <path d={linePath} fill="none" stroke="var(--series-1)" strokeWidth={2} />

            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={x(p.step)}
                  cy={y(p.mean)}
                  r={hover === i ? 6 : 4.5}
                  fill="var(--series-1)"
                  stroke="var(--surface-1)"
                  strokeWidth={2}
                  onPointerEnter={() => setHover(i)}
                />
                {/* A generous invisible hit target, bigger than the mark. */}
                <circle
                  cx={x(p.step)}
                  cy={y(p.mean)}
                  r={16}
                  fill="transparent"
                  onPointerEnter={() => setHover(i)}
                />
              </g>
            ))}

            {/* Direct label on the endpoint, so the headline needs no legend lookup. */}
            <text
              x={area.right + 6}
              y={y(posterior.mean)}
              fontSize={11.5}
              fontWeight={600}
              dominantBaseline="central"
              fill="var(--text-primary)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {pct(posterior.mean)}
            </text>
          </Plot>

          {anchor && hover !== null && points[hover] && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH)}
              heading={points[hover]!.label}
              rows={[
                { label: 'Posterior', value: pct(points[hover]!.mean, 1), color: 'var(--series-1)' },
                { label: '±σ', value: pct(points[hover]!.std, 1) },
                { label: 'Direction', value: points[hover]!.direction },
                { label: 'LR applied', value: fixed(points[hover]!.lr, 3) },
              ]}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'Posterior mean', color: 'var(--series-1)' },
            { label: '±1σ / ±2σ band', color: 'var(--series-1)' },
            { label: '50% boundary', color: 'var(--text-primary)', dashed: true },
          ]}
        />
      </Figure>

      <h2 style={{ margin: '0 0 10px' }}>The evidence</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 14 }}>
        Direction is ordinal, never a free-form number. Quality scales the distance of each
        likelihood ratio from 1.0, so a strong claim from a weak source moves the posterior less.
      </p>

      <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
        {evidence.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: '6px 18px',
              alignItems: 'end',
              padding: '12px 14px',
              background: 'var(--surface-1)',
              border: 'var(--rule)',
              borderRadius: 'var(--radius)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, marginBottom: 7, color: 'var(--text-primary)' }}>
                {item.label}
              </div>
              <Slider
                label="Evidence quality"
                value={item.quality}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => setQuality(i, v)}
                format={(v) => v.toFixed(2)}
              />
            </div>
            <Segmented
              label="Direction"
              value={item.direction}
              options={DIRECTIONS.map((d) => ({ value: d.value as string, label: d.label }))}
              onChange={(v) => setDirection(i, v)}
            />
          </div>
        ))}
      </div>

      <Note title="What to look for">
        <p>
          Pull any <strong>evidence quality</strong> slider to zero. That step goes flat — the
          posterior does not move at all. Quality acts on impact, not direction, so a zero-quality
          source is exactly inert rather than merely discounted. Most frameworks let a confident
          assertion from a bad source move the number anyway.
        </p>
        <p>
          Turn <strong>bias corrections</strong> off and watch the band narrow while the line bends
          further from the prior. That is the comfortable version. It is off by default in the real
          system precisely because the documented failure mode of this chain is overconfidence.
        </p>
        <p>
          Set every step to <code>++</code> at full quality. The posterior climbs and then stops at
          95% — the clamp. No finite chain of ordinal evidence earns certainty, however much of it
          you stack up.
        </p>
        <p>
          The band is not decoration. Because the posterior appears in both the numerator and the
          denominator of each update, those occurrences are correlated, and the width you see is
          the result of tracking that properly. Treating them as independent would widen it
          wrongly — which is what naive error propagation does.
        </p>
      </Note>
    </Plate>
  );
}
