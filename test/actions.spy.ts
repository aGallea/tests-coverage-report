import * as core from '@actions/core';
import * as github from '@actions/github';

export const defaultInputs: { [key: string]: any } = {
  title: 'Tests Report Mock',
  'github-token': 'abcdefgh',
  'cobertura-path': 'cobertura.xml',
  'show-junit': false,
  'min-coverage-percentage': '80',
};

export const defaultCompareCommitsWithBasehead: { [key: string]: any } = {
  total_commits: 0,
  files: [],
};

export const defaultData = {
  inputs: defaultInputs,
  compareCommitsWithBasehead: defaultCompareCommitsWithBasehead,
};

export function spyActions(data = defaultData, eventName = 'pull_request') {
  github.context.eventName = eventName;
  jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
    return data.inputs[name];
  });
  jest
    .spyOn(core, 'getBooleanInput')
    .mockImplementation((name: string) => data.inputs[name]);

  jest.spyOn(core, 'error').mockImplementation(jest.fn());
  jest.spyOn(core, 'warning').mockImplementation(jest.fn());
  jest.spyOn(core, 'info').mockImplementation(jest.fn());
  jest.spyOn(core, 'debug').mockImplementation(jest.fn());
  // jest.spyOn(core, 'setFailed').mockImplementation(jest.fn());

  jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
    return {
      owner: 'some-owner',
      repo: 'some-repo',
    };
  });
  github.context.ref = 'refs/heads/some-ref';
  github.context.sha = '1234567890123456789012345678901234567890';
  github.context.payload = {
    pull_request: {
      head: {
        sha: 'abcdefghijklmnopqrstuvwxyz',
        ref: 'some-head',
      },
      base: {
        ref: 'master',
      },
      number: 1,
    },
    after: 'zyxwvutsrqponmlkjihgfedcba',
  };
  jest.spyOn(github, 'getOctokit').mockImplementation(
    () =>
      ({
        rest: {
          repos: {
            compareCommitsWithBasehead: jest.fn(async () => ({
              data: data.compareCommitsWithBasehead,
            })),
          },
        },
      } as any),
  );
}
