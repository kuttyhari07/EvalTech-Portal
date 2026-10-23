/**
 * Normalizes output by handling line-ending differences (CRLF vs LF),
 * trailing whitespaces on lines, and trailing blank lines without
 * destroying internal indentation or significant whitespace.
 */
export function normalizeOutput(text: string | null | undefined): string {
  if (text === null || text === undefined) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

export interface OutputComparisonOptions {
  numericTolerance?: number;
}

/**
 * Compares actual program output with expected test case output.
 */
export function compareOutputs(
  actual: string,
  expected: string,
  options?: OutputComparisonOptions
): boolean {
  const normActual = normalizeOutput(actual);
  const normExpected = normalizeOutput(expected);

  if (normActual === normExpected) {
    return true;
  }

  // If numeric tolerance is specified, check if both are numeric sequences
  if (options?.numericTolerance !== undefined && options.numericTolerance > 0) {
    const actualTokens = normActual.split(/\s+/).filter(Boolean);
    const expectedTokens = normExpected.split(/\s+/).filter(Boolean);

    if (actualTokens.length !== expectedTokens.length) {
      return false;
    }

    const tol = options.numericTolerance;
    for (let i = 0; i < actualTokens.length; i++) {
      const aNum = parseFloat(actualTokens[i]);
      const eNum = parseFloat(expectedTokens[i]);

      if (isNaN(aNum) || isNaN(eNum)) {
        if (actualTokens[i] !== expectedTokens[i]) return false;
      } else {
        if (Math.abs(aNum - eNum) > tol) {
          return false;
        }
      }
    }
    return true;
  }

  return false;
}
