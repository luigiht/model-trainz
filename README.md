# Rail Baron Clicker

A cozy 3D train clicker: shovel coal, build steam, and grow a rail empire across a voxel diorama
rendered with soft shadows, ambient occlusion and bloom. Runs entirely in the browser.

> Work in progress. See `docs/PLAN.md` for milestone status.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Script           | What it does                         |
| ---------------- | ------------------------------------ |
| `pnpm build`     | Production build                     |
| `pnpm start`     | Serve the production build           |
| `pnpm typecheck` | `tsc --noEmit`                       |
| `pnpm lint`      | ESLint (zero warnings allowed)       |
| `pnpm test`      | Vitest unit tests                    |
| `pnpm test:e2e`  | Playwright smoke tests + screenshots |
| `pnpm format`    | Prettier                             |

## Controls (so far)

- Drag to orbit, scroll to zoom.
- `` ` `` toggles the debug overlay (FPS, draw calls, triangles…).
- Quality picker (top right): Auto / Low / Medium / High / Ultra.

## Docs

`docs/PLAN.md` · `docs/ARCHITECTURE.md` · `docs/DECISIONS.md` · `CLAUDE.md` (project rules)
