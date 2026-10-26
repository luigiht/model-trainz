"use client";

import { useFrame } from "@react-three/fiber";
import { tickGame } from "@/game/state/game";

/** Advances the fixed-timestep simulation from the render loop (first in the frame). */
export function GameDriver() {
  useFrame((_, dt) => tickGame(dt), -2000);
  return null;
}
