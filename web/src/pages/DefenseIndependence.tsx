/**
 * The defense-independence audit — the "Swiss cheese" check.
 *
 * Drawn as layers you look through. When every trigger shares a cluster the holes
 * line up, and seven defences turn out to be one.
 */

import { useMemo, useState } from 'react';

import { fmea } from '@tfg/core';
import { DataTable, Figure, Flag, Note, Plate, Readouts } from '../charts/Plate';
import { Legend } from '../charts/Plot';
import { ControlRow, ResetButton, Segmented } from '../controls/Controls';
import { pct } from '../charts/format';

const WIDTH = 680;

/** Clusters a trigger can be assigned to, in fixed series-slot order. */
const CLUSTERS = [
  { key: 'EARNINGS', label: 'Earnings', color: 'var(--series-1)' },
  { key: 'PRICE', label: 'Price', color: 'var(--series-2)' },
  { key: 'COMPETITIVE', label: 'Competitive', color: 'var(--series-3)' },
  { key: 'MACRO', label: 'Macro', color: 'var(--series-4)' },
] as const;

const INITIAL: ReadonlyArray<fmea.Trigger> = [
  { name: 'Revenue deceleration', severity: 7, occurrence: 5, detection: 4, cluster: 'EARNINGS' },
  { name: 'Margin compression', severity: 6, occurrence: 4, detection: 4, cluster: 'EARNINGS' },
  { name: 'Earnings miss', severity: 5, occurrence: 5, detection: 5, cluster: 'EARNINGS' },
  { name: 'Guidance cut', severity: 7, occurrence: 4, detection: 3, cluster: 'EARNINGS' },
  { name: 'Price breaks 200DMA', severity: 4, occurrence: 6, detection: 1, cluster: 'PRICE' },
  { name: 'Competitor parity', severity: 9, occurrence: 3, detection: 8, cluster: 'COMPETITIVE' },
  { name: 'Rate shock', severity: 6, occurrence: 3, detection: 2, cluster: 'MACRO' },
];

export default function DefenseIndependence() {
  const [triggers, setTriggers] = useState<ReadonlyArray<fmea.Trigger>>(INITIAL);

  const audit = useMemo(() => fmea.auditIndependence(triggers), [triggers]);

  const gradeColor =
    audit.grade === fmea.Grade.A
      ? 'var(--status-good)'
      : audit.grade === fmea.Grade.B
        ? 'var(--status-warning)'
        : audit.grade === fmea.Grade.C
          ? 'var(--status-serious)'
          : 'var(--status-critical)';

  const clusterColor = (key: string) =>
    CLUSTERS.find((c) => c.key === key)?.color ?? 'var(--text-muted)';

  // One row per cluster, each showing the triggers that share it.
  const grouped = useMemo(
    () =>
      CLUSTERS.map((cluster) => ({
        ...cluster,
        members: triggers.filter((t) => t.cluster === cluster.key),
      })).filter((c) => c.members.length > 0),
    [triggers],
  );

  const layerHeight = 46;
  const svgHeight = grouped.length * layerHeight + 42;

  return (
    <Plate
      title="Defense independence"
      question="Are these genuinely separate defence layers, or the same tripwire wearing seven names?"
      source="parameters/defense-independence.md"
    >
      <ControlRow>
        <ResetButton onClick={() => setTriggers(INITIAL)} />
      </ControlRow>

      <Readouts
        items={[
          { label: 'Triggers', value: `${audit.n_triggers}` },
          { label: 'Independent layers', value: `${audit.n_clusters}` },
          { label: 'Independence', value: pct(audit.independence) },
          {
            label: 'Grade',
            value: audit.grade,
            tone: audit.grade === 'A' ? 'good' : audit.grade === 'D' ? 'critical' : 'warning',
          },
        ]}
      />

      {audit.grade === fmea.Grade.C || audit.grade === fmea.Grade.D ? (
        <Flag tone="critical">
          {pct(audit.independence)} independence is a grade {audit.grade}. Most of these triggers
          fire on the same underlying event, so the position is effectively defended by one layer
          rather than {audit.n_triggers}.
        </Flag>
      ) : (
        <Flag tone="good">
          {pct(audit.independence)} independence, grade {audit.grade} — the triggers watch
          genuinely different kinds of event.
        </Flag>
      )}

      <Figure
        caption="Each row is one cluster. Triggers sharing a row fire on the same underlying event, so the row is a single defence layer however many markers sit on it."
        table={
          <DataTable
            columns={['Cluster', 'Triggers', 'Counts as']}
            align={['left', 'left', 'right']}
            rows={grouped.map((g) => [g.label, g.members.map((m) => m.name).join(', '), '1 layer'])}
          />
        }
      >
        <svg viewBox={`0 0 ${WIDTH} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
          <title>Defence layers, with triggers grouped by the event that fires them</title>
          {grouped.map((cluster, i) => {
            const top = i * layerHeight + 8;
            return (
              <g key={cluster.key}>
                <text x={92} y={top + 20} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--text-secondary)">
                  {cluster.label}
                </text>
                {/* The layer itself. */}
                <rect
                  x={104}
                  y={top}
                  width={WIDTH - 180}
                  height={40}
                  rx={4}
                  fill={cluster.color}
                  opacity={0.12}
                  stroke={cluster.color}
                  strokeWidth={1.5}
                />
                {cluster.members.map((member, j) => {
                  const slot = (WIDTH - 196) / cluster.members.length;
                  return (
                    <g key={member.name}>
                      <rect
                        x={112 + j * slot}
                        y={top + 7}
                        width={Math.max(10, slot - 8)}
                        height={26}
                        rx={3}
                        fill={cluster.color}
                        opacity={0.82}
                      />
                      <text
                        x={112 + j * slot + Math.max(10, slot - 8) / 2}
                        y={top + 20}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={10}
                        fill="#fff"
                      >
                        {member.name.length > 16 ? `${member.name.slice(0, 15)}…` : member.name}
                      </text>
                    </g>
                  );
                })}
                <text
                  x={WIDTH - 68}
                  y={top + 20}
                  dominantBaseline="central"
                  fontSize={11}
                  fill={cluster.members.length > 2 ? 'var(--status-critical)' : 'var(--text-muted)'}
                >
                  {cluster.members.length > 2 ? `${cluster.members.length} → 1` : '1 layer'}
                </text>
              </g>
            );
          })}
          <text x={104} y={svgHeight - 12} fontSize={11} fill="var(--text-secondary)">
            {audit.n_triggers} triggers · {audit.n_clusters} independent layers ·{' '}
            <tspan fill={gradeColor} fontWeight={600}>
              grade {audit.grade}
            </tspan>
          </text>
        </svg>
        <Legend items={grouped.map((g) => ({ label: g.label, color: g.color }))} />
      </Figure>

      <h2 style={{ margin: '0 0 10px' }}>Reassign a trigger</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 14 }}>
        Move triggers between clusters and watch the grade move. Four of these all fire on an
        earnings event by default.
      </p>

      <div style={{ display: 'grid', gap: 10, marginBottom: 22 }}>
        {triggers.map((trigger, i) => (
          <div
            key={trigger.name}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 14,
              padding: '9px 13px',
              background: 'var(--surface-1)',
              border: 'var(--rule)',
              borderRadius: 'var(--radius)',
            }}
          >
            <span style={{ fontSize: 13, minWidth: 160, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span
                aria-hidden
                style={{ width: 9, height: 9, borderRadius: 2, background: clusterColor(trigger.cluster ?? ''), flexShrink: 0 }}
              />
              {trigger.name}
            </span>
            <Segmented
              label=""
              value={trigger.cluster ?? 'EARNINGS'}
              options={CLUSTERS.map((c) => ({ value: c.key as string, label: c.label }))}
              onChange={(cluster) =>
                setTriggers((list) => list.map((t, j) => (i === j ? { ...t, cluster } : t)))
              }
            />
          </div>
        ))}
      </div>

      {audit.recommendations.length > 0 && (
        <>
          <h2 style={{ margin: '0 0 10px' }}>What the audit recommends</h2>
          <ul style={{ margin: '0 0 22px', paddingLeft: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
            {audit.recommendations.map((recommendation) => (
              <li key={recommendation} style={{ marginBottom: 5 }}>
                {recommendation}
              </li>
            ))}
          </ul>
        </>
      )}

      <Note title="What to look for">
        <p>
          Spread the four earnings triggers across different clusters and the grade climbs to A.
          Collapse everything back into one and it falls to D — seven tripwires, one wire. The
          count of triggers never changed; only whether they can fail independently did.
        </p>
        <p>
          This is why the audit exists. A parameter list that looks thorough is the easiest kind of
          false comfort to build: every trigger is specific, measurable and sensible, and they all
          go off on the same Tuesday afternoon. Counting them tells you nothing about that.
        </p>
        <p>
          When a cluster does hold several triggers, the recommendation is to keep the one with the
          best detection score and relax the rest — redundancy within a layer buys nothing, while a
          trigger in an unwatched category buys a whole new layer.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          A note on the thresholds: the source document's worked example grades 57% independence as
          a B, but its own table puts 40–60% at C. The implementation follows the table.
        </p>
      </Note>
    </Plate>
  );
}
