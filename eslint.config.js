import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';

export default tseslint.config(
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
    ],
    plugins: {
      react: reactPlugin,
    },
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn"],
      "no-console": "off",
    },
  }
);
