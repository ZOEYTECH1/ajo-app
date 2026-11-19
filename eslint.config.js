// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // eslint-config-expo's react-hooks rules (v6) include the React
    // Compiler-era checks -- this app doesn't use React Compiler
    // (no babel-plugin-react-compiler), so patterns these rules flag as
    // unsafe (e.g. the long-standing "ref holds latest callback" idiom:
    // `ref.current = value` during render) are correct and safe under
    // the standard runtime this app actually targets. Downgraded to
    // warn rather than disabled, so real findings stay visible -- if
    // Compiler adoption happens later, re-promote to error then.
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
