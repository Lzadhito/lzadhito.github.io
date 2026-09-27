# Love button & viewer analytics: one-time setup

Both features cost $0: Cloudflare Web Analytics is free with no usage cap, and the clap counts
live in Cloudflare D1, whose free tier (100k writes/day, 5M reads/day, 5GB storage) is far more
than a personal blog needs. Until you do the steps below, the love button just doesn't render and
there's no analytics script — nothing breaks.

## 1. Viewer analytics (Cloudflare Web Analytics)

1. Cloudflare dashboard → **Analytics & Logs → Web Analytics → Add a site**.
2. Pick the **JavaScript snippet** setup (not "Automatic" — that needs your DNS on Cloudflare,
   which this site doesn't use). Copy the token from the generated `data-cf-beacon` snippet.
3. Paste it into `src/consts.ts`:
   ```ts
   export const CF_ANALYTICS_TOKEN = "<token>";
   ```
4. Commit and push. Pageviews, visitors, referrers and countries then show up under that site in
   the Cloudflare dashboard — there's no in-repo dashboard to maintain.

## 2. Love button (Medium-style claps)

The clap counts are served by the same Worker already used for the composer's GitHub sign-in
(`worker/index.js`), extended with a `/love/:slug` route backed by D1.

### a. Create the D1 database

```sh
cd worker
npx wrangler d1 create lzadhito-loves
```

Copy the printed `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "lzadhito-loves"
database_id = "<the id wrangler printed>"
```

### b. Run the migration

```sh
npx wrangler d1 execute lzadhito-loves --remote --file=migrations/0001_create_post_loves.sql
```

(Drop `--remote` first to also test against the local dev database with `wrangler dev`.)

### c. Deploy the Worker

```sh
npx wrangler deploy
```

This redeploys the same Worker used for composer sign-in (`worker/index.js` now dispatches to
both `auth.js` and `love.js`) — the GitHub sign-in flow keeps working unchanged.

### d. Point the site at it

Edit `src/love/config.ts`:

```ts
export const LOVE_API = { proxy: "https://lzadhito-github-auth.<you>.workers.dev" };
```

(Same Worker URL as `src/composer/config.ts`'s `AUTH.proxy`.) Commit and push — the clap button
now renders at the bottom of every post.

## How it works

- Each visitor gets a random id stored in `localStorage` (not a login) — enough to cap claps per
  visitor, not to identify anyone.
- Tapping claps optimistically and immediately in the UI; taps are batched and sent as one request
  ~400ms after the last tap (or when the page is hidden), well within D1's free write quota.
- Each visitor is capped at 50 claps per post, enforced both in the browser and by the Worker.

## Free-tier ceilings (for future reference)

- **Workers**: 100,000 requests/day.
- **D1**: 100,000 writes/day, 5,000,000 rows read/day, 5GB storage.
- **Web Analytics**: no published cap; it's free regardless of traffic.

If you're ever worried about surprise charges, make sure no payment method is attached to the
Cloudflare account — Workers/D1 free-tier limits then simply reject extra requests rather than
billing you.
