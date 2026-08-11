import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors, json } from '../_shared/cors.ts';
import { verifyFirebaseToken, bearerToken } from '../_shared/firebase.ts';

const BUCKET = 'teacher-content';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const user = await verifyFirebaseToken(bearerToken(req));
  if (!user) return json({ error: 'unauthorized' }, 401);

  const params = new URL(req.url).searchParams;
  const teacherId = String(params.get('teacherId') || user.uid || '');
  const rawName = String(params.get('filename') || 'file');
  const contentType = req.headers.get('Content-Type') || 'application/octet-stream';
  const safeName = rawName.replace(/[^\w.\- (){}\[\],@&!+=]/g, '_').slice(0, 120);
  const path = teacherId + '/' + Date.now() + '_' + safeName;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const blob = await new Response(req.body).blob();
  if (blob.size === 0) return json({ error: 'empty file' }, 400);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, upsert: false, cacheControl: '3600' });

  if (error) return json({ error: error.message }, 400);

  const url = (Deno.env.get('SUPABASE_URL') || '') + '/storage/v1/object/public/' + BUCKET + '/' + encodeURIComponent(path);
  return json({ ok: true, path: data?.path || path, url });
});
