import { execCommand } from '../src/utils';

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
