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

/** Station names cycle with a roman-numeral suffix once the list runs out. */
export function stationName(index: number): string {
  const base = NAMES[index % NAMES.length];
  const round = Math.floor(index / NAMES.length);
  return round === 0 ? base : `${base} ${toRoman(round + 1)}`;
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
