import type { VoxelModelDef } from "@/render/voxel/VoxelModel";

/** Static world props authored in the layer-string format. */

export const OAK_TREE: VoxelModelDef = {
  name: "Oak tree",
  scale: 1,
  palette: { l: "log", o: "leaves" },
  layers: [
    [".....", ".....", "..l..", ".....", "....."],
    [".....", ".....", "..l..", ".....", "....."],
    [".....", ".....", "..l..", ".....", "....."],
    [".ooo.", "ooooo", "oolo.", "ooooo", ".ooo."],
    [".ooo.", "ooooo", "oolo.", "ooooo", ".ooo."],
    [".....", ".ooo.", ".ooo.", ".ooo.", "....."],
    [".....", ".....", "..o..", ".....", "....."],
  ],
};

export const PINE_TREE: VoxelModelDef = {
  name: "Pine tree",
  scale: 1,
  palette: { l: "log", p: "pine_leaves", s: "snow" },
  layers: [
    [".....", ".....", "..l..", ".....", "....."],
    [".....", ".....", "..l..", ".....", "....."],
    [".ppp.", "ppppp", "pplpp", "ppppp", ".ppp."],
    [".....", ".ppp.", ".plp.", ".ppp.", "....."],
    [".ppp.", "ppppp", "pplpp", "ppppp", ".ppp."],
    [".....", ".ppp.", ".plp.", ".ppp.", "....."],
    [".....", "..p..", ".ppp.", "..p..", "....."],
    [".....", ".....", "..p..", ".....", "....."],
    [".....", ".....", "..s..", ".....", "....."],
  ],
};

export const ROCK: VoxelModelDef = {
  name: "Boulder",
  scale: 0.5,
  palette: { s: "stone", g: "gravel" },
  layers: [
    [".ggg.", "gssss", "sssss", "ssssg", ".sss."],
    ["..s..", ".sss.", "sssss", ".sss.", "..s.."],
    [".....", "..s..", ".sss.", "..s..", "....."],
  ],
};

export const LAMP_POST: VoxelModelDef = {
  name: "Station lamp",
  scale: 0.25,
  palette: { i: "iron", L: "lamp", b: "brass" },
  layers: [
    ["iii", "iii", "iii"],
    ...Array.from({ length: 12 }, () => ["...", ".i.", "..."]),
    ["bbb", "bib", "bbb"],
    ["LLL", "LLL", "LLL"],
    ["LLL", "LLL", "LLL"],
    ["iii", "iii", "iii"],
    ["...", ".b.", "..."],
  ],
};

export const SIGNAL: VoxelModelDef = {
  name: "Signal",
  scale: 0.25,
  palette: { i: "iron", k: "paint_black", r: "paint_red", L: "lamp", w: "paint_cream" },
  layers: [
    ["iii", "iii", "iii"],
    ...Array.from({ length: 14 }, () => ["...", ".i.", "..."]),
    ["kkk", "kkk", "kLk"],
    ["kkk", "kkk", "kkk"],
    ["kkk", "kkk", "kLk"],
    ["kkk", "kkk", "kkk"],
  ],
};

export const COTTAGE: VoxelModelDef = {
  name: "Cottage",
  scale: 1,
  palette: { b: "brick", p: "planks", w: "window_lit", r: "roof_tiles", d: "log", c: "brick" },
  layers: [
    ["bbbbbbb", "b.....b", "b.....b", "b.....b", "bbbdbbb"],
    ["bbwbwbb", "w.....w", "b.....b", "w.....w", "bbbdbbb"],
    ["bbbbbbb", "b.....b", "b.....b", "b.....b", "bbbbbbb"],
    ["rrrrrrr", "ppppppp", "ppppppp", "ppppppp", "rrrrrrr"],
    [".......", "rrrrrrr", "ppppppc", "rrrrrrr", "......."],
    [".......", ".......", "rrrrrrc", ".......", "......."],
    [".......", ".......", "......c", ".......", "......."],
  ],
};

/** Every model, for the /dev/models viewer. Train models join in M2. */
export const DEV_MODELS: VoxelModelDef[] = [OAK_TREE, PINE_TREE, ROCK, LAMP_POST, SIGNAL, COTTAGE];
