import { getOctokit } from '@actions/github';
import { FilesStatus, EventInfo } from './types';

const emptyFilesStatus = (): FilesStatus => ({
  all: [],
  added: [],
  removed: [],
  modified: [],
  renamed: [],
  copied: [],
  changed: [],
  unchanged: [],
});

const addFile = (allFiles: FilesStatus, filename: string, status: string): void => {
  allFiles.all.push(filename);
  const key = status as keyof FilesStatus;
  if (key !== 'all' && key in allFiles) {
    allFiles[key].push(filename);
  }
};

export const getChangedFiles = async (eventInfo: EventInfo): Promise<FilesStatus> => {
  const allFiles = emptyFilesStatus();
  const octokit = getOctokit(eventInfo.token);

  if (eventInfo.prNumber) {
    const perPage = 50;
    let currPage = 1;
    let hasMorePages = true;
    while (hasMorePages) {
      const { data: files } = await octokit.rest.pulls.listFiles({
        owner: eventInfo.owner,
        repo: eventInfo.repo,
        pull_number: eventInfo.prNumber,
        per_page: perPage,
        page: currPage,
      });
      for (const file of files) {
        addFile(allFiles, file.filename, `${file.status}`);
      }
      hasMorePages = files.length >= perPage;
      currPage++;
    }
  } else if (eventInfo.baseRef && eventInfo.headRef) {
    const perPage = 50;
    let currPage = 1;
    let hasMorePages = true;
    while (hasMorePages) {
      const {
        data: { files },
      } = await octokit.rest.repos.compareCommitsWithBasehead({
        owner: eventInfo.owner,
        repo: eventInfo.repo,
        basehead: `${eventInfo.baseRef}...${eventInfo.headRef}`,
        per_page: perPage,
        page: currPage,
      });
      if (files) {
        for (const file of files) {
          addFile(allFiles, file.filename, `${file.status}`);
        }
      }
      hasMorePages = (files?.length ?? 0) >= perPage;
      currPage++;
    }
  }
  return allFiles;
};
