import { parseFile } from '../../src/parsers/clover';

describe('clover parser tests', () => {
  test('No such file', async () => {
    await expect(parseFile('invalid.file')).rejects.toThrow(
      `ENOENT: no such file or directory, open 'invalid.file'`,
    );
  });
  test('Filename empty string', async () => {
    await expect(parseFile('')).resolves.toEqual([]);
  });
  test('Invalid xml content', async () => {
    await expect(parseFile('./test/assets/invalid.xml')).rejects.toThrow(
      'invalid or missing xml content',
    );
  });
  test('error xml content', async () => {
    await expect(parseFile('./test/assets/invalidXmlContent.xml')).rejects.toThrow(
      'Non-whitespace before first tag.\nLine: 0\nColumn: 1\nChar: s',
    );
  });

  test('Parse', async () => {
    const parsed = await parseFile('./test/assets/clover.xml');
    expect(parsed).toHaveLength(12);
    expect(parsed[0].file).toEqual('changedFiles.ts');
    expect(parsed[0].functions.found).toEqual(0);
    expect(parsed[0].functions.hit).toEqual(0);
    expect(parsed[0].functions.details).toHaveLength(0);
    expect(parsed[0].lines.found).toEqual(46);
    expect(parsed[0].lines.hit).toEqual(5);
    expect(parsed[0].lines.details).toHaveLength(46);
    expect(parsed[0].lines.details[0].line).toEqual(1);
    expect(parsed[0].lines.details[0].hit).toEqual(1);
    expect(parsed[0].lines.details[5].line).toEqual(6);
    expect(parsed[0].lines.details[5].hit).toEqual(0);

    expect(parsed[2].file).toEqual('diffCover.ts');
    expect(parsed[2].lines.found).toEqual(92);
    expect(parsed[2].lines.hit).toEqual(17);
    expect(parsed[2].lines.details).toHaveLength(92);
    expect(parsed[2].functions.found).toEqual(0);
    expect(parsed[2].functions.hit).toEqual(0);
    expect(parsed[2].branches.found).toEqual(0);
    expect(parsed[2].branches.hit).toEqual(0);
    expect(parsed[2].branches.details).toHaveLength(0);
  });
});
