/**
 * Black-Litterman allocation.
 *
 * Port of `tfg_core/portfolio.py`. The covariance matrix is an *argument*, never
 * fetched here — price data is an adapter concern, and keeping it out is what
 * makes this testable.
 *
 * Per `sizing/SKILL.md` this is the allocator, not one candidate among several.
 * Kelly gates entry and cluster caps constrain the output, but the weight itself
 * comes from here.
 */

import { diag, dot, identity, invert, matAdd, matMul, matVec, transpose } from './numeric.js';

/** Weight on the prior in the BL posterior. Standard practice is 0.025-0.05. */
export const DEFAULT_TAU = 0.05;

/** Risk-aversion coefficient. `theory/regime-detection.md` raises it when cautious. */
export const DEFAULT_RISK_AVERSION = 2.5;

/** Floor on any view's variance, so full confidence cannot produce a singular omega. */
export const MIN_VIEW_VARIANCE = 1e-4;

/** Equilibrium, blended returns, and the weights they imply. */
export type BlackLittermanResult = {
  readonly tickers: readonly string[];
  readonly market_weights: Readonly<Record<string, number>>;
  readonly equilibrium_returns: Readonly<Record<string, number>>;
  readonly bl_returns: Readonly<Record<string, number>>;
  readonly bl_weights: Readonly<Record<string, number>>;
  readonly risk_contribution: Readonly<Record<string, number>>;
  readonly portfolio_vol: number;
  readonly views_used: Readonly<Record<string, number>>;
  readonly confidences_used: Readonly<Record<string, number>>;
};

/** Round to a fixed number of decimals the way Python's `round` does. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function zip(tickers: readonly string[], values: readonly number[]): Record<string, number> {
  const out: Record<string, number> = {};
  tickers.forEach((t, i) => { out[t] = values[i]!; });
  return out;
}

/**
 * Reverse-optimise the returns implied by holding the market portfolio.
 *
 * This is the prior: what the market must believe for current cap weights to be
 * optimal. Starting anywhere else smuggles in a view before stating one.
 */
export function equilibriumReturns(
  sigma: readonly (readonly number[])[],
  marketWeights: readonly number[],
  riskAversion: number,
): number[] {
  return matVec(sigma, marketWeights).map((v) => riskAversion * v);
}

export type BlackLittermanArgs = {
  readonly tickers: readonly string[];
  readonly market_caps: readonly number[];
  readonly views: readonly number[];
  readonly confidences: readonly number[];
  readonly sigma: readonly (readonly number[])[];
  readonly risk_aversion?: number;
  readonly tau?: number;
};

/**
 * Blend equilibrium returns with absolute views on each asset.
 *
 * `views` are expected returns in percent. `confidences` are 0-100; higher
 * confidence shrinks that view's variance in omega, so the posterior leans
 * further from equilibrium toward the view.
 *
 * Weights are long-only and normalised. If every weight is non-positive the
 * market portfolio is returned: a long-only optimiser with no admissible solution
 * should fall back to the prior rather than fail.
 */
export function blackLitterman(args: BlackLittermanArgs): BlackLittermanResult {
  const {
    tickers, market_caps, views, confidences, sigma,
    risk_aversion = DEFAULT_RISK_AVERSION, tau = DEFAULT_TAU,
  } = args;

  const n = tickers.length;
  const totalCap = market_caps.reduce((sum, c) => sum + c, 0);
  const wMkt = market_caps.map((c) => c / totalCap);

  const pi = equilibriumReturns(sigma, wMkt, risk_aversion);

  // Absolute views on every asset, so the pick matrix is the identity.
  const P = identity(n);
  const Q = views.map((v) => v / 100);

  const omegaDiag = confidences.map((conf, i) =>
    Math.max(MIN_VIEW_VARIANCE, (1 - conf / 100) * tau * sigma[i]![i]!),
  );
  const omega = diag(omegaDiag);

  const tauSigma = sigma.map((row) => row.map((v) => tau * v));
  const tauSigmaInv = invert(tauSigma);
  const omegaInv = invert(omega);

  // E[R] = [(tau*S)^-1 + P' * omega^-1 * P]^-1 * [(tau*S)^-1 * pi + P' * omega^-1 * Q]
  const Pt = transpose(P);
  const PtOmegaInv = matMul(Pt, omegaInv);
  const M = invert(matAdd(tauSigmaInv, matMul(PtOmegaInv, P)));
  const blendedEvidence = matVec(tauSigmaInv, pi).map(
    (v, i) => v + matVec(PtOmegaInv, Q)[i]!,
  );
  const blReturns = matVec(M, blendedEvidence);

  const scaledSigma = sigma.map((row) => row.map((v) => risk_aversion * v));
  let wBl = matVec(invert(scaledSigma), blReturns).map((w) => Math.max(w, 0));
  const wSum = wBl.reduce((sum, w) => sum + w, 0);
  wBl = wSum > 0 ? wBl.map((w) => w / wSum) : wMkt;

  const portVol = Math.sqrt(dot(wBl, matVec(sigma, wBl))) * 100;
  const marginalRisk = matVec(sigma, wBl);
  const riskContrib = wBl.map((w, i) => w * marginalRisk[i]!);
  const contribSum = riskContrib.reduce((sum, rc) => sum + rc, 0);
  const riskContribPct =
    contribSum > 0 ? riskContrib.map((rc) => (rc / contribSum) * 100) : wBl.map(() => 0);

  return {
    tickers,
    market_weights: zip(tickers, wMkt.map((w) => round(w, 4))),
    equilibrium_returns: zip(tickers, pi.map((r) => round(r * 100, 2))),
    bl_returns: zip(tickers, blReturns.map((r) => round(r * 100, 2))),
    bl_weights: zip(tickers, wBl.map((w) => round(w, 4))),
    risk_contribution: zip(tickers, riskContribPct.map((rc) => round(rc, 1))),
    portfolio_vol: round(portVol, 1),
    views_used: zip(tickers, views),
    confidences_used: zip(tickers, confidences),
  };
}
