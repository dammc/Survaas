// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: [
        "**/docs/**",          
        "**/cdk.out/**",
        "**/dist/**",        
        "**/node_modules/**",
        "**/build/**",
        "**jest.**",
      ],
  },
  {
    files: ['test/**/*.ts'],
    languageOptions: {
      globals: {
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        test: 'readonly',
      },
    },
  },
);

