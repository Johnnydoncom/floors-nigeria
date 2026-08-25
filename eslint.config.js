import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
// Next.js 16 ships native flat configs: App Router conventions, Core Web
// Vitals rules, the React Hooks rules and TypeScript support.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default [
  { ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"] },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Vendored shadcn/ui primitives are generated upstream; hold them to the
    // formatting rules but not to our hook conventions.
    files: ["src/components/ui/**"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
  eslintPluginPrettier,
];
