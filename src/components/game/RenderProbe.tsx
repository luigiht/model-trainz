"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { debugStats } from "@/render/debugStats";
import { QualityGovernor } from "@/render/effects/QualityGovernor";
import { useRenderRuntimeStore, useSettingsStore } from "@/game/state/settingsStore";

/**
 * Collects renderer statistics for the debug overlay and drives the auto-quality governor.
 * Runs first each frame (negative priority keeps R3F's auto-render) and reads the *previous* frame's
 * `gl.info` totals, which include every post-processing pass.
 */
export function RenderProbe({ quality }: { quality: string }) {
  const gl = useThree((s) => s.gl);
  const dpr = useThree((s) => s.viewport.dpr);
  const governor = useRef<QualityGovernor | null>(null);
  const last = useRef(0);

  useEffect(() => {
    // Post-processing renders several passes; accumulate across them and reset manually per frame.
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);

  useEffect(() => {
    debugStats.quality = quality;
    debugStats.dpr = dpr;
  }, [quality, dpr]);

  useFrame(() => {
    const now = performance.now();
    const ms = last.current ? now - last.current : 16.7;
    last.current = now;
    debugStats.frameMs += (ms - debugStats.frameMs) * 0.1;
    debugStats.fps = 1000 / Math.max(1, debugStats.frameMs);
    debugStats.drawCalls = gl.info.render.calls;
    debugStats.triangles = gl.info.render.triangles;
    debugStats.geometries = gl.info.memory.geometries;
    debugStats.textures = gl.info.memory.textures;
    gl.info.reset();

    if (useSettingsStore.getState().quality !== "auto" || document.hidden) return;
    const runtime = useRenderRuntimeStore.getState();
    governor.current ??= new QualityGovernor(runtime.autoLevel);
    const next = governor.current.sample(ms);
    if (next) runtime.setAutoLevel(next);
  }, -1000);

  return null;
}
