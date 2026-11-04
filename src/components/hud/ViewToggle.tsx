"use client";

import { CAMERA_MODES, useSettingsStore, type CameraMode } from "@/game/state/settingsStore";
import { resetCabLook, resetChase } from "@/components/game/trainFx";
import { useMessages } from "@/i18n/i18n";

function selectView(next: CameraMode) {
  const s = useSettingsStore.getState();
  if (next === s.cameraMode) return;
  if (next === "cab") resetCabLook();
  if (next === "chase") resetChase();
  s.setCameraMode(next);
}

/** Settings choice between the camera views (also: V key cycles them). */
export function ViewToggle() {
  const mode = useSettingsStore((s) => s.cameraMode);
  const t = useMessages().view;
  return (
    <section aria-labelledby="settings-camera">
      <h3 id="settings-camera" className="font-pixel mb-2 text-xs text-amber-200">
        {t.label}
      </h3>
      <div
        role="radiogroup"
        aria-labelledby="settings-camera"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {CAMERA_MODES.map((view) => {
          const selected = mode === view;
          return (
            <button
              key={view}
              role="radio"
              aria-checked={selected}
              data-testid={`view-${view}`}
              onClick={() => selectView(view)}
              className={`rounded-md border px-2 py-2 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-amber-300 ${
                selected
                  ? "border-amber-400 bg-amber-700/50"
                  : "border-white/10 bg-black/20 hover:bg-white/10"
              }`}
            >
              {t[view]}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function toggleCameraMode() {
  const current = useSettingsStore.getState().cameraMode;
  selectView(CAMERA_MODES[(CAMERA_MODES.indexOf(current) + 1) % CAMERA_MODES.length]);
}
