/**
 * The page shell every algorithm plate shares.
 *
 * A plate is: a title, what the algorithm answers, the live chart, and a note on
 * what to look for. The note matters as much as the plot — a chart nobody can
 * interpret is decoration.
 */

import { type ReactNode, useState } from 'react';

/** The outer wrapper for one algorithm's page. */
export function Plate({
  title,
  question,
  source,
  children,
}: {
  readonly title: string;
  /** The question this algorithm answers, in one line. */
  readonly question: string;
  /** Where the method is specified in the repo. */
  readonly source?: string;
  readonly children: ReactNode;
}) {
  return (
    <article style={{ maxWidth: 820 }}>
      <header style={{ marginBottom: 20 }}>
        <h1>{title}</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '1.02rem' }}>
          {question}
        </p>
        {source && (
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Specified in <code>{source}</code>
          </p>
        )}
      </header>
      {children}
    </article>
  );
}

/** A bordered card holding a chart plus its caption. */
export function Figure({
  caption,
  children,
  table,
}: {
  readonly caption?: string;
  readonly children: ReactNode;
  /** The table view. Required wherever a series sits below 3:1 contrast. */
  readonly table?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure
      style={{
        margin: '0 0 22px',
        background: 'var(--surface-1)',
        border: 'var(--rule)',
        borderRadius: 'var(--radius)',
        padding: '16px 18px 14px',
      }}
    >
      <div style={{ position: 'relative' }}>{children}</div>
      <figcaption
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
          marginTop: 12,
          paddingTop: 10,
          borderTop: 'var(--rule)',
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}
      >
        <span>{caption}</span>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: 0,
              padding: 0,
              font: 'inherit',
              fontSize: 12,
              color: 'var(--series-1)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              textDecoration: 'underline',
            }}
          >
            {showTable ? 'Hide data' : 'Show data'}
          </button>
        )}
      </figcaption>
      {table && showTable && <div style={{ marginTop: 12, overflowX: 'auto' }}>{table}</div>}
    </figure>
  );
}

/** An explanatory note below a figure. */
export function Note({ title, children }: { readonly title?: string; readonly children: ReactNode }) {
  return (
    <aside
      style={{
        borderLeft: '2px solid var(--series-1)',
        paddingLeft: 14,
        margin: '0 0 22px',
        fontSize: 14,
        color: 'var(--text-secondary)',
      }}
    >
      {title && (
        <h3 style={{ marginBottom: 4, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{title}</h3>
      )}
      {children}
    </aside>
  );
}

/**
 * A row of readouts for the numbers that matter most.
 *
 * Deliberately not a chart: a single headline figure is better read than plotted.
 */
export function Readouts({
  items,
}: {
  readonly items: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
    readonly tone?: 'neutral' | 'good' | 'warning' | 'critical';
    readonly hint?: string;
  }>;
}) {
  const toneColor = (tone?: string) =>
    tone === 'good'
      ? 'var(--status-good)'
      : tone === 'warning'
        ? 'var(--status-warning)'
        : tone === 'critical'
          ? 'var(--status-critical)'
          : 'var(--text-primary)';

  return (
    <dl
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(126px, 1fr))',
        gap: '2px 20px',
        margin: '0 0 22px',
        padding: '14px 0',
        borderTop: 'var(--rule)',
        borderBottom: 'var(--rule)',
      }}
    >
      {items.map((item) => (
        <div key={item.label}>
          <dt style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {item.label}
          </dt>
          <dd
            className="num"
            style={{
              margin: '2px 0 0',
              fontSize: '1.3rem',
              fontWeight: 600,
              color: toneColor(item.tone),
            }}
          >
            {item.value}
          </dd>
          {item.hint && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.hint}</div>
          )}
        </div>
      ))}
    </dl>
  );
}

/** A plain data table, used for table views and fixture-driven plates. */
export function DataTable({
  columns,
  rows,
  align,
}: {
  readonly columns: readonly string[];
  readonly rows: ReadonlyArray<readonly (string | number)[]>;
  /** Per-column alignment; defaults to left for the first column, right after. */
  readonly align?: readonly ('left' | 'right')[];
}) {
  const alignment = (i: number): 'left' | 'right' => align?.[i] ?? (i === 0 ? 'left' : 'right');
  return (
    <table
      style={{
        borderCollapse: 'collapse',
        width: '100%',
        fontSize: 12.5,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <thead>
        <tr>
          {columns.map((column, i) => (
            <th
              key={column}
              scope="col"
              style={{
                textAlign: alignment(i),
                padding: '6px 10px 6px 0',
                borderBottom: '1px solid var(--axis)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, i) => (
              <td
                key={i}
                style={{
                  textAlign: alignment(i),
                  padding: '5px 10px 5px 0',
                  borderBottom: 'var(--rule)',
                  color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * A banner for a state the methodology insists on announcing.
 *
 * Status colour never carries meaning alone here: each variant ships a label and
 * a glyph alongside it.
 */
export function Flag({
  tone,
  children,
}: {
  readonly tone: 'good' | 'warning' | 'critical';
  readonly children: ReactNode;
}) {
  const config = {
    good: { color: 'var(--status-good)', glyph: '✓', label: 'Clear' },
    warning: { color: 'var(--status-warning)', glyph: '!', label: 'Caution' },
    critical: { color: 'var(--status-critical)', glyph: '×', label: 'Blocked' },
  }[tone];

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        margin: '0 0 22px',
        padding: '10px 13px',
        background: 'var(--surface-2)',
        borderLeft: `3px solid ${config.color}`,
        borderRadius: 'var(--radius)',
        fontSize: 13.5,
      }}
    >
      <span
        aria-hidden
        style={{
          color: config.color,
          fontWeight: 700,
          lineHeight: 1.5,
          flexShrink: 0,
        }}
      >
        {config.glyph}
      </span>
      <span>
        <strong style={{ color: 'var(--text-primary)' }}>{config.label}.</strong>{' '}
        <span style={{ color: 'var(--text-secondary)' }}>{children}</span>
      </span>
    </div>
  );
}
