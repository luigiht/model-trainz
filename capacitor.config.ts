import type { CapacitorConfig } from "@capacitor/cli";

/** The iOS/Android app: a native shell around the static export built by `pnpm mobile:build`. */
const config: CapacitorConfig = {
  appId: "com.luigiht.modeltrainz",
  appName: "Model Trainz",
  webDir: "out",
  backgroundColor: "#1b1712",
  plugins: {
    SystemBars: { hidden: true, initialViewportFitValueHint: "cover" },
  },
};

export default config;
