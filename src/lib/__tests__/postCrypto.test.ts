import { describe, expect, it } from "vitest";
import { decryptBody, encryptBody } from "../postCrypto";

describe("postCrypto", () => {
  it("round-trips markdown through a password", async () => {
    const blob = await encryptBody("Hello, world.\n\nSecond paragraph.", "correct horse battery staple");
    expect(await decryptBody(blob, "correct horse battery staple")).toBe("Hello, world.\n\nSecond paragraph.");
  });

  it("never leaks the plaintext into the committed blob", async () => {
    const plaintext = "a very secret sentence nobody should read";
    const blob = await encryptBody(plaintext, "pw");
    for (const word of plaintext.split(" ").filter((w) => w.length >= 5)) expect(blob).not.toContain(word);
  });

  it("rejects a wrong password instead of returning garbage", async () => {
    const blob = await encryptBody("text", "right password");
    await expect(decryptBody(blob, "wrong password")).rejects.toThrow();
  });

  it("rejects a tampered ciphertext", async () => {
    const blob = await encryptBody("text", "pw");
    const parts = blob.split(".");
    const last = parts[3].slice(-1);
    parts[3] = parts[3].slice(0, -1) + (last === "A" ? "B" : "A");
    await expect(decryptBody(parts.join("."), "pw")).rejects.toThrow();
  });

  it("uses a fresh salt and iv each time, so the same input never repeats", async () => {
    const a = await encryptBody("text", "pw");
    const b = await encryptBody("text", "pw");
    expect(a).not.toBe(b);
  });

  it("rejects an unrecognized blob format", async () => {
    await expect(decryptBody("not-a-real-blob", "pw")).rejects.toThrow(/Unrecognized/);
  });
});
