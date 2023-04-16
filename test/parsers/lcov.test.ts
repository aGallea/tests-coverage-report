import { parseFile } from '../../src/parsers/lcov';

describe('lcov parser tests', () => {
  test('No such file', async () => {
    await expect(parseFile('invalid.file')).rejects.toThrow(
      `ENOENT: no such file or directory, open 'invalid.file'`,
    );
  });
  test('Filename empty string', async () => {
    await expect(parseFile('')).resolves.toEqual([]);
  });
  test('Invalid content', async () => {
    await expect(parseFile('./test/assets/invalid.xml')).resolves.toEqual([]);
  });

  test('Parse', async () => {
    const parsed = await parseFile('./test/assets/lcov.info');
    expect(parsed).toHaveLength(5);
    expect(parsed[0].file).toEqual('src/changedFiles.ts');
    expect(parsed[0].functions.found).toEqual(1);
    expect(parsed[0].functions.hit).toEqual(0);
    expect(parsed[0].functions.details).toHaveLength(1);
    expect(parsed[0].functions.details[0].name).toEqual('getChangedFiles');
    expect(parsed[0].functions.details[0].line).toEqual(5);
    expect(parsed[0].functions.details[0].hit).toEqual(0);
    expect(parsed[0].lines.found).toEqual(46);
    expect(parsed[0].lines.hit).toEqual(5);
    expect(parsed[0].lines.details).toHaveLength(10);
    expect(parsed[0].lines.details[0].line).toEqual(1);
    expect(parsed[0].lines.details[0].hit).toEqual(1);
    expect(parsed[0].lines.details[5].line).toEqual(6);
    expect(parsed[0].lines.details[5].hit).toEqual(0);

    expect(parsed[2].file).toEqual('src/diffCover.ts');
    expect(parsed[2].functions.found).toEqual(2);
    expect(parsed[2].functions.hit).toEqual(1);
    expect(parsed[2].branches.found).toEqual(1);
    expect(parsed[2].branches.hit).toEqual(1);
    expect(parsed[2].branches.details).toHaveLength(1);
    expect(parsed[2].branches.details[0].block).toEqual(0);
    expect(parsed[2].branches.details[0].line).toEqual(4);
    expect(parsed[2].branches.details[0].branch).toEqual(0);
    expect(parsed[2].branches.details[0].taken).toEqual(1);
  });
});
