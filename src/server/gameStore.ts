/**
 * Server-side game storage: a `games` table in Supabase (through its REST API) when SUPABASE_URL
 * and SUPABASE_SECRET_KEY are set; otherwise one JSON file per game under `.data/games/` for local
 * development. On Vercel without Supabase, online saves are unavailable.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredGame {
  name: string;
  /** Serialised save envelope (see `serializeSave`). */
  save: string;
  updatedAt: number;
}

export class StoreUnavailableError extends Error {}

const SAFE_ID = /^[A-Z0-9-]{4,24}$/;

function supabaseConfig() {
  // GAME_STORE=local forces the file store (the e2e server uses it to keep test games out).
  if (process.env.GAME_STORE === "local") return null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url: url.replace(/\/+$/, ""), key } : null;
}

/** Calls the Supabase Data API with the secret key (server-only; it bypasses Row Level Security). */
async function supabase(route: string, init: RequestInit = {}): Promise<Response> {
  const cfg = supabaseConfig()!;
  const res = await fetch(`${cfg.url}/rest/v1/${route}`, {
    ...init,
    headers: { apikey: cfg.key, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new StoreUnavailableError(`Supabase responded ${res.status}`);
  return res;
}

function gameFile(id: string) {
  if (process.env.VERCEL) throw new StoreUnavailableError("No game store configured.");
  return path.join(process.cwd(), ".data", "games", `${id}.json`);
}

function assertSafeId(id: string) {
  if (!SAFE_ID.test(id)) throw new Error("Unsafe game ID.");
}

export async function getGame(id: string): Promise<StoredGame | null> {
  assertSafeId(id);
  if (supabaseConfig()) {
    const res = await supabase(`games?id=eq.${id}&select=name,save,updated_at`);
    const [row] = (await res.json()) as { name: string; save: string; updated_at: string }[];
    return row ? { name: row.name, save: row.save, updatedAt: Date.parse(row.updated_at) } : null;
  }
  try {
    return JSON.parse(await readFile(gameFile(id), "utf8")) as StoredGame;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function putGame(id: string, game: StoredGame): Promise<void> {
  assertSafeId(id);
  if (supabaseConfig()) {
    await supabase("games", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id,
        name: game.name,
        save: game.save,
        updated_at: new Date(game.updatedAt).toISOString(),
      }),
    });
    return;
  }
  const file = gameFile(id);
  await mkdir(path.dirname(file), { recursive: true });
  // Write-then-rename so a concurrent reader never sees a half-written file.
  const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(tmp, JSON.stringify(game));
  await rename(tmp, file);
}
