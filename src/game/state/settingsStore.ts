import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AUTO_START_LEVEL, type QualityLevel, type QualitySetting } from "@/render/effects/quality";
import type { Locale } from "@/i18n/locales";

export type CameraMode = "diorama" | "cab";

export interface SettingsState {
  quality: QualitySetting;
  /** 0.5–1.0 multiplier on the tier's DPR. */
  resolutionScale: number;
  shadows: boolean;
  ssao: boolean;
  bloom: boolean;
  tiltShift: boolean;
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  muted: boolean;
  /** Master volume 0–1. */
  volume: number;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setQuality: (quality: QualitySetting) => void;
  setResolutionScale: (scale: number) => void;
  setEffect: (effect: "shadows" | "ssao" | "bloom" | "tiltShift", enabled: boolean) => void;
  /** The player's language; null follows the browser. */
  locale: Locale | null;
  setLocale: (locale: Locale) => void;
}

const SETTINGS_VERSION = 1;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      quality: "auto",
      resolutionScale: 1,
      shadows: true,
      ssao: true,
      bloom: true,
      tiltShift: true,
      cameraMode: "diorama",
      setCameraMode: (cameraMode) => set({ cameraMode }),
      muted: false,
      volume: 0.8,
      setMuted: (muted) => set({ muted }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setQuality: (quality) => set({ quality }),
      setResolutionScale: (resolutionScale) =>
        set({ resolutionScale: Math.min(1, Math.max(0.5, resolutionScale)) }),
      setEffect: (effect, enabled) => set({ [effect]: enabled }),
      locale: null,
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "rbc-settings",
      version: SETTINGS_VERSION,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Runtime-only render state (never persisted). */
interface RenderRuntimeState {
  /** Level chosen by the auto-quality governor while `quality === "auto"`. */
  autoLevel: QualityLevel;
  setAutoLevel: (level: QualityLevel) => void;
}

export const useRenderRuntimeStore = create<RenderRuntimeState>()((set) => ({
  autoLevel: AUTO_START_LEVEL,
  setAutoLevel: (autoLevel) => set({ autoLevel }),
}));

/** Selector hook: the effective quality level after resolving "auto". */
export function useActiveQualityLevel(): QualityLevel {
  const quality = useSettingsStore((s) => s.quality);
  const autoLevel = useRenderRuntimeStore((s) => s.autoLevel);
  return quality === "auto" ? autoLevel : quality;
}
