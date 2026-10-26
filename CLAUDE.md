@AGENTS.md

# Rail Baron Clicker

A cozy 3D incremental/clicker game. The player drives a train through a procedurally generated voxel
diorama: click/hold/Space to build steam pressure, move the train, earn coins, and spend them on
upgrades, locomotives, carriages, routes and automation, eventually prestiging ("Retire & Rebuild")
for Golden Rails. The look is "voxel meets realistic lighting": greedy-meshed voxel chunks with baked
vertex AO, a procedural pixel-art atlas, PBR-ish materials, shadows and a quality-tiered
post-processing stack. Two camera modes: first-person Cab view and an isometric diorama view.
Fully client-side Next.js app; no backend, no external assets.

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
- `pnpm sim` — economy balance simulator (from M3)

## Layout

- `src/game/**` and `src/lib/**` — pure TS (no three/React imports in `simulation`, `economy`, `lib`).
- `src/render/**` — three.js code (voxel engine, materials, effects, train models).
- `src/components/**` — React/R3F components (`game/` canvas + scene, `hud/` UI).
- `tests/unit` (Vitest), `tests/e2e` (Playwright).
