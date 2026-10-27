import type { TrainSetId } from "@/game/content/trainSets";
import type { UpgradeId } from "@/game/content/upgrades";
import type { ProfileError, SyncStatus } from "@/game/session/session";
import type { CameraMode } from "@/game/state/settingsStore";
import type { QualitySetting } from "@/render/effects/quality";

interface ItemText {
  name: string;
  /** Upgrades: the effect line; train sets: what the set is made of. */
  detail: string;
  flavor: string;
}

/** English UI text. The source of truth: every other language must match this shape. */
export const en = {
  language: "Language",
  close: "Close ✕",
  gameId: "Game ID",
  createdBy: "Created by",
  canvasLabel: "Model Trainz: your train and the railway you are building",
  loading: {
    srLoading: "Loading. ",
    tips: [
      "Tip: click or tap the land to lay track. Hold to keep going.",
      "Tip: press V to hop between the cab and the diorama view.",
      "Tip: the track gang lays track for you while you play.",
      "Tip: golden spikes can pay out 20× on a single click.",
      "Tip: press ` to show the debug overlay.",
    ],
  },
  profile: {
    formLabel: "Start playing",
    name: "Your name",
    namePlaceholder: "e.g. Ada",
    optional: "(optional)",
    idPlaceholder: "e.g. 7K2M-9QXP-4HCW",
    idHint: "Have the ID of a previous game? Enter it to keep playing that game.",
    starting: "Starting…",
    play: "Play",
    back: "Back to my previous game",
    errors: {
      name: "Please enter your name.",
      id: "That isn't a Game ID: use 4–24 letters, numbers or dashes.",
      offline:
        "Couldn't reach the game server to look up that ID. Try again, or leave it empty to start a new game.",
    } satisfies Record<ProfileError, string>,
  },
  resume: {
    welcome: (name: string) => `Welcome back, ${name}!`,
    waiting: "Your railway is waiting right where you left it.",
    loading: "Loading…",
    continue: "Continue",
    other: "Start a new game or enter another Game ID",
  },
  hud: {
    hintClick: "Click the station (or anywhere on the land) to lay track. Hold to keep going!",
    hintTap: "Tap the station (or anywhere on the land) to lay track. Hold to keep going!",
    layTrack: "Lay track",
    layTrackKey: "(Space)",
    goldenSpike: "GOLDEN SPIKE!",
    departing: (station: string) => `Toot toot! Departing ${station}.`,
    arrived: (station: string, fare: string) => `Arrived at ${station}: fares +${fare}`,
  },
  status: {
    label: "Status",
    traveling: (to: string) => `Chuffing to ${to}…`,
    layMore: (n: number, to: string) => `Lay ${n} more piece${n === 1 ? "" : "s"} to reach ${to}`,
    allAboard: (to: string) => `All aboard for ${to}!`,
    perClick: (n: number, shown: string) => `${shown} piece${n === 1 ? "" : "s"}/click`,
    gangRate: (shown: string) => `${shown}/sec by the track gang`,
    travelled: (distance: string) => `${distance} travelled`,
    progressLabel: (to: string) => `Track laid toward ${to}`,
  },
  menu: {
    game: "Game",
    settings: "Settings",
    reset: "Reset",
    resetLabel: "Reset progress",
    startOver: "Start over?",
    confirmReset: "Yes, reset",
    cancel: "Cancel",
  },
  gameDialog: {
    title: "Game",
    closeLabel: "Close game panel",
    player: "Player",
    copy: "Copy ID",
    copied: "Copied!",
    copiedAnnouncement: "Game ID copied to the clipboard.",
    explainer:
      "Keep this Game ID to continue this game on any device: enter it on the start screen. The address bar also includes it, so a bookmark brings you straight back. Anyone with the ID can play this game.",
    sync: {
      idle: "Not saved online yet.",
      saving: "Saving online…",
      saved: "Saved online.",
      offline: "Can't reach the server right now, so progress is saved on this device for now.",
    } satisfies Record<SyncStatus, string>,
  },
  settings: {
    title: "Settings",
    closeLabel: "Close settings",
    sound: "Sound",
    soundEffects: "Sound effects",
    volume: "Volume",
    quality: "Graphics quality",
    qualityOptions: {
      auto: { label: "Auto", hint: "Adjusts to your device" },
      low: { label: "Low", hint: "No shadows or effects" },
      medium: { label: "Medium", hint: "Shadows + bloom" },
      high: { label: "High", hint: "Adds ambient occlusion" },
      ultra: { label: "Ultra", hint: "Sharpest shadows" },
    } satisfies Record<QualitySetting, { label: string; hint: string }>,
    qualityNow: (level: string) => `Now: ${level}`,
    controls: "Controls",
    controlRows: [
      ["Click / tap the scene", "Lay a piece of track"],
      ["Hold mouse / finger", "Keep laying track"],
      ["Space (hold to repeat)", "Lay track"],
      ["Lay track button", "Lay track"],
      ["V", "Switch Diorama / Cab view"],
      ["Mouse wheel", "Zoom (Diorama view)"],
      ["Drag (Cab view)", "Look around"],
      ["Arrow keys / C (Cab view)", "Look around / re-centre"],
      ["`  (backtick)", "Toggle the debug overlay"],
      ["Esc", "Close this panel"],
    ] satisfies [string, string][],
  },
  shop: {
    label: "Shop",
    upgrades: "Upgrades",
    depot: "Depot",
    hide: "Hide",
    show: "Show",
    max: "MAX",
  },
  upgrades: {
    shovel: {
      name: "Bigger Shovels",
      detail: "+1 track piece per click",
      flavor: "Same arms. More enthusiasm.",
    },
    steel: {
      name: "Steel Rails",
      detail: "+$1 per track piece laid",
      flavor: "Shinier, therefore pricier.",
    },
    gang: {
      name: "Track Gang",
      detail: "+0.5 pieces/sec, automatically",
      flavor: "They whistle while they work. Loudly.",
    },
    boiler: {
      name: "Hotter Boiler",
      detail: "+20% train speed",
      flavor: "Do not lick the boiler.",
    },
    fares: {
      name: "Fare Hike",
      detail: "+25% station fares",
      flavor: "Now with complimentary soot.",
    },
    carriage: {
      name: "Extra Carriage",
      detail: "+1 carriage, +50% fares",
      flavor: "More seats, more tickets.",
    },
    golden: {
      name: "Golden Spikes",
      detail: "+2% chance a click pays 20×",
      flavor: "Shiny. Structurally questionable.",
    },
  } satisfies Record<UpgradeId, ItemText>,
  depot: {
    inService: "In service",
    use: "Use",
  },
  trainSets: {
    heritage: {
      name: "Heritage Steam",
      detail: "Steam tank engine + teak coaches",
      flavor: "Where it all began.",
    },
    evergreen: {
      name: "Evergreen Express",
      detail: "+50% train speed, +50% fares",
      flavor: "All the charm, none of the coal.",
    },
  } satisfies Record<TrainSetId, ItemText>,
  view: {
    label: "Camera view (V)",
    diorama: "Diorama",
    cab: "Cab",
  } satisfies Record<CameraMode | "label", string>,
};

export type Messages = typeof en;
