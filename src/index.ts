import * as core from '@actions/core';
import { main } from './main';

main()
  .then(() => {
    core.info('success');
  })
  .catch((err) => {
    core.error(`exception. ${err.message}`);
  });
