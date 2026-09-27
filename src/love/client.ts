// src/love/client.ts — Medium-style clap button: taps update the count optimistically and are
// batched into one request to the worker shortly after the last tap, capped at MAX_CLAPS per
// visitor (also enforced server-side; see worker/love.js).

export const MAX_CLAPS = 50;
const CLIENT_ID_KEY = "love-client-id";
const FLUSH_DELAY_MS = 400;

export interface LoveApi {
  proxy: string;
}

export interface LoveState {
  total: number;
  mine: number;
}

function randomId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** A random id kept only in this browser, just enough to cap claps per visitor. */
export function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return randomId(); // storage unavailable (e.g. private mode); claps just won't persist across reloads
  }
}

async function get<T>(api: LoveApi, path: string): Promise<T> {
  const res = await fetch(`${api.proxy}${path}`);
  if (!res.ok) throw new Error(`Love service error (${res.status})`);
  return res.json();
}

async function post<T>(api: LoveApi, path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${api.proxy}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Love service error (${res.status})`);
  return res.json();
}

export const fetchLove = (api: LoveApi, slug: string, clientId: string): Promise<LoveState> =>
  get(api, `/love/${slug}?clientId=${encodeURIComponent(clientId)}`);

export const sendClaps = (api: LoveApi, slug: string, clientId: string, delta: number): Promise<LoveState> =>
  post(api, `/love/${slug}`, { clientId, delta });

/** Wires up one `.love-button` element: tap to clap, optimistic count, debounced network flush. */
export function mount(root: HTMLElement, api: LoveApi) {
  const slug = root.dataset.slug!;
  const clientId = getClientId();
  const button = root.querySelector<HTMLButtonElement>(".love-tap")!;
  const countEl = root.querySelector<HTMLElement>(".love-count")!;

  let total = 0;
  let mine = 0;
  let pending = 0;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;

  const paint = () => {
    countEl.textContent = String(total);
    button.classList.toggle("is-active", mine > 0);
    button.classList.toggle("is-maxed", mine >= MAX_CLAPS);
    button.setAttribute("aria-label", mine > 0 ? `Clapped ${mine} times` : "Clap for this post");
  };

  const flush = () => {
    clearTimeout(flushTimer);
    const delta = pending;
    if (!delta) return;
    pending = 0;
    void sendClaps(api, slug, clientId, delta)
      .then((state) => {
        total = state.total;
        mine = state.mine;
        paint();
      })
      .catch(() => {
        pending += delta; // keep the optimistic count; retried on the next tap or pagehide
      });
  };

  const tap = () => {
    if (mine >= MAX_CLAPS) return;
    mine += 1;
    total += 1;
    pending += 1;
    paint();
    button.classList.remove("is-clapping");
    void button.offsetWidth; // restart the CSS animation on repeat taps
    button.classList.add("is-clapping");
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  };

  button.addEventListener("click", tap);
  window.addEventListener("pagehide", flush);

  void fetchLove(api, slug, clientId)
    .then((state) => {
      total = state.total;
      mine = state.mine;
      paint();
    })
    .catch(() => {}); // offline or first load: the button still claps optimistically
}

export function mountAll(api: LoveApi) {
  document.querySelectorAll<HTMLElement>(".love-button").forEach((el) => mount(el, api));
}
