import { AUTH } from "./config";
import { authEnabled, pollForToken, requestDeviceCode } from "./auth";
import { type Draft, deleteDraft, getDraft, listDrafts, newId, saveDraft } from "./db";
import { decryptBody } from "../lib/postCrypto";
import {
  checkToken,
  effectiveTitle,
  fetchPost,
  listRemotePosts,
  loadSettings,
  postUrl,
  publish,
  saveSettings,
  unpublish,
} from "./github";

const app = document.getElementById("app")!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/write/sw.js", { scope: "/write/" }).catch(() => {});
navigator.storage?.persist?.();

let current: Draft | null = null; // null until the first keystroke, so opening the app never litters empty drafts
let status = "";
let statusClass = "";
let syncing = false;

const setStatus = (msg: string, cls = "") => {
  status = msg;
  statusClass = cls;
  const el = document.getElementById("status");
  if (el) {
    el.textContent = msg;
    el.className = `status ${cls}`;
  }
};

// ---------- sync ----------

async function sync() {
  if (syncing || !navigator.onLine) return;
  const s = loadSettings();
  if (!s.token) return;
  syncing = true;
  try {
    for (const d of await listDrafts()) {
      if (!d.pending) continue;
      setStatus(d.pending === "publish" ? "Publishing…" : "Unpublishing…");
      const done = d.pending === "publish" ? await publish(s, d) : await unpublish(s, d);
      // Keep edits typed while the request was in flight.
      const latest = (await getDraft(d.id)) ?? done;
      const merged = { ...latest, slug: done.slug, pubDate: done.pubDate, published: done.published, pending: undefined };
      await saveDraft(merged);
      if (current?.id === d.id) current = merged;
      if (d.pending === "publish") watchLive(merged);
      else setStatus("Unpublished");
    }
  } catch (e) {
    // A failed refresh clears the token: nothing will retry until the author signs in again.
    setStatus(loadSettings().token ? `Sync failed: ${(e as Error).message}. Will retry.` : (e as Error).message);
  } finally {
    syncing = false;
  }
}

async function watchLive(d: Draft) {
  setStatus("Pushed. Building…");
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    try {
      const res = await fetch(`${postUrl(d.slug!)}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        setStatus("Live ✓", "live");
        return;
      }
    } catch {}
  }
  setStatus("Pushed, but not live yet. Check GitHub Actions.");
}

window.addEventListener("online", sync);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush();
  else sync();
});
window.addEventListener("pagehide", flush);

// ---------- autosave ----------

let timer: number | undefined;
function flush() {
  clearTimeout(timer);
  if (current) void saveDraft(current);
}
function touch() {
  if (!current) return;
  current.updated = Date.now();
  clearTimeout(timer);
  timer = window.setTimeout(flush, 250);
}

// ---------- views ----------

const route = () => location.hash.replace(/^#\/?/, "");

async function render() {
  flush();
  const r = route();
  if (r === "drafts") return drafts();
  if (r === "settings") return settingsView();
  if (r.startsWith("d/")) {
    current = (await getDraft(r.slice(2))) ?? null;
  } else if (r === "new" || r === "") {
    // "new" always starts blank; bare "/write/" resumes the freshest unpublished draft.
    current = null;
    if (r === "") {
      const last = (await listDrafts()).find((d) => !d.published && !d.pending);
      if (last) current = last;
    }
  }
  editor();
}

/** Publish button label: "Update"/"Publish", with a lock shown whenever a password is set. */
const publishLabel = (d: Draft | null) => `${d?.password ? "🔒 " : ""}${d?.published ? "Update" : "Publish"}`;

function editor() {
  const d = current;
  const settings = loadSettings();
  const canPublish = !!d?.text.trim();
  // Captured before any edits, so we can tell "still has its original password" apart from
  // "password field was just cleared" when Publish is clicked.
  const hadPassword = !!d?.password;
  app.innerHTML = `
    <header>
      <button id="menu" aria-label="Drafts">☰</button>
      <span class="grow status ${statusClass}" id="status">${esc(status || (d?.published ? "Published" : d ? "Saved" : ""))}</span>
      <button id="new">New</button>
      <button id="publish" class="primary" ${canPublish ? "" : "disabled"}>${publishLabel(d)}</button>
    </header>
    <input class="title" id="title" placeholder="Title (optional)" value="${esc(d?.title ?? "")}" />
    <input class="password" id="password" type="password" autocomplete="off" placeholder="Password (optional) — locks this post" value="${esc(d?.password ?? "")}" />
    <textarea id="body" placeholder="Start typing or dictate…" autofocus>${esc(d?.text ?? "")}</textarea>
    <footer class="bar">
      ${["**", "_", "> ", "- ", "[]()"].map((t) => `<button data-ins="${esc(t)}">${esc(t.trim() || t)}</button>`).join("")}
      ${d?.published ? `<button id="unpub" class="danger">Unpublish</button><a href="${postUrl(d.slug!)}" target="_blank" class="status">View</a>` : ""}
    </footer>
    ${settings.token ? "" : `<div class="msg">Add your GitHub token in <a href="#/settings">Settings</a> to publish.</div>`}
  `;
  const body = document.getElementById("body") as HTMLTextAreaElement;
  const title = document.getElementById("title") as HTMLInputElement;
  const password = document.getElementById("password") as HTMLInputElement;
  const publishBtn = document.getElementById("publish") as HTMLButtonElement;

  const ensure = () => {
    if (!current) current = { id: newId(), title: "", text: "", created: Date.now(), updated: Date.now() };
    return current;
  };
  const changed = () => {
    publishBtn.disabled = !body.value.trim();
    publishBtn.textContent = publishLabel(current);
    setStatus("Saved");
    touch();
  };
  body.oninput = () => {
    ensure().text = body.value;
    changed();
  };
  title.oninput = () => {
    ensure().title = title.value;
    changed();
  };
  password.oninput = () => {
    ensure().password = password.value;
    changed();
  };

  document.querySelectorAll<HTMLButtonElement>("[data-ins]").forEach((b) => {
    b.onmousedown = (e) => e.preventDefault(); // keep keyboard open
    b.onclick = () => {
      const t = b.dataset.ins!;
      const { selectionStart: a, selectionEnd: z, value } = body;
      const sel = value.slice(a, z);
      const ins = t === "**" || t === "_" ? t + sel + t : t === "[]()" ? `[${sel}]()` : t + sel;
      body.setRangeText(ins, a, z, "end");
      if (t === "[]()") body.setSelectionRange(a + sel.length + 3, a + sel.length + 3);
      body.dispatchEvent(new Event("input"));
      body.focus();
    };
  });

  document.getElementById("menu")!.onclick = () => (location.hash = "#/drafts");
  document.getElementById("new")!.onclick = () => {
    flush();
    current = null;
    location.hash = "#/new";
    if (route() === "new") void render();
  };
  publishBtn.onclick = async () => {
    const d = ensure();
    d.text = body.value;
    d.title = title.value;
    d.password = password.value;
    if (d.published && hadPassword && !d.password) {
      if (!confirm("Remove the password? The post will be public.")) return;
    }
    d.pending = "publish";
    d.updated = Date.now();
    await saveDraft(d);
    if (!loadSettings().token) return void (location.hash = "#/settings");
    if (!navigator.onLine) return setStatus("Offline. Queued; will publish when back online.");
    void sync();
  };
  const unpub = document.getElementById("unpub");
  if (unpub)
    unpub.onclick = async () => {
      if (!confirm("Remove this post from the site? It stays here as a draft.")) return;
      current!.pending = "unpublish";
      await saveDraft(current!);
      void sync();
    };
}

function rowHtml(local: Draft[], remoteSlugs: string[]): string {
  if (!local.length && !remoteSlugs.length) return `<div class="msg">Nothing yet.</div>`;
  const localRows = local.map(
    (d) => `<button class="row" data-id="${d.id}">${esc(effectiveTitle(d))}
      <small>${new Date(d.updated).toLocaleString()} · ${d.pending ? "queued" : d.published ? "published" : "draft"}</small></button>`,
  );
  const remoteRows = remoteSlugs.map(
    (slug) => `<button class="row" data-remote="${esc(slug)}">${esc(slug)}<small>published</small></button>`,
  );
  return localRows.join("") + remoteRows.join("");
}

function setRemoteStatus(msg: string, cls = "") {
  document.getElementById("remoteStatus")?.remove();
  if (!msg) return;
  document.querySelector("header")?.insertAdjacentHTML("afterend", `<div class="msg ${cls}" id="remoteStatus">${esc(msg)}</div>`);
}

async function drafts() {
  const local = await listDrafts();
  app.innerHTML = `
    <header><button id="back">←</button><span class="grow"><b>Drafts</b></span><button id="settings">Settings</button></header>
    <div class="list" id="list">${rowHtml(local, [])}</div>`;
  document.getElementById("back")!.onclick = () => (location.hash = "#/");
  document.getElementById("settings")!.onclick = () => (location.hash = "#/settings");
  wireDraftRows(local);

  // Merge in posts published from other devices/browsers, so they can be opened, edited, or deleted here too.
  const s = loadSettings();
  if (!s.token) return setRemoteStatus('Sign in under Settings to also see posts published from other devices.');
  if (!navigator.onLine) return setRemoteStatus("Offline — showing drafts saved on this device only.");
  try {
    const remote = await listRemotePosts(s);
    const known = new Set(local.filter((d) => d.slug).map((d) => d.slug));
    const remoteSlugs = remote.filter((r) => !known.has(r.slug)).sort((a, b) => (a.slug < b.slug ? 1 : -1));
    if (route() !== "drafts") return; // don't clobber if the user already navigated away
    if (!remoteSlugs.length) return;
    const listEl = document.getElementById("list");
    if (listEl) listEl.innerHTML = rowHtml(local, remoteSlugs.map((r) => r.slug));
    wireDraftRows(local);
    wireRemoteRows(s);
  } catch (e) {
    setRemoteStatus(`Couldn't check GitHub for posts from other devices: ${(e as Error).message}`, "error");
  }
}

function wireDraftRows(local: Draft[]) {
  document.querySelectorAll<HTMLButtonElement>(".row[data-id]").forEach((b) => {
    b.onclick = () => (location.hash = `#/d/${b.dataset.id}`);
    let held: number | undefined;
    // Pointer events (not touch-only) so press-and-hold works with a mouse on desktop too.
    b.onpointerdown = () => {
      held = window.setTimeout(async () => {
        const d = local.find((x) => x.id === b.dataset.id)!;
        if (d.published) return alert("Unpublish it first (open it, tap Unpublish).");
        if (confirm(`Delete "${effectiveTitle(d)}"?`)) {
          await deleteDraft(d.id);
          void drafts();
        }
      }, 700);
    };
    b.onpointerup = b.onpointerleave = b.onpointercancel = () => clearTimeout(held);
  });
}

function wireRemoteRows(s: ReturnType<typeof loadSettings>) {
  document.querySelectorAll<HTMLButtonElement>(".row[data-remote]").forEach((b) => {
    const slug = b.dataset.remote!;
    b.onclick = async () => {
      b.disabled = true;
      try {
        const d = await fetchPost(s, slug);
        if (d.locked) {
          const pw = prompt(`"${slug}" is password protected. Enter its password to edit it:`);
          if (pw === null) return void (b.disabled = false); // cancelled
          try {
            d.text = await decryptBody(d.locked, pw);
            d.password = pw;
            d.locked = undefined;
          } catch {
            alert("Wrong password.");
            return void (b.disabled = false);
          }
        }
        await saveDraft(d);
        location.hash = `#/d/${d.id}`;
      } catch (e) {
        alert(`Couldn't open "${slug}": ${(e as Error).message}`);
        b.disabled = false;
      }
    };
    let held: number | undefined;
    // Pointer events (not touch-only) so press-and-hold works with a mouse on desktop too.
    b.onpointerdown = () => {
      held = window.setTimeout(async () => {
        if (!confirm(`Delete "${slug}"? It'll be removed from the site.`)) return;
        b.disabled = true;
        try {
          const full = await fetchPost(s, slug);
          const done = await unpublish(s, full);
          await saveDraft(done);
          void drafts();
        } catch (e) {
          alert(`Couldn't delete "${slug}": ${(e as Error).message}`);
          b.disabled = false;
        }
      }, 700);
    };
    b.onpointerup = b.onpointerleave = b.onpointercancel = () => clearTimeout(held);
  });
}

function tokenInfo(s: { token: string; tokenSavedAt?: number; refreshToken?: string }) {
  if (!s.token) return "No token saved. Publishing is disabled until you add one.";
  const when = s.tokenSavedAt ? ` on ${new Date(s.tokenSavedAt).toLocaleDateString()}` : "";
  return s.refreshToken ? `Signed in with GitHub${when}. Renews itself automatically.` : `Token saved${when}.`;
}

function settingsView() {
  const s = loadSettings();
  app.innerHTML = `
    <header><button id="back">←</button><span class="grow"><b>Settings</b></span></header>
    <div class="form">
      ${
        authEnabled(AUTH)
          ? `<button class="primary" id="signin">Sign in with GitHub</button><div class="msg" id="signinInfo"></div>`
          : ""
      }
      <label>GitHub fine-grained token (this repo only, Contents: read &amp; write)
        <input id="token" type="password" autocomplete="off" value="${esc(s.token)}" /></label>
      <div class="msg" id="tokenInfo">${tokenInfo(s)}</div>
      <button id="check">Test token</button>
      <label>Repository <input id="repo" value="${esc(s.repo)}" /></label>
      <label>Branch <input id="branch" value="${esc(s.branch)}" /></label>
      <button class="primary" id="save">Save</button>
      <div class="msg">The token is stored only in this browser. Delete drafts: long-press one in the list.</div>
    </div>`;
  document.getElementById("back")!.onclick = () => history.back();
  const signin = document.getElementById("signin");
  if (signin)
    signin.onclick = async () => {
      const info = document.getElementById("signinInfo")!;
      const abort = new AbortController();
      signin.setAttribute("disabled", "");
      try {
        info.textContent = "Contacting GitHub…";
        const code = await requestDeviceCode(AUTH);
        info.innerHTML = `Enter code <b id="userCode">${esc(code.user_code)}</b> at GitHub, then approve.
          <button id="openGh">Copy code &amp; open GitHub</button> <button id="cancelGh">Cancel</button>`;
        document.getElementById("openGh")!.onclick = () => {
          void navigator.clipboard?.writeText(code.user_code).catch(() => {});
          window.open(code.verification_uri, "_blank");
        };
        document.getElementById("cancelGh")!.onclick = () => abort.abort();
        const set = await pollForToken(AUTH, code, { signal: abort.signal });
        const now = Date.now();
        saveSettings({
          ...loadSettings(),
          token: set.access_token,
          refreshToken: set.refresh_token,
          expiresAt: set.expires_in ? now + set.expires_in * 1000 : undefined,
          tokenSavedAt: now,
        });
        location.hash = "#/";
        void sync();
      } catch (e) {
        info.textContent = (e as Error).message;
        signin.removeAttribute("disabled");
      }
    };
  document.getElementById("check")!.onclick = async () => {
    const info = document.getElementById("tokenInfo")!;
    const saved = loadSettings();
    if (!saved.token) return void (info.textContent = "No token saved yet. Save one first.");
    info.textContent = "Checking…";
    const err = await checkToken(saved);
    info.textContent = err ? `Token check failed: ${err}` : "Token works ✓";
  };
  document.getElementById("save")!.onclick = () => {
    const token = (document.getElementById("token") as HTMLInputElement).value.trim();
    const repo = (document.getElementById("repo") as HTMLInputElement).value.trim();
    const branch = (document.getElementById("branch") as HTMLInputElement).value.trim();
    // Build on what's stored *now*, not on `s`: a background refresh may have rotated the tokens since this
    // page rendered. Only a hand-edited token is a new (pasted) credential, so only then drop the refresh fields.
    const cur = loadSettings();
    saveSettings(
      token === s.token
        ? { ...cur, repo, branch }
        : { ...cur, repo, branch, token, refreshToken: undefined, expiresAt: undefined, tokenSavedAt: token ? Date.now() : undefined },
    );
    location.hash = "#/";
    void sync();
  };
}

window.addEventListener("hashchange", render);
render().then(sync);
