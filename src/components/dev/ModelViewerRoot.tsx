"use client";

import dynamic from "next/dynamic";

const ModelViewer = dynamic(() => import("./ModelViewer"), { ssr: false });

export function ModelViewerRoot() {
  return <ModelViewer />;
}
