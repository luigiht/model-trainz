import { mulberry32 } from "@/lib/rng";

const NAMES = [
  "Millbrook",
  "Puffington",
  "Chuffield",
  "Steamwick",
  "Boilerton",
  "Coalchester",
  "Whistlewood",
  "Sleeperton",
  "Gaugebury",
  "Points End",
  "Tenderfoot",
  "Funnelby",
  "Pistonbury",
  "Clackmoor",
  "Lanternfold",
  "Signal Hill",
  "Brakeham",
  "Cinderwell",
  "Junction Bay",
  "Roundhouse Green",
];

/** Pieces of the hand-written names, recombined into new towns once the list runs out. */
const STEMS = [
  "Mill",
  "Puff",
  "Chuff",
  "Steam",
  "Boiler",
  "Coal",
  "Whistle",
  "Sleeper",
  "Gauge",
  "Tender",
  "Funnel",
  "Piston",
  "Clack",
  "Lantern",
  "Brake",
  "Cinder",
];
const WORD_STEMS = [...STEMS, "Points", "Signal", "Junction", "Roundhouse"];
const SUFFIXES = [
  "brook",
  "field",
  "wick",
  "ton",
  "chester",
  "wood",
  "bury",
  "moor",
  "fold",
  "well",
  "ham",
  "by",
  "foot",
];
const WORDS = ["End", "Hill", "Bay", "Green"];
const QUALIFIERS = [
  "Upper",
  "Lower",
  "Great",
  "Little",
  "North",
  "South",
  "East",
  "West",
  "New",
  "Old",
];

interface Combo {
  stem: string;
  name: string;
}

let combos: Combo[] | null = null;

/** Every stem+suffix / "Stem Word" pairing not already in NAMES, shuffled so neighbours differ. */
function generatedNames(): Combo[] {
  if (combos) return combos;
  const taken = new Set(NAMES);
  const list: Combo[] = [];
  for (const stem of STEMS)
    for (const suffix of SUFFIXES) {
      const name = stem.endsWith(suffix[0]) ? stem + suffix.slice(1) : stem + suffix;
      if (!taken.has(name)) list.push({ stem, name });
    }
  for (const stem of WORD_STEMS)
    for (const word of WORDS) {
      const name = `${stem} ${word}`;
      if (!taken.has(name)) list.push({ stem, name });
    }
  const rand = mulberry32(0x7a1c5e3d);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  for (let i = 1; i < list.length - 1; i++)
    if (list[i].stem === list[i - 1].stem) [list[i], list[i + 1]] = [list[i + 1], list[i]];
  combos = list;
  return list;
}

/** The hand-written names first, then endless recombinations of their pieces. */
export function stationName(index: number): string {
  if (index < NAMES.length) return NAMES[index];
  const list = generatedNames();
  const i = index - NAMES.length;
  const name = list[i % list.length].name;
  const round = Math.floor(i / list.length);
  if (round === 0) return name;
  const qualifier = QUALIFIERS[(round - 1) % QUALIFIERS.length];
  const cycle = Math.floor((round - 1) / QUALIFIERS.length);
  return cycle === 0 ? `${qualifier} ${name}` : `${qualifier} ${name} ${toRoman(cycle + 1)}`;
}

function toRoman(n: number): string {
  const map: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  for (const [v, s] of map)
    while (n >= v) {
      out += s;
      n -= v;
    }
  return out;
}
