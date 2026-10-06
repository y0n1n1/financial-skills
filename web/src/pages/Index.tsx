/**
 * The gallery index.
 *
 * Leads with what the system is for rather than a list of charts: the plates make
 * more sense once you know the thing is built to disprove a thesis.
 */

import { ENTRIES, GROUP_ORDER, Kind, LIVE_COUNT, entriesIn } from '../lib/registry';

export function Index() {
  return (
    <div style={{ maxWidth: 880 }}>
      <header style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: '2rem' }}>The Financial Gauntlet</h1>
        <p
          style={{
            marginTop: 10,
            fontSize: '1.08rem',
            color: 'var(--text-secondary)',
            maxWidth: 640,
          }}
        >
          An equity research system built to <em>disprove</em> a thesis rather than confirm one.
          These {ENTRIES.length} plates are its methods made interactive — {LIVE_COUNT} of them
          recomputing live in your browser as you move the inputs.
        </p>
      </header>

      <section
        style={{
          display: 'grid',
          gap: 18,
          gridTemplateColumns: 'repeat(auto-fit, minmax(234px, 1fr))',
          padding: '18px 0',
          borderTop: 'var(--rule)',
          borderBottom: 'var(--rule)',
          marginBottom: 32,
        }}
      >
        <Principle
          title="Falsification, not confirmation"
          body="Every lens asks what evidence would destroy the thesis, and whether that evidence exists."
        />
        <Principle
          title="The interval is the output"
          body="A posterior of 35% ± 13% that straddles a decision boundary has not resolved the question. Saying so is the deliverable."
        />
        <Principle
          title="Precision is capped by provenance"
          body="A base rate from nineteen analogues is “~35%”, never “35.2%”. The plates enforce this."
        />
      </section>

      {GROUP_ORDER.map((group) => (
        <section key={group} style={{ marginBottom: 34 }}>
          <h2 style={{ marginBottom: 12 }}>{group}</h2>
          <div className="card-grid">
            {entriesIn(group).map((entry) => (
              <a key={entry.slug} className="card" href={`#/${entry.slug}`}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <h3 style={{ fontSize: '0.94rem' }}>{entry.title}</h3>
                  <span
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color:
                        entry.kind === Kind.Live ? 'var(--status-good)' : 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {entry.kind === Kind.Live ? 'live' : 'sample'}
                  </span>
                </div>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.45,
                  }}
                >
                  {entry.blurb}
                </p>
              </a>
            ))}
          </div>
        </section>
      ))}

      <footer
        style={{
          paddingTop: 18,
          borderTop: 'var(--rule)',
          fontSize: 13,
          color: 'var(--text-muted)',
          maxWidth: 640,
        }}
      >
        <p>
          The maths runs in your browser from{' '}
          <a href="https://github.com/y0n1n1/financial-skills/tree/main/packages/core-ts">
            <code>@tfg/core</code>
          </a>
          , a zero-dependency TypeScript port of the Python package, verified against shared golden
          vectors so the two cannot drift.
        </p>
        <p>
          <strong>Not financial advice</strong>, and by construction it never gives any. These are
          probabilities, expected values, confidence intervals, and reasons to walk away.
        </p>
      </footer>
    </div>
  );
}

function Principle({ title, body }: { readonly title: string; readonly body: string }) {
  return (
    <div>
      <h3 style={{ fontSize: '0.86rem', marginBottom: 4 }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {body}
      </p>
    </div>
  );
}
