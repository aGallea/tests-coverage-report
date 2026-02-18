import * as core from '@actions/core';
import { DiffCoverRef, EventInfo } from './types';
import { context } from '@actions/github';

const VALID_DIFFCOVER_REFS: DiffCoverRef[] = ['cobertura', 'clover', 'lcov', 'jacoco'];

const parseDiffcoverRef = (input: string): DiffCoverRef => {
  if (VALID_DIFFCOVER_REFS.includes(input as DiffCoverRef)) {
    return input as DiffCoverRef;
  }
  if (input && input !== '') {
    core.warning(
      `Invalid diffcover-ref value: '${input}'. Valid values: ${VALID_DIFFCOVER_REFS.join(', ')}. Defaulting to 'cobertura'.`,
    );
  }
  return 'cobertura';
};

export const getEventInfo = (): EventInfo => {
  const eventInfo: EventInfo = {
    token: core.getInput('github-token', { required: true }),
    commentTitle: core.getInput('title', { required: false }),
    owner: context.repo.owner,
    repo: context.repo.repo,
    coberturaPath: core.getInput('cobertura-path', { required: false }),
    cloverPath: core.getInput('clover-path', { required: false }),
    lcovPath: core.getInput('lcov-path', { required: false }),
    jacocoPath: core.getInput('jacoco-path', { required: false }),
    junitPath: core.getInput('junit-path', { required: false }),
    showJunit: core.getBooleanInput('show-junit', { required: false }),
    showDiffcover: core.getBooleanInput('show-diffcover', { required: false }),
    minCoveragePercentage: core.getInput('min-coverage-percentage', { required: false }),
    failUnderCoveragePercentage: core.getBooleanInput('fail-under-coverage-percentage', {
      required: false,
    }),
    showFailuresInfo: core.getBooleanInput('show-failures-info', { required: false }),
    overrideComment: core.getBooleanInput('override-comment', { required: false }),
    commentId: '<!-- tests-coverage-report -->',
    diffcoverRef: parseDiffcoverRef(core.getInput('diffcover-ref', { required: false })),
    commitSha: '',
    headRef: '',
    baseRef: '',
    pwd: process.env.GITHUB_WORKSPACE || '',
  };
  if (context.eventName === 'pull_request' && context.payload) {
    eventInfo.commitSha = context.payload.pull_request?.head.sha;
    eventInfo.headRef = context.payload.pull_request?.head.ref;
    eventInfo.baseRef = context.payload.pull_request?.base.ref;
  } else if (context.eventName === 'push') {
    eventInfo.commitSha = context.payload.after;
    eventInfo.headRef = context.ref;
  }
  return eventInfo;
};
