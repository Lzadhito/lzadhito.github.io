# Proposal

## Why

On a device that is not signed in, the `/write` Drafts list shows only local drafts. The only hint is one small grey line, so the author cannot tell that posts published from other devices exist but are hidden. Opening a post that already has a local copy also hides the repo's newer version, so an old copy can silently overwrite a newer edit. The composer also looks unlike the blog it publishes to.

## What Changes

Delivered in three stages that can ship separately.

**Stage 1: clear sign-in (the reported problem)**
- When signed out, the Drafts list shows a sign-in block in the exact slot where posts from other devices will appear, with a primary "Sign in with GitHub" action and a Settings fallback for pasted tokens.
- The GitHub device flow runs inside that block. When it finishes, the block is replaced by the remote posts without leaving Drafts.
- The editor says what is true when signed out: "Saved on this device. Sign in to publish." Publish no longer redirects to Settings without explanation.
- A GitHub fetch failure shows the real error with a "Try again" action.

**Stage 2: trustworthy remote posts**
- Remote posts show their title and publish date, newest first, instead of the file slug.
- Opening a post records the file version it was loaded from. Update checks that version first and, if the file changed in the repo since, stops and asks instead of overwriting.
- A post that already has a local copy is checked against the repo, so a stale local copy cannot hide a newer remote one.

**Stage 3: consistency and freshness**
- `/write` uses the blog's look (Atkinson typeface, green accent, pale base colour from `src/styles/global.css`) instead of its own system font and blue accent. The dark variant stays.
- The cached app tells the author when a newer version is available instead of silently running an old one.

## Capabilities

### New Capabilities
- `composer-drafts`: what the Drafts list shows in each sign-in and network state, how sign-in is offered, and how remote posts are listed and opened.
- `composer-edit-safety`: publishing an edit never overwrites a newer version of the same post in the repo.
- `composer-app-shell`: the composer's appearance matches the blog's visual style, and a newer app version is announced rather than applied silently.

### Modified Capabilities
<!-- None. The unarchived change `auto-refresh-github-token` owns `composer-auth`; this change does not alter token handling. -->

## Impact

- Code: `src/composer/app.ts`, `src/composer/github.ts`, `src/composer/db.ts` (store the loaded file version), `src/pages/write/index.astro` (styles), `public/write/sw.js` (update signal).
- Tests: `src/composer/__tests__/app.test.ts` and `github.test.ts` extended.
- Docs: the "Editing or deleting existing posts" section of `docs/composer-setup.md`.
- No new dependencies, no Worker or GitHub App changes. The sign-in flow reuses the existing device-flow code.
- Out of scope: changing how tokens are stored or refreshed, and a full redesign of the editor screen layout.
