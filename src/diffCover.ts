import {
  FilesStatus,
  EventInfo,
  CoverageTypeInfo,
  DiffInfo,
  DiffCoverRef,
} from './types';
import { execCommand } from './utils';
import * as core from '@actions/core';

export const diffCover = async (
  eventInfo: EventInfo,
  filesStatus: FilesStatus,
  coverageInfo: CoverageTypeInfo,
): Promise<DiffInfo[]> => {
  if (eventInfo.showDiffcover) {
    const gitLogCommand = `git log --oneline origin/${eventInfo.baseRef}..origin/${eventInfo.headRef} -- | cut -f1 -d' '`;
    const gitLogExec = await execCommand(gitLogCommand);
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

const getDiff = async (
  coverageInfo: CoverageTypeInfo,
  changedFiles: string[],
  commitsSha: string[],
  referral: DiffCoverRef,
): Promise<DiffInfo[]> => {
  const diffInfo: DiffInfo[] = [];
  core.info('getDiff');
  for (const fileCoverInfo of coverageInfo[referral]) {
    core.info(`fileCoverInfo: [${fileCoverInfo}]`);
    core.info(`changedFiles: [${changedFiles}]`);
    for (const currFile of changedFiles) {
      core.info(`currFile: [${currFile}]`);
      const changedLinesExec = await execCommand(
        `git blame ${currFile} | grep -n '${commitsSha.join('\\|')}' | cut -f1 -d:`,
      );
      if (changedLinesExec.status === 'success') {
        const changedLines =
          changedLinesExec.stdout?.split('\n').filter((line) => line) || [];
        core.info(`changedLinesExec.stdout: [${changedLinesExec.stdout}]`);
        core.info(`changedLines: [${changedLines}]`);
        if (changedLines.length) {
          if (fileCoverInfo.lines.details.length) {
            if (fileCoverInfo.file === currFile) {
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
      // core.info(changedLinesExec.stdout);
    }
  }
  return diffInfo;
};
