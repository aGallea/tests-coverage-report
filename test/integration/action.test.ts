import { Act } from '@kie/act-js';
import { MockGithub } from '@kie/mock-github';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const WORKFLOW_FILENAME = 'test-workflow.yml';
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const isDockerAvailable = (): boolean => {
  try {
    execFileSync('docker', ['info'], { stdio: 'pipe', timeout: 10000 });
    return true;
  } catch {
    return false;
  }
};

const describeWithDocker = isDockerAvailable() ? describe : describe.skip;

describeWithDocker('GitHub Action E2E via act', () => {
  let mockGithub: MockGithub;

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
        workflowFile: '.github/workflows/test-workflow.yml',
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

    // No step should have an interface error (status -1)
    for (const step of result) {
      expect(step.status).not.toBe(-1);
    }

    const actionStep = result.find((step) =>
      step.name.includes('Run Coverage Report Action'),
    );
    expect(actionStep).toBeDefined();
  });
});
