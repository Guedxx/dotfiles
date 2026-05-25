# Browser Tools

Minimal Chrome/Chromium DevTools tools for pi, inspired by Mario Zechner's “What if you don't need MCP at all?”.

All scripts are executable and can be called with Bash. If `~/agent-tools/browser-tools` is on `PATH`, use the script names directly; otherwise run them by full path.

## Start Browser

```bash
browser-tools-start.js              # Fresh isolated profile
browser-tools-start.js --profile    # Copy your default browser profile first (cookies/logins)
browser-tools-start.js --restart    # Restart the controlled browser
```

Starts Chrome/Chromium on remote debugging port `9222` using profile dir `~/.cache/pi-browser-tools/profile`.

Environment:

- `BROWSER_PATH=/path/to/chrome` to force a browser executable
- `BROWSER_PORT=9222` to use a different CDP port

## Navigate

```bash
browser-tools-nav.js https://example.com
browser-tools-nav.js https://example.com --new
```

Navigates the current tab or opens a new tab.

## Evaluate JavaScript

```bash
browser-tools-eval.js 'document.title'
browser-tools-eval.js 'document.querySelectorAll("a").length'
browser-tools-eval.js 'Array.from(document.querySelectorAll("a")).map(a => ({ text: a.innerText, href: a.href })).slice(0, 10)'
```

Executes JavaScript in the active page context. The code is wrapped as an async function expression, so DOM APIs and `await` are available.

## Screenshot

```bash
browser-tools-screenshot.js
```

Takes a screenshot of the current viewport and prints the image file path.

## Pick Elements

```bash
browser-tools-pick.js "Click the submit button"
```

Interactive element picker. Click to select one element, Ctrl/Cmd-click to add multiple, Enter to finish, Esc to cancel. Prints compact DOM information.

## Cookies

```bash
browser-tools-cookies.js
browser-tools-cookies.js --json
```

Prints cookies for the active tab, including HTTP-only cookies available via DevTools.
