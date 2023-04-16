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

  let pages = 1;
  const pagedFiles = [];
  for (let currPage = 1; currPage <= pages; currPage++) {
    const {
      data: { total_commits, files },
    } = await octokit.rest.repos.compareCommitsWithBasehead({
      owner: eventInfo.owner,
      repo: eventInfo.repo,
      basehead: `${eventInfo.baseRef}...${eventInfo.headRef}`,
      per_page: 50,
      page: currPage,
    });
    if (files) {
      pages = Math.ceil(total_commits / 50);
      for (const file of files) {
        allFiles.all.push(file.filename);
        allFiles[`${file.status}`].push(file.filename);
      }
      pagedFiles.push(...files);
    }
  }
  return allFiles;
};
