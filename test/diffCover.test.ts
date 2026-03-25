import { spyActions } from './actions.spy';
import * as github from '@actions/github';
import { CoverageTypeInfo, EventInfo, FilesStatus, DiffInfo } from '../src/types';
import { getEventInfo } from '../src/eventInfo';
import { diffCover, parseBlameForCommits } from '../src/diffCover';
import { parseFile } from '../src/parsers/cobertura';
import * as Utils from '../src/utils';

const originalContext = { ...github.context };

describe('diffCover tests', () => {
  beforeAll(() => {
    spyActions();
  });

  afterAll(() => {
    github.context.ref = originalContext.ref;
    github.context.sha = originalContext.sha;
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const getFilesStatus = (): FilesStatus => {
    return {
      all: [],
      added: [],
      removed: [],
      modified: [],
      renamed: [],
      copied: [],
      changed: [],
      unchanged: [],
    };
  };

  describe('Empty responses', () => {
    test('showDiffcover false', async () => {
      const eventInfo: EventInfo = getEventInfo();
      const cobertura = await parseFile(
        './test/assets/cobertura-coverage.xml',
        '/Users/user/workspace/private/tests-coverage-report/',
      );
      const coverageInfo: CoverageTypeInfo = {
        cobertura,
        clover: [],
        lcov: [],
        jacoco: [],
        junit: undefined,
      };
      const DiffInfo: DiffInfo[] = await diffCover(
        eventInfo,
        getFilesStatus(),
        coverageInfo,
      );
      expect(DiffInfo).toHaveLength(0);
    });
    test('empty added/modified/changed', async () => {
      const eventInfo: EventInfo = getEventInfo();
      eventInfo.showDiffcover = true;
      eventInfo.diffcoverRef = 'cobertura';
      jest
        .spyOn(Utils, 'execFileCommand')
        .mockResolvedValue({ status: 'success', stdout: '' });
      const cobertura = await parseFile(
        './test/assets/cobertura-coverage.xml',
        '/Users/user/workspace/private/tests-coverage-report/',
      );
      const coverageInfo: CoverageTypeInfo = {
        cobertura,
        clover: [],
        lcov: [],
        jacoco: [],
        junit: undefined,
      };
      const DiffInfo: DiffInfo[] = await diffCover(
        eventInfo,
        getFilesStatus(),
        coverageInfo,
      );
      expect(DiffInfo).toHaveLength(0);
    });
  });

  describe('Responses with content', () => {
    test('diff info', async () => {
      const eventInfo: EventInfo = getEventInfo();
      eventInfo.showDiffcover = true;
      eventInfo.diffcoverRef = 'cobertura';
      jest
        .spyOn(Utils, 'execFileCommand')
        .mockResolvedValue({ status: 'success', stdout: '' });
      const cobertura = await parseFile(
        './test/assets/cobertura-coverage.xml',
        '/Users/user/workspace/private/tests-coverage-report/',
      );
      const coverageInfo: CoverageTypeInfo = {
        cobertura,
        clover: [],
        lcov: [],
        jacoco: [],
        junit: undefined,
      };
      const filesStatus = getFilesStatus();
      filesStatus.all = ['1.file', '2.file', '3.file'];
      filesStatus.changed = ['1.file'];
      filesStatus.added = ['2.file'];
      filesStatus.modified = ['3.file'];
      const DiffInfo: DiffInfo[] = await diffCover(eventInfo, filesStatus, coverageInfo);
      expect(DiffInfo).toHaveLength(0);
    });
    test('with changed lines', async () => {
      jest
        .spyOn(Utils, 'execFileCommand')
        .mockImplementation(
          async (file: string, args: string[]): Promise<Utils.ExecInfo> => {
            if (args[0] === 'log') {
              return {
                status: 'success',
                stdout: 'abc1234\ndef5678\n',
              };
            }
            if (args[0] === 'blame' && args.includes('src/main.ts')) {
              const blameLines = [
                1, 2, 3, 4, 10, 11, 12, 13, 17, 18, 19, 20, 21, 22, 29, 30,
              ];
              return {
                status: 'success',
                stdout: blameLines
                  .map((ln) => `abc1234000000000000000000000000000000000 ${ln} ${ln} 1`)
                  .join('\n'),
              };
            }
            if (args[0] === 'blame' && args.includes('src/diffCover.ts')) {
              const blameLines = [
                1, 2, 3, 4, 5, 51, 52, 53, 54, 72, 73, 74, 78, 79, 80, 81, 82, 83,
              ];
              return {
                status: 'success',
                stdout: blameLines
                  .map((ln) => `abc1234000000000000000000000000000000000 ${ln} ${ln} 1`)
                  .join('\n'),
              };
            }
            return { status: 'success', stdout: '' };
          },
        );
      const eventInfo: EventInfo = getEventInfo();
      eventInfo.showDiffcover = true;
      eventInfo.diffcoverRef = 'cobertura';
      const cobertura = await parseFile(
        './test/assets/cobertura-coverage.xml',
        '/Users/user/workspace/private/tests-coverage-report/',
      );
      const coverageInfo: CoverageTypeInfo = {
        cobertura,
        clover: [],
        lcov: [],
        jacoco: [],
        junit: undefined,
      };
      const filesStatus = getFilesStatus();
      filesStatus.all = ['src/diffCover.ts', 'src/main.ts', 'src/utils.ts'];
      filesStatus.changed = ['src/diffCover.ts'];
      filesStatus.added = ['src/main.ts'];
      filesStatus.modified = ['src/utils.ts'];
      const DiffInfo: DiffInfo[] = await diffCover(eventInfo, filesStatus, coverageInfo);
      expect(DiffInfo).toHaveLength(2);
      expect(DiffInfo[0]).toEqual({
        changedLines: [
          '1',
          '2',
          '3',
          '4',
          '5',
          '51',
          '52',
          '53',
          '54',
          '72',
          '73',
          '74',
          '78',
          '79',
          '80',
          '81',
          '82',
          '83',
        ],
        file: 'src/diffCover.ts',
        missedLines: [
          '51',
          '52',
          '53',
          '54',
          '72',
          '73',
          '74',
          '78',
          '79',
          '80',
          '81',
          '82',
          '83',
        ],
      });
      expect(DiffInfo[1]).toEqual({
        changedLines: [
          '1',
          '2',
          '3',
          '4',
          '10',
          '11',
          '12',
          '13',
          '17',
          '18',
          '19',
          '20',
          '21',
          '22',
          '29',
          '30',
        ],
        file: 'src/main.ts',
        missedLines: ['18', '19', '20', '21', '22', '29', '30'],
      });
    });
  });

  describe('Exceptions', () => {
    test('invalid git log', async () => {
      const eventInfo: EventInfo = getEventInfo();
      jest.spyOn(Utils, 'execFileCommand').mockImplementation(
        async (): Promise<Utils.ExecInfo> => ({
          status: 'error',
          message: 'some error message',
          errorCode: 1,
        }),
      );
      eventInfo.showDiffcover = true;
      eventInfo.diffcoverRef = 'cobertura';
      const coverageInfo: CoverageTypeInfo = {
        cobertura: [],
        clover: [],
        lcov: [],
        jacoco: [],
        junit: undefined,
      };
      const filesStatus = getFilesStatus();
      await expect(diffCover(eventInfo, filesStatus, coverageInfo)).rejects.toThrow(
        'failed to retrieve git log: master..some-head. error: some error message',
      );
    });
    test('invalid git blame', async () => {
      const eventInfo: EventInfo = getEventInfo();
      jest
        .spyOn(Utils, 'execFileCommand')
        .mockImplementation(
          async (file: string, args: string[]): Promise<Utils.ExecInfo> => {
            if (args[0] === 'blame') {
              return {
                status: 'error',
                message: 'git blame error message',
                errorCode: 1,
              };
            }
            return {
              status: 'success',
              stdout: '',
            };
          },
        );
      eventInfo.showDiffcover = true;
      eventInfo.diffcoverRef = 'cobertura';
      const cobertura = await parseFile(
        './test/assets/cobertura-coverage.xml',
        '/Users/user/workspace/private/tests-coverage-report/',
      );
      const coverageInfo: CoverageTypeInfo = {
        cobertura,
        clover: [],
        lcov: [],
        jacoco: [],
        junit: undefined,
      };
      const filesStatus = getFilesStatus();
      filesStatus.all = ['src/diffCover.ts'];
      filesStatus.changed = ['src/diffCover.ts'];
      await expect(diffCover(eventInfo, filesStatus, coverageInfo)).rejects.toThrow(
        'failed to execute "git blame" on file: src/diffCover.ts. error: git blame error message',
      );
    });
  });
});

describe('parseBlameForCommits', () => {
  test('extracts matching line numbers', () => {
    const blameOutput = [
      'abc1234000000000000000000000000000000000 1 1 1',
      'author Test User',
      'def5678000000000000000000000000000000000 2 2 1',
      'author Test User',
      'abc1234000000000000000000000000000000000 3 3 1',
      'author Test User',
    ].join('\n');
    const commitSet = new Set(['abc1234']);
    const result = parseBlameForCommits(blameOutput, commitSet);
    expect(result).toEqual(['1', '3']);
  });

  test('returns empty for no matches', () => {
    const blameOutput = [
      'abc1234000000000000000000000000000000000 1 1 1',
      'author Test User',
    ].join('\n');
    const commitSet = new Set(['zzz9999']);
    const result = parseBlameForCommits(blameOutput, commitSet);
    expect(result).toEqual([]);
  });

  test('handles empty blame output', () => {
    const result = parseBlameForCommits('', new Set(['abc1234']));
    expect(result).toEqual([]);
  });

  test('matches full 40-char SHA', () => {
    const fullSha = 'abc1234000000000000000000000000000000000';
    const blameOutput = `${fullSha} 5 5 1`;
    const commitSet = new Set([fullSha]);
    const result = parseBlameForCommits(blameOutput, commitSet);
    expect(result).toEqual(['5']);
  });

  test('matches short 7-char SHA', () => {
    const blameOutput = 'abc1234000000000000000000000000000000000 10 10 1';
    const commitSet = new Set(['abc1234']);
    const result = parseBlameForCommits(blameOutput, commitSet);
    expect(result).toEqual(['10']);
  });

  test('matches 9-char abbreviated SHA from git log', () => {
    const blameOutput = [
      'edf7beeb00000000000000000000000000000000 1 1 1',
      'author Test User',
      '176dba7500000000000000000000000000000000 2 2 1',
      'author Test User',
      'aaaa000000000000000000000000000000000000 3 3 1',
      'author Test User',
    ].join('\n');
    const commitSet = new Set(['edf7beeb0', '176dba750']);
    const result = parseBlameForCommits(blameOutput, commitSet);
    expect(result).toEqual(['1', '2']);
  });

  test('matches 8-char abbreviated SHA', () => {
    const fullSha = 'abcdef12' + '0'.repeat(32); // 40 chars
    const blameOutput = `${fullSha} 5 5 1`;
    const commitSet = new Set(['abcdef12']);
    const result = parseBlameForCommits(blameOutput, commitSet);
    expect(result).toEqual(['5']);
  });

  test('does not false-match when abbrev length differs', () => {
    // commitSet has 9-char SHAs, blame has a SHA that matches first 7 chars but not 9
    const fullSha = 'abc123400' + '0'.repeat(31); // 40 chars
    const blameOutput = `${fullSha} 1 1 1`;
    const commitSet = new Set(['abc1234ff']); // 9 chars, last 2 differ
    const result = parseBlameForCommits(blameOutput, commitSet);
    expect(result).toEqual([]);
  });

  test('handles empty commit set gracefully', () => {
    const blameOutput = 'abc1234000000000000000000000000000000000 1 1 1';
    const commitSet = new Set<string>();
    const result = parseBlameForCommits(blameOutput, commitSet);
    expect(result).toEqual([]);
  });
});
