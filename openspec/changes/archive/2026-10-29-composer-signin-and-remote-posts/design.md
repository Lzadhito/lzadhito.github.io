# Design

## Context

The composer is a single browser module (`src/composer/app.ts`) plus a GitHub client (`github.ts`), a draft store in IndexedDB (`db.ts`), and a service worker (`public/write/sw.js`). See proposal.md for motivation.

Facts that shape the design:
- Sign-in UI lives only inside `settingsView()`. The Drafts view only has `setRemoteStatus`, a one-line message above the list.
- `listRemotePosts` returns file names only. `fetchPost` is called one post at a time on tap.
- The Drafts list hides any remote post whose slug matches a local draft (`known` set in `drafts()`).
- `commit()` already sends `expectedHeadOid`, so GitHub rejects a write if the branch moved after we read it. That is the lever for conflict detection.
- `sw.js` is stale-while-revalidate for `/write/` and `/_astro/`: it serves the cached page first and updates the cache for next time. It never signals the running page.
- The live blog styles live in `src/styles/global.css` (Atkinson, green `--accent-dark: #008a37`, pale base colour, light only). `src/design/tokens.css` is a generated system that no page imports; only `storyCard.ts` mirrors it. `/write` has its own blue/system-font styles inline in `src/pages/write/index.astro`.

## Goals / Non-Goals

**Goals:**
- One place that owns "what does the remote part of Drafts show", covering signed-out, loading, loaded, offline, and error.
- Remote posts that are recognisable and never silently overwritten.
- `/write` that looks like the blog and cannot get stuck on an old version unnoticed.

**Non-Goals:**
- No change to token storage or refresh (owned by `auto-refresh-github-token`).
- No server, Worker, or GitHub App changes.
- No merge or diff view for conflicts. The author picks one side.
- No redesign of the editor layout.

## Decisions

**1. Extract the device flow into one shared function.**
`settingsView()`'s sign-in click handler becomes `startSignIn(host, onSignedIn)` that renders its code/cancel UI into `host` and calls back on success. Settings and the Drafts block both call it.
Alternative: link Drafts to Settings. Rejected: it is the detour that caused the original confusion.

**2. Model the remote slot as one state, rendered in one place.**
A small `remoteState` (`signed-out | loading | ready | offline | error`) drives a single `renderRemoteSlot()`. It replaces `setRemoteStatus` and the two-step list rewrite in `drafts()`. The sign-in block, the error with "Try again", and the post rows all appear in the same position under the local drafts, so signing in visibly fills the gap.
Alternative: keep appending messages. Rejected: each state would need its own placement and cleanup.

**3. List remote posts with metadata in one GraphQL query.**
Extend the tree query to `entries { name type object { ... on Blob { oid text } } }`. One request returns every post's front matter and its blob `oid`. Title and `pubDate` come from the existing `parseFrontmatter`; rows sort by `pubDate` descending, falling back to the file name.
Alternative: one `fetchPost` per file (N requests), or file names only and fetch metadata lazily. Rejected: slower and more requests. Ceiling: the response carries every post body, fine for a personal blog of tens of posts. If it grows past roughly 100 posts, list names first and fetch metadata in pages.

**4. Conflict detection with the blob `oid`, using the existing `expectedHeadOid`.**
- `Draft` gains `baseOid?: string`, the blob oid of the file when it was loaded or last published. No IndexedDB migration is needed because the store is keyed by `id` only.
- `head()` already runs one query for the branch head and the file; it also returns the file's `oid`. In `publish()`, if `draft.baseOid` is set and differs from the file's current `oid`, throw a `ConflictError` before committing. Because the head oid and the file oid come from the same query and the commit carries that head oid, a write by anyone in between is rejected by GitHub. The check and the write cannot be separated by a race.
- After a successful commit, read the file's oid pinned to the new commit (`<commitOid>:<path>`) and store it as `baseOid`. Pinning to our own commit means another device's later commit cannot be mistaken for ours.
- A draft with no `baseOid` whose file exists in the repo gets one confirmation before overwrite, covering drafts saved before this change.
Alternative: compare `updatedDate` or content text. Rejected: dates are rewritten on every composer save, and comparing text needs a download. The blob `oid` is exact and free in the query we already make.
Alternative: always overwrite, as today. Rejected: it is the data-loss path this change exists to close.

**5. Conflict resolution is a choice, not a merge.**
On `ConflictError`, `sync()` clears `pending`, keeps the author's text, and the editor shows an inline strip with two actions (a toast carries only one; a draft with no remembered version uses the same strip instead of a separate confirm). "Load repo version" saves the author's text as a new local draft (no slug, unpublished) and opens the repo version. "Overwrite" refreshes `baseOid` from the repo and re-queues the publish. Nothing is lost either way.

**6. A local copy no longer hides the repo row.**
In the list, one row per slug. When a local draft has a `slug` and a `baseOid` that differs from the repo's entry oid, that row shows "newer version in repo". The row opens the local copy, so nothing is replaced silently; a stale copy is caught at Update time (decision 4).
Alternative: hide as today. Rejected: that is how a stale copy outranks a newer edit.

**7. Restyle by reusing the blog's existing values, not by importing a new system.**
The inline styles in `src/pages/write/index.astro` switch to Atkinson (same `@font-face` files in `public/fonts/`), the blog's base and `--accent-dark` colours, and the blog's radius feel, keeping a dark variant on `prefers-color-scheme` because the composer is used at night. Add visible `:focus-visible` outlines.
Alternative: import `tokens.css` (Fira Mono / Hanken Grotesk). Rejected: no live page uses it, so it would make `/write` match a design the blog does not have.

**8. Service worker: network-first for the page, cache-first for hashed assets, and a foreground version check.**
- `/write/` HTML: try the network first, fall back to cache offline. Online loads then always get the newest page and hashed asset names.
- `/_astro/*` and `/fonts/*`: cache-first (hashed or immutable). Add `/fonts/` so Atkinson works offline.
- Bump the cache name to `composer-v2` so old entries are dropped on activate.
- A long-lived installed app can sit in the background for days. On `visibilitychange` to visible, the page fetches `/write/` with `no-store` and compares the main script URL with the one it is running. If different, it shows "Update available. Reload". It never reloads itself.
Alternative: keep stale-while-revalidate and use `controllerchange`. Rejected: replacing the cached asset files does not change `sw.js`, so no worker event fires; the page would still never know.

## Risks / Trade-offs

- [Listing query returns every post body] → Fine at this size; documented ceiling above.
- [Locked posts return ciphertext in the listing] → Only front matter is read for rows; the body is ignored until opened, and the password flow is unchanged.
- [`baseOid` missing on old drafts] → Handled by the one-time confirmation (decision 4).
- [Network-first page is slower on a bad connection] → Fall back to cache after a short timeout so the editor still opens quickly.
- [Staged delivery leaves the UI mixed for a while] → Stage 1 and 2 keep the current colours; stage 3 restyles everything at once, so no screen is half-converted.
- [Anyone who can push can still race a publish within one request] → Closed by `expectedHeadOid`; the loser sees a normal conflict message and retries.

## Migration Plan

1. Stage 1 ships on its own: no data change.
2. Stage 2 adds `baseOid` to new loads and publishes. Existing drafts keep working without it.
3. Stage 3 ships the new `sw.js`. Installed copies pick it up on their next online open; the `composer-v2` cache name clears old entries. Rollback is reverting `sw.js` and the styles; drafts and settings are untouched.
