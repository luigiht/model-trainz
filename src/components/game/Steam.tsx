"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { IcosahedronGeometry, Mesh, MeshStandardMaterial, type Group } from "three";
import { game } from "@/game/state/game";
import { trainFx } from "./trainFx";

const POOL = 36;
const LIFE = 2.4;

interface Puff {
  mesh: Mesh;
  mat: MeshStandardMaterial;
  age: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
}

/** Pooled low-poly steam puffs from the chimney: rhythm follows speed; clicks add a big puff. */
export function Steam({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const geo = useMemo(() => new IcosahedronGeometry(0.5, 0), []);
  const puffs = useMemo<Puff[]>(
    () =>
      Array.from({ length: POOL }, () => {
        const mat = new MeshStandardMaterial({
          color: 0xf4f1ea,
          flatShading: true,
          roughness: 1,
          transparent: true,
          depthWrite: false,
        });
        const mesh = new Mesh(geo, mat);
        mesh.visible = false;
        return { mesh, mat, age: LIFE, vx: 0, vy: 0, vz: 0, size: 1 };
      }),
    [geo],
  );
  const timer = useRef(0);
  const next = useRef(0);

  useEffect(() => {
    const g = group.current;
    puffs.forEach((p) => g?.add(p.mesh));
    return () => {
      puffs.forEach((p) => {
        g?.remove(p.mesh);
        p.mat.dispose();
      });
      geo.dispose();
    };
  }, [puffs, geo]);

  useFrame((_, dt) => {
    const emit = (size: number, up: number) => {
      const p = puffs[next.current];
      next.current = (next.current + 1) % POOL;
      p.age = 0;
      p.size = size;
      p.vx = (Math.random() - 0.5) * 0.4 - game.state.trainV * 0.35;
      p.vy = up;
      p.vz = (Math.random() - 0.5) * 0.4 + 0.25; // gentle breeze
      p.mesh.position.copy(trainFx.chimney);
      p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      p.mesh.visible = true;
    };

    const v = game.state.trainV;
    timer.current -= dt;
    if (timer.current <= 0) {
      emit(v > 0.1 ? 0.7 : 0.45, v > 0.1 ? 1.6 : 0.9);
      // Chuff rhythm speeds up with the train.
      timer.current = v > 0.1 ? Math.max(0.12, 0.55 - v * 0.04) : 1.4;
    }
    while (trainFx.pendingPuffs > 0) {
      trainFx.pendingPuffs--;
      emit(1.1, 2.4);
    }

    for (const p of puffs) {
      if (p.age >= LIFE) continue;
      p.age += dt;
      const t = p.age / LIFE;
      if (t >= 1) {
        p.mesh.visible = false;
        continue;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy *= 1 - dt * 0.6;
      const s = p.size * (0.5 + t * (reducedMotion ? 1 : 2.2));
      p.mesh.scale.setScalar(s);
      p.mat.opacity = 0.85 * (1 - t) ** 1.5;
    }
  });

  return <group ref={group} />;
}
