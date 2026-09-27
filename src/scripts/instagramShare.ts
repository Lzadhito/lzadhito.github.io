// Best-effort deep link straight into Instagram's Story composer, for mobile browsers.
//
// There is no public web API for "open Instagram Story with this image" — Meta's
// documented flow (instagram-stories://share) assumes a native app with a registered
// Facebook App ID that writes specific UTI keys to the OS pasteboard. A plain website
// can't set those custom keys through the standard Clipboard API. In practice, though,
// Instagram's iOS Story composer still picks up a plain image (and text) left on the
// general pasteboard, so this degrades gracefully: if Instagram isn't installed, or
// doesn't react, the tab just stays put and the caller falls back to the normal
// Web Share / download flow (which is what actually works well on Android already).

/** Pure so it's testable without touching `navigator`. */
export function isIOS(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  if (/iP(hone|od|ad)/.test(userAgent)) return true;
  // iPadOS 13+ identifies as a Mac in the UA string but is touch-capable.
  return platform === "MacIntel" && maxTouchPoints > 1;
}

export function detectIOS(): boolean {
  return isIOS(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
}

/**
 * Copies the image (and the post link, as a second clipboard representation) and
 * attempts to jump straight into Instagram's Story composer via its iOS URL scheme.
 * Resolves `true` if the page appears to have been backgrounded (i.e. Instagram likely
 * opened), `false` if nothing happened within the timeout (not installed / blocked).
 */
export async function tryInstagramStoryDeepLink(blob: Blob, url: string): Promise<boolean> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blob,
        "text/plain": new Blob([url], { type: "text/plain" }),
      }),
    ]);
  } catch {
    return false;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("visibilitychange", onHide);
      resolve(result);
    };
    const onHide = () => {
      if (document.hidden) finish(true);
    };
    document.addEventListener("visibilitychange", onHide);
    // source_application is normally a registered Meta App ID; Instagram tolerates a
    // placeholder here and just falls back to reading the pasteboard image directly.
    window.location.href = "instagram-stories://share?source_application=lzadhito-blog";
    setTimeout(() => finish(false), 1500);
  });
}
