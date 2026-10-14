/**
 * Screenshot a page with headless Chromium (software WebGL).
 *   node --experimental-strip-types scripts/shot.mts <url> <out.png> [waitSelectorOrMs] [width] [height]
 * Env: SKATER=male picks the man; CLIP=<css selector> screenshots only that element.
 */
import { chromium } from "@playwright/test";

const [url, out, wait = "4000", w = "1100", h = "760"] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
if (process.env.SKATER) {
  const variant = process.env.SKATER;
  await page.addInitScript((v: string) => localStorage.setItem("fse-skater", JSON.stringify({ state: { variant: v }, version: 0 })), variant);
}
const logs: string[] = [];
page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
if (/^\d+$/.test(wait)) await page.waitForTimeout(Number(wait));
else await page.waitForSelector(wait, { timeout: 30000 }).catch(() => logs.push(`wait for ${wait} timed out`));
await page.waitForTimeout(800);
if (process.env.CLIP) await page.locator(process.env.CLIP).first().screenshot({ path: out });
else await page.screenshot({ path: out });
await browser.close();
console.log(logs.filter((l) => !l.startsWith("log:")).join("\n") || "no console errors");
console.log("saved", out);
