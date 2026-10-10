// Builds the package the design-sync converter reads (cfg.buildCmd):
//   node .design-sync/build-pkg.mjs [--skip-app-build]
// into .design-sync/.cache/pkg/ (gitignored, regenerated every run):
//   dist/index.js    components/ui compiled against React (see entry.ts)
//   dist/index.d.ts  the React-typed contract from types/index.d.ts
//   dist/styles.css  the app's own compiled CSS (Night/Day Shift themes,
//                    DaisyUI, Tailwind), minus its @font-face rules: those
//                    point at the app's /assets URLs; fonts ship from
//                    @fontsource via cfg.extraFonts instead.
// weewoo.study is a Fresh/Preact app, not a React library, so this stands in
// for the library build the converter expects. Needs the converter deps in
// .ds-sync/node_modules (esbuild, react, react-dom, lucide-react).
import { execSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const out = join(here, ".cache", "pkg");
const require = createRequire(join(repo, ".ds-sync", "package.json"));
const { build } = require("esbuild");

// 1. The app's CSS is the source of truth for the look: rebuild it.
if (!process.argv.includes("--skip-app-build")) {
  execSync("deno task build", { cwd: repo, stdio: "inherit" });
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "dist"), { recursive: true });

// 2. Components, compiled against React. Preact-only imports map to their
// React equivalents; React and lucide-react stay external (the converter
// bundles them from .ds-sync/node_modules).
await build({
  entryPoints: [join(here, "entry.ts")],
  outfile: join(out, "dist", "index.js"),
  bundle: true,
  format: "esm",
  target: "es2020",
  jsx: "automatic",
  jsxImportSource: "react",
  tsconfigRaw: {
    compilerOptions: { jsx: "react-jsx", jsxImportSource: "react" },
  },
  alias: { "preact/hooks": "react", "lucide-preact": "lucide-react" },
  external: ["react", "react-dom", "react/jsx-runtime", "lucide-react"],
  logLevel: "warning",
});

// 3. The API contract.
copyFileSync(
  join(here, "types", "index.d.ts"),
  join(out, "dist", "index.d.ts"),
);

// 4. The compiled app CSS, without its @font-face rules.
const assets = join(repo, "_fresh", "client", "assets");
const css = readdirSync(assets)
  .filter((f) => f.endsWith(".css"))
  .map((f) => join(assets, f))
  .sort((a, b) => statSync(b).size - statSync(a).size)[0];
if (!css) throw new Error(`no compiled CSS in ${assets}; run deno task build`);
const stripped = readFileSync(css, "utf8").replace(/@font-face\{[^}]*\}/g, "");
writeFileSync(join(out, "dist", "styles.css"), stripped);

// 5. The converter resolves `react` types from the package's location; point
// it at the converter deps, which hold @types/react.
symlinkSync(
  join(repo, ".ds-sync", "node_modules"),
  join(out, "node_modules"),
  "junction",
);

writeFileSync(
  join(out, "package.json"),
  JSON.stringify(
    {
      name: "weewoo-ui",
      version: "0.0.0",
      private: true,
      type: "module",
      module: "dist/index.js",
      types: "dist/index.d.ts",
      peerDependencies: { react: ">=18", "react-dom": ">=18" },
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `built ${out}: dist/index.js, dist/index.d.ts, dist/styles.css (from ${css})`,
);
