# Proposal

## Why

If the author forgets a protected post's password, `/write` has no way forward. Tapping the post opens a native `prompt()`; a wrong answer shows `alert("Wrong password.")` and drops back to the list. The post can't be opened, so it can't be overwritten. The only exit is a hidden press-and-hold delete, which also loses the post's URL. `docs/password-protected-posts.md` promises "publish new content with a new password", but the UI offers no route to it.

The password also lived only in the browser where it was typed, so a second device or a cleared browser could never open the post, and with many locked posts the author cannot remember them all.

The lock should guard the text only. Managing the post (replace it, delete it, view it) should work for anyone signed in with the GitHub token.

## What Changes

- The composer saves a protected post's password in its front matter (`password: "..."`), and opening a locked post decrypts it with that password with no prompt, on any device. The author accepts that anyone who can read the repo can then read the post.
- The editor's password field gets a Show/Hide button so the author can read it.
- Locked posts show a lock marker in the Drafts list.
- Tapping a locked remote post opens an unlock sheet instead of a native prompt. It has a show/hide password field and an inline "wrong password" message. The sheet stays open on a wrong guess.
- The sheet has a "Forgot the password?" step, for older posts that never saved a password. It says the text can't be recovered and offers "Write it again".
- "Write it again" opens a fresh draft for the same post (same slug, title, date, extra front matter, and base version) with an empty body and a banner. Nothing changes in the repo until Publish.
- A rewrite draft can't be published with an empty body. Publishing it asks one confirmation that the locked text will be replaced.
- The sheet also has visible "View on site" and "Delete" actions, so a locked post never needs the password to be managed.
- `docs/password-protected-posts.md` is updated to describe this flow.

## Capabilities

### New Capabilities
- `composer-locked-posts`: How the author finds, unlocks, replaces, or deletes a password-protected post in `/write`, including when the password is forgotten.

### Modified Capabilities

(none — existing specs keep their requirements; the new capability owns the locked-post behavior)

## Impact

- The repo is public, so the saved password is readable by anyone. The lock now only keeps out readers of the site and search engines.
- `src/composer/app.ts`: replace `prompt`/`alert` in `openRemoteDraft` with an unlock sheet; locked row marker; banner and publish guard in the editor; visible delete.
- `src/composer/github.ts`: `toMarkdown` writes the password and `fetchPost` reads it back; `listRemotePosts` returns whether a post is protected; a helper builds the rewrite draft from a fetched locked post.
- `src/composer/db.ts`: `Draft` gains a marker for "replaces a locked post".
- Tests in `src/composer/__tests__/`; docs in `docs/password-protected-posts.md`.
- No change to `postCrypto.ts`, the published-site gate, or the stored format.
