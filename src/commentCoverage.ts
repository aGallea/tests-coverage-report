import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { DiffInfo, EventInfo, Junit } from './types';

export const commentCoverage = async (
  eventInfo: EventInfo,
  body: string,
): Promise<void> => {
  const { eventName, payload } = context;
  const octokit = getOctokit(eventInfo.token);

  if (eventName === 'push') {
    await octokit.rest.repos.createCommitComment({
      repo: eventInfo.repo,
      owner: eventInfo.owner,
      commit_sha: eventInfo.commitSha,
      body,
    });
  } else if (eventName === 'pull_request') {
    if (eventInfo.overrideComment) {
      const { data: comments } = await octokit.rest.issues.listComments({
        repo: eventInfo.repo,
        owner: eventInfo.owner,
        issue_number: payload.pull_request ? payload.pull_request.number : 0,
      });

      const comment = comments.find(
        (comment) =>
          comment.user?.login === 'github-actions[bot]' &&
          comment.body?.startsWith(eventInfo.commentId),
      );

      if (comment) {
        await octokit.rest.issues.updateComment({
          repo: eventInfo.repo,
          owner: eventInfo.owner,
          comment_id: comment.id,
          body,
        });
      } else {
        await octokit.rest.issues.createComment({
          repo: eventInfo.repo,
          owner: eventInfo.owner,
          issue_number: payload.pull_request?.number || 0,
          body,
        });
      }
    } else {
      await octokit.rest.issues.createComment({
        repo: eventInfo.repo,
        owner: eventInfo.owner,
        issue_number: payload.pull_request?.number || 0,
        body,
      });
    }
  }
};

export const buildBody = (
  eventInfo: EventInfo,
  junitInfo: Junit | undefined,
  diffsInfo: DiffInfo[],
): string => {
  let body = `${eventInfo.commentId}\n`;
  body += `## ${eventInfo.commentTitle} :page_facing_up:\n`;
  body += buildTestsStatusMarkdown(junitInfo);
  body += buildJunitMarkdown(eventInfo, junitInfo);
  body += buildDiffCoverHtml(eventInfo, diffsInfo);
  return body;
};

const buildTestsStatusMarkdown = (junitInfo: Junit | undefined) => {
  if (junitInfo) {
    const markdown =
      junitInfo.failures?.count || junitInfo.errors
        ? '### Tests Failure :x:'
        : '### Tests Succees :white_check_mark:';
    return `${markdown}\n`;
  }
  return '';
};

const buildJunitMarkdown = (eventInfo: EventInfo, junitInfo: Junit | undefined) => {
  if (eventInfo.showJunit && junitInfo) {
    let markdown = `| Total Tests | Failures ${
      junitInfo.failures.count ? ':x:' : ''
    } | Errors ${junitInfo.errors ? ':x:' : ''} | Skipped ${
      junitInfo.skipped ? ':no_entry_sign:' : ''
    } | Time :hourglass_flowing_sand: |\n`;
    markdown +=
      '| ------------------ | --------------------- | ------------------- | -------------------- | ----------------- |\n';
    markdown += `| ${junitInfo.tests} | ${junitInfo.failures.count} | ${junitInfo.errors} | ${junitInfo.skipped} | ${junitInfo.time} |\n`;

    if (
      eventInfo.showFailuresInfo &&
      junitInfo.failures.count > 0 &&
      junitInfo.failures.info
    ) {
      markdown += `<details><table><summary><b>Failures Details</b>\n\n</summary><tr><th>File</th><th>Test Name</th><th>Error Message</th></tr>`;
      for (const failure of junitInfo.failures.info) {
        markdown += `<tr><td>TODO</td><td>${failure.name}</td><td>${failure.error}</td></tr>`;
      }
      markdown += '</table></details>\n';
    }
    // markdown += `\nThis is a [hover text](## "your hover text") example.`;
    return '### JUnit Details\n' + markdown + '\n';
  }
  if (eventInfo.showJunit && !junitInfo) {
    return 'No JUnit details to present\n';
  }
  return '';
};

const buildDiffCoverHtml = (eventInfo: EventInfo, diffsInfo: DiffInfo[]) => {
  if (!eventInfo.showDiffcover) {
    return '';
  } else {
    if (diffsInfo.length === 0) {
      return `### Coverage Details :ballot_box_with_check:\nNo coverage details to present`;
    } else {
      let html = `<details><table><summary><b>Diff Cover Details</b>\n\n</summary><tr><th>File</th><th colspan="2">Lines Covered</th><th>Lines</th></tr>`;
      let totalLines = 0;
      let totalMissing = 0;
      for (const diffInfo of diffsInfo) {
        if (diffInfo.changedLines.length > 0) {
          const href = `https://github.com/${eventInfo.owner}/${eventInfo.repo}/blob/${eventInfo.commitSha}/${diffInfo.file}`;
          const fileWithHref = `<a href="${href}">${diffInfo.file}</a>`;
          const lines = diffInfo.changedLines.length;
          totalLines += lines;
          const missed = diffInfo.missedLines.length;
          totalMissing += missed;
          const covered = lines - missed;
          const percentage = Math.round((covered / lines) * 100);
          const missedRanges: string[] = getMissedWithRanges(diffInfo);
          const missedRangesWithHref = missedRanges.map((missed) => {
            const range = missed
              .split('-')
              .map((val) => `L${val}`)
              .join('-');
            return `<a href="${href}#${range}">${missed}</a>`;
          });
          html += `<tr><td>${fileWithHref}</td><td>${covered}/${lines}</td><td>${percentage}%</td><td>${missedRangesWithHref}</td></tr>`;
        }
      }
      const totalCovered = totalLines - totalMissing;
      const totalPercentage = Math.round((totalCovered / totalLines) * 100);
      if (isNaN(totalPercentage)) {
        return '';
      }
      html += `<tr><td>Total</td><td>${totalCovered}/${totalLines}</td><td>${totalPercentage}%</td><td></td></tr>`;
      html += '</table></details>';
      if (
        eventInfo.failUnderCoveragePercentage &&
        totalPercentage < +eventInfo.minCoveragePercentage
      ) {
        core.setFailed('low coverage');
      }
      return (
        `### Coverage Details ${
          totalPercentage >= +eventInfo.minCoveragePercentage
            ? `(${totalPercentage}% > ${eventInfo.minCoveragePercentage}%) :white_check_mark:`
            : `(${totalPercentage}% < ${eventInfo.minCoveragePercentage}%) :x:`
        }\n\n` + html
      );
    }
  }
};

const getMissedWithRanges = (diffInfo: DiffInfo): string[] => {
  const missedRanges: string[] = [];
  let currIndex = 0;
  for (let i = 0; i < diffInfo.missedLines.length; i++) {
    if (+diffInfo.missedLines[i] + 1 === +diffInfo.missedLines[i + 1]) {
      if (missedRanges.length === currIndex) {
        missedRanges.push(`${diffInfo.missedLines[i]}-`);
      }
    } else {
      if (missedRanges.length !== currIndex) {
        missedRanges[currIndex] = missedRanges[currIndex] + diffInfo.missedLines[i];
      } else {
        missedRanges.push(diffInfo.missedLines[i]);
      }
      currIndex++;
    }
  }
  return missedRanges;
};
