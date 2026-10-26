"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type DirectionalLight, type Object3D } from "three";
import { game } from "@/game/state/game";
import { railheadS } from "@/game/simulation/rules";
import type { RoutePoint } from "@/game/simulation/route";
import { damp } from "@/lib/math";
import { trainFx } from "./trainFx";

const OFFSET = new Vector3(-16, 30, 38);
const SUN = new Vector3(28, 46, 14);
const p: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const desired = new Vector3();
const target = new Vector3();

/**
 * Isometric-style follow camera (narrow-FOV perspective). While docked it frames the train and the
 * railhead ahead, so each freshly laid piece is visible; while traveling it follows the train.
 * Mouse wheel zooms. The sun (and its shadow frustum) follows the same focus point.
 */
export function CameraRig({
  sun,
  reducedMotion,
}: {
  sun: React.RefObject<DirectionalLight | null>;
  reducedMotion: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const zoom = useRef(1.15);
  const initialised = useRef(false);

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom.current = Math.min(1.8, Math.max(0.45, zoom.current * (1 + Math.sign(e.deltaY) * 0.1)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl]);

  useFrame((_, dt) => {
    const s = game.state;
    // Docked: frame the platform plus the stretch ahead where new pieces land. Traveling: follow.
    const lookAhead =
      s.phase === "docked" ? 4 + Math.min(railheadS(s.laid) - s.trainS, 20) * 0.25 : 6;
    game.route.pointAt(s.trainS + lookAhead, p);
    desired.set(p.x, p.y, p.z);
    if (!initialised.current) {
      target.copy(desired);
      initialised.current = true;
    }
    target.lerp(desired, damp(3, dt));

    camera.position.copy(target).addScaledVector(OFFSET, zoom.current);
    if (!reducedMotion) camera.position.y += trainFx.jolt * 0.25;
    camera.lookAt(target);

    const light = sun.current;
    if (light) {
      light.position.copy(target).add(SUN);
      light.target.position.copy(target);
      (light.target as Object3D).updateMatrixWorld();
    }
  });

  return null;
}
