import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors, json } from '../_shared/cors.ts';
import { verifyFirebaseToken, bearerToken } from '../_shared/firebase.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

async function adminGate(idToken: string): Promise<string | null> {
  const user = await verifyFirebaseToken(idToken);
  if (!user) return null;
  const { data: ok, error } = await supabase.rpc('admin_is_uid_admin', { p_uid: user.uid });
  if (error || !ok) return null;
  return user.uid;
}

async function rpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return json({ error: error.message, code: error.code || null }, 400);
  return json({ ok: true, data });
}

function addMonthsYMD(start: string, months: number): string {
  const [y, m, d] = start.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m - 1) + months, 1));
  const lastDay = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d || 1, lastDay));
  return dt.toISOString().slice(0, 10);
}

function dayBefore(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const uid = await adminGate(bearerToken(req));
  if (!uid) return json({ error: 'forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json body' }, 400);
  }

  const action = String(body.action || '');

  switch (action) {
    case 'list-admins':
      return rpc('admin_list_admins', { p_admin_uid: uid });

    case 'add-admin':
      return rpc('admin_add_admin', {
        p_admin_uid: uid,
        p_new_uid: String(body.uid || ''),
        p_role: String(body.role || 'admin'),
      });

    case 'remove-admin':
      return rpc('admin_remove_admin', {
        p_admin_uid: uid,
        p_target_uid: String(body.uid || ''),
      });

    case 'list-registrations':
      return rpc('admin_list_registrations', { p_admin_uid: uid });

    case 'list-subscriptions':
      return rpc('admin_list_subscriptions', { p_admin_uid: uid });

    case 'list-subscriptions-rich':
      return rpc('admin_list_subscriptions_rich', { p_admin_uid: uid });

    case 'list-active-subs':
      return rpc('get_teacher_active_subs', { p_teacher_id: String(body.teacherId || '') });

    case 'get-subscription-detail':
      return rpc('admin_get_subscription_detail', {
        p_admin_uid: uid,
        p_subscription_id: String(body.subscriptionId || ''),
      });

    case 'create-subscription':
      return rpc('admin_create_subscription', {
        p_admin_uid: uid,
        p_student_id: String(body.studentId || ''),
        p_start_date: String(body.startDate || ''),
        p_months: Number(body.months) || 1,
        p_total_price: Number(body.totalPrice) ?? 0,
        p_total_sessions: body.totalSessions != null ? Number(body.totalSessions) : null,
        p_permanent: body.permanent === true,
        p_payment_id: String(body.paymentId || ''),
        p_notes: body.notes == null ? null : String(body.notes),
        p_teacher_id: String(body.teacherId || ''),
        p_subject_id: String(body.subjectId || ''),
        p_teacher_name: body.teacherName == null ? null : String(body.teacherName),
        p_subject_name: body.subjectName == null ? null : String(body.subjectName),
      });

    case 'create-subscription-fresh': {
      const studentId = String(body.studentId || '');
      const teacherId = String(body.teacherId || '');
      const subjectId = String(body.subjectId || '');
      const paymentId = String(body.paymentId || '');
      if (!studentId) return json({ error: 'studentId required' }, 400);
      if (!teacherId || !subjectId) return json({ error: 'subjectId and teacherId required' }, 400);
      if (!paymentId) return json({ error: 'paymentId required' }, 400);

      const permanent = body.permanent === true;
      const months = permanent ? 1 : (Number(body.months) || 1);
      if (!permanent && ![1, 2, 3].includes(months)) return json({ error: 'months must be 1, 2 or 3' }, 400);
      const startDate = String(body.startDate || new Date().toISOString().slice(0, 10));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return json({ error: 'invalid startDate' }, 400);

      const totalSessions = permanent
        ? 100000
        : (body.totalSessions != null && Number(body.totalSessions) > 0 ? Number(body.totalSessions) : months * 8);
      const totalPrice = Math.max(0, Number(body.totalPrice) || 0);
      const endDate = permanent ? '2099-12-31' : dayBefore(addMonthsYMD(startDate, months));
      const subId = 'SUB-' + studentId + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      const today = new Date().toISOString().slice(0, 10);

      const subscriptionRow = {
        id: subId,
        student_id: studentId,
        teacher_id: teacherId,
        subject_id: subjectId,
        teacher_name: String(body.teacherName || ''),
        subject_name: String(body.subjectName || ''),
        start_date: startDate,
        end_date: endDate,
        months,
        total_price: totalPrice,
        total_sessions: totalSessions,
        status: permanent ? 'permanent' : 'active',
        payment_id: paymentId,
        notes: body.notes == null ? '' : String(body.notes),
      };

      const periodRows: Record<string, unknown>[] = [];
      const customSessions = body.totalSessions != null && Number(body.totalSessions) > 0;
      const baseSessions = customSessions ? Math.floor(totalSessions / months) : 8;
      const extraSessions = customSessions ? totalSessions % months : 0;
      for (let i = 0; i < months; i++) {
        const pStart = addMonthsYMD(startDate, i);
        const pEnd = permanent ? '2099-12-31' : dayBefore(addMonthsYMD(startDate, i + 1));
        const perSessions = permanent ? totalSessions : baseSessions + (i < extraSessions ? 1 : 0);
        periodRows.push({
          id: subId + '-M' + (i + 1),
          subscription_id: subId,
          month_number: i + 1,
          start_date: pStart,
          end_date: pEnd,
          total_sessions: perSessions,
          used_sessions: 0,
          remaining_sessions: permanent ? 100000 : perSessions,
          status: permanent || (today >= pStart && today <= pEnd) ? 'active' : (today < pStart ? 'upcoming' : 'completed'),
        });
      }

      const { data: subscription, error: subErr } = await supabase
        .from('student_subscriptions')
        .insert(subscriptionRow)
        .select()
        .single();
      if (subErr) return json({ error: subErr.message, code: subErr.code || null }, 400);

      const { data: periods, error: periodErr } = await supabase
        .from('subscription_periods')
        .insert(periodRows)
        .select();
      if (periodErr) return json({ error: periodErr.message, code: periodErr.code || null }, 400);

      return json({
        ok: true,
        data: {
          merged: false,
          subscription,
          periods: periods || [],
          note: 'اشتراك جديد مستقل — لا دمج مع اشتراكات سابقة ولا جمع للأسعار',
        },
      });
    }

    case 'pause-subscription':
      return rpc('admin_pause_subscription', {
        p_admin_uid: uid,
        p_subscription_id: String(body.subscriptionId || ''),
        p_paused: body.paused === true,
      });

    case 'delete-subscription':
      return rpc('admin_delete_subscription', {
        p_admin_uid: uid,
        p_subscription_id: String(body.subscriptionId || ''),
      });

    case 'set-period-sessions':
      return rpc('set_period_usage', {
        p_period_id: String(body.periodId || ''),
        p_used: Number(body.usedSessions) || 0,
      });

    case 'delete-period': {
      const subscriptionId = String(body.subscriptionId || '');
      const periodId = String(body.periodId || '');
      if (!subscriptionId || !periodId) return json({ error: 'subscriptionId and periodId are required' }, 400);

      const { data: sub, error: subErr } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .maybeSingle();
      if (subErr) return json({ error: subErr.message }, 400);
      if (!sub) return json({ error: 'subscription not found' }, 404);
      if (sub.permanent) return json({ error: 'لا يمكن حذف شهر من اشتراك دائم' }, 400);

      const { data: periodRows, error: periodErr } = await supabase
        .from('subscription_periods')
        .select('*')
        .eq('subscription_id', subscriptionId);
      if (periodErr) return json({ error: periodErr.message }, 400);
      const periods = periodRows || [];
      if (periods.length <= 1) return json({ error: 'لا يمكن حذف الشهر الوحيد في الاشتراك' }, 400);
      if (!periods.some((p) => String(p.id) === periodId)) return json({ error: 'period not found in subscription' }, 404);

      const remaining = periods
        .filter((p) => String(p.id) !== periodId)
        .sort((a, b) => (Number(a.month_number) || 0) - (Number(b.month_number) || 0) || String(a.start_date || '').localeCompare(String(b.start_date || '')));

      const oldTotalSessions = Number(sub.total_sessions) || periods.reduce((a, p) => a + (Number(p.total_sessions) || 8), 0);
      const newTotalSessions = remaining.reduce((a, p) => a + (Number(p.total_sessions) || 8), 0);
      const oldPrice = Number(sub.total_price) || 0;
      const newPrice = oldTotalSessions > 0 ? Math.round(oldPrice * newTotalSessions / oldTotalSessions) : oldPrice;
      const startDates = remaining.map((p) => p.start_date).filter(Boolean).sort();
      const endDates = remaining.map((p) => p.end_date).filter(Boolean).sort();
      const patch: Record<string, unknown> = {
        months: remaining.length,
        total_sessions: newTotalSessions,
        total_price: newPrice,
      };
      if (startDates.length) patch.start_date = startDates[0];
      if (endDates.length) patch.end_date = endDates[endDates.length - 1];

      const { error: delErr } = await supabase.from('subscription_periods').delete().eq('id', periodId);
      if (delErr) return json({ error: delErr.message }, 400);

      for (let i = 0; i < remaining.length; i++) {
        if (Number(remaining[i].month_number) !== i + 1) {
          const { error: renErr } = await supabase
            .from('subscription_periods')
            .update({ month_number: i + 1 })
            .eq('id', remaining[i].id);
          if (renErr) return json({ error: renErr.message }, 400);
        }
      }

      const { error: updErr } = await supabase
        .from('student_subscriptions')
        .update(patch)
        .eq('id', subscriptionId);
      if (updErr) return json({ error: updErr.message }, 400);

      return json({
        ok: true,
        data: {
          subscriptionId,
          periodId,
          months: remaining.length,
          total_sessions: newTotalSessions,
          total_price: newPrice,
          start_date: patch.start_date ?? sub.start_date,
          end_date: patch.end_date ?? sub.end_date,
        },
      });
    }

    case 'get-balance':
      return rpc('admin_get_teacher_balance', {
        p_admin_uid: uid,
        p_teacher_id: String(body.teacherId || ''),
      });

    case 'list-balances':
      return rpc('admin_list_balances', { p_admin_uid: uid });

    case 'get-ledger':
      return rpc('admin_get_teacher_ledger', {
        p_admin_uid: uid,
        p_teacher_id: String(body.teacherId || ''),
      });

    case 'get-receipts':
      return rpc('admin_get_teacher_receipts', {
        p_admin_uid: uid,
        p_teacher_id: String(body.teacherId || ''),
      });

    case 'upsert-transactions':
      return rpc('admin_upsert_transactions', {
        p_admin_uid: uid,
        p_rows: (body.rows as unknown) || [],
      });

    case 'upsert-balance':
      return rpc('admin_upsert_balance', {
        p_admin_uid: uid,
        p_row: (body.row as unknown) || {},
      });

    case 'recompute-balance':
      return rpc('admin_recompute_balance', {
        p_admin_uid: uid,
        p_teacher_id: String(body.teacherId || ''),
        p_teacher_name: String(body.teacherName || ''),
        p_session_override: body.sessionOverride == null ? null : Number(body.sessionOverride),
        p_student_override: body.studentOverride == null ? null : Number(body.studentOverride),
        p_rate: Number(body.rate) || 0,
        p_admin_name: String(body.adminName || ''),
      });

    case 'add-payment':
      return rpc('admin_add_payment', {
        p_admin_uid: uid,
        p_teacher_id: String(body.teacherId || ''),
        p_teacher_name: String(body.teacherName || ''),
        p_amount: Number(body.amount) || 0,
        p_note: body.note == null ? null : String(body.note),
        p_admin_name: String(body.adminName || ''),
        p_rate: Number(body.rate) || 0,
      });

    case 'delete-transaction':
      return rpc('admin_delete_transaction', {
        p_admin_uid: uid,
        p_tx_id: String(body.txId || ''),
        p_teacher_id: String(body.teacherId || ''),
        p_teacher_name: String(body.teacherName || ''),
        p_rate: Number(body.rate) || 0,
        p_admin_name: String(body.adminName || ''),
      });

    case 'clear-payments':
      return rpc('admin_clear_teacher_payments', {
        p_admin_uid: uid,
        p_teacher_id: String(body.teacherId || ''),
        p_teacher_name: String(body.teacherName || ''),
        p_rate: Number(body.rate) || 0,
        p_admin_name: String(body.adminName || ''),
      });

    case 'set-rate':
      return rpc('admin_set_teacher_rate', {
        p_admin_uid: uid,
        p_teacher_id: String(body.teacherId || ''),
        p_rate: Number(body.rate) || 0,
      });

    default:
      return json({ error: 'unknown action' }, 400);
  }
});
