const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    ignores: ["node_modules/", ".next/", ".git/", "coverage/", "build/", "dist/", ".vscode/", ".idea/", "*.log"],
  },
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals"),
];
