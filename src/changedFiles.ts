import { getOctokit } from '@actions/github';
import { FilesStatus, EventInfo } from './types';

export const getChangedFiles = async (eventInfo: EventInfo): Promise<FilesStatus> => {
  const allFiles: FilesStatus = {
    all: [],
    added: [],
    removed: [],
    modified: [],
    renamed: [],
    copied: [],
    changed: [],
    unchanged: [],
  };
  const octokit = getOctokit(eventInfo.token);

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
        allFiles.all.push(file.filename);
        const status = `${file.status}` as keyof FilesStatus;
        if (status !== 'all' && status in allFiles) {
          allFiles[status].push(file.filename);
        }
      }
    }
    hasMorePages = (files?.length ?? 0) >= perPage;
    currPage++;
  }
  return allFiles;
};
