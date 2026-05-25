#!/usr/bin/env node
import { connect, activePage, printResult } from "./lib.js";

const json = process.argv.includes("--json");
const browser = await connect();
try {
  const page = await activePage(browser);
  const cookies = await page.cookies();
  if (json) console.log(JSON.stringify(cookies, null, 2));
  else printResult(cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain, path: c.path, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite })));
} finally {
  await browser.disconnect();
}
