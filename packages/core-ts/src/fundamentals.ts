/**
 * Piotroski F-Score: nine binary accounting signals, scored 0-9.
 *
 * Port of `tfg_core/fundamentals.py`. Binary scoring is the point — it resists
 * the temptation to weight whichever signal flatters the thesis.
 */

/** The three signal groups. */
export enum Category {
  Profitability = 'Profitability',
  Leverage = 'Leverage',
  Efficiency = 'Efficiency',
}

/** Score bands. Piotroski's original work found 7+ historically outperforms. */
export enum Quality {
  Strong = 'STRONG',
  Moderate = 'MODERATE',
  Weak = 'WEAK',
}

export const STRONG_THRESHOLD = 7;
export const MODERATE_THRESHOLD = 4;

/** One binary signal, with the comparison that produced it. */
export type Signal = {
  readonly name: string;
  readonly category: string;
  readonly score: number;
  readonly detail: string;
};

/** Total score, per-group subtotals, and every underlying signal. */
export type FScore = {
  readonly total_score: number;
  readonly max_score: number;
  readonly quality: string;
  readonly signals: readonly Signal[];
  readonly accruals_ratio: number;
  readonly profitability_score: number;
  readonly leverage_score: number;
  readonly efficiency_score: number;
};

/** Map a 0-9 total onto its quality band. */
export function classify(total: number): Quality {
  if (total >= STRONG_THRESHOLD) return Quality.Strong;
  if (total >= MODERATE_THRESHOLD) return Quality.Moderate;
  return Quality.Weak;
}

/** Format as Python's `:.Nf`. */
function fixed(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

/** Format as Python's `:.N%`. */
function pct(value: number, decimals: number): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export type FScoreArgs = {
  readonly roa_current: number; readonly roa_prior: number;
  readonly cfo_current: number; readonly net_income_current: number;
  readonly ltd_ratio_current: number; readonly ltd_ratio_prior: number;
  readonly current_ratio_current: number; readonly current_ratio_prior: number;
  readonly shares_current: number; readonly shares_prior: number;
  readonly gross_margin_current: number; readonly gross_margin_prior: number;
  readonly asset_turnover_current: number; readonly asset_turnover_prior: number;
};

/**
 * Score all nine signals.
 *
 * Cash-flow figures are in billions and share counts in millions, but only their
 * signs and period-over-period directions matter, so units cancel.
 */
export function computeFscore(args: FScoreArgs): FScore {
  const a = args;
  const s1 = a.roa_current > 0 ? 1 : 0;
  const s2 = a.cfo_current > 0 ? 1 : 0;
  const s3 = a.roa_current > a.roa_prior ? 1 : 0;
  const s4 = a.cfo_current > a.net_income_current ? 1 : 0;
  const s5 = a.ltd_ratio_current < a.ltd_ratio_prior ? 1 : 0;
  const s6 = a.current_ratio_current > a.current_ratio_prior ? 1 : 0;
  const s7 = a.shares_current <= a.shares_prior ? 1 : 0;
  const s8 = a.gross_margin_current > a.gross_margin_prior ? 1 : 0;
  const s9 = a.asset_turnover_current > a.asset_turnover_prior ? 1 : 0;

  const signals: Signal[] = [
    { name: 'ROA positive', category: Category.Profitability, score: s1,
      detail: `ROA = ${pct(a.roa_current, 2)} ${s1 ? '> 0' : '<= 0'}` },
    { name: 'CFO positive', category: Category.Profitability, score: s2,
      detail: `CFO = $${fixed(a.cfo_current, 1)}B ${s2 ? '> 0' : '<= 0'}` },
    { name: 'ROA improving', category: Category.Profitability, score: s3,
      detail: `ROA ${pct(a.roa_current, 2)} vs prior ${pct(a.roa_prior, 2)}` },
    { name: 'CFO > Net Income (quality)', category: Category.Profitability, score: s4,
      detail: `CFO $${fixed(a.cfo_current, 1)}B vs NI $${fixed(a.net_income_current, 1)}B — accruals ${s4 ? 'low' : 'high'}` },
    { name: 'Debt ratio declining', category: Category.Leverage, score: s5,
      detail: `LTD/Assets ${fixed(a.ltd_ratio_current, 3)} vs prior ${fixed(a.ltd_ratio_prior, 3)}` },
    { name: 'Current ratio improving', category: Category.Leverage, score: s6,
      detail: `Current ratio ${fixed(a.current_ratio_current, 2)} vs prior ${fixed(a.current_ratio_prior, 2)}` },
    { name: 'No dilution', category: Category.Leverage, score: s7,
      detail: `Shares ${fixed(a.shares_current, 0)}M vs prior ${fixed(a.shares_prior, 0)}M` },
    { name: 'Gross margin improving', category: Category.Efficiency, score: s8,
      detail: `GM ${pct(a.gross_margin_current, 1)} vs prior ${pct(a.gross_margin_prior, 1)}` },
    { name: 'Asset turnover improving', category: Category.Efficiency, score: s9,
      detail: `AT ${fixed(a.asset_turnover_current, 2)} vs prior ${fixed(a.asset_turnover_prior, 2)}` },
  ];

  const total = signals.reduce((sum, s) => sum + s.score, 0);

  // Positive accruals mean earnings outrun cash flow, the warning direction.
  const accruals =
    (a.net_income_current - a.cfo_current) / Math.max(1, a.net_income_current);

  return {
    total_score: total,
    max_score: 9,
    quality: classify(total),
    signals,
    accruals_ratio: accruals,
    profitability_score: s1 + s2 + s3 + s4,
    leverage_score: s5 + s6 + s7,
    efficiency_score: s8 + s9,
  };
}
