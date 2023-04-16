import { parseFile } from '../../src/parsers/jacoco';

describe('jacoco parser tests', () => {
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
    const parsed = await parseFile('./test/assets/jacoco.xml');
    expect(parsed).toHaveLength(4);
    expect(parsed[0].file).toEqual('net/cover/report/a/ClassA1.java');
    expect(parsed[0].functions.found).toEqual(2);
    expect(parsed[0].functions.hit).toEqual(2);
    expect(parsed[0].functions.details).toHaveLength(5);
    expect(parsed[0].functions.details[0].name).toEqual('<init>');
    expect(parsed[0].functions.details[0].line).toEqual(25);
    expect(parsed[0].functions.details[0].hit).toEqual(1);
    expect(parsed[0].lines.found).toEqual(4);
    expect(parsed[0].lines.hit).toEqual(4);
    expect(parsed[0].lines.details).toHaveLength(4);
    expect(parsed[0].lines.details[0].line).toEqual(25);
    expect(parsed[0].lines.details[0].hit).toEqual(3);
    expect(parsed[0].lines.details[3].line).toEqual(32);
    expect(parsed[0].lines.details[3].hit).toEqual(2);

    expect(parsed[2].file).toEqual('net/cover/report/b/ClassB1.java');
    expect(parsed[2].functions.found).toEqual(18);
    expect(parsed[2].functions.hit).toEqual(17);
    expect(parsed[2].branches.found).toEqual(20);
    expect(parsed[2].branches.hit).toEqual(16);
    expect(parsed[2].branches.details).toHaveLength(20);
    expect(parsed[2].branches.details[0].block).toEqual(0);
    expect(parsed[2].branches.details[0].line).toEqual(56);
    expect(parsed[2].branches.details[0].branch).toEqual(0);
    expect(parsed[2].branches.details[0].taken).toEqual(1);
    expect(parsed[2].branches.details[10].block).toEqual(0);
    expect(parsed[2].branches.details[10].line).toEqual(147);
    expect(parsed[2].branches.details[10].branch).toEqual(2);
    expect(parsed[2].branches.details[10].taken).toEqual(1);
  });
});
