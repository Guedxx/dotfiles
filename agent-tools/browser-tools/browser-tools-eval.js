#!/usr/bin/env node
import { connect, activePage, printResult } from "./lib.js";

const code = process.argv.slice(2).join(" ");
if (!code) {
  console.log("Usage: browser-tools-eval.js 'code'");
  console.log("\nExamples:");
  console.log('  browser-tools-eval.js "document.title"');
  console.log('  browser-tools-eval.js "document.querySelectorAll(\'a\').length"');
  process.exit(1);
}

const browser = await connect();
try {
  const page = await activePage(browser);
  const result = await page.evaluate(async (c) => {
    const AsyncFunction = (async () => {}).constructor;
    return new AsyncFunction(`return (${c})`)();
  }, code);
  printResult(result);
} finally {
  await browser.disconnect();
}
