// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Draft } from "../db";

const publishMock = vi.fn(async (_s: unknown, d: Draft): Promise<Draft> => ({
  ...d,
  slug: "2026-09-27-test",
  pubDate: "2026-09-27T00:00:00.000Z",
  published: true,
  pending: undefined,
}));
const unpublishMock = vi.fn(async (_s: unknown, d: Draft): Promise<Draft> => ({ ...d, published: false, pending: undefined }));

vi.mock("../github", async (orig) => ({
  ...(await orig<typeof import("../github")>()),
  publish: (...a: [unknown, Draft]) => publishMock(...a),
  unpublish: (...a: [unknown, Draft]) => unpublishMock(...a),
}));

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

const type = (el: HTMLTextAreaElement | HTMLInputElement, v: string) => {
  el.value = v;
  el.dispatchEvent(new Event("input"));
};

beforeEach(async () => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    clear: () => store.clear(),
  });
  publishMock.mockClear();
  unpublishMock.mockClear();
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
