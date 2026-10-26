# Architecture

```
src/app/                    Next.js shell (server components): layout, page → <GameRoot/>
src/components/game/        GameRoot (input + event wiring), GameCanvas (scene), GameDriver (sim tick),
                            Terrain, Water, Track, Stations, Train, Steam, CameraRig, RenderProbe,
                            PostEffects, trainFx (mutable fx state)
src/components/hud/         StatusPanel, UpgradeShop, Toasts, WelcomeBack, SettingsMenu, SettingsDialog, ViewToggle,
                            DebugOverlay, LoadingScreen, floaters (imperative DOM pool)
src/game/content/           upgrades, station names
src/game/economy/           cost curves + derived stats (pure)
src/game/simulation/        GameState, rules (legs/stations/fares), route (arc-length curve), step (pure)
src/game/save/              versioned save envelope, checksum, backup
src/game/state/             game.ts (runtime owner of the sim + HUD snapshot store), settingsStore
src/render/world/           terrain (low-poly chunk builder), TerrainChunkManager, stationModel
src/render/train/           trainModels (loco + carriages from primitives), cabInterior (first-person cab)
src/render/workers/         chunk.worker, ChunkWorkerPool, buildChunk (shared with fallback)
src/render/effects/         quality tiers, QualityGovernor
src/audio/sfx.ts            procedural sound effects
```

## Data flow

```
input (click / Space / button) ─► playerLayTrack() ─► clickLayTrack(state)      (pure)
R3F frame ─► GameDriver ─► tickGame(dt) ─► stepSim(state, 1/30) × n             (pure, fixed step)
                                   │
                                   ├─► events (laid / depart / arrive) ─► sfx, toasts, floaters, recentLays
                                   └─► useHud snapshot (≤10 Hz) ─► React HUD
scene components read game.state imperatively in useFrame (train position, track window, camera)
```

- The GameState is one mutable plain object (`game.state`), serialisable as-is for saves.
- Terrain chunks: `TerrainChunkManager.update(focus)` → worker `buildTerrainChunk` (heightmap +
  baked props, flattened along the analytic route) → transferable Float32Arrays → one Mesh per chunk.
- Settings → `useActiveQualityLevel()` + toggles → `resolveEffects()` → shadows + `PostEffects`.
