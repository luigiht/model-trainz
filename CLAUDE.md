@AGENTS.md

# Rail Baron Clicker

A cozy 3D incremental/clicker game about building a railway. The train waits at a station; each
click (or Space / hold) lays a piece of track in front of it. When the track reaches the next
station the train departs, earns fares on arrival, and the player lays the next stretch. Coins buy
upgrades (pieces per click, an automatic track gang, speed, fares, carriages, golden spikes).
The look is **flat-shaded low-poly** (faceted terrain, cone/blob trees, primitive-built train and
stations) with soft shadows, bloom and a quality-tiered post stack — the original voxel style was
dropped at the user's request (see `docs/DECISIONS.md`, "Pivot"). Fully client-side Next.js app; no
backend, no external assets.

The full design brief lives in `docs/BRIEF.md`; the milestone plan in `docs/PLAN.md`; decisions in
`docs/DECISIONS.md`; architecture in `docs/ARCHITECTURE.md`.

## Project Rules

1. Stack: Next.js (App Router) + TypeScript strict + R3F/three.js + Zustand + Tailwind. Package manager: pnpm.
2. Simulation logic is pure TS, decoupled from rendering/React, fixed timestep, unit-tested.
3. No per-frame React state updates; use refs/`useFrame`/imperative store reads; throttle HUD updates.
4. All 3D resources are disposed on unmount/unload; no memory leaks; reuse temp objects in hot paths.
5. No external copyrighted assets; procedural textures/models/audio. Document any CC0 asset in `CREDITS.md`.
6. No real-money mechanics, no dark patterns, no tracking/analytics.
7. Before finishing any task: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` must pass.
8. Visual changes must be verified by running the dev server and (when possible) taking a Playwright screenshot.
9. Keep quality tiers working: every effect must be individually disable-able and must degrade gracefully.
10. Update `docs/DECISIONS.md` for any significant technical choice. Commit after each milestone.
11. Accessibility and reduced-motion support are requirements, not extras.
12. Keep files focused (< ~400 lines where practical) and name things for the domain (`TrainPhysics`, `ChunkMesher`, `UpgradeShop`).

## Commands

- `pnpm dev` — dev server (http://localhost:3000)
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build`
- `pnpm test:e2e` — Playwright smoke tests (starts its own server) and screenshots to `test-results/`

## Layout

- `src/game/**` and `src/lib/**` — pure TS (no three/React imports in `simulation`, `economy`, `lib`).
- `src/render/**` — three.js code (terrain chunks + workers, train/station models, effects).
- `src/components/**` — React/R3F components (`game/` canvas + scene, `hud/` UI).
- `tests/unit` (Vitest), `tests/e2e` (Playwright).
