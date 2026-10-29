import { AUTH } from "./config";
import { authEnabled, pollForToken, requestDeviceCode } from "./auth";
import { type Draft, deleteDraft, getDraft, listDrafts, newId, saveDraft } from "./db";
import { decryptBody } from "../lib/postCrypto";
import {
  checkToken,
  ConflictError,
  effectiveTitle,
  fetchPost,
  listRemotePosts,
  loadSettings,
  postUrl,
  publish,
  type RemotePost,
  replacementDraft,
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
/** An Update that was refused because the repo file changed; shown as a strip in that draft's editor. */
let conflict: { id: string; remoteOid: string; unknownBase: boolean } | null = null;

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
      let done: Draft;
      try {
        done = d.pending === "publish" ? await publish(s, d) : await unpublish(s, d);
      } catch (e) {
        if (!(e instanceof ConflictError)) throw e;
        // Nothing was written. Keep the author's text, stop retrying, and let them choose.
        await saveDraft({ ...((await getDraft(d.id)) ?? d), pending: undefined });
        conflict = { id: d.id, remoteOid: e.remoteOid, unknownBase: e.unknownBase };
        setStatus("Not published: the repo has a different version.", "error");
        if (current?.id === d.id) current = (await getDraft(d.id)) ?? current;
        if (route().startsWith("d/") && current?.id === d.id) editor();
        continue;
      }
      // Keep edits typed while the request was in flight (including ones the autosave debounce hasn't written yet).
      if (current?.id === d.id) await saveDraft(current);
      const latest = (await getDraft(d.id)) ?? done;
      const merged = { ...latest, slug: done.slug, pubDate: done.pubDate, published: done.published, baseOid: done.baseOid, pending: undefined, replacesLocked: d.pending === "publish" ? undefined : latest.replacesLocked };
      await saveDraft(merged);
      if (current?.id === d.id) {
        current = merged;
        if (!["drafts", "settings"].includes(route())) editor(); // refresh View link, Update label and menu items
      }
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
  else {
    void sync();
    void checkForUpdate();
  }
});
window.addEventListener("pagehide", flush);

// ---------- app updates ----------

const appScript = () => document.querySelector('script[type="module"][src*="/_astro/"]')?.getAttribute("src");

/** An installed app can stay open for days. When it comes back to the front, say so if a newer build is online. */
async function checkForUpdate() {
  const running = appScript();
  if (!running || !navigator.onLine || document.getElementById("update")) return;
  try {
    const html = await (await fetch("/write/", { cache: "no-store" })).text();
    const latest = html.match(/<script[^>]*type="module"[^>]*src="([^"]*\/_astro\/[^"]+)"/)?.[1];
    if (!latest || latest === running) return;
    document.body.insertAdjacentHTML("beforeend", `<div id="update">Update available. <button id="reload">Reload</button></div>`);
    document.getElementById("reload")!.onclick = () => location.reload(); // never automatic: the author may be mid-sentence
  } catch {} // offline or a blip: try again next time
}

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

// ---------- toast ----------

/** Short-lived message with one action. Lives on <body> so view re-renders don't wipe it. */
function toast(msg: string, action: string, onAction: () => void) {
  document.getElementById("toast")?.remove();
  const el = document.createElement("div");
  el.id = "toast";
  el.innerHTML = `<span>${esc(msg)}</span><button>${esc(action)}</button>`;
  el.querySelector("button")!.onclick = () => {
    el.remove();
    onAction();
  };
  document.body.append(el);
  setTimeout(() => el.remove(), 5000);
}

// iOS keeps 100dvh when the keyboard opens; size the app to what is actually visible so the format bar sits above it.
const vv = window.visualViewport;
if (vv) {
  const fit = () => (app.style.height = `${vv.height}px`);
  vv.addEventListener("resize", fit);
  fit();
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
  const published = !!d?.published;
  app.innerHTML = `
    <header>
      <button id="back" class="icon" aria-label="Back to drafts">←</button>
      <span class="grow">
        <span class="status ${statusClass}" id="status">${esc(status || (published ? "Published" : d ? "Saved" : ""))}</span>
        ${published ? `<a id="view" class="viewlink" href="${postUrl(d!.slug!)}" target="_blank" rel="noopener">View ↗</a>` : ""}
      </span>
      <button id="menu" class="icon" aria-label="More actions">⋯</button>
      <button id="publish" class="primary" ${canPublish ? "" : "disabled"}>${publishLabel(d)}</button>
    </header>
    <input class="title" id="title" placeholder="Title (optional)" value="${esc(d?.title ?? "")}" />
    <textarea id="body" placeholder="Start typing or dictate…" autofocus>${esc(d?.text ?? "")}</textarea>
    <footer class="bar">
      ${["**", "_", "> ", "- ", "[]()"].map((t) => `<button data-ins="${esc(t)}">${esc(t.trim() || t)}</button>`).join("")}
    </footer>
    ${
      conflict && d && conflict.id === d.id
        ? `<div class="msg error" id="conflict">${conflict.unknownBase ? "This post already exists in the repo and this copy doesn't know which version it came from." : "This post changed in the repo since you opened it."} Your text is kept.
            <button id="loadRepo">Load repo version</button> <button id="overwrite">Overwrite</button></div>`
        : ""
    }
    ${
      d?.replacesLocked
        ? `<div class="msg" id="replaceBanner">Replacing a locked post. Its old text can't be recovered, and nothing changes until you publish.
            <button id="discardReplace">Discard</button></div>`
        : ""
    }
    ${settings.token ? "" : `<div class="msg" id="signedOutNote">${d?.pending ? `Queued on this device. It will publish after you <a href="#/settings">sign in</a>.` : `Saved on this device. <a href="#/settings">Sign in</a> to publish.`}</div>`}
    <dialog id="sheet">
      <div class="sheet">
        ${published ? `<a class="item" id="viewPost" href="${postUrl(d!.slug!)}" target="_blank" rel="noopener">View post</a>` : ""}
        <button class="item" id="new">New draft</button>
        <button class="item" id="setpw">Set password</button>
        <div id="pwRow" ${d?.password ? "" : "hidden"}>
          <input class="password" id="password" type="password" autocomplete="off" placeholder="Password — locks this post" value="${esc(d?.password ?? "")}" />
        </div>
        ${published ? `<div class="danger-zone"><button class="item danger" id="unpub">Unpublish</button></div>` : ""}
        ${d && !published ? `<div class="danger-zone"><button class="item danger" id="delete">Delete</button></div>` : ""}
      </div>
    </dialog>
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

  const sheet = document.getElementById("sheet") as HTMLDialogElement;
  document.getElementById("back")!.onclick = () => (location.hash = "#/drafts"); // render() flushes pending typing first
  document.getElementById("menu")!.onclick = () => sheet.showModal();
  sheet.onclick = (e) => {
    if (e.target === sheet) sheet.close(); // a tap on the backdrop lands on the dialog itself
  };
  sheet.querySelectorAll<HTMLElement>(".item:not(#setpw)").forEach((el) => el.addEventListener("click", () => sheet.close()));
  document.getElementById("setpw")!.onclick = () => {
    document.getElementById("pwRow")!.hidden = false;
    password.focus();
  };
  document.getElementById("new")!.onclick = () => {
    flush();
    current = null;
    location.hash = "#/new";
    if (route() === "new") void render();
  };
  const del = document.getElementById("delete");
  if (del)
    del.onclick = async () => {
      const gone = current!;
      clearTimeout(timer); // a pending autosave must not bring it back
      current = null;
      await deleteDraft(gone.id);
      location.hash = "#/drafts";
      toast(`Deleted "${effectiveTitle(gone)}"`, "Undo", async () => {
        await saveDraft(gone);
        if (route() === "drafts") void drafts();
      });
    };
  const discard = document.getElementById("discardReplace");
  if (discard)
    discard.onclick = async () => {
      const gone = current!;
      clearTimeout(timer); // a pending autosave must not bring it back
      current = null;
      await deleteDraft(gone.id);
      location.hash = "#/drafts";
    };
  publishBtn.onclick = async () => {
    const d = ensure();
    d.text = body.value;
    d.title = title.value;
    d.password = password.value;
    if (d.replacesLocked && !confirm("This replaces the locked text. It can't be undone. Publish?")) return;
    if (d.published && hadPassword && !d.password) {
      if (!confirm("Remove the password? The post will be public.")) return;
    }
    d.pending = "publish";
    d.updated = Date.now();
    await saveDraft(d);
    if (!loadSettings().token) {
      setStatus("Queued. Will publish after you sign in.");
      return void (location.hash = "#/settings");
    }
    if (!navigator.onLine) return setStatus("Offline. Queued; will publish when back online.");
    void sync();
  };
  const keepMine = document.getElementById("overwrite");
  if (keepMine)
    keepMine.onclick = async () => {
      const mine = { ...ensure(), text: body.value, title: title.value, baseOid: conflict!.remoteOid, pending: "publish" as const, updated: Date.now() };
      conflict = null;
      current = mine;
      await saveDraft(mine);
      void sync();
    };
  const loadRepo = document.getElementById("loadRepo");
  if (loadRepo)
    loadRepo.onclick = async () => {
      const mine = { ...ensure(), text: body.value, title: title.value };
      (loadRepo as HTMLButtonElement).disabled = true;
      try {
        const theirs = await openRemoteDraft(loadSettings(), mine.slug!, mine.password);
        if (!theirs) return void ((loadRepo as HTMLButtonElement).disabled = false);
        // The author's version survives as its own unpublished draft.
        await saveDraft({ ...mine, id: newId(), title: `${effectiveTitle(mine)} (my edit)`, slug: undefined, pubDate: undefined, published: false, pending: undefined, baseOid: undefined });
        await saveDraft({ ...theirs, id: mine.id });
        conflict = null;
        current = { ...theirs, id: mine.id };
        setStatus("Loaded the repo version. Your edit is saved as a separate draft.");
        editor();
      } catch (e) {
        alert(`Couldn't load the repo version: ${(e as Error).message}`);
        (loadRepo as HTMLButtonElement).disabled = false;
      }
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

const localRowsHtml = (local: Draft[]) =>
  local
    .map(
      (d) => `<button class="row" data-id="${d.id}">${esc(effectiveTitle(d))}
      <small>${new Date(d.updated).toLocaleString()} · ${d.pending ? "queued" : d.published ? "published" : "draft"}${d.replacesLocked ? " · replaces a locked post" : ""}</small></button>`,
    )
    .join("");

/** What the Drafts list knows about posts published elsewhere. One state, one place on screen. */
type RemoteState = { k: "signed-out" | "loading" | "offline" } | { k: "error"; msg: string } | { k: "ready"; posts: RemotePost[] };

function remoteSlotHtml(local: Draft[], st: RemoteState): string {
  switch (st.k) {
    case "loading":
      return `<div class="msg">Checking GitHub for posts from your other devices…</div>`;
    case "offline":
      return `<div class="msg">Offline. Showing drafts saved on this device only.</div>`;
    case "error":
      return `<div class="msg error">Couldn't check GitHub for posts from other devices: ${esc(st.msg)}</div>
        <div class="gap"><button id="retry">Try again</button></div>`;
    case "signed-out":
      return `<div class="gap" id="remoteGap">
        <p>Posts from your other devices aren't showing yet.</p>
        ${authEnabled(AUTH) ? `<button class="primary" id="gapSignin">Sign in with GitHub</button><div class="msg" id="gapInfo"></div>` : ""}
        <a href="#/settings">${authEnabled(AUTH) ? "Or paste a token in Settings" : "Add a token in Settings"}</a>
      </div>`;
    case "ready":
      if (!st.posts.length) return local.length ? "" : `<div class="msg">Nothing yet.</div>`;
      return st.posts
        .map((r) => {
          const when = r.pubDate && !isNaN(Date.parse(r.pubDate)) ? `${new Date(r.pubDate).toLocaleDateString()} · ` : "";
          return `<button class="row" data-remote="${esc(r.slug)}">${r.protected ? "🔒 " : ""}${esc(r.title)}<small>${when}published</small></button>`;
        })
        .join("");
  }
}

function renderRemoteSlot(local: Draft[], st: RemoteState) {
  const slot = document.getElementById("remoteSlot");
  if (!slot) return; // navigated away
  slot.innerHTML = remoteSlotHtml(local, st);
  wireRemoteRows(loadSettings());
  const retry = document.getElementById("retry");
  if (retry) retry.onclick = () => void loadRemote(local);
  const gap = document.getElementById("gapSignin");
  if (gap)
    gap.onclick = () =>
      startSignIn(gap as HTMLButtonElement, document.getElementById("gapInfo")!, () => {
        void sync();
        void loadRemote(local);
      });
}

/** Merge in posts published from other devices/browsers, so they can be opened, edited, or deleted here too. */
async function loadRemote(local: Draft[]) {
  const s = loadSettings();
  if (!s.token) return renderRemoteSlot(local, { k: "signed-out" });
  if (!navigator.onLine) return renderRemoteSlot(local, { k: "offline" });
  renderRemoteSlot(local, { k: "loading" });
  try {
    const remote = await listRemotePosts(s);
    const known = new Set(local.filter((d) => d.slug).map((d) => d.slug));
    const posts = remote.filter((r) => !known.has(r.slug));
    if (route() !== "drafts") return;
    renderRemoteSlot(local, { k: "ready", posts });
    // One row per post: a local copy stays its own row, flagged when the repo has moved on since it was loaded.
    for (const d of local) {
      const r = remote.find((x) => x.slug === d.slug);
      if (r && d.baseOid && r.oid && r.oid !== d.baseOid)
        document.querySelector(`.row[data-id="${d.id}"] small`)?.append(" · newer version in repo");
    }
  } catch (e) {
    if (route() === "drafts") renderRemoteSlot(local, { k: "error", msg: (e as Error).message });
  }
}

async function drafts() {
  const local = await listDrafts();
  app.innerHTML = `
    <header><button id="back">←</button><span class="grow"><b>Drafts</b></span><button id="settings">Settings</button></header>
    <div class="list" id="list">${localRowsHtml(local)}<div id="remoteSlot"></div></div>`;
  document.getElementById("back")!.onclick = () => (location.hash = "#/");
  document.getElementById("settings")!.onclick = () => (location.hash = "#/settings");
  wireDraftRows(local);
  await loadRemote(local);
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

/** Fetches a repo post as a Draft, unlocking it with `knownPassword` or by asking in the unlock sheet. Null if the author backs out. */
async function openRemoteDraft(s: ReturnType<typeof loadSettings>, slug: string, knownPassword?: string): Promise<Draft | null> {
  const d = await fetchPost(s, slug);
  if (!d.locked) return d;
  if (knownPassword) {
    try {
      return { ...d, text: await decryptBody(d.locked, knownPassword), password: knownPassword, locked: undefined };
    } catch {} // the password changed elsewhere: fall through and ask
  }
  const r = await unlockSheet(s, d, false);
  return r === "deleted" ? null : r;
}

/** Bottom sheet for a locked post: password with inline errors, and (from the list) the ways out when it's forgotten.
 * Resolves to the unlocked or replacement draft, "deleted", or null when dismissed. */
function unlockSheet(s: ReturnType<typeof loadSettings>, d: Draft, manage: boolean): Promise<Draft | "deleted" | null> {
  return new Promise((resolve) => {
    const dlg = document.createElement("dialog");
    dlg.id = "unlock";
    document.body.append(dlg);
    let done = false;
    const settle = (v: Draft | "deleted" | null) => {
      if (done) return;
      done = true;
      dlg.close();
      dlg.remove();
      resolve(v);
    };
    dlg.onclick = (e) => {
      if (e.target === dlg) settle(null);
    };
    dlg.addEventListener("close", () => settle(null)); // Escape
    const head = `<h3>${esc(effectiveTitle(d))}</h3>`;

    const askPassword = () => {
      dlg.innerHTML = `<div class="sheet">${head}<p>This post is locked.</p>
        <form id="unlockForm">
          <div class="pwline"><input id="unlockPw" type="password" autocomplete="off" placeholder="Password" aria-label="Password" />
            <button type="button" id="reveal">Show</button></div>
          <div class="msg error" id="unlockErr" role="alert" hidden>Wrong password. Try again.</div>
          <button class="primary" id="unlockGo" type="submit">Unlock and edit</button>
        </form>
        ${
          manage
            ? `<button class="item" id="forgot">Forgot the password?</button>
               <a class="item" href="${postUrl(d.slug!)}" target="_blank" rel="noopener">View on site</a>
               <div class="danger-zone"><button class="item danger" id="unlockDelete">Delete</button></div>`
            : ""
        }</div>`;
      const pw = dlg.querySelector<HTMLInputElement>("#unlockPw")!;
      const err = dlg.querySelector<HTMLElement>("#unlockErr")!;
      const go = dlg.querySelector<HTMLButtonElement>("#unlockGo")!;
      pw.focus();
      dlg.querySelector<HTMLButtonElement>("#reveal")!.onclick = (e) => {
        const show = pw.type === "password";
        pw.type = show ? "text" : "password";
        (e.currentTarget as HTMLButtonElement).textContent = show ? "Hide" : "Show";
      };
      dlg.querySelector<HTMLFormElement>("#unlockForm")!.onsubmit = async (e) => {
        e.preventDefault();
        go.disabled = true;
        try {
          const text = await decryptBody(d.locked!, pw.value);
          settle({ ...d, text, password: pw.value, locked: undefined });
        } catch {
          err.hidden = false;
          go.disabled = false;
          pw.focus();
          pw.select();
        }
      };
      if (!manage) return;
      dlg.querySelector<HTMLButtonElement>("#forgot")!.onclick = forgot;
      dlg.querySelector<HTMLButtonElement>("#unlockDelete")!.onclick = async () => {
        if (!confirm(`Delete "${effectiveTitle(d)}"? It'll be removed from the site.`)) return;
        try {
          await unpublish(s, d);
          settle("deleted");
        } catch (e) {
          err.textContent = `Couldn't delete: ${(e as Error).message}`;
          err.hidden = false;
        }
      };
    };

    const forgot = () => {
      dlg.innerHTML = `<div class="sheet">${head}
        <p>The text can't be recovered. Nobody can open it, including you. That is what the lock is for.</p>
        <p><b>Kept:</b> title, date and link.<br><b>Replaced:</b> the locked text, when you publish.</p>
        <button class="primary" id="rewrite">Write it again</button>
        <button class="item" id="backToPw">Back, let me try the password</button></div>`;
      dlg.querySelector<HTMLButtonElement>("#rewrite")!.onclick = () => settle(replacementDraft(d));
      dlg.querySelector<HTMLButtonElement>("#backToPw")!.onclick = askPassword;
    };

    askPassword();
    dlg.showModal();
  });
}

function wireRemoteRows(s: ReturnType<typeof loadSettings>) {
  document.querySelectorAll<HTMLButtonElement>(".row[data-remote]").forEach((b) => {
    const slug = b.dataset.remote!;
    b.onclick = async () => {
      b.disabled = true;
      try {
        const fetched = await fetchPost(s, slug);
        const d = fetched.locked ? await unlockSheet(s, fetched, true) : fetched;
        if (d === "deleted") return void drafts();
        if (!d) return void (b.disabled = false); // dismissed
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
          if (!full.locked) await saveDraft(done); // a locked post has no readable text to keep
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

/** GitHub device flow, shown in `info`: code + "open GitHub" + Cancel. Saves the token set, then calls `onDone`. */
async function startSignIn(btn: HTMLButtonElement, info: HTMLElement, onDone: () => void) {
  const abort = new AbortController();
  btn.setAttribute("disabled", "");
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
    onDone();
  } catch (e) {
    info.textContent = (e as Error).message;
    btn.removeAttribute("disabled");
  }
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
    signin.onclick = () =>
      startSignIn(signin as HTMLButtonElement, document.getElementById("signinInfo")!, () => {
        location.hash = "#/";
        void sync();
      });
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
