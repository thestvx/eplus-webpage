-- ════════════════════════════════════════════════════════════════════════
-- الاشتراكات الشهرية: تمديد/دمج الاشتراك الفعّال بدلاً من رفضه أو تكراره
-- (لوحة الإدارة admin.html → قسم الاشتراكات الشهرية)
--
-- المشكلة التي يُصلحها الملف:
--   عند إضافة اشتراك جديد لطالب يملك بالفعل اشتراكاً **فعّالاً** لنفس
--   (الطالب + المادة + الأستاذ) يتداخل زمنياً مع الجلسة الجديدة، كانت
--   الدالة ترفض العملية برسالة
--       «overlapping active subscription for this student/subject/teacher»
--   — أي لا يمكن إضافة حصص جديدة لاشتراك سارٍ (مثال: طالب اشترك بباقة
--   8 حصص شهرياً نحو هذا الأستاذ، ثم أُريدت إضافة حصص إضافية لنفس
--   المادة والأستاذ قبل انتهاء الباقة).
--
-- السلوك الجديد: **نمدّد نفس الاشتراك الفعّال** بدل الرفض:
--   • عدد الحصص الجديد يُضاف إلى رصيد الاشتراك الحالي:
--     total_sessions (+) — فيزداد عدد الحصص بدل الرفض.
--   • الدفع الجديد يُضاف إلى total_price الحالي (سجل مالي صادق).
--   • تُنشأ أشهرٌ جديدة في subscription_periods تبدأ من اليوم التالي
--     لنهاية الاشتراك الحالي (كل شهر بحصصه)، و end_date تُمَدَّد لتغطية
--     آخر شهر فعلي (وليس نافذة البداية فقط) — فلا يظهر الاشتراك منتهياً
--     والحصص المدفوعة ما زالت باقية.
--   • لا يُنشأ صف اشتراك ثانٍ لنفس الطالب/المادة/الأستاذ (لا تكرار).
--   • لا يُلمَس الحضور إطلاقاً.
--   • الاشتراك الدائم (p_permanent) يحوّل الاشتراك إلى دائم ويُضاف
--     الرصيد دون إنشاء أشهر.
--
-- ⚠️ ملاحظة أمان/سلامة:
--   student_subscriptions لا تحوي عمود remaining_sessions/used_sessions
--   (هذه الأعمدة في subscription_periods لكل شهر). لذا يمسّ هذا الدمج
--   إجمالي الاشتراك (total_sessions و total_price) ويمدد end_date، ويوزع
--   الحصص الجديدة على أشهر جديدة في subscription_periods. الحضور لا
--   يعتمد على صف الاشتراك بل على (التلميذ + المادة + الأستاذ).
--
-- التنفيذ: افتح Supabase SQL Editor ← الصق الملف كاملاً ← Run.
-- ════════════════════════════════════════════════════════════════════════

-- دالة تطبيع المطابقة الاسمية (تُعاد تعريفها لتكون مستقلة عن أي نسخة)
CREATE OR REPLACE FUNCTION _sn(p TEXT) RETURNS TEXT AS $$
  SELECT lower(regexp_replace(COALESCE(p, ''), '\s+', '', 'g'));
$$ LANGUAGE sql IMMUTABLE;

-- تطبيع أسماء الأساتذة: إزالة الفراغات ثم فرز الأحرف — يجعل «عبد الرحمان سرهود»
-- و«سرهود عبدالرحمان» و«سرهود عبد الرحمان» اسماً واحداً (نفس الحروف). لا تُستخدم
-- للمواد (المطابقة الاسمية للمواد تبقى بحسب _sn).
CREATE OR REPLACE FUNCTION _ncan(p TEXT) RETURNS TEXT AS $$
  SELECT lower(coalesce(string_agg(ch, '' ORDER BY ch), ''))
    FROM (SELECT regexp_split_to_table(regexp_replace(coalesce(p, ''), '\s+', '', 'g'), '') AS ch) s
   WHERE ch <> '';
$$ LANGUAGE sql IMMUTABLE;

-- إزالة النسخة القديمة (بدون p_permanent) إن وُجدت — يمنع تضارب الحمولة
-- (overload) «function is not unique» الذي يجعل الإنشاء يفشل بصمت.
DROP FUNCTION IF EXISTS admin_create_subscription(
  p_admin_uid text, p_student_id text, p_start_date text,
  p_months integer, p_total_price integer, p_payment_id text,
  p_total_sessions integer, p_notes text, p_teacher_id text,
  p_subject_id text, p_teacher_name text, p_subject_name text
);

-- عمود «آخر تعديل» على الاشتراك: تجري قائمة الاشتراكات الشهرية (الأحدث أولاً)
-- ترتيبها بحسب آخر نشاط (إنشاء أو دمج/تمديد) بدل تاريخ الإنشاء فقط — فيظهر
-- الطالب فوراً بعد إنشاء اشتراكه حتى لو كان مدمجاً مع اشتراك قديم.
ALTER TABLE student_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION admin_create_subscription(
  p_admin_uid TEXT,
  p_student_id TEXT,
  p_start_date TEXT,
  p_months INT,
  p_total_price INT,
  p_payment_id TEXT,
  p_total_sessions INT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_teacher_id TEXT DEFAULT NULL,
  p_subject_id TEXT DEFAULT NULL,
  p_teacher_name TEXT DEFAULT NULL,
  p_subject_name TEXT DEFAULT NULL,
  p_permanent BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  v_sub_id TEXT;
  v_months INT;
  v_cur DATE;
  v_next TIMESTAMP;
  v_start TEXT;
  v_end TEXT;
  v_total INT;
  v_total_sessions INT;
  v_period INT;
  v_base_month INT;
  v_today TEXT := to_char(CURRENT_DATE, 'YYYY-MM-DD');
  v_teacher_id TEXT := COALESCE(NULLIF(p_teacher_id, ''), '');
  v_subject_id TEXT := COALESCE(NULLIF(p_subject_id, ''), '');
  v_existing_id TEXT;
  v_existing_status TEXT;
  v_existing_end TEXT;
  v_is_permanent BOOLEAN;
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_student_id IS NULL OR p_student_id = '' THEN RAISE EXCEPTION 'student_id required'; END IF;
  IF p_start_date IS NULL OR p_start_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'invalid start_date (YYYY-MM-DD)'; END IF;
  v_months := COALESCE(p_months, 1);
  IF NOT p_permanent AND v_months NOT IN (1, 2, 3) THEN RAISE EXCEPTION 'months must be 1, 2 or 3'; END IF;
  IF p_permanent THEN v_months := 1; END IF;
  IF p_payment_id IS NULL OR p_payment_id = '' THEN RAISE EXCEPTION 'payment_id required (idempotency)'; END IF;
  IF EXISTS (SELECT 1 FROM student_subscriptions WHERE payment_id = p_payment_id) THEN
    RAISE EXCEPTION 'payment already exists: %', p_payment_id USING ERRCODE = '23505';
  END IF;
  -- الاشتراك يجب أن يخص مادة + أستاذ (لا اشتراكات عامة جديدة)
  IF v_subject_id = '' THEN RAISE EXCEPTION 'subject_id required (per-subject subscription)'; END IF;
  IF v_teacher_id = '' THEN RAISE EXCEPTION 'teacher_id required (per-subject subscription)'; END IF;
  v_total := COALESCE(p_total_price, v_months * 2000);
  IF v_total < 0 THEN RAISE EXCEPTION 'total_price must be >= 0'; END IF;
  -- الباقة المخصصة: عدد الحصص يأتي من p_total_sessions (المستخدم يحدده بنفسه).
  -- إذا لم يُوفَّر، يُحسب 8 حصص لكل شهر كافتراضي.
  v_total_sessions := COALESCE(p_total_sessions, v_months * 8);
  IF p_permanent THEN v_total_sessions := COALESCE(v_total_sessions, 100000); END IF;
  IF v_total_sessions < 1 THEN RAISE EXCEPTION 'total_sessions must be >= 1'; END IF;

  -- الطالب مسجل فعلاً لدى هذا الأستاذ في هذه المادة (مصدر واحد للتسجيل).
  -- المطابقة بالاسم أولاً: بيانات التسجيل القديمة قد لا تحوي subjectId/teacherId
  -- (فقط subject + teacher)، لذا المطابقة الصارمة بالـ IDs تُفشل طلاباً مسجلين فعلاً.
  -- الـ IDs تُستخدم كتطابق إضافي إن وُجدت، مع بديل اسمي: الاجتماعيات = التاريخ ( دورة ).
  IF NOT EXISTS (
    SELECT 1 FROM registrations r,
           jsonb_array_elements(CASE WHEN jsonb_typeof(r.subjects) = 'array' THEN r.subjects ELSE '[]'::jsonb END) el
     WHERE r.id = p_student_id
       AND r.deleted_at IS NULL
       AND r.status = 'مسجل نهائياً'
       AND (
             (el->>'subjectId' IS NOT NULL AND el->>'subjectId' <> '' AND el->>'subjectId' = v_subject_id)
          OR (COALESCE(p_subject_name, '') <> '' AND _sn(el->>'subject') = _sn(p_subject_name))
          OR (_sn(el->>'subject') IN ('الاجتماعيات','التاريخ(دورة)') AND _sn(p_subject_name) IN ('الاجتماعيات','التاريخ(دورة)'))
       )
       AND (
             (el->>'teacherId' IS NOT NULL AND el->>'teacherId' <> '' AND el->>'teacherId' = v_teacher_id)
          OR _sn(el->>'teacher') = _sn(p_teacher_name)
          OR _ncan(el->>'teacher') = _ncan(p_teacher_name)
          OR (el->>'teacher' IS NULL OR el->>'teacher' = '')
       )
  ) THEN RAISE EXCEPTION 'student not enrolled for this subject/teacher'; END IF;

  v_sub_id := 'SUB-' || p_student_id || '-' || to_char(now(), 'YYYYMMDDHH24MISSMS');
  v_cur := p_start_date::date;
  IF p_permanent THEN
    v_next := NULL;
    v_end := '2099-12-31';
  ELSE
    v_next := v_cur + (v_months * interval '1 month');
    v_end := to_char(v_next - interval '1 day', 'YYYY-MM-DD');
  END IF;

  -- ────────────────────────────────────────────────────────────────
  -- الدمج/التمديد بدلاً من الرفض:
  -- إذا وُجد اشتراك فعّال لنفس (الطالب + المادة + الأستاذ) يتداخل
  -- زمنياً مع الجلسة الجديدة، نمدّد نفس الصف (لا إنشاء صف ثانٍ).
  -- ────────────────────────────────────────────────────────────────
  SELECT s.id, s.status, s.end_date
    INTO v_existing_id, v_existing_status, v_existing_end
    FROM student_subscriptions s
   WHERE s.student_id = p_student_id
     AND s.status <> 'cancelled'
     AND s.subject_id = v_subject_id
     AND s.teacher_id = v_teacher_id
     AND p_start_date <= s.end_date
     AND v_end >= s.start_date
   ORDER BY s.start_date
   LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    v_is_permanent := p_permanent OR v_existing_status = 'permanent';

    -- الأشهر الإضافية (للباقات الشهرية فقط): تُنشأ بدءاً من اليوم التالي
    -- لآخر نهاية فعليّة، فلا تتداخل مع أشهر الاشتراك الحالية أبداً.
    IF NOT v_is_permanent THEN
      v_base_month := (SELECT COALESCE(MAX(month_number), 0) FROM subscription_periods WHERE subscription_id = v_existing_id);
      v_cur := (CASE WHEN v_existing_end = '' OR v_existing_end IS NULL THEN p_start_date::date ELSE v_existing_end::date END) + 1;
      FOR i IN 1..v_months LOOP
        v_start := to_char(v_cur, 'YYYY-MM-DD');
        v_next := v_cur + interval '1 month';
        v_end := to_char(v_next - interval '1 day', 'YYYY-MM-DD');
        -- توزيع الحصص على الأشهر: في الباقة المخصصة وزّع عدد الحصص المتبقية على
        -- الأشهر المتبقية، وفي غيرها 8 حصص لكل شهر.
        v_period := CASE WHEN p_total_sessions IS NOT NULL
          THEN (SELECT COALESCE(floor((v_total_sessions - (i - 1) * (v_total_sessions / v_months)) / (v_months - (i - 1))), 0))
          ELSE 8 END;
        INSERT INTO subscription_periods
          (id, subscription_id, month_number, start_date, end_date, total_sessions, used_sessions, remaining_sessions, status)
        VALUES
          (v_existing_id || '-M' || (v_base_month + i), v_existing_id, (v_base_month + i),
           v_start, v_end, v_period, 0, v_period,
           CASE WHEN v_today < v_start THEN 'upcoming'
                WHEN v_today > v_end THEN 'completed'
                ELSE 'active' END);
        v_cur := v_next::date;
      END LOOP;
    END IF;

-- التمديد بعد بناء الأشهر: نهاية الاشتراك تُحسب من آخر شهر فعلي.
    UPDATE student_subscriptions s
       SET total_sessions = s.total_sessions + v_total_sessions,
            total_price    = s.total_price + v_total,
            end_date       = CASE WHEN v_is_permanent THEN '2099-12-31' ELSE GREATEST(s.end_date, v_end) END,
            months         = CASE WHEN v_is_permanent THEN s.months ELSE s.months + v_months END,
            status         = CASE WHEN v_is_permanent THEN 'permanent' ELSE s.status END,
            updated_at     = now(),
            notes          = CASE
                              WHEN COALESCE(s.notes, '') = '' THEN COALESCE(p_notes, '')
                              WHEN COALESCE(p_notes, '') = '' THEN s.notes
                              ELSE s.notes || ' | ' || p_notes END
     WHERE s.id = v_existing_id;

    RETURN jsonb_build_object(
      'merged', true,
      'subscription', (SELECT to_jsonb(s) FROM student_subscriptions s WHERE s.id = v_existing_id),
      'periods', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.month_number), '[]'::jsonb)
                  FROM subscription_periods p WHERE p.subscription_id = v_existing_id),
      'note', 'تمت إضافة الحصص إلى الاشتراك الفعّال الحالي (تمديد) بدلاً من إنشاء اشتراك ثانٍ — الحضور لم يُمسّ'
    );
  END IF;

  -- ── لا يوجد اشتراك متداخل: سلوك الإنشاء العادي (صف واحد + أشهر + حصص) ──
  INSERT INTO student_subscriptions
    (id, student_id, teacher_id, subject_id, teacher_name, subject_name,
     start_date, end_date, months, total_price, total_sessions, status, payment_id, notes)
  VALUES
    (v_sub_id, p_student_id, v_teacher_id, v_subject_id,
     COALESCE(p_teacher_name, ''), COALESCE(p_subject_name, ''),
     p_start_date, v_end, v_months, v_total, v_total_sessions,
     CASE WHEN p_permanent THEN 'permanent' ELSE 'active' END, p_payment_id, COALESCE(p_notes, ''));

  FOR i IN 1..v_months LOOP
    v_start := to_char(v_cur, 'YYYY-MM-DD');
    IF p_permanent THEN
      v_end := '2099-12-31';
      v_period := v_total_sessions;
    ELSE
      v_next := v_cur + interval '1 month';
      v_end := to_char(v_next - interval '1 day', 'YYYY-MM-DD');
      -- توزيع الحصص على الأشهر: في الباقة المخصصة وزّع عدد الحصص المتبقية على
      -- الأشهر المتبقية، وفي غيرها 8 حصص لكل شهر.
      v_period := CASE WHEN p_total_sessions IS NOT NULL
        THEN (SELECT COALESCE(floor((v_total_sessions - (i - 1) * (v_total_sessions / v_months)) / (v_months - (i - 1))), 0))
        ELSE 8 END;
    END IF;
    INSERT INTO subscription_periods
      (id, subscription_id, month_number, start_date, end_date, total_sessions, used_sessions, remaining_sessions, status)
    VALUES
      (v_sub_id || '-M' || i, v_sub_id, i, v_start, v_end, v_period, 0, v_period,
       CASE WHEN v_today < v_start THEN 'upcoming'
            WHEN v_today > v_end THEN 'completed'
            ELSE 'active' END);
    v_cur := v_next::date;
  END LOOP;

  RETURN (SELECT jsonb_build_object(
    'subscription', to_jsonb(s),
    'periods', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.month_number), '[]'::jsonb)
                FROM subscription_periods p WHERE p.subscription_id = s.id)
  ) FROM student_subscriptions s WHERE s.id = v_sub_id);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- قائمة الاشتراكات: الأحدث أولاً حسب آخر نشاط (إنشاء أو دمج/تمديد) —
-- حتى يظهر الطالب في القائمة مباشرة بعد إضافة اشتراك له (وليستفيد الدمج
-- في القائمة الترتيبية). تتضمن نهجاً متزايداً نحو تغطية أكبر عدد.
CREATE OR REPLACE FUNCTION admin_list_subscriptions_rich(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'subscription', to_jsonb(s),
    'periods', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.month_number), '[]'::jsonb)
                FROM subscription_periods p WHERE p.subscription_id = s.id)
  ) ORDER BY COALESCE(s.updated_at, s.created_at) DESC), '[]'::jsonb)
            FROM (SELECT * FROM student_subscriptions
                   ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 500) s);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;