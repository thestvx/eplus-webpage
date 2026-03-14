/* ═══════════════════════════════════════════
   CAMP REGISTRATION — Apps Script Only
   بدون Firebase — Google Sheet مباشر
═══════════════════════════════════════════ */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzJx2NEPz7a7ntKmXQQq7i78ICeIFHiuAxTpfJyAocSkeqmbsmhx_h3YzVjbqs0eiyF/exec";

/* ════════════════════════════════════════
   REGISTER FORM
════════════════════════════════════════ */
const form      = document.getElementById("camp-form");
const submitBtn = document.getElementById("camp-submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const firstName   = document.getElementById("campFirstName").value.trim();
  const lastName    = document.getElementById("campLastName").value.trim();
  const age         = document.getElementById("campAge").value;
  const parentName  = document.getElementById("campParentName").value.trim();
  const parentPhone = document.getElementById("campParentPhone").value.trim();

  // validation
  const fields = [
    { el: document.getElementById("campFirstName"),   val: firstName   },
    { el: document.getElementById("campLastName"),    val: lastName    },
    { el: document.getElementById("campAge"),         val: age         },
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
  if (!valid) return;

  submitBtn.classList.add("loading");
  submitBtn.disabled = true;

  const payload = JSON.stringify({
    firstName, lastName,
    age:        String(age),
    parentName, parentPhone,
    timestamp:  new Date().toISOString()
  });

  // إرسال عبر Image trick (يتجاوز CORS تماماً)
  const img = new Image();
  const encodedPayload = encodeURIComponent(payload);
  img.src = APPS_SCRIPT_URL + "?payload=" + encodedPayload;

  // نعرض النجاح بعد 1.5 ثانية بدون انتظار رد
  setTimeout(() => {
    form.innerHTML = \`
      <div style="text-align:center;padding:30px 0;
                  display:flex;flex-direction:column;
                  align-items:center;gap:16px;">
        <div style="font-size:52px;">🎉</div>
        <div style="font-size:18px;font-weight:800;color:#fff;">تم التسجيل بنجاح!</div>
        <div style="font-size:14px;color:rgba(200,230,255,0.75);line-height:1.8;">
          أهلاً <strong style="color:#7cc8f0;">\${firstName} \${lastName}</strong><br>
          سيتم التواصل معك قريباً على رقم ولي الأمر.<br>
          <span style="color:rgba(255,210,80,0.8);font-size:12px;">
            نتمنى لك تجربة رائعة في المخيم الربيعي 🌿
          </span>
        </div>
      </div>\`;
  }, 1500);
});
