/**
 * A comma-separated list, as a URL is typed by hand: `a, b,` is `a` and `b`.
 *
 * @returns The trimmed entries, without the empty ones.
 */
const parseArray = (str: string | undefined): Array<string> =>
  (str ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');

/**
 * Clamp the given number between the given range.
 *
 * @returns The clamped number; `min` for `NaN`.
 */
const clampValue = (number: number, min: number, max: number): number => {
  if (Number.isNaN(number)) {
    return min;
  }

  return Math.max(min, Math.min(number, max));
};

export { clampValue, parseArray };
