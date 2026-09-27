# Personal Website PRD — Blog & Portfolio

Sep 26, 2026 · @Dito

## Overview

Dito's personal website: a blog for friends and Instagram followers, and a portfolio for people who might hire him. Phase 1 ships the blog; the portfolio follows.

The core product is not the website itself but the loop from **a thought on the road → a published post → an Instagram story**. If that loop is slow, posting stops.

| Item | Decision |
| --- | --- |
| Owner / author | Dito (single author) |
| Language | English |
| Domain | lzadhito.github.io (GitHub Pages) |
| Design reference | [iamrob.in](https://iamrob.in/) |
| Current focus | Blog |

This PRD is tech-agnostic on purpose. It will be handed to a separate session that decides the tech stack. Section "Questions for the tech-stack session" lists what that session must resolve.

## Problem & goals

Dito's thoughts mostly come while commuting, but there is no low-friction place to capture and publish them. Instagram alone is a poor home for longer thinking, and there is no owned space that also showcases his work to hirers.

### Goals

1. Let Dito go from a thought to a published post in under 5 minutes, entirely on his phone.
2. Make every post easy and good-looking to share as an Instagram story.
3. Give the site a calm, personal feel: "my own space," not a feed.
4. Later, give hirers a clear view of his work and a way to contact him.

### Non-goals (for now)

- Multiple authors, public sign-up, or reader accounts
- Comments or likes on posts (a guestbook may come in Phase 3)
- Newsletter or email subscriptions
- Monetization, ads, or paid content
- Multi-language content
- Shelf pages (books, series, movies), digital garden, bookmarks

## Users & personas

| Persona | Context | Needs | Success looks like |
| --- | --- | --- | --- |
| Author (Dito) | On the phone, often commuting, sometimes with a weak signal; uses the keyboard's speech-to-text | Instant capture, no lost text, a safe draft state, one-tap publish and share | Posts regularly without friction |
| Reader from Instagram | Taps a story link sticker on a phone; short attention span | Fast load, readable on mobile, clear who wrote it, easy to browse more | Reads the post, maybe a second one |
| Hiring visitor (Phase 2) | Desktop or phone, evaluating Dito for a role or freelance project | What he does, proof of work, how to contact him | Reaches out |

## Core user journeys

### J1 — Capture a thought on the road

1. Dito taps the site's writing icon on his phone home screen.
2. The composer opens straight to an empty text area with the cursor ready.
3. He dictates with the keyboard mic or types with his thumbs.
4. Text is saved continuously, even with no signal.
5. He closes the app; the draft is waiting next time.

### J2 — Edit and publish

1. Dito opens his drafts list and picks one.
2. He cleans up speech-to-text mistakes, optionally adds a title, and picks Note or Essay.
3. He previews how it will look, then taps Publish.
4. The post goes live on the public site within a few minutes.

### J3 — Share to Instagram story

1. On the published post (or right after publishing), Dito taps "Share to story."
2. A story-sized image of the post is generated and the phone's share sheet opens.
3. At the same moment, the post link is copied to the clipboard.
4. He picks Instagram → Story, then pastes the link into the Link sticker.

### J4 — A follower reads

1. A follower taps the Link sticker on Dito's story.
2. The post opens fast and reads well on a phone.
3. They see who Dito is and can browse other posts.

## Scope & phasing

Phase 1 is the only committed scope. Phases 2 and 3 are listed so the stack decision doesn't block them later.

| Phase | Theme | In scope | Exit criteria |
| --- | --- | --- | --- |
| 1 — Blog MVP | Capture → publish → share | Home, blog list, post page, About blurb, private mobile composer, drafts, publish, story image, social preview image, share button, RSS | Dito publishes and shares 5 real posts from his phone |
| 2 — Portfolio | Hireability | Work page, 2–3 project case studies, contact section | Portfolio linked from his Instagram bio or CV |
| 3 — Delight | Engagement and polish | Guestbook ("postcards"), speech-to-text tidy-up assist, quote cards from any paragraph, basic tags | Pick based on Phase 1 metrics |

## Functional requirements

Priority: **P0** = must ship in Phase 1, **P1** = Phase 1 if time allows, **P2** = later phase.

### A. Public site

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| A1 | Home page with a short intro, latest posts, and links (Instagram, GitHub, email) | P0 | Intro and 5 latest posts visible without scrolling far on a phone |
| A2 | Blog list page, newest first, showing date, type, and title or first line | P0 | Notes without titles still read well in the list |
| A3 | Post page for Notes and Essays, each with its own layout | P0 | Readable on a 375px-wide screen with no horizontal scroll |
| A4 | "More posts" links at the bottom of each post | P0 | At least 3 other posts linked |
| A5 | RSS feed for posts | P1 | Valid feed including full or excerpt content |
| A6 | Light and dark mode following the device | P1 | Both themes meet contrast requirements |
| A7 | Stable, readable post URLs | P0 | Editing a post's title never breaks an already-shared link |

### B. Writing (private composer)

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| B1 | Only Dito can access the composer | P0 | Visitors can't reach or use it; no public sign-up |
| B2 | Installable to the phone home screen, opening straight into a new draft | P0 | From the home screen icon to typing in under 3 seconds |
| B3 | Plain, large text area that works with the phone keyboard's speech-to-text | P0 | Dictation works in the text area on Android and iOS |
| B4 | Continuous autosave, including offline | P0 | Killing the app or losing signal mid-sentence loses zero text; drafts sync when back online |
| B5 | Drafts list with a date and first line | P0 | Draft can be reopened, edited, or deleted |
| B6 | Optional title and post type (Note or Essay) | P0 | Type can be changed before or after publishing |
| B7 | Basic formatting: paragraphs, bold/italic, links, quotes, lists | P0 | No formatting toolbar needed to write a plain Note |
| B8 | Preview before publishing | P1 | Preview matches the public page layout |
| B9 | Add a single image to a post | P2 | Image is resized for mobile |
| B10 | Speech-to-text tidy-up assist (fix punctuation and paragraph breaks, keep wording) | P2 | Opt-in; original text can always be restored |

### C. Publishing

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| C1 | Posts start as drafts; publishing is an explicit action | P0 | Nothing goes public without a Publish tap |
| C2 | Published post goes live on the public site | P0 | Live within 5 minutes of tapping Publish |
| C3 | Edit a published post | P0 | Changes live within 5 minutes; URL unchanged |
| C4 | Unpublish or delete a post | P0 | Post removed from list, page, and RSS |
| C5 | Publish date set automatically, editable | P1 | — |

### D. Instagram sharing

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| D1 | Auto-generated story image (1080 × 1920 px) for every published post | P0 | Shows Note text or Essay title + excerpt, author name, and site domain, in the site's visual style |
| D2 | Long Notes are truncated gracefully on the story image | P0 | Text never overflows; ends with an ellipsis and a "read more" cue |
| D3 | "Share to story" button opens the phone's native share sheet with the image | P0 | Instagram appears as a target on Android and iOS |
| D4 | Post link copied to clipboard during the share action | P0 | Dito can paste straight into the Link sticker |
| D5 | Fallback: download the story image if native sharing fails | P0 | Image saves to the camera roll |
| D6 | Social preview image (1200 × 630 px) and meta tags for link previews | P0 | Preview shows correctly when the link is pasted in WhatsApp, Instagram DMs, and X |
| D7 | Shared links carry a source marker (e.g. `?ref=ig`) | P1 | Visits from stories are countable |
| D8 | Quote card: turn any selected paragraph into its own story image | P2 | — |

### E. Portfolio (Phase 2)

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| E1 | Work page: role, skills, experience summary | P2 | Readable in under 1 minute |
| E2 | Project case studies: problem, role, what he built, outcome, images, links | P2 | 2–3 case studies at launch |
| E3 | Contact section (email and social links) | P2 | Reachable in one tap from any page |

## Content model

One post object with two types. Most output will be short Notes captured on the road; Essays are longer and edited at a desk.

| Type | Typical length | Title | Public layout | Story image shows |
| --- | --- | --- | --- | --- |
| Note | 3–10 sentences | Optional | Text-first, like a short journal entry | The note text itself |
| Essay | 500+ words | Required | Article layout with title and reading time | Title + short excerpt |

### Post fields

| Field | Required | Notes |
| --- | --- | --- |
| Type | Yes | Note or Essay |
| Title | Essay only | Notes fall back to their first line where a label is needed |
| Body | Yes | Rich text: paragraphs, bold/italic, links, quotes, lists |
| Slug / URL | Yes | Generated once, stable after publishing |
| Status | Yes | Draft or Published |
| Created / updated / published dates | Yes | Published date editable |
| Excerpt | No | Auto-generated if empty; used on the story image and previews |
| Tags | No (P2) | — |

### Post states

Draft → Published → (Unpublished back to Draft, or Deleted). Only Published posts appear on the public site, RSS, and share images.

## Design direction

The site should feel like a calm personal space, modeled on [iamrob.in](https://iamrob.in/): warm off-white background, typography-led, minimal navigation, generous whitespace.

### Borrow

- Warm, paper-like palette with a single accent color
- A one-line intro framing the site as a personal space outside social media
- Dated post list on the home page with an "All posts" link
- Minimal top navigation and a simple footer with contact links
- RSS feed
- Guestbook idea ("postcards") for Phase 3

### Skip for now

- Garden, Shelf (books, series, movies), Bookmarks, Changelog pages
- Photo-heavy project cards on the home page (revisit in Phase 2)

### Design requirements

- Mobile-first: most readers arrive from Instagram on a phone
- Story image and social preview image share the site's type and palette, so a shared post is recognizable as Dito's
- The composer is visually quiet: text area first, controls tucked away

## Non-functional requirements & constraints

The biggest constraint is hosting: the public site lives on GitHub Pages, which serves static files only. Publishing from a phone and generating images must work within that.

| Area | Requirement |
| --- | --- |
| Hosting | Public site served from lzadhito.github.io via GitHub Pages; static files only, no server code on that host |
| Publish latency | Post live within 5 minutes of tapping Publish or Edit |
| Performance | Post page loads in under 2 seconds on a mid-range Android phone over 4G |
| Offline | Composer usable with no connection; drafts sync automatically when back online |
| Security | Composer and any write actions restricted to Dito; no secrets exposed in public files |
| Data ownership | All content exportable in a portable format (e.g. Markdown) |
| SEO & previews | Title, description, and preview image tags on every page; sitemap |
| Accessibility | WCAG 2.1 AA contrast, semantic headings, alt text for images |
| Browsers | Latest Chrome on Android and Safari on iOS for the composer and sharing; evergreen browsers for readers |
| Cost | Free or near-free to run |
| Maintenance | Maintainable by one person in spare time |

## Success metrics

| Metric | Target | How measured |
| --- | --- | --- |
| Thought → published | Under 5 minutes on phone | Time from draft creation to publish |
| Posting cadence | 2+ posts per week, sustained for 4 weeks | Published post count |
| Share rate | 70%+ of posts shared to an IG story | Share button uses vs posts |
| Story → site visits | Tracked from launch; baseline set in week 4 | Visits with the IG source marker |
| Lost drafts | Zero | Dito's own reports |

## Questions for the tech-stack session

The stack session should answer these explicitly, each against the requirement IDs above.

1. With static-only hosting, where do the composer, draft storage, and authentication live, and how does a Publish tap update the public site (C2, C3)?
2. How is offline autosave achieved, and how are conflicts handled when a draft syncs (B4)?
3. How are the story image and social preview image generated for each post, given no server on the public host (D1, D6)?
4. How does the "Share to story" flow send an image file to the native share sheet on both Android and iOS, and what is the fallback (D3, D5)?
5. How is the composer restricted to Dito only (B1)?
6. How are visits from Instagram counted without heavy tracking (D7)?
7. Does the chosen approach stay free or near-free and maintainable by one person?

## Risks & open questions

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Static hosting makes mobile publishing slow or complex | Breaks the core loop | Treat as the first question for the stack session; a custom domain or different host stays an option |
| Speech-to-text text is messy, so posts feel unpolished | Dito hesitates to publish | Drafts by default (C1); tidy-up assist in Phase 3 (B10) |
| Instagram doesn't allow links to be pre-filled into stories from a website | One manual paste step remains | Clipboard copy during share (D4) |
| Scope creep from copying the reference site | Launch slips | Phase 1 scope table is the contract |
| A draft is lost mid-commute | Trust in the tool breaks | Offline autosave is P0 (B4) |

- [ ] Confirm the GitHub username so the domain is exactly lzadhito.github.io
- [ ] Decide whether a custom domain (e.g. lzadhito.com) is wanted later
- [ ] Write the About/intro blurb for the home page
