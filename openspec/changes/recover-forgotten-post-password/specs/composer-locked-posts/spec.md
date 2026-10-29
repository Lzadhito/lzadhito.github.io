# Spec Delta

## Purpose

Defines how the author finds, unlocks, replaces, or deletes a password-protected post in `/write`, so that a forgotten password never leaves the post unmanageable.

## ADDED Requirements

### Requirement: Locked posts are marked in the Drafts list
A post in the repo that is password protected SHALL show a lock marker in the Drafts list.

#### Scenario: Locked remote post
- **WHEN** the author opens Drafts while signed in and the repo has a protected post with no local copy
- **THEN** its row shows a lock marker beside its title

### Requirement: Unlocking happens in a sheet with inline feedback
Opening a locked remote post SHALL show a sheet with a password field that can be revealed. A wrong password SHALL show an error inside the sheet and keep it open with the field focused. A correct password SHALL open the post for editing.

#### Scenario: Wrong password
- **WHEN** the author submits a wrong password
- **THEN** the sheet stays open, shows that the password is wrong, and keeps the field ready for another try

#### Scenario: Correct password
- **WHEN** the author submits the right password
- **THEN** the post opens in the editor with its text decrypted

#### Scenario: Dismissed
- **WHEN** the author closes the sheet
- **THEN** nothing changes and the Drafts list is shown

### Requirement: A locked post can be managed without its password
The unlock sheet SHALL offer "View on site" and "Delete" without requiring the password. Delete SHALL ask for confirmation and then remove the post from the site.

#### Scenario: Delete a locked post
- **WHEN** the author chooses Delete in the sheet and confirms
- **THEN** the post is removed from the repo and from the list

### Requirement: Forgotten password is explained honestly
The sheet SHALL offer a "Forgot the password?" step that states the text cannot be recovered by anyone and says what is kept (title, date, link) and what is replaced (the locked text). It SHALL offer "Write it again" and a way back to trying the password.

#### Scenario: Open the forgot step
- **WHEN** the author chooses "Forgot the password?"
- **THEN** the sheet states the text can't be recovered, lists what is kept and replaced, and shows "Write it again" and a way back

### Requirement: Write it again starts a replacement draft
Choosing "Write it again" SHALL open the editor on a new draft for the same post, with the same slug, title, publish date, and extra front matter, an empty body, and no password. It SHALL NOT change the repo.

#### Scenario: Start over
- **WHEN** the author chooses "Write it again"
- **THEN** the editor opens with the post's title and an empty body, and the repo file is unchanged

#### Scenario: Banner shown
- **WHEN** a replacement draft is open
- **THEN** a banner says a locked post is being replaced, that nothing changes until Publish, and offers Discard

#### Scenario: Discard
- **WHEN** the author chooses Discard on the banner
- **THEN** the replacement draft is removed and the locked post remains as it was

### Requirement: Replacement drafts are guarded at Publish
A replacement draft SHALL NOT be publishable while its body is empty. Publishing one SHALL ask for confirmation that the locked text will be replaced and cannot be undone, and on success SHALL write the post at the same slug and URL.

#### Scenario: Empty body
- **WHEN** the replacement draft has no text
- **THEN** the Publish button is disabled

#### Scenario: Confirmed publish
- **WHEN** the author writes new text, presses Publish, and confirms
- **THEN** the post at the same URL shows the new text, and the draft becomes an ordinary published post

#### Scenario: Declined publish
- **WHEN** the author declines the confirmation
- **THEN** nothing is published and the draft is kept

#### Scenario: Post changed elsewhere
- **WHEN** the repo version changed after the replacement draft was created
- **THEN** the existing conflict handling is shown instead of overwriting silently
