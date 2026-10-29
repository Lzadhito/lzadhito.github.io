# composer-drafts Specification

## Purpose

Defines what the `/write` Drafts list shows in each sign-in and network state, so the author always knows whether posts from other devices are present, hidden, or failed to load.

## Requirements

### Requirement: Signed-out Drafts list offers sign-in where remote posts would appear
When no GitHub token is saved, the Drafts list SHALL show the local drafts followed by a block explaining that posts from other devices are not showing, with a primary "Sign in with GitHub" action and a secondary route to Settings for pasting a token.

#### Scenario: Signed out with device flow available
- **WHEN** the author opens Drafts with no saved token and sign-in is configured
- **THEN** the list shows local drafts, then a block with a "Sign in with GitHub" button and a link to Settings

#### Scenario: Signed out with device flow not configured
- **WHEN** the author opens Drafts with no saved token and sign-in is not configured
- **THEN** the block offers only the route to Settings

### Requirement: Sign-in completes inside the Drafts list
Starting sign-in from the Drafts block SHALL show the GitHub code and a way to open GitHub, and on success SHALL replace the block with the remote posts without leaving Drafts.

#### Scenario: Successful sign-in from Drafts
- **WHEN** the author signs in from the Drafts block and approves on GitHub
- **THEN** the block is replaced by posts from the repo and the author stays on the Drafts list

#### Scenario: Sign-in cancelled or failed
- **WHEN** the author cancels or the sign-in fails
- **THEN** the block returns to its initial state and states what happened

### Requirement: Failures to load remote posts are explained and retryable
When the list of remote posts cannot be loaded while signed in, the Drafts list SHALL show the underlying reason and a "Try again" action, and SHALL keep local drafts visible.

#### Scenario: GitHub request fails
- **WHEN** loading remote posts fails with an error
- **THEN** the list shows the error message and a "Try again" action beneath the local drafts

#### Scenario: Offline
- **WHEN** the author opens Drafts while offline
- **THEN** the list says only drafts saved on this device are shown

### Requirement: Editor states the truth when signed out
When no token is saved, the editor SHALL tell the author that their work is saved on the device and that signing in is required to publish.

#### Scenario: Typing while signed out
- **WHEN** the author writes a draft with no saved token
- **THEN** the editor shows "Saved on this device. Sign in to publish." with a route to sign in

#### Scenario: Publish pressed while signed out
- **WHEN** the author presses Publish with no saved token
- **THEN** the draft is queued, the author is told it will publish after sign-in, and the author is taken to sign in

### Requirement: Remote posts show title and date, newest first
Posts listed from the repo SHALL show their title and publish date rather than the file name, ordered by publish date with the newest first.

#### Scenario: Mixed hand-written and composer posts
- **WHEN** the repo contains posts with dated file names and posts without
- **THEN** each row shows the post's title and publish date, ordered by publish date descending

#### Scenario: Post without a title in front matter
- **WHEN** a repo post has no title
- **THEN** its row falls back to the file name

### Requirement: Posts with a local copy are not hidden from the repo
A post that has a local copy SHALL appear once in the list, and the list SHALL indicate when the repo version is newer than the local copy.

#### Scenario: Repo version is newer
- **WHEN** a post was edited on another device after this device last loaded or published it
- **THEN** its row shows that a newer version exists in the repo
