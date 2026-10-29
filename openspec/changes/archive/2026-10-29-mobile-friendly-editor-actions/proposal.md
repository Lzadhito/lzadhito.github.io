# Proposal

## Why

The /write editor is used mostly on a phone, but its actions are hard to use there. The exit button is an unclear `☰`. "View" is a tiny text link inside a horizontally scrolling footer. Unpublish sits next to the formatting keys. Delete exists only as a hidden long-press in the drafts list, and is refused for published posts. Frequent, rare, and dangerous actions are all mixed together.

## What Changes

- Top bar becomes: back arrow (`←`), status, a `⋯` menu button, and one primary Publish/Update button. The `New` button leaves the top bar.
- The back arrow replaces `☰`. It goes to the drafts list. It is not labelled "Cancel": autosave means nothing is discarded.
- When a post is published, the status shows a "View ↗" link with a full-size tap target.
- The `⋯` button opens a bottom sheet with: View post (published only), New draft, Set password, Unpublish (published only), Delete.
- Delete on an unpublished draft is one tap, with an Undo toast for about 5 seconds and no dialog.
- Delete on a published post is not offered. The sheet shows Unpublish instead (with a confirmation, as today). Once unpublished, the post is a draft and Delete appears.
- The password field moves from a permanent row above the body into the sheet.
- The formatting bar keeps only formatting keys and stays visible above the on-screen keyboard.

## Capabilities

### New Capabilities
- `composer-editor`: What the /write editor screen shows and how its actions (back, publish, view, new, password, unpublish, delete) are placed and behave on a phone.

### Modified Capabilities

## Impact

- `src/composer/app.ts`: `editor()` markup and handlers; a small delete-with-undo helper.
- `src/pages/write/index.astro`: styles for the new header, sheet, toast, and keyboard-aware toolbar.
- `src/composer/__tests__/app.test.ts`: update editor tests that rely on the old header or footer, and add tests for the new actions.
- No backend, database, or dependency changes. The drafts list and its long-press delete are unchanged.
- Touches the same file as the in-flight `auto-refresh-github-token` change (one task left), so land that first.
