import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/**"] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
  },
  {
    files: ["tests/**", "vite.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
];
