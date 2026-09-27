// worker/auth.js — CORS proxy for GitHub's OAuth device flow (which browsers can't call directly).
// Holds no secrets: forwards two fixed GitHub endpoints, only for the configured GitHub App client ID.

const ROUTES = {
  "/device/code": "https://github.com/login/device/code",
  "/access_token": "https://github.com/login/oauth/access_token",
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

  const upstream = await fetch(ROUTES[pathname], {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
