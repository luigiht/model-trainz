"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { DebugOverlay } from "@/components/hud/DebugOverlay";
import { LoadingScreen } from "@/components/hud/LoadingScreen";
import { QualityMenu } from "@/components/hud/QualityMenu";

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

/** Client root: the 3D canvas (client-only), HUD layer and loading screen. */
export function GameRoot() {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#1b1712]" data-ready={ready}>
      <GameCanvas onReady={onReady} />
      <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end p-3">
        <div className="pointer-events-auto">
          <QualityMenu />
        </div>
      </div>
      <DebugOverlay />
      <LoadingScreen visible={!ready} />
    </main>
  );
}
