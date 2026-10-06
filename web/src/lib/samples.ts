/**
 * Bundled sample data for the plates whose real inputs need market data.
 *
 * These are illustrative snapshots, not live figures, and every plate that uses
 * them says so. The shapes match what the corresponding Python tool produces, so
 * the layouts are honest even though the numbers are not current.
 */

/** Fama-French factor loadings, as `factor_decomposition.py` reports them. */
export const FACTOR_LOADINGS = [
  { ticker: 'NVDA', market: 1.72, size: -0.31, value: -0.58, momentum: 0.44, alpha: 0.11, r2: 0.74 },
  { ticker: 'GOOGL', market: 1.08, size: -0.22, value: -0.19, momentum: 0.08, alpha: 0.02, r2: 0.81 },
  { ticker: 'META', market: 1.24, size: -0.18, value: -0.33, momentum: 0.21, alpha: 0.05, r2: 0.78 },
  { ticker: 'WDAY', market: 1.15, size: 0.12, value: -0.41, momentum: -0.09, alpha: -0.03, r2: 0.69 },
  { ticker: 'HOOD', market: 1.88, size: 0.54, value: -0.22, momentum: 0.37, alpha: 0.09, r2: 0.58 },
] as const;

/** Pairwise return correlations for the same names. */
export const CORRELATIONS: ReadonlyArray<readonly number[]> = [
  [1.0, 0.62, 0.58, 0.41, 0.49],
  [0.62, 1.0, 0.71, 0.46, 0.38],
  [0.58, 0.71, 1.0, 0.44, 0.41],
  [0.41, 0.46, 0.44, 1.0, 0.33],
  [0.49, 0.38, 0.41, 0.33, 1.0],
];

export const CORRELATION_TICKERS = ['NVDA', 'GOOGL', 'META', 'WDAY', 'HOOD'] as const;

/** Screener output: names ranked by where a tech-moat edge is strongest. */
export const SCREENER_ROWS = [
  { ticker: 'NVDA', score: 92, revenueGrowth: 0.62, grossMargin: 0.75, pe: 34, moat: 'Ecosystem lock-in', edge: 'High' },
  { ticker: 'GOOGL', score: 81, revenueGrowth: 0.14, grossMargin: 0.58, pe: 23, moat: 'Distribution', edge: 'High' },
  { ticker: 'META', score: 77, revenueGrowth: 0.19, grossMargin: 0.81, pe: 26, moat: 'Network effects', edge: 'Medium' },
  { ticker: 'WDAY', score: 71, revenueGrowth: 0.17, grossMargin: 0.76, pe: 41, moat: 'Switching costs', edge: 'High' },
  { ticker: 'MSFT', score: 69, revenueGrowth: 0.16, grossMargin: 0.7, pe: 35, moat: 'Enterprise lock-in', edge: 'Medium' },
  { ticker: 'HOOD', score: 58, revenueGrowth: 0.38, grossMargin: 0.84, pe: 48, moat: 'Brand / UX', edge: 'High' },
  { ticker: 'AMD', score: 54, revenueGrowth: 0.22, grossMargin: 0.52, pe: 39, moat: 'Second source', edge: 'Medium' },
  { ticker: 'SNOW', score: 49, revenueGrowth: 0.28, grossMargin: 0.68, pe: 0, moat: 'Data gravity', edge: 'Low' },
] as const;

/** Capex sentiment extracted from hyperscaler earnings calls, by quarter. */
export const EARNINGS_LANGUAGE = [
  { quarter: 'Q1 FY25', MSFT: 0.42, GOOGL: 0.38, AMZN: 0.29, META: 0.51 },
  { quarter: 'Q2 FY25', MSFT: 0.48, GOOGL: 0.44, AMZN: 0.35, META: 0.58 },
  { quarter: 'Q3 FY25', MSFT: 0.51, GOOGL: 0.47, AMZN: 0.41, META: 0.62 },
  { quarter: 'Q4 FY25', MSFT: 0.46, GOOGL: 0.42, AMZN: 0.44, META: 0.55 },
  { quarter: 'Q1 FY26', MSFT: 0.39, GOOGL: 0.35, AMZN: 0.38, META: 0.47 },
  { quarter: 'Q2 FY26', MSFT: 0.31, GOOGL: 0.28, AMZN: 0.33, META: 0.39 },
] as const;

export const EARNINGS_COMPANIES = ['MSFT', 'GOOGL', 'AMZN', 'META'] as const;

/** Positions, as `portfolio_dashboard.py` renders them. */
export const POSITIONS = [
  { ticker: 'VWRP', role: 'Stability floor', weight: 0.45, pnl: 0.082, theoryAge: null, state: 'STEADY' },
  { ticker: 'NVDA', role: 'AI infrastructure', weight: 0.14, pnl: 0.231, theoryAge: 12, state: 'STEADY' },
  { ticker: 'WDAY', role: 'Enterprise SaaS', weight: 0.12, pnl: -0.041, theoryAge: 34, state: 'ACCUMULATING' },
  { ticker: 'GOOGL', role: 'Platform', weight: 0.11, pnl: 0.067, theoryAge: 58, state: 'STEADY' },
  { ticker: 'HOOD', role: 'Consumer fintech', weight: 0.08, pnl: -0.118, theoryAge: 91, state: 'DISTRIBUTING' },
  { ticker: 'CASH', role: 'IPO reserve', weight: 0.1, pnl: 0, theoryAge: null, state: '—' },
] as const;

/** Closed positions with their post-mortem findings. */
export const POST_MORTEMS = [
  { ticker: 'PLTR', outcome: 'loss', ret: -0.22, held: 7, cause: 'Thesis was right, timing was wrong', lesson: 'Entry discipline' },
  { ticker: 'SQ', outcome: 'loss', ret: -0.31, held: 11, cause: 'Moat eroded faster than modelled', lesson: 'Competitive triggers too loose' },
  { ticker: 'AMD', outcome: 'win', ret: 0.44, held: 14, cause: 'Second-source demand materialised', lesson: 'Demand-chain mapping worked' },
  { ticker: 'ZM', outcome: 'loss', ret: -0.52, held: 9, cause: 'Bought a reflexive peak', lesson: 'Reflexivity check skipped' },
  { ticker: 'SHOP', outcome: 'win', ret: 0.28, held: 18, cause: 'Base rate was the signal', lesson: 'Outside view held' },
  { ticker: 'NET', outcome: 'win', ret: 0.19, held: 21, cause: 'Slow compounding, no drama', lesson: 'Patience paid' },
] as const;

/** Free parameters extracted by `question_generator.py`. */
export const FREE_PARAMETERS = [
  { name: 'Net margin at scale', unit: '%', kind: 'Financial', depends: [], evppi: 0.31, asked: true },
  { name: 'Hyperscaler capex growth', unit: '% YoY', kind: 'Macro', depends: [], evppi: 0.27, asked: true },
  { name: 'Inference share by 2028', unit: '%', kind: 'Competitive', depends: ['CUDA retention'], evppi: 0.22, asked: true },
  { name: 'CUDA retention', unit: '%', kind: 'Competitive', depends: [], evppi: 0.18, asked: true },
  { name: 'Terminal multiple', unit: '×', kind: 'Valuation', depends: ['Net margin at scale'], evppi: 0.14, asked: false },
  { name: 'Gross margin floor', unit: '%', kind: 'Financial', depends: ['Net margin at scale'], evppi: 0.06, asked: false },
  { name: 'Share count drift', unit: '% YoY', kind: 'Financial', depends: [], evppi: 0.02, asked: false },
] as const;

/** Edge questions and the tickers each answer bears on. */
export const EDGE_QUESTIONS = [
  { question: 'Which AI coding tool did you actually keep paying for?', domain: 'Developer experience', maps: ['NVDA', 'MSFT', 'GOOGL'] },
  { question: 'What did your last three side projects get deployed on?', domain: 'Infrastructure', maps: ['AMZN', 'NET', 'SNOW'] },
  { question: 'Has anyone around you stopped using a tool because an AI replaced it?', domain: 'Product adoption', maps: ['ADBE', 'CRM', 'WDAY'] },
  { question: 'How many founders you know are hiring fewer juniors because of AI?', domain: 'Labour market', maps: ['WDAY', 'LNKD', 'UPWK'] },
  { question: 'What do non-technical friends now use daily that they did not a year ago?', domain: 'Consumer adoption', maps: ['GOOGL', 'META', 'AAPL'] },
  { question: 'Which subscription did you cancel most recently, and why?', domain: 'Consumer spend', maps: ['NFLX', 'SPOT', 'ADBE'] },
] as const;

/** Divergences between a human estimate and the model's, as resolved. */
export const DIVERGENCES = [
  { parameter: 'Net margin', category: 'financial_forecast', model: 70, human: 74, actual: 73, certainty: 70 },
  { parameter: 'Capex language', category: 'macro_cycle', model: 40, human: 28, actual: 38, certainty: 60 },
  { parameter: 'Gemini adoption', category: 'product_adoption', model: 55, human: 62, actual: 61, certainty: 80 },
  { parameter: 'CUDA retention', category: 'competitive_dynamics', model: 88, human: 94, actual: 91, certainty: 75 },
  { parameter: 'DOJ outcome', category: 'human_decision', model: 30, human: 45, actual: 30, certainty: 50 },
  { parameter: 'Inference share', category: 'competitive_dynamics', model: 62, human: 55, actual: 58, certainty: 65 },
  { parameter: 'Fed path', category: 'macro_cycle', model: 25, human: 40, actual: 22, certainty: 55 },
  { parameter: 'Revenue growth', category: 'financial_forecast', model: 48, human: 52, actual: 51, certainty: 70 },
] as const;

/** Pre-specified parameter rules and their current readings. */
export const MONITORED_PARAMETERS = [
  { name: 'QoQ revenue growth', current: 0.42, threshold: 0.15, direction: 'below', severity: 'MAJOR', rule: 'If below 15%, re-run the fundamental lens', status: 'ok' },
  { name: 'Gross margin', current: 0.75, threshold: 0.65, direction: 'below', severity: 'MAJOR', rule: 'If below 65%, the pricing-power claim is broken', status: 'ok' },
  { name: 'Hyperscaler capex guide', current: -0.04, threshold: -0.1, direction: 'below', severity: 'EXIT', rule: 'If guidance turns down 10%, demand thesis fails', status: 'watch' },
  { name: 'CUDA retention', current: 0.95, threshold: 0.85, direction: 'below', severity: 'EXIT', rule: 'If below 85%, the moat claim is falsified', status: 'ok' },
  { name: 'RSI(14)', current: 78, threshold: 75, direction: 'above', severity: 'MINOR', rule: 'Above 75, re-check the technical lens', status: 'triggered' },
  { name: 'Short interest', current: 0.018, threshold: 0.05, direction: 'above', severity: 'MINOR', rule: 'Above 5%, crowding risk is material', status: 'ok' },
] as const;

/** Weekly mosaic signals for one active thesis. */
export const MOSAIC_SIGNALS = [
  { stream: 'Earnings call language', reading: 'Capex tone softened two quarters running', direction: 'against', weight: 'high' },
  { stream: '13F ownership', reading: 'Two of five tracked funds trimmed', direction: 'against', weight: 'medium' },
  { stream: 'Options skew', reading: 'Put skew steepened into the print', direction: 'against', weight: 'medium' },
  { stream: 'Supply chain', reading: 'Foundry allocation unchanged', direction: 'neutral', weight: 'low' },
  { stream: 'Competitive', reading: 'No parity announcement this week', direction: 'for', weight: 'low' },
  { stream: 'Price action', reading: 'Held the 50-day on volume', direction: 'for', weight: 'low' },
] as const;
