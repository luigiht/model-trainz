/**
 * Who's playing and which game: the player's name and Game ID (remembered in this browser), the
 * game's save mirrored to the server so the ID or a `?game=ID` link continues it anywhere.
 */
import { create } from "zustand";
import {
  clearSave,
  deserializeSave,
  readSave,
  serializeSave,
  setSaveSlot,
  writeSave,
} from "@/game/save/save";
import { game, initGame, loadGame, onCheckpoint, setRunning } from "@/game/state/game";
import { cleanPlayerName, generateGameId, normalizeGameId } from "@/lib/gameId";
import { apiUrl } from "./api";
import { VERSION_PARAM, reloadIfOutdated } from "./version";

const PROFILE_KEY = "mt-profile";
const SYNC_MS = 60_000;
/** A purchase or a stop reached is pushed this soon (later ones in the window ride along). */
const CHECKPOINT_SYNC_MS = 3000;
const FETCH_TIMEOUT_MS = 8000;

export type SyncStatus = "idle" | "saving" | "saved" | "offline";

interface SessionState {
  /** booting → resume (returning player) or profile (name form) → active. */
  phase: "booting" | "resume" | "profile" | "active";
  name: string;
  gameId: string;
  /** This browser remembers a game the player can go back to from the form. */
  resumable: boolean;
  /** Name form prefills (from a shared `?game=` link or the remembered player). */
  suggestedId: string;
  suggestedName: string;
  sync: SyncStatus;
  syncedAt: number | null;
}

export const useSession = create<SessionState>()(() => ({
  phase: "booting",
  name: "",
  gameId: "",
  resumable: false,
  suggestedId: "",
  suggestedName: "",
  sync: "idle",
  syncedAt: null,
}));

interface Profile {
  name: string;
  gameId: string;
}

function readProfile(): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as Partial<Profile> | null;
    const name = typeof p?.name === "string" ? cleanPlayerName(p.name) : null;
    const gameId = typeof p?.gameId === "string" ? normalizeGameId(p.gameId) : null;
    return name && gameId ? { name, gameId } : null;
  } catch {
    return null;
  }
}

function writeProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: the player is asked again next visit */
  }
}

const gameUrl = (id: string) => apiUrl(`/api/games/${encodeURIComponent(id)}`);

/** The server's copy of a game: null if there is none, "offline" if the server can't be reached. */
async function fetchGame(
  id: string,
  attempts = 1,
): Promise<{ name: string; save: string } | null | "offline"> {
  try {
    const res = await fetch(gameUrl(id), {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { name?: unknown; save?: unknown };
    return typeof body.name === "string" && typeof body.save === "string"
      ? { name: body.name, save: body.save }
      : "offline";
  } catch {
    return attempts > 1 ? fetchGame(id, attempts - 1) : "offline";
  }
}

/** Set when we couldn't check the server and had no local copy: never overwrite a game unseen. */
let unverified = false;

/**
 * Switch to game `id`, playing whichever is newer of this browser's copy and the server's.
 * With neither, `keepCurrent` adopts the game on screen (first visit), otherwise starts fresh.
 * Returns false (changing nothing) if the server must be reached but can't be.
 */
async function enterGame(
  name: string,
  id: string,
  opts: { keepCurrent: boolean; requireServer: boolean },
): Promise<boolean> {
  const remote = await fetchGame(id, opts.requireServer ? 2 : 1);
  if (remote === "offline" && opts.requireServer) return false;
  setSaveSlot(id);
  const local = readSave();
  const fromServer = remote && remote !== "offline" ? deserializeSave(remote.save) : null;
  let best = local?.ok ? local : null;
  if (fromServer?.ok && (!best || fromServer.savedAt > best.savedAt)) best = fromServer;
  if (best) loadGame(best);
  else if (!opts.keepCurrent) loadGame(null);
  unverified = remote === "offline" && !local?.ok;

  writeSave(game.state);
  writeProfile({ name, gameId: id });
  const url = new URL(window.location.href);
  url.searchParams.set("game", id);
  window.history.replaceState(null, "", url);
  useSession.setState({ phase: "active", name, gameId: id });
  setRunning(true);
  startSync();
  void syncNow();
  return true;
}

/** First visit only: a new game keeps the progress on screen (saved before Game IDs existed). */
let adoptOnScreen = false;

let booted = false;
/** Called once on startup: returning players are offered their game, first-timers the name form. */
export async function bootSession() {
  if (booted) return;
  booted = true;
  const url = new URL(window.location.href);
  if (url.searchParams.has(VERSION_PARAM)) {
    url.searchParams.delete(VERSION_PARAM);
    window.history.replaceState(null, "", url);
  }
  initGame();
  const profile = readProfile();
  const linked = normalizeGameId(new URLSearchParams(window.location.search).get("game") ?? "");
  if (profile) {
    useSession.setState({ name: profile.name, gameId: profile.gameId, resumable: true });
    if (!linked || linked === profile.gameId) {
      // The world loads behind the Continue card with this browser's copy of the game.
      setSaveSlot(profile.gameId);
      const local = readSave();
      loadGame(local?.ok ? local : null);
      useSession.setState({ phase: "resume" });
      return;
    }
    useSession.setState({ phase: "profile", suggestedId: linked, suggestedName: profile.name });
    return;
  }
  // No name yet: make sure this is the latest build before asking for one.
  if (await reloadIfOutdated()) return;
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && !readProfile()) void reloadIfOutdated();
  });
  // First visit: the world loads behind the form with whatever this browser had saved before.
  adoptOnScreen = true;
  const before = readSave();
  loadGame(before?.ok ? before : null);
  useSession.setState({ phase: "profile", suggestedId: linked ?? "" });
  if (linked) {
    const remote = await fetchGame(linked);
    if (remote && remote !== "offline") useSession.setState({ suggestedName: remote.name });
  }
}

/** Continue card: carry on with the remembered game. */
export async function resumeGame() {
  const { name, gameId } = useSession.getState();
  await enterGame(name, gameId, { keepCurrent: false, requireServer: false });
}

/** Continue card: start a new game or enter another Game ID instead. */
export function chooseAnotherGame() {
  const { name } = useSession.getState();
  useSession.setState({ phase: "profile", suggestedName: name, suggestedId: "" });
}

/** Name form: back to the Continue card. */
export function backToResume() {
  useSession.setState({ phase: "resume" });
}

/** Why the name form couldn't start the game (shown in the player's language by the form). */
export type ProfileError = "name" | "id" | "offline";

/** Name form. Returns what went wrong, or null once the game has started. */
export async function submitProfile(
  nameInput: string,
  idInput: string,
): Promise<ProfileError | null> {
  const name = cleanPlayerName(nameInput);
  if (!name) return "name";
  if (!idInput.trim()) {
    const id = generateGameId((n) => crypto.getRandomValues(new Uint8Array(n)));
    await enterGame(name, id, { keepCurrent: adoptOnScreen, requireServer: false });
    return null;
  }
  const id = normalizeGameId(idInput);
  if (!id) return "id";
  const ok = await enterGame(name, id, { keepCurrent: adoptOnScreen, requireServer: true });
  return ok ? null : "offline";
}

let syncing = false;
let checkpointTimer: number | undefined;
/** The PUT in flight, so a deletion can wait for it rather than race it. */
let pushing: Promise<unknown> = Promise.resolve();
/** Set while this game is being deleted: nothing may push it to the server again. */
let deleting = false;
function startSync() {
  if (syncing) return;
  syncing = true;
  window.setInterval(() => void syncNow(), SYNC_MS);
  onCheckpoint(() => {
    if (checkpointTimer !== undefined) return;
    checkpointTimer = window.setTimeout(() => {
      checkpointTimer = undefined;
      void syncNow();
    }, CHECKPOINT_SYNC_MS);
  });
  const flush = () => void syncNow(true);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}

/** Push this game to the server (keepalive lets it finish while the page closes). */
async function syncNow(closing = false) {
  const { gameId, name } = useSession.getState();
  if (!gameId || deleting) return;
  if (unverified) {
    if (closing) return;
    const remote = await fetchGame(gameId);
    if (remote === "offline") return useSession.setState({ sync: "offline" });
    unverified = false;
    const fromServer = remote ? deserializeSave(remote.save) : null;
    if (fromServer?.ok) loadGame(fromServer);
  }
  if (deleting) return;
  if (!closing) useSession.setState({ sync: "saving" });
  try {
    const req = fetch(gameUrl(gameId), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, save: serializeSave(game.state) }),
      keepalive: closing,
      signal: closing ? undefined : AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    pushing = req.catch(() => {});
    const res = await req;
    useSession.setState(res.ok ? { sync: "saved", syncedAt: Date.now() } : { sync: "offline" });
  } catch {
    useSession.setState({ sync: "offline" });
  }
}

/**
 * Game panel: erase this game from the server and this device (name, ID and progress), then
 * reload to the start screen. Returns false, deleting nothing, if the server can't be reached.
 */
export async function deleteGame(): Promise<boolean> {
  const { gameId } = useSession.getState();
  deleting = true;
  await pushing;
  try {
    const res = await fetch(gameUrl(gameId), {
      method: "DELETE",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    deleting = false;
    return false;
  }
  setRunning(false);
  clearSave();
  // The pre-Game-ID slot too, or the next first visit would adopt it; the page writes a fresh game
  // there as it unloads.
  setSaveSlot(null);
  loadGame(null);
  clearSave();
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* storage unavailable: nothing was remembered */
  }
  window.location.replace(window.location.pathname);
  return true;
}
