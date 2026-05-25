---
name: browser-tools
description: Minimal browser automation through Bash scripts using Chrome DevTools. Use for navigating websites, inspecting DOM, taking screenshots, picking elements, and extracting cookies without MCP.
---

# Browser Tools

Use these Bash tools for browser interaction. They are globally available on pi's PATH as `browser-tools-*.js` and live in `~/agent-tools/browser-tools`.

## Start Browser

```bash
browser-tools-start.js              # Fresh isolated profile
browser-tools-start.js --profile    # Copy default Chrome/Chromium/Brave profile first (cookies/logins)
browser-tools-start.js --restart    # Restart the controlled browser
```

Starts Chrome/Chromium on DevTools port `9222`.

## Navigate

```bash
browser-tools-nav.js https://example.com
browser-tools-nav.js https://example.com --new
```

Navigate current tab or open a new tab.

## Evaluate JavaScript

```bash
browser-tools-eval.js 'document.title'
browser-tools-eval.js 'document.querySelectorAll("a").length'
```

Executes JavaScript in the active page context. The code can use DOM APIs and `await`.

## Screenshot

```bash
browser-tools-screenshot.js
```

Takes a screenshot of the current viewport and prints the PNG path. Read that image path when visual inspection is needed.

## Pick Elements

```bash
browser-tools-pick.js "Click the submit button"
```

Interactive picker. User clicks elements in the browser: click selects one, Ctrl/Cmd-click multi-selects, Enter finishes, Esc cancels. Prints compact DOM info.

## Cookies

```bash
browser-tools-cookies.js
browser-tools-cookies.js --json
```

Prints cookies for the active tab, including HTTP-only cookies available through DevTools.
