"use client";

import { useSettingsStore, type CameraMode } from "@/game/state/settingsStore";
import { resetCabLook } from "@/components/game/trainFx";

const VIEWS: { mode: CameraMode; label: string }[] = [
  { mode: "diorama", label: "Diorama" },
  { mode: "cab", label: "Cab" },
];

/** Segmented switch between the diorama and first-person cab cameras (also: V key). */
export function ViewToggle() {
  const mode = useSettingsStore((s) => s.cameraMode);
  const setMode = useSettingsStore((s) => s.setCameraMode);
  return (
    <div className="panel font-body flex items-center gap-1 p-1" role="group" aria-label="Camera view (V)">
      <span className="font-pixel px-2 text-xs text-amber-200">View</span>
      {VIEWS.map((v) => (
        <button
          key={v.mode}
          aria-pressed={mode === v.mode}
          data-testid={`view-${v.mode}`}
          onClick={(e) => {
            if (v.mode === "cab" && mode !== "cab") resetCabLook();
            setMode(v.mode);
            if (e.detail > 0) e.currentTarget.blur();
          }}
          className={`rounded px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-amber-300 ${
            mode === v.mode ? "bg-amber-600 text-black" : "text-amber-50 hover:bg-white/10"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

export function toggleCameraMode() {
  const s = useSettingsStore.getState();
  if (s.cameraMode !== "cab") resetCabLook();
  s.setCameraMode(s.cameraMode === "cab" ? "diorama" : "cab");
}
