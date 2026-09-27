# Personal Website — Tech Stack

Sep 26, 2026 · @Dito

## Overview

The site is an Astro static build on GitHub Pages, written from an offline-first PWA composer that commits Markdown to a private GitHub repo through the GitHub API. Every piece runs on free GitHub features plus GoatCounter, so the total cost is $0: no server, no database, no domain, no subscription.

This doc answers the stack questions in the Personal Website PRD (Blog & Portfolio). Requirement IDs (A1, B4, D3…) refer to that PRD.

- Hard constraint: $0 running cost, maintainable by one person.
- Core loop to protect: thought on the road → published post → Instagram story.
- Design reference: iamrob.in, which is itself built with Astro.

## Architecture

The phone never writes to lzadhito.github.io. It commits Markdown through `api.github.com`, and GitHub Actions rebuilds and redeploys the static site.

&#91;embedded content: publish and share flow · 7 parts\]

"Static" only limits what github.io can do: serve files. Once the composer's JavaScript is downloaded, it runs on the phone and can call any server, including GitHub's API, which accepts repo writes from a valid token. Every publish is therefore a commit that mutates the private repo; the public site is only ever the latest build.

## Stack at a glance

Every layer is free; the only metered resource is GitHub Actions minutes, and expected use is about 80 of the 2,000 free minutes per month.

| Layer | Choice | Cost |
| --- | --- | --- |
| Public site | Astro, static output, Markdown content collections | $0 |
| Hosting | GitHub Pages at lzadhito.github.io (public repo holds build output only) | $0 |
| Source of truth | Private GitHub repo `site` with Markdown files | $0 (GitHub Free) |
| Build and deploy | GitHub Actions in the private repo, pushing `dist/` to the public repo | $0 (2,000 min/month on private repos) |
| Composer | PWA at `/write/` in the same Astro project: Preact island, plain `<textarea>`, Dexie (IndexedDB), `@vite-pwa/astro` | $0 |
| Writes to repo | GitHub GraphQL API (`createCommitOnBranch`) called from the phone | $0 |
| Auth | Fine-grained GitHub token stored only on Dito's devices | $0 |
| Story and OG images | Satori + `@resvg/resvg-js` at build time | $0 |
| Fonts | Self-hosted via Fontsource (TTF copy kept for Satori) | $0 |
| Analytics | GoatCounter, cookieless, free for personal sites | $0 |
| RSS and sitemap | `@astrojs/rss`, `@astrojs/sitemap` | $0 |

## Where data lives and content model

The private repo is the only source of truth; the phone holds a working copy and the public repo holds disposable build output. There is no database.

| Place | What's there | Role |
| --- | --- | --- |
| Phone (IndexedDB in the composer) | Drafts being written, plus an outbox of unsynced changes | Working copy; enables offline writing |
| Private repo `site` | Every post as Markdown in `content/drafts/` and `content/posts/` | Source of truth, backup, history, export (B4, data ownership) |
| Public repo `lzadhito.github.io` | Built HTML, CSS, PNG images only | Output; force-replaced on every deploy, never edited by hand |

Repo layout:

```
site/ (private)
├─ content/drafts/<id>.md        # autosync target, never triggers a build
├─ content/posts/<id>.md         # published posts
├─ content/pages/                # home intro, About, later portfolio case studies
├─ src/pages/blog/[slug].astro   # post page
├─ src/pages/og/[slug].png.ts    # 1200×630 preview image
├─ src/pages/story/[slug].png.ts # 1080×1920 story image
├─ src/pages/write/              # composer PWA
└─ .github/workflows/deploy.yml
```

Post file (filename = the ULID, so it never changes):

```
---
id: 01J8ZK3F9Q
type: note            # note | essay
title:                # required for essays only
slug: 2026-09-26-traffic-makes-me-think   # set once at first publish
created: 2026-09-26T07:12:00+07:00
updated: 2026-09-26T19:35:00+07:00
published: 2026-09-26T19:40:00+07:00      # editable (C5)
excerpt:              # auto-generated when empty
---
Body in Markdown.
```

Status is the folder: `drafts/` = Draft, `posts/` = Published. Only `posts/` reaches the site, RSS, and share images.

## Capture loop (B2–B7)

Capture is icon → one tap → talk, and text is saved to the phone on every keystroke, with or without signal.

- **Opening (B2).** Manifest `start_url: /write/new`, `display: standalone`, plus long-press shortcuts "New note" and "Drafts". The service worker (scope `/write/` only) precaches the composer so it opens instantly offline.
- **Keyboard.** The screen is one full-height `<textarea>`. iOS blocks programmatic focus, so one tap anywhere opens the keyboard; Android often opens it on load.
- **Dictation-safe input (B3).** A plain textarea, not a contenteditable editor (Tiptap, Lexical, ProseMirror), which can duplicate or drop words during Gboard and iOS dictation.
- **Formatting (B7).** Markdown, with a tucked-away bar that inserts `**`, `_`, `>`, `-` and links. A plain Note needs no toolbar.
- **Autosave (B4).** Every input writes to IndexedDB (debounce \~250 ms), with an extra flush on `visibilitychange` and `pagehide`. Call `navigator.storage.persist()`. Install to the home screen: iOS may clear storage for sites unused for 7 days, but home-screen web apps are exempt.
- **Draft IDs.** A ULID generated on the phone; no collisions offline, and it is the filename forever.
- **Sync.** Changes queue in an outbox table and drain on app open, the `online` event, visibility change, and every \~30 s of idle. Do not rely on the Background Sync API (not on iOS).
- **Conflicts (B4).** Each draft stores the git blob `sha` it last synced and sends it with each write. If GitHub rejects the write because the file changed elsewhere: identical text → just adopt the new sha; different text → keep the local version and save the remote as a new "(conflict copy)" draft. Nothing is overwritten silently.
- **Drafts list (B5, B6).** Date + first line, reopen / edit / delete, optional title, Note or Essay toggle.
- **Preview (B8).** Rendered with the same Markdown pipeline and CSS file as the public post page.

Safety note: dictating in a phone mount is the intended road use. Editing and publishing happen parked or at a desk.

## Publish loop (C1–C5, A7)

Every publish, edit, unpublish or delete is one atomic commit to the private repo, and a post is live about 1–3 minutes later.

| Action | Commit made by the composer |
| --- | --- |
| Publish | Add `content/posts/<id>.md` (with slug and published date), delete `content/drafts/<id>.md` |
| Edit published | Update `content/posts/<id>.md`; slug untouched |
| Unpublish | Move the file back from `posts/` to `drafts/` |
| Delete | Remove the file |

- **API.** GitHub GraphQL `createCommitOnBranch` with `expectedHeadOid`, so add + delete land in one commit and a stale head is rejected, not overwritten.
- **Slugs (A7).** Generated once at first publish from the date + first words of the title or note (e.g. `2026-09-26-traffic-makes-me-think`), stored in frontmatter, never regenerated. URL: `/blog/<slug>`.
- **Offline publish.** Tapping Publish with no signal queues the commit in the outbox; it goes out when signal returns.
- **Live check (C2, C3).** The build writes `/version.json` with the commit SHA. The composer polls it and shows "Live" when it matches, then enables Share.

Workflow `.github/workflows/deploy.yml` (in the private repo):

```yaml
name: deploy
on:
  push:
    branches: [main]
    paths-ignore: ['content/drafts/**']   # draft autosync never builds
  workflow_dispatch:
concurrency: { group: deploy, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build   # writes dist/version.json with $GITHUB_SHA
      - uses: peaceiris/actions-gh-pages@v4
        with:
          deploy_key: ${{ secrets.PAGES_DEPLOY_KEY }}
          external_repository: lzadhito/lzadhito.github.io
          publish_branch: main
          publish_dir: ./dist
          force_orphan: true   # public repo keeps no history
```

`force_orphan` means drafts, unpublished posts and deleted posts never appear in any public git history.

## Story and preview images (D1, D2, D6)

Both images are generated as static PNGs during the build, so no server is needed on the public host.

| Image | Size | Route | Shows |
| --- | --- | --- | --- |
| Story | 1080 × 1920 px | `/story/<slug>.png` | Note text, or Essay title + excerpt; author name; lzadhito.github.io |
| Social preview | 1200 × 630 px | `/og/<slug>.png` | Title or first line, author, domain |

- **Rendering.** Astro static endpoints use Satori (JSX-style template → SVG) and `@resvg/resvg-js` (SVG → PNG), with the same font and color tokens as the site.
- **Fonts.** Satori needs TTF or OTF, not woff2; keep a TTF copy of the site fonts in the repo.
- **Truncation (D2).** A fit loop steps the font size down to a floor. If the text still overflows, cut at a word boundary, add "…" and a "Read the rest at lzadhito.github.io" line.
- **Meta tags (D6).** Every page sets `og:title`, `og:description`, `og:image` (1200 × 630) and `twitter:card=summary_large_image`.

## Share to story (D3, D4, D5, D7)

One tap copies the tagged link and opens the native share sheet with the story PNG; Instagram → Story, then paste into the Link sticker.

```js
// On screen load: prefetch so the tap handler has nothing to await
const blob = await (await fetch(`/story/${slug}.png`)).blob();
const file = new File([blob], `${slug}.png`, { type: 'image/png' });

shareBtn.onclick = () => {
  navigator.clipboard.writeText(`${postUrl}?ref=ig`);          // D4 + D7, not awaited
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] })                         // files only
      .catch(e => { if (e.name !== 'AbortError') fallback(); });
  } else fallback();                                           // D5
};
```

- **Prefetch.** iOS Safari requires `share()` inside the tap; fetching during the tap can use up that permission and the sheet silently fails.
- **Files only.** The most reliable payload for Instagram's Stories target; the link travels via the clipboard.
- **Fallback (D5).** Android: `<a download>`. iOS: open the PNG full-screen with a "long-press → Save to Photos" hint (the download attribute saves to Files, not Photos).
- **Where the button lives.** In the composer's published list and right after "Live" appears. A public share button on post pages is optional.

## Auth and security (B1)

Only a device holding Dito's fine-grained GitHub token can write; the composer code is public but useless without it.

- **Token.** Fine-grained personal access token, repository access = `site` only, permissions = Contents: read and write (Metadata: read is automatic). Pasted once into the composer on each device, stored in IndexedDB. Never in the repo or public files.
- **Why not "Login with GitHub".** OAuth needs a server to hold the client secret, which static hosting cannot provide.
- **Composer URL.** `/write/` is reachable but shows only a token prompt; `noindex`, `Disallow: /write/` in robots.txt, never linked.
- **XSS hardening.** The token shares an origin with the public pages, so set a strict Content-Security-Policy meta tag (no inline scripts, `connect-src` limited to self, `api.github.com`, GoatCounter).
- **Expiry.** Set a long expiry and a calendar reminder to rotate. On a 401 the composer shows "token expired"; drafts keep saving locally.
- **Lost phone.** Revoke the token on GitHub. Worst case is unwanted commits, which git can revert.

## Analytics (D7)

GoatCounter counts story visits: shared links carry `?ref=ig`, which GoatCounter records as the referrer. It is cookieless, one script tag, and free for personal sites. Exclude `/write/` from tracking.

## Answers to the PRD's stack questions

All seven PRD questions are answered by this stack without adding a server or paid service.

| # | Question | Answer | IDs |
| --- | --- | --- | --- |
| 1 | Where do composer, drafts and auth live; how does Publish update the site? | Composer is a PWA on the same Pages site; drafts in IndexedDB, synced to the private repo; Publish = commit via GitHub API → Actions build → deploy to Pages | C2, C3 |
| 2 | Offline autosave and conflicts? | IndexedDB on every keystroke + outbox queue; sha-checked writes, conflict copy kept | B4 |
| 3 | Story and preview images without a server? | Satori + resvg at build time, served as static PNGs | D1, D6 |
| 4 | Image to the native share sheet on both OSes; fallback? | Web Share API with a prefetched `File`; download (Android) or long-press save (iOS) | D3, D5 |
| 5 | Composer restricted to Dito? | Fine-grained token on his devices only; `/write/` hidden and useless without it | B1 |
| 6 | Instagram visits without heavy tracking? | GoatCounter + `?ref=ig` | D7 |
| 7 | Free and maintainable by one person? | Yes: GitHub Free + GoatCounter, one repo, one workflow | — |

## Alternatives considered

A custom composer won because no ready-made CMS gives instant-open, offline-first capture plus story sharing at $0.

| Option | Why not |
| --- | --- |
| Decap CMS / Sveltia CMS | Form-style admin, not an instant offline composer; Decap needs an OAuth server. Sveltia stays a possible desk fallback. |
| Supabase / Firebase | Free tiers, but adds a vendor and limits (idle Supabase free projects pause); content stops being plain Markdown in git. |
| Notion / Obsidian as CMS | Extra app in the loop; sync needs an API server or paid Obsidian Sync. |
| Vercel / Netlify | Free and would allow serverless images, but the PRD fixes GitHub Pages and build-time images remove the need. |
| Public source repo with drafts in a second private repo | Simpler deploy, but unpublished and deleted posts would stay in public git history. |
| Rich-text editor (Tiptap, Lexical) | Dictation bugs with mobile keyboards; Markdown textarea is safer. |

## Limits and risks

None of these block Phase 1; the iOS items need testing on a real iPhone early.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| GitHub Pages sends `max-age=600` | A returning reader may see an edited post's old version for up to 10 min | Acceptable; new posts are unaffected |
| Actions minutes on private repos | Builds stop if the free allowance runs out | Expected \~80 of 2,000 min/month; confirm once on the GitHub billing page |
| Token expiry or leak | Publishing fails, or unwanted commits | Rotation reminder, clear expired state, revoke + git revert |
| iOS PWA quirks (share, storage, keyboard focus) | Share or autosave behaves differently on iPhone | Test on a real iPhone in milestone 2 and 4 |
| Instagram cannot pre-fill story links from the web | One manual paste remains | Clipboard copy during share (D4) |
| Two devices editing the same draft | Divergent text | sha check + conflict copy |

## One-time setup checklist

About an hour of setup, all in the GitHub and GoatCounter web UIs.

- [ ] Confirm the GitHub username is exactly `lzadhito`
- [ ] Create private repo `site` (Astro project, content folders, workflow)
- [ ] Create public repo `lzadhito.github.io`; Settings → Pages → deploy from branch `main`, root
- [ ] Generate an SSH key pair; public key → deploy key with write access on `lzadhito.github.io`; private key → Actions secret `PAGES_DEPLOY_KEY` in `site`
- [ ] Add `.nojekyll` to the build output so Pages serves `_astro/` files as-is
- [ ] Create a fine-grained token: repo `site` only, Contents read and write; paste into the composer on the phone
- [ ] Install the composer to the phone home screen (Chrome: Install app; Safari: Share → Add to Home Screen)
- [ ] Create a GoatCounter site and add its script tag to the public layout
- [ ] Run the workflow once manually and check lzadhito.github.io loads

## Phase 1 build order

Capture works from milestone 2, so Dito can start collecting drafts before publishing exists.

| # | Milestone | Covers | Done when |
| --- | --- | --- | --- |
| 1 | Astro site + paper palette: home, blog list, post page, RSS, sitemap; private → public deploy | A1–A7 | A hand-written Markdown post is live on lzadhito.github.io |
| 2 | Composer v0: textarea, IndexedDB autosave, installable PWA, drafts list (no sync) | B2–B7 | Killing the app mid-sentence loses nothing on Android and iPhone |
| 3 | GitHub sync, publish / edit / unpublish / delete, `version.json` live check | B4, C1–C5 | A draft written offline publishes after signal returns, live under 5 min |
| 4 | Satori story + OG images, share button, fallback | D1–D6 | Story shared from both phones; previews correct in WhatsApp and X |
| 5 | GoatCounter, `?ref=ig`, polish | D7 | Five real posts published and shared from the phone (Phase 1 exit) |
