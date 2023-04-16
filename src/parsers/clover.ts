/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { CoverInfo, CoverInfoFunctionsDetails, CoverInfoLinesDetails } from '../types';
import parseString from 'xml2js';
import * as core from '@actions/core';

const classDetailsFromProjects = (projects: any) => {
  let classDetails: any[] = [];
  let packageName = null;

  const parseFileObject = (fileObj: any, packageName: string) => {
    if (fileObj.class) {
      fileObj['class'].forEach((classObj: any) => {
        classDetails = classDetails.concat({
          name: classObj.$.name,
          metrics: classObj.metrics[0],
          fileName: fileObj.$.name,
          fileMetrics: fileObj.metrics[0],
          lines: fileObj.line,
          packageName: packageName,
        });
      });
    } else {
      classDetails = classDetails.concat({
        name: null,
        metrics: null,
        fileName: fileObj.$.name,
        fileMetrics: fileObj.metrics[0],
        lines: fileObj.line,
        packageName: packageName,
      });
    }
  };

  projects.forEach((projectObj: any) => {
    if (projectObj.package) {
      projectObj.package.forEach((data: any) => {
        if (data.$?.name) {
          packageName = data.$.name;
        } else {
          packageName = null;
        }
        data.file.forEach(parseFileObject);
      });
    }
    if (projectObj.file) {
      packageName = null;
      projectObj.file.forEach(parseFileObject);
    }
  });
  return classDetails;
};

const unpackage = (projects: any): CoverInfo[] => {
  const classDetails = classDetailsFromProjects(projects);

  return classDetails.map((c: any) => {
    const methodStats: CoverInfoFunctionsDetails[] = [];
    const lineStats: CoverInfoLinesDetails[] = [];

    if (c.lines) {
      c.lines.forEach((l: any) => {
        if (l.$.type === 'method') {
          methodStats.push({
            name: l.$.name,
            line: Number(l.$.num),
            hit: Number(l.$.count),
          });
        } else {
          lineStats.push({
            line: Number(l.$.num),
            hit: Number(l.$.count),
          });
        }
      });
    }

    const classCov: CoverInfo = {
      title: c.name,
      file: c.fileName,
      functions: {
        found: methodStats.length,
        hit: 0,
        details: methodStats,
      },
      lines: {
        found: lineStats.length,
        hit: 0,
        details: lineStats,
      },
      branches: {
        found: 0,
        hit: 0,
        details: [],
      },
    };

    classCov.functions.hit = classCov.functions.details.reduce((acc, val) => {
      return acc + (val.hit > 0 ? 1 : 0);
    }, 0);

    classCov.lines.hit = classCov.lines.details.reduce((acc, val) => {
      return acc + (val.hit > 0 ? 1 : 0);
    }, 0);

    return classCov;
  });
};

const parseContent = (xml: any): Promise<CoverInfo[]> => {
  return new Promise((resolve, reject) => {
    parseString.parseString(xml, (err, parseResult) => {
      if (err) {
        reject(err);
      }
      if (!parseResult?.coverage?.project) {
        return reject(new Error('invalid or missing xml content'));
      }
      const result = unpackage(parseResult.coverage.project);
      resolve(result);
    });
  });
};

export const parseFile = async (file: string): Promise<CoverInfo[]> => {
  return new Promise((resolve, reject) => {
    if (!file || file === '') {
      core.info('no file specified');
      resolve([]);
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
              // console.log('====== clover ======');
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
