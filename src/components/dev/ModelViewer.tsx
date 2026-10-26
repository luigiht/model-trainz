"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Bounds, Grid, OrbitControls } from "@react-three/drei";
import { DEV_MODELS } from "@/render/world/propModels";
import { VoxelModelMesh } from "@/components/game/VoxelModelMesh";
import { useVoxelMaterials } from "@/components/game/useVoxelMaterials";
import { TerrainGenerator } from "@/render/world/terrain";
import { meshVolume } from "@/render/voxel/ChunkMesher";
import { meshArraysToGeometry } from "@/render/voxel/geometry";
import { RENDER_CLASSES } from "@/render/voxel/blocks";
import { setBlock } from "@/render/voxel/VoxelVolume";
import type { VoxelMaterials } from "@/render/materials/voxelMaterial";

const CHUNK_ENTRY = "Terrain chunk";
const ENTRIES = [...DEV_MODELS.map((m) => m.name), CHUNK_ENTRY];

/** Dev tool: inspect every voxel model (and a terrain chunk) with orbit controls + wireframe. */
export default function ModelViewer() {
  const [selected, setSelected] = useState(ENTRIES[0]);
  const [wireframe, setWireframe] = useState(false);
  const [bevel, setBevel] = useState(true);

  return (
    <main className="relative flex h-dvh w-full bg-[#1b1712] text-amber-50">
      <aside className="panel z-10 m-3 flex w-56 flex-col gap-1 self-start p-3">
        <h1 className="font-pixel mb-2 text-sm text-amber-300">Model viewer</h1>
        {ENTRIES.map((name) => (
          <button
            key={name}
            onClick={() => setSelected(name)}
            aria-pressed={selected === name}
            className={`rounded px-2 py-1 text-left text-sm focus-visible:outline-2 focus-visible:outline-amber-300 ${
              selected === name ? "bg-amber-700/60" : "hover:bg-white/10"
            }`}
          >
            {name}
          </button>
        ))}
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(e) => setWireframe(e.target.checked)}
          />
          Wireframe
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={bevel} onChange={(e) => setBevel(e.target.checked)} />
          Edge bevel
        </label>
      </aside>
      <Canvas
        className="!absolute inset-0"
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [10, 8, 10], fov: 35 }}
      >
        <color attach="background" args={["#2a2520"]} />
        <hemisphereLight args={["#dbeaff", "#4a3b2a", 1]} />
        <directionalLight
          position={[8, 14, 6]}
          intensity={2.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
        />
        <Grid
          args={[40, 40]}
          cellColor="#3d352c"
          sectionColor="#6b5a45"
          infiniteGrid
          fadeDistance={60}
        />
        <CameraAbove selected={selected} />
        <Bounds key={selected} fit margin={1.4}>
          <Scene selected={selected} wireframe={wireframe} bevel={bevel ? 0.07 : 0} />
        </Bounds>
        <OrbitControls makeDefault target={[0, 1.5, 0]} />
      </Canvas>
    </main>
  );
}

/** Bounds keeps the camera's direction when fitting; start each model from a raised 3/4 view. */
function CameraAbove({ selected }: { selected: string }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(30, 40, 30);
  }, [camera, selected]);
  return null;
}

function Scene({
  selected,
  wireframe,
  bevel,
}: {
  selected: string;
  wireframe: boolean;
  bevel: number;
}) {
  const materials = useVoxelMaterials(bevel);
  const model = DEV_MODELS.find((m) => m.name === selected);
  if (model) return <VoxelModelMesh model={model} materials={materials} wireframe={wireframe} />;
  return <ChunkPreview materials={materials} wireframe={wireframe} />;
}

function ChunkPreview({ materials, wireframe }: { materials: VoxelMaterials; wireframe: boolean }) {
  const parts = useMemo(() => {
    const volume = new TerrainGenerator(1).generateChunk(0, 0);
    // Clear the neighbour border so the isolated chunk gets closed side walls.
    for (let y = -1; y <= volume.sy; y++)
      for (let i = -1; i <= volume.sx; i++) {
        setBlock(volume, i, y, -1, 0);
        setBlock(volume, i, y, volume.sz, 0);
        setBlock(volume, -1, y, i, 0);
        setBlock(volume, volume.sx, y, i, 0);
      }
    const meshes = meshVolume(volume);
    return RENDER_CLASSES.flatMap((cls) => {
      const g = meshArraysToGeometry(meshes[cls]);
      return g ? [{ cls, g }] : [];
    });
  }, []);
  useEffect(() => () => parts.forEach((p) => p.g.dispose()), [parts]);
  return (
    <group position={[-8, 0, -8]}>
      {parts.map(({ cls, g }) => (
        <mesh
          key={cls}
          geometry={g}
          material={wireframe ? undefined : materials[cls]}
          castShadow
          receiveShadow
        >
          {wireframe && <meshBasicMaterial wireframe color="#9fe870" />}
        </mesh>
      ))}
    </group>
  );
}
