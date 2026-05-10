---
"rimless": patch
---

Restore the published TypeScript declarations. The 0.8.x series advertised `lib/index.d.ts` in `package.json` but the file was missing from the tarball: `vite-plugin-dts` v5 dropped the singular `outDir` option, so dts files were silently emitted to `dist/` instead of `lib/`. The vite build now sets `build.outDir: "lib"` as the single source of truth and uses `entryRoot: "src"` so declarations land directly under `lib/` (e.g. `lib/index.d.ts`, `lib/guest.d.ts`), matching the layout shipped before 0.8.
