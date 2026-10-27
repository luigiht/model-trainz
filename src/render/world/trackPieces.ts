/**
 * Track pieces as instanced ballast, sleepers and rails between two route points, plus the
 * drop-in animation for freshly laid pieces. Shared by the game's track and the loading scene.
 */
import { BoxGeometry, Matrix4, Quaternion, Vector3, type InstancedMesh } from "three";
import type { RoutePoint } from "@/game/simulation/route";
import { COLORS, flatMaterial } from "@/render/lowpoly";

export const SLEEPERS_PER_PIECE = 3;
const DROP_SECONDS = 0.32;
const DROP_HEIGHT = 3.5;
/** Each later piece of one lay starts dropping a little after the previous one. */
const DROP_STAGGER = 0.04;

export const DROP_MS = DROP_SECONDS * 1000;

function ballastGeometry() {
  // A trapezoid: box with its top face pulled inwards.
  const g = new BoxGeometry(1, 1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setZ(i, p.getZ(i) * 0.72);
  g.computeVertexNormals();
  return g;
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

/** Height above its bed of the `index`-th piece of a lay, `elapsedMs` after it was laid. */
export function dropHeight(elapsedMs: number, index: number): number {
  const t = Math.min(1, elapsedMs / DROP_MS - index * DROP_STAGGER);
  return (1 - easeOutBack(Math.max(0, t))) * DROP_HEIGHT;
}

export function createTrackResources() {
  return {
    ballastGeo: ballastGeometry(),
    boxGeo: new BoxGeometry(1, 1, 1),
    ballastMat: flatMaterial(COLORS.ballast, { roughness: 1 }),
    sleeperMat: flatMaterial(COLORS.sleeper, { roughness: 0.9 }),
    railMat: flatMaterial(COLORS.rail, { roughness: 0.35, metalness: 0.8 }),
  };
}

export interface TrackMeshes {
  ballast: InstancedMesh;
  sleepers: InstancedMesh;
  rails: InstancedMesh;
}

// Scratch objects (no per-frame allocation).
const fwd = new Vector3();
const up = new Vector3();
const side = new Vector3();
const basis = new Matrix4();
const q = new Quaternion();
const pos = new Vector3();
const scl = new Vector3();
const m = new Matrix4();
const WORLD_UP = new Vector3(0, 1, 0);

/** Orientation from a forward vector (local x = forward, y = up, z = side). Returns a scratch quaternion. */
export function orient(dx: number, dy: number, dz: number): Quaternion {
  fwd.set(dx, dy, dz).normalize();
  side.crossVectors(fwd, WORLD_UP).normalize();
  up.crossVectors(side, fwd).normalize();
  basis.makeBasis(fwd, up, side);
  return q.setFromRotationMatrix(basis);
}

/** Writes piece slot `n` spanning route points a → b, lifted by `drop`. */
export function writeTrackPiece(
  meshes: TrackMeshes,
  n: number,
  a: RoutePoint,
  b: RoutePoint,
  drop: number,
) {
  const cx = (a.x + b.x) / 2,
    cy = (a.y + b.y) / 2 + drop,
    cz = (a.z + b.z) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  orient(b.x - a.x, b.y - a.y, b.z - a.z);

  m.compose(pos.set(cx, cy - 0.06, cz), q, scl.set(len + 0.05, 0.62, 2.7));
  meshes.ballast.setMatrixAt(n, m);

  for (let k = 0; k < SLEEPERS_PER_PIECE; k++) {
    const t = (k + 0.5) / SLEEPERS_PER_PIECE;
    pos.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + 0.3 + drop, a.z + (b.z - a.z) * t);
    m.compose(pos, q, scl.set(0.34, 0.14, 2.05));
    meshes.sleepers.setMatrixAt(n * SLEEPERS_PER_PIECE + k, m);
  }
  for (let k = 0; k < 2; k++) {
    const off = k === 0 ? -0.62 : 0.62;
    pos.set(cx + side.x * off, cy + 0.44 + side.y * off, cz + side.z * off);
    m.compose(pos, q, scl.set(len + 0.03, 0.14, 0.12));
    meshes.rails.setMatrixAt(n * 2 + k, m);
  }
}

/** Shows the first `n` written pieces and flags the instance buffers for upload. */
export function commitTrackPieces(meshes: TrackMeshes, n: number) {
  meshes.ballast.count = n;
  meshes.sleepers.count = n * SLEEPERS_PER_PIECE;
  meshes.rails.count = n * 2;
  for (const mesh of [meshes.ballast, meshes.sleepers, meshes.rails]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }
}
