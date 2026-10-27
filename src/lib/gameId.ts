/** Game IDs: what players type, bookmark and share to continue a game. Pure (client + server). */

/** Crockford base32: no I, L, O or U, so generated IDs are easy to read back and type. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const VALID = /^[A-Z0-9][A-Z0-9-]{2,22}[A-Z0-9]$/;

/** A fresh, unguessable ID like "7K2M-9QXP-4HCW" (60 random bits). */
export function generateGameId(randomBytes: (n: number) => Uint8Array): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => ALPHABET[b % 32]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

/** Canonical form of a typed ID (upper case, no spaces), or null if it can't be a Game ID. */
export function normalizeGameId(input: string): string | null {
  const id = input.trim().toUpperCase().replace(/\s+/g, "");
  return VALID.test(id) ? id : null;
}

export const PLAYER_NAME_MAX = 24;

/** Trimmed player name without control characters, or null if empty. */
export function cleanPlayerName(input: string): string | null {
  const name = Array.from(input.replace(/[\p{Cc}\p{Cf}]/gu, "").trim().replace(/\s+/g, " "))
    .slice(0, PLAYER_NAME_MAX)
    .join("")
    .trim();
  return name ? name : null;
}
