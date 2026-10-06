/**
 * Cross-language parity: every algorithm against the shared golden vectors.
 *
 * The Python suite reads these same files. A fixture change that breaks one
 * language breaks both, which is the entire point of keeping them outside both
 * packages.
 */

import { describe, expect, test } from 'vitest';

import { assertClose, cases, loadFixture } from './fixtures.js';
import {
  bayes, calibration, ev, fmea, fundamentals, information, intuition, kelly,
  options, portfolio, prereg, reliability, sensitivity,
} from '../src/index.js';

describe('bayes.runChain', () => {
  test.each(cases('bayes_chain'))('%s', (name, input, expected, tol) => {
    const result = bayes.runChain(
      input['prior_mean'] as number,
      input['prior_std'] as number,
      input['updates'] as bayes.Update[],
      input['apply_bias_correction'] as boolean,
    );
    assertClose(
      {
        chain: result.chain,
        posterior: {
          mean: result.posterior.mean,
          std_raw: result.posterior.std_raw,
          std_corrected: result.posterior.std_corrected,
          ci_68: result.posterior.ci_68,
          ci_95: result.posterior.ci_95,
        },
        crosses_50: bayes.crosses(result.posterior, 0.5),
      },
      expected,
      tol,
      name,
    );
  });
});

describe('bayes primitives', () => {
  test.each(cases('bayes_primitives'))('%s', (name, input, expected, tol) => {
    const fn = input['fn'] as string;
    const actual =
      fn === 'update'
        ? bayes.update(input['prior'] as number, input['lr'] as number)
        : fn === 'dampen_lr'
          ? bayes.dampenLr(input['raw_lr'] as number, input['quality'] as number)
          : bayes.evidenceQuality(
              input['source_tier'] as number,
              input['days_old'] as number,
              input['sample_n'] as number,
              input['is_primary'] as boolean,
            );
    assertClose(actual, expected, tol, name);
  });
});

describe('ev.deterministicEv', () => {
  test.each(cases('ev_deterministic'))('%s', (name, input, expected, tol) => {
    assertClose(ev.deterministicEv(input as never), expected, tol, name);
  });
});

describe('sensitivity.runSensitivity', () => {
  test.each(cases('sensitivity'))('%s', (name, input, expected, tol) => {
    assertClose(sensitivity.runSensitivity(input as never), expected, tol, name);
  });
});

describe('options.scenarioProbabilities', () => {
  test.each(cases('options'))('%s', (name, input, expected, tol) => {
    const result = options.scenarioProbabilities(input as never);
    assertClose(
      {
        scenarios: result.scenarios,
        ev: result.ev,
        probability_sum: result.scenarios.reduce((s, x) => s + x.probability, 0),
      },
      expected,
      tol,
      name,
    );
  });
});

describe('portfolio.blackLitterman', () => {
  test.each(cases('portfolio'))('%s', (name, input, expected, tol) => {
    assertClose(portfolio.blackLitterman(input as never), expected, tol, name);
  });
});

describe('fundamentals.computeFscore', () => {
  test.each(cases('fundamentals'))('%s', (name, input, expected, tol) => {
    assertClose(fundamentals.computeFscore(input as never), expected, tol, name);
  });
});

describe('calibration.scoreCalibration', () => {
  test.each(cases('calibration'))('%s', (name, input, expected, tol) => {
    const report = calibration.scoreCalibration(input['forecasts'] as calibration.Forecast[]);
    assertClose(
      {
        n_resolved: report.n_resolved,
        mean_brier: report.mean_brier,
        verdict: report.verdict,
        sufficient_data: report.sufficient_data,
        overconfident: report.overconfident,
        buckets: report.buckets,
      },
      expected,
      tol,
      name,
    );
  });
});

describe('intuition', () => {
  test.each(cases('intuition'))('%s', (name, input, expected, tol) => {
    const divergence: intuition.Divergence = {
      parameter: input['parameter'] as string,
      model_recommendation: input['model_recommendation'] as number,
      human_answer: input['human_answer'] as number,
      certainty: input['certainty'] as number,
    };
    const resolution = intuition.resolve(divergence, input['actual'] as number);
    assertClose(
      {
        category: intuition.categorize(divergence.parameter),
        divergence: intuition.divergenceOf(divergence),
        ...resolution,
      },
      expected,
      tol,
      name,
    );
  });
});

describe('prereg.compare', () => {
  test.each(cases('prereg'))('%s', (name, input, expected, tol) => {
    assertClose(
      prereg.compare(
        input['expected_posterior'] as number,
        input['actual_posterior'] as number,
        input['expected_direction'] as string,
      ),
      expected,
      tol,
      name,
    );
  });
});

describe('kelly.evaluate', () => {
  test.each(cases('kelly'))('%s', (name, input, expected, tol) => {
    const result = kelly.evaluate(
      input['probability'] as number,
      input['upside'] as number,
      input['downside'] as number,
    );
    assertClose({ ...result, passes: kelly.passes(result) }, expected, tol, name);
  });
});

describe('kelly helpers', () => {
  test.each(cases('kelly_breakeven'))('%s', (name, input, expected, tol) => {
    const actual =
      input['fn'] === 'breakeven_probability'
        ? kelly.breakevenProbability(input['win_loss_ratio'] as number)
        : kelly.growthRate(
            input['probability'] as number,
            input['win_loss_ratio'] as number,
            input['fraction'] as number,
          );
    assertClose(actual, expected, tol, name);
  });
});

describe('reliability.evaluateLens', () => {
  test.each(cases('reliability_ppv'))('%s', (name, input, expected, tol) => {
    const values = reliability.evaluateLens(
      input['lens'] as string,
      input['base_rate'] as number,
    );
    assertClose({ ...values, ppv_lift: reliability.ppvLift(values) }, expected, tol, name);
  });
});

describe('reliability.weightedTally', () => {
  test.each(cases('reliability_tally'))('%s', (name, input, expected, tol) => {
    assertClose(
      reliability.weightedTally(input['verdicts'] as Record<string, string>),
      expected,
      tol,
      name,
    );
  });
});

describe('information.score', () => {
  test.each(cases('information'))('%s', (name, input, expected, tol) => {
    const nHyp = input['n_hypotheses'] as number;
    const nCon = input['n_consistent'] as number;
    assertClose(information.score(`${nCon} of ${nHyp}`, nHyp, nCon), expected, tol, name);
  });
});

describe('information entropy', () => {
  test.each(cases('information_entropy'))('%s', (name, input, expected, tol) => {
    const actual =
      input['fn'] === 'entropy'
        ? information.entropy(input['probabilities'] as number[])
        : information.entropyReduction(
            input['prior'] as number[],
            input['posterior'] as number[],
          );
    assertClose(actual, expected, tol, name);
  });
});

describe('fmea.rank', () => {
  test.each(cases('fmea_rpn'))('%s', (name, input, expected, tol) => {
    assertClose(fmea.rank(input['triggers'] as fmea.Trigger[]), expected, tol, name);
  });
});

describe('fmea.auditIndependence', () => {
  test.each(cases('fmea_independence'))('%s', (name, input, expected, tol) => {
    assertClose(
      fmea.auditIndependence(input['triggers'] as fmea.Trigger[]),
      expected,
      tol,
      name,
    );
  });
});

describe('ev.monteCarlo', () => {
  const fixture = loadFixture('ev_monte_carlo');

  test('the fixture declares statistical rather than exact agreement', () => {
    expect(fixture.agreement).toBe('statistical');
  });

  test.each(cases('ev_monte_carlo'))(
    'agrees distributionally with NumPy: %s',
    (name, input, expected, tol) => {
      const result = ev.monteCarlo(input as never);
      const e = expected as Record<string, number> & { percentiles: Record<string, number> };

      // A different RNG stream cannot reproduce NumPy's draws, so this checks the
      // distribution's shape rather than its values. The tolerance comes from the
      // fixture, and is wide by design.
      assertClose(result.ev_mean, e['ev_mean'], tol, `${name}.ev_mean`);
      assertClose(result.ev_median, e['ev_median'], tol, `${name}.ev_median`);
      assertClose(result.ev_std, e['ev_std'], tol, `${name}.ev_std`);
      assertClose(result.p_positive, e['p_positive'], tol, `${name}.p_positive`);
      assertClose(result.p_negative, e['p_negative'], tol, `${name}.p_negative`);
      for (const key of ['p5', 'p25', 'p50', 'p75', 'p95'] as const) {
        assertClose(
          result.percentiles[key],
          e.percentiles[key],
          tol,
          `${name}.percentiles.${key}`,
        );
      }
    },
  );
});
