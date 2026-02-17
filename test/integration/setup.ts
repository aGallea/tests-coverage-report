import { execFileSync } from 'node:child_process';

const findBinary = (name: string): string | undefined => {
  try {
    return execFileSync('which', [name], {
      encoding: 'utf8',
      timeout: 5000,
    }).trim();
  } catch {
    return undefined;
  }
};

// Resolve the system `act` binary (e.g. from Homebrew) before @kie/act-js loads.
// The library reads ACT_BINARY at require-time; the bundled binary may use an
// incompatible Docker API version.
const systemAct = findBinary('act');
if (systemAct) {
  process.env.ACT_BINARY = systemAct;
}
