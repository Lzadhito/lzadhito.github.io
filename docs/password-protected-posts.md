# Password-protected posts

Lets a post ask for a password before showing its body. Set from the composer (`/write`):
type a password in the field under the title, and that post's body is encrypted before it's
committed.

## How it works

The repo is public, and the site builds to plain static HTML — so a password prompt only
means something if what's actually committed is unreadable without it. The composer:

1. Derives an AES-256 key from the password (PBKDF2-SHA256, 300k iterations, random salt) —
   entirely in the browser, via the Web Crypto API.
2. Encrypts the post's markdown with that key (AES-GCM, random IV).
3. Commits `protected: true` in the frontmatter and the ciphertext as the body — see
   `src/lib/postCrypto.ts`.

The password itself is never committed, and never leaves the browser it's typed in (the
composer keeps it in this device's local IndexedDB, alongside the draft, purely so editing
the same post later on the same device doesn't ask again — see `docs/composer-setup.md` for
how the GitHub token is handled the same way).

On the site, `src/components/PasswordGate.astro` shows the prompt and
`src/scripts/passwordGate.ts` does the decrypting: it derives the same key from whatever's
typed and tries to AES-GCM decrypt the blob. A wrong password just fails to decrypt — there's
no separate password check to bypass. Once unlocked, the markdown is rendered client-side
(`marked`) and the password is remembered for that browser tab only (`sessionStorage`), so a
reload stays unlocked but a fresh visit asks again.

## What stays public

Only the body is locked. The title, date, description, hero image, slug, and the fact that
the post exists are all still public — in `/blog`, the RSS feed, the sitemap, and the page's
`<head>` (for link previews). Don't put anything sensitive in those.

## Threat model

This protects against a casual reader, a search engine, or someone browsing the repo on
GitHub — none of them can read the body without the password. It does **not** protect against
someone who downloads the ciphertext and brute-forces the password offline; there's no rate
limiting possible on a static site. Use a real password, not a word.

## Editing a protected post

- **Same device**: opens normally — the password is already saved locally.
- **A different device/browser**: opening it from the Drafts list asks for the password, to
  decrypt it back into editable text.
- **Forgotten password**: unrecoverable by design (no backdoor). The only way forward is
  publishing new content with a new password, which overwrites the old body.

Clearing the password field and publishing removes the protection (with a confirmation
prompt) — the post goes out as plain markdown from then on.
