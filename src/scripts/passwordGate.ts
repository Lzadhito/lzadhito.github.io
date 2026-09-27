// src/scripts/passwordGate.ts — unlocks a password-protected post entirely client-side.
// `data-blob` came straight from the public repo as ciphertext; only the right password
// (never stored or sent anywhere) turns it back into the post's markdown. See
// src/lib/postCrypto.ts for the encryption itself.
import { marked } from "marked";
import { decryptBody } from "../lib/postCrypto";

const unlockedKey = (slug: string) => `unlocked:${slug}`;

function reveal(gate: HTMLElement, markdown: string) {
  gate.outerHTML = marked.parse(markdown, { async: false }) as string;
}

async function tryUnlock(gate: HTMLElement, blob: string, slug: string, password: string): Promise<boolean> {
  try {
    const markdown = await decryptBody(blob, password);
    try {
      // Per-tab only, so a reload stays unlocked but a fresh visit asks again.
      sessionStorage.setItem(unlockedKey(slug), markdown);
    } catch {
      // storage unavailable (e.g. private mode) — it'll just ask again on reload
    }
    reveal(gate, markdown);
    return true;
  } catch {
    return false;
  }
}

/** Wires up one `.password-gate` element. */
export function mount(gate: HTMLElement) {
  const slug = gate.dataset.slug!;
  const blob = gate.dataset.blob;
  if (!blob) return;

  let cached: string | null = null;
  try {
    cached = sessionStorage.getItem(unlockedKey(slug));
  } catch {
    // ignore — just asks for the password again
  }
  if (cached) return void reveal(gate, cached);

  const form = gate.querySelector<HTMLFormElement>(".password-gate-form")!;
  const input = gate.querySelector<HTMLInputElement>(".password-gate-input")!;
  const submit = gate.querySelector<HTMLButtonElement>(".password-gate-submit")!;
  const error = gate.querySelector<HTMLParagraphElement>(".password-gate-error")!;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const password = input.value;
    if (!password) return;
    submit.disabled = true;
    error.hidden = true;
    void tryUnlock(gate, blob, slug, password).then((ok) => {
      if (ok) return;
      submit.disabled = false;
      error.hidden = false;
      input.select();
    });
  });
}

export function mountAll() {
  document.querySelectorAll<HTMLElement>(".password-gate").forEach(mount);
}
