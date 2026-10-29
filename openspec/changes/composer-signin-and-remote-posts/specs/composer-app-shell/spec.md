# Spec Delta

## Purpose

Defines how the `/write` composer looks and how it stays current, so it feels like part of the blog and the author is never silently stuck on an old version.

## ADDED Requirements

### Requirement: Composer matches the blog's visual style
The composer SHALL use the blog's typeface and its base and accent colours, so it looks like part of the same product. It SHALL keep a readable dark appearance for devices set to dark mode.

#### Scenario: Light appearance
- **WHEN** the composer is opened on a device set to light mode
- **THEN** its text uses the blog's typeface and its background and accent use the blog's colours

#### Scenario: Dark appearance
- **WHEN** the composer is opened on a device set to dark mode
- **THEN** it shows a dark variant that keeps the blog's typeface and accent hue

#### Scenario: Text remains readable
- **WHEN** any composer text or control is shown
- **THEN** its contrast against the background meets WCAG AA

### Requirement: Keyboard focus is visible
Every interactive control in the composer SHALL show a visible focus indicator when reached by keyboard.

#### Scenario: Tabbing through the Drafts list
- **WHEN** the author moves focus with the keyboard
- **THEN** the focused control is clearly outlined

### Requirement: A newer app version is announced
When the composer is brought back to the foreground and a newer version is available online, it SHALL tell the author and offer to reload. It SHALL NOT reload by itself.

#### Scenario: Newer version available
- **WHEN** the author returns to the composer and a newer version is available
- **THEN** a message offers "Update available. Reload"

#### Scenario: Author is mid-edit
- **WHEN** a newer version is available while the author has text in the editor
- **THEN** the page is not reloaded and the author chooses when to reload

#### Scenario: Offline
- **WHEN** the author returns to the composer with no network
- **THEN** no update message is shown and nothing is lost

### Requirement: Offline opening keeps working
The composer SHALL still open and allow writing with no network connection.

#### Scenario: Open with no network
- **WHEN** the author opens `/write/` offline after a previous visit
- **THEN** the editor and local drafts are available
