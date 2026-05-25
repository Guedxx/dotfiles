#!/usr/bin/env node
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connect, activePage } from "./lib.js";

const browser = await connect();
try {
  const page = await activePage(browser);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = join(tmpdir(), `browser-tools-screenshot-${timestamp}.png`);
  await page.screenshot({ path: filepath });
  console.log(filepath);
} finally {
  await browser.disconnect();
}
