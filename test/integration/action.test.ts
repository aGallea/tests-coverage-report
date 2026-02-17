import path from 'node:path';
import { Act } from '@kie/act-js';
import { MockGithub } from '@kie/mock-github';

/**
 * E2E test using @kie/act-js to run the GitHub Action inside a Docker container
 * via nektos/act.
 *
 * Prerequisites (all required, otherwise the suite is skipped):
 *   1. Docker Desktop running and accessible
 *   2. Docker socket access allowed for ghcr.io/catthehacker/ubuntu:act-latest
 *      (Docker Desktop > Settings > Enhanced Container Isolation > allowed images)
 *   3. `act` CLI installed (brew install act) — version >= 0.2.80 recommended
 *
 * Run manually: npx jest --config jest.integration.config.ts --testPathPattern='action'
 */

const WORKFLOW_FILENAME = 'test-workflow.yml';
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const PROJECT_ROOT = path.resolve(__dirname, '../../');

// Always skip by default — this test requires Docker with specific image
// allowlisting and act CLI >= 0.2.80. Remove `.skip` to run manually when
// all prerequisites are met.
const describeWithDocker = describe.skip;

describeWithDocker('GitHub Action E2E via act', () => {
  let mockGithub: InstanceType<typeof MockGithub>;

  beforeEach(async () => {
    mockGithub = new MockGithub({
      repo: {
        'test-repo': {
          files: [
            {
              src: PROJECT_ROOT,
              dest: '.',
              filter: ['node_modules', '.git', '.github', 'coverage'],
            },
            {
              src: path.join(FIXTURES_DIR, WORKFLOW_FILENAME),
              dest: `.github/workflows/${WORKFLOW_FILENAME}`,
            },
          ],
        },
      },
    });
    await mockGithub.setup();
  });

  afterEach(async () => {
    await mockGithub.teardown();
  });

  test('action runs in act container without interface errors', async () => {
    const repoPath = mockGithub.repo.getPath('test-repo');
    if (!repoPath) {
      throw new Error('Mock repo path not found');
    }

    const act = new Act(repoPath);
    const result = await act
      .setInput('github-token', 'fake-token')
      .setInput('title', 'E2E Test Report')
      .setInput('cobertura-path', './test/assets/cobertura-coverage.xml')
      .setInput('show-junit', 'false')
      .setInput('show-diffcover', 'false')
      .setInput('min-coverage-percentage', '0')
      .setInput('fail-under-coverage-percentage', 'false')
      .setInput('override-comment', 'false')
      .setEvent({
        pull_request: {
          number: 1,
          head: { sha: 'abc123', ref: 'test-branch' },
          base: { ref: 'main' },
        },
      })
      .runEvent('pull_request', {
        workflowFile: `.github/workflows/${WORKFLOW_FILENAME}`,
        mockSteps: {
          'test-action': [
            {
              uses: 'actions/checkout@v4',
              mockWith: 'echo "checkout skipped"',
            },
          ],
        },
      });

    expect(result.length).toBeGreaterThan(0);

    for (const step of result) {
      expect(step.status).not.toBe(-1);
    }

    const actionStep = result.find(
      (step) =>
        step.name.includes('Coverage Report Action') ||
        step.name.includes('Run Coverage Report'),
    );
    expect(actionStep).toBeDefined();
  });
});
