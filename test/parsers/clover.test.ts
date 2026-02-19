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
    await expect(parseFile('./test/assets/invalidXmlContent.xml')).rejects.toThrow();
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

  test('Parse file with class elements and method-type lines', async () => {
    const parsed = await parseFile('./test/assets/clover-with-classes.xml');
    expect(parsed).toHaveLength(2);

    const calculator = parsed[0];
    expect(calculator.title).toEqual('Calculator');
    expect(calculator.file).toEqual('Calculator.java');

    expect(calculator.functions.found).toEqual(2);
    expect(calculator.functions.hit).toEqual(1);
    expect(calculator.functions.details).toHaveLength(2);
    expect(calculator.functions.details[0]).toEqual({
      name: 'add',
      line: 3,
      hit: 1,
    });
    expect(calculator.functions.details[1]).toEqual({
      name: 'subtract',
      line: 8,
      hit: 0,
    });

    expect(calculator.lines.found).toEqual(4);
    expect(calculator.lines.hit).toEqual(2);
    expect(calculator.lines.details).toHaveLength(4);
    expect(calculator.lines.details[0]).toEqual({ line: 4, hit: 5 });
    expect(calculator.lines.details[1]).toEqual({ line: 5, hit: 5 });
    expect(calculator.lines.details[2]).toEqual({ line: 9, hit: 0 });
    expect(calculator.lines.details[3]).toEqual({ line: 10, hit: 0 });

    expect(calculator.branches.found).toEqual(0);
    expect(calculator.branches.hit).toEqual(0);

    const main = parsed[1];
    expect(main.title).toBeNull();
    expect(main.file).toEqual('Main.java');
    expect(main.functions.found).toEqual(0);
    expect(main.functions.hit).toEqual(0);
    expect(main.functions.details).toHaveLength(0);
    expect(main.lines.found).toEqual(4);
    expect(main.lines.hit).toEqual(2);
    expect(main.lines.details).toHaveLength(4);
  });
});
