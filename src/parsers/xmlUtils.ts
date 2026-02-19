import fs from 'fs';
import { CoverInfo } from '../types';
import * as core from '@actions/core';

export const readAndParseXmlFile = (
  file: string,
  parserName: string,
  parseContentFn: (data: string) => Promise<CoverInfo[]>,
): Promise<CoverInfo[]> => {
  return new Promise((resolve, reject) => {
    if (!file || file === '') {
      core.info(`no ${parserName} file specified`);
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
              const info = await parseContentFn(data);
              resolve(info);
            } catch (error) {
              core.error(
                `failed to parseContent. err: ${error instanceof Error ? error.message : String(error)}`,
              );
              reject(error);
            }
          }
        },
      );
    }
  });
};
