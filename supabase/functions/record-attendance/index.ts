import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors, json } from '../_shared/cors.ts';
import { verifyFirebaseToken, bearerToken } from '../_shared/firebase.ts';

const FIRESTORE_PROJECT = Deno.env.get('FIREBASE_PROJECT_ID') || 'eplus-center-39';
const FIRESTORE_DOCUMENTS = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents`;
const SESSIONS_PER_MONTH = 8;
const KIOSK_ACCESS_HASH = Deno.env.get('KIOSK_ACCESS_HASH') || '023e33504ab909cf87a6f4e4e545090e40bdc0a2153e5b68b19f7fad2b737904';

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

function normName(v: unknown): string {
  return str(v).replace(/\s+/g, '').toLowerCase();
}

function normTeacher(v: unknown): string {
  return normName(v).split('').sort().join('');
}

function eqName(a: unknown, b: unknown): boolean {
  if (!a || !b) return false;
  return normName(a) === normName(b) || normTeacher(a) === normTeacher(b);
}

function normalizeTeacherName(v: unknown): string {
  let s = str(v).replace(/\s+/g, ' ').trim().toLowerCase();
  s = s.replace(/عبد\s+الرحمان/g, 'عبدالرحمان');
  s = s.replace(/عبد\s+ال/g, 'عبدال');
  return s.split(' ').sort().join(' ');
}

function algiersParts(d: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Algiers',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const out: Record<string, string> = {};
  parts.forEach((p) => { if (p.type !== 'literal') out[p.type] = p.value; });
  if (out.hour === '24') out.hour = '00';
  return out;
}

function algiersDate(d = new Date()): string {
  const p = algiersParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

function algiersTime(d = new Date()): string {
  const p = algiersParts(d);
  return `${p.hour}:${p.minute}`;
}

function fsValue(v: unknown): Record<string, unknown> {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  return { stringValue: String(v) };
}

function decodeDoc(doc: any): Record<string, any> {
  const out: Record<string, any> = { name: str(doc && doc.name) };
  const fields = (doc && doc.fields) || {};
  Object.keys(fields).forEach((k) => {
    const v = fields[k] || {};
    if ('stringValue' in v) out[k] = str(v.stringValue);
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('doubleValue' in v) out[k] = Number(v.doubleValue);
    else if ('booleanValue' in v) out[k] = v.booleanValue === true;
    else if ('timestampValue' in v) out[k] = str(v.timestampValue);
    else if ('nullValue' in v) out[k] = null;
  });
  return out;
}

function encodeFields(obj: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.keys(obj).forEach((k) => {
    if (obj[k] !== undefined) out[k] = fsValue(obj[k]);
  });
  return out;
}

async function fsFetch(path: string, init: RequestInit, idToken: string): Promise<any> {
  const res = await fetch(`${FIRESTORE_DOCUMENTS}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const err: any = new Error(str(data?.error?.message) || `Firestore request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function fsQuery(collection: string, field: string, value: unknown, idToken: string): Promise<any[]> {
  const data = await fsFetch(':runQuery', {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: fsValue(value) },
        },
      },
    }),
  }, idToken);
  return (Array.isArray(data) ? data : [])
    .filter((r: any) => r && r.document)
    .map((r: any) => decodeDoc(r.document));
}

async function fsQueryStudentAttendance(studentId: string, idToken: string): Promise<any[]> {
  const [asString, asNumber] = await Promise.all([
    fsQuery('support_attendance', 'studentId', studentId, idToken),
    /^\d+$/.test(studentId)
      ? fsQuery('support_attendance', 'studentId', Number(studentId), idToken)
      : Promise.resolve([] as any[]),
  ]);
  const byName = new Map<string, any>();
  asString.concat(asNumber).forEach((d: any) => { if (d.name) byName.set(d.name, d); });
  return Array.from(byName.values());
}

async function fsCreate(collection: string, id: string, fields: Record<string, any>, idToken: string): Promise<any> {
  return fsFetch(
    `/${encodeURIComponent(collection)}/${encodeURIComponent(id)}?currentDocument.exists=false`,
    { method: 'PATCH', body: JSON.stringify({ fields: encodeFields(fields) }) },
    idToken
  );
}

function isAttendanceOpen(docs: any[], item: any): boolean {
  const openMap: Record<string, boolean> = {};
  const openIdMap: Record<string, boolean> = {};
  const openNameMap: Record<string, boolean> = {};
  docs.forEach((d) => {
    if (d.isOpen !== true) return;
    const tn = normalizeTeacherName(d.teacherName);
    if (tn) {
      openNameMap[tn] = true;
      if (d.subjectName) openMap[`${tn}|||${str(d.subjectName).trim().toLowerCase()}`] = true;
      else openMap[tn] = true;
    }
    if (d.teacherId) openIdMap[str(d.teacherId)] = true;
  });
  const nn = normalizeTeacherName(item.teacherName);
  const subjectName = str(item.subjectName);
  if (subjectName && openMap[`${nn}|||${subjectName.trim().toLowerCase()}`]) return true;
  if (!subjectName && openMap[nn]) return true;
  if (openNameMap[nn]) return true;
  return !!item.teacherId && openIdMap[str(item.teacherId)] === true;
}

function matchesSubjectTeacher(s: any, subjectId: string, teacherId: string): boolean {
  const sId = str(s.subject_id);
  const tId = str(s.teacher_id);
  const sName = str(s.subject_name);
  const tName = str(s.teacher_name);
  if (sId && sId !== subjectId) {
    if (!sName || !eqName(sName, subjectId)) return false;
  }
  if (tId && tId !== teacherId) {
    if (!tName || !eqName(tName, teacherId)) return false;
  }
  return true;
}

function periodRemaining(p: any): number {
  if (!p) return 0;
  const total = Number(p.total_sessions);
  const safeTotal = Number.isFinite(total) && total > 0 ? total : SESSIONS_PER_MONTH;
  const used = Number(p.used_sessions) || 0;
  return Math.max(0, safeTotal - used);
}

function isPermanent(s: any): boolean {
  return !!s && s.status === 'permanent';
}

function syntheticPick(sub: any, periods: any[], refDate: string): any {
  if (!sub) return null;
  if (sub.status === 'cancelled' || sub.status === 'paused') {
    return { period: null, remaining: 0, attended: 0, permanent: false, allowed: false };
  }
  if (isPermanent(sub)) {
    return { period: null, remaining: 0, attended: 0, permanent: true, allowed: true };
  }
  const inDate = (!sub.start_date || refDate >= str(sub.start_date)) && (!sub.end_date || refDate <= str(sub.end_date));
  if (!inDate) return { period: null, remaining: 0, attended: 0, permanent: false, allowed: false };
  const used = (periods || []).reduce((a: number, p: any) => a + (Number(p.used_sessions) || 0), 0);
  let total = Number(sub.total_sessions) || 0;
  if (!total) total = (periods || []).reduce((a: number, p: any) => a + (Number(p.total_sessions) || SESSIONS_PER_MONTH), 0);
  if (!total) total = (Number(sub.months) || 1) * SESSIONS_PER_MONTH;
  const remaining = Math.max(0, total - used);
  if (remaining <= 0) return { period: null, remaining: 0, attended: used, permanent: false, allowed: false };
  let best: any = null;
  (periods || []).forEach((p: any) => {
    if (p && periodRemaining(p) > 0 && (!best || periodRemaining(p) > periodRemaining(best))) best = p;
  });
  return { period: best, remaining, attended: used, permanent: false, allowed: true };
}

function selectCheckInPeriod(sub: any, periods: any[], refDate: string): any {
  if (!sub) return null;
  if (isPermanent(sub)) return { period: null, remaining: 0, attended: 0, permanent: true, allowed: true };
  if (sub.status === 'cancelled' || sub.status === 'paused') {
    return { period: null, remaining: 0, attended: 0, permanent: false, allowed: false };
  }
  const list = (periods || []).filter(Boolean).slice().sort((a: any, b: any) =>
    str(a.start_date || '').localeCompare(str(b.start_date || '')) ||
    ((Number(a.month_number) || 0) - (Number(b.month_number) || 0))
  );
  if (!list.length) return syntheticPick(sub, [], refDate);
  const containing = list.find((p: any) => refDate >= str(p.start_date || '') && refDate <= str(p.end_date || ''));
  if (containing && periodRemaining(containing) > 0) {
    return { period: containing, remaining: periodRemaining(containing), attended: Number(containing.used_sessions) || 0, permanent: false, allowed: true };
  }
  const started = list.filter((p: any) => str(p.start_date || '') <= refDate && periodRemaining(p) > 0);
  if (started.length) {
    const p = started[started.length - 1];
    return { period: p, remaining: periodRemaining(p), attended: Number(p.used_sessions) || 0, permanent: false, allowed: true };
  }
  const upcoming = list.filter((p: any) => str(p.start_date || '') > refDate && periodRemaining(p) > 0);
  const withinPaid = (!sub.start_date || refDate >= str(sub.start_date)) && (!sub.end_date || refDate <= str(sub.end_date));
  if (upcoming.length && withinPaid) {
    const p = upcoming[0];
    return { period: p, remaining: periodRemaining(p), attended: Number(p.used_sessions) || 0, permanent: false, allowed: true };
  }
  const last = containing || list[list.length - 1];
  const net = syntheticPick(sub, list, refDate);
  if (net && net.allowed) return net;
  return { period: last, remaining: containing ? periodRemaining(containing) : 0, attended: Number((last || {}).used_sessions) || 0, permanent: false, allowed: false };
}

function pickScore(pick: any, refDate: string): number {
  if (!pick || !pick.allowed) return -1;
  let score = 0;
  if (pick.permanent) score += 100;
  if (pick.period && refDate >= str(pick.period.start_date || '') && refDate <= str(pick.period.end_date || '')) score += 10;
  score += Math.min(5, Number(pick.remaining) || 0) * 0.1;
  return score;
}

function resolveCheckIn(rows: any[], subjectId: string, teacherId: string, refDate: string): any {
  const matches = (rows || []).filter((row: any) => {
    const s = row.subscription || {};
    return s.status !== 'cancelled' && matchesSubjectTeacher(s, subjectId, teacherId);
  });
  let best: any = null;
  matches.forEach((row: any) => {
    const s = row.subscription || {};
    if (s.status === 'paused') return;
    const pick = selectCheckInPeriod(s, row.periods || [], refDate);
    if (!best || pickScore(pick, refDate) > pickScore(best.pick, refDate)) {
      best = { subscription: s, periods: row.periods || [], pick };
    }
  });
  if (best && best.pick && best.pick.allowed) return best;
  for (const row of matches) {
    const s = row.subscription || {};
    if (s.status === 'paused') continue;
    if (isPermanent(s) || (refDate >= str(s.start_date || '') && refDate <= str(s.end_date || ''))) {
      return { subscription: s, periods: row.periods || [], pick: selectCheckInPeriod(s, row.periods || [], refDate) };
    }
  }
  return best || (matches.length ? { subscription: matches[0].subscription || {}, periods: matches[0].periods || [], pick: null } : null);
}

function attendanceDocId(studentId: string, teacherId: string, subjectId: string, date: string): string {
  const raw = `${studentId}_${teacherId || 'x'}_${subjectId || 'x'}_${date}_1`;
  return raw.replace(/[^A-Za-z0-9_.\-]/g, '_');
}

function allowDocId(studentId: string, teacherId: string, subjectId: string, subscriptionId: string): string {
  const raw = `ALLOW-${studentId}_${teacherId || 'x'}_${subjectId || 'x'}_${subscriptionId}`;
  return raw.replace(/[^A-Za-z0-9_.\-]/g, '_');
}

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

  if (action === 'batch') {
    const idToken = bearerToken(req);
    const studentId = str(body.studentId || '');
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!studentId) return json({ error: 'studentId required' }, 400);
    if (!rawItems.length) return json({ error: 'items required' }, 400);
    if (rawItems.length > 12) return json({ error: 'too many items' }, 400);
    const modes = rawItems.map((it: any) => str(it && it.mode || 'normal'));
    if (modes.includes('skip')) return json({ error: 'skip mode is no longer supported' }, 400);
    if (modes.some((m: string) => m !== 'normal' && m !== 'allow')) return json({ error: 'unsupported mode' }, 400);
    if (modes.includes('allow') && req.headers.get('x-kiosk-key') !== KIOSK_ACCESS_HASH) {
      return json({ error: 'kiosk authorization required' }, 403);
    }

    const registrationResult = await supabase
      .from('registrations')
      .select('id,status,deleted_at')
      .eq('id', studentId)
      .is('deleted_at', null)
      .maybeSingle();
    if (registrationResult.error) return json({ error: registrationResult.error.message }, 400);
    if (!registrationResult.data || registrationResult.data.status !== 'مسجل نهائياً') {
      return json({ error: 'student is not finally registered' }, 400);
    }

    const date = algiersDate();
    const checkInTime = algiersTime();
    const serverTime = new Date().toISOString();

    let controlDocs: any[] = [];
    let attendanceDocs: any[] = [];
    let subscriptionRows: any[] = [];
    try {
      [controlDocs, attendanceDocs] = await Promise.all([
        fsQuery('attendance_control', 'date', date, idToken),
        fsQueryStudentAttendance(studentId, idToken),
      ]);
    } catch (e: any) {
      console.error('[batch] firestore preflight failed', e);
      return json({ error: 'attendance store unavailable', detail: str(e.message) }, 400);
    }
    const subResult = await supabase.rpc('get_student_subscription', { p_student_id: studentId });
    if (subResult.error) return json({ error: subResult.error.message }, 400);
    subscriptionRows = Array.isArray(subResult.data) ? subResult.data : [];

    const allowKeys: Record<string, boolean> = {};
    attendanceDocs.forEach((d: any) => {
      if (d.type !== 'allow_sub' || d.allowCycle !== true) return;
      const key = str(d.subscriptionId || '');
      if (key) allowKeys[key] = true;
    });

    const results: any[] = [];
    for (let i = 0; i < rawItems.length; i++) {
      const raw = (rawItems[i] || {}) as Record<string, unknown>;
      const teacherName = str(raw.teacherName || '');
      const subjectName = str(raw.subjectName || '');
      const teacherId = str(raw.teacherId || '');
      const subjectId = str(raw.subjectId || '');
      const mode = str(raw.mode || 'normal');
      const base = { index: i, teacherName, subjectName, type: mode };
      try {
        if (!teacherName || !subjectName) throw new Error('teacherName and subjectName required');
        if (!isAttendanceOpen(controlDocs, { teacherName, subjectName, teacherId })) {
          throw new Error('الحضور غير مفتوح لهذا الأستاذ');
        }

        const duplicate = attendanceDocs.find((d: any) => {
          if (!d.date || str(d.date) !== date || d.cancelled === true) return false;
          if (d.type === 'grace' || d.type === 'grace_session') return false;
          const sameTeacher = str(d.teacherName) === teacherName || (!!d.teacherName && eqName(d.teacherName, teacherName));
          const sameSubject = str(d.subjectName) === subjectName || (!!d.subjectName && eqName(d.subjectName, subjectName));
          return sameTeacher && sameSubject;
        });
        if (duplicate) throw new Error('تم تسجيل الحضور لهذه المادة اليوم');

        let resolved = resolveCheckIn(subscriptionRows, subjectId, teacherId, date);
        let pick = resolved && resolved.pick;
        let subscription = resolved && resolved.subscription;
        let actionType = 'normal';
        let periodId = '';
        let monthNumber = 0;
        let subscriptionId = '';
        let permanent = false;
        let allowCycle = false;
        let docId = attendanceDocId(studentId, teacherId, subjectId, date);
        let source = 'eplus-attendance';
        let recordType = 'present';

        if (mode === 'allow') {
          const requestedCycleId = str(raw.subscriptionId || '');
          if (requestedCycleId) {
            const currentCycleId = str(resolved && resolved.subscription && resolved.subscription.id);
            if (currentCycleId && requestedCycleId !== currentCycleId) {
              throw new Error('دورة الاشتراك المحددة ليست الدورة الحالية');
            }
            const row = subscriptionRows.find((r: any) => {
              const s = r && r.subscription;
              if (str(s && s.id) !== requestedCycleId) return false;
              return matchesSubjectTeacher(s, subjectId, teacherId)
                || (eqName(s && s.subject_name, subjectName) && eqName(s && s.teacher_name, teacherName));
            });
            if (!row) throw new Error('دورة الاشتراك المحددة غير صالحة لهذه المادة');
            subscription = row.subscription;
            pick = selectCheckInPeriod(subscription, row.periods || [], date);
          }
          if (!subscription || !subscription.id) throw new Error('لا يوجد اشتراك منتهٍ مطابق لهذه المادة');
          if (subscription.status === 'cancelled' || subscription.status === 'paused') {
            throw new Error('دورة الاشتراك غير صالحة للسماح الاستثنائي');
          }
          if (pick && pick.allowed) throw new Error('الاشتراك لا يزال نشطاً — لا حاجة للسماح الاستثنائي');
          const cycleId = str(subscription.id);
          if (allowKeys[cycleId]) throw new Error('تم استخدام السماح لهذه الدورة');
          docId = allowDocId(studentId, teacherId, subjectId, cycleId);
          actionType = 'allow';
          recordType = 'allow_sub';
          source = 'eplus-attendance-allow';
          subscriptionId = cycleId;
          allowCycle = true;
          allowKeys[cycleId] = true;
        } else {
          if (!subscription || !pick || !pick.allowed) throw new Error('انتهى الاشتراك لهذه المادة');
          subscriptionId = str(subscription.id || '');
          permanent = pick.permanent === true;
          if (!permanent) {
            const period = pick.period;
            periodId = str(period && (period.period_id || period.id));
            monthNumber = Number((period && period.month_number) || 0) || 0;
            if (!periodId) throw new Error('تعذر تحديد فترة الاشتراك الصالحة');
          }
        }

        const fields: Record<string, any> = {
          studentId,
          studentName: str(body.studentName || ''),
          studentType: str(body.studentType || ''),
          sessionNumber: 1,
          date,
          checkInTime,
          barcodeValue: str(body.barcodeValue || ''),
          source,
          type: recordType,
          allowCycle,
          status: 'present',
          teacherName,
          subjectName,
          teacherId,
          subjectId,
          subscriptionId,
          subscriptionPeriodId: periodId,
          monthNumber,
          level: str(body.level || ''),
          stream: str(body.stream || ''),
          institution: str(body.institution || ''),
          confirmed: true,
          serverTime,
          createdAt: checkInTime,
          updatedAt: serverTime,
        };

        let deducted = false;
        if (actionType === 'normal' && periodId) {
          const inc = await supabase.rpc('increment_period_usage', { p_period_id: periodId, p_used: 1 });
          if (inc.error) throw new Error(inc.error.message);
          deducted = true;
        }

        try {
          await fsCreate('support_attendance', docId, fields, idToken);
        } catch (e: any) {
          if (deducted) {
            const rollback = await supabase.rpc('increment_period_usage', { p_period_id: periodId, p_used: -1 });
            if (rollback.error) console.error('[batch] usage rollback failed', rollback.error);
          }
          throw e;
        }

        attendanceDocs.push({ ...fields, name: `support_attendance/${docId}` });
        results.push({
          ...base,
          ok: true,
          action: actionType,
          attendanceId: docId,
          periodId,
          subscriptionId,
          remaining: actionType === 'normal' && !permanent && pick ? pick.remaining : null,
          permanent,
        });
      } catch (e: any) {
        results.push({ ...base, ok: false, reason: str(e.message) || 'تعذر تسجيل الحضور' });
      }
    }

    const succeeded = results.filter((r: any) => r.ok).length;
    return json({ ok: true, results, summary: { total: results.length, succeeded, failed: results.length - succeeded } });
  }

  return json({ error: 'unknown action' }, 400);
});
