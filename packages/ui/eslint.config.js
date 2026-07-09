import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "*.config.ts",
      "*.config.js",
      "*.config.cjs",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@atlas/dashboard", "@atlas/freight-comparer", "@atlas/bpmn-modeler"],
          message: "El paquete genérico @atlas/ui no debe importar desde paquetes específicos del dominio."
        }]
      }],
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    plugins: {
      react,
    },
    settings: {
      react: {
        version: "19.0",
      },
    },
  },
);
