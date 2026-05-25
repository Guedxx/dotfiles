import puppeteer from "puppeteer";
import { existsSync } from "node:fs";

export const port = Number(process.env.BROWSER_PORT || 9222);
export const browserURL = `http://127.0.0.1:${port}`;

export async function isBrowserReady() {
  try {
    const res = await fetch(`${browserURL}/json/version`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function connect() {
  if (!(await isBrowserReady())) {
    throw new Error(`Browser is not running on ${browserURL}. Run browser-tools-start.js first.`);
  }
  return puppeteer.connect({ browserURL, defaultViewport: null });
}

export async function activePage(browser) {
  const pages = await browser.pages();
  const page = pages.at(-1);
  if (!page) throw new Error("No active tab found");
  return page;
}

export async function browserExecutablePath() {
  if (process.env.BROWSER_PATH) return process.env.BROWSER_PATH;
  const candidates = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/brave-browser",
    "/usr/bin/microsoft-edge",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return await puppeteer.executablePath();
}

export function printResult(result) {
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i++) {
      if (i > 0) console.log("");
      const item = result[i];
      if (typeof item === "object" && item !== null) {
        for (const [key, value] of Object.entries(item)) console.log(`${key}: ${format(value)}`);
      } else {
        console.log(format(item));
      }
    }
  } else if (typeof result === "object" && result !== null) {
    for (const [key, value] of Object.entries(result)) console.log(`${key}: ${format(value)}`);
  } else {
    console.log(format(result));
  }
}

function format(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}
