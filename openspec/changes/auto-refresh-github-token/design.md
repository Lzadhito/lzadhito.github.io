# Design

## Context

See proposal.md for motivation. Current state:

- `src/composer/auth.ts` runs the device flow through the Worker proxy (`worker/auth.js`), which forwards two fixed GitHub endpoints and holds no secrets. `pollForToken` returns a bare `string` and drops `refresh_token` / `expires_in`.
- `Settings` (in `github.ts`, persisted in `localStorage`) holds `token` and `tokenSavedAt`. Every GitHub call goes through one function, `gql(s, ...)`, which already turns a 401 into "Token rejected".
- `sync()` in `app.ts` loops over pending drafts and reports failures as "Sync failed ... Will retry", so a refresh failure that surfaces as a thrown error already fits the existing retry path.
- GitHub's refresh grant (`grant_type=refresh_token`) requires `client_secret` for GitHub Apps. A refresh returns a *new* access token and a *new* refresh token; the old refresh token is invalidated.

## Goals / Non-Goals

**Goals:**
- The author signs in once and stays signed in for as long as they keep using the composer.
- A leaked access token is useful for at most 8 hours.
- Failure (revoked, expired, offline) never loses a draft.

**Non-Goals:**
- Refreshing pasted fine-grained PATs (GitHub offers no way to).
- Server-side session storage or moving tokens out of `localStorage`.
- Cross-device coordination. Two devices share nothing; each signs in separately.

## Decisions

**1. Refresh through the existing Worker, with the secret held there.**
The browser can't hold `client_secret` and GitHub's token endpoint has no CORS, so the Worker is the only place that can do this. It gets a third fixed route, `/refresh`, which builds the upstream body itself (`client_id`, `client_secret`, `grant_type`, `refresh_token`) rather than forwarding the caller's JSON. That differs from the existing routes, which forward the body verbatim; forwarding verbatim here would let a caller override `grant_type` or probe with the secret attached.
*Alternative:* skip refresh and un-tick "Expire user authorization tokens" (what the setup doc says today). Zero code and zero secrets, but a leaked token lives indefinitely. This is a legitimate choice; this change exists because we want expiring tokens.
*Alternative:* a separate Worker for the secret-holding route. Cleaner isolation but a second deploy for one route; same origin check and client ID guard apply, so not worth it.

**2. Store the token set in `Settings`; refreshability is "has a `refreshToken`".**
Add optional `refreshToken` and `expiresAt` (ms epoch). No separate "token kind" flag: pasted tokens simply have neither field, so the refresh logic skips them naturally. Saving a hand-edited token in Settings must drop both fields; saving with an unchanged token must keep them.

**3. Refresh lazily at the single choke point, `gql`.**
Before each request: if `expiresAt` is within a margin (about 5 minutes), refresh first. On a 401 with a refresh token: refresh and retry once. No timers or background refresh, since this is a phone web app that is often suspended and a timer would simply be missed. Checking at use time covers both the "device slept for a day" and "token revoked early" cases.
*Alternative:* refresh only on 401. Simpler, but costs one wasted failed request per expiry and makes a failure look like a publish error. Proactive check plus 401 fallback is only a few more lines.

**4. Persist before use, and single-flight.**
Refresh tokens rotate, so the new pair is written to `localStorage` before the retried request is sent; otherwise a closed tab would strand the author with a dead refresh token. Concurrent callers within a page await one shared in-flight promise. Immediately before refreshing, the code re-reads `localStorage`: if the stored refresh token differs from the one it started with, another tab already rotated it, so it adopts the stored tokens instead of spending a dead one.
*Alternative:* `navigator.locks` for true cross-tab mutual exclusion. Stronger, but the author runs one composer tab (docs already say so); the re-read check is enough and `navigator.locks` support on older mobile browsers is uneven.

**5. Terminal refresh errors clear the credential; transient ones don't.**
GitHub answers a bad/expired/used refresh token with a JSON `error` (e.g. `bad_refresh_token`) and HTTP 200. Those clear `token`, `refreshToken`, `expiresAt` and throw "Signed out, sign in again in Settings". Network failures and non-JSON 5xx from the Worker leave everything in place and throw an ordinary error that `sync()` already retries. The existing "no token" UI then prompts sign-in; drafts and `pending` flags are untouched.

## Risks / Trade-offs

- **Worker now holds a secret** → set via `wrangler secret put`, never in `wrangler.toml` or git; the route reveals nothing without a valid refresh token, and is restricted by origin and client ID like the others. Rotating the secret is a GitHub App setting plus one `wrangler secret put`.
- **Rotation race across devices/tabs**: the second device to refresh with a stale token is signed out → accepted for a single-author blog (same class of race as editing one post from two devices); the re-read check in Decision 4 handles the same-browser case. Failure mode is a re-sign-in, not data loss.
- **Refresh token lifetime (~6 months) lapses if unused** → the author signs in again; same outcome as today.
- **Both tokens sit in `localStorage`**, as the single token does today → XSS exposure grows slightly (a refresh token outlives the access token). Mitigated by the site shipping no third-party scripts on `/write` and by the token being scoped to one repo with Contents only. Not mitigated further here.
- **Behavior change for existing sign-ins**: tokens obtained before this change have no refresh token. They keep working until they expire, then require one more sign-in.

## Migration Plan

1. In the GitHub App settings, re-tick **Expire user authorization tokens** and generate a client secret.
2. `cd worker && npx wrangler secret put CLIENT_SECRET`, then `npx wrangler deploy`.
3. Deploy the composer (push to `master`).
4. Sign in once in `/write` Settings to obtain a refresh token.

Rollback: un-tick the App setting and re-sign-in (tokens become non-expiring). The extra `Settings` fields are optional, so an older composer build ignores them and keeps working with the access token.
