// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptBody } from "../../lib/postCrypto";
import { mount, mountAll } from "../passwordGate";

function buildGate(slug: string, blob: string) {
  document.body.innerHTML = `
    <div class="password-gate" data-slug="${slug}" data-blob="${blob}">
      <p class="password-gate-lock">🔒</p>
      <p class="password-gate-msg">This post is password protected.</p>
      <form class="password-gate-form">
        <input type="password" class="password-gate-input" />
        <button type="submit" class="password-gate-submit">Unlock</button>
      </form>
      <p class="password-gate-error" hidden>Wrong password. Try again.</p>
    </div>`;
  return document.querySelector<HTMLElement>(".password-gate")!;
}

const submit = (gate: HTMLElement, password: string) => {
  gate.querySelector<HTMLInputElement>(".password-gate-input")!.value = password;
  gate.querySelector<HTMLFormElement>(".password-gate-form")!.dispatchEvent(new Event("submit", { cancelable: true }));
};
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("mount", () => {
  it("reveals the rendered post on the right password", async () => {
    const blob = await encryptBody("# Hi\n\nSecret body.", "swordfish");
    const gate = buildGate("s1", blob);
    mount(gate);
    submit(gate, "swordfish");
    await tick(500);
    expect(document.querySelector(".password-gate")).toBeNull();
    expect(document.body.innerHTML).toContain("Secret body.");
    expect(document.querySelector("h1")?.textContent).toBe("Hi");
  });

  it("shows an error and keeps the gate on a wrong password", async () => {
    const blob = await encryptBody("Secret body.", "swordfish");
    const gate = buildGate("s2", blob);
    mount(gate);
    submit(gate, "wrong guess");
    await tick(500);
    expect(document.querySelector(".password-gate")).not.toBeNull();
    expect(gate.querySelector<HTMLElement>(".password-gate-error")!.hidden).toBe(false);
    expect(document.body.innerHTML).not.toContain("Secret body.");
  });

  it("remembers a successful unlock for the tab, so a fresh mount skips the prompt", async () => {
    const blob = await encryptBody("Secret body.", "swordfish");
    const gate1 = buildGate("s3", blob);
    mount(gate1);
    submit(gate1, "swordfish");
    await tick(500);

    const gate2 = buildGate("s3", blob); // simulates a reload: fresh DOM, same sessionStorage
    mount(gate2);
    expect(document.querySelector(".password-gate")).toBeNull();
    expect(document.body.innerHTML).toContain("Secret body.");
  });

  it("does nothing when there's no blob to unlock", () => {
    const gate = buildGate("s4", "");
    gate.removeAttribute("data-blob");
    mount(gate);
    expect(document.querySelector(".password-gate")).not.toBeNull();
  });
});

describe("mountAll", () => {
  it("wires up every .password-gate on the page", async () => {
    document.body.innerHTML = "";
    const blob = await encryptBody("one", "pw");
    document.body.appendChild(buildGate("a", blob));
    mountAll();
    expect(document.querySelectorAll(".password-gate-form").length).toBe(1);
  });
});
