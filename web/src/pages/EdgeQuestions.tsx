/**
 * Edge mapping: questions about the analyst's world, not about stocks.
 *
 * The value is in the mapping — one answer about your own working life bears on
 * several names at once, which is what "edge" concretely means.
 */

import { useState } from 'react';

import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { EDGE_QUESTIONS } from '../lib/samples';

export default function EdgeQuestions() {
  const [selected, setSelected] = useState(0);
  const active = EDGE_QUESTIONS[selected]!;

  const allTickers = [...new Set(EDGE_QUESTIONS.flatMap((q) => q.maps))];

  return (
    <Plate
      title="Edge mapping"
      question="What do you know first-hand that the market has not priced yet?"
      source="tools/edge_questions.py"
    >
      <Readouts
        items={[
          { label: 'Questions', value: `${EDGE_QUESTIONS.length}` },
          { label: 'Tickers touched', value: `${allTickers.length}` },
          { label: 'Domains', value: `${new Set(EDGE_QUESTIONS.map((q) => q.domain)).size}` },
        ]}
      />

      <Figure caption="Select a question to see which positions its answer bears on.">
        <div style={{ display: 'grid', gap: 7 }}>
          {EDGE_QUESTIONS.map((question, i) => {
            const isActive = i === selected;
            return (
              <button
                key={question.question}
                type="button"
                onClick={() => setSelected(i)}
                aria-pressed={isActive}
                style={{
                  appearance: 'none',
                  textAlign: 'left',
                  font: 'inherit',
                  fontSize: 13.5,
                  cursor: 'pointer',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 14,
                  alignItems: 'center',
                  padding: '10px 13px',
                  background: isActive ? 'var(--surface-2)' : 'var(--surface-1)',
                  border: 'var(--rule)',
                  borderLeft: `3px solid ${isActive ? 'var(--series-1)' : 'transparent'}`,
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-primary)',
                }}
              >
                <span>{question.question}</span>
                <span style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  {question.maps.map((ticker) => (
                    <span
                      key={ticker}
                      style={{
                        fontSize: 10.5,
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: isActive ? 'var(--series-1)' : 'var(--surface-2)',
                        color: isActive ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      {ticker}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
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
        <h3 style={{ marginBottom: 5 }}>{active.domain}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
          “{active.question}” — an answer here updates the demand-chain estimate for{' '}
          {active.maps.join(', ')} simultaneously, because all three sit downstream of the same
          behaviour.
        </p>
      </div>

      <Figure caption="Every question with its domain and the positions it bears on.">
        <DataTable
          columns={['Question', 'Domain', 'Maps to']}
          align={['left', 'left', 'left']}
          rows={EDGE_QUESTIONS.map((q) => [q.question, q.domain, q.maps.join(', ')])}
        />
      </Figure>

      <Note title="What to look for">
        <p>
          None of these questions is about a stock. They are about what you actually observe —
          which tools you kept paying for, what your peers stopped using, who is hiring. The theory
          is that a non-professional's edge, where it exists at all, lives in direct observation
          rather than in out-analysing people with better data.
        </p>
        <p>
          One answer updates several names at once, which is efficient and also a hazard: evidence
          derived from a single observation about your own life is <em>one</em> piece of evidence,
          however many tickers it touches. The Bayesian chain's dependency check exists to stop it
          being counted three times.
        </p>
      </Note>
    </Plate>
  );
}
