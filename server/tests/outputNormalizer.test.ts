import { normalizeOutput, compareOutputs } from '../src/services/compiler/outputNormalizer';

describe('OutputNormalizer & Comparison Utility', () => {
  test('normalizes Windows CRLF and Unix LF line endings', () => {
    const windowsStr = 'Line 1\r\nLine 2\r\nLine 3';
    const unixStr = 'Line 1\nLine 2\nLine 3';

    expect(normalizeOutput(windowsStr)).toBe(normalizeOutput(unixStr));
    expect(compareOutputs(windowsStr, unixStr)).toBe(true);
  });

  test('trims trailing whitespaces per line without losing indentation', () => {
    const actual = '  def solve():    \n    return 42   ';
    const expected = '  def solve():\n    return 42';

    expect(compareOutputs(actual, expected)).toBe(true);
  });

  test('correctly identifies mismatched outputs', () => {
    expect(compareOutputs('Hello World', 'Hello EvalTech')).toBe(false);
    expect(compareOutputs('42\n', '43\n')).toBe(false);
  });

  test('supports numeric tolerance when enabled', () => {
    const actual = '3.14159';
    const expected = '3.14160';

    // Within tolerance 0.001
    expect(compareOutputs(actual, expected, { numericTolerance: 0.001 })).toBe(true);
    // Exceeds tolerance 0.000001
    expect(compareOutputs(actual, expected, { numericTolerance: 0.000001 })).toBe(false);
  });
});
