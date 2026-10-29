# composer-edit-safety Specification

## Purpose

Guarantees that publishing an edit from the composer never silently replaces a newer version of the same post that was saved to the repo from another device.

## Requirements

### Requirement: Loaded post remembers the version it came from
When the composer loads a post from the repo, or publishes one, it SHALL remember which version of that post's file it holds.

#### Scenario: Opening a remote post
- **WHEN** the author opens a post from the repo
- **THEN** the draft records the repo version it was loaded from

#### Scenario: Publishing an edit
- **WHEN** an Update succeeds
- **THEN** the draft records the new repo version

### Requirement: Update refuses to overwrite a newer repo version
Before publishing an update to an existing post, the composer SHALL compare the remembered version with the repo's current version and SHALL NOT write if they differ.

#### Scenario: Repo unchanged
- **WHEN** the author updates a post and the repo still has the version the draft was loaded from
- **THEN** the update is published

#### Scenario: Repo changed since loading
- **WHEN** the author updates a post and the repo has a different version than the draft was loaded from
- **THEN** nothing is written and the author is told the post changed elsewhere

### Requirement: Author resolves a conflict explicitly
When an update is refused because the repo changed, the composer SHALL keep the author's text and offer to load the repo version or to overwrite it.

#### Scenario: Load the repo version
- **WHEN** the author chooses to load the repo version
- **THEN** the author's text is kept as a separate local draft and the editor shows the repo version

#### Scenario: Overwrite
- **WHEN** the author confirms overwriting
- **THEN** the update is published on top of the current repo version

### Requirement: Posts without a remembered version still publish
A draft with no remembered version, such as one saved before this behavior existed, SHALL be treated as having an unknown version and the composer SHALL warn once before overwriting an existing file.

#### Scenario: Older local draft of a published post
- **WHEN** the author updates a published post whose draft has no remembered version and the file exists in the repo
- **THEN** the composer asks for confirmation before overwriting
