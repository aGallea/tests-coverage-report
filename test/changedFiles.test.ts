import { defaultInputs, spyActions } from './actions.spy';
import * as github from '@actions/github';
import { getChangedFiles } from '../src/changedFiles';
import { getEventInfo } from '../src/eventInfo';
import { EventInfo, FilesStatus } from '../src/types';
import * as core from '@actions/core';

const originalContext = { ...github.context };

describe('eventInput tests', () => {
  beforeAll(() => {
    const data = {
      inputs: defaultInputs,
      compareCommitsWithBasehead: {
        total_commits: 3,
        files: [
          {
            status: 'added',
            filename: '1.file',
          },
          {
            status: 'modified',
            filename: '2.file',
          },
          {
            status: 'renamed',
            filename: '3.file',
          },
          {
            status: 'copied',
            filename: '4.file',
          },
          {
            status: 'changed',
            filename: '5.file',
          },
          {
            status: 'unchanged',
            filename: '6.file',
          },
          {
            status: 'removed',
            filename: '7.file',
          },
        ],
      },
    };
    spyActions(data);
  });

  afterAll(() => {
    github.context.ref = originalContext.ref;
    github.context.sha = originalContext.sha;
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  test('getChangedFiles', async () => {
    const eventInfo: EventInfo = getEventInfo();
    const filesStatus: FilesStatus = await getChangedFiles(eventInfo);
    expect(filesStatus.all).toHaveLength(7);
    expect(filesStatus.added).toHaveLength(1);
    expect(filesStatus.added[0]).toEqual('1.file');
    expect(filesStatus.modified).toHaveLength(1);
    expect(filesStatus.modified[0]).toEqual('2.file');
    expect(filesStatus.renamed).toHaveLength(1);
    expect(filesStatus.renamed[0]).toEqual('3.file');
    expect(filesStatus.copied).toHaveLength(1);
    expect(filesStatus.copied[0]).toEqual('4.file');
    expect(filesStatus.changed).toHaveLength(1);
    expect(filesStatus.changed[0]).toEqual('5.file');
    expect(filesStatus.unchanged).toHaveLength(1);
    expect(filesStatus.unchanged[0]).toEqual('6.file');
    expect(filesStatus.removed).toHaveLength(1);
    expect(filesStatus.removed[0]).toEqual('7.file');
  });

  test('getChangedFiles paginates by file count, not commit count', async () => {
    const page1Files = Array.from({ length: 50 }, (_, i) => ({
      status: 'added',
      filename: `page1-${i}.file`,
    }));
    const page2Files = Array.from({ length: 10 }, (_, i) => ({
      status: 'modified',
      filename: `page2-${i}.file`,
    }));

    const mockCompare = jest
      .fn()
      .mockResolvedValueOnce({
        data: { total_commits: 1, files: page1Files },
      })
      .mockResolvedValueOnce({
        data: { total_commits: 1, files: page2Files },
      });

    jest.spyOn(github, 'getOctokit').mockImplementation(
      () =>
        ({
          rest: {
            repos: {
              compareCommitsWithBasehead: mockCompare,
            },
          },
        }) as any,
    );

    const eventInfo: EventInfo = getEventInfo();
    const filesStatus: FilesStatus = await getChangedFiles(eventInfo);

    expect(filesStatus.all).toHaveLength(60);
    expect(filesStatus.added).toHaveLength(50);
    expect(filesStatus.modified).toHaveLength(10);
    expect(mockCompare).toHaveBeenCalledTimes(2);
  });

  test('getChangedFiles skips files with unknown status', async () => {
    const mockCompare = jest.fn().mockResolvedValueOnce({
      data: {
        total_commits: 1,
        files: [
          { status: 'added', filename: 'known.file' },
          { status: 'unknown_status', filename: 'unknown.file' },
        ],
      },
    });

    jest.spyOn(github, 'getOctokit').mockImplementation(
      () =>
        ({
          rest: {
            repos: {
              compareCommitsWithBasehead: mockCompare,
            },
          },
        }) as any,
    );

    const eventInfo: EventInfo = getEventInfo();
    const filesStatus: FilesStatus = await getChangedFiles(eventInfo);

    expect(filesStatus.all).toHaveLength(2);
    expect(filesStatus.added).toHaveLength(1);
    expect(filesStatus.added[0]).toEqual('known.file');
  });
});
