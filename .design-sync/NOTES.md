# design-sync notes (weewoo.study)

## How this repo syncs

- weewoo.study is a **Fresh/Preact app**, not a React library: there is no
  `dist/`. `node .design-sync/build-pkg.mjs` (`cfg.buildCmd`) builds a small
  package in `.design-sync/.cache/pkg/` that the converter reads:
  `components/ui/*` compiled against React (`.design-sync/entry.ts` lists what
  ships), the React-typed contract `.design-sync/types/index.d.ts`, and the
  app's compiled CSS from `_fresh/client/assets/` (it runs `deno task build`
  first; `--skip-app-build` reuses the last build).
- Converter command (from the repo root, after `build-pkg.mjs`):
  `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules .ds-sync/node_modules --entry .design-sync/.cache/pkg/dist/index.js --out ./ds-bundle`
- Fresh clone: re-stage `.ds-sync/` (skill step 7) and install its deps:
  `cd .ds-sync && npm i esbuild ts-morph @types/react@19 react@19 react-dom@19 lucide-react@0.477.0 playwright@1.63.0`
  (lucide-react must match the app's lucide-preact version; playwright 1.63.0
  matches the chromium build the app's E2E already caches).
- `.design-sync/` is excluded from `deno fmt/lint/check` (deno.json): previews
  are React TSX, which Deno would type-check as Preact.

## Gotchas found on the first sync (2026-10-10)

- `build-pkg.mjs` aliases `preact/hooks` -> `react` and `lucide-preact` ->
  `lucide-react`. A component that needs anything else Preact- or
  Fresh-specific (signals, `fresh/runtime`) can't ship: Page, Toaster and
  `showToast` are left out on purpose.
- The converter resolves `react` types from the package dir, so `build-pkg.mjs`
  junctions `.cache/pkg/node_modules` -> `.ds-sync/node_modules`. Without it:
  `[DTS_REACT]` and contracts lose inherited props.
- The converter drops inherited HTML attributes from contracts, so
  `types/index.d.ts` declares `onClick`, `type`, `disabled`, `aria-label`,
  `target`, `rel` etc. explicitly on Button/LinkButton. Add any new native prop
  there the same way.
- The app's CSS `@font-face` rules point at `/assets/...`; `build-pkg.mjs`
  strips them and the fonts ship from `@fontsource` via `cfg.extraFonts`.
- The preview card body is white (converter-owned `emit.mjs`, don't fork).
  Every preview wraps its cells in a local `Surface` (`bg-base-200
  text-base-content`) - the page color the components are built for. Stat and
  StatGrid additionally sit in a `Card`, as in the app.
- DaisyUI component rules beat Tailwind utilities here (the `stat` dashed
  divider ignored `border-none`); use the `!` modifier (`border-none!`) in
  components when overriding DaisyUI.
- Only classes the app already uses are compiled into the CSS. The conventions
  header lists verified families; re-validate it after CSS changes.
- `input-bordered` / `textarea-bordered` (DaisyUI 4 names) are used in the app
  but don't exist in DaisyUI 5 - no-ops, not a sync problem.

## Known render warns

- None after the first sync (validate exits clean, no warn lines).

## Re-sync risks

- `types/index.d.ts` is hand-maintained: a prop added to `components/ui/*.tsx`
  must be added there too, or the design agent never sees it.
- The CSS comes from whichever branch last ran `deno task build`; sync from an
  up-to-date `main` build.
- `cfg.overrides` sets column cards for Button and ProgressBar (grid overflow)
  and a single 720x420 card for Modal (overlay).
- Fonts are the Latin subsets only.
