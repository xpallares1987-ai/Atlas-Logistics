/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },
];
