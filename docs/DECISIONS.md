# Decisions & assumptions

Newest at the bottom. Each entry: decision — why.

## M0

- **Next.js 16.4 / React 19.3 / Tailwind 4 / ESLint 9 / TS 5.9** (create-next-app defaults at project
  start, Oct 2026) — the brief says "Next 15+"; 16 is current. Next's bundled docs live in
  `node_modules/next/dist/docs/` (see `AGENTS.md`). `cacheComponents` was removed from the default
  config: the game is a fully client-side island and gains nothing from it.
- **pnpm 12** installed globally via npm (corepack not available on the dev machine).
- **three 0.186, R3F 9, drei 10, @react-three/postprocessing 3.2 (postprocessing 6.39).**
- **SSAO uses postprocessing's `SSAOEffect`** (with the composer normal pass) rather than N8AO — N8AO is
  no longer bundled in @react-three/postprocessing 3.x. Revisit in M5 (`n8ao` package) if quality or
  cost is unsatisfactory.
- **Tone mapping in the post stack (AgX)**, renderer created `flat` (NoToneMapping) so it isn't applied
  twice. Composer always mounted because tone mapping is an all-tier effect.
- **Quality tiers are a pure data table** (`src/render/effects/quality.ts`); user toggles can only
  disable what a tier allows. "Auto" starts at Medium; `QualityGovernor` steps by one level per
  ~2 s window with cooldown, and never climbs back above a level it has downshifted from.
- **Render stats** are written to a mutable `debugStats` object by `RenderProbe` (frame priority
  -1000 so R3F keeps auto-rendering; `gl.info.autoReset=false` so post passes are counted) and read
  by the DOM overlay at 4 Hz.
- **Iso camera = narrow-FOV perspective (28°)** rather than orthographic: perspective works with
  shadows, fog and DOF without special handling. (Formal CameraRig arrives in M4.)
- **Playwright runs Chromium with SwiftShader** so the WebGL smoke test works headless and in CI.
  `preserveDrawingBuffer: true` on the canvas so tests can read pixels and photo mode can export.
- **Dependencies are added when first used** (Radix, Framer Motion, break_infinity.js arrive with the
  HUD in M3) to honour "no unused dependencies".
