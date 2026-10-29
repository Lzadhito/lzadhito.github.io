# Tasks

Stages 1 to 3 can ship separately. Each group lands its own tests and docs.

## 1. Stage 1: shared sign-in

- [x] 1.1 In `src/composer/app.ts`, extract the device-flow click handler from `settingsView()` into `startSignIn(host, onSignedIn)` (shows the code, copy-and-open, cancel, errors; saves the token set); make Settings call it; verify the existing Settings sign-in tests in `app.test.ts` still pass unchanged
- [x] 1.2 Add `remoteState` (`signed-out | loading | ready | offline | error`) and a single `renderRemoteSlot()` under the local drafts, replacing `setRemoteStatus` and the post-hoc list rewrite in `drafts()`; verify with `app.test.ts` cases for each state's rendered content
- [x] 1.3 Signed-out state: show the explanation, a "Sign in with GitHub" button that runs `startSignIn` inside the block (only when `authEnabled(AUTH)`), and a link to Settings; on success load remote posts in place and stay on Drafts; verify in `app.test.ts` (button present or absent by config, success replaces the block with rows, cancel restores the block with a message)
- [x] 1.4 Error and offline states: show the real error text with a "Try again" button that re-runs the load, and keep local rows; offline shows the device-only message; verify in `app.test.ts` (rejected `listRemotePosts` shows the message and retry succeeds, offline shows no request)
- [x] 1.5 Editor signed-out copy: replace the bottom message with "Saved on this device. Sign in to publish." plus a sign-in link; on Publish with no token, queue the draft, say it will publish after sign-in, then go to Settings; verify in `app.test.ts` (message text, draft kept with `pending: "publish"`, queued draft publishes after sign-in)
- [x] 1.6 Update the "Editing or deleting existing posts" section of `docs/composer-setup.md` to describe the sign-in block; verify the described steps match the UI by running the composer once signed out

## 2. Stage 2: remote post metadata and listing

- [x] 2.1 In `src/composer/github.ts`, change `listRemotePosts` to one query returning each entry's `oid` and `text`, and return `{ slug, title, pubDate, oid }` using `parseFrontmatter`; verify in `github.test.ts` (titles and dates parsed, a post without a title falls back to the slug, a locked post's body is not exposed)
- [x] 2.2 Render remote rows with title and publish date, sorted by `pubDate` descending then slug; verify in `app.test.ts` with a mix of dated and undated file names
- [x] 2.3 Show one row per slug: stop hiding remote posts that have a local copy, and mark the row "newer version in repo" when the local draft's `baseOid` differs from the entry `oid`; verify in `app.test.ts` (same oid shows no mark, different oid shows it, no `baseOid` shows no mark)

## 3. Stage 2: edit safety

- [x] 3.1 Add `baseOid?: string` to `Draft` in `src/composer/db.ts`; have `fetchPost` set it from the blob `oid`; verify in `github.test.ts` that a fetched draft carries the oid and in `db.test.ts` that an older draft without it still loads
- [x] 3.2 Extend `head()` to return the target file's `oid`; in `publish()` throw a `ConflictError` when `draft.baseOid` is set and differs, before any commit; verify in `github.test.ts` (match publishes, mismatch throws and commits nothing)
- [x] 3.3 After a successful commit, read the file's `oid` pinned to the returned commit and store it as `baseOid`; verify in `github.test.ts` that the stored oid is the one read at the new commit even if the branch moved afterwards
- [x] 3.4 Handle a draft with no `baseOid` whose file already exists: ask once before overwriting; verify in `github.test.ts` and `app.test.ts` (decline writes nothing, accept publishes and sets `baseOid`)
- [x] 3.5 In `sync()`, catch `ConflictError`: clear `pending`, keep the text, show the message with "Load repo version" (saves the author's text as a new unpublished local draft, opens the repo version) and "Overwrite" (refreshes `baseOid`, re-queues publish); verify in `app.test.ts` that neither choice loses the author's text
- [x] 3.6 Document the conflict behaviour in `docs/composer-setup.md`, replacing the "whichever publishes last wins" paragraph; verify by reading it against the tests in 3.2 and 3.5

## 4. Stage 3: appearance

- [x] 4.1 In `src/pages/write/index.astro`, switch to the blog's look: Atkinson via the existing `@font-face` files, the blog's base and `--accent-dark` colours, a dark variant on `prefers-color-scheme`, and visible `:focus-visible` outlines; verify by viewing `/write/` in light and dark and tabbing through Drafts and the editor, and checking text contrast meets WCAG AA
- [x] 4.2 Style the sign-in block, conflict message, update message, and remote rows to match; verify each state from 1.2 to 1.4 and 3.5 renders correctly at phone width (about 375px) in both schemes

## 5. Stage 3: freshness

- [x] 5.1 In `public/write/sw.js`, make `/write/` network-first with cache fallback (short timeout), `/_astro/` and `/fonts/` cache-first, and bump the cache to `composer-v2`; verify by loading `/write/` online after a rebuild (new asset names appear), then offline (editor and local drafts still open, Atkinson still loads)
- [x] 5.2 In `app.ts`, on `visibilitychange` to visible and online, fetch `/write/` with `no-store`, compare its main script URL to the running one, and show "Update available. Reload" without reloading by itself; verify in `app.test.ts` (different URL shows the message, same URL or offline shows nothing, text in the editor is left untouched)

## 6. Integration check

- [x] 6.1 Run `npm test` and `npm run build`, then walk the flow on a signed-out device and a signed-in device: sign in from Drafts, open a post written elsewhere, edit it on a second device first, then Update from the first device and confirm the conflict message appears and nothing is overwritten
