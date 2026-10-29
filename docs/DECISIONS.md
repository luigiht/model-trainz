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

## Settings panel + Cab view

- **Settings** is a native modal `<dialog>` (focus trap, Esc, backdrop click) opened from a button
  between Sound and Reset; it holds sound (toggle + volume), graphics quality (radio group), camera
  view, and a controls reference. The standalone quality dropdown was removed.
- **Cab view** (first person) reuses the one `CameraRig`: both poses are computed every frame and
  blended (position lerp with an upward arc, quaternion slerp, FOV 30°→62°, near plane 1→0.08)
  over 1.2 s; reduced motion cuts instantly and disables head bob. The mode persists in settings.
- **Cab interior** is a separate low-poly group parented to the loco, drawn only while the cab
  camera is (partly) active. The exterior cab box is single-sided, so it disappears from inside; the
  loco's window panes became tinted transparent glass so the driver can see out. The boiler was
  shortened so it no longer pokes through the cab's front wall.
- **Drag to look — cab view only.** In the cab, a press is ambiguous: < 6 px of travel on release =
  tap (lays one piece), holding still for 320 ms = continuous laying, moving past 6 px = camera drag
  (lays nothing). Diorama view keeps lay-on-press. Look is "grab the world", clamped to ±109° yaw,
  -40°/+29° pitch, eased. Keyboard equivalents: arrow keys look, C re-centres, V switches view.

## Loading screen

- **A ride, not a spinner.** The loader shows the logo over a small R3F scene built from the game's
  own pieces: streamed terrain chunks (`TerrainChunkManager`, radius 3, no shadows), the shared
  track-piece instancing and drop animation (`trackPieces.ts`, also used by `Track`), the heritage
  engine and its cab interior, seen from the in-game cab camera pose. It loops the game's rhythm:
  track drops in ahead, then the engine rolls up to the railhead. A fixed seed/start point where
  the line bends toward the driver's window keeps the new track in view.
- **Cost:** a second, small WebGL context only while loading; it fades in once its first terrain
  is ready and unmounts ~0.8 s after the game is ready. Reduced motion shows a still frame.

## Players and Game IDs

- **First visit asks for a name** (and an optional Game ID to continue an existing game) on the
  loading screen. Returning players get a **Continue** card instead (with a way to start a new
  game or enter another ID). The profile `{ name, gameId }` lives in
  localStorage (`mt-profile`); each game has its own local save slot (`mt-save:<id>`).
- **No progress while closed.** Offline catch-up and the welcome-back summary were removed: a
  save loads exactly as it was saved, and the simulation is paused until the player presses
  Play/Continue. A hidden-but-open tab still catches up when it becomes visible again.
- **Latest build before naming.** Each build is stamped with `NEXT_PUBLIC_APP_VERSION` (Vercel
  deployment ID / commit, `next.config.ts`); `/api/version` reports the deployed one. A visitor
  without a name whose tab is older hard-refreshes (cache-busting `?v=`, once per build) before
  the name form appears; also on back/forward-cache restores. Tabs opened before this check
  existed can't be reached, but their next load gets the new build.
- **Game IDs** are 60-bit random Crockford-base32 strings (`7K2M-9QXP-4HCW`), so they can't be
  guessed. Typed IDs are normalised (upper case, no spaces; 4–24 letters, digits or dashes). An
  unknown typed ID starts a new game under that ID (adopting the progress on screen).
- **The ID is the key.** Anyone with it can load and continue that game; there are no accounts.
  The address bar carries `?game=<id>`, so a bookmark returns to the game.
- **Server:** `GET`/`PUT /api/games/[id]` validate the ID, cap the body at 64 KB, clean the name
  and only accept a save that passes `deserializeSave`. Storage is a Supabase `games` table via
  the Data API with the server-only secret key (RLS on, no policies, so the publishable key can't
  read it). Without `SUPABASE_URL`/`SUPABASE_SECRET_KEY` it uses files in `.data/games/` locally,
  and on Vercel online saves report unavailable (503) while play continues offline.
- **Sync:** on entering, the newer of the local and server copies wins; the save is pushed every
  60 s, when the page is hidden (`keepalive`), and ~3 s after a checkpoint (an upgrade or train set
  bought, a stop reached; `onCheckpoint` in `game.ts`). The save holds the whole `GameState`:
  map seed, track laid, current stop, coins, upgrade levels and train sets. If the server was
  unreachable and there was no local copy, nothing is pushed until the server copy has been
  checked (never overwrite unseen).
- **Not yet:** rate limiting on the API.

```sql
create table if not exists public.games (
  id text primary key check (id ~ '^[A-Z0-9-]{4,24}$'),
  name text not null check (char_length(name) between 1 and 24),
  save text not null check (char_length(save) <= 65536),
  updated_at timestamptz not null default now()
);
alter table public.games enable row level security;
revoke all on public.games from anon, authenticated;
grant select, insert, update on public.games to service_role;
```

## Mobile / compact layout

- **One `compact:` breakpoint** (Tailwind custom variant in `globals.css`): narrow (< 768 px) _or_
  short (≤ 500 px) screens, so phones in landscape also get the compact HUD. `UpgradeShop` mirrors
  the same query in JS (`COMPACT`) because it changes behaviour, not just styling.
- **Compact HUD:** Settings and Reset become 1px-outline pixel-art icon buttons (`PixelIcon`,
  ASCII-grid icons) with `aria-label`s; the reset confirmation becomes a popover over the icons.
- **Shop as a docked drawer:** on compact screens the shop is attached to the right screen edge,
  slides in/out by a vertical "Upgrades" pull tab, starts closed, and is `inert` while hidden.
  Portrait docks it between the status panel and the bottom controls; landscape docks it below
  the icon row, full height. Desktop keeps the floating, collapsible panel.
- **Touch:** `touch-action: manipulation` on the HUD (no double-tap zoom), "Tap" instead of
  "Click" and no "(Space)" hint on coarse pointers.

## Depot (train sets)

- **Back on, one new set.** The Depot tab is shown again (the `DEPOT_ENABLED` flag is gone). The
  Highland Express (`express37`) was scrapped and replaced by the **Evergreen Express**
  (`evergreen`, $50K): a double-cab mainline diesel and modern coaches painted in the heritage
  colours (loco green, cream, maroon, gold lining, red buffer beams and wheel centres, warm lit
  windows) so it belongs with the steam set. Saves that owned `express37` drop it via the sanitizer
  and fall back to Heritage Steam (no refund).
- **Sets are upgrades.** Each `TrainSetDef` has `speed` and `fares` multipliers applied in
  `deriveStats()` on top of the upgrade levels, only while that set is in service. The Evergreen
  Express gives ×1.5 top speed and ×1.5 fares, so its $50K price pays back; Heritage Steam is ×1.
- **State:** `trainSet` + `ownedSets` on `GameState`; pure `buyTrainSet` / `selectTrainSet` in
  `step.ts`. No save-version bump: the loader's defensive merge fills the new fields, and it drops
  unknown or unowned set ids (falls back to Heritage Steam).
- **Models:** the Evergreen Express lives in `evergreenDiesel.ts` on shared `modernParts.ts`,
  `bogies.ts` and `cabs.ts`, mapped in `trainSetModels.ts`. No names or logos; the crest is a plain
  brass roundel.
- **Two-shell loco body.** The diesel's body is two lofts: a full-length lower shell up to the
  waist and a cab-top shell above it. The cab top's rings shrink about the waist (not the floor),
  so the windscreens rake back over a vertical nose while the waistband wraps round the front.
- **Cab view:** the steam engine has its own footplate (`cabInterior.ts`); the diesel has a cab
  built by `buildCab()` — an inset, inward-facing copy of the exterior loft with the glazed faces
  left open. Inside: the driver's desk (brake and power handles that move with the train,
  reverser, buttons, switches) rising to an instrument binnacle (live speedometer and ammeter,
  warning lights, AWS indicator) placed so it fills the bottom of the default cab view; the
  second man's desk (radio, logbook, mug of tea); two maroon seats; framed side windows, sun
  visors, the engine-room door and an extinguisher. Desks are side profiles extruded with
  `Builder.prism()`; the static parts merge per material, only needles and handles stay separate.
  Interior surfaces glow slightly (the cab sits in the body's shadow) and don't cast shadows.
- **Nothing through the cab.** The lower shell's top is left out under the cab tops (it was a
  floor at chest height inside the cab), and grab rails are two short pieces, not one box through
  the body.
- **Exhaust:** `trainFx.exhaust` is `steam` or `diesel` (smaller grey puffs).
- **Lofted, painted bodies (v2).** Modern sets are no longer stacked boxes: each body is one
  `loft()` — a cross-section profile (tumblehome, curved roof) skinned through stations along x,
  with scaled stations forming tapered noses and rounded ends. Each flat face is coloured by a
  livery rule via vertex colours, so stripes, windows and windscreens follow the curvature and stay
  flush. Lengths are now per vehicle (`length` / `halfBase` on `VehicleModel`): modern locos ~8,
  coaches 9.6 (≈ 4–5× the width, closer to real proportions); the heritage set is unchanged.
- **Matching scale.** The modern set is modelled at those sizes, then `scaleVehicle()` scales
  it ×1.15 about the railhead so its roof lines up with the heritage cab roof
  (it read as smaller). Wheels keep the track gauge and their rolling radius; cab eye, exhaust,
  length and bogie spacing are scaled to match.
- **Draw calls:** `Builder.build()` merges every static mesh per material, so the extra detail
  (bogies, louvres, cab) costs a handful of draw calls per vehicle.

## Languages (English, Spanish, Italian)

- **Client-side, no library, no locale routes.** `src/i18n/` holds typed dictionaries
  (`messages/en.ts` is the source of truth; `es`/`it` are typed `Messages`, so a missing key fails
  `pnpm typecheck`, and a unit test checks array lengths and arity). Components read
  `useMessages()`; event handlers (toasts, floaters) use `currentMessages()`. Switching language
  re-renders in place, mid-game, without remounting the canvas, which `/[lang]` routes would do.
- **Detection:** the first of `navigator.languages` we support (`es-MX` → `es`), else English;
  follows `languagechange`. Picking a language (start-screen footer or Settings) stores it in
  the persisted settings (`locale`, null = follow the browser) and wins from then on.
- **No flash, page stays static.** The server can't know the language, so it renders English and
  the start screen's text stays `invisible` until hydration, then appears in the right language
  (the HUD is behind the opaque loader by then). `<html lang>` is updated on the client.
- **Not translated:** station names (proper nouns, part of the world), the brand, the debug
  overlay, and number formats (`$1.25K`, `0.5`/s stay game-wide, as in the HUD).
- **Fonts:** the body font (EAS VHS) and Silkscreen's latin subset cover the accented letters and
  `¡ ¿` used; avoid characters outside Latin-1 (e.g. en dash) in `font-body`/`font-pixel` text.

## iOS and Android apps (Capacitor)

- **Capacitor around a bundled build.** The apps wrap a static export of the same Next.js app
  (`MOBILE=1 next build` → `out/`, then `cap sync`). The website build is unchanged. Not chosen:
  pointing the app at the live site (`server.url`), which risks App Store rejection as a website
  wrapper (guideline 4.2) and can't start offline; React Native, which would mean rewriting the
  HUD and the worker-based terrain.
- **No server in the app.** In the mobile build `pageExtensions: ["tsx"]` leaves out the `.ts`
  route handlers (`/api/games/[id]`, `/api/version`), which a static export can't contain;
  `headers()` is website-only (unsupported in an export) and `next/image` is unoptimized.
- **API origin.** `NEXT_PUBLIC_API_ORIGIN` is empty on the website (same-origin requests) and the
  deployed site in the app (`API_ORIGIN`, default `https://model-trainz.luigiht.com`); requests go
  through `apiUrl()` in `session/api.ts`.
- **CORS** on `/api/games/[id]` (`server/appCors.ts`) allows only the app origins:
  `capacitor://localhost` (iOS) and `https://localhost` (Android), with an `OPTIONS` preflight for
  the JSON `PUT`. It isn't a security boundary: the Game ID stays the only credential.
- **No latest-build refresh in the app** (`IN_APP`): its build ships in the bundle and is updated
  through the stores. The Game panel drops the address-bar sentence (`explainerApp`).
- **Privacy and deletion (Google Play User Data / Data safety).** `/privacy` is a page on the
  website, translated like the rest of the UI; the Game panel and Settings link to it (in the app
  it opens in the system browser via `apiUrl`). The Game panel's "Delete this game" sends
  `DELETE /api/games/[id]`, then clears the profile and local saves (including the pre-Game-ID
  slot, which a first visit would adopt) and reloads to the start screen. Like `PUT`, anyone with
  the Game ID can delete the game: the ID stays the only credential.
- **Safe areas.** `viewport-fit=cover`; the HUD (`safe-p-3`), the landscape shop drawer and the
  start screen pad with `env(safe-area-inset-*)`, which also helps the website on notched phones.
  System bars are hidden for a full-screen game; Android's default `insetsHandling: "css"` keeps
  the insets right on older WebViews. When they show (launch, edge swipe) their icons are always
  black: SystemBars `style: "LIGHT"` plus `windowLight{Status,Navigation}Bar` in the Android
  launch and app themes, so the device's dark mode doesn't flip them to white.
- **Native projects are committed** (`ios/` with Swift Package Manager, no CocoaPods; `android/`);
  the copied web assets are git-ignored. App ID `com.luigiht.modeltrainz`.
- **Android Gradle plugin 9.5 / Gradle 9.8** (Android Studio's upgrade assistant; Capacitor 8's
  template ships 8.13 / 8.14). The assistant's compatibility flags in `gradle.properties` keep the
  old defaults; AGP 9 rejects `proguard-android.txt`, so the app uses `proguard-android-optimize.txt`
  like Capacitor's own module.
- **Icons and splash screens** are generated into `ios/` and `android/` from the images in
  `assets/` with `npx @capacitor/assets generate --ios --android` (`pnpm dlx` skips sharp's
  install script, so it fails). The full-bleed splash art adds ~20 MB to the APK.
- **Not yet:** signing and store listings. iOS may clear the web view's `localStorage` under
  storage pressure; online saves cover it, but `@capacitor/preferences` would keep the profile
  safer.
