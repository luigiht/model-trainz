"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, PlaneGeometry, type Mesh } from "three";
import { SEA_LEVEL, type RoutePoint } from "@/game/simulation/route";
import { game } from "@/game/state/game";

const SIZE = 420;
const focus: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };

/**
 * One large faceted water plane that follows the train. Low-poly waves come from a vertex shader
 * displacement; flat shading turns them into glinting facets.
 */
export function Water() {
  const ref = useRef<Mesh>(null);
  const { geo, mat, uniforms } = useMemo(() => {
    const geo = new PlaneGeometry(SIZE, SIZE, 70, 70).rotateX(-Math.PI / 2).toNonIndexed();
    const uniforms = { uTime: { value: 0 } };
    const mat = new MeshStandardMaterial({
      color: 0x3f8fc0,
      flatShading: true,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
vec4 wp = modelMatrix * vec4(position, 1.0);
transformed.y += sin(wp.x * 0.35 + uTime * 1.3) * 0.12 + cos(wp.z * 0.42 + uTime * 1.1) * 0.12;`,
        );
    };
    return { geo, mat, uniforms };
  }, []);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    const m = ref.current;
    if (!m) return;
    // Snap to the grid spacing so the facets don't swim as the plane follows the train.
    const step = SIZE / 70;
    const p = game.route.pointAt(game.state.trainS, focus);
    m.position.set(Math.round(p.x / step) * step, SEA_LEVEL - 0.2, Math.round(p.z / step) * step);
  });

  return <mesh ref={ref} geometry={geo} material={mat} receiveShadow renderOrder={1} />;
}
