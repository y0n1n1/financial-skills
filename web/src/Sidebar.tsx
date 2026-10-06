/**
 * The gallery index as a reference-manual sidebar.
 *
 * Grouped by the system's own stages, so the navigation teaches the pipeline's
 * shape before any plate is opened.
 */

import { ENTRIES, GROUP_ORDER, Kind, entriesIn } from './lib/registry';

export function Sidebar({
  current,
  open,
  onClose,
}: {
  readonly current: string;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  return (
    <>
      <div className="scrim" data-open={open} onClick={onClose} aria-hidden />
      <nav className="sidebar" data-open={open} aria-label="Algorithm index">
        <a
          href="#/"
          style={{
            display: 'block',
            padding: '0 24px 16px',
            borderBottom: 'var(--rule)',
            marginBottom: 4,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <strong style={{ display: 'block', fontSize: 14.5, letterSpacing: '-0.01em' }}>
            The Financial Gauntlet
          </strong>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {ENTRIES.length} algorithms, interactive
          </span>
        </a>

        {GROUP_ORDER.map((group) => (
          <div key={group}>
            <div className="sidebar-group">{group}</div>
            {entriesIn(group).map((entry) => (
              <a
                key={entry.slug}
                className="sidebar-link"
                href={`#/${entry.slug}`}
                aria-current={current === entry.slug ? 'page' : undefined}
              >
                {entry.title}
                {entry.kind === Kind.Sample && (
                  <span
                    title="Driven by bundled sample data"
                    style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}
                  >
                    sample
                  </span>
                )}
              </a>
            ))}
          </div>
        ))}

        <div
          style={{
            margin: '26px 24px 0',
            paddingTop: 14,
            borderTop: 'var(--rule)',
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          <a href="https://github.com/y0n1n1/financial-skills">Source on GitHub</a>
          <br />
          Not financial advice.
        </div>
      </nav>
    </>
  );
}
