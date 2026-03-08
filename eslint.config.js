import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactnative from 'eslint-plugin-react-native';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      indent: ['error', 2],
      '@typescript-eslint/indent': ['error', 2],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error'],
    },
  },
  {
    files: ['**/*.jsx', '**/*.tsx'],
    plugins: {
      react,
    },
    rules: {
      ...react.configs.recommended.rules,
      indent: ['error', 2],
      'react/react-in-jsx-scope': 'off', // for React 17+
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['frontend/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react-native': reactnative,
    },
    rules: {
      ...reactnative.configs.recommended.rules,
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'expo-env.d.ts',
      '**/tsconfig.json',
      '**/package.json',
      '**/package-lock.json',
    ],
  },
];