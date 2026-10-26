import { expect, test } from "@playwright/test";

test("game loads and renders a non-blank WebGL canvas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("main[data-ready='true']")).toBeVisible({ timeout: 45_000 });
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  // Give the scene a few frames (and the loading screen time to fade).
  await page.waitForTimeout(2500);

  const distinctColors = await canvas.evaluate((el: HTMLCanvasElement) => {
    const probe = document.createElement("canvas");
    probe.width = 64;
    probe.height = 40;
    const ctx = probe.getContext("2d")!;
    ctx.drawImage(el, 0, 0, probe.width, probe.height);
    const data = ctx.getImageData(0, 0, probe.width, probe.height).data;
    const seen = new Set<number>();
    for (let i = 0; i < data.length; i += 4)
      seen.add((data[i] >> 4) * 256 + (data[i + 1] >> 4) * 16 + (data[i + 2] >> 4));
    return seen.size;
  });
  expect(distinctColors).toBeGreaterThan(20);
  await page.screenshot({ path: "test-results/screenshots/m0-scene.png" });
  expect(errors).toEqual([]);
});

test("debug overlay toggles with backtick and quality setting persists", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main[data-ready='true']")).toBeVisible({ timeout: 45_000 });
  await page.keyboard.press("`");
  await expect(page.getByTestId("debug-overlay")).toContainText("draw calls");
  await page.getByTestId("quality-select").selectOption("low");
  await page.reload();
  await expect(page.getByTestId("quality-select")).toHaveValue("low");
});
