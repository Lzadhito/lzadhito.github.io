// worker/auth.js — CORS proxy for GitHub's OAuth device flow (which browsers can't call directly).
// Forwards fixed GitHub endpoints, only for the configured GitHub App client ID. The one secret it holds,
// CLIENT_SECRET, is used only by /refresh (GitHub requires it there) and never leaves the Worker.

const ROUTES = {
  "/device/code": "https://github.com/login/device/code",
  "/access_token": "https://github.com/login/oauth/access_token",
  "/refresh": "https://github.com/login/oauth/access_token",
};

export const isAuthRoute = (pathname) => pathname in ROUTES;

export async function handleAuth(request, env, cors, pathname) {
  if (request.method !== "POST") return new Response("Not found", { status: 404, headers: cors });

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400, headers: cors });
  }
  if (body.client_id !== env.CLIENT_ID) return new Response("Bad client", { status: 403, headers: cors });

  let payload = body;
  if (pathname === "/refresh") {
    if (typeof body.refresh_token !== "string" || !body.refresh_token) return new Response("Bad request", { status: 400, headers: cors });
    if (!env.CLIENT_SECRET) return new Response("Refresh not configured", { status: 500, headers: cors });
    // Build the body ourselves: never forward caller-chosen fields next to the secret.
    payload = {
      client_id: env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: body.refresh_token,
    };
  }

  const upstream = await fetch(ROUTES[pathname], {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
