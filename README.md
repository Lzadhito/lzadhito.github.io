# lzadhito.github.io

Dito's personal site: a calm blog now, a portfolio later. Astro static build; posts are Markdown files.

Design and decisions live in [`DESIGN.md`](DESIGN.md), [`docs/`](docs/) (PRD and tech stack).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Regenerate tokens, start the dev server |
| `npm run build` | Tokens → `astro check` → static build into `dist/` |
| `npm run lint:design` | Lint `DESIGN.md` |
| `npx tsx scripts/icons.ts` | Regenerate favicon and app icons into `public/` |

## How it fits together

- **Tokens.** `DESIGN.md` front matter is the single source. `scripts/tokens.ts` writes `src/design/tokens.css` and `tokens.ts` (git-ignored, regenerated on every dev/build).
- **Content.** `content/posts/<id>.md` is published; `content/drafts/` is never loaded. `content/pages/` holds the home intro and About. Post frontmatter is validated in `src/content.config.ts`.
- **URLs.** `/blog/<slug>/`, where `slug` is a frontmatter field set once at first publish.
- **Share images.** `/og/<slug>.png` (1200×630) and `/story/<slug>.png` (1080×1920) are rendered at build time with Satori + resvg from the same tokens.
- **Dates.** Always formatted in `Asia/Jakarta`, since CI runs in UTC.
- **Deploy.** `.github/workflows/deploy.yml` builds and force-pushes `dist/` to the public repo. See the setup checklist in the tech stack doc.

## Adding a post by hand

```md
---
id: 01J8ZK3F9Q            # ULID, also the filename
type: note                # note | essay (essays need a title)
title:
slug: 2026-09-26-traffic-makes-me-think
created: 2026-09-26T07:12:00+07:00
updated: 2026-09-26T07:12:00+07:00
published: 2026-09-26T07:40:00+07:00
---
Body in Markdown.
```
