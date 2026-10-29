"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { LanguageSelect } from "@/components/hud/LanguageSelect";
import { useLocale, useMessages } from "@/i18n/i18n";
import { en } from "@/i18n/messages/en";

const CONTACT_EMAIL = "luis.luigiht@gmail.com";

const subscribeNothing = () => () => {};

/** The privacy policy page, in the player's language (English until hydrated, like the server). */
export function PrivacyPolicy() {
  const locale = useLocale();
  const messages = useMessages();
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const t = (hydrated ? messages : en).privacy;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="h-full overflow-y-auto bg-[#1b1712] text-amber-50">
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm text-amber-200 underline underline-offset-2 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            {t.back}
          </Link>
          <span className="text-xs text-amber-100/75">
            <LanguageSelect variant="link" testId="privacy-language" />
          </span>
        </header>
        <div>
          <h1 className="font-body text-2xl text-amber-300">{t.title}</h1>
          <p className="mt-1 text-xs text-amber-100/60">{t.updated}</p>
        </div>
        {t.sections.map((s) => (
          <section key={s.heading} className="flex flex-col gap-2">
            <h2 className="font-body text-lg text-amber-200">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="text-sm leading-relaxed text-amber-50/90">
                {p}
              </p>
            ))}
          </section>
        ))}
        <section className="flex flex-col gap-2">
          <h2 className="font-body text-lg text-amber-200">{t.contactHeading}</h2>
          <p className="text-sm leading-relaxed text-amber-50/90">
            {t.contact}{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-amber-200 underline underline-offset-2 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
