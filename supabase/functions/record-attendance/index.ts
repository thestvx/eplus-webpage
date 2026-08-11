import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors, json } from '../_shared/cors.ts';
import { verifyFirebaseToken, bearerToken } from '../_shared/firebase.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const user = await verifyFirebaseToken(bearerToken(req));
  if (!user) return json({ error: 'unauthorized' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json body' }, 400);
  }

  const action = String(body.action || 'record');

  if (action === 'record') {
    const { data, error } = await supabase.rpc('record_attendance', {
      p_student_id: String(body.studentId || ''),
      p_teacher_id: String(body.teacherId || ''),
      p_teacher_name: String(body.teacherName || ''),
      p_subject_id: String(body.subjectId || ''),
      p_subject_name: String(body.subjectName || ''),
      p_barcode_value: String(body.barcodeValue || ''),
      p_subscription_id: String(body.subscriptionId || ''),
      p_subscription_period_id: String(body.periodId || ''),
      p_month_number: Number(body.monthNumber) || 0,
      p_date: String(body.date || ''),
      p_check_in_time: String(body.checkInTime || ''),
      p_mirror_id: String(body.mirrorId || ''),
    });
    if (error) return json({ error: error.message, code: error.code || null }, 400);
    return json({ ok: true, ...data });
  }

  if (action === 'undo') {
    const { data, error } = await supabase.rpc('undo_attendance', {
      p_attendance_id: String(body.attendanceId || ''),
      p_subscription_period_id: String(body.periodId || ''),
    });
    if (error) return json({ error: error.message, code: error.code || null }, 400);
    return json({ ok: true, ...data });
  }

  return json({ error: 'unknown action' }, 400);
});
