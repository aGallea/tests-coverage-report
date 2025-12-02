import { parse } from '../../src/parsers/junit';

describe('junit parser tests - child stats', () => {
  test('Parse junit with stats on child testsuite', async () => {
    const parsed = await parse('./test/assets/junit_child_stats.xml');
    expect(parsed).toBeDefined();
    expect(parsed?.tests).toEqual(5);
    expect(parsed?.time).toEqual('0.27s'); // 0.265 rounded to 2 decimals
    expect(parsed?.skipped).toEqual(0);
    expect(parsed?.errors).toEqual(0);
    expect(parsed?.failures).toBeDefined();
    expect(parsed?.failures.count).toEqual(0);
  });
});
