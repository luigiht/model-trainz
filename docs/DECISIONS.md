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

## M1

- **Texture arrays instead of a 2D atlas.** Tiles are uploaded as a WebGL2 `DataArrayTexture` (one
  layer per tile) with a per-vertex layer index. This lets greedy-merged quads tile a texture across
  their surface via repeat wrapping and gives bleed-free mipmaps. (The brief's "atlas" concept is
  kept: one procedural sheet of 16×16 tiles, generated at startup.) Magnification is nearest
  (crisp pixels); minification is trilinear to avoid distant shimmer.
- **Per-voxel colour jitter happens in the shader** (hash of `floor(voxel position)`), not in vertex
  colours, so it doesn't prevent greedy merging. AO stays baked per vertex (`aAo`, 0–3) and quads
  only merge when all four AO values match; the quad diagonal flips on AO anisotropy.
- **Material params per tile** (roughness / metalness / emissive) live in a uniform table indexed by
  tile, so the vertex format stays small (position, normal int8, uv, ao uint8, tile uint8).
- **Normal detail** is derived from tile luminance (Sobel) into a second texture array; the shader
  builds the tangent frame from screen-space derivatives (no tangent attribute needed).
- **Padded volumes**: every chunk/model is meshed from an (n+2)³ volume holding its neighbours'
  border voxels. Terrain generation is deterministic per column, so workers generate the border
  themselves and chunks mesh without cross-chunk lookups. Trees are stamped from all roots within
  reach of the volume, so canopies cross chunk borders seamlessly.
- **Chunks are 16×64×16**, generated + meshed in a pool of up to 4 module workers
  (`new Worker(new URL(...), {type:"module"})`, verified in the production build) with transferable
  buffers; a dynamic-import fallback builds on the main thread if Workers are unavailable. The
  main thread only wraps typed arrays in `BufferGeometry`, capped at 2 uploads per frame.
- **Edge bevel** is a shader highlight on voxel edges, enabled on High+ (tier `bevel`).
- **`/dev/models`** is available in `pnpm dev`; in production builds it 404s unless
  `NEXT_PUBLIC_DEV_ROUTES=1`.
- No foliage sway or water shader yet (M5); leaves cast solid shadow-map shadows for now.
