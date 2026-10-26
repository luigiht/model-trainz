"use client";

import { useEffect, useRef, useState } from "react";
import { debugStats } from "@/render/debugStats";

function fmt(n: number): string {
  return n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n}`;
}

/** Toggle with the backtick key. Polls `debugStats` at 4 Hz and writes text directly to the DOM. */
export function DebugOverlay() {
  const [open, setOpen] = useState(false);
  const pre = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "`" && !e.repeat) setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      if (!pre.current) return;
      const s = debugStats;
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      pre.current.textContent = [
        `FPS        ${s.fps.toFixed(0)}`,
        `frame      ${s.frameMs.toFixed(2)} ms`,
        `draw calls ${s.drawCalls}`,
        `triangles  ${fmt(s.triangles)}`,
        `geometries ${s.geometries}  textures ${s.textures}`,
        `chunks     ${s.chunks}`,
        `sim tick   ${s.simTickMs.toFixed(2)} ms`,
        `heap       ${mem ? `${(mem.usedJSHeapSize / 1048576).toFixed(0)} MB` : "n/a"}`,
        `quality    ${s.quality}  dpr ${s.dpr.toFixed(2)}`,
      ].join("\n");
    }, 250);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open) return null;
  return (
    <pre
      ref={pre}
      data-testid="debug-overlay"
      aria-live="off"
      className="pointer-events-none absolute left-3 top-3 z-50 rounded-md bg-black/70 px-3 py-2 font-mono text-xs leading-5 text-lime-200"
    />
  );
}
