/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { CoverInfo } from '../types';
import * as core from '@actions/core';

const parseContent = (str: string): CoverInfo[] => {
  const data: any[] = [];
  let item: CoverInfo;

  ['end_of_record'].concat(str.split('\n')).forEach((line: string) => {
    line = line.trim();
    const allparts: string[] = line.split(':') || [];
    const parts: string[] = [allparts.shift() || '', allparts.join(':')];
    let lines: any[];
    let fn: any;

    switch (parts[0].toUpperCase()) {
      case 'TN':
        item.title = parts[1].trim();
        break;
      case 'SF':
        item.file = parts.slice(1).join(':').trim();
        break;
      case 'FNF':
        item.functions.found = Number(parts[1].trim());
        break;
      case 'FNH':
        item.functions.hit = Number(parts[1].trim());
        break;
      case 'LF':
        item.lines.found = Number(parts[1].trim());
        break;
      case 'LH':
        item.lines.hit = Number(parts[1].trim());
        break;
      case 'DA':
        lines = parts[1].split(',');
        item.lines.details.push({
          line: Number(lines[0]),
          hit: Number(lines[1]),
        });
        break;
      case 'FN':
        fn = parts[1].split(',');
        item.functions.details.push({
          name: fn[1],
          line: Number(fn[0]),
          hit: 0,
        });
        break;
      case 'FNDA':
        fn = parts[1].split(',');
        item.functions.details.some((i: any, k: any) => {
          if (i.name === fn[1] && i.hit === undefined) {
            item.functions.details[k].hit = Number(fn[0]);
            return true;
          }
        });
        break;
      case 'BRDA':
        fn = parts[1].split(',');
        item.branches.details.push({
          line: Number(fn[0]),
          block: Number(fn[1]),
          branch: Number(fn[2]),
          taken: fn[3] === '-' ? 0 : Number(fn[3]),
        });
        break;
      case 'BRF':
        item.branches.found = Number(parts[1]);
        break;
      case 'BRH':
        item.branches.hit = Number(parts[1]);
        break;
    }

    if (line === 'end_of_record') {
      if (item) {
        data.push(item);
      }
      item = {
        title: '',
        file: '',
        lines: {
          found: 0,
          hit: 0,
          details: [],
        },
        functions: {
          hit: 0,
          found: 0,
          details: [],
        },
        branches: {
          hit: 0,
          found: 0,
          details: [],
        },
      };
    }
  });

  if (!data.length) {
    core.info('No lcov file content');
  }
  return data;
};

export function parseFile(file: string): Promise<CoverInfo[]> {
  return new Promise((resolve, reject) => {
    if (!file || file === '') {
      core.info('no lcov file specified');
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
              const info = parseContent(data);
              // console.log('====== lcov ======');
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
}
