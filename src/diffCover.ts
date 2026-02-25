import {
  FilesStatus,
  EventInfo,
  CoverageTypeInfo,
  DiffInfo,
  DiffCoverRef,
} from './types';
import { execFileCommand } from './utils';
import * as core from '@actions/core';

const CODE_FILE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.java',
  '.kt',
  '.kts',
  '.go',
  '.rb',
  '.cs',
  '.cpp',
  '.cc',
  '.cxx',
  '.c',
  '.h',
  '.hpp',
  '.hxx',
  '.swift',
  '.rs',
  '.scala',
  '.sc',
  '.php',
  '.m',
  '.mm',
  '.groovy',
  '.gvy',
  '.lua',
  '.r',
  '.R',
  '.pl',
  '.pm',
  '.ex',
  '.exs',
  '.erl',
  '.hrl',
  '.clj',
  '.cljs',
  '.dart',
  '.vue',
  '.svelte',
]);

const TEST_FILE_PATTERNS = [
  /\.test\./i,
  /\.spec\./i,
  /(^|\/)__tests__\//i,
  /(^|\/)test\//i,
  /(^|\/)tests\//i,
];

export const isCodeFile = (filePath: string): boolean => {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return false;
  const ext = filePath.substring(lastDot).toLowerCase();
  if (!CODE_FILE_EXTENSIONS.has(ext)) return false;
  return !TEST_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
};

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
  const coverageEntries = coverageInfo[referral];
  for (const currFile of changedFiles.filter(isCodeFile)) {
    const changedLinesExec = await execFileCommand('git', ['blame', '-p', currFile]);
    if (changedLinesExec.status === 'success') {
      const changedLines = parseBlameForCommits(changedLinesExec.stdout || '', commitSet);
      if (changedLines.length) {
        const fileCoverInfo = coverageEntries.find(
          (entry) =>
            entry.file === currFile ||
            currFile.includes(entry.file) ||
            entry.file.includes(currFile),
        );
        if (fileCoverInfo && fileCoverInfo.lines.details.length) {
          const misses = changedLines.filter(
            (changedLine: string) =>
              fileCoverInfo.lines.details.find((details) => details.line === +changedLine)
                ?.hit === 0,
          );
          core.info(`diffCover on file=${currFile}`);
          core.info(`misses: [${misses}]`);
          core.info(
            `coverage: ${Math.round((1 - misses.length / changedLines.length) * 100)}%`,
          );
          diffInfo.push({
            file: currFile,
            missedLines: misses,
            changedLines: changedLines,
          });
        } else {
          core.info(`diffCover on file=${currFile} (no coverage data)`);
          core.info(`misses: [${changedLines}]`);
          core.info(`coverage: 0%`);
          diffInfo.push({
            file: currFile,
            missedLines: changedLines,
            changedLines: changedLines,
          });
        }
      }
    } else {
      throw new Error(
        `failed to execute "git blame" on file: ${currFile}. error: ${changedLinesExec.message}`,
      );
    }
  }
  return diffInfo;
};
