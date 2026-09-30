/**
 * Resolution and loading hooks so `node --test` can import the app's
 * TypeScript directly.
 *
 * Two gaps to close. Node resolves neither the extensionless imports the
 * codebase uses nor the `@/` alias, so `resolve` does that. And Node only
 * understands a `.ts` file by itself from v22.18 on, so `load` strips the types
 * explicitly rather than relying on the running version to do it — which is the
 * difference between a suite that runs everywhere and one that runs on the
 * machine it was written on.
 *
 * No test runner, no bundler, and no dependency beyond what the project already
 * has.
 */
import { existsSync, readFileSync } from "node:fs";
import module from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

/** The first of `base`, `base + ext` or `base/index + ext` that exists. */
function firstExisting(base) {
  if (path.extname(base) && existsSync(base)) return base;

  for (const extension of EXTENSIONS) {
    const candidate = base + extension;
    if (existsSync(candidate)) return candidate;
  }

  for (const extension of EXTENSIONS) {
    const candidate = path.join(base, `index${extension}`);
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

export function resolve(specifier, context, nextResolve) {
  let base = null;

  if (specifier.startsWith("@/")) {
    base = path.join(root, "src", specifier.slice(2));
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }

  const resolved = base === null ? null : firstExisting(base);

  if (resolved !== null) {
    return { url: pathToFileURL(resolved).href, format: "module", shortCircuit: true };
  }

  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  if (!/\.tsx?$/.test(new URL(url).pathname)) return nextLoad(url, context);

  const file = fileURLToPath(url);

  return {
    format: "module",
    source: stripTypes(readFileSync(file, "utf8"), file),
    shortCircuit: true,
  };
}

/**
 * Type annotations removed, by whichever of the two available ways works here.
 *
 * `module.stripTypeScriptTypes` has been in Node since v22.13 and needs no
 * dependency, so it is tried first. Older runtimes fall back to the TypeScript
 * compiler the project already depends on. Both only ever erase types — the
 * codebase uses no enums, namespaces or parameter properties, which is the
 * boundary where the two would disagree.
 */
function stripTypes(source, file) {
  if (typeof module.stripTypeScriptTypes === "function") {
    return module.stripTypeScriptTypes(source, {
      mode: "strip",
      sourceUrl: pathToFileURL(file).href,
    });
  }

  const typescript = loadTypeScript();

  if (typescript) {
    return typescript.transpileModule(source, {
      fileName: file,
      compilerOptions: { target: "es2022", module: "esnext", isolatedModules: true },
    }).outputText;
  }

  throw new Error(
    `Cannot read ${path.relative(root, file)}: this Node (${process.version}) cannot strip ` +
      `TypeScript, and the "typescript" package could not be loaded. Use Node 22.13 or newer, ` +
      `or run "npm install" first.`,
  );
}

function loadTypeScript() {
  try {
    const typescript = module.createRequire(import.meta.url)("typescript");
    return typeof typescript?.transpileModule === "function" ? typescript : null;
  } catch {
    return null;
  }
}
