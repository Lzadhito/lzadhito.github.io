import { describe, expect, it } from "vitest";
import { isIOS } from "../instagramShare";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_MODERN_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const MAC_DESKTOP_UA = IPAD_MODERN_UA; // iPadOS 13+ spoofs the same UA as macOS Safari

describe("isIOS", () => {
  it("detects iPhone from the user agent", () => {
    expect(isIOS(IPHONE_UA, "iPhone", 5)).toBe(true);
  });

  it("detects modern iPadOS via touch points, since its UA claims to be a Mac", () => {
    expect(isIOS(IPAD_MODERN_UA, "MacIntel", 5)).toBe(true);
  });

  it("does not mistake a real Mac desktop (no touch) for iPadOS", () => {
    expect(isIOS(MAC_DESKTOP_UA, "MacIntel", 0)).toBe(false);
  });

  it("does not flag Android", () => {
    expect(isIOS(ANDROID_UA, "Linux armv8l", 5)).toBe(false);
  });
});
