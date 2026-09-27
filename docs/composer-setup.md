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
  - Untick **Expire user authorization tokens** (otherwise the login lasts 8 hours)
  - Copy the **Client ID**
- **Install App** (left menu) → your account → **Only select repositories** → `lzadhito.github.io`

## 2. Deploy the proxy Worker (free Cloudflare account)

```sh
cd worker
# set CLIENT_ID in wrangler.toml to the Client ID from step 1
npx wrangler deploy
```

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
- The Worker holds no secrets, forwards two fixed GitHub endpoints, and accepts only your
  origin and your Client ID.
- Revoke any time: GitHub → Settings → Applications → Authorized GitHub Apps.
