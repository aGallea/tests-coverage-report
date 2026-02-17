import {
  FilesStatus,
  EventInfo,
  CoverageTypeInfo,
  DiffInfo,
  DiffCoverRef,
} from './types';
import { execFileCommand } from './utils';
import * as core from '@actions/core';

export const diffCover = async (
  eventInfo: EventInfo,
  filesStatus: FilesStatus,
  coverageInfo: CoverageTypeInfo,
): Promise<DiffInfo[]> => {
  if (eventInfo.showDiffcover) {
    const gitLogExec = await execFileCommand('git', [
      'log',
      '--format=%h',
      `origin/${eventInfo.baseRef}..origin/${eventInfo.headRef}`,
      '--',
    ]);
    if (gitLogExec.status !== 'success') {
      throw new Error(
        `failed to retrieve git log: ${eventInfo.baseRef}..${eventInfo.headRef}. error: ${gitLogExec.message}`,
      );
    }
    const commitsSha = gitLogExec.stdout?.split('\n').filter((sha) => sha) || [];
    core.info(`commitsSha list:[${commitsSha}]`);
    const changedFiles = [
      ...filesStatus.added,
      ...filesStatus.modified,
      ...filesStatus.changed,
    ];

    return getDiff(coverageInfo, changedFiles, commitsSha, eventInfo.diffcoverRef);
  }
  return [];
};

export const parseBlameForCommits = (
  blameOutput: string,
  commitSet: Set<string>,
): string[] => {
  const lines: string[] = [];
  const blameLineRegex = /^([0-9a-f]{40})\s+\d+\s+(\d+)(?:\s+\d+)?$/;
  for (const line of blameOutput.split('\n')) {
    const match = blameLineRegex.exec(line);
    if (match) {
      const fullSha = match[1];
      const lineNumber = match[2];
      const shortSha = fullSha.substring(0, 7);
      if (commitSet.has(shortSha) || commitSet.has(fullSha)) {
        lines.push(lineNumber);
      }
    }
  }
  return lines;
};

const getDiff = async (
  coverageInfo: CoverageTypeInfo,
  changedFiles: string[],
  commitsSha: string[],
  referral: DiffCoverRef,
): Promise<DiffInfo[]> => {
  const commitSet = new Set(commitsSha);
  const diffInfo: DiffInfo[] = [];
  for (const fileCoverInfo of coverageInfo[referral]) {
    for (const currFile of changedFiles) {
      const changedLinesExec = await execFileCommand('git', ['blame', '-p', currFile]);
      if (changedLinesExec.status === 'success') {
        const changedLines = parseBlameForCommits(
          changedLinesExec.stdout || '',
          commitSet,
        );
        if (changedLines.length) {
          if (fileCoverInfo.lines.details.length) {
            if (
              fileCoverInfo.file === currFile ||
              currFile.includes(fileCoverInfo.file) ||
              fileCoverInfo.file.includes(currFile)
            ) {
              const misses = changedLines.filter(
                (changedLine: string) =>
                  fileCoverInfo.lines.details.find(
                    (details) => details.line === +changedLine,
                  )?.hit === 0,
              );
              core.info(`diffCover on file=${currFile}`);
              core.info(`misses: [${misses}]`);
              core.info(
                `coverage: ${Math.round(
                  (1 - misses.length / changedLines.length) * 100,
                )}%`,
              );
              diffInfo.push({
                file: currFile,
                missedLines: misses,
                changedLines: changedLines,
              });
            }
          }
        }
      } else {
        throw new Error(
          `failed to execute "git blame" on file: ${currFile}. error: ${changedLinesExec.message}`,
        );
      }
    }
  }
  return diffInfo;
};
