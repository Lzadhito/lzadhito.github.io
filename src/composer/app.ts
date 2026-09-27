import { type Draft, deleteDraft, getDraft, listDrafts, newId, saveDraft } from "./db";
import { effectiveTitle, loadSettings, postUrl, publish, saveSettings, unpublish } from "./github";

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
    setStatus(`Sync failed: ${(e as Error).message}. Will retry.`);
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

function editor() {
  const d = current;
  const settings = loadSettings();
  const canPublish = !!d?.text.trim();
  app.innerHTML = `
    <header>
      <button id="menu" aria-label="Drafts">☰</button>
      <span class="grow status ${statusClass}" id="status">${esc(status || (d?.published ? "Published" : d ? "Saved" : ""))}</span>
      <button id="new">New</button>
      <button id="publish" class="primary" ${canPublish ? "" : "disabled"}>${d?.published ? "Update" : "Publish"}</button>
    </header>
    <input class="title" id="title" placeholder="Title (optional)" value="${esc(d?.title ?? "")}" />
    <textarea id="body" placeholder="Start typing or dictate…" autofocus>${esc(d?.text ?? "")}</textarea>
    <footer class="bar">
      ${["**", "_", "> ", "- ", "[]()"].map((t) => `<button data-ins="${esc(t)}">${esc(t.trim() || t)}</button>`).join("")}
      ${d?.published ? `<button id="unpub" class="danger">Unpublish</button><a href="${postUrl(d.slug!)}" target="_blank" class="status">View</a>` : ""}
    </footer>
    ${settings.token ? "" : `<div class="msg">Add your GitHub token in <a href="#/settings">Settings</a> to publish.</div>`}
  `;
  const body = document.getElementById("body") as HTMLTextAreaElement;
  const title = document.getElementById("title") as HTMLInputElement;
  const publishBtn = document.getElementById("publish") as HTMLButtonElement;

  const ensure = () => {
    if (!current) current = { id: newId(), title: "", text: "", created: Date.now(), updated: Date.now() };
    return current;
  };
  const changed = () => {
    publishBtn.disabled = !body.value.trim();
    if (current?.published) publishBtn.textContent = "Update";
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

async function drafts() {
  const list = await listDrafts();
  app.innerHTML = `
    <header><button id="back">←</button><span class="grow"><b>Drafts</b></span><button id="settings">Settings</button></header>
    <div class="list">
      ${list.length ? "" : `<div class="msg">Nothing yet.</div>`}
      ${list
        .map(
          (d) => `<button class="row" data-id="${d.id}">${esc(effectiveTitle(d))}
            <small>${new Date(d.updated).toLocaleString()} · ${d.pending ? "queued" : d.published ? "published" : "draft"}</small></button>`,
        )
        .join("")}
    </div>`;
  document.getElementById("back")!.onclick = () => (location.hash = "#/");
  document.getElementById("settings")!.onclick = () => (location.hash = "#/settings");
  document.querySelectorAll<HTMLButtonElement>(".row").forEach((b) => {
    b.onclick = () => (location.hash = `#/d/${b.dataset.id}`);
    let held: number | undefined;
    b.ontouchstart = () => {
      held = window.setTimeout(async () => {
        const d = list.find((x) => x.id === b.dataset.id)!;
        if (d.published) return alert("Unpublish it first (open it, tap Unpublish).");
        if (confirm(`Delete "${effectiveTitle(d)}"?`)) {
          await deleteDraft(d.id);
          void drafts();
        }
      }, 700);
    };
    b.ontouchend = b.ontouchmove = () => clearTimeout(held);
  });
}

function settingsView() {
  const s = loadSettings();
  app.innerHTML = `
    <header><button id="back">←</button><span class="grow"><b>Settings</b></span></header>
    <div class="form">
      <label>GitHub fine-grained token (this repo only, Contents: read &amp; write)
        <input id="token" type="password" autocomplete="off" value="${esc(s.token)}" /></label>
      <label>Repository <input id="repo" value="${esc(s.repo)}" /></label>
      <label>Branch <input id="branch" value="${esc(s.branch)}" /></label>
      <button class="primary" id="save">Save</button>
      <div class="msg">The token is stored only in this browser. Delete drafts: long-press one in the list.</div>
    </div>`;
  document.getElementById("back")!.onclick = () => history.back();
  document.getElementById("save")!.onclick = () => {
    saveSettings({
      token: (document.getElementById("token") as HTMLInputElement).value.trim(),
      repo: (document.getElementById("repo") as HTMLInputElement).value.trim(),
      branch: (document.getElementById("branch") as HTMLInputElement).value.trim(),
    });
    location.hash = "#/";
    void sync();
  };
}

window.addEventListener("hashchange", render);
render().then(sync);
