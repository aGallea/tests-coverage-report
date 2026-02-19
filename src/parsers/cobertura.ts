import path from 'path';
import { CoverInfo, CoverInfoBranchesDetails } from '../types';
import { createXmlParser, readAndParseXmlFile } from './xmlUtils';

const COBERTURA_ARRAY_PATHS = [
  'coverage.packages.package',
  'package.classes.class',
  'class.methods.method',
  'class.lines.line',
  'method.lines.line',
  'coverage.sources.source',
];

const parser = createXmlParser(COBERTURA_ARRAY_PATHS);

const classesFromPackages = (packages: any[]) => {
  const classes: any[] = [];
  packages.forEach((pack: any) => {
    pack.classes.class.forEach((c: any) => {
      classes.push(c);
    });
  });
  return classes;
};

const extractLcovStyleBranches = (c: any) => {
  const branches: CoverInfoBranchesDetails[] = [];

  if (c.lines && c.lines.line) {
    c.lines.line.forEach((l: any) => {
      if (l.branch === true || l.branch === 'true') {
        const branchFraction = l['condition-coverage'].split(' ');
        const branchStats = branchFraction[1].match(/\d+/g);
        const coveredBranches = Number(branchStats[0]);
        const totalBranches = Number(branchStats[1]);
        const leftBranches = totalBranches - coveredBranches;
        let branchNumber = 0;

        for (let i = 0; i < leftBranches; i++) {
          branches.push({
            line: Number(l.number),
            branch: branchNumber,
            taken: 0,
          });
          branchNumber++;
        }

        for (let i = 0; i < coveredBranches; i++) {
          branches.push({
            line: Number(l.number),
            branch: branchNumber,
            taken: 1,
          });
          branchNumber++;
        }
      }
    });
  }

  return branches;
};

const unpackage = (coverage: any, pwd: string): CoverInfo[] => {
  const packages = coverage.packages.package;
  const source = coverage.sources.source[0];

  const classes = classesFromPackages(packages);
  return classes.map((c) => {
    const branches = extractLcovStyleBranches(c);
    const classCov: CoverInfo = {
      title: c.name,
      file: path.join(source, c.filename).replace(pwd, ''),
      functions: {
        found: c.methods && c.methods.method ? c.methods.method.length : 0,
        hit: 0,
        details:
          !c.methods || !c.methods.method
            ? []
            : c.methods.method.map((m: any) => {
                return {
                  name: m.name,
                  line: Number(m.lines.line[0].number),
                  hit: Number(m.lines.line[0].hits),
                };
              }),
      },
      lines: {
        found: c.lines && c.lines.line ? c.lines.line.length : 0,
        hit: 0,
        details:
          !c.lines || !c.lines.line
            ? []
            : c.lines.line.map((l: any) => {
                return {
                  line: Number(l.number),
                  hit: Number(l.hits),
                };
              }),
      },
      branches: {
        found: branches.length,
        hit: branches.filter((br) => {
          return br.taken > 0;
        }).length,
        details: branches,
      },
    };

    classCov.functions.hit = classCov.functions.details.reduce((acc: any, val: any) => {
      return acc + (val.hit > 0 ? 1 : 0);
    }, 0);

    classCov.lines.hit = classCov.lines.details.reduce((acc: any, val: any) => {
      return acc + (val.hit > 0 ? 1 : 0);
    }, 0);

    return classCov;
  });
};

const parseContent = (xml: string, pwd: string): CoverInfo[] => {
  const parseResult = parser.parse(xml);
  if (!parseResult?.coverage) {
    throw new Error('invalid or missing xml content');
  }
  return unpackage(parseResult.coverage, pwd);
};

export const parseFile = async (file: string, pwd: string): Promise<CoverInfo[]> => {
  return readAndParseXmlFile(file, 'cobertura', (data) => parseContent(data, pwd));
};
