// worker/index.js — single Cloudflare Worker serving lzadhito.github.io:
//  - GitHub OAuth device-flow proxy for the composer (see auth.js, docs/composer-setup.md)
//  - Medium-style clap counts, stored in D1 (see love.js, docs/love-button-and-analytics-setup.md)
// Both are restricted to ALLOWED_ORIGIN and answer only over CORS from that origin.

import { corsHeaders } from "./cors.js";
import { isAuthRoute, handleAuth } from "./auth.js";
import { handleLove } from "./love.js";

const LOVE_PATH = /^\/love\/([a-z0-9-]+)$/;

export default {
  async fetch(request, env) {
    const cors = corsHeaders(env.ALLOWED_ORIGIN);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const origin = request.headers.get("Origin");
    if (origin !== env.ALLOWED_ORIGIN) return new Response("Forbidden", { status: 403, headers: cors });

    const { pathname } = new URL(request.url);
    if (isAuthRoute(pathname)) return handleAuth(request, env, cors, pathname);

    const loveMatch = pathname.match(LOVE_PATH);
    if (loveMatch) return handleLove(request, env, cors, loveMatch[1]);

    return new Response("Not found", { status: 404, headers: cors });
  },
};
