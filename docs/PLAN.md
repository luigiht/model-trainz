# Implementation plan

Vertical slices; every milestone ends green on `pnpm typecheck && pnpm lint && pnpm test && pnpm build`,
a Playwright screenshot check, and a commit.

| #   | Milestone                | Key deliverables                                                                                                                                                       | Status  |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| M0  | Foundation               | Scaffold, tooling, CLAUDE.md, settings store + quality tiers, lit/shadowed/post-processed voxel scene, loading screen, debug overlay, e2e smoke                        | done    |
| M1  | Voxel engine             | Block registry, procedural atlas, chunk storage, greedy mesher + AO, voxel material (jitter, PBR params, normal detail), seeded terrain, worker meshing, `/dev/models` | planned |
| M2  | Track & train            | Track graph + spline path-follow, loop route, "Pebble" + 2 cars from layer strings, wheels, articulation, steam puffs, fixed-timestep `TrainPhysics`                   | planned |
| M3  | Clicker core + HUD       | Click/hold/Space with CPS cap, pressure gauge, income loop, big numbers, floating numbers, 10 upgrades, shop, save/load, offline dialog, economy tests + simulator     | planned |
| M4  | Cameras                  | Iso follow/free/rotate/zoom + dither-fade, interactive cab with gauges/levers, blended transitions, head bob, FOV kick, touch                                          | planned |
| M5  | Shader polish & lighting | Tiered post stack, sky + voxel clouds, day/night with emissives + headlamp, water shader, foliage sway, fog, auto-quality governor                                     | planned |
| M6  | World & content          | Route through 6 biomes, bridges, tunnels, stations + perfect stop, crossings, ambient life, landmarks, chunk streaming + LOD                                           | planned |
| M7  | Progression depth        | 6 locos + cabs, carriage types + visible cargo, consist builder, 40+ upgrades, contracts, events, 60+ achievements, prestige, cosmetics                                | planned |
| M8  | Weather, audio, juice    | Rain/snow/fog/storm + gameplay effects, windscreen rain + wipers, procedural SFX/ambience/music, tunnel reverb, particles, shake, haptics                              | planned |
| M9  | UX, a11y, settings       | Full settings, tutorial, minimap, stats, photo mode, import/export, reduced motion, keyboard nav, mobile layout, WebGL fallback, error boundaries, i18n                | planned |
| M10 | Hardening & release      | Perf vs budgets, leak audit, balance tuning, e2e suite, docs/README/CREDITS, a11y pass, Vercel notes, KNOWN_ISSUES                                                     | planned |

## Architecture sketch

- **Sim** (`src/game/simulation`): fixed 30 Hz tick, pure TS. `GameLoop` accumulates real time and
  advances `SimState`; renderer interpolates `prev`/`curr` train distance. Large gaps (tab hidden)
  are routed through the offline-progress function instead of thousands of ticks.
- **State** (`src/game/state`): Zustand stores. Per-frame values live in a mutable sim object read
  imperatively in `useFrame`; React only sees ~10 Hz HUD snapshots.
- **Voxel** (`src/render/voxel`): `BlockRegistry` → `Chunk` (Uint8Array 16×16×64) → `ChunkMesher`
  (greedy + AO, pure, runs in worker) → typed arrays → `BufferGeometry` per material class.
  Train/props use the same mesher on small grids from `VoxelModel` layer strings.
- **Materials** (`src/render/materials`): one atlas-based `MeshStandardMaterial` extended via
  `onBeforeCompile` (per-block roughness/metalness/emissive packed into vertex attributes).
- **Effects** (`src/render/effects`): `QUALITY_TIERS` table drives DPR, shadows, and which passes
  mount; each effect also has its own user toggle.

## Risks

1. **Performance on integrated GPUs** — post stack + shadows are expensive. Mitigation: tier table,
   auto governor, tight shadow frustum, merged chunk meshes, measure draw calls in the debug overlay.
2. **Shader complexity / three upgrades** — `onBeforeCompile` patches are brittle across three
   versions. Mitigation: keep patches small and string-anchored on stable chunks; pin three minor.
3. **Worker meshing in Next/Turbopack** — `new Worker(new URL(..., import.meta.url))` must bundle
   correctly. Mitigation: verify in M1 with build + e2e; synchronous fallback path using the same pure
   mesher.
4. **Greedy meshing + AO artifacts** — only merge faces with identical AO quad; flip quad diagonal
   based on AO to avoid anisotropy. Covered by unit tests.
5. **Economy pacing** — tuned with the simulator; BALANCE.md records targets vs. measured.
6. **Scope** — the brief is very large; each milestone ships a playable subset rather than
   half-finished breadth.

## Assumptions

See `docs/DECISIONS.md`.
