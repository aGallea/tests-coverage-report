import { getChangedFiles } from './changedFiles';
import { CoverageTypeInfo, DiffInfo, EventInfo } from './types';
import { getEventInfo } from './eventInfo';
import { diffCover } from './diffCover';
import { parseFile as parseLcovFile } from './parsers/lcov';
import { parseFile as parseCoberturaFile } from './parsers/cobertura';
import { parseFile as parseCloverFile } from './parsers/clover';
import { parseFile as parseJacocoFile } from './parsers/jacoco';
import { parse as parseJunit } from './parsers/junit';
import { buildBody, commentCoverage } from './commentCoverage';
import * as core from '@actions/core';

export const main = async (): Promise<void> => {
  try {
    const eventInfo: EventInfo = getEventInfo();
    const coverageInfo: CoverageTypeInfo = {
      cobertura:
        eventInfo.diffcoverRef === 'cobertura'
          ? await parseCoberturaFile(eventInfo.coberturaPath, `${eventInfo.pwd}/`)
          : [],
      clover:
        eventInfo.diffcoverRef === 'clover'
          ? await parseCloverFile(eventInfo.cloverPath)
          : [],
      lcov:
        eventInfo.diffcoverRef === 'lcov' ? await parseLcovFile(eventInfo.lcovPath) : [],
      jacoco:
        eventInfo.diffcoverRef === 'jacoco'
          ? await parseJacocoFile(eventInfo.jacocoPath)
          : [],
      junit: eventInfo.showJunit ? await parseJunit(eventInfo.junitPath) : undefined,
    };
    const changedFile = await getChangedFiles(eventInfo);

    const diffInfo: DiffInfo[] = await diffCover(eventInfo, changedFile, coverageInfo);
    await commentCoverage(eventInfo, buildBody(eventInfo, coverageInfo.junit, diffInfo));
  } catch (error) {
    core.setFailed(error.message);
  }
};
