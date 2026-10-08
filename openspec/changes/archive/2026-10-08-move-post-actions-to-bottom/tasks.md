# Tasks

## 1. Move the actions

- [x] 1.1 In `src/layouts/BlogPost.astro`, move the `<span class="meta-actions">` block (LoveButton + ShareStory) out of the header `.meta` row to a new wrapper right after `.post-body` and before `.post-footer`; verify the header now shows only dates.
- [x] 1.2 Re-scope the `.meta-actions` CSS (currently under `.post .meta`) to the new wrapper, right-aligned (`justify-content: flex-end`); verify the buttons sit bottom-right at desktop and phone widths with no horizontal overflow.

## 2. Verify

- [x] 2.1 Run `npm run build` and the existing tests (`npm test` if defined); verify both pass.
- [ ] 2.2 Run the dev server and check a normal post and a password-protected post: buttons appear bottom-right in both, Share opens its dialog, Love registers a clap.
