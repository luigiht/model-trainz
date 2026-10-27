"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import logo from "@/assets/model-trainz-logo.svg";
import { useSession } from "@/game/session/session";
import { useMessages } from "@/i18n/i18n";
import { Credit } from "./Credit";
import { LanguageSelect } from "./LanguageSelect";
import { ProfileForm } from "./ProfileForm";
import { ResumeCard } from "./ResumeCard";

const LoadingScene = dynamic(() => import("@/components/game/LoadingScene"), { ssr: false });

/** How long the fade-out runs before the backdrop scene is unmounted (frees its WebGL context). */
const FADE_MS = 700;

const subscribeNothing = () => () => {};

/** Full-screen loader: the logo over a cab-view ride built from the game's own models. */
export function LoadingScreen({
  visible,
  reducedMotion,
}: {
  visible: boolean;
  reducedMotion: boolean;
}) {
  const [tip, setTip] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneMounted, setSceneMounted] = useState(true);
  const phase = useSession((s) => s.phase);
  const t = useMessages();
  // The server can't know the player's language, so text waits for the client.
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  useEffect(() => {
    const id = window.setInterval(() => setTip((i) => i + 1), 3500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (visible) return;
    const id = window.setTimeout(() => setSceneMounted(false), FADE_MS + 100);
    return () => window.clearTimeout(id);
  }, [visible]);

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={`absolute inset-0 z-40 overflow-hidden bg-[#1b1712] text-amber-100 transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {sceneMounted && (
        <div
          aria-hidden
          className={`absolute inset-0 transition-opacity duration-1000 ${
            sceneReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <LoadingScene reducedMotion={reducedMotion} onReady={() => setSceneReady(true)} />
        </div>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black/60 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/75 to-transparent"
      />
      <div className="relative flex h-full flex-col items-center justify-between gap-4 px-6 pb-4 pt-[9vh] [@media(max-height:500px)]:pt-3">
        <h1 className="w-[min(82vw,30rem)] [@media(max-height:500px)]:w-56">
          <Image
            src={logo}
            alt="Model Trainz"
            priority
            className="h-auto w-full drop-shadow-[0_4px_0_rgb(0_0_0/0.55)]"
          />
        </h1>
        <div className={`flex flex-col items-center gap-3 ${hydrated ? "" : "invisible"}`}>
          {phase === "profile" ? (
            <ProfileForm />
          ) : phase === "resume" ? (
            <ResumeCard />
          ) : (
            <p
              role="status"
              aria-live="polite"
              className="panel max-w-sm px-4 py-2 text-center text-sm text-amber-50"
            >
              <span className="sr-only">{t.loading.srLoading}</span>
              {t.loading.tips[tip % t.loading.tips.length]}
            </p>
          )}
          <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-amber-100/75">
            <Credit className="text-center text-amber-100/75" />
            <LanguageSelect variant="link" testId="start-language" />
          </footer>
        </div>
      </div>
    </div>
  );
}
