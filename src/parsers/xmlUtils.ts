import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import * as core from '@actions/core';

const baseOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: true,
  trimValues: true,
};

export const createXmlParser = (arrayPaths: string[]): XMLParser => {
  return new XMLParser({
    ...baseOptions,
    isArray: (_tagName: string, jPath: string) => {
      return arrayPaths.some((path) => jPath.endsWith(path));
    },
  });
};

export const readAndParseXmlFile = <T>(
  file: string,
  parserName: string,
  parseFn: (data: string) => T,
): Promise<T | []> => {
  return new Promise((resolve, reject) => {
    if (!file || file === '') {
      core.info(`no ${parserName} file specified`);
      resolve([]);
    } else {
      fs.readFile(file, 'utf8', (err: NodeJS.ErrnoException | null, data: string) => {
        if (err) {
          core.error(`failed to read file: ${file}. error: ${err.message}`);
          reject(err);
        } else {
          try {
            const info = parseFn(data);
            resolve(info);
          } catch (error) {
            core.error(
              `failed to parseContent. err: ${error instanceof Error ? error.message : String(error)}`,
            );
            reject(error);
          }
        }
      });
    }
  });
};
