-- ═══════════════════════════════════════════════════════════════
-- توحيد اسم الأستاذ سرهود عبدالرحمان داخل subjects[].teacher
-- (تسجيلات الدعم المدرسي — جدول registrations)
--
-- المشكلة: الأستاذ «سرهود عبدالرحمان» مُخزَّن بعدة تهجئات وترتيبات
--   (عبد الرحمان سرهود / عبدالرحمان سرهود / سرهود عبد الرحمان /
--    عبد الرحمن سرهود / سرهود عبدالرحمن ... إلخ)
--   مما يجعل فلتر الأساتذة في لوحة الإدارة يعرضه أكثر من مرة.
--
-- هذا التصحيح فقط يوحّد *الاسم* داخل كل صف دون:
--   ✗ حذف أي تلميذ أو صف
--   ✗ دمج تلميذين (كل تلميذ يبقى صفاً واحداً)
--   ✗ حذف مادة مشروعة — التلميذ الذي اختار «المحاسبة» و«اقتصاد وقانون»
--     يبقى مع المادتين معاً (اختيار مادتين صحيح وليس تكراراً)
--   ✗ المساس بالحضور (تسجيل الحضور مرتبط بالتلميذ والمادة، لا باسم الأستاذ)
--
-- التنفيذ: من Supabase SQL Editor مباشرةً، ثم أعد تحميل لوحة الإدارة.
-- ═══════════════════════════════════════════════════════════════

-- 1) دالة مساعدة: تحويل التهجئة إلى الصيغة الموحّدة
CREATE OR REPLACE FUNCTION normalize_srehoud_teacher(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s TEXT := regexp_replace(btrim(COALESCE(name, '')), '\s+', ' ', 'g');
BEGIN
  IF s IN (
    'عبد الرحمان سرهود',
    'عبدالرحمان سرهود',
    'سرهود عبدالرحمان',
    'عبد الرحمن سرهود',
    'عبدالرحمن سرهود',
    'سرهود عبد الرحمان',
    'سرهود عبدالرحمن'
  ) THEN
    RETURN 'سرهود عبدالرحمان';
  END IF;
  RETURN name;
END;
$$;

-- 2) توحيد التهجئات فعلياً داخل subjects[] في كل صف
UPDATE registrations
SET subjects = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN jsonb_typeof(elem) = 'object' AND elem ? 'teacher'
        THEN elem || jsonb_build_object('teacher', normalize_srehoud_teacher(elem->>'teacher'))
      ELSE elem
    END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(subjects) = 'array' THEN subjects ELSE '[]'::jsonb END
  ) AS elem
)
WHERE jsonb_typeof(subjects) = 'array'
  AND subjects::text LIKE '%سرهود%';

-- 3) التحقق: يجب أن يظهر الأستاذ مرة واحدة فقط بين الخيارات المرشّحة
SELECT DISTINCT elem->>'teacher' AS teacher
FROM registrations,
     jsonb_array_elements(
       CASE WHEN jsonb_typeof(subjects) = 'array' THEN subjects ELSE '[]'::jsonb END
     ) AS elem
WHERE elem ? 'teacher'
  AND elem->>'teacher' LIKE '%سرهود%'
  OR elem ? 'teacher'
  AND elem->>'teacher' LIKE '%سرهود%'
ORDER BY 1;
