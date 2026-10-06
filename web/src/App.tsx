/**
 * The app shell: a reference-manual sidebar, a theme toggle, and the routed plate.
 *
 * Pages are lazily loaded so the initial bundle carries only the shell and the
 * index — twenty-odd plates in one chunk would make the first paint slower for no
 * reason.
 */

import { Suspense, lazy, useEffect, useState } from 'react';

import { Index } from './pages/Index';
import { Kind, findEntry } from './lib/registry';
import { Sidebar } from './Sidebar';
import { navigate, useRoute, useScrollReset } from './lib/router';

/** One lazy component per plate, keyed by slug. */
const PAGES: Readonly<Record<string, React.LazyExoticComponent<() => JSX.Element>>> = {
  'monte-carlo-ev': lazy(() => import('./pages/MonteCarloEv')),
  'options-implied': lazy(() => import('./pages/OptionsImplied')),
  'sensitivity-tornado': lazy(() => import('./pages/SensitivityTornado')),
  'fermi-matrix': lazy(() => import('./pages/FermiMatrix')),
  'bayesian-chain': lazy(() => import('./pages/BayesianChain')),
  'lens-reliability': lazy(() => import('./pages/LensReliability')),
  'information-content': lazy(() => import('./pages/InformationContent')),
  calibration: lazy(() => import('./pages/Calibration')),
  'pre-registration': lazy(() => import('./pages/PreRegistration')),
  'intuition-tracker': lazy(() => import('./pages/IntuitionTracker')),
  'question-generator': lazy(() => import('./pages/QuestionGenerator')),
  'edge-questions': lazy(() => import('./pages/EdgeQuestions')),
  'kelly-gate': lazy(() => import('./pages/KellyGate')),
  'black-litterman': lazy(() => import('./pages/BlackLitterman')),
  'fmea-risk': lazy(() => import('./pages/FmeaRisk')),
  'defense-independence': lazy(() => import('./pages/DefenseIndependence')),
  'parameter-monitor': lazy(() => import('./pages/ParameterMonitor')),
  piotroski: lazy(() => import('./pages/Piotroski')),
  'factor-decomposition': lazy(() => import('./pages/FactorDecomposition')),
  'stock-screener': lazy(() => import('./pages/StockScreener')),
  'earnings-language': lazy(() => import('./pages/EarningsLanguage')),
  'position-lifecycle': lazy(() => import('./pages/PositionLifecycle')),
  'portfolio-dashboard': lazy(() => import('./pages/PortfolioDashboard')),
  'post-mortem': lazy(() => import('./pages/PostMortem')),
  'mosaic-update': lazy(() => import('./pages/MosaicUpdate')),
};

export function App() {
  const route = useRoute();
  const [navOpen, setNavOpen] = useState(false);
  useScrollReset(route);

  // Close the mobile drawer on navigation, so a tap doesn't leave it covering
  // the page it just opened.
  useEffect(() => setNavOpen(false), [route]);

  const entry = findEntry(route);
  const Page = PAGES[route];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar current={route} open={navOpen} onClose={() => setNavOpen(false)} />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: '28px clamp(18px, 4vw, 52px) 80px',
        }}
      >
        <TopBar onMenu={() => setNavOpen(true)} />

        {route === '' ? (
          <Index />
        ) : Page && entry ? (
          <>
            {entry.kind === Kind.Sample && <SampleDataBanner />}
            <Suspense fallback={<Loading />}>
              <Page />
            </Suspense>
          </>
        ) : (
          <NotFound route={route} />
        )}
      </main>
    </div>
  );
}

/** Mobile menu button and the theme toggle. */
function TopBar({ onMenu }: { readonly onMenu: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 22,
      }}
    >
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        className="menu-button"
        style={{
          appearance: 'none',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          font: 'inherit',
          padding: '5px 10px',
        }}
      >
        ☰ Index
      </button>
      <div style={{ marginLeft: 'auto' }}>
        <ThemeToggle />
      </div>
    </div>
  );
}

/**
 * Light / dark / system toggle.
 *
 * Stamps `data-theme` on the root element, which the stylesheet's token blocks key
 * off. "System" removes the stamp and lets `prefers-color-scheme` decide.
 */
function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      const stored = localStorage.getItem('tfg-theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // Private browsing and blocked site data both throw; the default is fine.
    }
    return 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      if (theme === 'system') localStorage.removeItem('tfg-theme');
      else localStorage.setItem('tfg-theme', theme);
    } catch {
      // Persisting the choice is a convenience, never a requirement.
    }
  }, [theme]);

  const options: ReadonlyArray<{ value: typeof theme; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'Auto' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <div
      role="group"
      aria-label="Colour theme"
      style={{
        display: 'inline-flex',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      {options.map((option, i) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setTheme(option.value)}
          aria-pressed={theme === option.value}
          style={{
            appearance: 'none',
            border: 0,
            borderLeft: i === 0 ? 0 : '1px solid var(--border-strong)',
            background: theme === option.value ? 'var(--surface-2)' : 'var(--surface-1)',
            color: theme === option.value ? 'var(--text-primary)' : 'var(--text-muted)',
            font: 'inherit',
            fontSize: 11.5,
            padding: '4px 9px',
            cursor: 'pointer',
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SampleDataBanner() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 9,
        alignItems: 'baseline',
        maxWidth: 820,
        margin: '0 0 20px',
        padding: '9px 13px',
        background: 'var(--surface-2)',
        borderLeft: '3px solid var(--status-warning)',
        borderRadius: 'var(--radius)',
        fontSize: 13,
        color: 'var(--text-secondary)',
      }}
    >
      <span aria-hidden style={{ color: 'var(--status-warning)', fontWeight: 700 }}>
        !
      </span>
      <span>
        <strong style={{ color: 'var(--text-primary)' }}>Sample data.</strong> This tool needs live
        market data, which a static page cannot fetch. The figures below come from a bundled
        snapshot and are illustrative — the layout and logic are real, the numbers are not current.
      </span>
    </div>
  );
}

function Loading() {
  return (
    <p style={{ color: 'var(--text-muted)', fontSize: 14 }} role="status">
      Loading…
    </p>
  );
}

function NotFound({ route }: { readonly route: string }) {
  return (
    <div style={{ maxWidth: 560 }}>
      <h1>Not found</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        There is no plate at <code>{route}</code>.
      </p>
      <button
        type="button"
        onClick={() => navigate('')}
        style={{
          appearance: 'none',
          background: 'var(--series-1)',
          border: 0,
          borderRadius: 'var(--radius)',
          color: '#fff',
          cursor: 'pointer',
          font: 'inherit',
          padding: '7px 14px',
        }}
      >
        Back to the index
      </button>
    </div>
  );
}
