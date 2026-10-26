import { notFound } from "next/navigation";
import { ModelViewerRoot } from "@/components/dev/ModelViewerRoot";

export const metadata = { title: "Model viewer · Rail Baron Clicker" };

/** Dev-only voxel model inspector. Enabled in production only with NEXT_PUBLIC_DEV_ROUTES=1. */
export default function DevModelsPage() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEV_ROUTES !== "1")
    notFound();
  return <ModelViewerRoot />;
}
