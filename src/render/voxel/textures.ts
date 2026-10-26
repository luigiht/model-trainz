/**
 * Procedural 16×16 pixel-art tiles, painted into plain RGBA byte arrays (no DOM / three.js) so they
 * can be generated anywhere and unit-tested. Row 0 is the TOP of the tile. Also derives tangent-space
 * normal maps from luminance.
 */
import { mulberry32 } from "@/lib/rng";
import { TILES, type TileName } from "./blocks";

export const TILE_SIZE = 16;
const N = TILE_SIZE;

type RGB = [number, number, number];

class Painter {
  readonly data = new Uint8ClampedArray(N * N * 4);
  constructor(readonly rand: () => number) {}

  set(x: number, y: number, [r, g, b]: RGB, a = 255) {
    const i = (((y + N) % N) * N + ((x + N) % N)) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }

  /** Fill with a base colour and per-pixel brightness noise of ±variance. */
  noise(base: RGB, variance: number, alpha = 255) {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        this.set(x, y, shade(base, 1 + (this.rand() * 2 - 1) * variance), alpha);
  }

  speckle(color: RGB, chance: number) {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        if (this.rand() < chance) this.set(x, y, shade(color, 0.9 + this.rand() * 0.2));
  }
}

export function shade([r, g, b]: RGB, k: number): RGB {
  return [r * k, g * k, b * k];
}

const C = {
  grass: [104, 160, 72] as RGB,
  dirt: [122, 88, 58] as RGB,
  stone: [128, 130, 134] as RGB,
  sand: [219, 199, 140] as RGB,
  snow: [236, 242, 248] as RGB,
  bark: [96, 70, 44] as RGB,
  wood: [176, 134, 84] as RGB,
  leaves: [70, 128, 60] as RGB,
  pine: [46, 96, 62] as RGB,
  brick: [158, 76, 58] as RGB,
  mortar: [170, 150, 132] as RGB,
  iron: [64, 66, 72] as RGB,
  brass: [201, 162, 74] as RGB,
  coal: [34, 33, 36] as RGB,
  water: [52, 122, 178] as RGB,
  tie: [92, 66, 46] as RGB,
  steel: [150, 152, 160] as RGB,
};

function paintPaint(p: Painter, base: RGB) {
  p.noise(base, 0.025);
  // Panel seam + highlight line, like riveted sheet metal.
  for (let x = 0; x < N; x++) {
    p.set(x, 0, shade(base, 1.12));
    p.set(x, N - 1, shade(base, 0.78));
  }
  for (const [x, y] of [
    [2, 2],
    [13, 2],
    [2, 13],
    [13, 13],
  ])
    p.set(x, y, shade(base, 1.25));
}

const PAINTERS: Record<TileName, (p: Painter) => void> = {
  grass_top: (p) => {
    p.noise(C.grass, 0.12);
    p.speckle([128, 184, 84], 0.08);
  },
  grass_side: (p) => {
    p.noise(C.dirt, 0.1);
    for (let x = 0; x < N; x++) {
      const drip = 3 + Math.floor(p.rand() * 3);
      for (let y = 0; y < drip; y++) p.set(x, y, shade(C.grass, 0.9 + p.rand() * 0.2));
    }
  },
  dirt: (p) => {
    p.noise(C.dirt, 0.12);
    p.speckle([92, 66, 44], 0.06);
  },
  stone: (p) => {
    p.noise(C.stone, 0.08);
    for (let i = 0; i < 6; i++) {
      // Short dark cracks.
      let x = Math.floor(p.rand() * N);
      let y = Math.floor(p.rand() * N);
      for (let s = 0; s < 4; s++) {
        p.set(x, y, shade(C.stone, 0.7));
        x += p.rand() < 0.5 ? 1 : 0;
        y += p.rand() < 0.5 ? 1 : -1;
      }
    }
  },
  gravel: (p) => {
    p.noise([130, 122, 112], 0.18);
    p.speckle([90, 86, 82], 0.15);
    p.speckle([170, 162, 150], 0.1);
  },
  sand: (p) => {
    p.noise(C.sand, 0.06);
    p.speckle([196, 176, 120], 0.1);
  },
  snow: (p) => p.noise(C.snow, 0.03),
  snow_side: (p) => {
    p.noise(C.dirt, 0.1);
    for (let x = 0; x < N; x++) {
      const drip = 4 + Math.floor(p.rand() * 3);
      for (let y = 0; y < drip; y++) p.set(x, y, shade(C.snow, 0.95 + p.rand() * 0.05));
    }
  },
  log_side: (p) => {
    for (let x = 0; x < N; x++) {
      const k = 0.85 + ((x * 7) % 5) * 0.06;
      for (let y = 0; y < N; y++) p.set(x, y, shade(C.bark, k * (0.92 + p.rand() * 0.16)));
    }
  },
  log_top: (p) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const r = Math.hypot(x - 7.5, y - 7.5);
        const ring = Math.floor(r) % 3 === 0 ? 0.82 : 1;
        p.set(x, y, r > 7 ? shade(C.bark, 0.9) : shade(C.wood, ring * (0.95 + p.rand() * 0.1)));
      }
  },
  planks: (p) => {
    p.noise(C.wood, 0.06);
    for (let y = 0; y < N; y++) {
      if (y % 4 === 3) for (let x = 0; x < N; x++) p.set(x, y, shade(C.wood, 0.62));
      const seam = ((y >> 2) * 5 + 3) % N;
      p.set(seam, y, shade(C.wood, 0.7));
    }
  },
  leaves: (p) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const r = p.rand();
        p.set(x, y, shade(C.leaves, 0.75 + p.rand() * 0.45), r < 0.12 ? 0 : 255);
      }
  },
  pine_leaves: (p) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const r = p.rand();
        p.set(x, y, shade(C.pine, 0.75 + p.rand() * 0.4), r < 0.1 ? 0 : 255);
      }
  },
  brick: (p) => {
    p.noise(C.mortar, 0.04);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const row = y >> 2;
        const off = row % 2 ? 4 : 0;
        if (y % 4 !== 3 && (x + off) % 8 !== 7) p.set(x, y, shade(C.brick, 0.88 + p.rand() * 0.2));
      }
  },
  iron: (p) => {
    p.noise(C.iron, 0.05);
    for (let i = 1; i < N; i += 5) {
      p.set(i, 1, shade(C.iron, 1.5));
      p.set(i, N - 2, shade(C.iron, 1.5));
    }
  },
  brass: (p) => {
    p.noise(C.brass, 0.05);
    for (let x = 0; x < N; x++) p.set(x, 5, shade(C.brass, 1.2));
  },
  coal: (p) => {
    p.noise(C.coal, 0.2);
    p.speckle([80, 80, 90], 0.06);
  },
  water: (p) => {
    p.noise(C.water, 0.05, 190);
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(p.rand() * N);
      const y = Math.floor(p.rand() * N);
      for (let s = 0; s < 3; s++) p.set(x + s, y, shade(C.water, 1.3), 200);
    }
  },
  glass: (p) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const edge = x === 0 || y === 0 || x === N - 1 || y === N - 1;
        p.set(x, y, edge ? [190, 205, 210] : [200, 225, 235], edge ? 255 : 70);
      }
    for (let s = 0; s < 4; s++) p.set(3 + s, 3 + s, [255, 255, 255], 150);
  },
  tie_wood: (p) => {
    p.noise(C.tie, 0.1);
    for (let x = 0; x < N; x += 3)
      for (let y = 0; y < N; y++) if (p.rand() < 0.3) p.set(x, y, shade(C.tie, 0.75));
  },
  rail_steel: (p) => {
    p.noise(C.steel, 0.04);
    for (let x = 0; x < N; x++) {
      p.set(x, 0, [210, 212, 218]);
      p.set(x, 1, [190, 192, 198]);
    }
  },
  paint_green: (p) => paintPaint(p, [46, 104, 64]),
  paint_black: (p) => paintPaint(p, [30, 32, 34]),
  paint_red: (p) => paintPaint(p, [168, 44, 40]),
  paint_yellow: (p) => paintPaint(p, [226, 180, 52]),
  paint_blue: (p) => paintPaint(p, [44, 82, 150]),
  paint_cream: (p) => paintPaint(p, [232, 220, 186]),
  lamp: (p) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const r = Math.hypot(x - 7.5, y - 7.5) / 8;
        p.set(x, y, shade([255, 214, 140], 1 - r * 0.35));
      }
  },
  window_lit: (p) => {
    p.noise([255, 196, 110], 0.05);
    for (let i = 0; i < N; i++) {
      p.set(i, 7, [80, 60, 40]);
      p.set(7, i, [80, 60, 40]);
    }
  },
  red_sand: (p) => {
    p.noise([196, 108, 64], 0.08);
    p.speckle([170, 90, 52], 0.12);
  },
  basalt: (p) => {
    p.noise([52, 48, 50], 0.12);
    p.speckle([90, 40, 30], 0.03);
  },
  roof_tiles: (p) => {
    p.noise([140, 62, 48], 0.06);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        if (y % 4 === 3 || (x + (y >> 2) * 2) % 4 === 0) p.set(x, y, [104, 44, 34]);
  },
};

export interface TileSet {
  size: number;
  count: number;
  /** count × size × size × 4 RGBA, tile-major, rows top-to-bottom. */
  albedo: Uint8ClampedArray;
  /** Same layout, tangent-space normals encoded as RGB (A = 255). */
  normals: Uint8ClampedArray;
}

/** Tangent-space normal from luminance height using a wrapped Sobel filter. */
export function normalsFromLuminance(
  tile: Uint8ClampedArray,
  size: number,
  strength = 2.2,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  const h = (x: number, y: number) => {
    const i = (((y + size) % size) * size + ((x + size) % size)) * 4;
    return (0.299 * tile[i] + 0.587 * tile[i + 1] + 0.114 * tile[i + 2]) / 255;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx =
        h(x + 1, y - 1) +
        2 * h(x + 1, y) +
        h(x + 1, y + 1) -
        (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1));
      // Rows run top→bottom but tangent-space +Y points up the texture, hence the sign flip.
      const dy =
        h(x - 1, y - 1) +
        2 * h(x, y - 1) +
        h(x + 1, y - 1) -
        (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1));
      const nx = -dx * strength;
      const ny = -dy * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      out[i] = ((nx / len) * 0.5 + 0.5) * 255;
      out[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  return out;
}

export function generateTileSet(seed = 7): TileSet {
  const stride = N * N * 4;
  const albedo = new Uint8ClampedArray(stride * TILES.length);
  const normals = new Uint8ClampedArray(stride * TILES.length);
  TILES.forEach((name, i) => {
    const p = new Painter(mulberry32(seed * 977 + i * 131));
    PAINTERS[name](p);
    albedo.set(p.data, i * stride);
    normals.set(normalsFromLuminance(p.data, N), i * stride);
  });
  return { size: N, count: TILES.length, albedo, normals };
}
