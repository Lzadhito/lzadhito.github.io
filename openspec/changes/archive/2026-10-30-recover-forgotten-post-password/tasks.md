# Tasks

## 1. Data: know which posts are locked, and build a replacement draft

- [x] 1.1 `listRemotePosts` returns `protected` per post; add a case to `src/composer/__tests__/github.test.ts` and verify it passes
- [x] 1.2 Add `replacesLocked?: boolean` to `Draft` (`db.ts`) and a helper in `github.ts` that turns a fetched locked draft into a replacement draft (same slug, title, pubDate, extra, baseOid; empty text; no password); unit test that the fields carry over and `locked`/`password` are cleared

## 2. Unlock sheet

- [x] 2.1 Show a lock marker on locked remote rows; verify with an app test that a protected remote post renders it
- [x] 2.2 Replace `prompt`/`alert` in `openRemoteDraft` with a `<dialog>` sheet: password field with show/hide, inline wrong-password error, stays open and refocuses; verify tests for wrong, correct, and dismissed
- [x] 2.3 Add "View on site" and a confirmed "Delete" to the sheet (reusing `fetchPost` + `unpublish`); verify delete test removes the row. Keep the long-press shortcut working
- [x] 2.4 Add the "Forgot the password?" step (honest copy, kept vs replaced, "Write it again", back). Enable it only when the list opens the sheet, not for the conflict "load repo version" path; verify a test shows it from the list and not from the conflict flow

## 3. Replacement draft in the editor

- [x] 3.1 "Write it again" saves the replacement draft and opens it; verify the repo is not written (mocked GitHub gets no commit)
- [x] 3.2 Show the banner with Discard on `replacesLocked` drafts; verify Discard removes the draft and leaves the remote alone
- [x] 3.3 Disable Publish while a replacement draft is empty and confirm before publishing it; clear `replacesLocked` after a successful publish; verify tests for empty, declined, and confirmed publish, including that the slug is unchanged

## 4. Docs and integration

- [x] 4.1 Update the "Editing a protected post" section of `docs/password-protected-posts.md` to describe the sheet, "Write it again", and that the old ciphertext remains in git history
- [ ] 4.2 Run the full test suite and walk the flow by hand in `/write`: publish a post with a password and reopen it with no prompt, Show the password; then an older post with no saved password: wrong password, Forgot, Write it again, Discard, then again and Publish; verify the live URL shows the new text

## 5. Saved password (added after the first pass)

- [x] 5.1 Write the password to the front matter in `toMarkdown` and read it back in `fetchPost`; verified by tests in `github.test.ts` that cover a protected and an unprotected post
- [x] 5.2 Open a locked post with its saved password and fall back to the sheet when it is wrong; verified by two tests in `app.test.ts`
- [x] 5.3 Add a Show/Hide button to the editor's password field; verified by a test in `app.test.ts`
- [x] 5.4 Rewrite `docs/password-protected-posts.md` for the saved password and its public-repo trade-off
