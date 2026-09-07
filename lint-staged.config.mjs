import { relative } from 'node:path';

const command = (binary, files) =>
  `${binary} ${files.map((file) => JSON.stringify(file)).join(' ')}`;

export default {
  '{src,tests}/**/*.ts': (files) => [
    command('prettier --write', files),
    command('eslint --max-warnings=0', files),
  ],
  'web/**/*.{ts,tsx}': (files) => [
    command('prettier --write', files),
    command('node scripts/lint-web-staged.mjs', files),
  ],
  '{.github,web/app}/**/*.{css,yml,yaml}': (files) =>
    command('prettier --write', files),
  '*.{cjs,mjs,json,yml,yaml}': (files) => command('prettier --write', files),
  'web/*.{json,mjs}': (files) => command('prettier --write', files),
};
