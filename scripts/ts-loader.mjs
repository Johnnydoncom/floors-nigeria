/**
 * Lets `node --test` import the app's TypeScript directly.
 *
 * Node can strip types on its own but resolves neither the extensionless
 * imports the codebase uses nor the `@/` alias, so both are handled here on top
 * of the TypeScript compiler the project already depends on. No test runner, no
 * bundler, no extra dependency — `node --import ./scripts/ts-loader.mjs --test`
 * is the whole apparatus.
 */
import { register } from "node:module";

register(new URL("./ts-hooks.mjs", import.meta.url));
