/** Supported languages and browser-language detection. Pure. */

export const LOCALES = ["en", "es", "it"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Each language in its own words, as shown in the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  it: "Italiano",
};

export const isLocale = (v: unknown): v is Locale =>
  typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** The first supported language in the browser's preference list (e.g. "es-MX" → "es"), else English. */
export function detectLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const lang = tag.split(/[-_]/)[0].toLowerCase();
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}
