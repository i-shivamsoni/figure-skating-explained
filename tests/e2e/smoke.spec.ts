import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/jumps", "/jumps/lutz", "/jumps/axel", "/spins", "/spins/CCoSp", "/steps", "/choreo", "/pairs", "/scoring", "/calculator", "/compare", "/decoder", "/sources", "/rink"];

for (const route of ROUTES) {
  test(`renders ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("the 3D viewer mounts and the rotation counter moves", async ({ page }) => {
  await page.goto("/jumps/lutz");
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.waitForSelector('body[data-skater-ready="1"]', { timeout: 30_000 });
  const slider = page.getByLabel("Time").first();
  await slider.fill("2.8"); // mid-flight: the quad Lutz rotates from 2.40 s to 3.12 s
  await expect(page.getByText(/\/ 4 rev/)).toBeVisible();
  await page.getByRole("button", { name: "3 triple" }).click();
  await page.waitForSelector('body[data-skater-ready="1"]');
  await expect(page.getByText("5.90")).toBeVisible();
});

test("the decoder reads protocol codes", async ({ page }) => {
  await page.goto("/decoder");
  const input = page.getByLabel("Element code");
  await input.fill("4Lz+3T");
  await expect(page.getByText("15.70", { exact: true })).toBeVisible();
  await input.fill("FCCoSp4V");
  await expect(page.getByText("3.15", { exact: true })).toBeVisible();
  await input.fill("3A+REP");
  await expect(page.getByText("6.40", { exact: true })).toBeVisible();
});

test("the calculator warns about a repetition violation", async ({ page }) => {
  await page.goto("/calculator");
  await expect(page.getByText("Total segment score")).toBeVisible();
  // add a third quad Lutz: two solo 4Lz already means +REP; a third attempt is illegal
  await page.getByLabel("Jump").first().selectOption("Lz");
  await page.getByLabel("Rotations").first().selectOption("4");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Jump").first().selectOption("Lz");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(/quad Lutz may be attempted at most twice/)).toBeVisible();
});

test("the camera orbits and zooms from any preset and the presets come back", async ({ page }) => {
  await page.goto("/jumps/lutz");
  await page.waitForSelector('body[data-skater-ready="1"]', { timeout: 30_000 });
  const player = page.locator("[data-camera]").first();
  await expect(player).toHaveAttribute("data-camera", /^follow track/);
  const box = (await player.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 140, cy + 10, { steps: 10 });
  await page.mouse.up();
  await expect(player).toHaveAttribute("data-camera", /^free track/);
  const before = (await player.getAttribute("data-camera"))!;
  await page.mouse.wheel(0, -800);
  await expect.poll(async () => player.getAttribute("data-camera"), { timeout: 5_000 }).not.toBe(before);
  await page.getByRole("button", { name: /^Camera:/ }).first().click();
  await page.getByRole("button", { name: "Overhead" }).click();
  await expect(player).toHaveAttribute("data-camera", /^overhead track/);
  await page.getByRole("checkbox", { name: "Follow the skater" }).uncheck();
  await expect(player).toHaveAttribute("data-camera", /^overhead fixed/);
});

test("the skater drawer changes the look and the choice survives a reload", async ({ page }) => {
  await page.goto("/jumps/axel");
  await page.waitForSelector('body[data-skater-ready="1"]', { timeout: 30_000 });
  const before = await page.evaluate(() => document.body.dataset.appearance);
  await page.getByRole("button", { name: "Your skater" }).first().click();
  await page.locator("button", { hasText: "Ruby" }).first().click();
  await expect.poll(() => page.evaluate(() => document.body.dataset.appearance)).not.toBe(before);
  await page.getByRole("group", { name: "Hair style" }).getByRole("button", { name: "Ponytail" }).click();
  await page.getByRole("group", { name: "Hair length" }).getByRole("button", { name: "Long" }).click();
  await page.getByRole("group", { name: "Skirt" }).getByRole("button", { name: "None" }).click();
  await expect.poll(() => page.evaluate(() => document.body.dataset.appearance)).toContain("hair.ponytail.long none");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Your skater" })).toHaveCount(0);
  await page.reload();
  await page.waitForSelector('body[data-skater-ready="1"]', { timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => document.body.dataset.appearance)).toContain("#8f1230");
  expect(await page.evaluate(() => document.body.dataset.appearance)).toContain("hair.ponytail.long none");
});

test("the grouped nav opens its menus on desktop and its sheet on a phone", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Elements" }).click();
  await expect(page.getByRole("menuitem", { name: /Spins/ })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator("#mobile-nav").getByRole("link", { name: /Calculator/ })).toBeVisible();
});
