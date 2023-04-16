import { exec, ExecException } from 'node:child_process';
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
