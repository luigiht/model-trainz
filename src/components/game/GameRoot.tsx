"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DebugOverlay } from "@/components/hud/DebugOverlay";
import { LoadingScreen } from "@/components/hud/LoadingScreen";
import { SettingsMenu } from "@/components/hud/SettingsMenu";
import { StatusPanel } from "@/components/hud/StatusPanel";
import { Toasts, toast } from "@/components/hud/Toasts";
import { UpgradeShop } from "@/components/hud/UpgradeShop";
import { ViewToggle, toggleCameraMode } from "@/components/hud/ViewToggle";
import { setFloaterLayer, spawnFloater } from "@/components/hud/floaters";
import { onGameEvent, playerLayTrack, useHud } from "@/game/state/game";
import { bootSession, useSession } from "@/game/session/session";
import { stationName } from "@/game/content/stations";
import { formatCoins } from "@/lib/format";
import { sfx } from "@/audio/sfx";
import { nudgeCabLook, resetCabLook, trainFx } from "./trainFx";
import { useSettingsStore } from "@/game/state/settingsStore";

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

const HOLD_DELAY_MS = 320;
const HOLD_INTERVAL_MS = 110;
/** Pointer travel (px) that turns a cab-view press into a camera drag instead of a tap. */
const DRAG_THRESHOLD_PX = 6;
/** Radians of cab look rotation per pixel dragged / per arrow-key press. */
const DRAG_SENSITIVITY = 0.0055;
const KEY_LOOK_STEP = 0.15;

const isCab = () => useSettingsStore.getState().cameraMode === "cab";

interface Gesture {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  /** pending: undecided tap/hold vs drag (cab only); drag: rotating; laying: tap/hold lays track. */
  phase: "pending" | "drag" | "laying";
}

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
  trainFx.pressure = Math.min(1, trainFx.pressure + 0.08);
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
  const [worldReady, setWorldReady] = useState(false);
  const onReady = useCallback(() => setWorldReady(true), []);
  const ready = useSession((s) => s.phase === "active") && worldReady;
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const firstTime = useHud((s) => s.clicks === 0);
  const hold = useRef<{ delay?: number; interval?: number }>({});

  useEffect(() => {
    void bootSession();
  }, []);

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
    const LOOK_KEYS: Record<string, [number, number]> = {
      ArrowLeft: [KEY_LOOK_STEP, 0],
      ArrowRight: [-KEY_LOOK_STEP, 0],
      ArrowUp: [0, KEY_LOOK_STEP],
      ArrowDown: [0, -KEY_LOOK_STEP],
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Nothing reaches the game until the player is in (e.g. typing on the name form).
      if (useSession.getState().phase !== "active") return;
      const lookKey = e.code in LOOK_KEYS || e.code === "KeyC";
      if (e.code !== "Space" && e.code !== "KeyV" && !lookKey) return;
      if (e.repeat && !(e.code in LOOK_KEYS)) return;
      // Don't act behind an open dialog (settings, game).
      if (document.querySelector("dialog[open]")) return;
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName)) return;
      if (e.code === "KeyV") {
        toggleCameraMode();
        return;
      }
      if (lookKey) {
        // Arrow keys look around / C re-centres — cab view only.
        if (!isCab()) return;
        e.preventDefault();
        if (e.code === "KeyC") resetCabLook();
        else nudgeCabLook(...LOOK_KEYS[e.code]);
        return;
      }
      // Space on a focused button should press that button, not lay track.
      if (t?.tagName === "BUTTON") return;
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
  const gesture = useRef<Gesture | null>(null);
  const cameraMode = useSettingsStore((s) => s.cameraMode);

  const endGesture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
      const g = gesture.current;
      if (!g || g.id !== e.pointerId) return;
      // A cab-view press that never moved and never started holding is a tap: lay one piece.
      if (commit && g.phase === "pending") layAt(g.startX, g.startY);
      gesture.current = null;
      stopHold();
      e.currentTarget.style.cursor = "";
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
    },
    [stopHold],
  );

  return (
    <main
      className="relative h-dvh w-full touch-manipulation select-none overflow-hidden bg-[#1b1712]"
      data-ready={ready}
    >
      <div
        className={`absolute inset-0 touch-none ${cameraMode === "cab" ? "cursor-grab" : "cursor-pointer"}`}
        data-testid="scene"
        onPointerDown={(e) => {
          if (e.button !== 0 || gesture.current) return;
          pointer.current = [e.clientX, e.clientY];
          const g: Gesture = {
            id: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            lastX: e.clientX,
            lastY: e.clientY,
            phase: isCab() ? "pending" : "laying",
          };
          gesture.current = g;
          e.currentTarget.setPointerCapture(e.pointerId);
          if (g.phase === "laying") {
            // Diorama: lay immediately, hold to repeat.
            layAt(e.clientX, e.clientY);
            startHold(() => pointer.current);
          } else {
            // Cab: wait to see if this is a drag. Holding still lays track continuously.
            stopHold();
            hold.current.delay = window.setTimeout(() => {
              if (gesture.current !== g || g.phase !== "pending") return;
              g.phase = "laying";
              layAt(...pointer.current);
              hold.current.interval = window.setInterval(
                () => layAt(...pointer.current),
                HOLD_INTERVAL_MS,
              );
            }, HOLD_DELAY_MS);
          }
        }}
        onPointerMove={(e) => {
          pointer.current = [e.clientX, e.clientY];
          const g = gesture.current;
          if (!g || g.id !== e.pointerId) return;
          if (
            g.phase === "pending" &&
            Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > DRAG_THRESHOLD_PX
          ) {
            g.phase = "drag";
            stopHold();
            e.currentTarget.style.cursor = "grabbing";
          }
          if (g.phase === "drag") {
            // "Grab the world": drag right turns the view left, drag down tilts it up.
            nudgeCabLook(
              (e.clientX - g.lastX) * DRAG_SENSITIVITY,
              (e.clientY - g.lastY) * DRAG_SENSITIVITY,
            );
          }
          g.lastX = e.clientX;
          g.lastY = e.clientY;
        }}
        onPointerUp={(e) => endGesture(e, true)}
        onPointerCancel={(e) => endGesture(e, false)}
        onLostPointerCapture={(e) => endGesture(e, false)}
      >
        <GameCanvas onReady={onReady} reducedMotion={reducedMotion} />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col gap-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto min-w-0 max-w-[22rem] flex-1">
            <StatusPanel />
          </div>
          <div className="pointer-events-auto">
            <SettingsMenu />
          </div>
        </div>
        {/* Compact portrait docks the shop drawer to this region (between the top and bottom bars). */}
        <div className="min-h-0 flex-1 pt-2 compact:portrait:relative">
          <Toasts />
          {/* Desktop: centred on screen, the height cap keeps it clear of the top and bottom bars.
              Compact landscape: docked to the right edge below the icon buttons. */}
          <div className="pointer-events-auto absolute right-3 top-1/2 flex max-h-[calc(100dvh-9rem)] -translate-y-1/2 compact:z-10 compact:max-h-none compact:translate-y-0 compact:portrait:inset-y-0 compact:portrait:-right-3 compact:landscape:top-[4.25rem] compact:landscape:bottom-3 compact:landscape:right-0">
            <UpgradeShop />
          </div>
        </div>
        <div className="relative flex flex-col items-center gap-2">
          {firstTime && ready && (
            <p className="hint panel px-4 py-2 text-center text-sm text-amber-100">
              <span className="pointer-coarse:hidden">Click</span>
              <span className="hidden pointer-coarse:inline">Tap</span> the station (or anywhere on
              the land) to lay track. Hold to keep going!
            </p>
          )}
          <button
            className="pointer-events-auto font-body rounded-lg border-2 border-amber-300 bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-3 text-sm text-[#2a1a08] shadow-lg transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
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
            Lay track <span className="opacity-70 pointer-coarse:hidden">(Space)</span>
          </button>
          <div className="pointer-events-auto sm:absolute sm:bottom-1 sm:left-0">
            <ViewToggle />
          </div>
        </div>
      </div>

      <div
        ref={setFloaterLayer}
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
        aria-hidden
      />
      <DebugOverlay />
      <LoadingScreen visible={!ready} reducedMotion={reducedMotion} />
    </main>
  );
}
