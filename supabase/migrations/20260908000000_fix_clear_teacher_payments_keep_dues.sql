-- ═══════════════════════════════════════════════════════════
-- Fix: admin_clear_teacher_payments now keeps dues (payments-only wipe)
--
-- السلوك السابق: كان يحذف كل معاملات الأستاذ (دفعات + مستحقات) رغم أن
-- التعليقات والواجهة تصف زر «مسح سجل الدفعات» بأنه لا يمسّ المستحقات.
-- إعادة «مسح حرفية» الحسابات كانت تفرِّغ الدفتر كلياً حتى وإن بقي حضور
-- غير مسدّد، فتظهر «لا توجد مستحقات» لداشبورد الأستاذ خطأً.
--
-- السلوك الجديد: يحذف صفوف payment فقط، ويحتفظ بمستحقات dues، ويعكس
-- أثر الدفعات على الخزينة، ثم يعيد حساب الرصيد.
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION admin_clear_teacher_payments(
  p_admin_uid TEXT,
  p_teacher_id TEXT,
  p_teacher_name TEXT,
  p_rate INT,
  p_admin_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_amount INT := 0;
  v_count INT := 0;
  v_dues INT := 0;
  v_receipts INT := 0;
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_teacher_id IS NULL OR p_teacher_id = '' THEN RAISE EXCEPTION 'teacher_id required'; END IF;

  -- 1) اجمع مبالغ وعناوين كل الدفعات (قبل الحذف)
  SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO v_amount, v_count
    FROM teacher_transactions
   WHERE teacher_id = p_teacher_id AND transaction_type = 'payment';

  -- 2) عدد سجلات المستحقات وإيصالات الأستاذ (قد تكون حتى من دون معاملة مقابلة — إيصالات قديمة)
  SELECT COUNT(*) INTO v_dues
    FROM teacher_transactions
   WHERE teacher_id = p_teacher_id AND transaction_type = 'dues';

  SELECT COUNT(*) INTO v_receipts
    FROM teacher_receipts
   WHERE teacher_id = p_teacher_id;

  IF v_count = 0 AND v_dues = 0 AND v_receipts = 0 THEN
    RETURN jsonb_build_object('deleted', 0, 'dues_removed', 0, 'dues_kept', 0, 'receipts_removed', 0, 'amount_reversed', 0);
  END IF;

  -- 3) حذف صفوف الدفعات فقط من الدفتر (مستحقات dues تبقى دون مساس)
  DELETE FROM teacher_transactions
   WHERE teacher_id = p_teacher_id AND transaction_type = 'payment';

  -- 4) حذف كل إيصالات الأستاذ (المرتبطة بالدفعات واليتيمة على حد سواء)
  DELETE FROM teacher_receipts WHERE teacher_id = p_teacher_id;

  -- 5) الخزينة: احذف معاملات الرواتب الصادرة عن هذه الدفعات
  DELETE FROM support_finance_tx
   WHERE teacher_id = p_teacher_id AND source_type = 'salary';

  -- 6) إعادة المبلغ الإجمالي للرصيد (كما يفعل admin_delete_transaction)
  IF v_amount > 0 THEN
    UPDATE support_finance_balance
       SET total_balance = GREATEST(0, total_balance + v_amount),
           updated_at = now()
     WHERE id = 'global';
  END IF;

  -- 7) إعادة حساب رصيد الأستاذ
  PERFORM admin_recompute_balance(p_admin_uid, p_teacher_id, p_teacher_name, NULL, NULL, p_rate, p_admin_name);

  RETURN jsonb_build_object(
    'deleted', v_count,
    'dues_removed', 0,
    'dues_kept', v_dues,
    'receipts_removed', v_receipts,
    'amount_reversed', v_amount
  );
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;