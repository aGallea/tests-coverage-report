import { execCommand, execFileCommand } from '../src/utils';

describe('Utils tests', () => {
  test('exec command success', async () => {
    const commitsShaExec = await execCommand(`git log --oneline | cut -f1 -d' '`);
    expect(commitsShaExec.status).toEqual('success');
  });
  test('exec command error', async () => {
    const commitsShaExec = await execCommand('some bad command');
    expect(commitsShaExec.status).toEqual('error');
  });
});

describe('execFileCommand tests', () => {
  test('exec file command success', async () => {
    const result = await execFileCommand('git', ['log', '--oneline', '-1']);
    expect(result.status).toEqual('success');
    expect(result.stdout).toBeDefined();
  });

  test('exec file command error for invalid command', async () => {
    const result = await execFileCommand('nonexistent-command-xyz', []);
    expect(result.status).toEqual('error');
  });

  test('exec file command error for invalid arguments', async () => {
    const result = await execFileCommand('git', ['--invalid-flag-xyz']);
    expect(result.status).toEqual('error');
  });

  test('does not execute shell metacharacters', async () => {
    const result = await execFileCommand('echo', ['hello; echo injected']);
    expect(result.status).toEqual('success');
    expect(result.stdout?.trim()).toEqual('hello; echo injected');
  });

  test('does not expand subshell commands', async () => {
    const result = await execFileCommand('echo', ['$(whoami)']);
    expect(result.status).toEqual('success');
    expect(result.stdout?.trim()).toEqual('$(whoami)');
  });
});
