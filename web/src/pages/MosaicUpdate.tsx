/**
 * The weekly mosaic.
 *
 * Every stream for one thesis, on one page, with its direction and weight. The
 * form is a ledger rather than a chart because the question is "what moved",
 * not "how much".
 */

import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { Legend } from '../charts/Plot';
import { MOSAIC_SIGNALS } from '../lib/samples';

const WEIGHT_SCORE: Readonly<Record<string, number>> = { high: 3, medium: 2, low: 1 };

export default function MosaicUpdate() {
  const score = MOSAIC_SIGNALS.reduce((sum, s) => {
    const magnitude = WEIGHT_SCORE[s.weight] ?? 1;
    return sum + (s.direction === 'for' ? magnitude : s.direction === 'against' ? -magnitude : 0);
  }, 0);

  const colorFor = (direction: string) =>
    direction === 'for' ? 'var(--div-pos)' : direction === 'against' ? 'var(--div-neg)' : 'var(--text-muted)';

  return (
    <Plate
      title="Weekly mosaic"
      question="Across every data stream, which way did the week move this thesis?"
      source="tools/mosaic_update.py"
    >
      <Readouts
        items={[
          { label: 'Streams', value: `${MOSAIC_SIGNALS.length}` },
          { label: 'Net direction', value: score > 0 ? 'for' : score < 0 ? 'against' : 'flat', tone: score < 0 ? 'warning' : 'neutral' },
          { label: 'Weighted score', value: `${score > 0 ? '+' : ''}${score}` },
          { label: 'Time budget', value: '20 min' },
        ]}
      />

      <Figure caption="Each stream's reading for the week, with its direction and how much weight it carries.">
        <div style={{ display: 'grid', gap: 8 }}>
          {MOSAIC_SIGNALS.map((signal) => (
            <div
              key={signal.stream}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 190px) minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 12,
                padding: '9px 12px',
                background: 'var(--surface-2)',
                borderLeft: `3px solid ${colorFor(signal.direction)}`,
                borderRadius: 'var(--radius)',
                fontSize: 13.5,
              }}
            >
              <span aria-hidden style={{ color: colorFor(signal.direction), fontWeight: 700, width: 14, textAlign: 'center' }}>
                {signal.direction === 'for' ? '↑' : signal.direction === 'against' ? '↓' : '·'}
              </span>
              <span style={{ color: 'var(--text-primary)' }}>{signal.stream}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{signal.reading}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {signal.weight}
              </span>
            </div>
          ))}
        </div>
        <Legend
          items={[
            { label: 'Supports the thesis', color: 'var(--div-pos)' },
            { label: 'Undermines it', color: 'var(--div-neg)' },
            { label: 'Neutral', color: 'var(--text-muted)' },
          ]}
        />
      </Figure>

      <Figure caption="The same week as a table, which is what gets appended to the theory card.">
        <DataTable
          columns={['Stream', 'Reading', 'Direction', 'Weight']}
          align={['left', 'left', 'left', 'left']}
          rows={MOSAIC_SIGNALS.map((s) => [s.stream, s.reading, s.direction, s.weight])}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          The three streams pointing against the thesis carry high and medium weight; the two
          supporting it are both low. Counting signals would call this week three-to-two and
          roughly balanced. Weighting them calls it clearly negative, which is the same lesson the
          lens-reliability stage teaches one level up.
        </p>
        <p>
          Twenty minutes per name per week is a deliberate ceiling. The mosaic is a sweep for
          whether anything moved enough to justify re-running the gauntlet — not the gauntlet
          itself, and not an excuse to re-litigate the thesis every Monday.
        </p>
      </Note>
    </Plate>
  );
}
