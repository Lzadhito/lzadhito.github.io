# Proposal

## Why

On a post page, the Love and Share buttons sit in the top-right of the header, next to the dates. Readers decide to react or share after they finish reading, so the buttons belong at the end of the post, not before it.

## What Changes

- Move the Love + Share button group from the header meta row to the bottom-right, directly after the post content (above the "← All posts" footer).
- The header meta row keeps only the dates.
- Buttons stay visible on password-protected posts, as they are today (the share card already omits the body for protected posts).
- No change to Love/Share behavior, APIs, or the worker.

## Capabilities

### New Capabilities
- `post-actions`: where the Love and Share controls appear on a blog post page.

### Modified Capabilities
<!-- none: no existing specs -->

## Impact

- `src/layouts/BlogPost.astro`: move the `.meta-actions` markup after `.post-body`, and re-scope its CSS (currently nested under `.post .meta`).
- `LoveButton.astro` and `ShareStory.astro`: no changes (both initialize via `querySelectorAll`; `ShareStory` relies on its `<dialog>` being the trigger's next sibling, so the pair moves together).
