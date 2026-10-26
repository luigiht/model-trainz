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

## Pivot: track-laying loop + low-poly look (after M1)

- **User request:** "Make it playable, the user clicks in the station and a piece of track is placed in
  front of them, make it less boxy like minecraft and more low-poly."
- **Core loop interpretation:** the train sits at a station; each click lays one piece (piecesPerClick
  with upgrades) at the railhead in front of it. Leg lengths grow (10 + 3k pieces, capped at 40).
  When the railhead reaches the next station the train departs automatically, brakes into the next
  platform, and earns a fare. Laying is allowed while traveling (pre-building the next leg).
- **Click target:** clicking anywhere on the 3D scene lays track (the active station is marked with a
  bouncing marker and the next piece's spot with a pulsing ghost). Restricting clicks to the station
  mesh alone was rejected: the station scrolls away while the camera follows the train, which would
  make the core action hard to hit. A big "Lay track (Space)" button and Space-hold provide
  keyboard/touch-friendly alternatives. Effective rate capped at 12 clicks/s.
- **Voxel engine removed** (block registry, atlas, greedy mesher, voxel material, model viewer) rather
  than kept as dead code; it remains in git history (commit 5f2be99). Kept: seeded noise, worker pool,
  chunk streaming, quality tiers, post stack.
- **Low-poly terrain:** 2-unit jittered grid (jitter keyed on the global vertex index so chunk edges
  match), alternating diagonals, flat-shaded per-face colours by height/slope; trees, bushes and
  rocks are _baked into each chunk's triangle soup in the worker_ → one draw call per 32×32 chunk.
- **Route:** an analytic curve z(x), y(x) (sum of sines, seeded) re-parameterised by arc length; the
  terrain is flattened within 3.5 units of it and blends back to natural by 15 units. Analytic means
  workers can flatten terrain without knowing which track has been laid.
- **Track rendering:** instanced ballast / sleepers / rails for a window of ~220 pieces around the
  train; matrices are rewritten only when the window or laid count changes (or during the drop-in
  animation of new pieces).
- **Train & stations** are built from three.js primitives with `flatShading`; carriages articulate by
  sampling two bogie points on the route.
- **Plain `number` for currency** for now (fine to ~1e308); break_infinity.js deferred until the
  economy needs it.
- **Saves:** localStorage, versioned envelope with FNV checksum, backup slot, defensive merge for
  missing fields; autosave every 10 s, on purchase, and on `visibilitychange`/`pagehide`. Long gaps
  (tab hidden / offline, capped at 8 h) run through a coarse 1 s-step catch-up; a Welcome Back dialog
  appears after ≥ 60 s away.
- **Audio:** tiny procedural Web Audio SFX (clank, coin, whistle, arrival, purchase, golden), lazily
  created on first gesture, mute persisted in settings.
