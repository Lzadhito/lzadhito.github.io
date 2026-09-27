// worker/love.js — Medium-style clap counts. One row per (post, visitor), each visitor capped
// at MAX_CLAPS. Storage: Cloudflare D1, binding `DB` (table created by
// worker/migrations/0001_create_post_loves.sql).

export const MAX_CLAPS = 50;

function json(data, cors, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

async function totalFor(env, slug) {
  const row = await env.DB.prepare("SELECT COALESCE(SUM(claps), 0) AS total FROM post_loves WHERE slug = ?").bind(slug).first();
  return row?.total ?? 0;
}

async function mineFor(env, slug, clientId) {
  if (!clientId) return 0;
  const row = await env.DB.prepare("SELECT claps FROM post_loves WHERE slug = ? AND client_id = ?").bind(slug, clientId).first();
  return row?.claps ?? 0;
}

async function getLove(env, cors, slug, clientId) {
  const [total, mine] = await Promise.all([totalFor(env, slug), mineFor(env, slug, clientId)]);
  return json({ total, mine }, cors);
}

async function postLove(request, env, cors, slug) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400, headers: cors });
  }
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const delta = Number(body.delta);
  if (!clientId || !Number.isFinite(delta) || delta <= 0) {
    return new Response("Bad request", { status: 400, headers: cors });
  }

  // Read-clamp-write rather than a SQL increment: simpler to reason about and test, and a lost
  // update between two rapid taps from the same visitor is harmless for a clap counter.
  const current = await mineFor(env, slug, clientId);
  const mine = Math.min(MAX_CLAPS, current + Math.trunc(delta));
  await env.DB.prepare(
    `INSERT INTO post_loves (slug, client_id, claps, updated_at) VALUES (?, ?, ?, unixepoch())
     ON CONFLICT(slug, client_id) DO UPDATE SET claps = excluded.claps, updated_at = excluded.updated_at`,
  )
    .bind(slug, clientId, mine)
    .run();

  const total = await totalFor(env, slug);
  return json({ total, mine }, cors);
}

export async function handleLove(request, env, cors, slug) {
  if (request.method === "GET") {
    const clientId = new URL(request.url).searchParams.get("clientId") || "";
    return getLove(env, cors, slug, clientId);
  }
  if (request.method === "POST") return postLove(request, env, cors, slug);
  return new Response("Not found", { status: 404, headers: cors });
}
