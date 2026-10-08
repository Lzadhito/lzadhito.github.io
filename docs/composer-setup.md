# Composer: one-time GitHub sign-in setup

Lets the phone composer sign in with your GitHub account instead of pasting a token.
Until this is done, the composer keeps working with a pasted token.

## 1. Create a GitHub App (about 2 minutes, in a browser)

GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**

- Name: anything unique, e.g. `lzadhito-composer`
- Homepage URL: `https://lzadhito.github.io`
- Webhook: **untick Active**
- Repository permissions → **Contents: Read and write**
- Where can this app be installed: **Only on this account**
- Create it, then on the app's **General** settings page, scroll to
  **"Identifying and authorizing users"** (below the Callback URL field):
  - Tick **Enable Device Flow**
  - Leave **Expire user authorization tokens** ticked: the access token then lasts 8 hours and
    the composer renews it silently (see step 2). Untick it only if you'd rather have one
    never-expiring token and skip the client secret.
  - Copy the **Client ID**
  - Click **Generate a new client secret** and copy it (only needed for the silent renewal)
- **Install App** (left menu) → your account → **Only select repositories** → `lzadhito.github.io`

## 2. Deploy the proxy Worker (free Cloudflare account)

```sh
cd worker
# set CLIENT_ID in wrangler.toml to the Client ID from step 1
npx wrangler secret put CLIENT_SECRET   # paste the client secret from step 1
npx wrangler deploy
```

The secret lives only in Cloudflare, never in the repo. Without it, sign-in still works but the
composer can't renew the token: after 8 hours publishing fails with "Login service error (500)"
until you sign in again in Settings.

Copy the printed `https://lzadhito-github-auth.<you>.workers.dev` URL.

## 3. Point the composer at them

Edit `src/composer/config.ts`:

```ts
export const AUTH = { clientId: "<Client ID>", proxy: "<Worker URL>" };
```

Commit and push. Open `/write/` → Settings → **Sign in with GitHub**.

## Editing or deleting existing posts

The Drafts list (☰) shows local drafts plus every post currently published in the repo —
including ones written by hand or published from another device. Tap one to load its
content into the editor (Update/Unpublish then work as usual); long-press to delete it
straight from the repo without opening it.

This means two devices editing the *same* post around the same time will race — whichever
publishes last wins, same as any two people pushing to the same branch. Fine for a
single-author blog; just don't run two composer tabs on the same post at once.

## Security notes

- The token is limited to the repo the App is installed on, with Contents only.
- The access token expires after 8 hours and is renewed automatically, so a leaked one is short-lived.
  The renewal token is single-use and rotates; if you sign in on two devices, whichever renews second
  may be signed out and just needs to sign in again.
- The Worker forwards fixed GitHub endpoints and accepts only your origin and your Client ID. Its one
  secret, the client secret, is used only by `/refresh` and is never sent to the browser.
- A token you paste by hand is never renewed.
- Revoke any time: GitHub → Settings → Applications → Authorized GitHub Apps.
