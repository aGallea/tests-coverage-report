import { exec, execFile, ExecException } from 'node:child_process';
import * as core from '@actions/core';

export interface ExecInfo {
  status: 'error' | 'success';
  message?: string;
  errorCode?: number;
  stdout?: string;
}

export const execCommand = async (command: string): Promise<ExecInfo> => {
  return new Promise((resolve) => {
    exec(command, (error: ExecException | null, stdout: string) => {
      if (error) {
        core.error(`could not execute command: ${command}. error: ${error.message}`);
        return resolve({
          status: 'error',
          message: error.message,
          errorCode: error.code,
        });
      }
      resolve({
        status: 'success',
        stdout,
      });
    });
  });
};

export const execFileCommand = async (
  file: string,
  args: string[],
): Promise<ExecInfo> => {
  return new Promise((resolve) => {
    execFile(file, args, (error: ExecException | null, stdout: string) => {
      if (error) {
        core.error(
          `could not execute command: ${file} ${args.join(' ')}. error: ${error.message}`,
        );
        return resolve({
          status: 'error',
          message: error.message,
          errorCode: typeof error.code === 'number' ? error.code : undefined,
        });
      }
      resolve({
        status: 'success',
        stdout,
      });
    });
  });
};
