"use client";

import {
  Bloom,
  EffectComposer,
  SMAA,
  SSAO,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { QualityTier } from "@/render/effects/quality";

/**
 * Quality-tiered post stack. The composer is always mounted (tone mapping runs on every tier);
 * each other pass mounts only when its tier allows it and the user hasn't disabled it.
 */
export function PostEffects({ effects }: { effects: QualityTier }) {
  return (
    // Remount on SSAO toggle: the composer builds its NormalPass in an effect, so SSAO would
    // otherwise render one commit before the pass exists.
    <EffectComposer
      key={effects.ssao ? "ao" : "no-ao"}
      enableNormalPass={effects.ssao}
      multisampling={0}
    >
      <>
        {effects.ssao && (
          <SSAO
            samples={16}
            radius={0.12}
            intensity={18}
            luminanceInfluence={0.5}
            worldDistanceThreshold={40}
            worldDistanceFalloff={10}
            worldProximityThreshold={0.6}
            worldProximityFalloff={0.3}
          />
        )}
        {effects.bloom && (
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.8} />
        )}
        <ToneMapping mode={ToneMappingMode.AGX} />
        {effects.vignette && <Vignette offset={0.3} darkness={0.45} />}
        {effects.smaa && <SMAA />}
      </>
    </EffectComposer>
  );
}
