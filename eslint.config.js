import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: ['src/types/spicetify.d.ts'],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: currentDir,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        Spicetify: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.flat.recommended.rules,
      indent: [
        'error',
        2,
      ],
      'linebreak-style': [
        'error',
        'unix',
      ],
      quotes: [
        'error',
        'single',
        { allowTemplateLiterals: true },
      ],
      semi: [
        'error',
        'always',
      ],
      'comma-dangle': [
        'error',
        'always-multiline',
      ],
      'no-var': 'error',
      'space-before-blocks': 'error',
      'comma-spacing': [
        'error',
        { before: false, after: true },
      ],
      'no-trailing-spaces': 'error',
      'keyword-spacing': 'error',
      'no-multiple-empty-lines': [
        'error',
        { max: 1 },
      ],
      'object-curly-spacing': [
        'error',
        'always',
      ],
      'key-spacing': [
        'error',
        { beforeColon: false, afterColon: true },
      ],
    },
    settings: {
      react: {
        version: '18.3.1',
      },
    },
  },
];
