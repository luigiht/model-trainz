# Rail Baron Clicker

A cozy 3D railway clicker: click to lay track in front of your little steam train, watch it chuff
to the next station, collect fares and upgrade your way to an automatic track gang. Low-poly world
with soft shadows and bloom. Runs entirely in the browser.

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

## How to play

- **Click the scene** (or press/hold **Space**, or the **Lay track** button) to lay track in front of
  the train. Hold to keep laying (capped at 12 pieces of effort per second).
- When the track reaches the next station, the train departs and earns fares on arrival.
- Spend coins in the **Upgrades** panel: bigger shovels, steel rails, a track gang that lays track
  automatically (even while you're away), a hotter boiler, fare hikes, extra carriages, golden spikes.
- **V** (or the View toggle, bottom left) switches between the **Diorama** view and the first-person
  **Cab** view. In the cab, **drag** to look around (arrow keys too, **C** re-centres); tap to lay track.
- Scroll to zoom (Diorama). `` ` `` toggles the debug overlay. **Settings** (top right) has sound,
  volume, graphics quality, camera view and the full controls list.
- Progress autosaves to your browser.

## Docs

`docs/PLAN.md` · `docs/ARCHITECTURE.md` · `docs/DECISIONS.md` · `CLAUDE.md` (project rules)
