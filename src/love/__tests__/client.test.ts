// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_CLAPS, getClientId, mount } from "../client";

const api = { proxy: "https://proxy.test" };

function buildButton(slug = "my-post") {
  document.body.innerHTML = `
    <div class="love-button" data-slug="${slug}">
      <button type="button" class="love-tap"></button>
      <span class="love-count">0</span>
    </div>`;
  return {
    root: document.querySelector<HTMLElement>(".love-button")!,
    button: document.querySelector<HTMLButtonElement>(".love-tap")!,
    count: document.querySelector<HTMLElement>(".love-count")!,
  };
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("getClientId", () => {
  it("creates one id and reuses it on later calls", () => {
    const id = getClientId();
    expect(id).toBeTruthy();
    expect(getClientId()).toBe(id);
  });

  it("still returns something usable when storage throws (private mode)", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(getClientId()).toBeTruthy();
  });
});

describe("mount", () => {
  it("hydrates the total and this visitor's clap count on load", async () => {
    const { root, button, count } = buildButton();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ total: 12, mine: 3 })));
    mount(root, api);
    await tick(10);
    expect(count.textContent).toBe("12");
    expect(button.classList.contains("is-active")).toBe(true);
  });

  it("claps optimistically before the network responds", async () => {
    const { root, button, count } = buildButton();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ total: 0, mine: 0 })));
    mount(root, api);
    await tick(10);
    button.click();
    expect(count.textContent).toBe("1");
    expect(button.classList.contains("is-clapping")).toBe(true);
    await tick(500); // let the debounced flush land so it doesn't leak into the next test
  });

  it("batches rapid taps into a single request after the debounce", async () => {
    const { root, button } = buildButton();
    const f = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ total: 0, mine: 0 })) // initial GET
      .mockResolvedValueOnce(Response.json({ total: 3, mine: 3 })); // the flushed POST
    vi.stubGlobal("fetch", f);
    mount(root, api);
    await tick(10);

    button.click();
    button.click();
    button.click();
    expect(f).toHaveBeenCalledTimes(1); // just the initial GET so far

    await tick(500);
    expect(f).toHaveBeenCalledTimes(2);
    const [, init] = f.mock.calls[1];
    expect(JSON.parse(init.body)).toMatchObject({ delta: 3 });
  });

  it("stops accepting taps once this visitor hits the cap", async () => {
    const { root, button, count } = buildButton();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ total: 100, mine: MAX_CLAPS })));
    mount(root, api);
    await tick(10);
    expect(button.classList.contains("is-maxed")).toBe(true);

    button.click();
    expect(count.textContent).toBe("100"); // unchanged, no extra clap accepted
  });

  it("keeps the tap queued for retry if the flush request fails", async () => {
    const { root, button } = buildButton();
    const f = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ total: 0, mine: 0 }))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(Response.json({ total: 1, mine: 1 }));
    vi.stubGlobal("fetch", f);
    mount(root, api);
    await tick(10);

    button.click();
    await tick(500); // first flush fails
    button.click();
    await tick(500); // retried delta should include the earlier failed tap

    const [, init] = f.mock.calls[2];
    expect(JSON.parse(init.body)).toMatchObject({ delta: 2 });
  });
});
