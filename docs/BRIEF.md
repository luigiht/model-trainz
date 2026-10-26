# Rail Baron Clicker — design brief (condensed, authoritative)

Condensed from the original project prompt. Section numbers are referenced elsewhere (e.g. "§3.2").

## §1 Concept

3D incremental/clicker. Player drives (later owns) a train. Click/hold/tap → power → move → earn
money → upgrades, locomotives, carriages, routes, automation. Voxel diorama world with realistic
lighting (Minecraft + high-end shader pack: soft shadows, AO, bloom, fog, water reflections,
day/night). Two cameras: **Cab view** (first person, interactive dashboard, windscreen) and
**Isometric view** (3/4 overhead diorama, pan/zoom/follow). Tone: cozy, charming, juicy.

## §2 Stack

Next.js App Router, TS strict, React 19, three.js via R3F + drei + postprocessing, Zustand (+persist
and a custom versioned serializer), Tailwind, Radix primitives, Framer Motion (UI only), Web Audio API
(procedural), Vitest, Playwright, ESLint + Prettier, pnpm. No backend; Vercel-deployable. Page shell
is a server component; canvas + HUD are client; 3D scene dynamically imported with `ssr:false`.

## §3 Visual style

- **Geometry:** 1-unit voxel grid; locomotive detail on 0.25/0.5 sub-voxel grid. Everything is voxel.
  InstancedMesh and chunked greedy meshes. Per-vertex AO baked in vertex colours (Minecraft smooth
  lighting). Per-voxel hue/brightness jitter from position hash. Optional shader edge bevel (quality).
- **Materials:** custom material (MeshStandardMaterial + onBeforeCompile or ShaderMaterial):
  procedural canvas atlas (16/32px tiles, NearestFilter) for grass top/side, dirt, stone, gravel, sand,
  snow, log, plank, leaves, brick, dark iron, brass, coal, water, glass, tie wood, rail steel, paints.
  Per-block roughness/metalness. Normal detail from luminance. Emissives (lamps, furnace, windows,
  signals). Stylized water (animated normals, depth colour, fresnel, glint, foam, planar reflection
  with env-map fallback; water voxels lowered). Foliage sway. Glass with fresnel; windscreen rain.
- **Lighting:** directional sun with tight-fitted soft shadow map following the train; hemisphere +
  procedural sky, blocky voxel clouds, stars; few point lights (headlamp spot, station lamps);
  day/night cycle 6–10 min (configurable) with grading, lamps on at dusk; weather (M8).
- **Post (Low/Medium/High/Ultra + Auto by frame time):** SSAO/N8AO (High+), bloom (Med+), tone
  mapping ACES/AgX + grading (all), tilt-shift DOF isometric only, vignette/grain/edge CA (High+),
  SMAA/MSAA (Med+), god rays (Ultra), height fog tinted by time of day.
- References: Minecraft BSL/Complementary, Teardown, Townscaper, Dorfromantik. Harmonious palettes.

## §4 World

- Track: looping/branching graph of segments (straight, curves, slopes, bridges, tunnels, stations).
  Train position = distance `s`; each bogie/car samples the curve at `s - offset`.
- Seeded procedural generation: simplex terrain, rivers, lakes, forests, hills, villages, farms, mine,
  harbor, mountain pass with tunnels.
- Biomes/regions unlocked progressively: Meadow & Farmland, Pine Forest, Desert Canyon, Snowy Alps,
  Coastal Harbor, Volcanic Badlands.
- Chunk streaming (e.g. 16×16×64) generated/meshed in a Web Worker, far chunks disposed,
  main-thread meshing < 2 ms/frame.
- POIs: stations (stop, load/unload, timed perfect-stop bonus), signals and level crossings with
  barriers and voxel cars/people, ambient life (cows, sheep, birds, fish, chimney smoke, villagers),
  landmarks giving first-pass Discovery bonuses.

## §5 Train

- ≥6 locomotives from a compact palette + layer-string format: 1 Steam Tank "Pebble" (starter, black
  & green), 2 Steam Express "Meridian" (red wheels), 3 Diesel Shunter (yellow), 4 Diesel-Electric
  Cruiser (two-tone), 5 Electric Intercity (pantograph, overhead wires), 6 Maglev "Aurora" (floats,
  emissive strips). Stats: max speed, acceleration, power/click, efficiency, haul capacity, passive
  multiplier, distinct cab layout.
- Carriages: passenger, freight (coal, grain, logs, containers, tanker), dining, Pullman, caboose;
  visible cargo level. Consist builder (drag to reorder; max length grows).
- Juice: wheel rotation synced to speed, rods/pistons, steam puffs synced to strokes with wind drift,
  sparks, heat shimmer (High+), body sway, camera shake, windscreen rain/dirt/reflection + wipers,
  headlamp + cab lights with bloom.

## §6 Clicker loop

- Click/tap/Space adds Power (pressure); hold = continuous at a capped rate; hard cap ~12 effective
  CPS. Cab interactions: fire door/shovel (pressure), throttle lever (target speed vs efficiency),
  whistle (cooldown bonus, clears animals, toot combos at stations/crossings), brake (perfect stops),
  bell (cosmetic + tiny luck). Iso: click loco, stations/landmarks, floating golden pickups.
- Resources: Distance (km), Coins, Power/Pressure (decays), Fuel/Energy (soft penalty when empty),
  Passengers/Cargo, Golden Rails (prestige), Brass Tokens (achievements only; cosmetics). **No
  real-money mechanics.**
- Economy in `src/game/economy/`, pure + tested: `cost(n) = base * growth^n` (growth 1.07–1.25);
  `income/s = base * (1 + speedFactor) * cargoValue * multipliers`; big numbers (break_infinity.js or
  decimal.js) with K/M/B/T/aa/ab… then scientific; offline progress capped (8 h × offline efficiency)
  with Welcome Back dialog; `scripts/simulate-economy.ts` bot: first upgrade ~10 s, first loco
  ~10–15 min, first prestige ~2–3 h, long tail.
- Upgrades panel tabs: Engine, Automation (auto-stoker, fireman visible in cab, autopilot, station
  manager), Cargo & Routes, Fleet, Comfort & Scenery, Prestige, Cosmetics. ≥40 upgrades, code-drawn
  pixel icons, tooltips, buy ×1/×10/×100/max.
- Contracts (3 slots, timed), random events (cows, bridge repair, tailwind, festival, thunderstorm,
  golden coal), ≥60 achievements (toasts, Brass Tokens), optional daily streak (no dark patterns).

## §7 Cameras

`CameraRig`, ~1.2 s eased blend, HUD button or `V`.

- Cab: perspective FOV ~70 (50–100 setting), eye height, head bob, small mouse look-around, detailed
  voxel cab (animated gauges, levers, firebox glow, tender coal, swinging lantern), FOV kick with
  speed, radial blur (Ultra), hover highlights, touch-reachable.
- Iso: narrow-FOV perspective (20–30°) or ortho (document choice). Follow (default) / free (drag pan,
  wheel/pinch zoom, Q/E or right-drag 90° rotate). Occlusion dither-fade. Photo mode (hide HUD, free
  cam, PNG export).

## §8 UI/UX

Cozy-industrial (parchment/brass/dark iron), pixel header font (Silkscreen/Press Start 2P via
next/font) + legible numbers. HUD: coins, distance, speed, power gauge, fuel, cargo, contract tracker,
camera toggle, settings/pause, mute, day/weather. Floating numbers, click ripple/squash/particles/
sound/haptics. Panels: Upgrades, Fleet/Consist, Contracts, Map (2D minimap), Achievements, Stats,
Settings, About. Settings: quality, resolution scale 50–100%, shadows, SSAO, bloom, DOF, FOV, shake,
head bob, volumes (master/music/SFX/ambient), reduced motion, colourblind palette, number format,
autosave interval, i18n dictionary (English), export/import save, hard reset. Accessibility: keyboard,
focus, ARIA, reduced motion, not colour-only, contrast, optional sound subtitles. Responsive with bottom
sheet on phones, DPR cap. 5-step skippable tutorial. Loading screen with voxel train + tips.

## §9 Audio

`src/audio/AudioManager` (Web Audio, unlock on gesture): synthesized chuffs synced to wheel RPM, hiss,
whistle, bell, shovel, UI blips, coin, purchase, achievement jingle, brake squeal, clickety-clack,
tunnel reverb, thunder/rain/wind. Generative pentatonic ambient music per biome/time, ducking,
independent toggle. Minimal spatial (pan + attenuation). Handles autoplay block, visibility, mute.
No external assets by default (CC0 only, in CREDITS.md).

## §10 Architecture

Folders: `src/app`, `components/{hud,ui,game}`, `game/{state,economy,simulation,content,save}`,
`render/{voxel,workers,materials,effects,train,world,particles}`, `audio`, `lib`, `types`, `tests`.
Fixed-timestep sim (20–30 Hz) with render interpolation, pure TS. Stores: `useGameStore`,
`useSettingsStore`, `useUiStore`; selectors + `useShallow`; HUD at ~10 Hz. Seeded RNG (mulberry32/
sfc32), seed in save. Save: localStorage autosave, schema version + migrations, checksum, backup,
export/import, quota errors handled; tab-hidden gaps go through offline progress.
Perf: 60 FPS mid laptop at Medium, 30–60 phones at Low; < 300 draw calls ideal (< 1500 max), < 2M
tris High; instancing, merged chunks, frustum culling, LOD, pooling, no hot-path allocations, dispose
everything, debug overlay (backtick): FPS, frame ms, draw calls, tris, chunks, memory, sim tick,
quality. DPR cap [1, 1.75] + resolution scale. Pause rendering when hidden/paused.
Voxel: Uint8/Uint16 block IDs, block registry (atlas tiles, material props, solidity, transparency,
emission), greedy meshing that only merges equal-AO faces, separate opaque/cutout/transparent meshes,
no flood-fill light initially, worker meshing with transferables, palette + layer-string model format
meshed by the same pipeline, `/dev/models` viewer (orbit, wireframe).

## §11 Quality

Strict TS, no unjustified `any`, zero lint warnings. Vitest: formatting, cost curves, income, offline,
prestige, migrations, RNG determinism, mesher face counts, spline continuity/length, contracts,
achievements. Playwright: loads, non-blank canvas, click increases resources, buy upgrade, camera
toggle, save/load roundtrip, settings persist. Error boundary + WebGL-unavailable screen. Scripts:
dev, build, start, lint, typecheck, test, test:e2e, format, sim. Conventional commits.

## §13 Milestones

M0 Foundation · M1 Voxel engine · M2 Track & train movement · M3 Clicker core + HUD · M4 Cameras ·
M5 Shader polish & lighting · M6 World & content · M7 Progression depth · M8 Weather, audio, juice ·
M9 UX/a11y/settings/onboarding · M10 Hardening & release. (Details in `docs/PLAN.md`.)

## §14 Game feel

First click: chuff, puff, floating number, sound, jolt; first upgrade affordable almost immediately and
visible. Train always moving or building toward motion. Speed feels fast in cab, charming in iso.
Every purchase gives feedback. Mini-cinematics for first station, new biome, loco reveal. Short witty
text, punny station names, whimsical achievements.

## §15 Constraints / §16 Done

No multiplayer/accounts/backend/ads/analytics/paid services. Initial JS < 3 MB gz. Don't over-engineer
the voxel engine. Done = install/dev/build/start work; playable click → earn → upgrade → unlock →
prestige in both cameras; quality tiers + auto; saves persist/migrate; offline progress; tests/lint/
typecheck pass; docs current; `docs/KNOWN_ISSUES.md`.
