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
    <div
      className="panel font-body flex items-center gap-1 p-1"
      role="group"
      aria-label="Camera view (V)"
    >
      <svg
        aria-hidden
        viewBox="0 0 12 10"
        shapeRendering="crispEdges"
        className="mx-2 h-4 w-5 fill-amber-200"
      >
        <path d="M3 0h3v1H3zM3 1h1v1H3zM5 1h1v1H5zM0 2h12v1H0zM0 9h12v1H0zM0 3h1v6H0zM11 3h1v6h-1zM5 4h2v1H5zM5 7h2v1H5zM4 5h1v2H4zM7 5h1v2H7zM9 4h1v1H9z" />
      </svg>
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
