# Model Trainz

A cozy 3D incremental game about building a railway, one piece of track at a time. It runs in the
browser and as an iOS and Android app, in English, Spanish or Italian, and your Game ID lets you
carry on from any device.

![Model Trainz: the train pulled in at a station, with the status panel, upgrades and Lay track button](docs/screenshot.png)

## Gameplay

Your little steam train waits at a station. Between it and the next station there's nothing but
countryside, so it's up to you to build the line.

- **Start playing.** Enter your name on the start screen and press **Play**. Have the Game ID of
  an earlier game? Enter it too and you'll continue that game.
- **Lay track.** Click or tap anywhere on the scene, press or hold **Space**, or use the
  **Lay track** button. Each click lays track in front of the train; hold to keep going.
- **Run the line.** When the track reaches the next station the train departs, chuffs along the
  new stretch and collects fares when it pulls in. Then the next leg begins.
- **Upgrade.** Spend coins in the **Upgrades** panel on the right (collapse it with **Hide/Show**;
  on phones it's a drawer you pull out from the right edge):

  | Upgrade        | Effect                               |
  | -------------- | ------------------------------------ |
  | Bigger Shovels | +1 track piece per click             |
  | Steel Rails    | +$1 for every track piece laid       |
  | Track Gang     | +0.5 pieces/sec, laid automatically  |
  | Hotter Boiler  | +20% train speed                     |
  | Fare Hike      | +25% station fares                   |
  | Extra Carriage | +1 carriage on the train, +50% fares |
  | Golden Spikes  | +2% chance that a click pays out 20× |

- **Visit the Depot.** The **Depot** tab next to Upgrades sells new train sets. The one in service
  sets the train's top speed and fares; once bought you can switch between them for free.

  | Train set         | Price | Locomotive + coaches             | Bonus                  |
  | ----------------- | ----- | -------------------------------- | ---------------------- |
  | Heritage Steam    | Free  | Steam tank engine + teak coaches | —                      |
  | Evergreen Express | $50K  | Mainline diesel + modern coaches | +50% speed, +50% fares |

- **Pick up where you left off.** Your game pauses when you close the tab. Next time, the start
  screen welcomes you back with a **Continue** button. To carry on from another device, copy your
  Game ID from the **Game** panel and enter it on the start screen there, or open the same page
  address there (it includes the ID). Anyone with the ID can play that game, so keep it to yourself.
- **Pick a view.** Press **V** (or use the toggle bottom left) to switch between the overhead
  **Diorama** and the first-person **Cab**. Scroll to zoom the diorama; in the cab, drag or use the
  arrow keys to look around and **C** to re-centre. The Evergreen Express cab has a full driver's
  desk, with power and brake handles that move and live speed and power gauges.
- **Choose a language.** The game follows your browser's language (English, Spanish or Italian,
  falling back to English). Change it from the start screen or in **Settings**.
- **Settings** (top right) cover language, sound, volume, graphics quality (Auto, Low, Medium,
  High, Ultra) and the full list of controls.

Progress is saved automatically on your device and online: every minute, a few seconds after you
buy something or reach a station, and when you leave the page. If the server can't be reached,
progress is kept on your device until it can.

## Toolstack

| Area                | Tools                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Framework           | [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript (strict)                 |
| 3D rendering        | [three.js](https://threejs.org) via React Three Fiber and drei                               |
| Post-processing     | `postprocessing` + `@react-three/postprocessing` (bloom, SSAO, tone mapping, SMAA, vignette) |
| World generation    | `simplex-noise` terrain, meshed in Web Workers                                               |
| State               | Zustand                                                                                      |
| Online saves        | `/api/games/[id]` route handler + [Supabase](https://supabase.com) table                     |
| UI                  | Tailwind CSS 4                                                                               |
| Languages           | Typed message dictionaries in `src/i18n` (English, Spanish, Italian), no i18n library        |
| Mobile apps         | [Capacitor](https://capacitorjs.com) 8 (iOS and Android) around a static export of the game  |
| Audio               | Web Audio API (all sound effects synthesised at runtime)                                     |
| Testing and quality | Vitest, Playwright, ESLint, Prettier                                                         |
| Package manager     | pnpm                                                                                         |

All models, textures and sounds are generated procedurally; there are no external art assets.

## Getting started

### Run locally

You need Node.js 20 or newer and pnpm. The pnpm version is pinned in `package.json`; run
`corepack enable` once to use it automatically.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Online saves work locally without any setup: each game is stored as a JSON file in `.data/games/`.
To use Supabase instead, put `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local` (set
`GAME_STORE=local` to force the local files even then).

### Useful scripts

| Script                | What it does                                                 |
| --------------------- | ------------------------------------------------------------ |
| `pnpm build`          | Production build                                             |
| `pnpm start`          | Serve the production build                                   |
| `pnpm typecheck`      | Type-check with `tsc`                                        |
| `pnpm lint`           | ESLint (zero warnings allowed)                               |
| `pnpm test`           | Unit tests (Vitest)                                          |
| `pnpm test:e2e`       | Browser smoke tests (Playwright)                             |
| `pnpm screenshot`     | Re-capture `docs/screenshot.png` while `pnpm dev` is running |
| `pnpm format`         | Format with Prettier                                         |
| `pnpm mobile:build`   | Build the app and copy it into `ios/` and `android/`         |
| `pnpm mobile:ios`     | Open the iOS project in Xcode                                |
| `pnpm mobile:android` | Open the Android project in Android Studio                   |

`pnpm dev` keeps its files in `.next/dev`, so it can keep running while you build. `pnpm build`
and `pnpm mobile:build` share `.next/`: after building the app, run `pnpm build` again before
`pnpm start`.

### Deploy to Vercel

1. Push the repository to GitHub, GitLab or Bitbucket and import it at
   [vercel.com/new](https://vercel.com/new).
2. Keep the detected Next.js defaults.
3. Add the environment variable `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel uses the pinned pnpm
   version.
4. Social preview images link to `https://model-trainz.luigiht.com`. To deploy under another
   domain, set `NEXT_PUBLIC_SITE_URL` (for example `https://modeltrainz.example`).
5. For online saves (Game IDs that work on any device), set `SUPABASE_URL` and
   `SUPABASE_SECRET_KEY` from a Supabase project with a `games` table (see
   `docs/DECISIONS.md`, "Players and Game IDs", for the table SQL). Without them, saves stay in
   the browser.

Each deployment is stamped with its Vercel deployment ID. Visitors who haven't started a game yet
are refreshed onto the newest build automatically.

### iOS and Android apps

The apps are native [Capacitor](https://capacitorjs.com) shells around a static export of the
game, so the website and the apps share all their code. The apps have no server of their own: they
use the website's API for online saves, so deploy the website first.

You need Node.js 22 or newer, [Xcode](https://developer.apple.com/xcode/) for iOS and
[Android Studio](https://developer.android.com/studio) for Android.

```bash
pnpm mobile:build     # static export in out/, copied into ios/ and android/
pnpm mobile:ios       # open in Xcode, then Run on a simulator or device
pnpm mobile:android   # open in Android Studio, then Run
```

For step-by-step Android instructions (tool setup, emulator, your own phone, a test APK and
troubleshooting), see [docs/ANDROID.md](docs/ANDROID.md).

- Run `pnpm mobile:build` again after every change to the game. The `ios/` and `android/`
  projects are committed; edit them only for native settings such as icons, signing and versions.
- The apps save online through `https://model-trainz.luigiht.com`. To use another deployment (a
  preview, say), build with `API_ORIGIN=https://... pnpm mobile:build`. The API only accepts
  cross-origin requests from the apps (`capacitor://localhost` on iOS, `https://localhost` on
  Android).
- The apps update through the App Store and Google Play, not through new website deployments.
