-- إزالة القصّ الصامت لبيانات الاشتراكات (سبب عدم تطابق المستحقات)
--
-- العرض التوضيحي (أستاذ نمسي عبدالرحمان):
--   جدول الاشتراكات الشهرية : 117 تلميذاً / 740 حصة مستهلكة
--   تقرير المستحقات        :  87 تلميذاً / 572 حصة  (الفرق 168 حصة)
--
--   25 تلميذاً غابوا كلياً من تقرير المستحقات (166 حصة)
--   وتلميذ واحد ناقص جزئياً: ياسين رمولي 8 → 6 حصة
--                            (166 + 2 = 168 = 740 - 572) ✓
--
-- السبب الجذري:
--   admin_list_subscriptions_rich كانت تُرجع آخر 500 اشتراك فقط:
--       FROM (SELECT * FROM student_subscriptions
--             ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 500) s
--   و admin_list_subscriptions كانت تُرجع آخر 200 فقط.
--
--   هذه الدالة هي المصدر الوحيد لحساب مستحقات الأستاذ، فكل
--   اشتراك قديم خارج آخر 500 اشتراك كان يُقصّ بصمت ولا يُحسب أبداً،
--   بينما يبقى ظاهراً في جدول الاشتراكات الشهري عند المقارنة.
--
-- الإصلاح:
--   إزالة الحدّين نهائياً. الدالة ترجّع كل الاشتراكات مع فتراتها.
--
-- ملاحظة: بعد التطبيق يجب إعادة حساب المستحقات لكل أستاذ.
-- المتوقع للأستاذ المذكور: 740 حصة × 175 = 129500 دج

-- قائمة الاشتراكات (للوحة الإدارة)
CREATE OR REPLACE FUNCTION admin_list_subscriptions(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC), '[]'::jsonb)
            FROM student_subscriptions s);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- قائمة الاشتراكات الغنية: كل اشتراك + أشهره (للوحة الإدارة)
-- ⚠️ لا تضع LIMIT هنا. هذا المصدر الوحيد لمستحقات الأستاذ،
-- فأي حد ثابت يجعل تلاميذ كلياً يختفيون من تقرير المستحقات.
CREATE OR REPLACE FUNCTION admin_list_subscriptions_rich(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'subscription', to_jsonb(s),
    'periods', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.month_number), '[]'::jsonb)
                FROM subscription_periods p WHERE p.subscription_id = s.id)
) ORDER BY COALESCE(s.updated_at, s.created_at) DESC), '[]'::jsonb)
            FROM student_subscriptions s);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;