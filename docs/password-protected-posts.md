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

The password is also saved in the post's front matter (`password: "..."`), on purpose: this is a
one-author blog, and being able to read the password on any device beats remembering it. The catch:
anyone who can read the repo can read the password and decrypt the post. The site's prompt still keeps
out readers of the website and search engines, but not someone browsing the repo on GitHub. The
composer also keeps it in this device's local IndexedDB next to the draft.

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

This protects against a casual reader of the site or a search engine. It does **not** protect against
anyone who opens the repo: the password is in the front matter next to the ciphertext. If you ever need
a post to be truly secret, don't use this.

## Editing a protected post

- **Any device**: opens normally. The password comes from the post's front matter, so there's no prompt.
  The editor's password field has a **Show** button to read it.
- **Older posts**: ones published before the password was saved don't have it in the repo. Update them once
  from a device that knows the password and it is saved from then on.
- **Forgotten password** (only for older posts that never saved one): the text can't be recovered, but the post is never stuck.
  Tap the locked post (🔒) in Drafts to open the unlock sheet. A wrong password shows an error in the
  sheet and lets you try again. "Forgot the password?" then offers **Write it again**: a fresh draft for the
  same post that keeps its title, date and link, with an empty body. Nothing changes in the repo until you
  publish, and publishing asks once to confirm that the locked text is replaced. You can **Discard** the
  draft from its banner at any time. The sheet also has **View on site** and **Delete**, neither of which
  needs the password. The old ciphertext stays in git history; only a correct guess of the old password
  could ever read it.

Clearing the password field and publishing removes the protection (with a confirmation
prompt) — the post goes out as plain markdown from then on.
