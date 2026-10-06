/**
 * The Piotroski F-Score as a nine-light scorecard.
 *
 * Nine binary signals is a form that resists charting — so this is a scorecard
 * rather than a plot, which is the honest answer to "what chart should this be".
 */

import { useMemo, useState } from 'react';

import { fundamentals } from '@tfg/core';
import { DataTable, Figure, Note, Plate, Readouts } from '../charts/Plate';
import { ControlRow, ResetButton, Slider } from '../controls/Controls';
import { fixed } from '../charts/format';

const DEFAULTS = {
  roa_current: 0.65,
  roa_prior: 0.55,
  cfo_current: 97,
  net_income_current: 73,
  ltd_ratio_current: 0.07,
  ltd_ratio_prior: 0.08,
  current_ratio_current: 3.91,
  current_ratio_prior: 3.5,
  shares_current: 24400,
  shares_prior: 24500,
  gross_margin_current: 0.75,
  gross_margin_prior: 0.73,
  asset_turnover_current: 0.85,
  asset_turnover_prior: 0.8,
};

export default function Piotroski() {
  const [state, setState] = useState(DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(key: K, value: number) =>
    setState((s) => ({ ...s, [key]: value }));

  const result = useMemo(() => fundamentals.computeFscore(state), [state]);

  const groups = [
    { name: 'Profitability', score: result.profitability_score, max: 4 },
    { name: 'Leverage', score: result.leverage_score, max: 3 },
    { name: 'Efficiency', score: result.efficiency_score, max: 2 },
  ];

  const qualityTone =
    result.quality === fundamentals.Quality.Strong
      ? 'good'
      : result.quality === fundamentals.Quality.Moderate
        ? 'warning'
        : 'critical';

  return (
    <Plate
      title="Piotroski F-Score"
      question="Is the accounting quality improving — on nine checks chosen before anyone looked at this company?"
      source="tools/piotroski_fscore.py"
    >
      <ControlRow>
        <Slider label="Return on assets, current" value={state.roa_current} min={-0.2} max={0.9} step={0.01} onChange={(v) => set('roa_current', v)} format={(v) => `${(v * 100).toFixed(0)}%`} />
        <Slider label="Return on assets, prior" value={state.roa_prior} min={-0.2} max={0.9} step={0.01} onChange={(v) => set('roa_prior', v)} format={(v) => `${(v * 100).toFixed(0)}%`} />
        <Slider label="Operating cash flow" value={state.cfo_current} min={-40} max={200} step={1} onChange={(v) => set('cfo_current', v)} format={(v) => `$${v.toFixed(0)}B`} />
        <Slider label="Net income" value={state.net_income_current} min={-40} max={200} step={1} onChange={(v) => set('net_income_current', v)} format={(v) => `$${v.toFixed(0)}B`} />
        <Slider label="Debt ratio, current" value={state.ltd_ratio_current} min={0} max={0.8} step={0.01} onChange={(v) => set('ltd_ratio_current', v)} format={(v) => v.toFixed(2)} />
        <Slider label="Debt ratio, prior" value={state.ltd_ratio_prior} min={0} max={0.8} step={0.01} onChange={(v) => set('ltd_ratio_prior', v)} format={(v) => v.toFixed(2)} />
        <Slider label="Current ratio, current" value={state.current_ratio_current} min={0.3} max={6} step={0.01} onChange={(v) => set('current_ratio_current', v)} format={(v) => v.toFixed(2)} />
        <Slider label="Current ratio, prior" value={state.current_ratio_prior} min={0.3} max={6} step={0.01} onChange={(v) => set('current_ratio_prior', v)} format={(v) => v.toFixed(2)} />
        <Slider label="Shares out, current" value={state.shares_current} min={1000} max={30000} step={50} onChange={(v) => set('shares_current', v)} format={(v) => `${(v / 1000).toFixed(1)}B`} />
        <Slider label="Shares out, prior" value={state.shares_prior} min={1000} max={30000} step={50} onChange={(v) => set('shares_prior', v)} format={(v) => `${(v / 1000).toFixed(1)}B`} />
        <Slider label="Gross margin, current" value={state.gross_margin_current} min={0} max={0.95} step={0.01} onChange={(v) => set('gross_margin_current', v)} format={(v) => `${(v * 100).toFixed(0)}%`} />
        <Slider label="Gross margin, prior" value={state.gross_margin_prior} min={0} max={0.95} step={0.01} onChange={(v) => set('gross_margin_prior', v)} format={(v) => `${(v * 100).toFixed(0)}%`} />
        <Slider label="Asset turnover, current" value={state.asset_turnover_current} min={0.1} max={3} step={0.01} onChange={(v) => set('asset_turnover_current', v)} format={(v) => v.toFixed(2)} />
        <Slider label="Asset turnover, prior" value={state.asset_turnover_prior} min={0.1} max={3} step={0.01} onChange={(v) => set('asset_turnover_prior', v)} format={(v) => v.toFixed(2)} />
        <ResetButton onClick={() => setState(DEFAULTS)} />
      </ControlRow>

      <Readouts
        items={[
          { label: 'F-Score', value: `${result.total_score} / 9`, tone: qualityTone },
          { label: 'Quality band', value: result.quality, tone: qualityTone },
          { label: 'Profitability', value: `${result.profitability_score} / 4` },
          { label: 'Leverage', value: `${result.leverage_score} / 3` },
          { label: 'Efficiency', value: `${result.efficiency_score} / 2` },
          {
            label: 'Accruals ratio',
            value: fixed(result.accruals_ratio, 3),
            tone: result.accruals_ratio > 0 ? 'warning' : 'good',
            hint: result.accruals_ratio > 0 ? 'earnings outrun cash' : 'cash backs earnings',
          },
        ]}
      />

      <Figure
        caption="Nine binary checks. A filled marker is a point scored; the detail beside it is the comparison that decided it."
        table={
          <DataTable
            columns={['Signal', 'Category', 'Score', 'Detail']}
            align={['left', 'left', 'right', 'left']}
            rows={result.signals.map((s) => [s.name, s.category, s.score, s.detail])}
          />
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          {groups.map((group) => (
            <div key={group.name}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 7,
                  paddingBottom: 5,
                  borderBottom: 'var(--rule)',
                }}
              >
                <h3 style={{ fontSize: '0.84rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  {group.name}
                </h3>
                <span className="num" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {group.score} / {group.max}
                </span>
              </div>
              <div style={{ display: 'grid', gap: 5 }}>
                {result.signals
                  .filter((s) => s.category === group.name)
                  .map((signal) => (
                    <div
                      key={signal.name}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                        alignItems: 'center',
                        gap: 11,
                        fontSize: 13,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 15,
                          height: 15,
                          borderRadius: 3,
                          background: signal.score ? 'var(--status-good)' : 'var(--surface-2)',
                          border: signal.score ? 'none' : '1px solid var(--border-strong)',
                          color: '#fff',
                          fontSize: 11,
                          lineHeight: '15px',
                          textAlign: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {signal.score ? '✓' : ''}
                      </span>
                      <span style={{ color: signal.score ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {signal.name}
                      </span>
                      <span
                        className="num"
                        style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'right' }}
                      >
                        {signal.detail}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Figure>

      <Note title="What to look for">
        <p>
          Drag <strong>operating cash flow</strong> below net income. One light goes out — the
          accruals check — and the accruals ratio flips positive. That single signal is the one
          most associated with earnings that are being managed rather than earned, and it costs
          exactly as much as every other signal: one point.
        </p>
        <p>
          Equal weighting is the design, not an oversight. The moment signals can be weighted, they
          get weighted toward whichever ones support the thesis. Nine binary checks, fixed in
          advance by someone who had never heard of this company, cannot be bent that way.
        </p>
        <p>
          Note how many checks are <em>directional</em> rather than absolute: debt ratio declining,
          margin improving, turnover improving. A company can be enormously profitable and still
          score badly, because the score asks whether things are getting better, not whether they
          are good.
        </p>
      </Note>
    </Plate>
  );
}
