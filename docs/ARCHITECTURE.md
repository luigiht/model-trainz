# Architecture

```
src/app/                 Next.js shell (server components): layout, page → <GameRoot/>
src/components/game/     Client: GameRoot (dynamic ssr:false import), GameCanvas, scene parts, RenderProbe
src/components/hud/      DOM HUD: LoadingScreen, DebugOverlay (`), QualityMenu
src/game/state/          Zustand stores (settings: persisted; render runtime: not persisted)
src/render/effects/      Quality tiers (pure), QualityGovernor (pure)
src/render/debugStats.ts Mutable per-frame stats shared between canvas and overlay
src/render/voxel/        blocks (registry), textures (procedural tiles + normals), atlasTexture
                         (texture arrays), VoxelVolume (padded grid), ChunkMesher (greedy + AO),
                         geometry, VoxelModel (layer-string format), ChunkManager (streaming)
src/render/materials/    voxelMaterial (MeshStandardMaterial + onBeforeCompile)
src/render/world/        terrain (seeded generator), propModels
src/render/workers/      chunk.worker, ChunkWorkerPool, buildChunk (shared with sync fallback)
src/app/dev/models       Dev-only model viewer
src/lib/                 Pure utilities: seeded RNG + hashing
tests/unit, tests/e2e    Vitest, Playwright (SwiftShader WebGL)
```

## Data flow

- Settings → `useActiveQualityLevel()` + toggles → `resolveEffects()` → `GameCanvas` mounts the
  matching shadow config and `PostEffects` passes.
- `RenderProbe` (inside the canvas) → `debugStats` (mutable) → `DebugOverlay` (setInterval, DOM
  textContent). It also feeds frame times to `QualityGovernor`, which writes `autoLevel` to the
  runtime store when the effective level should change.

## Voxel pipeline

```
TerrainGenerator.generateChunk(cx,cz) ─► VoxelVolume (18×66×18, padded)
                                           │  (worker)
                                           ▼
                                 meshVolume() ─► {opaque, cutout, transparent} MeshArrays
                                           │  postMessage + transferables
                                           ▼
ChunkManager.upload() ─► BufferGeometry + shared voxel materials ─► scene
```

Models use the same path: `parseVoxelModel(def)` → padded volume (air border) → `meshVolume` →
`VoxelModelMesh` (scaled by `def.scale`).

This document grows with each milestone.
