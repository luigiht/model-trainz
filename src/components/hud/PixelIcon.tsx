/** Pixel-art icons drawn as ASCII grids ("#" = lit pixel), in the style of the camera icon. */
const ICONS = {
  gear: [
    "......####......",
    "......#..#......",
    "..##..#..#..##..",
    "..#.###..###.#..",
    "..#..........#..",
    "...#...##...#...",
    "####..#..#..####",
    "#....#....#....#",
    "#....#....#....#",
    "####..#..#..####",
    "...#...##...#...",
    "..#..........#..",
    "..#.###..###.#..",
    "..##..#..#..##..",
    "......#..#......",
    "......####......",
  ],
  reset: [
    "......#.........",
    ".....##.........",
    "....#######.....",
    ".....##....##...",
    "......#......#..",
    "..............#.",
    "..#...........#.",
    "..#...........#.",
    "..#...........#.",
    "..#...........#.",
    "...#.........#..",
    "....##.....##...",
    "......#####.....",
  ],
  chevronLeft: ["...##", "..##.", ".##..", "##...", ".##..", "..##.", "...##"],
  card: [
    "################",
    "#..............#",
    "#..##..........#",
    "#.#..#..######.#",
    "#.#..#.........#",
    "#..##...####...#",
    "#.####.........#",
    "#.#..#..#####..#",
    "#.####.........#",
    "#..............#",
    "################",
  ],
} satisfies Record<string, string[]>;

export type PixelIconName = keyof typeof ICONS;

function toPath(rows: string[]): string {
  let d = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== "#") continue;
      const start = x;
      while (row[x + 1] === "#") x++;
      d += `M${start} ${y}h${x - start + 1}v1H${start}z`;
    }
  });
  return d;
}

const PATHS = Object.fromEntries(
  Object.entries(ICONS).map(([name, rows]) => [name, toPath(rows)]),
) as Record<PixelIconName, string>;
const BOXES = Object.fromEntries(
  Object.entries(ICONS).map(([name, rows]) => [name, `0 0 ${rows[0].length} ${rows.length}`]),
) as Record<PixelIconName, string>;

export function PixelIcon({ name, className }: { name: PixelIconName; className?: string }) {
  return (
    <svg aria-hidden viewBox={BOXES[name]} shapeRendering="crispEdges" className={className}>
      <path d={PATHS[name]} fill="currentColor" />
    </svg>
  );
}
