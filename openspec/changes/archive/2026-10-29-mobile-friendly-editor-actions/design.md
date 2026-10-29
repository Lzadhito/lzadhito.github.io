# Design

## Context

The editor is built in `editor()` in `src/composer/app.ts` as one `innerHTML` string, styled by a global `<style>` in `src/pages/write/index.astro`. The app root is `100dvh` with a bottom footer bar. Drafts live in IndexedDB (`db.ts`); `deleteDraft` is already there. Unpublish goes through `pending: "unpublish"` and `sync()`. Tests in `app.test.ts` boot the real module in jsdom and click elements by id. See proposal.md for the motivation.

## Goals / Non-Goals

**Goals:**
- Keep the DOM-string + `onclick` style already used. No framework, no new dependency.
- Keep existing publish, unpublish, autosave, and sync behavior exactly as is.

**Non-Goals:**
- No change to the drafts list, its long-press delete, or the Settings view.
- No change to GitHub sync, `db.ts`, or the Worker.
- No desktop-specific layout. The same layout is used on wide screens.

## Decisions

**1. Menu is a native `<dialog>` opened with `showModal()`, styled as a bottom sheet.**
It gives focus trap, Escape to close, and a backdrop for free. A tap on the dialog element itself (outside the sheet content) closes it. Alternative: a hand-built absolutely positioned div. Rejected: we would have to rebuild focus handling and Escape ourselves. jsdom does not implement `showModal` fully, so tests stub it or assert on the `open` attribute.

**2. Delete = remove now, keep a copy in memory, offer Undo.**
`deleteDraft(id)` runs immediately, the copy is held in a closure, and a toast offers Undo for about 5 seconds. Undo calls `saveDraft(copy)`. Closing the page just lets the deletion stand, so there is no timer to finish and nothing to flush. Alternative: wait 5 seconds, then delete. Rejected: closing the page mid-wait would silently keep a draft the author thought was gone, or need extra `pagehide` logic. Alternative: a confirm dialog. Rejected: native `confirm()` is jarring on a phone and local drafts are cheap to restore.

**3. Published posts: no Delete, only Unpublish.**
Unpublish is a commit to GitHub, so it keeps its `confirm()`. The menu picks Unpublish or Delete from `d.published`. After `sync()` finishes the unpublish, the draft is `published: false`, so the next render shows Delete. The existing "Unpublish first" rule in the drafts list stays consistent. Alternative: one-step delete of a published post. Rejected for now: a wrong tap costs a public commit.

**4. Password moves into the sheet as a small inline input.**
"Set password" reveals a password input inside the sheet (not a `prompt()`), so the value is masked and editable. The existing `password.oninput` logic and the "Remove the password?" check in the publish handler are reused with the input moved, not rewritten. The lock marker on the primary button already exists.

**5. Toolbar above the keyboard uses `visualViewport`.**
On iOS the keyboard does not shrink `100dvh`, so a bottom bar can hide behind it. A small `visualViewport` resize handler sets a CSS variable for the app height, so the flex column (and the footer bar) end at the top of the keyboard. Alternative: `interactive-widget=resizes-content` in the viewport meta. Not enough alone: it works on Chrome Android but not on every iOS version.

**6. Back always goes to `#/drafts`, not `history.back()`.**
`←` sets `location.hash = "#/drafts"`. This is predictable when the editor was opened by the bare `/write/` URL or from a PWA launch, where there is no history to go back to. `render()` already calls `flush()` first, so no typing is lost.

## Risks / Trade-offs

- [Hidden actions in a menu are less discoverable] → Only rare or dangerous actions move there. View and Publish stay visible.
- [Undo toast could be missed on a slow tap] → Five seconds, with a large "Undo" target. Drafts are only local, so the worst case is the same as today's confirm-then-delete.
- [Keyboard handling differs across iOS, Android, and PWA mode] → Manual check on a real phone is part of the tasks. If the handler misbehaves, the fallback is the current layout.
- [Existing tests click `#new`, `#unpub`, and `#password`] → They are updated in the same change to open the menu first.
- [Same file as `auto-refresh-github-token`] → Land that change first to avoid a merge conflict.

## Open Questions

- Exact toast and sheet visual style (radius, motion). Can be tuned after a first look on a phone; it does not change the specs or tasks.
