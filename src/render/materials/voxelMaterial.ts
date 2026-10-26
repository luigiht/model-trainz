import { DoubleSide, FrontSide, MeshStandardMaterial, Vector3, type IUniform } from "three";
import { TILE_COUNT, type RenderClass, tileMaterial } from "@/render/voxel/blocks";
import type { VoxelTextures } from "@/render/voxel/atlasTexture";

/**
 * The voxel material: MeshStandardMaterial (so it gets three's lights, shadows, fog and tone
 * mapping) patched via onBeforeCompile to:
 *  - sample albedo + normal detail from texture arrays using a per-vertex tile layer,
 *  - apply baked per-vertex AO and a per-voxel brightness/hue jitter (hash of voxel coords — done in
 *    the shader so greedy merging isn't broken by per-voxel colours),
 *  - read roughness / metalness / emissive per tile from a uniform table,
 *  - optionally brighten voxel edges for a polished "toy block" bevel.
 */

export interface VoxelMaterialOptions {
  /** 0 disables the edge bevel highlight (quality setting). */
  bevel?: number;
}

const VERTEX_PARS = /* glsl */ `
attribute float aTile;
attribute float aAo;
flat varying float vTile;
varying float vAo;
varying vec3 vVoxPos;
varying vec3 vObjNormal;
varying vec2 vVoxUv;
`;

const VERTEX_MAIN = /* glsl */ `
vTile = aTile;
vAo = aAo;
vObjNormal = normal;
vVoxPos = position - normal * 0.5;
vVoxUv = uv;
`;

const FRAGMENT_PARS = /* glsl */ `
uniform highp sampler2DArray uAlbedo;
uniform highp sampler2DArray uNormals;
uniform vec3 uTileMat[${TILE_COUNT}];
uniform float uBevel;
flat varying float vTile;
varying float vAo;
varying vec3 vVoxPos;
varying vec3 vObjNormal;
varying vec2 vVoxUv;

float voxHash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

mat3 voxTangentFrame(vec3 eyePos, vec3 n, vec2 uv) {
  vec3 q0 = dFdx(eyePos);
  vec3 q1 = dFdy(eyePos);
  vec2 st0 = dFdx(uv);
  vec2 st1 = dFdy(uv);
  vec3 q1perp = cross(q1, n);
  vec3 q0perp = cross(n, q0);
  vec3 T = q1perp * st0.x + q0perp * st1.x;
  vec3 B = q1perp * st0.y + q0perp * st1.y;
  float det = max(dot(T, T), dot(B, B));
  float s = det == 0.0 ? 0.0 : inversesqrt(det);
  return mat3(T * s, B * s, n);
}
`;

const FRAGMENT_MAP = /* glsl */ `
vec4 voxTexel = texture(uAlbedo, vec3(vVoxUv, vTile));
vec3 voxCell = floor(vVoxPos + 0.001);
float voxJ = voxHash(voxCell);
// Smooth-lighting AO curve (levels 0..3) and subtle per-voxel brightness / warm-cool jitter.
float voxAo = mix(0.42, 1.0, pow(vAo / 3.0, 1.15));
vec3 voxJitter = vec3(1.0) + (voxJ - 0.5) * vec3(0.10, 0.08, 0.06) + (voxHash(voxCell + 17.0) - 0.5) * vec3(0.02, 0.0, -0.02);
vec3 voxTileMat = uTileMat[int(vTile + 0.5)];
diffuseColor *= voxTexel;
diffuseColor.rgb *= voxJitter;
if (uBevel > 0.0) {
  vec3 surf = vVoxPos + vObjNormal * 0.5;
  vec3 q = abs(fract(surf) - 0.5) * (1.0 - abs(vObjNormal));
  float edge = max(max(q.x, q.y), q.z);
  diffuseColor.rgb *= 1.0 + uBevel * smoothstep(0.43, 0.5, edge);
}
diffuseColor.rgb *= voxAo;
`;

const FRAGMENT_NORMAL = /* glsl */ `
{
  vec3 mapN = texture(uNormals, vec3(vVoxUv, vTile)).xyz * 2.0 - 1.0;
  mapN.xy *= 0.6;
  mat3 voxTbn = voxTangentFrame(-vViewPosition, normal, vVoxUv);
  normal = normalize(voxTbn * mapN);
}
`;

export function createVoxelMaterial(
  renderClass: RenderClass,
  textures: VoxelTextures,
  { bevel = 0 }: VoxelMaterialOptions = {},
): MeshStandardMaterial & { userData: { uniforms: Record<string, IUniform> } } {
  const material = new MeshStandardMaterial({
    roughness: 1,
    metalness: 1,
    side: renderClass === "cutout" ? DoubleSide : FrontSide,
    transparent: renderClass === "transparent",
    depthWrite: renderClass !== "transparent",
    alphaTest: renderClass === "cutout" ? 0.5 : 0,
  });

  const tileMat = Array.from({ length: TILE_COUNT }, (_, i) => {
    const m = tileMaterial(i);
    return new Vector3(m.roughness, m.metalness, m.emissive);
  });
  const uniforms: Record<string, IUniform> = {
    uAlbedo: { value: textures.albedo },
    uNormals: { value: textures.normals },
    uTileMat: { value: tileMat },
    uBevel: { value: bevel },
  };
  material.userData.uniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_PARS}`)
      .replace("#include <uv_vertex>", `#include <uv_vertex>\n${VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
      .replace("#include <map_fragment>", FRAGMENT_MAP)
      .replace(
        "#include <roughnessmap_fragment>",
        "float roughnessFactor = roughness * voxTileMat.x;",
      )
      .replace(
        "#include <metalnessmap_fragment>",
        "float metalnessFactor = metalness * voxTileMat.y;",
      )
      .replace("#include <normal_fragment_maps>", FRAGMENT_NORMAL)
      .replace(
        "#include <emissivemap_fragment>",
        "totalEmissiveRadiance += voxTexel.rgb * voxTileMat.z;",
      );
  };
  material.customProgramCacheKey = () => `voxel-v1-${renderClass}`;
  return material as MeshStandardMaterial & { userData: { uniforms: Record<string, IUniform> } };
}

export type VoxelMaterials = Record<RenderClass, ReturnType<typeof createVoxelMaterial>>;

export function createVoxelMaterials(
  textures: VoxelTextures,
  opts?: VoxelMaterialOptions,
): VoxelMaterials {
  return {
    opaque: createVoxelMaterial("opaque", textures, opts),
    cutout: createVoxelMaterial("cutout", textures, opts),
    transparent: createVoxelMaterial("transparent", textures, opts),
  };
}

export function setVoxelBevel(materials: VoxelMaterials, bevel: number) {
  for (const m of Object.values(materials)) m.userData.uniforms.uBevel.value = bevel;
}
