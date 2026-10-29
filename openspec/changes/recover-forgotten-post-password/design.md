# Design

## Context

See proposal.md for motivation. Facts that shape the approach:

- `fetchPost` reads the repo file without the password and returns ciphertext in `Draft.locked`, plus `slug`, `pubDate`, `extra`, and `baseOid`. Everything needed to replace the post is available without decrypting.
- `publish` writes the file at the draft's slug and refuses if the repo file's id differs from `baseOid`. A draft that carries the fetched `baseOid` therefore overwrites cleanly, and still detects a concurrent edit.
- `openRemoteDraft` (`app.ts`) is the single place that unlocks. It uses `prompt` and `alert`, and returns `null` on any failure, which is the dead end.
- A remote post with a local copy shows only as the local row. That local copy already holds the password, so it opens without a prompt. The sheet therefore only matters for remote-only locked posts, so no "look for it on this device" step is needed.
- The editor already uses a `<dialog>` bottom sheet for its menu.
- The author's security model is the GitHub token: anyone signed in may replace or delete any post. No extra proof is required to start over.

## Goals / Non-Goals

**Goals:**
- A locked post is never a dead end: the author can always replace it, delete it, or open it on the site.
- Starting over keeps the URL.
- Nothing destructive happens until Publish.

**Non-Goals:**
- Recovering the text or adding a backdoor, recovery key, or password hint (a hint would be public).
- Changing encryption, the stored blob format, or the reader-side gate.
- Rewriting git history to remove the old ciphertext.

## Decisions

**Unlock sheet replaces `prompt`/`alert`.** A `<dialog>` with a password input, show/hide toggle, inline error, and secondary actions. Why: native dialogs can't show an inline error or a second action, and that is what created the dead end. Alternative: keep native dialogs and add a `confirm` for "forgot" — rejected, it still bounces the author out after each wrong guess.

**Sheet is opened by the drafts list, not by `openRemoteDraft`.** `openRemoteDraft` keeps its "known password or ask" shape but asks through the sheet and resolves to a `Draft` or `null`. The conflict-resolution caller (`loadRepo`) keeps using it unchanged and does not get the "Write it again" option, since replacing the post there would discard the author's edit. The list passes an option that enables it.

**"Write it again" builds a draft from the already-fetched post.** `{ ...fetched, text: "", locked: undefined, password: undefined, replacesLocked: true }`, saved like any draft. Why: reuses `publish`, the conflict check, autosave, and the editor with no new write path. Alternative: delete then recreate — rejected, it loses the URL and has a window where the post is gone.

**Safety lives at Publish, not at "Write it again".** The old file is untouched until Publish, so starting over needs no confirm and the author can discard freely. Publish for a `replacesLocked` draft is blocked while the body is empty, then asks once: the locked text will be replaced and cannot be undone. Clearing the flag on successful publish.

**Protected flag comes from the listing query.** `listRemotePosts` already reads each file's text for front matter; it also reports `protected` so rows can show a lock without extra requests.

**Delete and View are visible actions in the sheet.** Delete reuses `fetchPost` + `unpublish` from the existing long-press path (kept as a shortcut), behind the usual confirm.

## Risks / Trade-offs

- [The author really knew the password and misses it] → "Try again" is the primary action; "Write it again" sits behind "Forgot the password?" and needs a second tap.
- [Abandoned rewrite draft lingers] → It is a normal local draft, marked "replaces locked post", and has a Discard in the banner.
- [Old ciphertext stays in git history] → Accepted; documented. Only a guess of the old password could read it.
- [Remote changes while the rewrite is open] → Existing `baseOid` conflict handling applies.
- [`Draft` gains a field] → IndexedDB is schemaless per record, so no migration. Older records simply lack it.
