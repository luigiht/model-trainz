import { NextResponse } from "next/server";
import { deserializeSave } from "@/game/save/save";
import { cleanPlayerName, normalizeGameId } from "@/lib/gameId";
import { allowApp, preflight } from "@/server/appCors";
import { StoreUnavailableError, deleteGame, getGame, putGame } from "@/server/gameStore";

/** Saves are a few KB; anything much bigger isn't one. */
const MAX_BODY_BYTES = 64 * 1024;

type Context = { params: Promise<{ id: string }> };
type Handler = (req: Request, ctx: Context) => Promise<Response>;

/** Lets the iOS/Android app read the response from its own origin. */
const forApp =
  (handler: Handler): Handler =>
  async (req, ctx) =>
    allowApp(req, await handler(req, ctx));

export const OPTIONS = (req: Request) => preflight(req, "GET, PUT, DELETE");

const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function storeFailure(e: unknown) {
  if (e instanceof StoreUnavailableError)
    return reply({ error: "Online saves are unavailable." }, 503);
  console.error("game store error", e);
  return reply({ error: "Server error." }, 500);
}

/** Load a game by ID (anyone with the ID can continue it: the ID is the share link). */
export const GET = forApp(async (_req, { params }) => {
  const id = normalizeGameId((await params).id);
  if (!id) return reply({ error: "Invalid Game ID." }, 400);
  try {
    const game = await getGame(id);
    if (!game) return reply({ error: "No game with that ID." }, 404);
    return reply({ id, name: game.name, save: game.save, updatedAt: game.updatedAt });
  } catch (e) {
    return storeFailure(e);
  }
});

/** Create or update a game: `{ name, save }`, where `save` must be a valid save envelope. */
export const PUT = forApp(async (req, { params }) => {
  const id = normalizeGameId((await params).id);
  if (!id) return reply({ error: "Invalid Game ID." }, 400);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES)
    return reply({ error: "Too large." }, 413);
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return reply({ error: "Too large." }, 413);

  let body: { name?: unknown; save?: unknown };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    return reply({ error: "Invalid JSON." }, 400);
  }
  const name = typeof body?.name === "string" ? cleanPlayerName(body.name) : null;
  const save = body?.save;
  if (!name || typeof save !== "string" || !deserializeSave(save).ok)
    return reply({ error: "Invalid game data." }, 400);

  try {
    const updatedAt = Date.now();
    await putGame(id, { name, save, updatedAt });
    return reply({ id, updatedAt });
  } catch (e) {
    return storeFailure(e);
  }
});

/** Erase a game and the player's name with it (the player's right to delete their data). */
export const DELETE = forApp(async (_req, { params }) => {
  const id = normalizeGameId((await params).id);
  if (!id) return reply({ error: "Invalid Game ID." }, 400);
  try {
    await deleteGame(id);
    return reply({ id, deleted: true });
  } catch (e) {
    return storeFailure(e);
  }
});
