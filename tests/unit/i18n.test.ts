import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, detectLocale, isLocale } from "@/i18n/locales";
import { en } from "@/i18n/messages/en";
import { es } from "@/i18n/messages/es";
import { it as italian } from "@/i18n/messages/it";

/** Every key of `ref` exists in `other` with the same kind of value (and array length / arity). */
function shapeErrors(ref: unknown, other: unknown, path = ""): string[] {
  if (typeof ref !== typeof other || Array.isArray(ref) !== Array.isArray(other))
    return [`${path}: ${typeof ref} vs ${typeof other}`];
  if (typeof ref === "function")
    return ref.length === (other as (...a: unknown[]) => unknown).length ? [] : [`${path}: arity`];
  if (typeof ref === "string") return (other as string).trim() ? [] : [`${path}: empty`];
  if (ref && typeof ref === "object") {
    const o = other as Record<string, unknown>;
    const r = ref as Record<string, unknown>;
    if (Object.keys(r).length !== Object.keys(o).length) return [`${path}: key count`];
    return Object.keys(r).flatMap((k) => shapeErrors(r[k], o[k], `${path}.${k}`));
  }
  return [];
}

describe("language detection", () => {
  it("picks the first supported language in the browser's preferences", () => {
    expect(detectLocale(["es-MX", "en-US"])).toBe("es");
    expect(detectLocale(["it-IT"])).toBe("it");
    expect(detectLocale(["fr-FR", "it", "es"])).toBe("it");
    expect(detectLocale(["EN_gb"])).toBe("en");
  });

  it("falls back to English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(detectLocale(["fr-FR", "de"])).toBe("en");
    expect(detectLocale([])).toBe("en");
    expect(detectLocale([""])).toBe("en");
  });

  it("only accepts supported locales", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe("translations", () => {
  it.each([
    ["es", es],
    ["it", italian],
  ])("%s has every English message", (_, messages) => {
    expect(shapeErrors(en, messages)).toEqual([]);
  });

  it("pluralises piece counts", () => {
    expect(en.status.layMore(1, "X")).toBe("Lay 1 more piece to reach X");
    expect(es.status.layMore(2, "X")).toBe("Coloca 2 piezas más para llegar a X");
    expect(italian.status.perClick(1, "1")).toBe("1 pezzo/clic");
  });
});
