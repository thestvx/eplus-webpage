/* ═══════════════════════════════════════════
   CAMP REGISTRATION — Apps Script Only
════════════════════════════════════════════ */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzJx2NEPz7a7ntKmXQQq7i78ICeIFHiuAxTpfJyAocSkeqmbsmhx_h3YzVjbqs0eiyF/exec";

function campRegister(e) {
  // نمنع أي reload أو submit
  if (e) { e.preventDefault(); e.stopPropagation(); }

  const firstName   = document.getElementById("campFirstName").value.trim();
  const lastName    = document.getElementById("campLastName").value.trim();
  const age         = document.getElementById("campAge").value;
  const parentName  = document.getElementById("campParentName").value.trim();
  const parentPhone = document.getElementById("campParentPhone").value.trim();

  const fields = [
    { el: document.getElementById("campFirstName"),   val: firstName   },
    { el: document.getElementById("campLastName"),    val: lastName    },
    { el: document.getElementById("campParentName"),  val: parentName  },
    { el: document.getElementById("campParentPhone"), val: parentPhone },
  ];

  let valid = true;
  fields.forEach(f => {
    if (!f.val) {
      f.el.classList.add("error");
      f.el.addEventListener("input", () => f.el.classList.remove("error"), { once: true });
      valid = false;
    }
  });

  // التحقق من العمر
  const ageEl  = document.getElementById("campAge");
  const ageNum = parseInt(age);
  if (!age || isNaN(ageNum) || ageNum <= 0) {
    ageEl.classList.add("error");
    ageEl.addEventListener("input", () => ageEl.classList.remove("error"), { once: true });
    valid = false;
  } else if (ageNum < 8 || ageNum > 14) {
    ageEl.classList.add("error");
    ageEl.addEventListener("input", () => ageEl.classList.remove("error"), { once: true });
    alert("❌ عذراً، العمر غير مسموح به للمشاركة في المخيم.\nالفئة العمرية المقبولة: 8 إلى 14 سنة.");
    valid = false;
  }

  if (!valid) return;

  const submitBtn = document.getElementById("camp-submit-btn");
  submitBtn.classList.add("loading");
  submitBtn.disabled = true;

  // إرسال البيانات لـ Google Sheet عبر Image (يتجاوز CORS)
  const payload = encodeURIComponent(JSON.stringify({
    firstName, lastName, age: String(age),
    parentName, parentPhone,
    timestamp: new Date().toISOString()
  }));
  new Image().src = APPS_SCRIPT_URL + "?payload=" + payload;

  // عرض رسالة النجاح بعد 1.5 ثانية
  setTimeout(() => {
    const form = document.getElementById("camp-form");
    if (form) {
      form.innerHTML = `
        <div style="text-align:center;padding:30px 0;
                    display:flex;flex-direction:column;
                    align-items:center;gap:16px;">
          <div style="font-size:52px;">🎉</div>
          <div style="font-size:18px;font-weight:800;color:#fff;">تم التسجيل بنجاح!</div>
          <div style="font-size:14px;color:rgba(200,230,255,0.75);line-height:1.8;">
            أهلاً <strong style="color:#7cc8f0;">${firstName} ${lastName}</strong><br>
            سيتم التواصل معك قريباً على رقم ولي الأمر.<br>
            <span style="color:rgba(255,210,80,0.8);font-size:12px;">
              نتمنى لك تجربة رائعة في المخيم الربيعي 🌿
            </span>
          </div>
        </div>`;
    }
  }, 1500);

  return false;
}

// نربط الزر والفورم كلاهما
document.addEventListener("DOMContentLoaded", () => {
  const form      = document.getElementById("camp-form");
  const submitBtn = document.getElementById("camp-submit-btn");

  if (form)      form.addEventListener("submit",  campRegister);
  if (submitBtn) submitBtn.addEventListener("click", campRegister);
});

// fallback لو الصفحة محملة مسبقاً
(function() {
  const form      = document.getElementById("camp-form");
  const submitBtn = document.getElementById("camp-submit-btn");
  if (form)      form.addEventListener("submit",  campRegister);
  if (submitBtn) submitBtn.addEventListener("click", campRegister);
})();
