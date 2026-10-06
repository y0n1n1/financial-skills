/**
 * Lens reliability: the base-rate problem, applied to research.
 *
 * The curve is the famous medical-testing result. A lens that is right 80% of the
 * time tells you much less than 80% when the thing it tests for is usually false,
 * and research theses are usually false.
 */

import { useMemo, useState } from 'react';

import { reliability } from '@tfg/core';
import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Plot, Tooltip, plotArea, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { ControlRow, ResetButton, Segmented, Slider } from '../controls/Controls';
import { pct } from '../charts/format';
import { band, linear } from '../charts/scale';

const WIDTH = 720;
const HEIGHT = 330;
const MARGINS = { top: 18, right: 86, bottom: 46, left: 56 };

/** Four lenses, chosen to span the reliability range, in fixed slot order. */
const PLOTTED = [
  { key: 'contrarian_check', color: 'var(--series-1)' },
  { key: 'fundamental', color: 'var(--series-2)' },
  { key: 'macro_sector', color: 'var(--series-3)' },
  { key: 'sentiment', color: 'var(--series-4)' },
] as const;

const VERDICTS = [
  { value: 'SUPPORTS', label: 'Supports' },
  { value: 'NEUTRAL', label: 'Neutral' },
  { value: 'UNDERMINES', label: 'Undermines' },
] as const;

const DEFAULT_VERDICTS: Record<string, string> = {
  fundamental: 'SUPPORTS',
  technical: 'SUPPORTS',
  competitive_moat: 'SUPPORTS',
  macro_sector: 'SUPPORTS',
  sentiment: 'SUPPORTS',
  contrarian_check: 'UNDERMINES',
};

export default function LensReliability() {
  const [baseRate, setBaseRate] = useState(0.35);
  const [verdicts, setVerdicts] = useState<Record<string, string>>(DEFAULT_VERDICTS);

  const area = plotArea(WIDTH, HEIGHT, MARGINS);
  const x = linear([0, 1], [area.left, area.right]);
  const y = linear([0, 1], [area.bottom, area.top]);

  const curves = useMemo(
    () =>
      PLOTTED.map(({ key, color }) => {
        const lens = reliability.LENSES[key]!;
        const points: Array<{ br: number; ppv: number }> = [];
        for (let br = 0.01; br <= 0.99; br += 0.01) {
          points.push({
            br,
            ppv: reliability.positivePredictiveValue(
              lens.sensitivity ?? 0.5,
              lens.specificity,
              br,
            ),
          });
        }
        return { key, color, name: lens.name, points };
      }),
    [],
  );

  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hoverBr, setHoverBr] = useState<number | null>(null);

  const tally = useMemo(() => reliability.weightedTally(verdicts), [verdicts]);
  const atBaseRate = useMemo(
    () => PLOTTED.map(({ key }) => ({ key, values: reliability.evaluateLens(key, baseRate) })),
    [baseRate],
  );

  return (
    <Plate
      title="Lens reliability"
      question="When a lens says SUPPORTS, what is the probability the thesis is actually right?"
      source="theory/lens-reliability.md"
    >
      <ControlRow>
        <Slider
          label="Base rate — how often theses are correct"
          value={baseRate}
          min={0.02}
          max={0.95}
          step={0.01}
          onChange={setBaseRate}
          format={(v) => pct(v)}
          hint="Most research theses fail, so this is low"
        />
        <ResetButton
          onClick={() => {
            setBaseRate(0.35);
            setVerdicts(DEFAULT_VERDICTS);
          }}
        />
      </ControlRow>

      <Readouts
        items={atBaseRate.map(({ key, values }) => ({
          label: reliability.LENSES[key]!.name,
          value: pct(values.ppv),
          hint: `claims ${pct(values.sensitivity)}`,
          tone: values.ppv < 0.5 ? 'warning' : 'neutral',
        }))}
      />

      <Figure
        caption="Positive predictive value against base rate. The diagonal is “the verdict told you nothing”; distance above it is the information the lens actually adds."
        table={
          <DataTable
            columns={['Lens', 'Sensitivity', 'Specificity', 'Weight', `PPV at ${pct(baseRate)}`, 'Lift']}
            rows={Object.entries(reliability.LENSES).map(([key, lens]) => {
              const values = reliability.evaluateLens(key, baseRate);
              return [
                lens.name,
                lens.sensitivity === null ? 'n/a' : pct(lens.sensitivity),
                pct(lens.specificity),
                lens.weight.toFixed(1),
                pct(values.ppv),
                `${reliability.ppvLift(values) >= 0 ? '+' : ''}${pct(reliability.ppvLift(values))}`,
              ];
            })}
          />
        }
      >
        <div
          ref={wrapperRef}
          style={{ position: 'relative' }}
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            onPointerLeave();
            setHoverBr(null);
          }}
        >
          <Plot
            width={WIDTH}
            height={HEIGHT}
            margins={MARGINS}
            x={x}
            y={y}
            title="Positive predictive value of each analytical lens as the base rate varies"
            xLabel="Base rate — share of theses that are correct"
            yLabel="P(correct | lens says SUPPORTS)"
            formatX={(v) => pct(v)}
            formatY={(v) => pct(v)}
            onHover={(point) => setHoverBr(point ? Math.min(1, Math.max(0, point.x)) : null)}
          >
            {/* The no-information diagonal. */}
            <line
              x1={x(0)}
              x2={x(1)}
              y1={y(0)}
              y2={y(1)}
              stroke="var(--text-muted)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />

            {curves.map((curve) => (
              <path
                key={curve.key}
                d={curve.points
                  .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.br)},${y(p.ppv)}`)
                  .join('')}
                fill="none"
                stroke={curve.color}
                strokeWidth={2}
              />
            ))}

            <line
              x1={x(baseRate)}
              x2={x(baseRate)}
              y1={area.top}
              y2={area.bottom}
              stroke="var(--text-primary)"
              strokeWidth={1.5}
            />

            {/*
             * Direct labels sit at the base-rate marker rather than at the right
             * edge. Every curve converges on 100% as the base rate approaches 1,
             * so edge labels pile on top of each other; at the marker the series
             * are separated by exactly the quantity the chart is about.
             */}
            {(() => {
              const placed: number[] = [];
              return atBaseRate.map(({ key, values }) => {
                const color = PLOTTED.find((p) => p.key === key)!.color;
                const cy = y(values.ppv);
                // Nudge a label clear of any already placed within 12px.
                let labelY = cy;
                while (placed.some((taken) => Math.abs(taken - labelY) < 12)) labelY -= 12;
                placed.push(labelY);
                const flip = x(baseRate) > area.right - 118;
                return (
                  <g key={`dot-${key}`}>
                    <circle
                      cx={x(baseRate)}
                      cy={cy}
                      r={5}
                      fill={color}
                      stroke="var(--surface-1)"
                      strokeWidth={2}
                    />
                    <text
                      x={x(baseRate) + (flip ? -10 : 10)}
                      y={labelY}
                      fontSize={10.5}
                      dominantBaseline="central"
                      textAnchor={flip ? 'end' : 'start'}
                      fill={color}
                    >
                      {reliability.LENSES[key]!.name.split('/')[0]} {pct(values.ppv)}
                    </text>
                  </g>
                );
              });
            })()}

            {hoverBr !== null && (
              <line
                x1={x(hoverBr)}
                x2={x(hoverBr)}
                y1={area.top}
                y2={area.bottom}
                stroke="var(--text-muted)"
                strokeWidth={1}
              />
            )}
          </Plot>

          {anchor && hoverBr !== null && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 196)}
              heading={`Base rate ${pct(hoverBr)}`}
              rows={PLOTTED.map(({ key, color }) => ({
                label: reliability.LENSES[key]!.name,
                value: pct(reliability.evaluateLens(key, hoverBr).ppv),
                color,
              }))}
            />
          )}
        </div>
        <Legend items={curves.map((c) => ({ label: c.name, color: c.color }))} />
      </Figure>

      <Note title="What to look for">
        <p>
          Set the base rate to 35% — roughly how often a research thesis survives. The fundamental
          lens, which is right 75% of the time when a thesis is good, yields a PPV of{' '}
          {pct(reliability.evaluateLens('fundamental', 0.35).ppv)}. Its SUPPORTS verdict is barely
          better than a coin flip, and nothing about the lens changed. The <em>prior</em> did.
        </p>
        <p>
          Now push the base rate toward 90%. Every curve rises and they converge: when almost
          everything is true, confirming it is easy and uninformative. The lenses are most valuable
          in the middle, where the answer is genuinely in doubt.
        </p>
        <p>
          Sentiment barely clears the diagonal anywhere. That is why it carries a weight of 0.4
          against the contrarian check's 1.2 — the system's own estimate that analyst ratings and
          headlines are nearly pure noise for validating a thesis.
        </p>
      </Note>

      <h2 style={{ margin: '0 0 10px' }}>Weighted verdicts</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 14 }}>
        Counting verdicts equally flatters a thesis. Weighting them by reliability is what the
        gauntlet actually does — change the verdicts below and watch the two numbers separate.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(242px, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}
      >
        {Object.keys(DEFAULT_VERDICTS).map((key) => (
          <div
            key={key}
            style={{
              padding: '11px 13px',
              background: 'var(--surface-1)',
              border: 'var(--rule)',
              borderRadius: 'var(--radius)',
            }}
          >
            <div style={{ fontSize: 13, marginBottom: 7 }}>
              {reliability.LENSES[key]!.name}
              <span style={{ color: 'var(--text-muted)', fontSize: 11.5, marginLeft: 6 }}>
                weight {reliability.LENSES[key]!.weight.toFixed(1)}
              </span>
            </div>
            <Segmented
              label=""
              value={verdicts[key] ?? 'NEUTRAL'}
              options={VERDICTS.map((v) => ({ value: v.value as string, label: v.label }))}
              onChange={(v) => setVerdicts((prev) => ({ ...prev, [key]: v }))}
            />
          </div>
        ))}
      </div>

      <Figure caption="Raw verdict count against the reliability-weighted score for the same six verdicts.">
        <svg viewBox={`0 0 ${WIDTH} 128`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
          <title>Raw support percentage compared with reliability-weighted support</title>
          {[
            { label: 'Raw count', value: tally.raw_support, color: 'var(--series-4)' },
            { label: 'Reliability-weighted', value: tally.weighted_support, color: 'var(--series-1)' },
          ].map((row, i) => {
            const bands = band(2, [10, 110], 0.35);
            const left = 150;
            const right = WIDTH - 70;
            const scale = linear([-1, 1], [left, right]);
            const zero = scale(0);
            const end = scale(row.value);
            return (
              <g key={row.label}>
                <text x={140} y={bands.position(i) + bands.width / 2} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--text-secondary)">
                  {row.label}
                </text>
                <rect
                  x={Math.min(zero, end)}
                  y={bands.position(i)}
                  width={Math.max(2, Math.abs(end - zero))}
                  height={bands.width}
                  rx={4}
                  fill={row.color}
                />
                <text
                  x={end + (row.value >= 0 ? 8 : -8)}
                  y={bands.position(i) + bands.width / 2}
                  textAnchor={row.value >= 0 ? 'start' : 'end'}
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--text-primary)"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {pct(row.value)}
                </text>
              </g>
            );
          })}
          <line x1={linear([-1, 1], [150, WIDTH - 70])(0)} x2={linear([-1, 1], [150, WIDTH - 70])(0)} y1={6} y2={118} stroke="var(--axis)" strokeWidth={1} />
        </svg>
      </Figure>

      <Note>
        <p>
          With the default verdicts — five lenses supporting, only the contrarian check undermining
          — raw counting reports {pct(tally.raw_support)} support. Weighted, it is{' '}
          {pct(tally.weighted_support)}. The single most reliable lens disagreeing outweighs the
          sentiment and technical lenses agreeing, combined. That gap is the system working.
        </p>
      </Note>
    </Plate>
  );
}
