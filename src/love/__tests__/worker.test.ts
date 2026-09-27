import { afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error plain JS worker
import worker from "../../../worker/index.js";

const env = { ALLOWED_ORIGIN: "https://lzadhito.github.io", CLIENT_ID: "cid", DB: undefined as unknown };

/** Minimal fake of the one D1 table love.js talks to, just enough to exercise its two queries. */
function fakeDB() {
  const rows = new Map<string, number>(); // `${slug}\u0000${clientId}` -> claps
  return {
    rows,
    prepare(sql: string) {
      let args: unknown[] = [];
      return {
        bind(...a: unknown[]) {
          args = a;
          return this;
        },
        async first() {
          if (sql.includes("SUM(claps)")) {
            const [slug] = args as [string];
            let total = 0;
            for (const [key, claps] of rows) if (key.startsWith(`${slug}\u0000`)) total += claps;
            return { total };
          }
          const [slug, clientId] = args as [string, string];
          const claps = rows.get(`${slug}\u0000${clientId}`);
          return claps === undefined ? null : { claps };
        },
        async run() {
          const [slug, clientId, claps] = args as [string, string, number];
          rows.set(`${slug}\u0000${clientId}`, claps);
          return { success: true };
        },
      };
    },
  };
}

const req = (path: string, init: RequestInit & { origin?: string | null } = {}) =>
  new Request(`https://proxy.test${path}`, {
    method: init.method ?? "GET",
    headers: { ...(init.origin === null ? {} : { Origin: init.origin ?? env.ALLOWED_ORIGIN }) },
    body: init.body,
  });

afterEach(() => vi.unstubAllGlobals());

describe("love routes", () => {
  it("reports zero for a post nobody has clapped for yet", async () => {
    const res = await worker.fetch(req("/love/my-post"), { ...env, DB: fakeDB() });
    expect(await res.json()).toEqual({ total: 0, mine: 0 });
  });

  it("records claps and returns the running total and this visitor's count", async () => {
    const DB = fakeDB();
    const post = (clientId: string, delta: number) =>
      worker.fetch(req("/love/my-post", { method: "POST", body: JSON.stringify({ clientId, delta }) }), { ...env, DB });

    expect(await (await post("a", 5)).json()).toEqual({ total: 5, mine: 5 });
    expect(await (await post("a", 3)).json()).toEqual({ total: 8, mine: 8 });
    expect(await (await post("b", 2)).json()).toEqual({ total: 10, mine: 2 });

    const res = await worker.fetch(req("/love/my-post?clientId=a"), { ...env, DB });
    expect(await res.json()).toEqual({ total: 10, mine: 8 });
  });

  it("caps a single visitor's claps at 50 even across multiple requests", async () => {
    const DB = fakeDB();
    const post = (delta: number) =>
      worker.fetch(req("/love/my-post", { method: "POST", body: JSON.stringify({ clientId: "a", delta }) }), { ...env, DB });

    await post(40);
    expect(await (await post(40)).json()).toEqual({ total: 50, mine: 50 });
  });

  it("rejects malformed clap requests without touching the store", async () => {
    const DB = fakeDB();
    const post = (body: unknown) =>
      worker.fetch(req("/love/my-post", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }), {
        ...env,
        DB,
      });

    expect((await post("not json")).status).toBe(400);
    expect((await post({ clientId: "", delta: 1 })).status).toBe(400);
    expect((await post({ clientId: "a", delta: 0 })).status).toBe(400);
    expect((await post({ clientId: "a", delta: -3 })).status).toBe(400);
    expect(DB.rows.size).toBe(0);
  });

  it("still enforces the origin and CORS rules shared with the auth routes", async () => {
    const res = await worker.fetch(req("/love/my-post", { origin: "https://evil.test" }), { ...env, DB: fakeDB() });
    expect(res.status).toBe(403);
  });
});
