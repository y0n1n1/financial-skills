/**
 * Parameter monitoring against pre-specified rules.
 *
 * The chart shows each metric's distance to its own threshold, normalised, so
 * six parameters in six different units become one comparable picture.
 */

import { useState } from 'react';

import { DataTable, Figure, Flag, Note, Plate, Readouts } from '../charts/Plate';
import { Legend, Tooltip, tooltipStyle, useTooltipAnchor } from '../charts/Plot';
import { MONITORED_PARAMETERS } from '../lib/samples';
import { band, linear } from '../charts/scale';

const WIDTH = 700;
const LABEL = 196;

/** Severity drives the status ramp; it is never a categorical series colour. */
const SEVERITY_COLOR: Readonly<Record<string, string>> = {
  MINOR: 'var(--status-warning)',
  MAJOR: 'var(--status-serious)',
  EXIT: 'var(--status-critical)',
};

export default function ParameterMonitor() {
  const { wrapperRef, anchor, onPointerMove, onPointerLeave } = useTooltipAnchor();
  const [hover, setHover] = useState<string | null>(null);

  /**
   * Headroom: how far the current reading sits from its threshold, as a share of
   * the threshold. Negative means the rule has already fired.
   */
  const rows = MONITORED_PARAMETERS.map((p) => {
    const distance =
      p.direction === 'below' ? p.current - p.threshold : p.threshold - p.current;
    const scale = Math.abs(p.threshold) || 1;
    return { ...p, headroom: distance / scale };
  });

  const triggered = rows.filter((r) => r.status === 'triggered');
  const watching = rows.filter((r) => r.status === 'watch');

  const extent = Math.max(...rows.map((r) => Math.abs(r.headroom))) * 1.15;
  const x = linear([-extent, extent], [LABEL, WIDTH - 60]);
  const bands = band(rows.length, [10, rows.length * 34 + 10], 0.3);
  const height = rows.length * 34 + 44;

  return (
    <Plate
      title="Parameter monitoring"
      question="Which tripwires are close to firing — against rules written before the data arrived?"
      source="tools/parameter_monitor.py"
    >
      <Readouts
        items={[
          { label: 'Monitored', value: `${rows.length}` },
          { label: 'Triggered', value: `${triggered.length}`, tone: triggered.length ? 'critical' : 'good' },
          { label: 'Watching', value: `${watching.length}`, tone: watching.length ? 'warning' : 'good' },
          { label: 'Clear', value: `${rows.length - triggered.length - watching.length}` },
        ]}
      />

      {triggered.length > 0 && (
        <Flag tone="warning">
          {triggered.length} parameter has crossed its threshold ({triggered.map((t) => t.name).join(', ')}).
          The update rule was written before the reading, so what happens next is already decided —
          which is the entire point of pre-specifying it.
        </Flag>
      )}

      <Figure
        caption="Headroom to each threshold, normalised so parameters in different units compare. Left of zero means the rule has fired."
        table={
          <DataTable
            columns={['Parameter', 'Current', 'Threshold', 'Severity', 'Status', 'Pre-specified rule']}
            align={['left', 'right', 'right', 'left', 'left', 'left']}
            rows={rows.map((r) => [r.name, r.current, r.threshold, r.severity, r.status, r.rule])}
          />
        }
      >
        <div ref={wrapperRef} style={{ position: 'relative' }} onPointerMove={onPointerMove} onPointerLeave={() => { onPointerLeave(); setHover(null); }}>
          <svg viewBox={`0 0 ${WIDTH} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
            <title>Headroom to threshold for each monitored parameter</title>
            <rect x={LABEL} y={6} width={x(0) - LABEL} height={height - 40} fill="var(--status-critical)" opacity={0.06} />

            {rows.map((row, i) => {
              const zero = x(0);
              const end = x(row.headroom);
              const active = hover === null || hover === row.name;
              return (
                <g key={row.name} onPointerEnter={() => setHover(row.name)}>
                  <text x={LABEL - 12} y={bands.position(i) + bands.width / 2} textAnchor="end" dominantBaseline="central" fontSize={11.5} fill="var(--text-secondary)">
                    {row.name}
                  </text>
                  <rect
                    x={Math.min(zero, end)}
                    y={bands.position(i)}
                    width={Math.max(2, Math.abs(end - zero))}
                    height={bands.width}
                    rx={3}
                    fill={row.headroom < 0 ? SEVERITY_COLOR[row.severity] ?? 'var(--status-critical)' : 'var(--status-good)'}
                    opacity={active ? 0.8 : 0.3}
                  />
                  <text
                    x={end + (row.headroom >= 0 ? 8 : -8)}
                    y={bands.position(i) + bands.width / 2}
                    textAnchor={row.headroom >= 0 ? 'start' : 'end'}
                    dominantBaseline="central"
                    fontSize={10.5}
                    fill="var(--text-muted)"
                  >
                    {row.severity}
                  </text>
                </g>
              );
            })}

            <line x1={x(0)} x2={x(0)} y1={6} y2={height - 34} stroke="var(--text-primary)" strokeWidth={1.5} />
            <text x={x(0)} y={height - 16} textAnchor="middle" fontSize={11} fill="var(--text-secondary)">
              threshold
            </text>
          </svg>

          {anchor && hover && (
            <Tooltip
              style={tooltipStyle(anchor, WIDTH, 230)}
              heading={hover}
              rows={(() => {
                const r = rows.find((p) => p.name === hover)!;
                return [
                  { label: 'Current', value: `${r.current}` },
                  { label: 'Threshold', value: `${r.threshold}` },
                  { label: 'Severity', value: r.severity },
                  { label: 'Status', value: r.status },
                ];
              })()}
            />
          )}
        </div>
        <Legend
          items={[
            { label: 'Clear of threshold', color: 'var(--status-good)' },
            { label: 'Minor', color: 'var(--status-warning)' },
            { label: 'Major', color: 'var(--status-serious)' },
            { label: 'Exit', color: 'var(--status-critical)' },
          ]}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          The rules are written in full, in advance, including what to do. That is the whole
          mechanism: once a reading arrives, there is no room to decide that <em>this</em> breach
          is different, because the response was committed to while the outcome was still unknown.
        </p>
        <p>
          Severity and proximity are independent. The RSI trigger has already fired and is only
          MINOR — re-run one lens and probably hold. The capex guide is still clear of its line and
          is an EXIT, so it deserves more attention despite not having fired.
        </p>
      </Note>
    </Plate>
  );
}
