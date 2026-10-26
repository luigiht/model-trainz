/**
 * Mutable per-frame render statistics. Written inside the R3F frame loop, read by the DOM debug
 * overlay on an interval — deliberately not React state (Project Rule 3).
 */
export const debugStats = {
  fps: 0,
  frameMs: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  chunks: 0,
  simTickMs: 0,
  quality: "",
  dpr: 1,
};
