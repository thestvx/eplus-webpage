-- ════════════════════════════════════════════════════════════════════════
-- إصلاح اتساق الاشتراكات الشهرية (حل نهائي لـ «انتهى الاشتراك»)
--
-- المشكلة التي يُصلحها الملف:
--   طالب اشترك شهراً ثم أُشتري له شهر ثانٍ، وبعد انتهاء الشهر الأول تمنع
--   صفحة الحضور تسجيل حضوره رغم أن المدة المدفوعة ما زالت سارية.
--   الأسباب المحتملة في البيانات:
--     1) صف اشتراك الشهر الثاني بلا «أشهر» في subscription_periods.
--     2) نهاية الاشتراك (end_date) لم تُمدَّد لتغطية آخر شهر فعلي.
--     3) remaining_sessions تالفة (لا يساوي total - used) فيفشل خصم الحصة.
--     4) subject_name / teacher_name فارغة أو مخالفة لاسم التسجيل.
--
-- الإصلاحات (لا تلمس أي سجل حضور، ولا أي used_sessions):
--   أ) مزامنة remaining_sessions = GREATEST(0, total_sessions - used_sessions).
--   ب) تمديد end_date لتغطية آخر شهر موجود في subscription_periods.
--   ج) إنشاء شهر بديل للاشتراك الساري الذي لا يملك أي شهراً (رصيد متبقٍ).
--   د) تعبئة subject_name / teacher_name الفارغة من بيانات التسجيل.
--   هـ) تحديث status لكل شهر حسب تاريخ اليوم.
--
-- التنفيذ: Supabase SQL Editor ← الصق الملف كاملاً ← Run.
-- ════════════════════════════════════════════════════════════════════════

-- تطبيع مطابقة الاسم (نفس المنطق المستخدم في الواجهة) — يُعاد تعريفه ليكون مستقلاً
CREATE OR REPLACE FUNCTION _sn(p TEXT) RETURNS TEXT AS $$
  SELECT lower(regexp_replace(COALESCE(p, ''), '\s+', '', 'g'));
$$ LANGUAGE sql IMMUTABLE;

-- ────────────────────────────────────────────────────────────────
-- أ) مزامنة الرصيد المتبقي لكل شهر
-- ────────────────────────────────────────────────────────────────
UPDATE subscription_periods p
   SET remaining_sessions = GREATEST(0, COALESCE(p.total_sessions, 0) - COALESCE(p.used_sessions, 0)),
       updated_at = now()
 WHERE COALESCE(p.remaining_sessions, -1)
       <> GREATEST(0, COALESCE(p.total_sessions, 0) - COALESCE(p.used_sessions, 0));

-- ────────────────────────────────────────────────────────────────
-- ب) تمديد نهاية الاشتراك لتغطية آخر شهر فعلي
--    (يشفي الاشتراكات التي دُمجت معها أشهر ولم تُمدَّد نهايتها)
-- ────────────────────────────────────────────────────────────────
UPDATE student_subscriptions s
   SET end_date = GREATEST(s.end_date, mx.last_end),
       updated_at = now()
  FROM (SELECT subscription_id, MAX(end_date) AS last_end
          FROM subscription_periods
         WHERE end_date IS NOT NULL AND end_date <> ''
         GROUP BY subscription_id) mx
 WHERE mx.subscription_id = s.id
   AND s.status <> 'cancelled'
   AND s.end_date <> '2099-12-31'
   AND COALESCE(s.end_date, '') < mx.last_end;

-- ────────────────────────────────────────────────────────────────
-- ج) شهر بديل للاشتراك الساري الذي لا يملك أي شهراً
--    (يغطي كامل المدة المدفوعة وبقيّة الحصص غير المستهلكة)
-- ────────────────────────────────────────────────────────────────
INSERT INTO subscription_periods
  (id, subscription_id, month_number, start_date, end_date,
   total_sessions, used_sessions, remaining_sessions, status)
SELECT s.id || '-MFIX', s.id,
       COALESCE(mx.max_month, 0) + 1,
       s.start_date, s.end_date,
       GREATEST(1, COALESCE(s.total_sessions, 8) - COALESCE(mx.used, 0)), 0,
       GREATEST(1, COALESCE(s.total_sessions, 8) - COALESCE(mx.used, 0)),
       CASE WHEN to_char(CURRENT_DATE, 'YYYY-MM-DD') < s.start_date THEN 'upcoming'
            WHEN to_char(CURRENT_DATE, 'YYYY-MM-DD') > s.end_date   THEN 'completed'
            ELSE 'active' END
  FROM student_subscriptions s
  LEFT JOIN (SELECT subscription_id, COUNT(*) AS cnt,
                    COALESCE(SUM(used_sessions), 0) AS used,
                    COALESCE(MAX(month_number), 0)  AS max_month
               FROM subscription_periods
              GROUP BY subscription_id) mx
         ON mx.subscription_id = s.id
 WHERE s.status IN ('active', 'permanent')
   AND COALESCE(mx.cnt, 0) = 0
   AND to_char(CURRENT_DATE, 'YYYY-MM-DD') BETWEEN s.start_date AND s.end_date;

-- ────────────────────────────────────────────────────────────────
-- د) تعبئة الأسماء الفارغة من بيانات التسجيل (مطابقة بالمعرّفات)
-- ────────────────────────────────────────────────────────────────
UPDATE student_subscriptions s
   SET subject_name = COALESCE(NULLIF(s.subject_name, ''), el->>'subject'),
       updated_at = now()
  FROM registrations r,
       jsonb_array_elements(CASE WHEN jsonb_typeof(r.subjects) = 'array'
                                 THEN r.subjects ELSE '[]'::jsonb END) el
 WHERE r.id = s.student_id
   AND r.deleted_at IS NULL
   AND r.status = 'مسجل نهائياً'
   AND COALESCE(s.subject_name, '') = ''
   AND el->>'subjectId' IS NOT NULL
   AND el->>'subjectId' <> ''
   AND el->>'subjectId' = s.subject_id;

UPDATE student_subscriptions s
   SET teacher_name = COALESCE(NULLIF(s.teacher_name, ''), el->>'teacher'),
       updated_at = now()
  FROM registrations r,
       jsonb_array_elements(CASE WHEN jsonb_typeof(r.subjects) = 'array'
                                 THEN r.subjects ELSE '[]'::jsonb END) el
 WHERE r.id = s.student_id
   AND r.deleted_at IS NULL
   AND r.status = 'مسجل نهائياً'
   AND COALESCE(s.teacher_name, '') = ''
   AND el->>'teacherId' IS NOT NULL
   AND el->>'teacherId' <> ''
   AND el->>'teacherId' = s.teacher_id;

-- ────────────────────────────────────────────────────────────────
-- هـ) تحديث حالة كل شهر حسب تاريخ اليوم
-- ────────────────────────────────────────────────────────────────
UPDATE subscription_periods p
   SET status = CASE WHEN to_char(CURRENT_DATE, 'YYYY-MM-DD') < p.start_date THEN 'upcoming'
                     WHEN to_char(CURRENT_DATE, 'YYYY-MM-DD') > p.end_date   THEN 'completed'
                     ELSE 'active' END,
       updated_at = now()
 WHERE p.status <> 'cancelled'
   AND p.start_date IS NOT NULL AND p.start_date <> ''
   AND p.end_date   IS NOT NULL AND p.end_date   <> ''
   AND p.status <> CASE WHEN to_char(CURRENT_DATE, 'YYYY-MM-DD') < p.start_date THEN 'upcoming'
                        WHEN to_char(CURRENT_DATE, 'YYYY-MM-DD') > p.end_date   THEN 'completed'
                        ELSE 'active' END;

-- ────────────────────────────────────────────────────────────────
-- التحقق — اشتراكات طالب معيّن وشهوره (غيّر الرقم عند الحاجة)
-- ────────────────────────────────────────────────────────────────
-- SELECT s.id, s.status, s.start_date, s.end_date, s.months,
--        s.total_sessions, s.subject_name, s.teacher_name,
--        p.month_number, p.start_date AS p_start, p.end_date AS p_end,
--        p.total_sessions AS p_total, p.used_sessions AS p_used,
--        p.remaining_sessions AS p_remaining, p.status AS p_status
--   FROM student_subscriptions s
--   LEFT JOIN subscription_periods p ON p.subscription_id = s.id
--  WHERE s.student_id = '659'
--  ORDER BY s.created_at, p.month_number;
