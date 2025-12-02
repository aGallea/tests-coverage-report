import fs from 'fs';
import { Junit, JunitFailureInfo } from '../types';
import parseString from 'xml2js';
import * as core from '@actions/core';

const safeParseInt = (val: any): number => {
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : parsed;
};

const safeParseFloat = (val: any): number => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

const unpackage = (testsuites: any): Junit => {
  const main = testsuites['$'] || {};
  const testsuite: any[] = testsuites.testsuite;

  const errors =
    testsuite
      ?.map((test: any) => safeParseInt(test['$'].errors))
      .reduce((acc: number, curr: number) => acc + curr, 0) || 0;

  const skipped =
    testsuite
      ?.map((test: any) => safeParseInt(test['$'].skipped))
      .reduce((acc: number, curr: number) => acc + curr, 0) || 0;

  const tests =
    testsuite
      ?.map((test: any) => safeParseInt(test['$'].tests))
      .reduce((acc: number, curr: number) => acc + curr, 0) || 0;

  const failures =
    testsuite
      ?.map((test: any) => safeParseInt(test['$'].failures))
      .reduce((acc: number, curr: number) => acc + curr, 0) || 0;

  const time =
    testsuite
      ?.map((test: any) => safeParseFloat(test['$'].time))
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
    tests: safeParseInt(main.tests) || tests,
    failures: {
      count: safeParseInt(main.failures) || failures,
      info: failureCase,
    },
    errors: safeParseInt(main.errors) || errors,
    skipped: safeParseInt(main.skipped) || skipped,
    time: `${(safeParseFloat(main.time) || time).toFixed(2)}s`,
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

export const parse = async (path: string): Promise<Junit | undefined> => {
  if (!path || path === '') {
    core.info('no junit file/folder specified');
    return undefined;
  }
  if (fs.lstatSync(path).isFile()) {
    return parseFile(path);
  } else if (fs.lstatSync(path).isDirectory()) {
    return parseFolder(path);
  }
};

const parseFile = async (file: string): Promise<Junit | undefined> => {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', async (err: NodeJS.ErrnoException | null, data: string) => {
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
    });
  });
};

const parseFolder = async (folder: string): Promise<Junit | undefined> => {
  const mergedTestSuites: any = {
    $: {},
    testsuite: [],
  };
  const files = fs.readdirSync(folder);
  for (const file of files) {
    try {
      if (file.endsWith('.xml')) {
        const filePath = `${folder}/${file}`;
        const testSuiteArray = await getTestsuiteList(filePath);
        if (testSuiteArray.length === 0) {
          core.warning(`No tests found in file: ${filePath}`);
        } else {
          mergedTestSuites.testsuite.push(...testSuiteArray);
        }
      }
    } catch (error) {
      core.error(
        `failed to parse folder file: ${folder}/${file}. error: ${error.message}`,
      );
    }
  }
  mergedTestSuites.$ = buildMainContent(mergedTestSuites.testsuite);
  return unpackage(mergedTestSuites);
};

const getTestsuiteList = async (filename: string) => {
  try {
    const testsuiteList: any[] = [];
    const xmlContent = fs.readFileSync(filename, 'utf8');
    const parseResult = await parseString.parseStringPromise(xmlContent);
    if (Object.keys(parseResult)?.[0] === 'testsuite') {
      testsuiteList.push(parseResult.testsuite);
    } else if (Object.keys(parseResult)?.[0] === 'testsuites') {
      for (const testsuite of parseResult.testsuites.testsuite) {
        testsuiteList.push(testsuite);
      }
    }
    return testsuiteList;
  } catch (error) {
    core.error(`failed to read file: ${filename}. error: ${error.message}`);
    return [];
  }
};

const buildMainContent = (testSuiteList: any[]) => {
  const main = {
    tests: 0,
    failures: 0,
    errors: 0,
    skipped: 0,
    name: '',
    time: 0,
  };
  for (const testSuite of testSuiteList) {
    main.tests += +testSuite.$.tests;
    main.failures += +testSuite.$.failures;
    main.errors += +testSuite.$.errors;
    main.skipped += +testSuite.$.skipped;
    if (main.time < +testSuite.$.time) {
      main.time = +testSuite.$.time;
    }
  }
  return {
    tests: `${main.tests}`,
    failures: `${main.failures}`,
    errors: `${main.errors}`,
    skipped: `${main.skipped}`,
    name: '',
    time: `${main.time}`,
  };
};
