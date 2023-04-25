import { parse } from '../../src/parsers/junit';

describe('junit parser tests', () => {
  test('No such file', async () => {
    await expect(parse('invalid.file')).rejects.toThrow(
      `ENOENT: no such file or directory, lstat 'invalid.file'`,
    );
  });
  test('Filename empty string', async () => {
    await expect(parse('')).resolves.toBeUndefined();
  });
  test('Invalid xml content', async () => {
    await expect(parse('./test/assets/invalid.xml')).rejects.toThrow(
      'invalid or missing xml content',
    );
  });
  test('error xml content', async () => {
    await expect(parse('./test/assets/invalidXmlContent.xml')).rejects.toThrow(
      'Non-whitespace before first tag.\nLine: 0\nColumn: 1\nChar: s',
    );
  });

  test('Parse', async () => {
    const parsed = await parse('./test/assets/junit.xml');
    expect(parsed).toBeDefined();
    expect(parsed?.tests).toEqual(3);
    expect(parsed?.time).toEqual('1.57s');
    expect(parsed?.skipped).toEqual(0);
    expect(parsed?.errors).toEqual(0);
    expect(parsed?.failures).toBeDefined();
    expect(parsed?.failures.count).toEqual(0);
    expect(parsed?.failures.info).toHaveLength(0);
  });
  test('Parse V2', async () => {
    const parsed = await parse('./test/assets/junitV2.xml');
    expect(parsed).toBeDefined();
    expect(parsed?.tests).toEqual(1);
    expect(parsed?.time).toEqual('3.46s');
    expect(parsed?.skipped).toEqual(0);
    expect(parsed?.errors).toEqual(0);
    expect(parsed?.failures).toBeDefined();
    expect(parsed?.failures.count).toEqual(1);
    expect(parsed?.failures.info).toHaveLength(3);
    expect(parsed?.failures.info?.[0]?.classname).toEqual('tests.test_connector');
    expect(parsed?.failures.info?.[0]?.error).toEqual(
      `BadRequestError: BadRequestError(400, 'illegal_argument_exception', 'Wildcard expressions or all indices are not allowed')`,
    );
    expect(parsed?.failures.info?.[0]?.name).toEqual('test_deletion');
    expect(parsed?.failures.info?.[0]?.time).toEqual('0.06s');
    expect(parsed?.failures.info?.[1]?.error).toEqual(
      `BadRequestError(400, 'illegal_argument_exception')`,
    );
    expect(parsed?.failures.info?.[1]?.time).toEqual('0.05s');
    expect(parsed?.failures.info?.[2]?.error).toEqual('unknown failure');
  });
  test('Parse with failures', async () => {
    const parsed = await parse('./test/assets/junitWithFailures.xml');
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
  test('Parse folder with multiple files', async () => {
    const parsed = await parse('./test/assets/junit');
    expect(parsed).toBeDefined();
    expect(parsed?.tests).toEqual(55);
    expect(parsed?.time).toEqual('8.25s');
    expect(parsed?.skipped).toEqual(6);
    expect(parsed?.errors).toEqual(0);
    expect(parsed?.failures).toBeDefined();
    expect(parsed?.failures.count).toEqual(3);
    expect(parsed?.failures.info).toHaveLength(3);
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
    expect(parsed?.failures.info?.[2]?.classname).toEqual('com.server.ServletTest');
    expect(parsed?.failures.info?.[2]?.error).toEqual(
      'expected:<...2Response(isSuccess=[true]',
    );
    expect(parsed?.failures.info?.[2]?.name).toEqual('testListRequestWithConditions');
    expect(parsed?.failures.info?.[2]?.time).toEqual('4.13s');
  });
});
