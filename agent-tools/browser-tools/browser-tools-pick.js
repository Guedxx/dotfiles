#!/usr/bin/env node
import { connect, activePage, printResult } from "./lib.js";

const message = process.argv.slice(2).join(" ");
if (!message) {
  console.log("Usage: browser-tools-pick.js 'message'");
  console.log("\nExample:");
  console.log('  browser-tools-pick.js "Click the submit button"');
  process.exit(1);
}

const browser = await connect();
try {
  const page = await activePage(browser);
  await page.evaluate(() => {
    window.pick = async (message) => {
      if (!message) throw new Error("pick() requires a message parameter");
      return new Promise((resolve) => {
        const selections = [];
        const selectedElements = new Set();
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:none";
        const highlight = document.createElement("div");
        highlight.style.cssText = "position:absolute;border:2px solid #3b82f6;background:rgba(59,130,246,0.1);transition:all 0.1s";
        overlay.appendChild(highlight);
        const banner = document.createElement("div");
        banner.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1f2937;color:white;padding:12px 24px;border-radius:8px;font:14px sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);pointer-events:auto;z-index:2147483647;max-width:80vw";
        const updateBanner = () => { banner.textContent = `${message} (${selections.length} selected, Ctrl/Cmd-click to add, Enter to finish, Esc to cancel)`; };
        updateBanner();
        document.body.append(banner, overlay);

        const cleanup = () => {
          document.removeEventListener("mousemove", onMove, true);
          document.removeEventListener("click", onClick, true);
          document.removeEventListener("keydown", onKey, true);
          overlay.remove();
          banner.remove();
          selectedElements.forEach(el => { el.style.outline = ""; });
        };
        const buildElementInfo = (el) => {
          const parents = [];
          let current = el.parentElement;
          while (current && current !== document.body && parents.length < 8) {
            const tag = current.tagName.toLowerCase();
            const id = current.id ? `#${current.id}` : "";
            const cls = typeof current.className === "string" && current.className.trim() ? `.${current.className.trim().split(/\s+/).join(".")}` : "";
            parents.push(tag + id + cls);
            current = current.parentElement;
          }
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            class: typeof el.className === "string" ? el.className || null : null,
            text: el.textContent?.trim().replace(/\s+/g, " ").slice(0, 200) || null,
            html: el.outerHTML.slice(0, 500),
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
            parents: parents.join(" > "),
          };
        };
        const onMove = (e) => {
          const el = document.elementFromPoint(e.clientX, e.clientY);
          if (!el || overlay.contains(el) || banner.contains(el)) return;
          const r = el.getBoundingClientRect();
          highlight.style.cssText = `position:absolute;border:2px solid #3b82f6;background:rgba(59,130,246,0.1);transition:all 0.1s;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px`;
        };
        const onClick = (e) => {
          if (banner.contains(e.target)) return;
          e.preventDefault();
          e.stopPropagation();
          const el = document.elementFromPoint(e.clientX, e.clientY);
          if (!el || overlay.contains(el) || banner.contains(el)) return;
          if (e.metaKey || e.ctrlKey) {
            if (!selectedElements.has(el)) {
              selectedElements.add(el);
              el.style.outline = "3px solid #10b981";
              selections.push(buildElementInfo(el));
              updateBanner();
            }
          } else {
            cleanup();
            resolve(selections.length > 0 ? selections : buildElementInfo(el));
          }
        };
        const onKey = (e) => {
          if (e.key === "Escape") { e.preventDefault(); cleanup(); resolve(null); }
          else if (e.key === "Enter" && selections.length > 0) { e.preventDefault(); cleanup(); resolve(selections); }
        };
        document.addEventListener("mousemove", onMove, true);
        document.addEventListener("click", onClick, true);
        document.addEventListener("keydown", onKey, true);
      });
    };
  });
  const result = await page.evaluate((msg) => window.pick(msg), message);
  printResult(result);
} finally {
  await browser.disconnect();
}
