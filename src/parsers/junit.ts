/* eslint-disable  @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { Junit, JunitFailureInfo } from '../types';
import parseString from 'xml2js';
import * as core from '@actions/core';

const unpackage = (testsuites: any): Junit => {
  const main = testsuites['$'] || testsuites.testsuite[0]['$'];
  const testsuite: any[] = testsuites.testsuite;

  const errors =
    testsuite
      ?.map((test: any) => +test['$'].errors)
      .reduce((acc: number, curr: number) => acc + curr, 0) || 0;

  const skipped =
    testsuite
      ?.map((test: any) => +test['$'].skipped)
      .reduce((acc: number, curr: number) => acc + curr, 0) || 0;

  const testSuiteFailures = testsuite?.filter((test: any) => +test['$'].failures > 0);
  const failureCase: JunitFailureInfo[] | undefined = testSuiteFailures
    .map((testSuiteFailure: any) => {
      const testCaseFailures: any[] = testSuiteFailure.testcase.filter(
        (testCase: any) => testCase.failure,
      );
      return testCaseFailures.map((testCaseFailure: any) => ({
        classname: testCaseFailure['$'].classname.trim(),
        name: testCaseFailure['$'].name.trim(),
        time: `${parseFloat(testCaseFailure['$'].time).toFixed(2)}s`,
        error: getTestFailureMessage(testCaseFailure),
      }));
    })
    .flat();

  return {
    tests: +main.tests,
    failures: {
      count: +main.failures,
      info: failureCase,
    },
    errors: +main.errors || errors,
    skipped,
    time: `${parseFloat(main.time).toFixed(2)}s`,
  };
};

const getTestFailureMessage = (testCaseFailure: any): string => {
  const failure = testCaseFailure?.failure?.[0];
  if (failure) {
    if (typeof failure === 'string') {
      return failure.split('\n')?.[0]?.trim() || 'unhandled string error';
    } else if (typeof failure === 'object') {
      return failure['$']?.message || failure.message || 'unhandled object error';
    }
  }
  return 'unknown failure';
};

const parseContent = (xml: string): Promise<Junit> => {
  return new Promise((resolve, reject) => {
    parseString.parseString(xml, (err, parseResult) => {
      if (err) {
        return reject(err);
      }
      if (!parseResult?.testsuites) {
        return reject(new Error('invalid or missing xml content'));
      }
      const result = unpackage(parseResult.testsuites);
      resolve(result);
    });
  });
};

export const parseFile = async (file: string): Promise<Junit | undefined> => {
  return new Promise((resolve, reject) => {
    if (!file || file === '') {
      core.info('no file specified');
      resolve(undefined);
    } else {
      fs.readFile(
        file,
        'utf8',
        async (err: NodeJS.ErrnoException | null, data: string) => {
          if (err) {
            core.error(`failed to read file: ${file}. error: ${err.message}`);
            reject(err);
          } else {
            try {
              const info = await parseContent(data);
              // console.log('====== junit ======');
              // console.log(JSON.stringify(info, null, 2));
              resolve(info);
            } catch (error) {
              core.error(`failed to parseContent. err: ${error.message}`);
              reject(error);
            }
          }
        },
      );
    }
  });
};
