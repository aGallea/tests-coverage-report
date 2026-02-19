import { CoverInfo, CoverInfoFunctionsDetails, CoverInfoLinesDetails } from '../types';
import { createXmlParser, readAndParseXmlFile } from './xmlUtils';

const CLOVER_ARRAY_PATHS = [
  'coverage.project',
  'project.package',
  'package.file',
  'file.class',
  'file.line',
];

const parser = createXmlParser(CLOVER_ARRAY_PATHS);

const classDetailsFromProjects = (projects: any[]) => {
  let classDetails: any[] = [];
  let packageName: string | null = null;

  const parseFileObject = (fileObj: any, packageName: string | null) => {
    if (fileObj.class) {
      fileObj.class.forEach((classObj: any) => {
        classDetails = classDetails.concat({
          name: classObj.name,
          metrics: classObj.metrics,
          fileName: fileObj.name,
          fileMetrics: fileObj.metrics,
          lines: fileObj.line,
          packageName: packageName,
        });
      });
    } else {
      classDetails = classDetails.concat({
        name: null,
        metrics: null,
        fileName: fileObj.name,
        fileMetrics: fileObj.metrics,
        lines: fileObj.line,
        packageName: packageName,
      });
    }
  };

  projects.forEach((projectObj: any) => {
    if (projectObj.package) {
      projectObj.package.forEach((data: any) => {
        if (data.name) {
          packageName = data.name;
        } else {
          packageName = null;
        }
        data.file.forEach((file: any) => parseFileObject(file, packageName));
      });
    }
    if (projectObj.file) {
      packageName = null;
      projectObj.file.forEach((file: any) => parseFileObject(file, packageName));
    }
  });
  return classDetails;
};

const unpackage = (projects: any[]): CoverInfo[] => {
  const classDetails = classDetailsFromProjects(projects);

  return classDetails.map((c: any) => {
    const methodStats: CoverInfoFunctionsDetails[] = [];
    const lineStats: CoverInfoLinesDetails[] = [];

    if (c.lines) {
      c.lines.forEach((l: any) => {
        if (l.type === 'method') {
          methodStats.push({
            name: l.name,
            line: Number(l.num),
            hit: Number(l.count),
          });
        } else {
          lineStats.push({
            line: Number(l.num),
            hit: Number(l.count),
          });
        }
      });
    }

    const classCov: CoverInfo = {
      title: c.name,
      file: c.fileName,
      functions: {
        found: methodStats.length,
        hit: 0,
        details: methodStats,
      },
      lines: {
        found: lineStats.length,
        hit: 0,
        details: lineStats,
      },
      branches: {
        found: 0,
        hit: 0,
        details: [],
      },
    };

    classCov.functions.hit = classCov.functions.details.reduce((acc, val) => {
      return acc + (val.hit > 0 ? 1 : 0);
    }, 0);

    classCov.lines.hit = classCov.lines.details.reduce((acc, val) => {
      return acc + (val.hit > 0 ? 1 : 0);
    }, 0);

    return classCov;
  });
};

const parseContent = (xml: string): CoverInfo[] => {
  const parseResult = parser.parse(xml);
  if (!parseResult?.coverage?.project) {
    throw new Error('invalid or missing xml content');
  }
  const projects = Array.isArray(parseResult.coverage.project)
    ? parseResult.coverage.project
    : [parseResult.coverage.project];
  return unpackage(projects);
};

export const parseFile = async (file: string): Promise<CoverInfo[]> => {
  return readAndParseXmlFile(file, 'clover', parseContent);
};
