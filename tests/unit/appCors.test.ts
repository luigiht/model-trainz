import { describe, expect, it } from "vitest";
import { allowApp, preflight } from "@/server/appCors";

const from = (origin?: string) =>
  new Request("https://example.test/api/games/ABCD", {
    headers: origin ? { origin } : {},
  });

describe("app CORS", () => {
  it("lets the iOS and Android apps read responses", () => {
    for (const origin of ["capacitor://localhost", "https://localhost"]) {
      const res = allowApp(from(origin), Response.json({ ok: true }));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(origin);
      expect(res.headers.get("Vary")).toContain("Origin");
    }
  });

  it("allows no other origin", () => {
    for (const origin of ["https://evil.test", "http://localhost", undefined]) {
      const res = allowApp(from(origin), Response.json({ ok: true }));
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    }
  });

  it("answers the app's preflight", () => {
    const res = preflight(from("capacitor://localhost"), "GET, PUT");
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("GET, PUT");
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
  });
});
