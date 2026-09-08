import { relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const webDirectory = resolve('web');
const files = process.argv.slice(2).map((file) => relative(webDirectory, file));

const result = spawnSync(
  process.execPath,
  [
    resolve(webDirectory, 'node_modules/eslint/bin/eslint.js'),
    '--max-warnings=0',
    ...files,
  ],
  {
    cwd: webDirectory,
    stdio: 'inherit',
  },
);

process.exitCode = result.status ?? 1;
