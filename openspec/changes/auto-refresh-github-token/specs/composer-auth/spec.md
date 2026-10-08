# Spec Delta

## Purpose

Defines how the `/write` composer obtains, keeps, and renews the GitHub credential it uses to publish posts, so the author stays signed in without handling tokens by hand.

## ADDED Requirements

### Requirement: Device-flow sign-in stores a renewable credential
When the author signs in with GitHub, the composer SHALL save the access token together with its refresh token and expiry time whenever GitHub supplies them.

#### Scenario: Sign-in with expiring tokens enabled
- **WHEN** the author completes the device flow and GitHub returns an access token, refresh token, and `expires_in`
- **THEN** the composer saves all three, with the expiry stored as an absolute time

#### Scenario: Sign-in with non-expiring tokens
- **WHEN** GitHub returns an access token with no refresh token
- **THEN** the composer saves the access token only and never attempts a refresh

### Requirement: Access token is refreshed before it expires
The composer SHALL silently exchange the refresh token for a new access token when the saved one is expired or within a short margin of expiring, before sending a GitHub request.

#### Scenario: Token near expiry
- **WHEN** the author publishes and the saved access token expires in less than the refresh margin
- **THEN** the composer refreshes first, saves the new access and refresh tokens, and publishes using the new token without prompting the author

#### Scenario: Token still fresh
- **WHEN** the saved access token is not near expiry
- **THEN** the composer sends no refresh request

### Requirement: Rejected token triggers one refresh and retry
If GitHub rejects the access token with a 401 and a refresh token is saved, the composer SHALL refresh once and retry the failed request once.

#### Scenario: Token revoked server-side early
- **WHEN** a GitHub request returns 401 and a refresh token is saved
- **THEN** the composer refreshes, saves the new tokens, and retries the request once

#### Scenario: Retry also fails
- **WHEN** the retried request still returns 401
- **THEN** the composer reports the token as rejected and does not refresh again

### Requirement: Rotated refresh tokens are persisted before use
Because each refresh token is single-use, the composer SHALL save the new access and refresh tokens before retrying any request with them.

#### Scenario: Page closes mid-publish
- **WHEN** a refresh succeeds and the page is closed before the retried request completes
- **THEN** the next page load still holds the new, valid refresh token

### Requirement: Concurrent requests share one refresh
The composer SHALL NOT send more than one refresh request at a time from a single page, and SHALL use a newer token saved by another tab instead of refreshing again.

#### Scenario: Two requests need a refresh together
- **WHEN** two GitHub requests both find the token expired at the same moment
- **THEN** exactly one refresh request is sent and both requests use its result

#### Scenario: Another tab already refreshed
- **WHEN** the saved tokens differ from those the composer started with when it is about to refresh
- **THEN** it uses the saved tokens and sends no refresh request

### Requirement: Failed refresh falls back to sign-in
If a refresh cannot succeed, the composer SHALL keep the author's drafts, stop retrying automatically, and prompt them to sign in again.

#### Scenario: Refresh token revoked or expired
- **WHEN** GitHub rejects the refresh token
- **THEN** the composer clears the saved credential, keeps all drafts and pending actions, and shows a message directing the author to sign in again in Settings

#### Scenario: Offline during refresh
- **WHEN** a refresh fails because the network is unavailable
- **THEN** the composer keeps the saved credential and retries on the next sync

### Requirement: Pasted tokens are never refreshed
A token the author pastes manually SHALL be used as-is, with no refresh attempted.

#### Scenario: Pasted fine-grained token
- **WHEN** the author saves a pasted token and later gets a 401
- **THEN** the composer reports the token as rejected without calling the refresh service

### Requirement: Refresh service protects the client secret
The auth proxy SHALL hold the GitHub App client secret server-side, add it to refresh requests itself, and never return it or accept it from the browser.

#### Scenario: Valid refresh request
- **WHEN** the proxy receives a refresh request from the allowed origin with the configured client ID and a refresh token
- **THEN** it forwards a refresh grant to GitHub with the client secret attached and returns GitHub's response

#### Scenario: Wrong origin or client ID
- **WHEN** a refresh request comes from another origin or with a different client ID
- **THEN** the proxy rejects it and makes no request to GitHub

#### Scenario: Extra fields in the request
- **WHEN** a refresh request body contains fields other than the client ID and refresh token
- **THEN** the proxy ignores them and forwards only the fixed refresh-grant fields
