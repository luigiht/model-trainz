# Architecture

```
src/app/                 Next.js shell (server components): layout, page → <GameRoot/>
src/components/game/     Client: GameRoot (dynamic ssr:false import), GameCanvas, scene parts, RenderProbe
src/components/hud/      DOM HUD: LoadingScreen, DebugOverlay (`), QualityMenu
src/game/state/          Zustand stores (settings: persisted; render runtime: not persisted)
src/render/effects/      Quality tiers (pure), QualityGovernor (pure)
src/render/debugStats.ts Mutable per-frame stats shared between canvas and overlay
src/lib/                 Pure utilities: seeded RNG + hashing
tests/unit, tests/e2e    Vitest, Playwright (SwiftShader WebGL)
```

## Data flow

- Settings → `useActiveQualityLevel()` + toggles → `resolveEffects()` → `GameCanvas` mounts the
  matching shadow config and `PostEffects` passes.
- `RenderProbe` (inside the canvas) → `debugStats` (mutable) → `DebugOverlay` (setInterval, DOM
  textContent). It also feeds frame times to `QualityGovernor`, which writes `autoLevel` to the
  runtime store when the effective level should change.

This document grows with each milestone.
