import { spyActions } from './actions.spy';
import * as github from '@actions/github';
import { CoverageTypeInfo, EventInfo, FilesStatus, DiffInfo } from '../src/types';
import { getEventInfo } from '../src/eventInfo';
import { diffCover } from '../src/diffCover';
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
      const cobertura = await parseFile('./test/assets/cobertura-coverage.xml');
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
      const cobertura = await parseFile('./test/assets/cobertura-coverage.xml');
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
      const cobertura = await parseFile('./test/assets/cobertura-coverage.xml');
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
        .spyOn(Utils, 'execCommand')
        .mockImplementation(async (command: string): Promise<Utils.ExecInfo> => {
          if (command.includes('src/main.ts')) {
            return {
              status: 'success',
              stdout: '1\n2\n3\n4\n10\n11\n12\n13\n17\n18\n19\n20\n21\n22\n29\n30\n',
            };
          } else if (command.includes('src/diffCover.ts')) {
            return {
              status: 'success',
              stdout:
                '1\n2\n3\n4\n5\n51\n52\n53\n54\n72\n73\n74\n78\n79\n80\n81\n82\n83\n',
            };
          }
          return {
            status: 'success',
            stdout: '',
          };
        });
      const eventInfo: EventInfo = getEventInfo();
      eventInfo.showDiffcover = true;
      eventInfo.diffcoverRef = 'cobertura';
      const cobertura = await parseFile('./test/assets/cobertura-coverage.xml');
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
      jest.spyOn(Utils, 'execCommand').mockImplementation(
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
        .spyOn(Utils, 'execCommand')
        .mockImplementation(async (command: string): Promise<Utils.ExecInfo> => {
          if (command.includes('blame')) {
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
        });
      eventInfo.showDiffcover = true;
      eventInfo.diffcoverRef = 'cobertura';
      const cobertura = await parseFile('./test/assets/cobertura-coverage.xml');
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
