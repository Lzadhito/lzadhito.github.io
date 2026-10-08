import { afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error plain JS worker
import worker from "../../../worker/index.js";

const env = { ALLOWED_ORIGIN: "https://lzadhito.github.io", CLIENT_ID: "cid" };
const req = (path: string, init: RequestInit & { origin?: string | null } = {}) =>
  new Request(`https://proxy.test${path}`, {
    method: init.method ?? "POST",
    headers: { ...(init.origin === null ? {} : { Origin: init.origin ?? env.ALLOWED_ORIGIN }) },
    body: init.method === "OPTIONS" ? undefined : (init.body ?? JSON.stringify({ client_id: "cid" })),
  });
afterEach(() => vi.unstubAllGlobals());

describe("github-auth-proxy worker", () => {
  it("answers CORS preflight", async () => {
    const res = await worker.fetch(req("/device/code", { method: "OPTIONS" }), env);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(env.ALLOWED_ORIGIN);
  });
  it("forwards device code requests to GitHub", async () => {
    const f = vi.fn(async () => Response.json({ user_code: "X" }));
    vi.stubGlobal("fetch", f);
    const res = await worker.fetch(req("/device/code"), env);
    expect(f).toHaveBeenCalledWith("https://github.com/login/device/code", expect.objectContaining({ method: "POST" }));
    expect(await res.json()).toEqual({ user_code: "X" });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(env.ALLOWED_ORIGIN);
  });
  it("forwards token polling to the access_token endpoint", async () => {
    const f = vi.fn(async () => Response.json({ access_token: "t" }));
    vi.stubGlobal("fetch", f);
    await worker.fetch(req("/access_token"), env);
    expect(f).toHaveBeenCalledWith("https://github.com/login/oauth/access_token", expect.anything());
  });
  describe("/refresh", () => {
    const refreshReq = (body: unknown, origin?: string) =>
      req("/refresh", { body: JSON.stringify(body), origin });
    const secretEnv = { ...env, CLIENT_SECRET: "shh" };

    it("attaches the client secret and forwards only the fixed refresh-grant fields", async () => {
      const f = vi.fn(async () => Response.json({ access_token: "new", refresh_token: "r2" }));
      vi.stubGlobal("fetch", f);
      const res = await worker.fetch(
        refreshReq({ client_id: "cid", refresh_token: "r1", grant_type: "evil", client_secret: "mine", extra: 1 }),
        secretEnv,
      );
      expect(await res.json()).toEqual({ access_token: "new", refresh_token: "r2" });
      const [url, init] = f.mock.calls[0] as unknown as [string, { body: string }];
      expect(url).toBe("https://github.com/login/oauth/access_token");
      expect(JSON.parse(init.body)).toEqual({
        client_id: "cid",
        client_secret: "shh",
        grant_type: "refresh_token",
        refresh_token: "r1",
      });
    });
    it("rejects a wrong client id or origin without calling GitHub", async () => {
      const f = vi.fn();
      vi.stubGlobal("fetch", f);
      expect((await worker.fetch(refreshReq({ client_id: "other", refresh_token: "r" }), secretEnv)).status).toBe(403);
      expect((await worker.fetch(refreshReq({ client_id: "cid", refresh_token: "r" }, "https://evil.test"), secretEnv)).status).toBe(403);
      expect(f).not.toHaveBeenCalled();
    });
    it("requires a refresh token and a configured secret", async () => {
      const f = vi.fn();
      vi.stubGlobal("fetch", f);
      expect((await worker.fetch(refreshReq({ client_id: "cid" }), secretEnv)).status).toBe(400);
      expect((await worker.fetch(refreshReq({ client_id: "cid", refresh_token: "r" }), env)).status).toBe(500);
      expect(f).not.toHaveBeenCalled();
    });
  });
  it("rejects other origins, other client ids and unknown paths", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect((await worker.fetch(req("/device/code", { origin: "https://evil.test" }), env)).status).toBe(403);
    expect((await worker.fetch(req("/device/code", { origin: null }), env)).status).toBe(403);
    expect((await worker.fetch(req("/device/code", { body: JSON.stringify({ client_id: "other" }) }), env)).status).toBe(403);
    expect((await worker.fetch(req("/user"), env)).status).toBe(404);
    expect((await worker.fetch(req("/device/code", { body: "not json" }), env)).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
});
