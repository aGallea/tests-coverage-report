import * as github from '@actions/github';
import { getEventInfo } from '../src/eventInfo';
import { EventInfo } from '../src/types';
import { defaultCompareCommitsWithBasehead, spyActions } from './actions.spy';

const originalContext = { ...github.context };

describe('eventInput tests', () => {
  beforeAll(() => {
    spyActions();
  });

  afterAll(() => {
    github.context.ref = originalContext.ref;
    github.context.sha = originalContext.sha;
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  test('getEventInfo - pull_request', () => {
    const data = {
      inputs: {
        'github-token': 'abcdefgh',
        'cobertura-path': 'cobertura.xml',
        'show-junit': 'true',
      },
      compareCommitsWithBasehead: defaultCompareCommitsWithBasehead,
    };
    spyActions(data);
    const eventInfo: EventInfo = getEventInfo();
    expect(eventInfo.token).toBe('abcdefgh');
    expect(eventInfo.commitSha).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(eventInfo.jacocoPath).toBeUndefined();
    expect(eventInfo.showJunit).toBeTruthy();
  });

  test('getEventInfo - push', () => {
    const data = {
      inputs: {
        'github-token': 'abcdefgh',
        'jacoco-path': 'jacoco.xml',
        'show-junit': 'false',
      },
      compareCommitsWithBasehead: defaultCompareCommitsWithBasehead,
    };
    spyActions(data, 'push');
    const eventInfo: EventInfo = getEventInfo();
    expect(eventInfo.token).toBe('abcdefgh');
    expect(eventInfo.commitSha).toBe('zyxwvutsrqponmlkjihgfedcba');
    expect(eventInfo.jacocoPath).toBe('jacoco.xml');
    expect(eventInfo.coberturaPath).toBeUndefined();
    expect(eventInfo.showJunit).toBeTruthy();
  });
});
