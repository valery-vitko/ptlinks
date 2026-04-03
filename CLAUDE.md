# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test              # Run all tests (vitest + jsdom)
npx vitest run tests/buildLink.test.js   # Run a single test file
npx vitest run -t "converts multiple"    # Run tests matching a name pattern
./scripts/publish.ps1            # Test, build ZIP, tag, optionally upload to CWS (interactive)
./scripts/publish.ps1 -Yes       # Non-interactive: auto-confirm all prompts
./scripts/publish.ps1 -Upload    # Upload to CWS without publishing
```

### Shortcuts

- **deliver** — commit, push, and publish (`./scripts/publish.ps1 -Yes`)

## Architecture

Chrome extension (Manifest v3) that converts Jira issue IDs and Pivotal Tracker story numbers into clickable links on GitHub PRs and PlanitPoker.

### Content script pipeline

`constants.js` and `content.js` are injected together (via manifest `content_scripts`) into matching pages at `document_idle`. They share the page's global scope in the browser — there is no module system at runtime.

1. `readSettings()` loads Jira tenant name from `chrome.storage.sync`
2. `processImmediateElements()` runs `buildLink()` on all existing matching DOM elements
3. `processWatchedElements()` attaches `MutationObserver` to elements whose content changes dynamically (Angular ngBind, GitHub SPA navigation)
4. A main `MutationObserver` on `document.body` handles elements added later

`buildLink()` checks Jira regex first (global flag, replaces all matches), then Pivotal Tracker. Returns early after the first pattern that matches. Skips elements that already contain `<a>` tags (idempotency guard).

### Site-specific selectors

Configured in `elementConfig` object keyed by hostname. Each site has `immediate` (process once) and `watched` (attach observer) selector arrays.

### Options page

`options.html` + `options.js` — reads/writes `jiraTenantName` to `chrome.storage.sync`.

## Testing

Vitest with jsdom environment. Key setup details in `tests/setup.js`:

- `globalThis.chrome` mock must exist before `content.js` loads (it auto-initializes on require)
- `innerText` is polyfilled via `textContent` (jsdom doesn't implement `innerText`)
- `DEFAULT_JIRA_TENANT_NAME` is bridged to `globalThis` since browser global scope doesn't exist in Node

Source files use `if (typeof module !== 'undefined' && module.exports)` for conditional exports — this is ignored in the browser.

## Publishing

`manifest.json` is the single source of truth for the version. `scripts/publish.ps1` syncs it to `package.json`. CWS CLI upload is enabled when `EXTENSION_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN` env vars are set.
