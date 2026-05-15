# PI Config Sync Instructions

This repository stores portable pi coding agent configuration.

When asked to update this machine from the repo:

- Copy `.pi/agent/settings.json` to `~/.pi/agent/settings.json`.
- Copy files under `.pi/agent/extensions/` to `~/.pi/agent/extensions/`.
- Create target directories if they do not exist.
- Preserve local credentials and machine-specific files.

Never copy to the repo or commit these local files:

- `~/.pi/agent/auth.json`
- `~/.pi/agent/bedrock.env`
- `~/.pi/agent/sessions/`
- `~/.pi/agent/bin/`
- Any `.env` file or file containing API keys, tokens, credentials, or session history.

When asked to save this machine's pi config into the repo:

- Update `.pi/agent/settings.json` from `~/.pi/agent/settings.json`.
- Update `.pi/agent/extensions/` from `~/.pi/agent/extensions/`.
- Check `git status` and `git diff` before committing.
- Do not stage ignored or secret files.
