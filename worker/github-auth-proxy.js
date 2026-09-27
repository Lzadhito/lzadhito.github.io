// Cloudflare Worker: CORS proxy for GitHub's OAuth device flow (which browsers can't call directly).
// It holds no secrets. It only forwards two fixed endpoints, only for your GitHub App's client ID,
// and only answers requests coming from your site.
//
// Environment variables (wrangler.toml [vars]): ALLOWED_ORIGIN, CLIENT_ID

const ROUTES = {
  "/device/code": "https://github.com/login/device/code",
  "/access_token": "https://github.com/login/oauth/access_token",
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      Vary: "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (origin !== env.ALLOWED_ORIGIN) return new Response("Forbidden", { status: 403 });

    const target = ROUTES[new URL(request.url).pathname];
    if (request.method !== "POST" || !target) return new Response("Not found", { status: 404, headers: cors });

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad request", { status: 400, headers: cors });
    }
    if (body.client_id !== env.CLIENT_ID) return new Response("Bad client", { status: 403, headers: cors });

    const upstream = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};
