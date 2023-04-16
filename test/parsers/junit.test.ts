import { parseFile } from '../../src/parsers/junit';

describe('junit parser tests', () => {
  test('No such file', async () => {
    await expect(parseFile('invalid.file')).rejects.toThrow(
      `ENOENT: no such file or directory, open 'invalid.file'`,
    );
  });
  test('Filename empty string', async () => {
    await expect(parseFile('')).resolves.toBeUndefined();
  });
  test('Invalid xml content', async () => {
    await expect(parseFile('./test/assets/invalid.xml')).rejects.toThrow(
      'invalid or missing xml content',
    );
  });
  test('error xml content', async () => {
    await expect(parseFile('./test/assets/invalidXmlContent.xml')).rejects.toThrow(
      'Non-whitespace before first tag.\nLine: 0\nColumn: 1\nChar: s',
    );
  });

  test('Parse', async () => {
    const parsed = await parseFile('./test/assets/junit.xml');
    expect(parsed).toBeDefined();
    expect(parsed?.tests).toEqual(3);
    expect(parsed?.time).toEqual('1.57s');
    expect(parsed?.skipped).toEqual(0);
    expect(parsed?.errors).toEqual(0);
    expect(parsed?.failures).toBeDefined();
    expect(parsed?.failures.count).toEqual(0);
    expect(parsed?.failures.info).toHaveLength(0);
  });
  test('Parse with failures', async () => {
    const parsed = await parseFile('./test/assets/junitWithFailures.xml');
    expect(parsed).toBeDefined();
    expect(parsed?.tests).toEqual(50);
    expect(parsed?.time).toEqual('6.18s');
    expect(parsed?.skipped).toEqual(0);
    expect(parsed?.errors).toEqual(0);
    expect(parsed?.failures).toBeDefined();
    expect(parsed?.failures.count).toEqual(2);
    expect(parsed?.failures.info).toBeDefined();
    expect(parsed?.failures.info).toHaveLength(2);
    expect(parsed?.failures.info?.[0]?.classname).toEqual(
      'junit parser tests error xml content',
    );
    expect(parsed?.failures.info?.[0]?.error).toEqual(
      'Error: expect(received).rejects.toThrow(expected)',
    );
    expect(parsed?.failures.info?.[0]?.name).toEqual(
      'junit parser tests error xml content',
    );
    expect(parsed?.failures.info?.[0]?.time).toEqual('0.04s');
    expect(parsed?.failures.info?.[1]?.classname).toEqual('junit parser tests Parse');
    expect(parsed?.failures.info?.[1]?.error).toEqual(
      'Error: expect(received).toEqual(expected) // deep equality',
    );
    expect(parsed?.failures.info?.[1]?.name).toEqual('junit parser tests Parse');
    expect(parsed?.failures.info?.[1]?.time).toEqual('0.01s');
  });
});