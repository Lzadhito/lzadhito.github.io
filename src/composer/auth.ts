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

export const authEnabled = (c: AuthConfig) => !!(c.clientId && c.proxy);

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
 * Step 2: poll until the user approves. Resolves with the access token.
 * Honours GitHub's `interval` and `slow_down`; aborts via `signal`.
 */
export async function pollForToken(
  c: AuthConfig,
  code: DeviceCode,
  opts: { signal?: AbortSignal; sleep?: (ms: number) => Promise<void> } = {},
): Promise<string> {
  const sleep = opts.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  let interval = code.interval || 5;
  const deadline = Date.now() + code.expires_in * 1000;
  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    if (opts.signal?.aborted) throw new Error("Cancelled");
    const data = await post<{ access_token?: string; error?: string; interval?: number }>(c, "/access_token", {
      device_code: code.device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });
    if (data.access_token) return data.access_token;
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
