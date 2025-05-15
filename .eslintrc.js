/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "next",
    "next/core-web-vitals",
    "plugin:prettier/recommended", // enables eslint-plugin-prettier + eslint-config-prettier
  ],
  plugins: ["prettier"],
  rules: {
    // Your custom ESLint rules here
    "prettier/prettier": "error",
  },
}
