# Tasks

## 1. Worker `/refresh` route

- [x] 1.1 In `worker/auth.js`, add `/refresh` handling that checks origin and `client_id`, builds the upstream body itself (`client_id`, `CLIENT_SECRET` from env, `grant_type=refresh_token`, `refresh_token`) and ignores other fields; verify with new cases in `src/composer/__tests__/worker.test.ts` (valid request attaches the secret, wrong client ID returns 403 with no upstream call, extra fields are not forwarded, missing `refresh_token` returns 400)
- [x] 1.2 Add a `CLIENT_SECRET` note to `worker/wrangler.toml` as a comment only (the value is set via `wrangler secret put`); verify `git grep` finds no secret value in the repo

## 2. Client token set and refresh primitive

- [x] 2.1 In `src/composer/auth.ts`, make `pollForToken` return `{ access_token, refresh_token?, expires_in? }` instead of a string, and add `refreshAccessToken(c, refreshToken)` that posts to `/refresh`; verify in `auth.test.ts` (sign-in returns the full set, refresh returns a new pair, GitHub's `bad_refresh_token` error is surfaced as a distinct "signed out" error, a network failure is not)
- [x] 2.2 In `src/composer/github.ts`, add optional `refreshToken` and `expiresAt` to `Settings`; verify `loadSettings`/`saveSettings` round-trip them and old saved settings without them still load (`github.test.ts`)

## 3. Refresh at the choke point

- [x] 3.1 In `gql` (`github.ts`), refresh before the request when `expiresAt` is within about 5 minutes, and on a 401 refresh once and retry once; save the new tokens to settings before the retried request; verify in `github.test.ts` (near-expiry refreshes first, fresh token sends no refresh, 401 then success retries once, 401 twice stops, pasted token with no `refreshToken` never calls refresh)
- [x] 3.2 Make concurrent refreshes share one in-flight promise, and re-read `localStorage` just before refreshing so a refresh token already rotated by another tab is adopted instead of reused; verify in `github.test.ts` (two parallel requests send one refresh, changed stored token skips the refresh call)
- [x] 3.3 On a terminal refresh error clear `token`, `refreshToken` and `expiresAt` and throw a "sign in again in Settings" error; on network/5xx errors keep everything and throw a retryable error; verify both paths in `github.test.ts` and that drafts and `pending` flags are untouched

## 4. Composer UI wiring

- [x] 4.1 In `app.ts`, save `refresh_token` and a computed `expiresAt` on sign-in; on Save in Settings keep the refresh fields when the token text is unchanged and drop them when it was edited; verify in `app.test.ts`
- [x] 4.2 Update `tokenInfo` text to show that the session renews automatically (and the signed-out message after a terminal refresh failure); verify in `app.test.ts` that the text matches for signed-in, pasted-token, and signed-out states

## 5. Docs and rollout

- [x] 5.1 Update `docs/composer-setup.md`: re-tick "Expire user authorization tokens", generate a client secret, `npx wrangler secret put CLIENT_SECRET`, adjust the Security notes ("Worker holds no secrets" no longer true); verify by following the steps end to end
- [x] 5.2 Update the header comment in `worker/auth.js` and `worker/index.js` that says the proxy holds no secrets; verify with `git grep -i "no secrets"`
- [ ] 5.3 Run `npm test` and confirm the whole suite passes; then deploy the Worker, sign in once, and verify a publish succeeds after temporarily setting a past `expiresAt` in `localStorage` (the request should trigger a silent refresh and store a new refresh token)
