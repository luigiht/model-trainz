# Architecture

```
src/app/                    Next.js shell (server components): layout, page → <GameRoot/>
src/app/api/                games/[id] (save by Game ID, CORS for the apps), version (deployed build)
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
src/game/session/           player + Game ID, online save sync, API origin (api.ts), version check
src/server/                 gameStore (Supabase or local files), appCors
src/render/world/           terrain (low-poly chunk builder), TerrainChunkManager, stationModel
src/render/train/           trainModels (loco + carriages from primitives), cabInterior (first-person cab)
src/render/workers/         chunk.worker, ChunkWorkerPool, buildChunk (shared with fallback)
src/render/effects/         quality tiers, QualityGovernor
src/audio/sfx.ts            procedural sound effects
src/i18n/                   locales (detection), messages/{en,es,it} dictionaries, i18n.ts hooks
ios/, android/              Capacitor native projects around the static export in out/
```

## Builds

- **Website** (`pnpm build`): server build with the API routes, deployed on Vercel.
- **iOS/Android apps** (`pnpm mobile:build`): `MOBILE=1` switches `next.config.ts` to a static
  export without route handlers, with `NEXT_PUBLIC_API_ORIGIN` pointing at the website;
  `cap sync` copies `out/` into `ios/` and `android/`.

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
