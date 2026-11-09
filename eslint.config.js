import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

// Effects that must go through a wrapper (see the rule below).
const RESTRICTED_BITS = ["Topography", "Aurora", "Galaxy", "ClickSpark", "Stepper", "SquishSwitch"];

export default [
  {
    ignores: ["dist", "node_modules", ".wrangler", "*.config.js", "*.config.ts"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      // TypeScript handles these.
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-redeclare": "off",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "react/no-unknown-property": ["error", { ignore: ["attributeName", "repeatCount", "dur", "from", "to"] }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["error", "warn"] }],
      "no-debugger": "error",
    },
    settings: {
      react: { version: "detect" },
    },
  },
  {
    // The visual React Bits effects are only used through the wrappers in
    // src/components/fx/ (and ui/switch), which dress them in the design
    // tokens. Direct imports would bring back hard-coded colors.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: RESTRICTED_BITS.flatMap((name) => [`**/bits/${name}`, `**/bits/${name}.tsx`]),
              message: "Import this effect through its wrapper in src/components/fx/ (or ui/switch for the switch) so it uses the design tokens.",
            },
          ],
        },
      ],
      // no-restricted-imports does not look at dynamic import(), so cover that too.
      "no-restricted-syntax": [
        "error",
        {
          selector: `ImportExpression[source.value=/bits.(${RESTRICTED_BITS.join("|")})$/]`,
          message: "Import this effect through its wrapper in src/components/fx/ (or ui/switch for the switch) so it uses the design tokens.",
        },
      ],
    },
  },
  {
    files: ["src/components/fx/**/*.{ts,tsx}", "src/components/ui/switch.tsx", "src/components/bits/**/*.tsx"],
    rules: { "no-restricted-imports": "off", "no-restricted-syntax": "off" },
  },
  {
    // Vendored React Bits components keep their upstream style.
    files: ["src/components/bits/**/*.tsx"],
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "no-empty": "off",
    },
  },
  {
    files: ["worker/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node, ...globals.serviceworker },
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
