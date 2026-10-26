"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { useFrame } from "@react-three/fiber";
import { hash3f, mulberry32 } from "@/lib/rng";

/**
 * M0 placeholder diorama: a small instanced voxel island with grass, dirt, stone, water, trees and a
 * strip of track, so lighting, shadows and post-processing have something to show. Replaced by the
 * chunked voxel engine in M1.
 */

interface Voxel {
  x: number;
  y: number;
  z: number;
  color: number;
}

const SIZE = 28;

function buildIsland(seed: number): Voxel[] {
  const rand = mulberry32(seed);
  const voxels: Voxel[] = [];
  const half = SIZE / 2;
  for (let x = -half; x < half; x++) {
    for (let z = -half; z < half; z++) {
      const d = Math.hypot(x, z) / half;
      if (d > 1) continue;
      const h = Math.max(
        0,
        Math.round(3.5 * (1 - d * d) + Math.sin(x * 0.45) * 0.9 + Math.cos(z * 0.38) * 0.9),
      );
      const isTrack = Math.abs(z - 2) <= 0;
      for (let y = 0; y <= h; y++) {
        const top = y === h;
        let color = y < h - 1 ? 0x8a8f96 : 0x7a5a3a;
        if (top) color = h <= 1 ? 0xd9c58a : 0x6aa84f;
        voxels.push({ x, y, z, color });
      }
      if (h === 0 && d > 0.75) voxels.push({ x, y: 0, z, color: 0x3d8fc4 });
      if (isTrack && h > 0) voxels.push({ x, y: h + 1, z, color: 0x5b3b22 });
      if (!isTrack && h >= 2 && rand() < 0.035) {
        for (let t = 1; t <= 3; t++) voxels.push({ x, y: h + t, z, color: 0x6b4a2b });
        for (let lx = -1; lx <= 1; lx++)
          for (let lz = -1; lz <= 1; lz++)
            for (let ly = 4; ly <= 5; ly++)
              if (ly === 4 || (lx === 0 && lz === 0))
                voxels.push({ x: x + lx, y: h + ly, z: z + lz, color: 0x3f7d3a });
      }
    }
  }
  return voxels;
}

export function VoxelTestScene({ shadows }: { shadows: boolean }) {
  const meshRef = useRef<InstancedMesh>(null);
  const voxels = useMemo(() => buildIsland(1337), []);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const material = useMemo(() => new MeshStandardMaterial({ roughness: 0.85, metalness: 0 }), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const color = new Color();
    voxels.forEach((v, i) => {
      dummy.position.set(v.x, v.y + 0.5, v.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // Per-voxel brightness jitter so flat areas don't look repetitive.
      const j = 0.92 + hash3f(v.x, v.y, v.z) * 0.16;
      color.setHex(v.color).multiplyScalar(j);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [voxels]);

  useLayoutEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, voxels.length]}
        castShadow={shadows}
        receiveShadow={shadows}
      />
      <TestLocomotive shadows={shadows} />
    </group>
  );
}

/** A tiny voxel engine with an emissive lamp, gliding back and forth along the track strip. */
function TestLocomotive({ shadows }: { shadows: boolean }) {
  const group = useRef<Object3D>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.position.x = Math.sin(clock.elapsedTime * 0.4) * 8;
  });
  const parts: [number, number, number, number, number, number, string, number?][] = [
    // x, y, z, w, h, d, color, emissive intensity
    [0, 0.9, 0, 3.4, 1.0, 1.2, "#1f2a24"],
    [0.4, 1.9, 0, 2.2, 1.0, 1.0, "#2f5d3a"],
    [-1.2, 2.0, 0, 1.2, 1.6, 1.2, "#2f5d3a"],
    [1.2, 2.8, 0, 0.4, 0.8, 0.4, "#111111"],
    [1.75, 1.9, 0, 0.1, 0.3, 0.3, "#ffd27a", 6],
  ];
  return (
    <group ref={group} position={[0, 3, 2]}>
      {parts.map(([x, y, z, w, h, d, color, emissive], i) => (
        <mesh key={i} position={[x, y, z]} castShadow={shadows} receiveShadow={shadows}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color={color}
            roughness={emissive ? 0.4 : 0.55}
            metalness={emissive ? 0 : 0.3}
            emissive={emissive ? color : "#000000"}
            emissiveIntensity={emissive ?? 0}
          />
        </mesh>
      ))}
    </group>
  );
}
