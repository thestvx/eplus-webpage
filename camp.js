/*
  camp.js — يتوافق مع camp.html
  يعالج: Pricing Tabs, Modals, Gallery, Video, Scroll Reveal, Tilt, Forms
*/

/* ═══════════════════════════════════════════
   CONFIG
════════════════════════════════════════════ */
const CAMP_MIN_AGE = 5;

// URL حق باقات المخيم الصيفي — SummerPlus
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzajcQXvsVkQEgpBttUmoD1ECSVJ5mJiT3X8oafy6m6uNNfLSzwfl8xxVcTeTU5q3D8lg/exec";

// URL حق البرامج الخاصة — programsummerschool
const SPECIAL_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz7dWGL35sIFP4H4ASsRPKBC_LKMFMwUIcC6hXMfSi8P59QIxhTOFbm6ZFpN1So40iyGA/exec";

const VIDEO_PUBLIC_ID   = "copy_B61063D2-D03E-41C1-AB91-1B692AB1F686_rvphab";
const VIDEO_CLOUD_NAME  = "dac4mwuwe";
const VIDEO_FALLBACK_SRC =
  `https://res.cloudinary.com/${VIDEO_CLOUD_NAME}/video/upload/q_auto,f_auto/${VIDEO_PUBLIC_ID}.mp4`;

const GALLERY_FOLDER  = "eplus-gallery";
const GALLERY_MAX     = 24;

const prefersReducedMotion =
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

let isSubmitting        = false;
let successOverlayShown = false;

/* ═══════════════════════════════════════════
   HELPERS
════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

function norm(v)  { return String(v ?? "").trim(); }
function normPhone(v) { return norm(v).replace(/\s+/g, ""); }

function markInvalid(el) {
  if (!el) return;
  el.classList.add("input-error");
}

function clearInvalid(el) {
  if (!el) return;
  el.classList.remove("input-error");
}

function clearChoiceError(name) {
  document.querySelectorAll(`input[name="${name}"]`).forEach(inp => {
    inp.classList.remove("input-error");
    inp.closest(".choice-item")?.classList.remove("choice-error");
  });
}

function validatePhone(p) {
  return /^[+\d][\d\s]{7,14}$/.test(p);
}

function focusEl(el) {
  if (!el || typeof el.focus !== "function") return;
  try { el.focus({ preventScroll: false }); } catch { el.focus(); }
}

function scrollTo(el) {
  if (!el) return;
  try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch { el.scrollIntoView(); }
}

function buildTimestamp() {
  return new Date().toLocaleString("ar-DZ");
}

function setSubmitLoading(btnId, msg) {
  const btn = $(btnId);
  if (!btn) return;
  btn.disabled = true;
  btn.classList.add("loading");
  const span = btn.querySelector("span");
  if (span) span.textContent = msg;
}

function setSubmitError(btnId, errMsg, resetMsg, delay = 3200) {
  const btn = $(btnId);
  if (!btn) return;
  btn.classList.remove("loading");
  btn.classList.add("error-state");
  const span = btn.querySelector("span");
  if (span) span.textContent = errMsg;
  setTimeout(() => {
    btn.disabled = false;
    btn.classList.remove("error-state");
    if (span) span.textContent = resetMsg;
  }, delay);
}

function resetSubmitBtn(btnId, resetMsg) {
  const btn = $(btnId);
  if (!btn) return;
  btn.disabled = false;
  btn.classList.remove("loading", "error-state", "success-state");
  const span = btn.querySelector("span");
  if (span) span.textContent = resetMsg;
}

// يرسل للجدول الكبير (باقات المخيم)
async function submitPayload(payload) {
  return await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  });
}

// يرسل للجدول الخاص بالبرامج الخاصة
async function submitSpecialPayload(payload) {
  return await fetch(SPECIAL_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  });
}

/* ═══════════════════════════════════════════
   SUCCESS OVERLAY
════════════════════════════════════════════ */
function buildSuccessOverlay(firstName, lastName, pkg, details) {
  const el = document.createElement("div");
  el.className = "success-overlay";
  el.innerHTML = `
    <div class="success-box">
      <span class="success-icon">🎉</span>
      <div class="success-title">
        تم إرسال طلبك بنجاح،
        <span class="success-name">${firstName} ${lastName}</span>!
      </div>
      <div class="success-meta">
        <strong>الباقة:</strong> ${pkg}<br>
        ${details ? `<strong>التفاصيل:</strong> ${details}` : ""}
        <br><br>سيتصل بكم فريق المركز لتأكيد الحجز وإتمام الدفع.
      </div>
      <button class="success-close-btn" type="button">
        <span>حسنًا، شكرًا</span> ✓
      </button>
    </div>
  `;

  el.querySelector(".success-close-btn").addEventListener("click", () => {
    el.remove();
    isSubmitting = false;
    successOverlayShown = false;
    document.body.style.overflow = "";
  });

  document.body.style.overflow = "hidden";
  return el;
}

/* ═══════════════════════════════════════════
   PRICING TABS
════════════════════════════════════════════ */
function initPricingTabs() {
  const tabs   = document.querySelectorAll(".ptab");
  const panes  = document.querySelectorAll(".pricing-pane");

  if (!tabs.length) return;

  tabs.forEach(tab => {
    if (tab.dataset.tabBound === "true") return;
    tab.dataset.tabBound = "true";

    tab.addEventListener("click", () => {
      tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      panes.forEach(p => {
        p.classList.remove("active");
        p.setAttribute("aria-hidden", "true");
      });

      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      const target = tab.dataset.target;
      if (target) {
        const pane = $(target);
        if (pane) {
          pane.classList.add("active");
          pane.setAttribute("aria-hidden", "false");
        }
      }
    });

    tab.addEventListener("keydown", e => {
      const list = [...tabs];
      const idx  = list.indexOf(tab);
      let next   = idx;
      if (e.key === "ArrowRight") next = (idx + 1) % list.length;
      else if (e.key === "ArrowLeft") next = (idx - 1 + list.length) % list.length;
      else return;
      e.preventDefault();
      focusEl(list[next]);
      list[next].click();
    });
  });
}

/* ═══════════════════════════════════════════
   MODALS
════════════════════════════════════════════ */
function openModal(id) {
  const modal = $(id);
  if (!modal) return;
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("open");
  document.body.style.overflow = "hidden";

  const focusable = modal.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]'
  );
  if (focusable.length) focusEl(focusable[0]);
}

function closeModal(id) {
  const modal = $(id);
  if (!modal) return;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  modal.classList.remove("open");
  if (!document.querySelector(".success-overlay")) {
    document.body.style.overflow = "";
  }
}

function initModals() {
  $("open-register-modal")?.addEventListener("click", () => openModal("camp-register-modal"));
  $("close-register-modal")?.addEventListener("click", () => closeModal("camp-register-modal"));
  $("camp-register-modal")?.querySelector(".modal-backdrop")
    ?.addEventListener("click", () => closeModal("camp-register-modal"));

  $("open-special-register-modal")?.addEventListener("click", () => openModal("special-register-modal"));
  $("close-special-register-modal")?.addEventListener("click", () => closeModal("special-register-modal"));
  $("special-register-modal")?.querySelector(".modal-backdrop")
    ?.addEventListener("click", () => closeModal("special-register-modal"));

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    closeModal("camp-register-modal");
    closeModal("special-register-modal");
  });
}

/* ═══════════════════════════════════════════
   SELECT PACKAGE FROM CARD BUTTON
════════════════════════════════════════════ */
window.selectPackage = function(pkgName) {
  const sel = $("campSelectedPackage");
  if (sel) {
    const opt = [...sel.options].find(o => norm(o.value) === norm(pkgName));
    if (opt) sel.value = opt.value;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }
  openModal("camp-register-modal");
  setTimeout(() => sel?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
};

/* ═══════════════════════════════════════════
   DYNAMIC FORM FIELDS
════════════════════════════════════════════ */
const FIELD_HEIGHTS = {
  langGroup510:    "260px",   // إنجليزية + فرنسية + ملاحظة
  langGroupPlus:   "280px",
  bacGroup:        "280px",
  itGroup:         "180px",
  adultLevelGroup: "130px",
  adultTestGroup:  "180px",
};

function showGroup(id) {
  const el = $(id);
  if (!el) return;
  el.style.maxHeight = FIELD_HEIGHTS[id] || "320px";
  el.classList.add("visible");
}

function hideGroup(id) {
  const el = $(id);
  if (!el) return;
  el.style.maxHeight = "0";
  el.classList.remove("visible");
}

function resetGroup(id, selector) {
  hideGroup(id);
  if (selector) {
    document.querySelectorAll(`#${id} ${selector}`).forEach(inp => {
      inp.checked = false;
    });
  }
  if (id === "adultLevelGroup") {
    const lvl = $("campAdultLevel");
    if (lvl) lvl.value = "";
  }
}

function updateFormFields(val) {
  const is510 = val.includes("5-10") || val.includes("comm-class");
  const is1114 = val.includes("11-14");
  const is1518basic = val === "basic-15-18";
  const is1518elite = val === "elite-15-18";
  const isBac = val.includes("bac");
  const isAdultBasic = val === "basic-adults";
  const isAdultAdv = val === "advanced-adults";
  const isCommClass = val.includes("comm-class");

  if (is510 || isCommClass) showGroup("langGroup510");
  else resetGroup("langGroup510", `input[name="lang510"]`);

  const needsPlus = is1114 || is1518basic || is1518elite;
  if (needsPlus) showGroup("langGroupPlus");
  else resetGroup("langGroupPlus", `input[name="langPlus"]`);

  if (isBac) showGroup("bacGroup");
  else resetGroup("bacGroup", `input[name="bacLang"]`);

  if (isAdultBasic) showGroup("adultLangGroup");
  else resetGroup("adultLangGroup", `input[name="adultLang"]`);

  if (isAdultAdv) showGroup("officeGroup");
  else resetGroup("officeGroup", `input[name="officeTrack"]`);
}

function initDynamicFields() {

  const packageSel = $("campSelectedPackage");
  if (!packageSel || packageSel.dataset.dynBound === "true") return;
  packageSel.dataset.dynBound = "true";

  packageSel.addEventListener("change", () => {
    updateFormFields(packageSel.value || "");
    clearInvalid(packageSel);
  });

  const adultLvl = $("campAdultLevel");
  if (adultLvl) {
    adultLvl.addEventListener("change", function() {
      if (this.value) showGroup("adultTestGroup");
      else hideGroup("adultTestGroup");
      clearInvalid(this);
    });
  }

  limitCheckboxes("lang510", 2);
  limitCheckboxes("langPlus", 2);
  limitCheckboxes("bacLang", 2);

  ["campFirstName","campLastName","campAge","campParentName","campParentPhone"].forEach(id => {
    $(id)?.addEventListener("input", function() { clearInvalid(this); });
  });

  document.querySelectorAll('input[name="bacLang"], input[name="itTrack"], input[name="adultTest"]')
    .forEach(inp => {
      inp.addEventListener("change", () => {
        clearChoiceError(inp.name);
        clearInvalid(inp);
      });
    });

  updateFormFields(packageSel.value || "");
}

function limitCheckboxes(name, max) {
  document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
    if (cb.dataset.limitBound === "true") return;
    cb.dataset.limitBound = "true";
    cb.addEventListener("change", () => {
      const checked = [...document.querySelectorAll(`input[name="${name}"]:checked`)];
      if (checked.length > max) cb.checked = false;
    });
  });
}

/* ═══════════════════════════════════════════
   PHONE / AGE SANITIZERS
════════════════════════════════════════════ */
function initInputSanitizers() {
  ["campParentPhone", "specialParentPhone"].forEach(id => {
    const el = $(id);
    if (!el || el.dataset.phoneBound === "true") return;
    el.dataset.phoneBound = "true";
    el.addEventListener("input", () => {
      el.value = el.value.replace(/[^\d+\s]/g, "");
      clearInvalid(el);
    });
  });

  ["campAge", "specialAge"].forEach(id => {
    const el = $(id);
    if (!el || el.dataset.ageBound === "true") return;
    el.dataset.ageBound = "true";
    el.addEventListener("input", () => {
      el.value = el.value.replace(/[^\d]/g, "");
      clearInvalid(el);
    });
  });
}

/* ═══════════════════════════════════════════
   MAIN CAMP FORM
════════════════════════════════════════════ */
function validateMainForm() {
  const pkgVal = norm($("campSelectedPackage")?.value);
  const firstName = norm($("campFirstName")?.value);
  const lastName = norm($("campLastName")?.value);
  const age = norm($("campAge")?.value);
  const parent = norm($("campParentName")?.value);
  const phone = normPhone($("campParentPhone")?.value);

  let firstBad = null;
  const req = el => { if (!el || !norm(el.value)) { markInvalid(el); if (!firstBad) firstBad = el; } };
  req($("campSelectedPackage")); req($("campFirstName")); req($("campLastName")); req($("campAge")); req($("campParentName")); req($("campParentPhone"));

  if (age && Number(age) < CAMP_MIN_AGE) { markInvalid($("campAge")); if (!firstBad) firstBad = $("campAge"); }
  if (phone && !validatePhone(phone)) { markInvalid($("campParentPhone")); if (!firstBad) firstBad = $("campParentPhone"); }
  if (firstBad) { scrollTo(firstBad.closest(".form-group")); focusEl(firstBad); return null; }

  const is510 = pkgVal.includes("5-10") || pkgVal.includes("comm-class");
  const is1114 = pkgVal.includes("11-14");
  const is1518 = pkgVal.includes("15-18") && !pkgVal.includes("bac");
  const isBac = pkgVal.includes("bac");
  const isAdultBasic = pkgVal === "basic-adults";
  const isAdultAdv = pkgVal === "advanced-adults";

  let langs = "";
  let itTrack = "";

  if (isAdultBasic) {
    const sel = [...document.querySelectorAll(`input[name="adultLang"]:checked`)].map(c => c.value);
    if (!sel.length) { alert("يرجى اختيار لغة واحدة على الأقل أو أكثر للباقة الكبار"); return null; }
    langs = sel.join(" + ");
  } else if (isAdultAdv) {
    const sel = [...document.querySelectorAll(`input[name="officeTrack"]:checked`)].map(c => c.value);
    if (!sel.length) { alert("يرجى اختيار مسار واحد على الأقل للباقة البالغين المتقدمة"); return null; }
    itTrack = sel.join(" + ");
  } else if (is510) {
    const sel = [...document.querySelectorAll(`input[name="lang510"]:checked`)].map(c => c.value);
    if (!sel.length) { alert("يرجى اختيار لغة واحدة على الأقل أو جميع اللغات المتوفرة في هذه الباقة"); return null; }
    langs = sel.join(" + ");
  } else if (is1114 || is1518) {
    const sel = [...document.querySelectorAll(`input[name="langPlus"]:checked`)].map(c => c.value);
    if (!sel.length) { alert("يرجى اختيار لغة واحدة على الأقل أو جميع اللغات المتوفرة في هذه الباقة"); return null; }
    langs = sel.join(" + ");
  } else if (isBac) {
    const sel = [...document.querySelectorAll(`input[name="bacLang"]:checked`)].map(c => c.value);
    if (!sel.length) { alert("يرجى اختيار لغة واحدة على الأقل أو جميع اللغات المتوفرة في هذه الباقة"); return null; }
    langs = sel.join(" + ");
  }

  const adultLevel = norm($("campAdultLevel")?.value);
  const adultTest = document.querySelector(`input[name="adultTest"]:checked`)?.value || "";
  const isAdult = isAdultBasic || isAdultAdv;
  if (isAdult && !adultLevel) { markInvalid($("campAdultLevel")); scrollTo($("adultLevelGroup") || $("officeGroup")); alert("يرجى اختيار مستوى اللغة"); return null; }

  return { pkgVal, langs, itTrack, adultLevel, adultTest, firstName, lastName, age, parent, phone };
}

function resetMainForm() {

  $("camp-form")?.reset();
  ["campSelectedPackage","campFirstName","campLastName","campAge","campParentName","campParentPhone","campAdultLevel"]
    .forEach(id => clearInvalid($(id)));
  clearChoiceError("bacLang");
  clearChoiceError("itTrack");
  clearChoiceError("adultTest");
  $("campSelectedPackage")?.dispatchEvent(new Event("change", { bubbles: true }));
}

function initMainForm() {
  const form = $("camp-form");
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (isSubmitting || successOverlayShown) return;

    const data = validateMainForm();
    if (!data) return;

    isSubmitting = true;
    setSubmitLoading("camp-submit-btn", "⏳ جاري الإرسال...");

    const payload = {
      source: "camp-packages",
      timestamp: buildTimestamp(),
      page: "summer-camp",
      formType: "camp-package",
      package:  data.pkg,
      languages: data.langs,
      itTrack: data.itTrack,
      adultLanguageLevel: data.adultLevel || "—",
      adultTestPreference: data.adultTest || "—",
      firstName: data.firstName,
      lastName:  data.lastName,
      age: data.age,
      parentName:  data.parent,
      parentPhone: data.phone,
      userAgent: navigator.userAgent.slice(0, 180),
      lang: navigator.language || "unknown"
    };

    try {
      await submitPayload(payload);
      successOverlayShown = true;
      closeModal("camp-register-modal");
      resetMainForm();
      document.body.appendChild(
        buildSuccessOverlay(data.firstName, data.lastName, data.pkg, data.langs !== "—" ? data.langs : "")
      );
    } catch (err) {
      console.error("Camp form error:", err);
      isSubmitting = false;
      setSubmitError("camp-submit-btn", "❌ حدث خطأ، حاول مجدداً", "إرسال طلب التسجيل");
    }
  });
}

/* ═══════════════════════════════════════════
   SPECIAL PROGRAM FORM
════════════════════════════════════════════ */
function validateSpecialForm() {
  const programs = [...document.querySelectorAll('input[name="specialProgramType"]:checked')].map(el => el.value);
  const firstName   = norm($("specialFirstName")?.value);
  const lastName    = norm($("specialLastName")?.value);
  const age         = norm($("specialAge")?.value);
  const parentName  = norm($("specialParentName")?.value);
  const parentPhone = normPhone($("specialParentPhone")?.value);

  let firstBad = null;
  const req = el => {
    if (!el || !norm(el.value)) { markInvalid(el); if (!firstBad) firstBad = el; }
  };

  if (!programs.length) {
    alert("⚠️ الرجاء اختيار نوع البرنامج.");
    return null;
  }

  req($("specialFirstName"));
  req($("specialLastName"));
  req($("specialAge"));
  req($("specialParentName"));
  req($("specialParentPhone"));

  if (age && Number(age) < CAMP_MIN_AGE) {
    markInvalid($("specialAge")); if (!firstBad) firstBad = $("specialAge");
  }

  if (parentPhone && !validatePhone(parentPhone)) {
    markInvalid($("specialParentPhone")); if (!firstBad) firstBad = $("specialParentPhone");
  }

  if (firstBad) {
    scrollTo(firstBad.closest(".form-group") || firstBad);
    focusEl(firstBad);
    return null;
  }

  return { programs, firstName, lastName, age, parentName, parentPhone };
}

function resetSpecialForm() {
  $("special-program-form")?.reset();
  ["specialFirstName","specialLastName","specialAge","specialParentName","specialParentPhone"]
    .forEach(id => clearInvalid($(id)));
}

function initSpecialForm() {
  const form = $("special-program-form");
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (isSubmitting || successOverlayShown) return;

    const data = validateSpecialForm();
    if (!data) return;

    isSubmitting = true;
    setSubmitLoading("special-submit-btn", "⏳ جاري الإرسال...");

    // ✅ يرسل للـ URL الخاص بالبرامج الخاصة فقط
    const payload = {
      source: "special-programs",
      timestamp: buildTimestamp(),
      page: "summer-camp",
      formType: "special-program",
      program: data.programs.join(" + "),
      firstName: data.firstName,
      lastName:  data.lastName,
      age: data.age,
      parentName:  data.parentName,
      parentPhone: data.parentPhone,
      userAgent: navigator.userAgent.slice(0, 180),
      lang: navigator.language || "unknown"
    };

    try {
      await submitSpecialPayload(payload);  // ✅ يستخدم SPECIAL_SCRIPT_URL
      successOverlayShown = true;
      closeModal("special-register-modal");
      resetSpecialForm();
      document.body.appendChild(
        buildSuccessOverlay(data.firstName, data.lastName, data.programs.join(" + "), "")
      );
    } catch (err) {
      console.error("Special form error:", err);
      isSubmitting = false;
      setSubmitError("special-submit-btn", "❌ حدث خطأ، حاول مجدداً", "إرسال طلب التسجيل");
    }
  });
}

/* ═══════════════════════════════════════════
   CLOUDINARY VIDEO PLAYER
════════════════════════════════════════════ */
function initCampVideo() {
  const videoEl = $("player");
  if (!videoEl) return;

  try {
    if (typeof cloudinary !== "undefined") {
      const player = cloudinary.videoPlayer("player", {
        cloudName: VIDEO_CLOUD_NAME,
        fluid: true,
        controls: true,
        preload: "metadata",
        sourceTypes: ["mp4", "webm"],
        transformation: { quality: "auto", fetch_format: "auto" }
      });
      player.source(VIDEO_PUBLIC_ID);
    } else {
      videoEl.src = VIDEO_FALLBACK_SRC;
    }
  } catch (err) {
    console.warn("Video init error:", err);
    videoEl.src = VIDEO_FALLBACK_SRC;
  }
}

/* ═══════════════════════════════════════════
   GALLERY (Cloudinary)
════════════════════════════════════════════ */
async function loadCampGallery() {
  const container = $("camp-gallery-grid");
  if (!container) return;

  try {
    const res = await fetch(
      `https://res.cloudinary.com/${VIDEO_CLOUD_NAME}/image/list/${GALLERY_FOLDER}.json`
    );
    if (!res.ok) throw new Error("Gallery fetch failed");

    const data = await res.json();
    const resources = (data.resources || []).slice(0, GALLERY_MAX);

    if (!resources.length) {
      container.innerHTML = `<div class="gallery-empty">لا توجد صور بعد.</div>`;
      return;
    }

    container.innerHTML = "";
    resources.forEach(r => {
      const item = document.createElement("div");
      item.className = "gallery-item reveal";
      const src = `https://res.cloudinary.com/${VIDEO_CLOUD_NAME}/image/upload/c_fill,w_480,h_360,q_auto,f_auto/${r.public_id}`;
      const full = `https://res.cloudinary.com/${VIDEO_CLOUD_NAME}/image/upload/q_auto,f_auto/${r.public_id}`;
      item.innerHTML = `<img src="${src}" alt="صورة من المخيم" loading="lazy" decoding="async">`;
      item.addEventListener("click", () => openLightbox(full));
      container.appendChild(item);
    });

    initRevealOnScroll();
  } catch (err) {
    console.warn("Gallery load error:", err);
    container.innerHTML = `<div class="gallery-empty">تعذّر تحميل الصور.</div>`;
  }
}

function openLightbox(src) {
  const lb = document.createElement("div");
  lb.className = "gallery-lightbox";
  lb.innerHTML = `
    <button class="gallery-lightbox-close" aria-label="إغلاق">✕</button>
    <img src="${src}" alt="صورة مكبّرة">
  `;

  const close = () => { lb.remove(); document.body.style.overflow = ""; };
  lb.querySelector(".gallery-lightbox-close").addEventListener("click", close);
  lb.addEventListener("click", e => { if (e.target === lb) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });

  document.body.style.overflow = "hidden";
  document.body.appendChild(lb);
}

/* ═══════════════════════════════════════════
   SCROLL REVEAL
════════════════════════════════════════════ */
function initRevealOnScroll() {
  if (prefersReducedMotion) return;

  const targets = document.querySelectorAll(
    ".pc, .journey-card, .workshop-card, .info-card, .gallery-item:not(.visible)"
  );

  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        const delay = (i % 6) * 80;
        setTimeout(() => {
          entry.target.classList.add("reveal", "visible");
        }, delay);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach(el => {
    if (!el.classList.contains("visible")) {
      el.classList.add("reveal");
      observer.observe(el);
    }
  });
}

/* ═══════════════════════════════════════════
   SUBTLE TILT ON PRICING CARDS
════════════════════════════════════════════ */
function initTiltEffect() {
  if (prefersReducedMotion) return;

  document.querySelectorAll(".pc").forEach(card => {
    card.addEventListener("mousemove", e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `translateY(-4px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

/* ═══════════════════════════════════════════
   BOOT
════════════════════════════════════════════ */
function init() {
  initPricingTabs();
  initModals();
  initDynamicFields();
  initInputSanitizers();
  initMainForm();
  initSpecialForm();
  initCampVideo();
  loadCampGallery();
  initRevealOnScroll();
  initTiltEffect();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

/* ─── redesign scroll & nav polish ─── */
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".top-nav-redesign");
  const tick = () => {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 20);
  };
  tick();
  window.addEventListener("scroll", tick, { passive: true });

  document.querySelectorAll(".hero-float-chip, .hero-info-card").forEach((el, i) => {
    el.style.animationDelay = `${(i * 0.4).toFixed(1)}s`;
  });
});
