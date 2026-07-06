import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "tmp/**",
    ".next-build/**",
    "app/_payload_disabled/**",
    "app/app.js",
    "public/assets/js/**",
    "next-env.d.ts",
    "**/*-PY.*",
    "**/*.bak",
    "**/*.backup*",
    "**/*backup*",
    "**/*.before-*",
    "**/*.tsbuildinfo",
  ]),
]);

export default eslintConfig;
