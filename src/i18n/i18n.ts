import { useSyncExternalStore } from "react";
import { useSettingsStore } from "@/game/state/settingsStore";
import { DEFAULT_LOCALE, detectLocale, isLocale, type Locale } from "./locales";
import { en, type Messages } from "./messages/en";
import { es } from "./messages/es";
import { it } from "./messages/it";

const MESSAGES: Record<Locale, Messages> = { en, es, it };

const browserLocale = () =>
  detectLocale(navigator.languages.length ? navigator.languages : [navigator.language]);

function subscribeBrowserLanguage(cb: () => void) {
  window.addEventListener("languagechange", cb);
  return () => window.removeEventListener("languagechange", cb);
}

/** The language the player picked, else the browser's. English on the server and while hydrating. */
export function useLocale(): Locale {
  const chosen = useSettingsStore((s) => s.locale);
  const detected = useSyncExternalStore(
    subscribeBrowserLanguage,
    browserLocale,
    () => DEFAULT_LOCALE,
  );
  // The choice comes from localStorage, so it may not be a language we (still) have.
  return isLocale(chosen) ? chosen : detected;
}

export function useMessages(): Messages {
  return MESSAGES[useLocale()];
}

/** For event handlers and other code outside React rendering. */
export function currentMessages(): Messages {
  const chosen = useSettingsStore.getState().locale;
  return MESSAGES[isLocale(chosen) ? chosen : browserLocale()];
}
