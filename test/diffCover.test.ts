import { spyActions } from './actions.spy';
import * as github from '@actions/github';
import { CoverageTypeInfo, EventInfo, FilesStatus, DiffInfo } from '../src/types';
import { getEventInfo } from '../src/eventInfo';
import { diffCover, parseBlameForCommits, isCodeFile } from '../src/diffCover';
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
      expect(DiffInfo[1]).toEqual({
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
    });
  });

  test('changed files not in coverage report should appear as 0% covered', async () => {
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
          if (args[0] === 'blame' && args.includes('src/newScreen.tsx')) {
            const blameLines = [1, 2, 3, 4, 5];
            return {
              status: 'success',
              stdout: blameLines
                .map((ln) => `abc1234000000000000000000000000000000000 ${ln} ${ln} 1`)
                .join('\n'),
            };
          }
          if (args[0] === 'blame' && args.includes('src/newHelper.ts')) {
            const blameLines = [1, 2, 3];
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
    filesStatus.added = ['src/newScreen.tsx', 'src/newHelper.ts'];
    const result: DiffInfo[] = await diffCover(eventInfo, filesStatus, coverageInfo);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      file: 'src/newScreen.tsx',
      changedLines: ['1', '2', '3', '4', '5'],
      missedLines: ['1', '2', '3', '4', '5'],
    });
    expect(result[1]).toEqual({
      file: 'src/newHelper.ts',
      changedLines: ['1', '2', '3'],
      missedLines: ['1', '2', '3'],
    });
  });

  test('mixed: files with and without coverage data', async () => {
    jest
      .spyOn(Utils, 'execFileCommand')
      .mockImplementation(
        async (file: string, args: string[]): Promise<Utils.ExecInfo> => {
          if (args[0] === 'log') {
            return {
              status: 'success',
              stdout: 'abc1234\n',
            };
          }
          if (args[0] === 'blame' && args.includes('src/main.ts')) {
            const blameLines = [1, 2, 3, 18, 19];
            return {
              status: 'success',
              stdout: blameLines
                .map((ln) => `abc1234000000000000000000000000000000000 ${ln} ${ln} 1`)
                .join('\n'),
            };
          }
          if (args[0] === 'blame' && args.includes('src/brandNewFile.ts')) {
            const blameLines = [1, 2];
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
    filesStatus.modified = ['src/main.ts'];
    filesStatus.added = ['src/brandNewFile.ts'];
    const result: DiffInfo[] = await diffCover(eventInfo, filesStatus, coverageInfo);
    expect(result).toHaveLength(2);
    const mainResult = result.find((r) => r.file === 'src/main.ts');
    expect(mainResult).toBeDefined();
    expect(mainResult!.changedLines).toEqual(['1', '2', '3', '18', '19']);
    const newFileResult = result.find((r) => r.file === 'src/brandNewFile.ts');
    expect(newFileResult).toBeDefined();
    expect(newFileResult!).toEqual({
      file: 'src/brandNewFile.ts',
      changedLines: ['1', '2'],
      missedLines: ['1', '2'],
    });
  });

  test('empty coverage array with changed files should show 0% covered', async () => {
    jest
      .spyOn(Utils, 'execFileCommand')
      .mockImplementation(
        async (file: string, args: string[]): Promise<Utils.ExecInfo> => {
          if (args[0] === 'log') {
            return {
              status: 'success',
              stdout: 'abc1234\n',
            };
          }
          if (args[0] === 'blame' && args.includes('src/orphan.ts')) {
            const blameLines = [1, 2, 3, 4];
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
    const coverageInfo: CoverageTypeInfo = {
      cobertura: [],
      clover: [],
      lcov: [],
      jacoco: [],
      junit: undefined,
    };
    const filesStatus = getFilesStatus();
    filesStatus.added = ['src/orphan.ts'];
    const result: DiffInfo[] = await diffCover(eventInfo, filesStatus, coverageInfo);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      file: 'src/orphan.ts',
      changedLines: ['1', '2', '3', '4'],
      missedLines: ['1', '2', '3', '4'],
    });
  });

  describe('Non-code file filtering', () => {
    test('non-code files (yaml, sql, md) should be excluded from diff coverage', async () => {
      jest
        .spyOn(Utils, 'execFileCommand')
        .mockImplementation(
          async (file: string, args: string[]): Promise<Utils.ExecInfo> => {
            if (args[0] === 'log') {
              return {
                status: 'success',
                stdout: 'abc1234\n',
              };
            }
            // If git blame is called for non-code files, it means they weren't filtered
            if (
              args[0] === 'blame' &&
              (args.includes('config/settings.yaml') ||
                args.includes('db/migration.sql') ||
                args.includes('docs/README.md'))
            ) {
              const blameLines = [1, 2, 3];
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
      const coverageInfo: CoverageTypeInfo = {
        cobertura: [],
        clover: [],
        lcov: [],
        jacoco: [],
        junit: undefined,
      };
      const filesStatus = getFilesStatus();
      filesStatus.added = ['config/settings.yaml', 'db/migration.sql', 'docs/README.md'];
      const result: DiffInfo[] = await diffCover(eventInfo, filesStatus, coverageInfo);
      expect(result).toHaveLength(0);
    });

    test('mixed code and non-code files should only include code files', async () => {
      jest
        .spyOn(Utils, 'execFileCommand')
        .mockImplementation(
          async (file: string, args: string[]): Promise<Utils.ExecInfo> => {
            if (args[0] === 'log') {
              return {
                status: 'success',
                stdout: 'abc1234\n',
              };
            }
            if (args[0] === 'blame' && args.includes('src/feature.ts')) {
              const blameLines = [1, 2, 3];
              return {
                status: 'success',
                stdout: blameLines
                  .map((ln) => `abc1234000000000000000000000000000000000 ${ln} ${ln} 1`)
                  .join('\n'),
              };
            }
            if (args[0] === 'blame' && args.includes('config/app.yml')) {
              const blameLines = [1, 2];
              return {
                status: 'success',
                stdout: blameLines
                  .map((ln) => `abc1234000000000000000000000000000000000 ${ln} ${ln} 1`)
                  .join('\n'),
              };
            }
            if (args[0] === 'blame' && args.includes('schema.json')) {
              const blameLines = [1];
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
      const coverageInfo: CoverageTypeInfo = {
        cobertura: [],
        clover: [],
        lcov: [],
        jacoco: [],
        junit: undefined,
      };
      const filesStatus = getFilesStatus();
      filesStatus.added = ['src/feature.ts'];
      filesStatus.modified = ['config/app.yml', 'schema.json'];
      const result: DiffInfo[] = await diffCover(eventInfo, filesStatus, coverageInfo);
      expect(result).toHaveLength(1);
      expect(result[0].file).toBe('src/feature.ts');
    });

    test('various code file extensions should be included', async () => {
      const codeFiles = [
        'src/App.tsx',
        'src/utils.jsx',
        'lib/main.py',
        'src/Main.java',
        'src/main.go',
        'src/main.rb',
        'src/main.cs',
        'src/main.cpp',
        'src/main.c',
        'src/main.swift',
        'src/main.rs',
        'src/main.scala',
        'src/main.php',
        'src/main.kt',
      ];
      jest
        .spyOn(Utils, 'execFileCommand')
        .mockImplementation(
          async (file: string, args: string[]): Promise<Utils.ExecInfo> => {
            if (args[0] === 'log') {
              return {
                status: 'success',
                stdout: 'abc1234\n',
              };
            }
            if (args[0] === 'blame') {
              return {
                status: 'success',
                stdout: 'abc1234000000000000000000000000000000000 1 1 1',
              };
            }
            return { status: 'success', stdout: '' };
          },
        );
      const eventInfo: EventInfo = getEventInfo();
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
      filesStatus.added = codeFiles;
      const result: DiffInfo[] = await diffCover(eventInfo, filesStatus, coverageInfo);
      expect(result).toHaveLength(codeFiles.length);
      const resultFiles = result.map((r) => r.file);
      for (const codeFile of codeFiles) {
        expect(resultFiles).toContain(codeFile);
      }
    });
  });

  test('test files should be excluded from diff coverage', async () => {
    jest
      .spyOn(Utils, 'execFileCommand')
      .mockImplementation(
        async (file: string, args: string[]): Promise<Utils.ExecInfo> => {
          if (args[0] === 'log') {
            return {
              status: 'success',
              stdout: 'abc1234\n',
            };
          }
          if (args[0] === 'blame') {
            return {
              status: 'success',
              stdout: 'abc1234000000000000000000000000000000000 1 1 1',
            };
          }
          return { status: 'success', stdout: '' };
        },
      );
    const eventInfo: EventInfo = getEventInfo();
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
    filesStatus.added = ['src/feature.ts'];
    filesStatus.modified = [
      'src/feature.test.ts',
      'src/feature.spec.ts',
      'test/feature.ts',
      '__tests__/feature.ts',
    ];
    const result: DiffInfo[] = await diffCover(eventInfo, filesStatus, coverageInfo);
    expect(result).toHaveLength(1);
    expect(result[0].file).toBe('src/feature.ts');
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
});

describe('isCodeFile', () => {
  test('accepts common code file extensions', () => {
    const codeFiles = [
      'src/main.ts',
      'src/App.tsx',
      'src/index.js',
      'src/Component.jsx',
      'lib/utils.mjs',
      'lib/config.cjs',
      'app/main.py',
      'src/Main.java',
      'src/main.kt',
      'src/main.go',
      'src/main.rb',
      'src/main.cs',
      'src/main.cpp',
      'src/main.c',
      'src/main.h',
      'src/main.swift',
      'src/main.rs',
      'src/main.scala',
      'src/main.php',
      'src/main.dart',
      'src/App.vue',
      'src/App.svelte',
    ];
    for (const file of codeFiles) {
      expect(isCodeFile(file)).toBe(true);
    }
  });

  test('rejects non-code file extensions', () => {
    const nonCodeFiles = [
      'config/settings.yaml',
      'config/settings.yml',
      'db/migration.sql',
      'docs/README.md',
      'data/sample.json',
      'config/app.xml',
      'data/report.csv',
      'assets/logo.png',
      'assets/icon.svg',
      'styles/main.css',
      'styles/main.scss',
      'styles/main.less',
      'templates/page.html',
      'data/file.txt',
      'config/.env',
      'Dockerfile',
      'Makefile',
    ];
    for (const file of nonCodeFiles) {
      expect(isCodeFile(file)).toBe(false);
    }
  });

  test('rejects files without extensions', () => {
    expect(isCodeFile('Dockerfile')).toBe(false);
    expect(isCodeFile('Makefile')).toBe(false);
    expect(isCodeFile('LICENSE')).toBe(false);
  });

  test('is case-insensitive for extensions', () => {
    expect(isCodeFile('src/Main.TS')).toBe(true);
    expect(isCodeFile('src/Main.Py')).toBe(true);
    expect(isCodeFile('src/Main.JAVA')).toBe(true);
  });

  test('excludes test files', () => {
    const testFiles = [
      'src/main.test.ts',
      'src/main.test.js',
      'src/main.spec.ts',
      'src/main.spec.js',
      'src/Main.test.java',
      'src/Main.spec.py',
      '__tests__/main.ts',
      '__tests__/utils/helper.js',
      'test/main.ts',
      'test/parsers/cobertura.ts',
      'tests/unit/main.py',
      'tests/integration/api.java',
    ];
    for (const file of testFiles) {
      expect(isCodeFile(file)).toBe(false);
    }
  });

  test('includes source files in directories containing test-like words', () => {
    // 'test' in filename but not matching test patterns
    expect(isCodeFile('src/testUtils.ts')).toBe(true);
    expect(isCodeFile('src/contestEntry.java')).toBe(true);
  });
});
