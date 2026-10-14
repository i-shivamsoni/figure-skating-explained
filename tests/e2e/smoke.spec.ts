import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/jumps", "/jumps/lutz", "/jumps/axel", "/spins", "/spins/CCoSp", "/steps", "/choreo", "/scoring", "/calculator", "/compare", "/decoder", "/sources"];

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
  await slider.fill("2.1");
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
