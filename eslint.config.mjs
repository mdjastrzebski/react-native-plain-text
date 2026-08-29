import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    // `prettier` here is eslint-config-prettier: it only turns off stylistic
    // rules that would conflict with the formatter (oxfmt).
    extends: fixupConfigRules(compat.extends('@react-native', 'prettier')),
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    // The example app uses inline styles on purpose: each demo shows the exact
    // style being exercised right next to the element it applies to.
    files: ['example/**'],
    rules: {
      'react-native/no-inline-styles': 'off',
    },
  },
  {
    ignores: ['node_modules/', 'lib/', 'references/', 'android/build/', 'docs/'],
  },
]);
