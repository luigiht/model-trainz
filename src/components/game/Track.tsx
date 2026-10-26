"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3 } from "three";
import { game } from "@/game/state/game";
import { PIECE_LENGTH } from "@/game/simulation/rules";
import type { RoutePoint } from "@/game/simulation/route";
import { COLORS, flatMaterial } from "@/render/lowpoly";

/** Pieces drawn behind / ahead of the train (the rest of the line is off-screen). */
const BEHIND = 50;
const AHEAD = 170;
const WINDOW = BEHIND + AHEAD;
const SLEEPERS_PER_PIECE = 3;
const DROP_SECONDS = 0.32;
const DROP_HEIGHT = 3.5;

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

// Scratch objects (no per-frame allocation).
const pA: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const pB: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const fwd = new Vector3();
const up = new Vector3();
const side = new Vector3();
const basis = new Matrix4();
const q = new Quaternion();
const pos = new Vector3();
const scl = new Vector3();
const m = new Matrix4();
const WORLD_UP = new Vector3(0, 1, 0);

/** Orientation from a forward vector: local x = forward, y = up, z = side. */
function orient(dx: number, dy: number, dz: number) {
  fwd.set(dx, dy, dz).normalize();
  side.crossVectors(fwd, WORLD_UP).normalize();
  up.crossVectors(side, fwd).normalize();
  basis.makeBasis(fwd, up, side);
  q.setFromRotationMatrix(basis);
}

export function Track({ shadows }: { shadows: boolean }) {
  const ballast = useRef<InstancedMesh>(null);
  const sleepers = useRef<InstancedMesh>(null);
  const rails = useRef<InstancedMesh>(null);
  const ghost = useRef<Mesh>(null);
  const last = useRef({ first: -1, laid: -1 });

  const res = useMemo(
    () => ({
      ballastGeo: ballastGeometry(),
      boxGeo: new BoxGeometry(1, 1, 1),
      ballastMat: flatMaterial(COLORS.ballast, { roughness: 1 }),
      sleeperMat: flatMaterial(COLORS.sleeper, { roughness: 0.9 }),
      railMat: flatMaterial(COLORS.rail, { roughness: 0.35, metalness: 0.8 }),
      ghostMat: flatMaterial(0xfff1c4, { emissive: 0xffd36b, emissiveIntensity: 0.6 }),
    }),
    [],
  );
  useEffect(() => {
    res.ghostMat.transparent = true;
    res.ghostMat.depthWrite = false;
    return () => Object.values(res).forEach((r) => r.dispose());
  }, [res]);

  useFrame(({ clock }) => {
    const b = ballast.current,
      sl = sleepers.current,
      rl = rails.current,
      gh = ghost.current;
    if (!b || !sl || !rl || !gh) return;
    const { state, route, recentLays } = game;
    const trainPiece = Math.floor(state.trainS / PIECE_LENGTH);
    const first = Math.max(0, trainPiece - BEHIND);
    const end = Math.min(state.laid, first + WINDOW);
    const now = performance.now();
    const animating = recentLays.some((r) => now - r.at < DROP_SECONDS * 1000 && r.to > first);
    const changed = first !== last.current.first || state.laid !== last.current.laid;

    if (changed || animating) {
      last.current = { first, laid: state.laid };
      let n = 0;
      for (let i = first; i < end; i++, n++) {
        // Drop-in animation for freshly laid pieces.
        let drop = 0;
        for (const r of recentLays) {
          if (i >= r.from && i < r.to) {
            const t = Math.min(1, (now - r.at) / (DROP_SECONDS * 1000) - (i - r.from) * 0.04);
            drop = (1 - easeOutBack(Math.max(0, t))) * DROP_HEIGHT;
          }
        }
        const s0 = i * PIECE_LENGTH;
        route.pointAt(s0, pA);
        route.pointAt(s0 + PIECE_LENGTH, pB);
        const cx = (pA.x + pB.x) / 2,
          cy = (pA.y + pB.y) / 2 + drop,
          cz = (pA.z + pB.z) / 2;
        const len = Math.hypot(pB.x - pA.x, pB.y - pA.y, pB.z - pA.z);
        orient(pB.x - pA.x, pB.y - pA.y, pB.z - pA.z);

        m.compose(pos.set(cx, cy - 0.06, cz), q, scl.set(len + 0.05, 0.62, 2.7));
        b.setMatrixAt(n, m);

        for (let k = 0; k < SLEEPERS_PER_PIECE; k++) {
          const t = (k + 0.5) / SLEEPERS_PER_PIECE;
          pos.set(
            pA.x + (pB.x - pA.x) * t,
            pA.y + (pB.y - pA.y) * t + 0.3 + drop,
            pA.z + (pB.z - pA.z) * t,
          );
          m.compose(pos, q, scl.set(0.34, 0.14, 2.05));
          sl.setMatrixAt(n * SLEEPERS_PER_PIECE + k, m);
        }
        for (let k = 0; k < 2; k++) {
          const off = k === 0 ? -0.62 : 0.62;
          pos.set(cx + side.x * off, cy + 0.44 + side.y * off, cz + side.z * off);
          m.compose(pos, q, scl.set(len + 0.03, 0.14, 0.12));
          rl.setMatrixAt(n * 2 + k, m);
        }
      }
      b.count = n;
      sl.count = n * SLEEPERS_PER_PIECE;
      rl.count = n * 2;
      b.instanceMatrix.needsUpdate = true;
      sl.instanceMatrix.needsUpdate = true;
      rl.instanceMatrix.needsUpdate = true;
      b.computeBoundingSphere();
      sl.computeBoundingSphere();
      rl.computeBoundingSphere();
    }

    // Pulsing "next piece goes here" ghost at the railhead.
    const s0 = state.laid * PIECE_LENGTH;
    route.pointAt(s0, pA);
    route.pointAt(s0 + PIECE_LENGTH, pB);
    orient(pB.x - pA.x, pB.y - pA.y, pB.z - pA.z);
    gh.position.set(
      (pA.x + pB.x) / 2,
      (pA.y + pB.y) / 2 + 0.05 + Math.sin(clock.elapsedTime * 4) * 0.08,
      (pA.z + pB.z) / 2,
    );
    gh.quaternion.copy(q);
    res.ghostMat.opacity = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 4));
  });

  return (
    <group>
      <instancedMesh
        ref={ballast}
        args={[res.ballastGeo, res.ballastMat, WINDOW]}
        receiveShadow={shadows}
        frustumCulled={false}
      />
      <instancedMesh
        ref={sleepers}
        args={[res.boxGeo, res.sleeperMat, WINDOW * SLEEPERS_PER_PIECE]}
        castShadow={shadows}
        receiveShadow={shadows}
        frustumCulled={false}
      />
      <instancedMesh
        ref={rails}
        args={[res.boxGeo, res.railMat, WINDOW * 2]}
        castShadow={shadows}
        frustumCulled={false}
      />
      <mesh
        ref={ghost}
        geometry={res.ballastGeo}
        material={res.ghostMat}
        scale={[PIECE_LENGTH, 0.5, 2.7]}
      />
    </group>
  );
}
