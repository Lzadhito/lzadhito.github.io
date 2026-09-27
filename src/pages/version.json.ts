// The composer polls this to know when a publish is live (C2, C3).
export function GET() {
  const sha = process.env.GITHUB_SHA ?? 'dev';
  return new Response(JSON.stringify({ sha, built: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
