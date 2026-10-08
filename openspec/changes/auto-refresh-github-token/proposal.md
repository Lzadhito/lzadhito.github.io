# Proposal

## Why

The composer's GitHub sign-in token is short-lived. When "Expire user authorization tokens" is enabled on the GitHub App, the access token dies after 8 hours and the user must redo the device flow. Today the composer discards the `refresh_token` GitHub returns, so it can't recover silently. We want expiring tokens (a stolen token dies quickly) without the user ever noticing.

## What Changes

- Keep `refresh_token` and the access-token expiry from the device-flow response, alongside the access token.
- Add a `/refresh` route to the auth Worker that exchanges a refresh token for a new access + refresh token. GitHub requires the App's `client_secret` for this, so the Worker gains one secret (stored with `wrangler secret put`, never committed).
- Composer refreshes automatically: shortly before expiry, and once on a 401 from GitHub, then retries the failed request. The new token pair is persisted before the retry (refresh tokens are single-use and rotate).
- If refresh fails (revoked, expired after ~6 months, or rotated away by another device), fall back to the existing "sign in again" prompt.
- Pasted fine-grained tokens keep working unchanged and are never refreshed.
- Update `docs/composer-setup.md`: re-tick "Expire user authorization tokens" and add the `client_secret` step.
- **BREAKING (for the Worker's security posture):** the Worker no longer "holds no secrets".

## Capabilities

### New Capabilities
- `composer-auth`: how the `/write` composer obtains, stores, refreshes, and falls back from GitHub credentials (device-flow sign-in, pasted token, automatic refresh).

### Modified Capabilities
<!-- None: openspec/specs/ is empty, so there is no existing capability to modify. -->

## Impact

- `src/composer/auth.ts`: return the full token set from `pollForToken`; add `refreshToken()`.
- `src/composer/github.ts`: extend `Settings` (`refreshToken`, `expiresAt`); `gql` refreshes and retries on 401.
- `src/composer/app.ts`: persist the full token set on sign-in; token-info text shows expiry.
- `worker/auth.js`, `worker/wrangler.toml`: new `/refresh` route and `CLIENT_SECRET` secret binding.
- Tests under `src/composer/__tests__/` (auth, github, worker).
- `docs/composer-setup.md`.
- Operational: one-time `wrangler secret put CLIENT_SECRET`, re-tick the GitHub App setting, and sign in once more to obtain a refresh token.
