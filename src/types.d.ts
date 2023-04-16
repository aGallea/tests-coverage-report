export interface CoverageTypeInfo {
  cobertura: CoverInfo[];
  clover: CoverInfo[];
  lcov: CoverInfo[];
  jacoco: CoverInfo[];
  junit: Junit | undefined;
}

export type DiffCoverRef = 'cobertura' | 'clover' | 'lcov' | 'jacoco';

export interface EventInfo {
  token: string;
  commentTitle: string;
  owner: string;
  repo: string;
  coberturaPath: string;
  cloverPath: string;
  lcovPath: string;
  jacocoPath: string;
  junitPath: string;
  showJunit: boolean;
  showDiffcover: boolean;
  minCoveragePercentage: string;
  failUnderCoveragePercentage: boolean;
  showFailuresInfo: boolean;
  overrideComment: boolean;
  commentId: string;
  diffcoverRef: DiffCoverRef;
  commitSha: string;
  headRef: string;
  baseRef: string;
  filesStatus?: FilesStatus;
}

export interface FilesStatus {
  all: string[];
  added: string[];
  removed: string[];
  modified: string[];
  renamed: string[];
  copied: string[];
  changed: string[];
  unchanged: string[];
}

export interface DiffInfo {
  file: string;
  missedLines: string[];
  changedLines: string[];
}

export interface CoverInfo {
  file: string;
  title: string;
  lines: CoverInfoLines;
  functions: CoverInfoFunctions;
  branches: CoverInfoBranches;
}

export interface CoverInfoLines {
  found: number;
  hit: number;
  details: CoverInfoLinesDetails[];
}

export interface CoverInfoLinesDetails {
  line: number;
  hit: number;
}

export interface CoverInfoFunctions {
  found: number;
  hit: number;
  details: CoverInfoFunctionsDetails[];
}

export interface CoverInfoFunctionsDetails {
  line: number;
  hit: number;
  name: string;
}

export interface CoverInfoBranches {
  found: number;
  hit: number;
  details: CoverInfoBranchesDetails[];
}

export interface CoverInfoBranchesDetails {
  line: number;
  branch: number;
  taken: number;
  block?: number;
}

export interface JunitFailureInfo {
  classname: string;
  name: string;
  time: string;
  error: string;
}

export interface Junit {
  tests: number;
  failures: {
    count: number;
    info: JunitFailureInfo[] | undefined;
  };
  errors: number;
  skipped: number;
  time: string;
}
