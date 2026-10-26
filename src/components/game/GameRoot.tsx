"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DebugOverlay } from "@/components/hud/DebugOverlay";
import { LoadingScreen } from "@/components/hud/LoadingScreen";
import { SettingsMenu } from "@/components/hud/SettingsMenu";
import { StatusPanel } from "@/components/hud/StatusPanel";
import { Toasts, toast } from "@/components/hud/Toasts";
import { UpgradeShop } from "@/components/hud/UpgradeShop";
import { WelcomeBack } from "@/components/hud/WelcomeBack";
import { setFloaterLayer, spawnFloater } from "@/components/hud/floaters";
import { initGame, onGameEvent, playerLayTrack, useHud } from "@/game/state/game";
import { stationName } from "@/game/content/stations";
import { formatCoins } from "@/lib/format";
import { sfx } from "@/audio/sfx";
import { trainFx } from "./trainFx";

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

const HOLD_DELAY_MS = 320;
const HOLD_INTERVAL_MS = 110;

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Lay track from a click/tap/key at a screen position, with all the juice. */
function layAt(x: number, y: number) {
  const res = playerLayTrack();
  if (!res) return;
  trainFx.jolt = 1;
  trainFx.pendingPuffs++;
  sfx.clank();
  if (res.golden) {
    sfx.golden();
    spawnFloater(x, y, `GOLDEN SPIKE! +${formatCoins(res.coins)}`, "golden");
  } else {
    spawnFloater(x, y, `+${formatCoins(res.coins)}`);
  }
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
}

/** Client root: 3D canvas, HUD, input handling and event → feedback wiring. */
export function GameRoot() {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const firstTime = useHud((s) => s.clicks === 0);
  const hold = useRef<{ delay?: number; interval?: number }>({});

  useEffect(() => initGame(), []);

  // Simulation events → sound, toasts, floaters.
  useEffect(
    () =>
      onGameEvent((e) => {
        if (e.type === "depart") {
          sfx.whistle();
          toast(`Toot toot! Departing ${stationName(e.station)}.`);
        } else if (e.type === "arrive") {
          sfx.arrive();
          sfx.coin();
          toast(`Arrived at ${stationName(e.station)}: fares +${formatCoins(e.fare)}`);
          spawnFloater(
            window.innerWidth / 2,
            window.innerHeight * 0.42,
            `+${formatCoins(e.fare)}`,
            "fare",
          );
        }
      }),
    [],
  );

  const stopHold = useCallback(() => {
    window.clearTimeout(hold.current.delay);
    window.clearInterval(hold.current.interval);
    hold.current = {};
  }, []);

  const startHold = useCallback(
    (getPos: () => [number, number]) => {
      stopHold();
      hold.current.delay = window.setTimeout(() => {
        hold.current.interval = window.setInterval(() => layAt(...getPos()), HOLD_INTERVAL_MS);
      }, HOLD_DELAY_MS);
    },
    [stopHold],
  );

  // Keyboard: Space / Enter on the scene lays track (hold to repeat at a capped rate).
  useEffect(() => {
    const center = (): [number, number] => [window.innerWidth / 2, window.innerHeight * 0.55];
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "BUTTON" ||
          t.tagName === "INPUT" ||
          t.tagName === "SELECT" ||
          t.tagName === "TEXTAREA")
      )
        return;
      e.preventDefault();
      layAt(...center());
      startHold(center);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") stopHold();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", stopHold);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", stopHold);
    };
  }, [startHold, stopHold]);

  const pointer = useRef<[number, number]>([0, 0]);

  return (
    <main
      className="relative h-dvh w-full select-none overflow-hidden bg-[#1b1712]"
      data-ready={ready}
    >
      <div
        className="absolute inset-0 cursor-pointer touch-none"
        data-testid="scene"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          pointer.current = [e.clientX, e.clientY];
          layAt(e.clientX, e.clientY);
          startHold(() => pointer.current);
        }}
        onPointerMove={(e) => {
          pointer.current = [e.clientX, e.clientY];
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
      >
        <GameCanvas onReady={onReady} reducedMotion={reducedMotion} />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col gap-3 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="pointer-events-auto">
            <StatusPanel />
          </div>
          <div className="pointer-events-auto">
            <SettingsMenu />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-start justify-between gap-3">
          <div className="flex-1 pt-2">
            <Toasts />
          </div>
          <div className="pointer-events-auto min-h-0">
            <UpgradeShop />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          {firstTime && ready && (
            <p className="hint panel px-4 py-2 text-center text-sm text-amber-100">
              Click the station (or anywhere on the land) to lay track. Hold to keep going!
            </p>
          )}
          <button
            className="pointer-events-auto font-pixel rounded-lg border-2 border-amber-300 bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-3 text-sm text-[#2a1a08] shadow-lg transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
            data-testid="lay-track"
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const pos = (): [number, number] => [r.left + r.width / 2, r.top];
              layAt(...pos());
              startHold(pos);
            }}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const r = e.currentTarget.getBoundingClientRect();
                layAt(r.left + r.width / 2, r.top);
              }
            }}
          >
            Lay track <span className="opacity-70">(Space)</span>
          </button>
        </div>
      </div>

      <div
        ref={setFloaterLayer}
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
        aria-hidden
      />
      <WelcomeBack />
      <DebugOverlay />
      <LoadingScreen visible={!ready} />
    </main>
  );
}
