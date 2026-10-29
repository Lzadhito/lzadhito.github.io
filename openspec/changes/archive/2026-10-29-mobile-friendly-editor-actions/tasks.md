# Tasks

## 1. Top bar, back, and View link

- [x] 1.1 Replace the header in `editor()` with back (`←`), status, menu (`⋯`), and the primary button; remove `New` from it. Verify with a test that the header contains exactly those controls and that Publish/Update still sends the draft (existing publishing tests pass).
- [x] 1.2 Make back go to `#/drafts` and flush pending typing first. Verify with a test: type, tap back, the draft is in IndexedDB and the drafts list shows, with no `confirm` call.
- [x] 1.3 Show a "View" link in the status area for published posts only, with a 44px tap target. Verify with tests for a published post (link has the live URL) and a draft (no link).
- [x] 1.4 Update header styles in `src/pages/write/index.astro`. Verify by loading `/write/` at 375px width: no horizontal scroll, all header controls at least 44px.

## 2. Bottom-sheet menu

- [x] 2.1 Add a `<dialog>` bottom sheet opened by `⋯`, closing on outside tap, Escape, and after any action. Verify with a test that it opens, lists the right items for a draft and for a published post, and closes on outside tap.
- [x] 2.2 Move "New draft" into the sheet, keeping its current behavior (flush, blank editor). Update the existing tests that clicked `#new`. Verify the tests pass.
- [x] 2.3 Move Unpublish into the sheet for published posts, keeping its `confirm()` and pending flow. Update the "unpublishes after confirmation" test to open the menu first, and add a case where declining changes nothing. Verify both pass.
- [x] 2.4 Move the password field into the sheet ("Set password"), masked, keeping the lock marker and the "Remove the password?" confirmation on Update. Update the affected tests. Verify the password and publishing tests pass.
- [x] 2.5 Style the sheet (bottom-anchored, separated destructive group, red Delete). Verify visually at 375px in light and dark mode.

## 3. Delete with Undo

- [x] 3.1 Add "Delete" to the sheet for unpublished drafts: delete from IndexedDB at once, go to the drafts list, show a toast with Undo for about 5 seconds. Verify with a test that the draft is gone right after the tap.
- [x] 3.2 Make Undo restore the draft unchanged, and let the deletion stand when the toast expires or the page is closed. Verify with tests for undo (title, text, password intact) and for expiry (still deleted), using fake timers.
- [x] 3.3 Confirm "Delete" is absent for published posts and appears after an unpublish completes. Verify with a test that runs unpublish, then checks the menu items.

## 4. Formatting bar above the keyboard

- [x] 4.1 Keep only formatting keys in the footer bar (Unpublish and View already moved out). Verify the existing "inserts markdown around the selection" test passes and no horizontal scroll is needed for five keys at 375px.
- [x] 4.2 Add a `visualViewport` resize handler that sizes the app to the visible area, so the bar sits just above the keyboard. Verify manually on a real iPhone (Safari and installed PWA) and an Android phone: with the keyboard open the bar is visible and tapping a key keeps the keyboard open.

## 5. Integration check

- [x] 5.1 Run `npm test` and `npm run build`. Verify all tests and the build pass.
- [x] 5.2 Walk through on a phone: write, publish, View, Update, Unpublish, Delete, Undo. Verify each spec scenario in `specs/composer-editor/spec.md` behaves as written.
- [x] 5.3 Update `docs/composer-setup.md` if it mentions the old buttons or the long-press delete. Verify with `grep -n "Unpublish\|long-press\|New" docs/composer-setup.md` and fix any stale text.

## Workflow follow-up

- Land `auto-refresh-github-token` first, since both changes touch `src/composer/app.ts`.
- Archive this change after review, and check that `openspec/specs/composer-editor/spec.md` exists afterwards.
