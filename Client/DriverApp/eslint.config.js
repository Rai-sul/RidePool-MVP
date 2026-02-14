// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["jest.setup.js", "jest.environment.js", "**/__tests__/**"],
    languageOptions: {
      globals: {
        jest: "readonly",
      },
    },
  },
]);
