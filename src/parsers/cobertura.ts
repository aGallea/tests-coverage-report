/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { CoverInfo, CoverInfoBranchesDetails } from '../types';
import parseString from 'xml2js';
import * as core from '@actions/core';

const classesFromPackages = (packages: any) => {
  const classes: any[] = [];

  packages.forEach((packages: any) => {
    packages.package.forEach((pack: any) => {
      pack.classes.forEach((c: any) => {
        classes.push(...c.class);
      });
    });
  });

  return classes;
};

const extractLcovStyleBranches = (c: any) => {
  const branches: CoverInfoBranchesDetails[] = [];

  if (c.lines && c.lines[0].line) {
    c.lines[0].line.forEach((l: any) => {
      if (l.$.branch == 'true') {
        const branchFraction = l.$['condition-coverage'].split(' ');
        const branchStats = branchFraction[1].match(/\d+/g);
        const coveredBranches = Number(branchStats[0]);
        const totalBranches = Number(branchStats[1]);
        const leftBranches = totalBranches - coveredBranches;
        let branchNumber = 0;

        for (let i = 0; i < leftBranches; i++) {
          branches.push({
            line: Number(l.$.number),
            branch: branchNumber,
            taken: 0,
          });
          branchNumber++;
        }

        for (let i = 0; i < coveredBranches; i++) {
          branches.push({
            line: Number(l.$.number),
            branch: branchNumber,
            taken: 1,
          });
          branchNumber++;
        }
      }
    });
  }

  return branches;
};

const unpackage = (coverage: any): CoverInfo[] => {
  const packages = coverage.packages;
  // const source = coverage.sources[0].source[0];

  const classes = classesFromPackages(packages);
  return classes.map((c) => {
    const branches = extractLcovStyleBranches(c);
    const classCov: CoverInfo = {
      title: c.$.name,
      file: c.$.filename,
      functions: {
        found: c.methods && c.methods[0].method ? c.methods[0].method.length : 0,
        hit: 0,
        details:
          !c.methods || !c.methods[0].method
            ? []
            : c.methods[0].method.map((m: any) => {
                return {
                  name: m.$.name,
                  line: Number(m.lines[0].line[0].$.number),
                  hit: Number(m.lines[0].line[0].$.hits),
                };
              }),
      },
      lines: {
        found: c.lines && c.lines[0].line ? c.lines[0].line.length : 0,
        hit: 0,
        details:
          !c.lines || !c.lines[0].line
            ? []
            : c.lines[0].line.map((l: any) => {
                return {
                  line: Number(l.$.number),
                  hit: Number(l.$.hits),
                };
              }),
      },
      branches: {
        found: branches.length,
        hit: branches.filter((br) => {
          return br.taken > 0;
        }).length,
        details: branches,
      },
    };

    classCov.functions.hit = classCov.functions.details.reduce((acc: any, val: any) => {
      return acc + (val.hit > 0 ? 1 : 0);
    }, 0);

    classCov.lines.hit = classCov.lines.details.reduce((acc: any, val: any) => {
      return acc + (val.hit > 0 ? 1 : 0);
    }, 0);

    return classCov;
  });
};

const parseContent = (xml: string): Promise<CoverInfo[]> => {
  return new Promise((resolve, reject) => {
    parseString.parseString(xml, (err, parseResult) => {
      if (err) {
        return reject(err);
      }
      if (!parseResult?.coverage) {
        return reject(new Error('invalid or missing xml content'));
      }
      const result = unpackage(parseResult.coverage);
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
              // console.log('====== cobertura ======');
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
