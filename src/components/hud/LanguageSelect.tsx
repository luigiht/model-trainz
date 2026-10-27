"use client";

import { useSettingsStore } from "@/game/state/settingsStore";
import { useLocale, useMessages } from "@/i18n/i18n";
import { LOCALES, LOCALE_NAMES, isLocale } from "@/i18n/locales";
import { PixelIcon } from "./PixelIcon";

const VARIANTS = {
  /** Inline with the copyright line on the start screen. */
  link: {
    select: "bg-transparent pr-3.5 underline underline-offset-2 hover:text-amber-200",
    chevron: "right-0",
  },
  /** A form field, in Settings. */
  field: {
    select:
      "border border-white/10 bg-black/20 py-1.5 pl-2 pr-7 text-sm text-amber-50 hover:bg-white/10",
    chevron: "right-2.5",
  },
};

/** Language picker, each language written in itself. Choosing one overrides the browser's. */
export function LanguageSelect({
  variant,
  testId,
}: {
  variant: keyof typeof VARIANTS;
  testId: string;
}) {
  const locale = useLocale();
  const t = useMessages();
  const setLocale = useSettingsStore((s) => s.setLocale);
  const v = VARIANTS[variant];

  return (
    <label className="relative inline-flex items-center gap-1.5">
      <PixelIcon name="globe" className="size-3.5 shrink-0 text-amber-200/80" />
      <span className="sr-only">{t.language}</span>
      <select
        value={locale}
        onChange={(e) => {
          if (isLocale(e.target.value)) setLocale(e.target.value);
        }}
        data-testid={testId}
        className={`cursor-pointer appearance-none rounded [color-scheme:dark] focus-visible:outline-2 focus-visible:outline-amber-300 [&>option]:bg-[#2a241d] [&>option]:text-amber-50 ${v.select}`}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className={`pointer-events-none absolute h-2.5 w-2.5 ${v.chevron}`}
      >
        <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    </label>
  );
}
