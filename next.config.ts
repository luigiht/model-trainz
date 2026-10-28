import type { NextConfig } from "next";

/** Identifies this build, so a tab can tell when a newer one has been deployed. */
const APP_VERSION =
  process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${Date.now()}`;

/** `MOBILE=1` builds the Capacitor app (iOS/Android) instead of the website. */
const MOBILE = process.env.MOBILE === "1";
/** The website whose API the app uses for online saves; the website itself uses its own origin. */
const API_ORIGIN = MOBILE
  ? new URL(process.env.API_ORIGIN ?? "https://model-trainz.luigiht.com").origin
  : "";

/** A static export in `out/` for the app to bundle. Route handlers (.ts) stay on the website. */
const mobileApp: NextConfig = {
  output: "export",
  pageExtensions: ["tsx"],
  images: { unoptimized: true },
};

const website: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

const nextConfig: NextConfig = {
  ...(MOBILE ? mobileApp : website),
  reactStrictMode: true,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_APP_VERSION: APP_VERSION, NEXT_PUBLIC_API_ORIGIN: API_ORIGIN },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
