#!/usr/bin/env node
import { connect, activePage } from "./lib.js";

const url = process.argv[2];
const newTab = process.argv[3] === "--new";
if (!url || (process.argv[3] && !newTab)) {
  console.log("Usage: browser-tools-nav.js <url> [--new]");
  console.log("\nExamples:");
  console.log("  browser-tools-nav.js https://example.com");
  console.log("  browser-tools-nav.js https://example.com --new");
  process.exit(1);
}

const browser = await connect();
try {
  const page = newTab ? await browser.newPage() : await activePage(browser);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  console.log(`${newTab ? "✓ Opened" : "✓ Navigated to"}: ${url}`);
} finally {
  await browser.disconnect();
}
