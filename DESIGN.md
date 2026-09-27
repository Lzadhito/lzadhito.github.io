---
version: alpha
name: lzadhito — a commute notebook
description: Design system for Dito's personal site (lzadhito.github.io), its private composer, and its share images.
colors:
  primary: "#151614"
  secondary: "#4A5565"
  tertiary: "#2F6B00"
  tertiary-pressed: "#1F4D00"
  on-tertiary: "#F8FDEF"
  neutral: "#F8FDEF"
  surface: "#E1E6D9"
  rule: "#CBCFC3"
  primary-night: "#EEF3E4"
  secondary-night: "#A4AB9C"
  tertiary-night: "#93D14F"
  on-tertiary-night: "#151614"
  neutral-night: "#151614"
  surface-night: "#1E201B"
  rule-night: "#33362F"
typography:
  site-name:
    fontFamily: Fira Mono
    fontSize: 1rem
    fontWeight: 700
    lineHeight: 1.3
  ui:
    fontFamily: Fira Mono
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.3
  meta:
    fontFamily: Fira Mono
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.01em
  intro:
    fontFamily: Hanken Grotesk
    fontSize: 1.375rem
    fontWeight: 400
    lineHeight: 1.45
  list-item:
    fontFamily: Hanken Grotesk
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.45
  list-item-essay:
    fontFamily: Hanken Grotesk
    fontSize: 1.125rem
    fontWeight: 700
    lineHeight: 1.45
  display-note:
    fontFamily: Hanken Grotesk
    fontSize: 1.625rem
    fontWeight: 400
    lineHeight: 1.42
    letterSpacing: -0.005em
  display-essay:
    fontFamily: Hanken Grotesk
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.015em
  body:
    fontFamily: Hanken Grotesk
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.65
  composer:
    fontFamily: Hanken Grotesk
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.55
  story-text:
    fontFamily: Hanken Grotesk
    fontSize: 72px
    fontWeight: 400
    lineHeight: 1.3
  story-title:
    fontFamily: Hanken Grotesk
    fontSize: 88px
    fontWeight: 700
    lineHeight: 1.12
  story-meta:
    fontFamily: Fira Mono
    fontSize: 34px
    fontWeight: 400
    lineHeight: 1.3
  og-title:
    fontFamily: Hanken Grotesk
    fontSize: 60px
    fontWeight: 400
    lineHeight: 1.25
  og-meta:
    fontFamily: Fira Mono
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.3
rounded:
  none: 0px
  sm: 4px
  md: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  gutter: 20px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px
  5xl: 96px
components:
  page:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    width: 40rem
    padding: 20px
  page-night:
    backgroundColor: "{colors.neutral-night}"
    textColor: "{colors.primary-night}"
  site-name:
    textColor: "{colors.primary}"
    typography: "{typography.site-name}"
  nav-link:
    textColor: "{colors.secondary}"
    typography: "{typography.ui}"
    height: 44px
  nav-link-current:
    textColor: "{colors.primary}"
    typography: "{typography.ui}"
  link:
    textColor: "{colors.tertiary}"
  link-night:
    textColor: "{colors.tertiary-night}"
  post-list-item:
    textColor: "{colors.primary}"
    typography: "{typography.list-item}"
    padding: 12px 0
  post-list-item-essay:
    textColor: "{colors.primary}"
    typography: "{typography.list-item-essay}"
  post-meta:
    textColor: "{colors.secondary}"
    typography: "{typography.meta}"
  post-meta-night:
    textColor: "{colors.secondary-night}"
    typography: "{typography.meta}"
  note-body:
    textColor: "{colors.primary}"
    typography: "{typography.display-note}"
    width: 32em
  essay-title:
    textColor: "{colors.primary}"
    typography: "{typography.display-essay}"
  essay-body:
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    width: 34em
  blockquote:
    textColor: "{colors.secondary}"
    typography: "{typography.body}"
    padding: 0 0 0 16px
  divider:
    backgroundColor: "{colors.rule}"
    height: 1px
  divider-night:
    backgroundColor: "{colors.rule-night}"
    height: 1px
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.ui}"
    rounded: "{rounded.sm}"
    padding: 12px 20px
    height: 48px
  button-primary-pressed:
    backgroundColor: "{colors.tertiary-pressed}"
    textColor: "{colors.on-tertiary}"
  button-primary-night:
    backgroundColor: "{colors.tertiary-night}"
    textColor: "{colors.on-tertiary-night}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.ui}"
    rounded: "{rounded.sm}"
    padding: 12px 16px
    height: 48px
  button-secondary-night:
    backgroundColor: "{colors.surface-night}"
    textColor: "{colors.primary-night}"
  composer-textarea:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.composer}"
    padding: 20px
  composer-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.ui}"
    height: 56px
    padding: 4px 12px
  composer-bar-night:
    backgroundColor: "{colors.surface-night}"
    textColor: "{colors.secondary-night}"
  status-live:
    textColor: "{colors.tertiary}"
    typography: "{typography.meta}"
  draft-row:
    textColor: "{colors.primary}"
    typography: "{typography.list-item}"
    padding: 16px 20px
  story-image:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.story-text}"
    width: 1080px
    height: 1920px
    padding: 360px 96px 480px
  og-image:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.og-title}"
    width: 1200px
    height: 630px
    padding: 72px 80px
---

## Overview

The site is a commute notebook: short thoughts Dito dictated on the way to work, kept on pale, leaf-tinted pages in his own space instead of a feed. Readers mostly arrive from an Instagram story on a phone, read one Note, and maybe a second. Hirers arrive later (Phase 2) and need the same calm page to show his work.

**The one memorable thing is the Note itself.** A Note is set large, like a thought written across a whole notebook page, with the day and time it was captured above it. Everything else (navigation, lists, footer, the composer) stays small, quiet, and disciplined so the Note can be loud.

Principles, in priority order:

1. **Text is the interface.** No cards, no hero images, no decoration. Type size, weight, and whitespace carry all hierarchy.
2. **Paper and leaf.** Pale green-tinted paper, near-black ink, and one green accent that only ever means "you can tap this" or "this is live." The palette is the one already on lzadhito.github.io.
3. **Phone first, thumb first.** Every layout is designed at 375px wide, then allowed to breathe on desktop. Tap targets are at least 44px.
4. **A shared post is recognisably Dito's.** The story image and link preview use the same paper, ink, fonts, and layout rules as the site, so the site and the share images are one design.

### Reference snapshot: iamrob.in (captured 26 Sep 2026)

iamrob.in is a mood reference, not a template. Its design will change over time, so this section records what we took from it and what we deliberately did not take. Update, 27 Sep 2026: Dito asked to follow its type pairing (sans for reading, mono for the site's own voice) and to keep the colour palette of the existing lzadhito.github.io.

| Take | Leave |
| --- | --- |
| A quiet paper background and a sans plus monospace type pairing (Apercu and Fira Mono there) | Its exact colours, component styling, and the licensed Apercu Pro files (see Typography) |
| A one-line intro framing the site as "my own space, outside social media" | Garden, Shelf (books, series, movies), Bookmarks, Changelog, Colophon |
| Dated post list on the home page with an "All posts" link | Photo-heavy project cards on the home page |
| Minimal top navigation and a simple contact footer | Dropdown menus in the navigation |
| RSS feed | Multiple RSS feeds |
| Postcards / guestbook idea (Phase 3) | Postcards in Phase 1 |

## Colors

One paper, one ink, one pencil grey, one leaf green. Green is the only colour; it is never decoration. All values come from the lemonade theme on the current lzadhito.github.io (DaisyUI: `base-100`, `base-200`, `base-300`, `base-content`, `gray-600`, `primary`), converted to hex. Night mode is derived from the same hues because the current site has none.

| Token | Name | Light | Night | Used for |
| --- | --- | --- | --- | --- |
| `neutral` | Paper | `#F8FDEF` | `#151614` | Page background, composer, share images |
| `surface` | Sheet | `#E1E6D9` | `#1E201B` | Composer bars, secondary buttons, drafts list pressed state |
| `primary` | Ink | `#151614` | `#EEF3E4` | All body text, titles, Note text |
| `secondary` | Pencil | `#4A5565` | `#A4AB9C` | Dates, times, type labels, nav, quotes, captions |
| `tertiary` | Leaf | `#2F6B00` | `#93D14F` | Links, primary buttons, focus rings, "Live" status |
| `rule` | Rule | `#CBCFC3` | `#33362F` | 1px dividers only |

Measured contrast (WCAG 2.1 AA needs 4.5:1 for text):

| Pair | Light | Night |
| --- | --- | --- |
| Ink on Paper | 17.5:1 | 16.1:1 |
| Pencil on Paper | 7.3:1 | 7.7:1 |
| Leaf on Paper | 6.3:1 | 9.9:1 |
| Button text on Leaf | 6.3:1 (`#F8FDEF`) | 9.9:1 (`#151614`) |

Rules:

- The site always loads in the light palette. Night mode is opt-in: a small "Dark" / "Light" text link in the footer sets `data-theme="dark"` on `<html>` and is remembered in `localStorage`. It does not follow the device (`prefers-color-scheme`).
- Story and preview images are **always the light palette**, regardless of the author's device, so every share looks the same.
- The brand green `#419400` is only 3.7:1 on Paper, so it is not used for text; `tertiary` is a darker shade of the same hue. Rule colour is decorative and never carries meaning on its own.
- Never introduce a second accent. Success, error, and warning states use words and icons in Ink or Pencil, not green, red, or amber.

## Typography

Two families with clearly different jobs:

- **Hanken Grotesk** (sans) sets everything that is *writing*: Notes, Essays, titles, the intro, list entries, and the composer text area. It stands in for Apercu, the sans on iamrob.in. Apercu Pro is a commercial typeface, so its files are not copied from that site; Hanken Grotesk is a free (OFL) grotesque with a similar feel and real italics. If Dito buys an Apercu licence, replace the family in this file and the font files, and nothing else changes.
- **Fira Mono** (monospace, the same family iamrob.in uses) sets everything that is *about* the writing: the site name, navigation, dates and times, type labels, buttons, and status text.

If a piece of text was written by Dito, it is Hanken Grotesk. If it was written by the site, it is Fira Mono.

| Token | Family | Size (mobile) | Size (≥ 768px) | Weight | Line height |
| --- | --- | --- | --- | --- | --- |
| `display-essay` | Hanken Grotesk | 36px | 44px | 700 | 1.15 |
| `display-note` | Hanken Grotesk | 26px | 32px | 400 | 1.42 |
| `intro` | Hanken Grotesk | 22px | 24px | 400 | 1.45 |
| `composer` | Hanken Grotesk | 20px | 20px | 400 | 1.55 |
| `body` | Hanken Grotesk | 18px | 19px | 400 | 1.65 |
| `list-item` / `list-item-essay` | Hanken Grotesk | 18px | 18px | 400 / 700 | 1.45 |
| `ui` / `site-name` | Fira Mono | 16px | 16px | 400 / 700 | 1.3 |
| `meta` | Fira Mono | 14px | 14px | 400 | 1.4 |

Rules:

- Line length: Essay body is capped at 34em (about 70 characters); Note text at 32em.
- Sentence case everywhere. No all-caps labels, no tracked-out eyebrows.
- Emphasis inside writing is Hanken Grotesk italic. Bold is for Essay titles and list entries of Essays only.
- Dates and times are monospace, so the post list's date column lines up without tabular-figure tricks; it still gets a fixed width.
- Composer text is 20px. Anything under 16px in a text field makes iOS Safari zoom the page on focus.

## Layout

A single left-aligned column. Nothing is centred except the story image's vertical rhythm.

- Column: max width 40rem (640px), with a 20px gutter on phones and auto margins on desktop. The column sits left of centre on wide screens (`margin-left: max(20px, 12vw)`), like writing on the left page of a notebook.
- Spacing scale: 4, 8, 12, 16, 20 (gutter), 24, 32, 48, 64, 96px. Section gaps are 48px on phones, 64px on desktop.
- Breakpoint: one, at 768px. Below it everything is the phone layout.
- Navigation (Phase 1): site name on the left; "Blog" and "About" on the right. Phase 2 adds "Work". Nothing else goes in the header.
- Footer: Instagram, GitHub, Email, RSS as plain text links in one row that wraps.

### Home

```
┌────────────────────────────────────┐
│ Dito                  Blog   About │  site-name, nav-link
│                                    │
│ <one-line intro, intro token,      │  Dito writes this (PRD open item)
│  max two lines on a phone>         │
│                                    │
│ Latest                             │  h2, ui token, Pencil
│ 26 Sep  note   Traffic makes me …  │  post-meta + post-list-item
│ 24 Sep  essay  Why I left …        │  essay titles in 700 weight
│ 21 Sep  note   The fastest way …   │
│ 19 Sep  note   Rain on the …       │
│ 15 Sep  essay  Five years of …     │
│ All posts                          │  link
│ ────────────────────────────────── │  divider
│ Instagram  GitHub  Email  RSS      │
└────────────────────────────────────┘
```

The intro and all five latest posts must fit within about 1.5 phone screens (PRD A1).

### Blog list

Same row design as the home list, grouped under year headings (`2026`, `2025`) in `ui` Pencil. Each row is date, type word (`note` / `essay` in lowercase Pencil), then the text:

- Essay: the title, weight 700, up to two lines.
- Note: the first sentence, weight 400, clamped to two lines with an ellipsis. A Note never needs a title to look complete in the list (PRD A2).

The whole row is the tap target, not only the text.

### Note page

```
┌────────────────────────────────────┐
│ Dito                  Blog   About │
│                                    │
│ Saturday 26 September 2026, 07:12  │  post-meta, Pencil
│                                    │
│ Traffic makes me think in a way    │  note-body: 26px / 32px Hanken
│ my desk never does. Stuck between  │
│ two buses, there's nothing to do   │
│ but follow a thought all the way   │
│ to its end.                        │
│                                    │
│ ────────────────────────────────── │
│ More posts                         │  3 rows, list design (PRD A4)
│ Dito  Instagram  GitHub  Email     │
└────────────────────────────────────┘
```

The capture time is part of the Note's identity: always show the time for Notes, in Asia/Jakarta time. No title element is rendered even if a Note has an optional title; the title only labels it in lists and share images.

### Essay page

```
┌────────────────────────────────────┐
│ Dito                  Blog   About │
│                                    │
│ Why I left my comfortable job      │  essay-title, 36px / 44px
│ 24 September 2026, 6 min read      │  post-meta
│                                    │
│ Body text in Hanken 18px, line   │  essay-body, max 34em
│ height 1.65, paragraphs separated  │
│ by 1em, no first-line indent.      │
│                                    │
│ ▎ Quotes use a 2px Rule-coloured   │  blockquote, Pencil, italic
│ ▎ bar and Pencil italic text.      │
│                                    │
│ ────────────────────────────────── │
│ More posts                         │
└────────────────────────────────────┘
```

Essays show the date without a time and a reading time rounded to whole minutes at 230 words per minute.

## Elevation & Depth

The site is flat. There are no shadows, no blurred backgrounds, and no layered cards anywhere, public or private.

- Separation comes from whitespace first, then a 1px Rule divider.
- The composer's top and bottom bars use the Sheet colour against Paper, plus a 1px Rule border, to separate controls from the writing area.
- Overlays (the conflict notice, the iOS "save image" screen) are full-screen Paper sheets, not floating modals.

## Shapes

- `none` (0px): everything on the public site. Text has no containers.
- `sm` (4px): buttons and text inputs in the composer.
- `md` (8px): the token prompt input and toast messages in the composer.
- Links are underlined (1px, offset 0.2em) in Leaf; the underline thickens to 2px on hover and press.
- Focus ring: 2px solid Leaf, offset 2px, on every focusable element. Never remove it.

## Components

### Links and lists

- Body links: Leaf, underlined. Visited links look the same; this is a notebook, not a search results page.
- Navigation links: Pencil, no underline; the current page is Ink.
- Post list rows: 12px vertical padding, 1px Rule divider between rows, date column fixed at 4.5em.

### Composer (`/write/`)

The composer is the private writing app installed on Dito's phone. It uses the same palette and fonts as the site so the preview is honest, but it is quieter still: the text area is the whole screen.

```
┌────────────────────────────────────┐
│ Drafts            Saved on phone   │  composer-bar (top), meta
│────────────────────────────────────│
│                                    │
│ The cursor starts here. Text in    │  composer-textarea, 20px Hanken Grotesk
│ Hanken Grotesk 20px on Paper, 20px       │  full height, no border
│ padding, no border, no placeholder │
│ beyond "Say it or type it".        │
│                                    │
│────────────────────────────────────│
│ Aa    Note | Essay        Publish  │  composer-bar (bottom), above keyboard
└────────────────────────────────────┘
```

- The bottom bar sits directly above the keyboard (follow `visualViewport`) and respects `env(safe-area-inset-bottom)`.
- "Aa" opens the formatting row (bold, italic, link, quote, list); it is closed by default (PRD B7).
- Note | Essay is a two-segment toggle in `ui`; the selected segment is Ink on Sheet, the other Pencil.
- When Essay is selected, a title field appears above the text area in `display-essay` at 26px.
- Drafts list: one `draft-row` per draft showing the relative date in `meta` and the first line in `list-item`. Swipe or long-press reveals Delete.

### Composer states and copy

Every action keeps one name through its whole flow. Status text is in `meta`, Pencil, top right, except "Live", which is Leaf.

| Situation | Copy |
| --- | --- |
| Empty text area | Say it or type it |
| Saved locally, not yet synced | Saved on phone |
| Synced to GitHub | Synced |
| No connection | Offline. Saved on phone |
| Publish tapped | Publishing… |
| Commit made, waiting for the build | Waiting for the site |
| `version.json` matches | Live |
| Publish tapped offline | Will publish when you're back online |
| Token missing | Paste your GitHub token to start writing |
| Token expired (401) | Token expired. Paste a new one to publish. Your drafts are still on this phone. |
| Sync conflict | This draft changed on another device. Your version is kept here, and the other one is saved as "(conflict copy)". |
| Share tapped | Link copied. Paste it into the Link sticker. |
| iOS fallback screen | Press and hold the image, then tap Save to Photos |
| Delete confirmation | Delete this draft? This can't be undone. [Delete] [Keep] |

Errors never apologise and always say what happens next.

### Buttons

- Primary (`button-primary`): Leaf fill, Sheet text, 48px tall. Only for Publish and Share to story, and only one primary button on screen at a time.
- Secondary (`button-secondary`): Sheet fill, Ink text. For Preview, Unpublish, Keep, and everything else.
- Destructive actions use a secondary button labelled with the action ("Delete"), not a red button.

### Story image (1080 × 1920)

Static PNG built with Satori. Always light palette. Instagram covers roughly the top 250px (profile row) and the bottom 340px (reply bar), and Dito needs empty space to drop the Link sticker, so the layout reserves both.

```
   0 ┌──────────────────────────┐
     │   Instagram header zone  │  keep empty
 280 │ Dito                     │  story-meta, Ink, 700
     │ Sat 26 Sep 2026, 07:12   │  story-meta, Pencil
 360 │                          │
     │ Traffic makes me think   │  story-text, 72px → 44px floor
     │ in a way my desk never   │  text box 888 × 1060
     │ does. Stuck between two  │  x 96–984, y 360–1420
     │ buses, there's nothing … │
     │                          │
1420 │ Read the rest at         │  story-meta, Pencil
     │ lzadhito.github.io       │  story-meta, Leaf
1500 │                          │
     │   sticker bay (empty)    │  y 1500–1640, for the Link sticker
1640 │                          │
     │   Instagram reply zone   │  keep empty
1920 └──────────────────────────┘
```

- Note: text fits by stepping the size 72 → 64 → 56 → 50 → 44px. At 44px, if it still overflows, cut at a word boundary and end with "…" (PRD D2). Show the "Read the rest at" line only when truncated; otherwise show just the domain.
- Essay: title in `story-title` (88px stepping down to 56px, max 4 lines), then the excerpt in `story-text` at 44px Pencil, max 6 lines, always ending with "…". Date line has no time.
- No logo, no border, no gradient. Paper, ink, and one green line of domain text.

### Social preview image (1200 × 630)

```
┌────────────────────────────────────────────┐
│                                            │  padding 72 / 80
│  Traffic makes me think in a way my desk   │  og-title, 60px → 40px floor
│  never does.                               │  max 4 lines
│                                            │
│                                            │
│  Dito, lzadhito.github.io                  │  og-meta; domain in Leaf
└────────────────────────────────────────────┘
```

Essays use their title; Notes use their first sentence. Same truncation rule as the story image, with a 40px floor. The home page and blog list share one static preview with the site intro line.

### Icons and browser chrome

- App icon and favicon: a lowercase "d" in Hanken Grotesk 700, Ink on Paper, with no other marks. Provide 192px, 512px, and maskable 512px (glyph inside the central 80%).
- `theme-color`: `#F8FDEF` for light, switched to `#151614` when the reader picks Dark (the footer toggle updates the meta tag).
- PWA manifest `background_color` and `theme_color`: `#F8FDEF`.

## Do's and Don'ts

Do:

- Let the Note be the biggest thing on its page, and keep everything around it small.
- Show the capture time on every Note, in Jakarta time.
- Use Leaf only for things you can tap, and for "Live."
- Test every screen at 375px wide in both light and night before calling it done.
- Keep the share images and the site on the same tokens, from this file.

Don't:

- Add cards, shadows, gradients, background images, or illustrations.
- Add a second accent colour, including for errors or success.
- Use all caps, tracked-out labels, or numbered markers.
- Centre body text or justify it.
- Animate page loads or list entries. The only motion allowed is the state change of a button or status after a tap (150ms, and none under `prefers-reduced-motion`).
- Copy components or licensed font files from iamrob.in; the type pairing and the ideas in the reference table are the only things taken.

## Implementation notes

These tie the design to the tech stack doc.

- **Single source of tokens.** This file lives at the repo root as `DESIGN.md`. A small build script (`scripts/tokens.ts`) reads its YAML front matter and writes `src/design/tokens.css` (CSS custom properties, with the `-night` values inside `:root[data-theme='dark']`) and `src/design/tokens.ts` (plain object imported by the Satori templates). Run it before `astro build`, and run `npx @google/design.md lint DESIGN.md` in CI so a broken token fails the build.
- **Fonts on the site.** Self-host with Fontsource: Hanken Grotesk variable (weight axis, normal and italic) and Fira Mono 400 and 700, Latin subset only, `font-display: swap`. Preload only Hanken Grotesk's regular file to protect the 2-second page budget.
- **Fonts for Satori.** Satori reads TTF, OTF, or WOFF, not WOFF2, and does not support variable fonts. Commit static WOFF instances to `src/assets/fonts/`: Hanken Grotesk Regular and Bold, and Fira Mono Regular and Bold.
- **Time zone.** GitHub Actions runs in UTC. Format every date with `Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', … })`, or a Note written at 07:12 WIB will show 00:12.
- **Composer keyboard.** Add `interactive-widget=resizes-content` to the composer's viewport meta for Android Chrome, and position the bottom bar from `visualViewport` for iOS Safari.
