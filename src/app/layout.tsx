import type { Metadata, Viewport } from "next";
import { Silkscreen, Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const pixel = Silkscreen({ variable: "--font-pixel", weight: ["400", "700"], subsets: ["latin"] });
const sans = Geist({ variable: "--font-sans-ui", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono-ui", subsets: ["latin"] });
const body = localFont({ src: "./fonts/body.ttf", variable: "--font-body-ui" });

const description = "A cozy low-poly train clicker: lay track, run your railway, earn fares.";

// Not VERCEL_PROJECT_PRODUCTION_URL: it picks model-trainz.vercel.app, the shorter domain.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://model-trainz.luigiht.com"
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Model Trainz",
  description,
  openGraph: { title: "Model Trainz", description, type: "website" },
  twitter: { card: "summary_large_image", title: "Model Trainz", description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1b1712",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${pixel.variable} ${sans.variable} ${mono.variable} ${body.variable} h-full`}
    >
      <body className="h-full overflow-hidden antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
