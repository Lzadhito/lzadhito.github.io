# post-actions Specification

## Purpose

Defines where the Love and Share controls appear on a blog post page, so readers can react to or share a post right after reading it.

## Requirements

### Requirement: Post actions appear after the post content
The Love and Share buttons SHALL be rendered together, right-aligned, immediately after the post content and before the "All posts" footer link. They SHALL NOT appear in the post header.

#### Scenario: Regular post
- **WHEN** a reader opens a published blog post
- **THEN** the Love and Share buttons appear at the bottom-right, after the post content
- **AND** the header meta row shows only the publish/updated dates

#### Scenario: Narrow viewport
- **WHEN** the post is viewed at phone width
- **THEN** the buttons remain right-aligned after the post content without overflowing the column

### Requirement: Post actions remain available on protected posts
The Love and Share buttons SHALL appear in the same position on password-protected posts, whether the post is locked or unlocked.

#### Scenario: Locked post
- **WHEN** a reader opens a password-protected post that is still locked
- **THEN** the buttons appear after the password gate, in the same bottom-right position

### Requirement: Post action behavior is unchanged
Moving the buttons SHALL NOT change their behavior: Love counts claps for the post and Share opens the share dialog.

#### Scenario: Share dialog from new position
- **WHEN** a reader clicks the Share button at the bottom of the post
- **THEN** the share dialog opens exactly as it did from the header

#### Scenario: Love from new position
- **WHEN** a reader clicks the Love button at the bottom of the post
- **THEN** the clap registers and the count updates exactly as it did from the header
