import { execFile } from 'node:child_process';
import path from 'node:path';

const DIST_ENTRY = path.resolve(__dirname, '../../dist/index.js');

const runAction = (
  envOverrides: Record<string, string> = {},
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> => {
  return new Promise((resolve) => {
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      // Minimal GitHub Action env vars
      GITHUB_WORKSPACE: process.cwd(),
      GITHUB_REPOSITORY: 'test-owner/test-repo',
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_SHA: 'abc1234567890',
      GITHUB_REF: 'refs/pull/1/merge',
      GITHUB_ACTION: 'tests-coverage-report',
      GITHUB_ACTOR: 'test-user',
      GITHUB_RUN_ID: '1',
      GITHUB_RUN_NUMBER: '1',
      // Default action inputs (INPUT_ prefix, uppercased)
      'INPUT_GITHUB-TOKEN': 'fake-token-for-smoke-test',
      INPUT_TITLE: 'Tests Report',
      'INPUT_COBERTURA-PATH': './nonexistent-coverage.xml',
      'INPUT_CLOVER-PATH': './nonexistent-clover.xml',
      'INPUT_LCOV-PATH': './nonexistent-lcov.info',
      'INPUT_JACOCO-PATH': './nonexistent-jacoco.xml',
      'INPUT_JUNIT-PATH': './nonexistent-junit.xml',
      'INPUT_SHOW-JUNIT': 'false',
      'INPUT_DIFFCOVER-REF': 'cobertura',
      'INPUT_SHOW-DIFFCOVER': 'false',
      'INPUT_MIN-COVERAGE-PERCENTAGE': '80',
      'INPUT_FAIL-UNDER-COVERAGE-PERCENTAGE': 'false',
      'INPUT_SHOW-FAILURES-INFO': 'false',
      'INPUT_OVERRIDE-COMMENT': 'true',
      ...envOverrides,
    };

    const child = execFile(
      process.execPath,
      [DIST_ENTRY],
      { env, timeout: 30000 },
      (error, stdout, stderr) => {
        resolve({
          exitCode:
            error?.code !== undefined
              ? typeof error.code === 'number'
                ? error.code
                : 1
              : child.exitCode,
          stdout,
          stderr,
        });
      },
    );
  });
};

describe('Smoke Test: dist/index.js', () => {
  test('dist/index.js exists and is loadable', () => {
    expect(() => require.resolve(DIST_ENTRY)).not.toThrow();
  });

  test('action runs without uncaught exception (no coverage files)', async () => {
    const result = await runAction();
    // The action may "fail" via core.setFailed (exit code 1) because there is
    // no real GitHub API to talk to, but that is expected graceful failure.
    // What we check is that it does NOT exit with an unhandled exception.
    expect(result.stderr).not.toContain('SyntaxError');
    expect(result.stderr).not.toContain('ReferenceError');
    expect(result.stderr).not.toContain('TypeError');
    expect(result.stderr).not.toContain('Cannot find module');
  });

  test('action does not crash when show-diffcover is disabled', async () => {
    const result = await runAction({
      'INPUT_SHOW-DIFFCOVER': 'false',
      'INPUT_SHOW-JUNIT': 'false',
    });
    expect(result.stderr).not.toContain('SyntaxError');
    expect(result.stderr).not.toContain('ReferenceError');
    expect(result.stderr).not.toContain('Cannot find module');
  });
});
