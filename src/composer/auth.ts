export interface AuthConfig {
  clientId: string;
  proxy: string;
}

export interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

/** What GitHub hands back on sign-in or refresh. The last two are absent when "Expire user authorization tokens" is off. */
export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in?: number; // seconds
}

/** The refresh token is dead (revoked, expired, or already used): only a fresh sign-in helps. */
export class SignedOutError extends Error {}

export const authEnabled =(c: AuthConfig) => !!(c.clientId && c.proxy);

async function post<T>(c: AuthConfig, path: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(`${c.proxy}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: c.clientId, ...body }),
  });
  if (!res.ok) throw new Error(`Login service error (${res.status})`);
  return res.json();
}

/** Step 1: ask GitHub for a code the user types at github.com/login/device. */
export async function requestDeviceCode(c: AuthConfig): Promise<DeviceCode> {
  const data = await post<DeviceCode & { error?: string; error_description?: string }>(c, "/device/code", {});
  if (data.error) throw new Error(data.error_description || data.error);
  return data;
}

/**
 * Step 2: poll until the user approves. Resolves with the token set.
 * Honours GitHub's `interval` and `slow_down`; aborts via `signal`.
 */
export async function pollForToken(
  c: AuthConfig,
  code: DeviceCode,
  opts: { signal?: AbortSignal; sleep?: (ms: number) => Promise<void> } = {},
): Promise<TokenSet> {
  const sleep = opts.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  let interval = code.interval || 5;
  const deadline = Date.now() + code.expires_in * 1000;
  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    if (opts.signal?.aborted) throw new Error("Cancelled");
    const data = await post<Partial<TokenSet> & { error?: string; interval?: number }>(c, "/access_token", {
      device_code: code.device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });
    if (data.access_token)
      return { access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in };
    switch (data.error) {
      case "authorization_pending":
        break;
      case "slow_down":
        interval = data.interval ?? interval + 5;
        break;
      case "access_denied":
        throw new Error("Sign-in was denied.");
      case "expired_token":
        throw new Error("The code expired. Try again.");
      default:
        throw new Error(data.error || "Sign-in failed.");
    }
  }
  throw new Error("The code expired. Try again.");
}

/**
 * Trades a refresh token for a new token set. Refresh tokens are single-use: the caller must
 * save the returned `refresh_token` (replacing the old one) before doing anything else.
 * Throws SignedOutError if GitHub rejects the token; any other error (network, 5xx) is transient.
 */
export async function refreshAccessToken(c: AuthConfig, refreshToken: string): Promise<TokenSet> {
  const data = await post<Partial<TokenSet> & { error?: string; error_description?: string }>(c, "/refresh", {
    refresh_token: refreshToken,
  });
  if (data.error) throw new SignedOutError(data.error_description || data.error);
  if (!data.access_token) throw new Error("Login service returned no token");
  return { access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in };
}
