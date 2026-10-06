/**
 * The position lifecycle state machine.
 *
 * A diagram, not a chart: the data is a graph of states and permitted
 * transitions, and the honest rendering of a graph is a graph.
 */

import { useState } from 'react';

import { DataTable, Figure, Note, Plate } from '../charts/Plate';

const WIDTH = 720;
const HEIGHT = 300;

type State = {
  readonly key: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly description: string;
  readonly rule: string;
  readonly next: readonly string[];
};

/** The documented states, laid out left to right along the normal path. */
const STATES: readonly State[] = [
  { key: 'DISCOVERY', label: 'Discovery', x: 70, y: 80, description: 'Researching. No gauntlet run yet.', rule: 'Identified via screener or thesis formation', next: ['WATCHING', 'DROPPED'] },
  { key: 'WATCHING', label: 'Watching', x: 200, y: 80, description: 'Theory card exists. Not yet sized.', rule: 'Gauntlet survived; waiting on entry conditions', next: ['ENTERING', 'DROPPED'] },
  { key: 'ENTERING', label: 'Entering', x: 330, y: 80, description: 'Kelly gate passed, first tranche placed.', rule: 'Positive EV and parameters are set', next: ['ACCUMULATING'] },
  { key: 'ACCUMULATING', label: 'Accumulating', x: 460, y: 80, description: 'Building toward the target weight.', rule: 'Thesis intact, no MAJOR trigger fired', next: ['STEADY', 'DISTRIBUTING'] },
  { key: 'STEADY', label: 'Steady', x: 590, y: 80, description: 'At target weight. Monitored weekly.', rule: 'All parameters within thresholds', next: ['DISTRIBUTING'] },
  { key: 'DISTRIBUTING', label: 'Distributing', x: 460, y: 205, description: 'Reducing. Thesis weakening or target reached.', rule: 'MAJOR trigger, or valuation target hit', next: ['EXITING', 'ACCUMULATING'] },
  { key: 'EXITING', label: 'Exiting', x: 330, y: 205, description: 'Closing the position.', rule: 'EXIT trigger fired, or thesis falsified', next: ['CLOSED'] },
  { key: 'CLOSED', label: 'Closed', x: 200, y: 205, description: 'Flat. Post-mortem required before reuse.', rule: 'Position fully unwound', next: ['DISCOVERY'] },
  { key: 'DROPPED', label: 'Dropped', x: 70, y: 205, description: 'Rejected before entry.', rule: 'Gauntlet failed or EV negative', next: ['DISCOVERY'] },
];

const BOX = { width: 108, height: 44 };

export default function PositionLifecycle() {
  const [selected, setSelected] = useState<string>('STEADY');
  const active = STATES.find((s) => s.key === selected)!;

  const center = (state: State) => ({ cx: state.x + BOX.width / 2, cy: state.y + BOX.height / 2 });

  return (
    <Plate
      title="Position lifecycle"
      question="What state is this position in, and what is allowed to happen next?"
      source="tools/lifecycle.py"
    >
      <Figure caption="Click a state to see its rule. Arrows are the only permitted transitions — the point of a state machine is what it forbids.">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
          <title>Position lifecycle state machine with permitted transitions</title>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--axis)" />
            </marker>
          </defs>

          {STATES.flatMap((state) =>
            state.next.map((nextKey) => {
              const target = STATES.find((s) => s.key === nextKey);
              if (!target) return null;
              const from = center(state);
              const to = center(target);
              const highlighted = selected === state.key || selected === nextKey;
              return (
                <line
                  key={`${state.key}-${nextKey}`}
                  x1={from.cx}
                  y1={from.cy}
                  x2={to.cx}
                  y2={to.cy}
                  stroke={highlighted ? 'var(--series-1)' : 'var(--axis)'}
                  strokeWidth={highlighted ? 2 : 1}
                  opacity={highlighted ? 0.9 : 0.4}
                  markerEnd="url(#arrow)"
                />
              );
            }),
          )}

          {STATES.map((state) => {
            const isActive = selected === state.key;
            const isTerminal = state.key === 'CLOSED' || state.key === 'DROPPED';
            return (
              <g key={state.key} onClick={() => setSelected(state.key)} style={{ cursor: 'pointer' }}>
                <rect
                  x={state.x}
                  y={state.y}
                  width={BOX.width}
                  height={BOX.height}
                  rx={5}
                  fill={isActive ? 'var(--series-1)' : 'var(--surface-2)'}
                  stroke={isActive ? 'var(--series-1)' : isTerminal ? 'var(--text-muted)' : 'var(--border-strong)'}
                  strokeWidth={1.5}
                  strokeDasharray={isTerminal ? '4 3' : undefined}
                />
                <text
                  x={state.x + BOX.width / 2}
                  y={state.y + BOX.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={isActive ? 600 : 400}
                  fill={isActive ? '#fff' : 'var(--text-secondary)'}
                >
                  {state.label}
                </text>
              </g>
            );
          })}
        </svg>
      </Figure>

      <div
        style={{
          padding: '14px 16px',
          background: 'var(--surface-1)',
          border: 'var(--rule)',
          borderRadius: 'var(--radius)',
          marginBottom: 22,
        }}
      >
        <h3 style={{ marginBottom: 4 }}>{active.label}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 6 }}>{active.description}</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Entry rule: {active.rule} · Can move to: {active.next.join(', ')}
        </p>
      </div>

      <Figure caption="Every state with its entry rule and permitted transitions.">
        <DataTable
          columns={['State', 'Meaning', 'Entry rule', 'Next']}
          align={['left', 'left', 'left', 'left']}
          rows={STATES.map((s) => [s.label, s.description, s.rule, s.next.join(', ')])}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          There is no arrow from <strong>Watching</strong> straight to <strong>Accumulating</strong>.
          Every position must pass through Entering, which is where the Kelly gate and the parameter
          set are required. The state machine's value is in the transitions it refuses.
        </p>
        <p>
          <strong>Closed</strong> loops back to Discovery only through a post-mortem. A name cannot
          be quietly re-entered on the old thesis after a loss — the re-entry protocol exists
          precisely because that is the most tempting trade on the board.
        </p>
        <p>
          <strong>Distributing</strong> can return to Accumulating. Reducing on a weakening thesis
          is not irreversible, which keeps the state machine from punishing an analyst for
          responding to evidence that later reverses.
        </p>
      </Note>
    </Plate>
  );
}
