import { afterEach, describe, expect, it, vi } from "vitest";
import { authEnabled, pollForToken, requestDeviceCode } from "../auth";

const cfg = { clientId: "cid", proxy: "https://proxy.test" };
const code = { device_code: "dc", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 5 };
const noSleep = async () => {};

/** Feeds `responses` to successive fetch calls and records the requests. */
function mockFetch(responses: unknown[]) {
  const calls: { url: string; body: any }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: any) => {
      calls.push({ url, body: JSON.parse(init.body) });
      const r = responses.shift();
      return r instanceof Response ? r : Response.json(r);
    }),
  );
  return calls;
}
afterEach(() => vi.unstubAllGlobals());

describe("authEnabled", () => {
  it("needs both client id and proxy", () => {
    expect(authEnabled(cfg)).toBe(true);
    expect(authEnabled({ clientId: "", proxy: "x" })).toBe(false);
    expect(authEnabled({ clientId: "x", proxy: "" })).toBe(false);
  });
});

describe("requestDeviceCode", () => {
  it("posts the client id to the proxy and returns the code", async () => {
    const calls = mockFetch([code]);
    expect(await requestDeviceCode(cfg)).toEqual(code);
    expect(calls[0]).toEqual({ url: "https://proxy.test/device/code", body: { client_id: "cid" } });
  });
  it("surfaces GitHub errors", async () => {
    mockFetch([{ error: "device_flow_disabled", error_description: "Device flow must be enabled" }]);
    await expect(requestDeviceCode(cfg)).rejects.toThrow("Device flow must be enabled");
  });
  it("surfaces proxy failures", async () => {
    mockFetch([new Response("no", { status: 403 })]);
    await expect(requestDeviceCode(cfg)).rejects.toThrow(/403/);
  });
});

describe("pollForToken", () => {
  it("keeps polling while pending, then returns the token", async () => {
    const calls = mockFetch([{ error: "authorization_pending" }, { error: "authorization_pending" }, { access_token: "tok" }]);
    expect(await pollForToken(cfg, code, { sleep: noSleep })).toBe("tok");
    expect(calls).toHaveLength(3);
    expect(calls[0]).toEqual({
      url: "https://proxy.test/access_token",
      body: { client_id: "cid", device_code: "dc", grant_type: "urn:ietf:params:oauth:grant-type:device_code" },
    });
  });
  it("slows down when GitHub asks", async () => {
    mockFetch([{ error: "slow_down", interval: 10 }, { access_token: "tok" }]);
    const waits: number[] = [];
    await pollForToken(cfg, code, { sleep: async (ms) => void waits.push(ms) });
    expect(waits).toEqual([5000, 10000]);
  });
  it("fails on denial and expiry", async () => {
    mockFetch([{ error: "access_denied" }]);
    await expect(pollForToken(cfg, code, { sleep: noSleep })).rejects.toThrow(/denied/);
    mockFetch([{ error: "expired_token" }]);
    await expect(pollForToken(cfg, code, { sleep: noSleep })).rejects.toThrow(/expired/);
  });
  it("can be cancelled", async () => {
    mockFetch([]);
    const ctl = new AbortController();
    ctl.abort();
    await expect(pollForToken(cfg, code, { sleep: noSleep, signal: ctl.signal })).rejects.toThrow("Cancelled");
  });
  it("gives up after the code's lifetime", async () => {
    mockFetch([]);
    await expect(pollForToken(cfg, { ...code, expires_in: 0 }, { sleep: noSleep })).rejects.toThrow(/expired/);
  });
});
