/**
 * Hypergeometric helpers used for in-game coaching, e.g. "what are my odds of
 * drawing a land / a specific card in the next N draws?".
 */

function logFactorial(n: number): number {
  let acc = 0;
  for (let i = 2; i <= n; i++) acc += Math.log(i);
  return acc;
}

function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

/**
 * Probability of drawing exactly `hits` successes when drawing `draws` cards
 * from a `population` that contains `successes` successes.
 */
export function hypergeometricPmf(
  population: number,
  successes: number,
  draws: number,
  hits: number
): number {
  if (hits > successes || hits > draws) return 0;
  const logP =
    logChoose(successes, hits) +
    logChoose(population - successes, draws - hits) -
    logChoose(population, draws);
  return Math.exp(logP);
}

/** Probability of drawing at least one success in `draws` cards. */
export function atLeastOne(population: number, successes: number, draws: number): number {
  if (successes <= 0 || draws <= 0 || population <= 0) return 0;
  return 1 - hypergeometricPmf(population, successes, draws, 0);
}
