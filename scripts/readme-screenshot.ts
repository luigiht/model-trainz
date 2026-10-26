/**
 * Captures docs/screenshot.png for the README from a running server.
 * Usage: pnpm dev (or pnpm start), then `pnpm screenshot [baseUrl]`.
 */
import { chromium } from "@playwright/test";

const baseUrl = process.argv[2] ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.addInitScript(() => {
    if (!localStorage.getItem("rbc-settings")) {
      localStorage.setItem(
        "rbc-settings",
        JSON.stringify({ state: { quality: "high", muted: true }, version: 1 }),
      );
    }
  });
  await page.goto(baseUrl);
  const layTrack = page.getByTestId("lay-track");
  await layTrack.waitFor();
  await page.waitForTimeout(4000);

  // Lay track to the next station, then capture once the train has pulled in there.
  const status = page.getByTestId("leg-status");
  const fromStation = page.locator('[aria-label="Status"] .font-body').first();
  const start = await fromStation.textContent();
  for (let i = 0; i < 400; i++) {
    if ((await fromStation.textContent()) !== start) break;
    if (/Lay \d+ more/.test((await status.textContent()) ?? "")) await layTrack.click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(600);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: "docs/screenshot.png" });
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
