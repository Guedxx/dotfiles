# Dotfiles

Portable personal configuration files.

## Layout

- `pi/` - pi coding agent config, extensions, and skills.
  - `pi/.pi/agent/settings.json`
  - `pi/.pi/agent/extensions/`
  - `pi/.pi/agent/skills/`
  - `pi/AGENTS.md`
- `agent-tools/browser-tools/` - Minimal Chrome DevTools browser automation scripts for pi.
- `ghostty/` - Ghostty config.
  - `ghostty/config`
  - `ghostty/goku.jpg`
  - `ghostty/shaders/`

## Not tracked

- pi auth/secrets: `pi/.pi/agent/auth.json`, `pi/.pi/agent/bedrock.env`
- pi generated/runtime data: `pi/.pi/agent/sessions/`, `pi/.pi/agent/bin/`
- environment files and dependencies

## Browser tools setup

```bash
cd ~/dotfiles/agent-tools/browser-tools
bun install
mkdir -p ~/.pi/agent/bin ~/.pi/agent/skills
ln -sfn ~/dotfiles/pi/.pi/agent/skills/browser-tools ~/.pi/agent/skills/browser-tools
for f in ~/dotfiles/agent-tools/browser-tools/browser-tools-*.js; do ln -sf "$f" ~/.pi/agent/bin/$(basename "$f"); done
```

Then run `/reload` in pi and use `/skill:browser-tools`.
