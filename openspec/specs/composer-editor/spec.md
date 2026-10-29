# composer-editor Specification

## Purpose

Defines what the /write editor screen shows on a phone and how its actions (back, publish, view, new, password, unpublish, delete) are placed and behave.

## Requirements

### Requirement: One primary action in the top bar
The editor's top bar SHALL show a back control, the save/publish status, a menu control, and a single primary button labelled "Publish" for an unpublished post or "Update" for a published one. No other action buttons SHALL appear in the top bar. Every tappable control SHALL have a touch target of at least 44px in both directions.

#### Scenario: Unpublished draft
- **WHEN** the author opens the editor on a draft that is not published
- **THEN** the top bar shows back, status, menu, and "Publish"
- **AND** "Publish" is the only visually emphasised button

#### Scenario: Published post
- **WHEN** the author opens a post that is already published
- **THEN** the primary button reads "Update"

#### Scenario: Nothing to publish
- **WHEN** the body is empty
- **THEN** the primary button is disabled

### Requirement: Back leaves the editor without discarding work
The back control SHALL return to the drafts list. It SHALL be an arrow, not a "Cancel" label, because edits are already saved automatically. Leaving SHALL NOT discard or prompt about edits.

#### Scenario: Leave with unsaved typing
- **WHEN** the author types, then taps back immediately
- **THEN** the typed text is saved before the drafts list appears
- **AND** no confirmation dialog is shown

### Requirement: View link for published posts
When the post is published, the status area SHALL show a "View" link that opens the live post in a new tab. The link SHALL NOT be shown for unpublished drafts.

#### Scenario: Published post
- **WHEN** the author opens a published post
- **THEN** a "View" link to the live post URL is visible without opening the menu

#### Scenario: Draft
- **WHEN** the author opens an unpublished draft
- **THEN** no "View" link is shown

### Requirement: Secondary actions live in a bottom sheet
A menu control in the top bar SHALL open a bottom sheet listing the secondary actions: "View post" (published only), "New draft", "Set password", "Unpublish" (published only), and "Delete" (unpublished only). The destructive actions SHALL be visually separated from the others and styled as destructive. The sheet SHALL close on a tap outside it, on the Escape key, and after any action is chosen, except "Set password", which reveals its input inside the sheet and keeps it open.

#### Scenario: Published post menu
- **WHEN** the author opens the menu on a published post
- **THEN** the sheet lists "View post", "New draft", "Set password", and "Unpublish"
- **AND** it does not list "Delete"

#### Scenario: Unpublished draft menu
- **WHEN** the author opens the menu on an unpublished draft
- **THEN** the sheet lists "New draft", "Set password", and "Delete"
- **AND** it does not list "View post" or "Unpublish"

#### Scenario: Dismiss
- **WHEN** the author taps outside the sheet
- **THEN** the sheet closes and nothing changes

### Requirement: Deleting an unpublished draft is undoable
Choosing "Delete" on an unpublished draft SHALL remove the draft and return to the drafts list without a confirmation dialog. A toast with an "Undo" action SHALL be shown for about five seconds. Choosing "Undo" within that time SHALL restore the draft unchanged. After the time passes, the deletion is final.

#### Scenario: Delete then undo
- **WHEN** the author deletes a draft and taps "Undo" within five seconds
- **THEN** the draft is back in the drafts list with its title, text, and password unchanged

#### Scenario: Delete and let it expire
- **WHEN** the author deletes a draft and does not tap "Undo"
- **THEN** the draft stays deleted after the toast disappears

#### Scenario: Leaving the page during the undo window
- **WHEN** the author deletes a draft and closes the page before the toast disappears
- **THEN** the draft stays deleted

### Requirement: Published posts are removed in two steps
A published post SHALL NOT be deletable directly. The author SHALL first choose "Unpublish", confirm, and wait for the post to be removed from the site. After that the post is a draft and "Delete" becomes available.

#### Scenario: Unpublish confirmation
- **WHEN** the author chooses "Unpublish" on a published post
- **THEN** a confirmation asks before the post is removed from the site
- **AND** declining the confirmation changes nothing

#### Scenario: Delete after unpublish
- **WHEN** an unpublish has completed
- **THEN** the menu for that post lists "Delete"

### Requirement: Password is set from the menu
The password field SHALL NOT be a permanent row above the body. "Set password" in the menu SHALL let the author set or clear the password. A post with a password SHALL show a lock marker on the primary button, as it does today. Removing the password from a published post SHALL still ask for confirmation, because the post becomes public.

#### Scenario: Set a password
- **WHEN** the author chooses "Set password" and enters a value
- **THEN** the draft is saved with that password
- **AND** the primary button shows the lock marker

#### Scenario: Clear password on a published post
- **WHEN** the author clears the password of a published post and taps "Update"
- **THEN** a confirmation warns that the post will be public

### Requirement: Formatting bar stays reachable above the keyboard
The formatting bar SHALL contain only the formatting keys. It SHALL remain visible directly above the on-screen keyboard while the body is focused, and tapping its keys SHALL NOT dismiss the keyboard.

#### Scenario: Keyboard open
- **WHEN** the author focuses the body on a phone and the keyboard opens
- **THEN** the formatting bar is visible just above the keyboard

#### Scenario: Insert markdown
- **WHEN** the author taps a formatting key with text selected
- **THEN** the markdown wraps the selection and the keyboard stays open
