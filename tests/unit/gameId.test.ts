import { describe, expect, it } from "vitest";
import { cleanPlayerName, generateGameId, normalizeGameId } from "@/lib/gameId";

const bytes = (fill: number) => (n: number) => new Uint8Array(n).fill(fill);

describe("game ids", () => {
  it("generates readable, well-formed ids", () => {
    expect(generateGameId(bytes(0))).toBe("0000-0000-0000");
    expect(generateGameId(bytes(31))).toBe("ZZZZ-ZZZZ-ZZZZ");
    const id = generateGameId((n) => crypto.getRandomValues(new Uint8Array(n)));
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(normalizeGameId(id)).toBe(id);
  });

  it("normalises typed ids and rejects junk", () => {
    expect(normalizeGameId("  7k2m-9qxp-4hcw ")).toBe("7K2M-9QXP-4HCW");
    expect(normalizeGameId("my train 42")).toBe("MYTRAIN42");
    expect(normalizeGameId("abc")).toBeNull();
    expect(normalizeGameId("-ABCD")).toBeNull();
    expect(normalizeGameId("ABCD/../x")).toBeNull();
    expect(normalizeGameId("A".repeat(25))).toBeNull();
  });

  it("cleans player names", () => {
    expect(cleanPlayerName("  Ada   Lovelace ")).toBe("Ada Lovelace");
    expect(cleanPlayerName("\u0000\u200b  ")).toBeNull();
    expect(cleanPlayerName("x".repeat(40))).toHaveLength(24);
  });
});
