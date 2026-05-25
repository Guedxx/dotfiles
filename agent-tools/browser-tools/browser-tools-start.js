#!/usr/bin/env node
import { spawn, execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { browserExecutablePath, isBrowserReady, port } from "./lib.js";

const args = new Set(process.argv.slice(2));
const useProfile = args.has("--profile");
const restart = args.has("--restart");
const help = args.has("--help") || args.has("-h") || [...args].some(a => !["--profile", "--restart"].includes(a));

if (help) {
  console.log("Usage: browser-tools-start.js [--profile] [--restart]");
  console.log("\nOptions:");
  console.log("  --profile   Copy your default Chrome/Chromium/Brave profile first");
  console.log("  --restart   Kill previous browser started by this tool and start again");
  console.log("\nEnvironment: BROWSER_PATH=/path/to/chrome BROWSER_PORT=9222");
  process.exit(args.has("--help") || args.has("-h") ? 0 : 1);
}

const baseDir = join(homedir(), ".cache", "pi-browser-tools");
const profileDir = join(baseDir, "profile");
const pidFile = join(baseDir, "browser.pid");
mkdirSync(baseDir, { recursive: true });

if (restart) killPrevious();

if (!restart && await isBrowserReady()) {
  console.log(`✓ Browser already running on :${port}`);
  process.exit(0);
}

if (useProfile) {
  rmSync(profileDir, { recursive: true, force: true });
  mkdirSync(dirname(profileDir), { recursive: true });
  const source = findProfileSource();
  if (!source) {
    console.error("✗ Could not find a Chrome/Chromium/Brave profile to copy. Start without --profile or set up a browser profile first.");
    process.exit(1);
  }
  console.log(`Copying profile from ${source} ...`);
  try {
    execFileSync("rsync", ["-a", "--delete", `${source}/`, `${profileDir}/`], { stdio: "ignore" });
  } catch {
    cpSync(source, profileDir, { recursive: true, force: true });
  }
  cleanupProfileLocks(profileDir);
} else {
  mkdirSync(profileDir, { recursive: true });
}

const executable = await browserExecutablePath();
const child = spawn(executable, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-dev-shm-usage",
], { detached: true, stdio: "ignore" });
child.unref();
writeFileSync(pidFile, String(child.pid));

for (let i = 0; i < 40; i++) {
  if (await isBrowserReady()) {
    console.log(`✓ Browser started on :${port}${useProfile ? " with copied profile" : ""}`);
    console.log(`Profile: ${profileDir}`);
    process.exit(0);
  }
  await new Promise(r => setTimeout(r, 250));
}

console.error(`✗ Failed to connect to browser on :${port}`);
console.error(`Executable: ${executable}`);
process.exit(1);

function killPrevious() {
  if (!existsSync(pidFile)) return;
  try {
    const pid = Number(String(execFileSync("cat", [pidFile])).trim());
    if (pid) process.kill(pid, "SIGTERM");
  } catch {}
  rmSync(pidFile, { force: true });
}

function findProfileSource() {
  const h = homedir();
  const candidates = [
    join(h, ".config", "google-chrome"),
    join(h, ".config", "chromium"),
    join(h, ".config", "BraveSoftware", "Brave-Browser"),
    join(h, "Library", "Application Support", "Google", "Chrome"),
    join(h, "Library", "Application Support", "Chromium"),
    join(h, "Library", "Application Support", "BraveSoftware", "Brave-Browser"),
  ];
  return candidates.find(existsSync);
}

function cleanupProfileLocks(dir) {
  for (const name of ["SingletonLock", "SingletonSocket", "SingletonCookie", "lockfile"]) {
    rmSync(join(dir, name), { force: true });
  }
}
