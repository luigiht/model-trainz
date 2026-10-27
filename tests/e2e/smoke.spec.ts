import { expect, test, type Page } from "@playwright/test";

/** First visit: enter a name (and optionally a Game ID), press Play, wait for the world. */
async function ready(page: Page, name = "Tester", path = "/") {
  await page.goto(path);
  await page.getByTestId("profile-name").fill(name);
  await page.getByTestId("profile-play").click();
  await expect(page.locator("main[data-ready='true']")).toBeVisible({ timeout: 45_000 });
}

/** Reload as a returning player: the Continue card picks the game back up. */
async function resume(page: Page) {
  await page.reload();
  await page.getByTestId("resume-continue").click();
  await expect(page.locator("main[data-ready='true']")).toBeVisible({ timeout: 45_000 });
}

test("the player's name and a shareable Game ID continue the game elsewhere", async ({
  page,
  browser,
}) => {
  await ready(page, "Ada");
  await page.getByTestId("game").click();
  const dialog = page.getByTestId("game-dialog");
  await expect(page.getByTestId("game-player")).toHaveText("Ada");
  const id = (await page.getByTestId("game-id").textContent()) ?? "";
  expect(id).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  await expect(page).toHaveURL(new RegExp(`game=${id}`));
  await expect(dialog).toContainText("Saved online.");
  await page.screenshot({ path: "test-results/screenshots/game-panel.png" });
  await page.keyboard.press("Escape");

  // A fresh browser opening the link is offered that game, with the player's name.
  const other = await browser.newContext();
  const page2 = await other.newPage();
  await page2.goto(`/?game=${id}`);
  await expect(page2.getByTestId("profile-id")).toHaveValue(id);
  await expect(page2.getByTestId("profile-name")).toHaveValue("Ada");
  await page2.getByTestId("profile-play").click();
  await expect(page2.locator("main[data-ready='true']")).toBeVisible({ timeout: 45_000 });
  await page2.getByTestId("game").click();
  await expect(page2.getByTestId("game-id")).toHaveText(id);
  await other.close();
});

test("players without a name are hard-refreshed onto a newer build (once)", async ({ page }) => {
  await page.route("**/api/version", (r) => r.fulfill({ json: { version: "newer-build" } }));
  const reload = page.waitForRequest((req) => req.url().includes("v=newer-build"));
  await page.goto("/");
  await reload;
  await expect(page.getByTestId("profile-name")).toBeVisible();
  await expect(page).not.toHaveURL(/v=newer-build/);
});

test.describe("with a Spanish browser", () => {
  test.use({ locale: "es-ES" });

  test("the game speaks the browser's language; the start screen and Settings switch it", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("profile-play")).toHaveText("Jugar");
    await expect(page.getByTestId("start-language")).toHaveValue("es");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await page.screenshot({ path: "test-results/screenshots/start-es.png" });

    await page.getByTestId("start-language").selectOption("it");
    await expect(page.getByTestId("profile-play")).toHaveText("Gioca");
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    await page.getByTestId("profile-name").fill("Ada");
    await page.getByTestId("profile-play").click();
    await expect(page.locator("main[data-ready='true']")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("lay-track")).toContainText("Posa binari");
    await expect(page.getByTestId("buy-shovel")).toContainText("Pale più grandi");
    await page.screenshot({ path: "test-results/screenshots/hud-it.png" });

    await page.getByTestId("settings").click();
    await expect(page.getByTestId("settings-language")).toHaveValue("it");
    await page.getByTestId("settings-language").selectOption("en");
    await expect(page.getByTestId("settings-dialog")).toContainText("Graphics quality");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("lay-track")).toContainText("Lay track");

    // The player's choice wins over the browser's language from now on.
    await page.reload();
    await expect(page.getByTestId("resume-continue")).toHaveText("Continue");
  });
});

test("returning players are invited to continue their game, or start another", async ({ page }) => {
  await ready(page, "Ada");
  await page.keyboard.press("Space");
  await expect(page.getByTestId("coins")).toHaveText("$1");
  await page.reload();
  await expect(page.getByText("Welcome back, Ada!")).toBeVisible();
  await expect(page.getByTestId("profile-name")).toHaveCount(0);
  await page.screenshot({ path: "test-results/screenshots/continue.png" });
  // The other choice shows the name form, with a way back.
  await page.getByTestId("resume-other").click();
  await expect(page.getByTestId("profile-name")).toHaveValue("Ada");
  await page.getByRole("button", { name: "Back to my previous game" }).click();
  await page.getByTestId("resume-continue").click();
  await expect(page.locator("main[data-ready='true']")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("coins")).toHaveText("$1");
});

test("game loads and renders a non-blank WebGL canvas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await page.waitForTimeout(2500);
  const distinctColors = await page
    .getByTestId("scene")
    .locator("canvas")
    .evaluate((el: HTMLCanvasElement) => {
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
  await resume(page);
  await expect(page.getByTestId("coins")).not.toHaveText("$0");
  await expect(buy).toContainText("Bigger Shovels");
  await expect(page.locator("[data-testid='buy-shovel'] span[aria-hidden]")).toHaveText("1");
});

test("a purchase is saved online straight away, so the Game ID carries it", async ({
  page,
  request,
}) => {
  await ready(page);
  const id = new URL(page.url()).searchParams.get("game");
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(90);
  }
  const pushed = page.waitForResponse(
    (r) => r.request().method() === "PUT" && r.url().includes(`/api/games/${id}`),
  );
  await page.getByTestId("buy-shovel").click();
  expect((await pushed).ok()).toBe(true);
  const stored = (await (await request.get(`/api/games/${id}`)).json()) as { save: string };
  const { state } = JSON.parse(stored.save) as {
    state: { levels: { shovel: number }; laid: number; seed: number };
  };
  expect(state.levels.shovel).toBe(1);
  expect(state.laid).toBeGreaterThanOrEqual(10);
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
  await resume(page);
  await page.getByTestId("settings").click();
  await expect(page.getByTestId("quality-low")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("settings-volume")).toHaveValue("40");
});

test("cab view: toggle, drag to look (no track), tap to lay, V key, persists", async ({ page }) => {
  await ready(page);
  await page.getByTestId("view-cab").click();
  await expect(page.getByTestId("view-cab")).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(2500); // camera transition
  await page.screenshot({ path: "test-results/screenshots/cab-docked.png" });

  // Dragging in the cab rotates the camera and does NOT lay track…
  const coins = page.getByTestId("coins");
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.mouse.move(520, 380, { steps: 8 });
  await page.mouse.move(420, 360, { steps: 8 });
  await page.mouse.up();
  await expect(coins).toHaveText("$0");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/screenshots/cab-look.png" });
  // …while a tap does.
  await page.mouse.click(640, 400);
  await expect(coins).toHaveText("$1");
  await page.keyboard.press("c"); // re-centre
  // Track laying still works from the cab.
  for (let i = 0; i < 11; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "test-results/screenshots/cab-moving.png" });
  await resume(page);
  await expect(page.getByTestId("view-cab")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("v");
  await expect(page.getByTestId("view-diorama")).toHaveAttribute("aria-pressed", "true");
});
