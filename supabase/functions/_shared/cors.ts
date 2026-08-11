// ═══════════════════════════════════════════════════════════
//  Shared CORS handling for Supabase Edge Functions.
//
//  Rules:
//  • We never use `*`. Only the real site origins are allowed; anything
//    else gets NO Access-Control-Allow-Origin header (browser blocks it).
//  • OPTIONS preflights are answered with HTTP 200 BEFORE any auth runs.
//  • Server-to-server calls carry no Origin and are unaffected.
//
//  A Deno Edge Function isolates serve one request at a time, so the
//  per-request origin captured in handleCors() is safe for json() to use.
// ═══════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  'https://epluscenter.com',
  'https://www.epluscenter.com',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
];

let _currentOrigin: string | null = null;

function buildHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    // Access-Control-Allow-Headers/Methods are harmless to send; the Origin
    // reflect header is only added when the request origin is allowlisted.
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function resolveOrigin(req: Request): string | null {
  const origin = req.headers.get('origin') || '';
  if (!origin) return null; // same-origin / server-to-server call
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

export const corsHeaders = buildHeaders(ALLOWED_ORIGINS[0]);

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...buildHeaders(_currentOrigin) },
  });
}

export function handleCors(req: Request): Response | null {
  _currentOrigin = resolveOrigin(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: buildHeaders(_currentOrigin) });
  }
  return null;
}
