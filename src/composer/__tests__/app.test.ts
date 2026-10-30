// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Draft } from "../db";

const publishMock = vi.fn(async (_s: unknown, d: Draft): Promise<Draft> => ({
  ...d,
  slug: "2026-09-27-test",
  pubDate: "2026-09-27T00:00:00.000Z",
  published: true,
  pending: undefined,
}));
const unpublishMock = vi.fn(async (_s: unknown, d: Draft): Promise<Draft> => ({ ...d, published: false, pending: undefined }));
type RP = { slug: string; title: string; pubDate?: string; oid: string; protected?: boolean };
const rp = (slug: string, over: Partial<RP> = {}): RP => ({ slug, title: slug, oid: `oid-${slug}`, ...over });
const listRemotePostsMock = vi.fn(async () => [] as RP[]);
const fetchPostMock = vi.fn(async (_s: unknown, slug: string): Promise<Draft> => ({
  id: `remote-${slug}`,
  title: slug,
  text: `content of ${slug}`,
  created: 0,
  updated: 0,
  slug,
  pubDate: "2026-01-01",
  published: true,
}));

vi.mock("../github", async (orig) => ({
  ...(await orig<typeof import("../github")>()),
  publish: (...a: [unknown, Draft]) => publishMock(...a),
  unpublish: (...a: [unknown, Draft]) => unpublishMock(...a),
  listRemotePosts: (...a: [unknown]) => listRemotePostsMock(...a),
  fetchPost: (...a: [unknown, string]) => fetchPostMock(...a),
}));

const authMock = vi.hoisted(() => ({
  requestDeviceCode: vi.fn(),
  pollForToken: vi.fn(),
}));
vi.mock("../config", () => ({ AUTH: { clientId: "cid", proxy: "https://proxy.test" } }));
vi.mock("../auth", async (orig) => ({ ...(await orig<typeof import("../auth")>()), ...authMock }));

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const online = (v: boolean) => Object.defineProperty(navigator, "onLine", { value: v, configurable: true });

// app.ts registers global listeners at import; drop the previous instance's before re-importing.
const listeners: [EventTarget, string, EventListener][] = [];
for (const target of [window, document]) {
  const add = target.addEventListener.bind(target);
  target.addEventListener = ((type: string, fn: EventListener, opts?: any) => {
    listeners.push([target, type, fn]);
    add(type, fn, opts);
  }) as typeof target.addEventListener;
}
const dropListeners = () => {
  for (const [t, type, fn] of listeners.splice(0)) t.removeEventListener(type, fn);
};

async function boot(hash = "") {
  dropListeners();
  vi.resetModules();
  document.body.innerHTML = '<div id="app"></div>';
  location.hash = hash;
  await import("../app");
  await tick(10);
  const db = await import("../db");
  return db;
}

// jsdom has no <dialog> modal API; mimic just the open/close state.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute("open");
};
const menuItems = () => [...document.querySelectorAll("#sheet .item")].map((e) => e.textContent);

const type = (el: HTMLTextAreaElement | HTMLInputElement, v: string) => {
  el.value = v;
  el.dispatchEvent(new Event("input"));
};

beforeEach(async () => {
  window.dispatchEvent(new Event("pagehide")); // the previous instance's pending autosave must not re-create a draft after the wipe below
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    clear: () => store.clear(),
  });
  publishMock.mockClear();
  unpublishMock.mockClear();
  listRemotePostsMock.mockClear();
  listRemotePostsMock.mockResolvedValue([]);
  fetchPostMock.mockClear();
  online(true);
  await tick(30); // let the previous test's in-flight writes land before wiping
  const { listDrafts, deleteDraft } = await import("../db");
  for (const d of await listDrafts()) await deleteDraft(d.id);
});

describe("editor", () => {
  it("does not create a draft until something is typed", async () => {
    const db = await boot();
    expect(await db.listDrafts()).toHaveLength(0);
    expect($<HTMLButtonElement>("#publish").disabled).toBe(true);
  });

  it("autosaves after a debounce and enables Publish", async () => {
    const db = await boot();
    type($("#body"), "thought on the road");
    expect($<HTMLButtonElement>("#publish").disabled).toBe(false);
    expect(await db.listDrafts()).toHaveLength(0); // debounced
    await tick(400);
    const [d] = await db.listDrafts();
    expect(d.text).toBe("thought on the road");
  });

  it("flushes immediately when the page is hidden", async () => {
    const db = await boot();
    type($("#body"), "quick");
    window.dispatchEvent(new Event("pagehide"));
    await tick(20);
    expect((await db.listDrafts())[0]?.text).toBe("quick");
  });

  it("inserts markdown around the selection", async () => {
    await boot();
    const body = $<HTMLTextAreaElement>("#body");
    type(body, "hello world");
    body.setSelectionRange(6, 11);
    $<HTMLButtonElement>('[data-ins="**"]').click();
    expect(body.value).toBe("hello **world**");
  });

  it("escapes HTML in restored drafts", async () => {
    const db = await boot();
    await db.saveDraft({ id: "x", title: '"><b>', text: "</textarea><script>", created: 1, updated: 1 });
    await boot("#/d/x");
    expect($<HTMLTextAreaElement>("#body").value).toBe("</textarea><script>");
    expect(document.querySelector("script")).toBeNull();
  });
});

describe("editor actions", () => {
  it("shows only back, status, menu and the primary button in the header", async () => {
    await boot();
    const ids = [...document.querySelectorAll("header [id]")].map((e) => e.id);
    expect(ids).toEqual(["back", "status", "menu", "publish"]);
    expect(document.querySelectorAll("header button.primary")).toHaveLength(1);
  });

  it("back saves typing and goes to the drafts list without asking", async () => {
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);
    const db = await boot();
    type($("#body"), "typed just now");
    $<HTMLButtonElement>("#back").click();
    await tick(50);
    expect(location.hash).toBe("#/drafts");
    expect(document.body.textContent).toContain("Drafts");
    expect((await db.listDrafts())[0].text).toBe("typed just now");
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("shows a View link only for published posts", async () => {
    const db = await boot();
    await db.saveDraft({ id: "a", title: "t", text: "b", created: 1, updated: 1 });
    await db.saveDraft({ id: "b", title: "t", text: "b", created: 1, updated: 1, slug: "my-slug", published: true });
    await boot("#/d/a");
    expect(document.getElementById("view")).toBeNull();
    await boot("#/d/b");
    expect($<HTMLAnchorElement>("#view").getAttribute("href")).toMatch(/my-slug/);
  });

  it("lists the right menu items for a draft and for a published post, and closes on a backdrop tap", async () => {
    const db = await boot();
    await db.saveDraft({ id: "a", title: "t", text: "b", created: 1, updated: 1 });
    await db.saveDraft({ id: "b", title: "t", text: "b", created: 1, updated: 1, slug: "s", published: true });
    await boot("#/d/a");
    $<HTMLButtonElement>("#menu").click();
    expect($("#sheet").hasAttribute("open")).toBe(true);
    expect(menuItems()).toEqual(["New draft", "Set password", "Delete"]);
    $("#sheet").click(); // target is the dialog itself = backdrop
    expect($("#sheet").hasAttribute("open")).toBe(false);
    await boot("#/d/b");
    expect(menuItems()).toEqual(["View post", "New draft", "Set password", "Unpublish"]);
  });

  it("sets a password from the menu and marks the Publish button with a lock", async () => {
    await boot();
    type($("#body"), "secret");
    expect($("#pwRow").hidden).toBe(true);
    $<HTMLButtonElement>("#setpw").click();
    expect($("#pwRow").hidden).toBe(false);
    type($("#password"), "pw");
    expect($("#publish").textContent).toMatch(/🔒/);
  });

  it("deletes a draft at once and brings it back with Undo", async () => {
    const db = await boot();
    await db.saveDraft({ id: "a", title: "keep me", text: "body", password: "pw", created: 1, updated: 1 });
    await boot("#/d/a");
    $<HTMLButtonElement>("#delete").click();
    await tick(50);
    expect(await db.getDraft("a")).toBeUndefined();
    expect(location.hash).toBe("#/drafts");
    $<HTMLButtonElement>("#toast button").click();
    await tick(50);
    expect(await db.getDraft("a")).toMatchObject({ title: "keep me", text: "body", password: "pw" });
    expect(document.getElementById("toast")).toBeNull();
  });

  it("keeps a deleted draft deleted once the Undo toast expires", async () => {
    const db = await boot();
    await db.saveDraft({ id: "a", title: "t", text: "body", created: 1, updated: 1 });
    await boot("#/d/a");
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    try {
      $<HTMLButtonElement>("#delete").click();
      await vi.advanceTimersByTimeAsync(5100);
      expect(document.getElementById("toast")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
    expect(await db.getDraft("a")).toBeUndefined();
  });

  it("does not resurrect a deleted draft via the pending autosave", async () => {
    const db = await boot();
    await db.saveDraft({ id: "a", title: "t", text: "body", created: 1, updated: 1 });
    await boot("#/d/a");
    type($("#body"), "edited"); // autosave now pending
    $<HTMLButtonElement>("#delete").click();
    await tick(500);
    expect(await db.getDraft("a")).toBeUndefined();
  });

  it("offers Delete only after an unpublish completes", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    const db = await boot();
    await db.saveDraft({ id: "p", title: "t", text: "body", created: 1, updated: 1, slug: "s", pubDate: "d", published: true });
    await boot("#/d/p");
    expect(menuItems()).not.toContain("Delete");
    vi.stubGlobal("confirm", () => true);
    $<HTMLButtonElement>("#unpub").click();
    await tick(50);
    expect(menuItems()).toContain("Delete");
    expect(menuItems()).not.toContain("Unpublish");
  });

  it("does not unpublish when the confirmation is declined", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    const db = await boot();
    await db.saveDraft({ id: "p", title: "t", text: "body", created: 1, updated: 1, slug: "s", pubDate: "d", published: true });
    await boot("#/d/p");
    vi.stubGlobal("confirm", () => false);
    $<HTMLButtonElement>("#unpub").click();
    await tick(50);
    expect(unpublishMock).not.toHaveBeenCalled();
    expect((await db.getDraft("p"))?.published).toBe(true);
  });
});

describe("publishing", () => {
  it("sends the draft to GitHub and shows Update afterwards", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    const db = await boot();
    type($("#body"), "hello");
    type($("#title"), "My title");
    $<HTMLButtonElement>("#publish").click();
    await tick(50);
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock.mock.calls[0][1]).toMatchObject({ title: "My title", text: "hello" });
    const [d] = await db.listDrafts();
    expect(d).toMatchObject({ published: true, slug: "2026-09-27-test", pending: undefined });
  });

  it("goes to Settings when no token is saved, keeping the draft queued", async () => {
    const db = await boot();
    type($("#body"), "hello");
    $<HTMLButtonElement>("#publish").click();
    await tick(50);
    expect(location.hash).toBe("#/settings");
    expect(publishMock).not.toHaveBeenCalled();
    expect((await db.listDrafts())[0].pending).toBe("publish");
  });

  it("queues offline and publishes when back online", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    const db = await boot();
    online(false);
    type($("#body"), "offline note");
    $<HTMLButtonElement>("#publish").click();
    await tick(50);
    expect(publishMock).not.toHaveBeenCalled();
    expect($("#status").textContent).toMatch(/Queued/);
    online(true);
    window.dispatchEvent(new Event("online"));
    await tick(50);
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect((await db.listDrafts())[0].published).toBe(true);
  });

  it("keeps the draft queued and reports the error when GitHub fails", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    publishMock.mockRejectedValueOnce(new Error("boom"));
    const db = await boot();
    type($("#body"), "x");
    $<HTMLButtonElement>("#publish").click();
    await tick(50);
    expect($("#status").textContent).toMatch(/Sync failed: boom/);
    expect((await db.listDrafts())[0].pending).toBe("publish");
  });

  it("unpublishes after confirmation", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    const db = await boot();
    await db.saveDraft({ id: "p", title: "t", text: "body", created: 1, updated: 1, slug: "s", pubDate: "d", published: true });
    await boot("#/d/p");
    vi.stubGlobal("confirm", () => true);
    $<HTMLButtonElement>("#unpub").click();
    await tick(50);
    expect(unpublishMock).toHaveBeenCalledTimes(1);
    expect((await db.getDraft("p"))?.published).toBe(false);
  });
});

describe("drafts and settings views", () => {
  it("lists drafts newest first with their state", async () => {
    const db = await boot();
    await db.saveDraft({ id: "a", title: "Older", text: "a", created: 1, updated: 1 });
    await db.saveDraft({ id: "b", title: "Newer", text: "b", created: 2, updated: 2, published: true, slug: "s" });
    await boot("#/drafts");
    const rows = [...document.querySelectorAll(".row")].map((r) => r.textContent!.replace(/\s+/g, " "));
    expect(rows[0]).toMatch(/Newer.*published/);
    expect(rows[1]).toMatch(/Older.*draft/);
  });

  it("opens a draft from the list", async () => {
    const db = await boot();
    await db.saveDraft({ id: "a", title: "Older", text: "content a", created: 1, updated: 1 });
    await boot("#/drafts");
    $<HTMLButtonElement>(".row").click();
    await tick(20);
    expect($<HTMLTextAreaElement>("#body").value).toBe("content a");
  });

  it("merges in remote-only posts and opens one, caching it locally", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    listRemotePostsMock.mockResolvedValue([rp("hand-written-post")]);
    const db = await boot("#/drafts");
    await tick(20);
    const row = $<HTMLButtonElement>('.row[data-remote="hand-written-post"]');
    expect(row.textContent).toMatch(/hand-written-post.*published/s);
    row.click();
    await tick(20);
    expect(fetchPostMock).toHaveBeenCalledWith(expect.anything(), "hand-written-post");
    expect($<HTMLTextAreaElement>("#body").value).toBe("content of hand-written-post");
    expect((await db.listDrafts())[0]).toMatchObject({ slug: "hand-written-post", published: true });
  });

  it("offers sign-in under the local drafts when no token is saved", async () => {
    const db = await boot();
    await db.saveDraft({ id: "a", title: "Mine", text: "a", created: 1, updated: 1 });
    await boot("#/drafts");
    await tick(20);
    expect($("#remoteGap").textContent).toMatch(/other devices aren't showing yet/);
    expect($("#gapSignin").textContent).toBe("Sign in with GitHub");
    expect($<HTMLAnchorElement>("#remoteGap a").getAttribute("href")).toBe("#/settings");
    expect(document.querySelector("#list .row[data-id]")!.compareDocumentPosition($("#remoteGap"))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(listRemotePostsMock).not.toHaveBeenCalled();
  });

  it("signs in from the Drafts block and fills the list in place", async () => {
    authMock.requestDeviceCode.mockResolvedValue({
      device_code: "dc", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 5,
    });
    authMock.pollForToken.mockResolvedValue({ access_token: "gho_new", refresh_token: "ghr_new", expires_in: 28800 });
    listRemotePostsMock.mockResolvedValue([rp("from-phone")]);
    await boot("#/drafts");
    await tick(20);
    $<HTMLButtonElement>("#gapSignin").click();
    await tick(80);
    expect(JSON.parse(localStorage.getItem("composer-settings")!)).toMatchObject({ token: "gho_new" });
    expect(location.hash).toBe("#/drafts");
    expect(document.getElementById("remoteGap")).toBeNull();
    expect($('.row[data-remote="from-phone"]')).toBeTruthy();
  });

  it("restores the Drafts block with the reason when sign-in fails", async () => {
    authMock.requestDeviceCode.mockRejectedValue(new Error("Device flow must be enabled"));
    await boot("#/drafts");
    await tick(20);
    $<HTMLButtonElement>("#gapSignin").click();
    await tick(30);
    expect($("#gapInfo").textContent).toBe("Device flow must be enabled");
    expect($<HTMLButtonElement>("#gapSignin").disabled).toBe(false);
  });

  it("offers only Settings when sign-in is not configured", async () => {
    vi.resetModules();
    vi.doMock("../config", () => ({ AUTH: { clientId: "", proxy: "" } }));
    await boot("#/drafts");
    await tick(20);
    expect(document.getElementById("gapSignin")).toBeNull();
    expect($("#remoteGap a").textContent).toMatch(/Settings/);
    vi.doMock("../config", () => ({ AUTH: { clientId: "cid", proxy: "https://proxy.test" } }));
  });

  it("retries loading remote posts from the error state, keeping local rows", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    const db = await boot();
    listRemotePostsMock.mockRejectedValue(new Error("boom"));
    await db.saveDraft({ id: "a", title: "Mine", text: "a", created: 1, updated: 1 });
    await boot("#/drafts");
    await tick(20);
    expect($(".msg.error").textContent).toMatch(/boom/);
    expect(document.querySelector('.row[data-id="a"]')).toBeTruthy();
    listRemotePostsMock.mockResolvedValue([rp("later")]);
    $<HTMLButtonElement>("#retry").click();
    await tick(20);
    expect($('.row[data-remote="later"]')).toBeTruthy();
  });

  it("tells a signed-out author their work is saved here and queues Publish until sign-in", async () => {
    await boot();
    expect($("#signedOutNote").textContent).toMatch(/Saved on this device\. Sign in to publish/);
    type($("#body"), "hello");
    $<HTMLButtonElement>("#publish").click();
    await tick(50);
    expect(location.hash).toBe("#/settings");
    const [queued] = await (await import("../db")).listDrafts();
    expect(queued.pending).toBe("publish");
    location.hash = `#/d/${queued.id}`;
    await tick(30);
    expect($("#status").textContent).toMatch(/Will publish after you sign in/);
    expect($("#signedOutNote").textContent).toMatch(/Queued on this device/);
  });

  it("says it's offline instead of silently skipping the remote merge", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    online(false);
    await boot("#/drafts");
    await tick(20);
    expect($(".msg").textContent).toMatch(/Offline/);
    expect(listRemotePostsMock).not.toHaveBeenCalled();
  });

  it("surfaces the error instead of silently failing when GitHub can't be reached", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    listRemotePostsMock.mockRejectedValue(new Error("Token rejected"));
    await boot("#/drafts");
    await tick(20);
    expect($(".msg.error").textContent).toMatch(/Couldn't check GitHub.*Token rejected/);
  });

  it("shows no status message once the remote merge succeeds", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    listRemotePostsMock.mockResolvedValue([]);
    await boot("#/drafts");
    await tick(20);
    expect(document.getElementById("remoteStatus")).toBeNull();
  });

  it("doesn't duplicate a remote post that's already tracked locally", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    listRemotePostsMock.mockResolvedValue([rp("s")]);
    const db = await boot();
    await db.saveDraft({ id: "b", title: "Newer", text: "b", created: 2, updated: 2, published: true, slug: "s" });
    await boot("#/drafts");
    await tick(20);
    expect(document.querySelectorAll(".row")).toHaveLength(1);
  });

  it("deletes a remote-only post after a long-press and confirmation", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
    listRemotePostsMock.mockResolvedValue([rp("hand-written-post")]);
    await boot("#/drafts");
    await tick(20);
    vi.stubGlobal("confirm", () => true);
    $<HTMLButtonElement>('.row[data-remote="hand-written-post"]').dispatchEvent(new Event("pointerdown"));
    await tick(750);
    expect(fetchPostMock).toHaveBeenCalledWith(expect.anything(), "hand-written-post");
    expect(unpublishMock).toHaveBeenCalledTimes(1);
  });

  it("shows whether a token is saved, and when", async () => {
    await boot("#/settings");
    expect($("#tokenInfo").textContent).toMatch(/No token saved/);
    $<HTMLInputElement>("#token").value = "abc";
    $<HTMLButtonElement>("#save").click();
    const saved = JSON.parse(localStorage.getItem("composer-settings")!);
    expect(saved.tokenSavedAt).toBeGreaterThan(0);
    await boot("#/settings");
    expect($("#tokenInfo").textContent).toMatch(/Token saved on/);
  });

  it("keeps the original saved date when the token is unchanged", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "abc", tokenSavedAt: 1234 }));
    await boot("#/settings");
    $<HTMLButtonElement>("#save").click();
    expect(JSON.parse(localStorage.getItem("composer-settings")!).tokenSavedAt).toBe(1234);
  });

  it("tests the token against GitHub", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "abc" }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    await boot("#/settings");
    $<HTMLButtonElement>("#check").click();
    await tick(30);
    expect($("#tokenInfo").textContent).toMatch(/Token check failed: Token rejected/);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: { repository: { ref: { target: { oid: "h" } } } } })));
    $<HTMLButtonElement>("#check").click();
    await tick(30);
    expect($("#tokenInfo").textContent).toMatch(/Token works/);
  });

  it("signs in with GitHub and stores the token", async () => {
    authMock.requestDeviceCode.mockResolvedValue({
      device_code: "dc", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 5,
    });
    authMock.pollForToken.mockResolvedValue({ access_token: "gho_new", refresh_token: "ghr_new", expires_in: 28800 });
    await boot("#/settings");
    $<HTMLButtonElement>("#signin").click();
    await tick(50);
    expect(authMock.requestDeviceCode).toHaveBeenCalled();
    const saved = JSON.parse(localStorage.getItem("composer-settings")!);
    expect(saved).toMatchObject({ token: "gho_new", refreshToken: "ghr_new" });
    expect(saved.tokenSavedAt).toBeGreaterThan(0);
    expect(saved.expiresAt).toBeGreaterThan(Date.now() + 28000 * 1000);
    expect(location.hash).toBe("#/");
  });

  it("describes the token by kind: signed in (auto-renews), pasted, or none", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "a", refreshToken: "r", tokenSavedAt: 1234 }));
    await boot("#/settings");
    expect($("#tokenInfo").textContent).toMatch(/Signed in with GitHub on .*Renews itself automatically/);
    localStorage.setItem("composer-settings", JSON.stringify({ token: "a", tokenSavedAt: 1234 }));
    await boot("#/settings");
    expect($("#tokenInfo").textContent).toMatch(/Token saved on/);
    localStorage.setItem("composer-settings", JSON.stringify({}));
    await boot("#/settings");
    expect($("#tokenInfo").textContent).toMatch(/No token saved/);
  });

  it("keeps the refresh fields when Settings is saved without touching the token", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "a", refreshToken: "r", expiresAt: 99 }));
    await boot("#/settings");
    // a background refresh rotates the tokens while the page is open
    localStorage.setItem("composer-settings", JSON.stringify({ token: "b", refreshToken: "r2", expiresAt: 100 }));
    $<HTMLInputElement>("#branch").value = "dev";
    $<HTMLButtonElement>("#save").click();
    expect(JSON.parse(localStorage.getItem("composer-settings")!)).toMatchObject({
      token: "b", refreshToken: "r2", expiresAt: 100, branch: "dev",
    });
  });

  it("drops the refresh fields when the token is replaced by hand", async () => {
    localStorage.setItem("composer-settings", JSON.stringify({ token: "a", refreshToken: "r", expiresAt: 99 }));
    await boot("#/settings");
    $<HTMLInputElement>("#token").value = "pasted";
    $<HTMLButtonElement>("#save").click();
    const saved = JSON.parse(localStorage.getItem("composer-settings")!);
    expect(saved.token).toBe("pasted");
    expect(saved.refreshToken).toBeUndefined();
    expect(saved.expiresAt).toBeUndefined();
  });

  it("shows the code while waiting, and errors if sign-in fails", async () => {
    authMock.requestDeviceCode.mockResolvedValue({
      device_code: "dc", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 5,
    });
    authMock.pollForToken.mockReturnValue(new Promise(() => {})); // pending forever
    await boot("#/settings");
    $<HTMLButtonElement>("#signin").click();
    await tick(50);
    expect($("#userCode").textContent).toBe("ABCD-1234");
    authMock.pollForToken.mockReset();
    authMock.requestDeviceCode.mockRejectedValue(new Error("Device flow must be enabled"));
    await boot("#/settings");
    $<HTMLButtonElement>("#signin").click();
    await tick(50);
    expect($("#signinInfo").textContent).toBe("Device flow must be enabled");
    expect($<HTMLButtonElement>("#signin").disabled).toBe(false);
  });

  it("saves settings to localStorage", async () => {
    await boot("#/settings");
    $<HTMLInputElement>("#token").value = "  secret  ";
    $<HTMLButtonElement>("#save").click();
    expect(JSON.parse(localStorage.getItem("composer-settings")!)).toMatchObject({
      token: "secret",
      repo: "lzadhito/lzadhito.github.io",
      branch: "master",
    });
  });
});

describe("remote posts and conflicts", () => {
  const signedIn = () => localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
  const pubDraft = (over: Partial<Draft> = {}): Draft => ({
    id: "p", title: "Mine", text: "body", created: 1, updated: 1, slug: "s", pubDate: "d", published: true, baseOid: "v1", ...over,
  });

  it("shows remote posts by title and date, in the order given", async () => {
    signedIn();
    listRemotePostsMock.mockResolvedValue([
      rp("b", { title: "Newest post", pubDate: "2026-02-02T00:00:00.000Z" }),
      rp("a", { title: "Older post", pubDate: "2026-01-01T00:00:00.000Z" }),
    ]);
    await boot("#/drafts");
    await tick(20);
    const rows = [...document.querySelectorAll(".row[data-remote]")].map((r) => r.textContent!.replace(/\s+/g, " "));
    expect(rows[0]).toMatch(/^Newest post.*published/);
    expect(rows[1]).toMatch(/^Older post/);
    expect(rows[0]).not.toMatch(/\bb\b.*published$/);
  });

  it("flags a local copy when the repo has a newer version, once per post", async () => {
    signedIn();
    listRemotePostsMock.mockResolvedValue([rp("s", { oid: "v2" })]);
    const db = await boot();
    await db.saveDraft(pubDraft());
    await boot("#/drafts");
    await tick(30);
    expect(document.querySelectorAll(".row")).toHaveLength(1);
    expect($(".row[data-id='p']").textContent).toMatch(/newer version in repo/);
  });

  it("does not flag a local copy that matches the repo, or one with no remembered version", async () => {
    signedIn();
    listRemotePostsMock.mockResolvedValue([rp("s", { oid: "v1" }), rp("t", { oid: "zzz" })]);
    const db = await boot();
    await db.saveDraft(pubDraft());
    await db.saveDraft(pubDraft({ id: "q", slug: "t", baseOid: undefined }));
    await boot("#/drafts");
    await tick(30);
    expect(document.body.textContent).not.toMatch(/newer version in repo/);
  });

  it("keeps the version GitHub reports after a publish, so the next Update isn't a false conflict", async () => {
    signedIn();
    publishMock.mockImplementationOnce(async (_s, d) => ({ ...d, slug: "s", pubDate: "d", published: true, pending: undefined, baseOid: "after" }));
    const db = await boot();
    type($("#body"), "hello");
    $<HTMLButtonElement>("#publish").click();
    await tick(60);
    expect((await db.listDrafts())[0].baseOid).toBe("after");
  });

  async function conflictFor(db: Awaited<ReturnType<typeof boot>>, unknownBase = false) {
    signedIn();
    const { ConflictError } = await import("../github");
    publishMock.mockRejectedValueOnce(new ConflictError("v2", unknownBase));
    await db.saveDraft(pubDraft());
    await boot("#/d/p");
    type($("#body"), "my edit");
    $<HTMLButtonElement>("#publish").click();
    await tick(60);
  }

  it("stops an Update that would overwrite a newer version, and keeps the author's text", async () => {
    const db = await boot();
    await conflictFor(db);
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect($("#conflict").textContent).toMatch(/changed in the repo/);
    expect($<HTMLTextAreaElement>("#body").value).toBe("my edit");
    const d = (await db.getDraft("p"))!;
    expect(d).toMatchObject({ text: "my edit", pending: undefined });
  });

  it("says so when the copy has no remembered version", async () => {
    const db = await boot();
    await conflictFor(db, true);
    expect($("#conflict").textContent).toMatch(/doesn't know which version/);
  });

  it("Overwrite publishes on top of the current repo version", async () => {
    const db = await boot();
    await conflictFor(db);
    $<HTMLButtonElement>("#overwrite").click();
    await tick(60);
    expect(publishMock).toHaveBeenCalledTimes(2);
    expect(publishMock.mock.calls[1][1]).toMatchObject({ text: "my edit", baseOid: "v2" });
    expect(document.getElementById("conflict")).toBeNull();
  });

  it("Load repo version opens the repo copy and keeps the author's text as a separate draft", async () => {
    const db = await boot();
    await conflictFor(db);
    $<HTMLButtonElement>("#loadRepo").click();
    await tick(60);
    expect($<HTMLTextAreaElement>("#body").value).toBe("content of s");
    const all = await db.listDrafts();
    const mine = all.find((d) => d.text === "my edit")!;
    expect(mine).toMatchObject({ slug: undefined, published: false });
    expect(mine.title).toMatch(/\(my edit\)$/);
    expect(all.find((d) => d.id === "p")).toMatchObject({ text: "content of s", published: true });
    expect(publishMock).toHaveBeenCalledTimes(1);
  });
});

describe("update notice", () => {
  const visible = () => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  };
  const withRunning = (src: string) => {
    document.head.innerHTML = `<script type="module" src="${src}"></script>`;
  };
  const pageWith = (src: string) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(`<html><body><script type="module" src="${src}"></script></body></html>`)));
  afterEach(() => (document.head.innerHTML = ""));

  it("offers a reload when a newer build is online, and never reloads by itself", async () => {
    await boot();
    withRunning("/_astro/index.OLD.js");
    pageWith("/_astro/index.NEW.js");
    type($("#body"), "mid-sentence");
    visible();
    await tick(30);
    expect($("#update").textContent).toMatch(/Update available/);
    expect($<HTMLTextAreaElement>("#body").value).toBe("mid-sentence");
  });

  it("stays quiet when the build is the same, or when offline", async () => {
    await boot();
    withRunning("/_astro/index.SAME.js");
    pageWith("/_astro/index.SAME.js");
    visible();
    await tick(30);
    expect(document.getElementById("update")).toBeNull();
    pageWith("/_astro/index.NEW.js");
    online(false);
    visible();
    await tick(30);
    expect(document.getElementById("update")).toBeNull();
  });
});

describe("locked posts", () => {
  const signedIn = () => localStorage.setItem("composer-settings", JSON.stringify({ token: "t" }));
  const lockedPost = async (password = "right"): Promise<Draft> => {
    const { encryptBody } = await import("../../lib/postCrypto");
    return {
      id: "remote-secret", title: "Secret", text: "", locked: await encryptBody("the real text", password), created: 0, updated: 0,
      slug: "2026-01-01-secret", pubDate: "2026-01-01", published: true, extra: { description: "d" }, baseOid: "v3",
    };
  };
  const openLockedFromList = async (password?: string) => {
    signedIn();
    listRemotePostsMock.mockResolvedValue([rp("2026-01-01-secret", { title: "Secret", protected: true })]);
    const locked = await lockedPost(password);
    fetchPostMock.mockResolvedValue(locked);
    const db = await boot("#/drafts");
    await tick(20);
    $<HTMLButtonElement>('.row[data-remote="2026-01-01-secret"]').click();
    await tick(20);
    return db;
  };
  const submitPassword = async (pw: string) => {
    type($<HTMLInputElement>("#unlockPw"), pw);
    $<HTMLButtonElement>("#unlockGo").click();
    await tick(600); // PBKDF2 at 300k iterations
  };
  const writeItAgain = async () => {
    const db = await openLockedFromList();
    $<HTMLButtonElement>("#forgot").click();
    $<HTMLButtonElement>("#rewrite").click();
    await tick(30);
    return db;
  };

  it("marks protected remote posts with a lock", async () => {
    signedIn();
    listRemotePostsMock.mockResolvedValue([rp("a", { title: "Open one" }), rp("b", { title: "Locked one", protected: true })]);
    await boot("#/drafts");
    await tick(20);
    expect($('.row[data-remote="b"]').textContent).toMatch(/🔒 Locked one/);
    expect($('.row[data-remote="a"]').textContent).not.toMatch(/🔒/);
  });

  it("opens a locked post with its saved password and no prompt", async () => {
    signedIn();
    listRemotePostsMock.mockResolvedValue([rp("2026-01-01-secret", { title: "Secret", protected: true })]);
    fetchPostMock.mockResolvedValue({ ...(await lockedPost("right")), password: "right" });
    await boot("#/drafts");
    await tick(20);
    $<HTMLButtonElement>('.row[data-remote="2026-01-01-secret"]').click();
    await tick(600);
    expect(document.getElementById("unlock")).toBeNull();
    expect($<HTMLTextAreaElement>("#body").value).toBe("the real text");
  });

  it("falls back to the sheet when the saved password is wrong", async () => {
    signedIn();
    listRemotePostsMock.mockResolvedValue([rp("2026-01-01-secret", { title: "Secret", protected: true })]);
    fetchPostMock.mockResolvedValue({ ...(await lockedPost("right")), password: "stale" });
    await boot("#/drafts");
    await tick(20);
    $<HTMLButtonElement>('.row[data-remote="2026-01-01-secret"]').click();
    await tick(600);
    expect(document.getElementById("unlockPw")).not.toBeNull();
  });

  it("shows and hides the password in the editor", async () => {
    const db = await boot();
    await db.saveDraft({ id: "pw", title: "T", text: "x", created: 1, updated: 1, password: "hunter2" });
    await boot("#/d/pw");
    expect($<HTMLInputElement>("#password").type).toBe("password");
    $<HTMLButtonElement>("#showpw").click();
    expect($<HTMLInputElement>("#password").type).toBe("text");
    expect($<HTMLInputElement>("#password").value).toBe("hunter2");
    $<HTMLButtonElement>("#showpw").click();
    expect($<HTMLInputElement>("#password").type).toBe("password");
  });

  it("keeps the sheet open with an inline error on a wrong password, then opens the post on the right one", async () => {
    await openLockedFromList();
    await submitPassword("wrong");
    expect($("#unlock")).not.toBeNull();
    expect($<HTMLElement>("#unlockErr").hidden).toBe(false);
    expect(document.activeElement).toBe($("#unlockPw"));
    await submitPassword("right");
    expect(document.getElementById("unlock")).toBeNull();
    expect($<HTMLTextAreaElement>("#body").value).toBe("the real text");
  });

  it("changes nothing when the sheet is dismissed", async () => {
    const db = await openLockedFromList();
    $<HTMLDialogElement>("#unlock").click(); // backdrop
    await tick(20);
    expect(document.getElementById("unlock")).toBeNull();
    expect(location.hash).toBe("#/drafts");
    expect(await db.listDrafts()).toHaveLength(0);
    expect($<HTMLButtonElement>('.row[data-remote="2026-01-01-secret"]').disabled).toBe(false);
  });

  it("deletes a locked post without its password", async () => {
    await openLockedFromList();
    listRemotePostsMock.mockResolvedValue([]);
    vi.stubGlobal("confirm", vi.fn(() => true));
    $<HTMLButtonElement>("#unlockDelete").click();
    await tick(30);
    expect(unpublishMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ slug: "2026-01-01-secret" }));
    expect(document.getElementById("unlock")).toBeNull();
    expect(document.querySelector('.row[data-remote="2026-01-01-secret"]')).toBeNull();
  });

  it("offers View on site in the sheet", async () => {
    await openLockedFromList();
    expect($<HTMLAnchorElement>('#unlock a.item').getAttribute("href")).toBe("/blog/2026-01-01-secret/");
  });

  it("explains that the text is gone and lets the author go back", async () => {
    await openLockedFromList();
    $<HTMLButtonElement>("#forgot").click();
    expect($("#unlock").textContent).toMatch(/can't be recovered/);
    expect($("#unlock").textContent).toMatch(/Kept:.*title, date and link/s);
    $<HTMLButtonElement>("#backToPw").click();
    expect(document.getElementById("unlockPw")).not.toBeNull();
  });

  it("Write it again opens an empty draft for the same post and writes nothing to the repo", async () => {
    const db = await writeItAgain();
    expect($<HTMLTextAreaElement>("#body").value).toBe("");
    expect($<HTMLInputElement>("#title").value).toBe("Secret");
    expect($("#replaceBanner").textContent).toMatch(/nothing changes until you publish/);
    expect($<HTMLButtonElement>("#publish").disabled).toBe(true);
    expect(publishMock).not.toHaveBeenCalled();
    expect(unpublishMock).not.toHaveBeenCalled();
    expect((await db.listDrafts())[0]).toMatchObject({ slug: "2026-01-01-secret", baseOid: "v3", replacesLocked: true, extra: { description: "d" } });
  });

  it("Discard removes the replacement draft and leaves the post alone", async () => {
    const db = await writeItAgain();
    $<HTMLButtonElement>("#discardReplace").click();
    await tick(30);
    expect(await db.listDrafts()).toHaveLength(0);
    expect(location.hash).toBe("#/drafts");
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("asks before replacing, and keeps the draft if declined", async () => {
    const db = await writeItAgain();
    type($("#body"), "new text");
    vi.stubGlobal("confirm", vi.fn(() => false));
    $<HTMLButtonElement>("#publish").click();
    await tick(30);
    expect(publishMock).not.toHaveBeenCalled();
    expect((await db.listDrafts())[0]).toMatchObject({ replacesLocked: true });
    expect((await db.listDrafts())[0].pending).toBeUndefined();
  });

  it("publishes at the same slug once confirmed, and becomes an ordinary post", async () => {
    const db = await writeItAgain();
    type($("#body"), "new text");
    vi.stubGlobal("confirm", vi.fn(() => true));
    publishMock.mockImplementationOnce(async (_s, d) => ({ ...d, published: true, pending: undefined, baseOid: "v4" }));
    $<HTMLButtonElement>("#publish").click();
    await tick(60);
    expect(publishMock.mock.calls[0][1]).toMatchObject({ slug: "2026-01-01-secret", text: "new text", baseOid: "v3" });
    expect((await db.listDrafts())[0].replacesLocked).toBeUndefined();
  });

  it("does not offer Forgot or Delete when the sheet is opened from a conflict", async () => {
    signedIn();
    const { ConflictError } = await import("../github");
    publishMock.mockRejectedValueOnce(new ConflictError("v2", false));
    const db = await boot();
    await db.saveDraft({ id: "p", title: "P", text: "x", created: 1, updated: 1, slug: "s", published: true, baseOid: "v1" });
    await boot("#/d/p");
    type($("#body"), "my edit");
    $<HTMLButtonElement>("#publish").click();
    await tick(60);
    fetchPostMock.mockResolvedValue({ ...(await lockedPost()), slug: "s", id: "r" });
    $<HTMLButtonElement>("#loadRepo").click();
    await tick(20);
    expect(document.getElementById("unlockPw")).not.toBeNull();
    expect(document.getElementById("forgot")).toBeNull();
    expect(document.getElementById("unlockDelete")).toBeNull();
  });
});
