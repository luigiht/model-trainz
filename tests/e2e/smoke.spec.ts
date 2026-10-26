import { expect, test, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("main[data-ready='true']")).toBeVisible({ timeout: 45_000 });
}

test("game loads and renders a non-blank WebGL canvas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await page.waitForTimeout(2500);
  const distinctColors = await page.locator("canvas").evaluate((el: HTMLCanvasElement) => {
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
  await page.screenshot({ path: "test-results/screenshots/start.png" });
  expect(errors).toEqual([]);
});

test("clicking lays track, earns coins, and the train departs", async ({ page }) => {
  await ready(page);
  const status = page.getByTestId("leg-status");
  const needed = Number((await status.textContent())?.match(/Lay (\d+) more/)?.[1]);
  expect(needed).toBeGreaterThan(1);
  await page.getByTestId("scene").click({ position: { x: 640, y: 450 } });
  await expect(page.getByTestId("coins")).toHaveText("$1");
  await expect(status).toContainText(`Lay ${needed - 1} more piece`);
  for (let i = 0; i < needed - 1; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(90); // stay under the click-rate cap
  }
  await expect(status).toContainText(/Chuffing to|All aboard/);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/screenshots/departing.png" });
  await expect(status).toContainText(/Lay \d+ more pieces to reach Chuffield/, { timeout: 20_000 });
  await page.screenshot({ path: "test-results/screenshots/arrived.png" });
});

test("buying an upgrade works and progress persists across reloads", async ({ page }) => {
  await ready(page);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(90);
  }
  const buy = page.getByTestId("buy-shovel");
  await expect(buy).toBeEnabled();
  await buy.click();
  await expect(page.getByTestId("coins")).toHaveText("$0");
  // Two pieces per click now → the click pays $2 (shown as a floating number).
  await page.keyboard.press("Space");
  await expect(page.locator(".floater", { hasText: "+$2" }).first()).toBeAttached();
  await page.reload();
  await expect(page.locator("main[data-ready='true']")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("coins")).not.toHaveText("$0");
  await expect(buy).toContainText("Bigger Shovels");
  await expect(page.locator("[data-testid='buy-shovel'] span[aria-hidden]")).toHaveText("1");
});

test("debug overlay toggles; settings panel changes quality + volume and they persist", async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.press("`");
  await expect(page.getByTestId("debug-overlay")).toContainText(/chunks\s+[1-9]/);
  await page.keyboard.press("`");
  await page.getByTestId("settings").click();
  const dialog = page.getByTestId("settings-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Controls");
  await page.getByTestId("quality-low").click();
  await expect(page.getByTestId("quality-low")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("quality-auto")).toHaveAttribute("aria-checked", "false");
  await page.getByTestId("settings-volume").fill("40");
  await page.screenshot({ path: "test-results/screenshots/settings.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.locator("main[data-ready='true']")).toBeVisible({ timeout: 45_000 });
  await page.getByTestId("settings").click();
  await expect(page.getByTestId("quality-low")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("settings-volume")).toHaveValue("40");
});
