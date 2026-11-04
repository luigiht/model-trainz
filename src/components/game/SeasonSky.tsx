"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, type DirectionalLight, type Fog, type HemisphereLight } from "three";
import { game } from "@/game/state/game";
import { SEASONS, seasonMix, type Season, type SeasonMix } from "@/game/content/seasons";
import type { RoutePoint } from "@/game/simulation/route";
import { vivid } from "@/render/palette";

interface Look {
  sky: Color;
  hemiSky: Color;
  hemiGround: Color;
  sun: Color;
}

const LOOKS: Record<Season, Look> = {
  spring: {
    sky: vivid(0xa9d8ee),
    hemiSky: vivid(0xdcefff),
    hemiGround: vivid(0x6b5a3e),
    sun: new Color("#fff0d2"),
  },
  autumn: {
    sky: vivid(0xd6d2bf),
    hemiSky: vivid(0xf2e2c8),
    hemiGround: vivid(0x7a5530),
    sun: new Color("#ffd9a8"),
  },
  winter: {
    sky: vivid(0xcfdfea),
    hemiSky: vivid(0xe8f1fa),
    hemiGround: new Color(0xb9c4cf),
    sun: new Color("#eef3ff"),
  },
};

const focus: RoutePoint = { x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0 };
const mix: SeasonMix = { spring: 1, autumn: 0, winter: 0 };

function blend(out: Color, key: keyof Look) {
  out.setRGB(0, 0, 0);
  for (const s of SEASONS) {
    const c = LOOKS[s][key];
    out.r += c.r * mix[s];
    out.g += c.g * mix[s];
    out.b += c.b * mix[s];
  }
}

/** Sky, fog and light tinted by the season around the train. */
export function SeasonSky({ sun }: { sun: React.RefObject<DirectionalLight | null> }) {
  const scene = useThree((s) => s.scene);
  const hemi = useRef<HemisphereLight>(null);
  const sky = LOOKS.spring.sky.getStyle();

  useFrame(() => {
    game.route.pointAt(game.view.trainS, focus);
    seasonMix(focus.x, mix);
    if (scene.background instanceof Color) blend(scene.background, "sky");
    const fog = scene.fog as Fog | null;
    if (fog) blend(fog.color, "sky");
    if (hemi.current) {
      blend(hemi.current.color, "hemiSky");
      blend(hemi.current.groundColor, "hemiGround");
    }
    if (sun.current) blend(sun.current.color, "sun");
  });

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 120, 330]} />
      <hemisphereLight ref={hemi} args={[LOOKS.spring.hemiSky, LOOKS.spring.hemiGround, 1.1]} />
    </>
  );
}
