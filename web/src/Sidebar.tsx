/**
 * The gallery index as a reference-manual sidebar.
 *
 * Grouped by the system's own stages, so the navigation teaches the pipeline's
 * shape before any plate is opened.
 */

import { useEffect, useRef, useState } from 'react';

import { ENTRIES, GROUP_ORDER, Kind, entriesIn } from './lib/registry';

/**
 * Whether the index fits the viewport, measured rather than assumed.
 *
 * A pinned sidebar has to clip anything taller than the screen, and on macOS the
 * resulting scrollbar is invisible until you scroll it — so entries near the
 * bottom silently vanish. How tall the index renders depends on the system font,
 * the browser and the zoom level, which no CSS breakpoint can predict. So it is
 * measured at runtime: pin only when the whole index genuinely fits, and
 * otherwise let it scroll with the document, where nothing can hide.
 */
function useFitsViewport(ref: React.RefObject<HTMLElement>): boolean {
  const [fits, setFits] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Measure the inner content, never the nav's own box. As a flex child the
    // nav stretches to the full page height once it is no longer pinned, so
    // measuring the box would read thousands of pixels and latch the state off.
    // The nav's own vertical padding counts toward what has to fit: leaving it
    // out pins the sidebar when it is a few pixels too tall, clipping the end
    // of the index by exactly that padding.
    const measure = () => {
      const nav = element.parentElement;
      const style = nav ? getComputedStyle(nav) : null;
      const padding = style
        ? parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
        : 0;
      setFits(element.offsetHeight + padding <= window.innerHeight);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    // Fonts load after first paint and change the measurement.
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref]);

  return fits;
}

export function Sidebar({
  current,
  open,
  onClose,
}: {
  readonly current: string;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const fits = useFitsViewport(contentRef);

  return (
    <>
      <div className="scrim" data-open={open} onClick={onClose} aria-hidden />
      <nav
        className="sidebar"
        data-open={open}
        data-pinned={fits}
        aria-label="Algorithm index"
      >
        <div ref={contentRef}>
        <a
          href="#/"
          style={{
            display: 'block',
            padding: '0 24px 12px',
            borderBottom: 'var(--rule)',
            marginBottom: 4,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <strong style={{ display: "block", fontSize: 14.5, letterSpacing: "-0.01em" }}>
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
            margin: '16px 24px 0',
            paddingTop: 11,
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
        </div>
      </nav>
    </>
  );
}
