import fs from 'fs';
import { CoverInfo } from '../types';
import parseString from 'xml2js';
import * as core from '@actions/core';

const getCounter = (source: any, type: string) => {
  source.counter = source.counter || [];
  return (
    source.counter.filter((counter: any) => {
      return counter.$.type === type;
    })[0] || {
      $: {
        covered: 0,
        missed: 0,
      },
    }
  );
};

const unpackage = (report: any): CoverInfo[] => {
  const packages = report.package;

  let output: CoverInfo[] = [];

  packages.forEach((pack: any) => {
    const cov = pack.sourcefile.map((source: any) => {
      const fullPath = pack.$.name + '/' + source.$.name;

      const methods = getCounter(source, 'METHOD');
      const lines = getCounter(source, 'LINE');
      const branches = getCounter(source, 'BRANCH');

      const classCov: CoverInfo = {
        title: source.$.name,
        file: fullPath,
        functions: {
          found: Number(methods.$.covered) + Number(methods.$.missed),
          hit: Number(methods.$.covered),
          details: pack.class.reduce((result: any, currentClass: any) => {
            return !currentClass.method
              ? result
              : result.concat(
                  currentClass.method.map((method: any) => {
                    const hit = method.counter.some((counter: any) => {
                      return counter.$.type === 'METHOD' && counter.$.covered === '1';
                    });
                    return {
                      name: method.$.name,
                      line: Number(method.$.line),
                      hit: hit ? 1 : 0,
                    };
                  }),
                );
          }, []),
        },
        lines: {
          found: Number(lines.$.covered) + Number(lines.$.missed),
          hit: Number(lines.$.covered),
          details: !source.line
            ? []
            : source.line.map((l: any) => {
                return {
                  line: Number(l.$.nr),
                  hit: Number(l.$.ci),
                };
              }),
        },
        branches: {
          found: Number(branches.$.covered) + Number(branches.$.missed),
          hit: Number(branches.$.covered),
          details:
            source.line
              ?.filter((l: any) => {
                return Number(l.$.mb) > 0 || Number(l.$.cb) > 0;
              })
              .map((l: any) => {
                let branches: any[] = [];
                const count = Number(l.$.mb) + Number(l.$.cb);

                for (let i = 0; i < count; ++i) {
                  branches = branches.concat({
                    line: Number(l.$.nr),
                    block: 0,
                    branch: Number(i),
                    taken: i < Number(l.$.cb) ? 1 : 0,
                  });
                }
                return branches;
              })
              .flat() || [],
        },
      };

      return classCov;
    });

    output = output.concat(cov);
  });

  return output;
};

const parseContent = (xml: string): Promise<CoverInfo[]> => {
  return new Promise((resolve, reject) => {
    parseString.parseString(xml, (err, parseResult) => {
      if (err) {
        return reject(err);
      }
      if (!parseResult?.report) {
        return reject(new Error('invalid or missing xml content'));
      }
      const result = unpackage(parseResult.report);
      resolve(result);
    });
  });
};

export const parseFile = async (file: string): Promise<CoverInfo[]> => {
  return new Promise((resolve, reject) => {
    if (!file || file === '') {
      core.info('no jacoco file specified');
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
              // console.log('====== jacoco ======');
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
