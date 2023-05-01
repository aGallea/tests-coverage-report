import { spyActions } from './actions.spy';
import * as github from '@actions/github';
import { DiffInfo, EventInfo, Junit } from '../src/types';
import { getEventInfo } from '../src/eventInfo';
import { buildBody, commentCoverage } from '../src/commentCoverage';
import * as core from '@actions/core';

const originalContext = { ...github.context };

describe('commentCoverage tests', () => {
  afterAll(() => {
    github.context.ref = originalContext.ref;
    github.context.sha = originalContext.sha;
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  describe('commentCoverage tests', () => {
    let eventInfo: EventInfo;
    const spyCreateCommitComment = jest.fn();
    const spyListComments = jest.fn().mockImplementation(() => ({
      data: [],
    }));
    const spyUpdateComment = jest.fn();
    const spyCreateComment = jest.fn();

    beforeAll(() => {
      spyActions();
      jest.spyOn(github, 'getOctokit').mockImplementation(
        () =>
          ({
            rest: {
              repos: {
                createCommitComment: spyCreateCommitComment,
              },
              issues: {
                listComments: spyListComments,
                updateComment: spyUpdateComment,
                createComment: spyCreateComment,
              },
            },
          } as any),
      );
    });
    beforeEach(() => {
      eventInfo = getEventInfo();
    });

    test('createCommitComment with push event', async () => {
      github.context.eventName = 'push';
      await commentCoverage(eventInfo, 'some-body-content-1');
      expect(spyCreateCommitComment).toBeCalledWith({
        body: 'some-body-content-1',
        commit_sha: 'abcdefghijklmnopqrstuvwxyz',
        owner: 'some-owner',
        repo: 'some-repo',
      });
    });
    test('createComment with pull_request event', async () => {
      github.context.eventName = 'pull_request';
      await commentCoverage(eventInfo, 'some-body-content-2');
      expect(spyCreateComment).toBeCalledWith({
        body: 'some-body-content-2',
        issue_number: 1,
        owner: 'some-owner',
        repo: 'some-repo',
      });
    });
    test('createComment with pull_request event and overrideComment', async () => {
      github.context.eventName = 'pull_request';
      eventInfo.overrideComment = true;
      await commentCoverage(eventInfo, 'some-body-content-3');
      expect(spyListComments).toBeCalledWith({
        repo: 'some-repo',
        owner: 'some-owner',
        issue_number: 1,
      });
      expect(spyCreateComment).toBeCalledWith({
        body: 'some-body-content-3',
        issue_number: 1,
        owner: 'some-owner',
        repo: 'some-repo',
      });
    });
    test('updateComment with pull_request event and overrideComment', async () => {
      github.context.eventName = 'pull_request';
      eventInfo.overrideComment = true;
      const spyListCommentsWithContent = jest.fn().mockImplementation(() => ({
        data: [
          {
            user: {
              login: 'github-actions[bot]',
            },
            body: '',
            id: 50,
          },
          {
            user: {
              login: 'github-actions[bot]',
            },
            body: '<!-- tests-coverage-report -->foobar',
            id: 51,
          },
        ],
      }));
      jest.spyOn(github, 'getOctokit').mockImplementation(
        () =>
          ({
            rest: {
              issues: {
                listComments: spyListCommentsWithContent,
                updateComment: spyUpdateComment,
                createComment: spyCreateComment,
              },
            },
          } as any),
      );
      await commentCoverage(eventInfo, 'some-body-content-4');
      expect(spyListCommentsWithContent).toBeCalledWith({
        repo: 'some-repo',
        owner: 'some-owner',
        issue_number: 1,
      });
      expect(spyUpdateComment).toBeCalledWith({
        body: 'some-body-content-4',
        comment_id: 51,
        owner: 'some-owner',
        repo: 'some-repo',
      });
    });
  });

  describe('buildBody tests', () => {
    let eventInfo: EventInfo;
    let junitInfo: Junit;
    let diffsInfo: DiffInfo[];

    beforeAll(() => {
      spyActions();
    });

    beforeEach(() => {
      eventInfo = getEventInfo();
      junitInfo = {
        tests: 51,
        failures: {
          count: 0,
          info: undefined,
        },
        errors: 0,
        skipped: 0,
        time: '12s',
      };
      diffsInfo = [
        {
          file: '1.file',
          changedLines: ['1', '2', '3', '4', '5', '6'],
          missedLines: ['2', '5'],
        },
      ];
    });

    test('dont show junit and diffCover content', async () => {
      expect(buildBody(eventInfo, junitInfo, [])).toEqual(
        '<!-- tests-coverage-report -->\n## Tests Report Mock :page_facing_up:\n### Tests Succees :white_check_mark:\n',
      );
    });
    test('show only junit content, without junit info', async () => {
      eventInfo.showJunit = true;
      expect(buildBody(eventInfo, undefined, [])).toEqual(
        '<!-- tests-coverage-report -->\n## Tests Report Mock :page_facing_up:\nNo JUnit details to present\n',
      );
    });
    test('show only junit content', async () => {
      eventInfo.showJunit = true;
      expect(buildBody(eventInfo, junitInfo, [])).toEqual(
        '<!-- tests-coverage-report -->\n## Tests Report Mock :page_facing_up:\n### Tests Succees :white_check_mark:\n### JUnit Details\n| Total Tests | Failures  | Errors  | Skipped  | Time :hourglass_flowing_sand: |\n| ------------------ | --------------------- | ------------------- | -------------------- | ----------------- |\n| 51 | 0 | 0 | 0 | 12s |\n\n',
      );
    });
    test('show junit content, with failures info', async () => {
      eventInfo.showJunit = true;
      eventInfo.showFailuresInfo = true;
      junitInfo.failures = {
        count: 1,
        info: [
          {
            classname: 'my-class-name',
            name: 'test name',
            time: '-1',
            error: 'error message',
          },
        ],
      };
      expect(buildBody(eventInfo, junitInfo, [])).toEqual(
        '<!-- tests-coverage-report -->\n## Tests Report Mock :page_facing_up:\n### Tests Failure :x:\n### JUnit Details\n| Total Tests | Failures :x: | Errors  | Skipped  | Time :hourglass_flowing_sand: |\n| ------------------ | --------------------- | ------------------- | -------------------- | ----------------- |\n| 51 | 1 | 0 | 0 | 12s |\n<details><table><summary><b>Failures Details</b>\n\n</summary><tr><th>File</th><th>Test Name</th><th>Error Message</th></tr><tr><td>TODO</td><td>test name</td><td>error message</td></tr></table></details>\n\n',
      );
    });
    test('show only diffCover content, without diff info', async () => {
      eventInfo.showDiffcover = true;
      expect(buildBody(eventInfo, junitInfo, [])).toEqual(
        '<!-- tests-coverage-report -->\n## Tests Report Mock :page_facing_up:\n### Tests Succees :white_check_mark:\n### Coverage Details :ballot_box_with_check:\nNo coverage details to present',
      );
    });
    test('show only diffCover content', async () => {
      eventInfo.showDiffcover = true;
      expect(buildBody(eventInfo, junitInfo, diffsInfo)).toEqual(
        '<!-- tests-coverage-report -->\n## Tests Report Mock :page_facing_up:\n### Tests Succees :white_check_mark:\n### Coverage Details (67% < 80%) :x:\n\n<details><table><summary><b>Diff Cover Details</b>\n\n</summary><tr><th>File</th><th colspan="2">Covered Lines</th><th>Missing Lines</th></tr><tr><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file">1.file</a></td><td>4/6</td><td>67%</td><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file#L2">2</a>,<a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file#L5">5</a></td></tr><tr><td>Total</td><td>4/6</td><td>67%</td><td></td></tr></table></details>',
      );
    });
    test('diffCover content with full coverage', async () => {
      eventInfo.showDiffcover = true;
      diffsInfo.pop();
      diffsInfo.push({
        file: '1.file',
        changedLines: ['1', '2', '3', '4', '5', '6'],
        missedLines: [],
      });
      expect(buildBody(eventInfo, junitInfo, diffsInfo)).toEqual(
        '<!-- tests-coverage-report -->\n## Tests Report Mock :page_facing_up:\n### Tests Succees :white_check_mark:\n### Coverage Details (100% >= 80%) :white_check_mark:\n\n<details><table><summary><b>Diff Cover Details</b>\n\n</summary><tr><th>File</th><th colspan="2">Covered Lines</th><th>Missing Lines</th></tr><tr><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file">1.file</a></td><td>6/6</td><td>100%</td><td></td></tr><tr><td>Total</td><td>6/6</td><td>100%</td><td></td></tr></table></details>',
      );
    });
    test('diffCover content with no changes', async () => {
      eventInfo.showDiffcover = true;
      diffsInfo.pop();
      diffsInfo.push({
        file: '1.file',
        changedLines: [],
        missedLines: [],
      });
      expect(buildBody(eventInfo, junitInfo, diffsInfo)).toEqual(
        '<!-- tests-coverage-report -->\n## Tests Report Mock :page_facing_up:\n### Tests Succees :white_check_mark:\n',
      );
    });
    test('diffCover content with missed range', async () => {
      eventInfo.showDiffcover = true;
      diffsInfo.push({
        file: '2.file',
        changedLines: ['1', '2', '3', '4', '5', '6'],
        missedLines: ['1', '2', '3', '5'],
      });
      expect(buildBody(eventInfo, junitInfo, diffsInfo)).toEqual(
        '<!-- tests-coverage-report -->\n## Tests Report Mock :page_facing_up:\n### Tests Succees :white_check_mark:\n### Coverage Details (50% < 80%) :x:\n\n<details><table><summary><b>Diff Cover Details</b>\n\n</summary><tr><th>File</th><th colspan="2">Covered Lines</th><th>Missing Lines</th></tr><tr><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file">1.file</a></td><td>4/6</td><td>67%</td><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file#L2">2</a>,<a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file#L5">5</a></td></tr><tr><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/2.file">2.file</a></td><td>2/6</td><td>33%</td><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/2.file#L1-L3">1-3</a>,<a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/2.file#L5">5</a></td></tr><tr><td>Total</td><td>6/12</td><td>50%</td><td></td></tr></table></details>',
      );
    });
    test('diffCover content with full coverage', async () => {
      eventInfo.showDiffcover = true;
      eventInfo.minCoveragePercentage = '100';
      diffsInfo.pop();
      diffsInfo.push({
        file: '1.file',
        changedLines: ['1', '2', '3', '4', '5', '6'],
        missedLines: [],
      });
      expect(buildBody(eventInfo, junitInfo, diffsInfo)).toEqual(
        '<!-- tests-coverage-report -->\n## Tests Report Mock :page_facing_up:\n### Tests Succees :white_check_mark:\n### Coverage Details (100% >= 100%) :white_check_mark:\n\n<details><table><summary><b>Diff Cover Details</b>\n\n</summary><tr><th>File</th><th colspan="2">Covered Lines</th><th>Missing Lines</th></tr><tr><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file">1.file</a></td><td>6/6</td><td>100%</td><td></td></tr><tr><td>Total</td><td>6/6</td><td>100%</td><td></td></tr></table></details>',
      );
    });
    test('diffCover content with missed range and failUnder', async () => {
      eventInfo.showDiffcover = true;
      eventInfo.failUnderCoveragePercentage = false;
      diffsInfo.push({
        file: '2.file',
        changedLines: ['1', '2', '3', '4', '5', '6'],
        missedLines: ['1', '2', '3', '5'],
      });
      const coreSetFailedSpy = jest.spyOn(core, 'setFailed');
      expect(buildBody(eventInfo, junitInfo, diffsInfo)).toEqual(
        '<!-- tests-coverage-report -->\n## Tests Report Mock :page_facing_up:\n### Tests Succees :white_check_mark:\n### Coverage Details (50% < 80%) :x:\n\n<details><table><summary><b>Diff Cover Details</b>\n\n</summary><tr><th>File</th><th colspan="2">Covered Lines</th><th>Missing Lines</th></tr><tr><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file">1.file</a></td><td>4/6</td><td>67%</td><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file#L2">2</a>,<a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file#L5">5</a></td></tr><tr><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/2.file">2.file</a></td><td>2/6</td><td>33%</td><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/2.file#L1-L3">1-3</a>,<a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/2.file#L5">5</a></td></tr><tr><td>Total</td><td>6/12</td><td>50%</td><td></td></tr></table></details>',
      );
      expect(coreSetFailedSpy).not.toHaveBeenCalled();
      eventInfo.failUnderCoveragePercentage = true;
      expect(buildBody(eventInfo, junitInfo, diffsInfo)).toEqual(
        '<!-- tests-coverage-report -->\n## Tests Report Mock :page_facing_up:\n### Tests Succees :white_check_mark:\n### Coverage Details (50% < 80%) :x:\n\n<details><table><summary><b>Diff Cover Details</b>\n\n</summary><tr><th>File</th><th colspan="2">Covered Lines</th><th>Missing Lines</th></tr><tr><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file">1.file</a></td><td>4/6</td><td>67%</td><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file#L2">2</a>,<a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/1.file#L5">5</a></td></tr><tr><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/2.file">2.file</a></td><td>2/6</td><td>33%</td><td><a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/2.file#L1-L3">1-3</a>,<a href="https://github.com/some-owner/some-repo/blob/abcdefghijklmnopqrstuvwxyz/2.file#L5">5</a></td></tr><tr><td>Total</td><td>6/12</td><td>50%</td><td></td></tr></table></details>',
      );
      expect(coreSetFailedSpy).toHaveBeenCalledWith('low coverage');
    });
  });
});
