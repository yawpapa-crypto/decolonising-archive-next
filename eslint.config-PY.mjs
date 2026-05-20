import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler lint rules — off until workbench/admin UIs are refactored
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  globalIgnores([
    ".next/**",
    ".next-build/**",
    "tmp/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/assets/js/Backup/**",
    "public/assets/js/NewBK/**",
  ]),
]);

export default eslintConfig;
