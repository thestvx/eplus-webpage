/* ═══════════════════════════════════════════
   SUMMER SCHOOL — Advanced Registration + Gallery + Packages
════════════════════════════════════════════ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

/* ─────────────────────────────────────────
   FIREBASE
───────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyAMcplfO4veFVLtZZcyqfTJx9NGCit8gjo",
  authDomain: "eplus-center-39.firebaseapp.com",
  projectId: "eplus-center-39",
  storageBucket: "eplus-center-39.firebasestorage.app",
  messagingSenderId: "191532732034",
  appId: "1:191532732034:web:b11449a2f0595db5d02e9b"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
getFirestore(app);

const CAMP_MIN_AGE = 5;
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyoKNiPcaPBIYUTb1l_WXIlDmG2N-iPqSrx9r93Lpiio3_vKdOgCtwMTZQmq9cpQt6FWA/exec";

let isSubmitting = false;
let successOverlayShown = false;

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function getField(id) {
  return document.getElementById(id);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizePhone(phone) {
  return normalizeText(phone).replace(/\s+/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setBodyModalState(isOpen) {
  document.body.style.overflow = isOpen ? "hidden" : "";
}

/* ─────────────────────────────────────────
   PACKAGE RULES
───────────────────────────────────────── */
function isBacPackage(packageValue) {
  return normalizeText(packageValue).includes("15,000");
}

function isITAdvancedPackage(packageValue) {
  const value = normalizeText(packageValue);
  return value.includes("12,000") || value.includes("البالغين المتقدمة");
}

function isAdultBasicPackage(packageValue) {
  const value = normalizeText(packageValue);
  return value.includes("باقة البالغين — 8,000");
}

function isSpecialPackage(packageValue) {
  const value = normalizeText(packageValue);
  return value.includes("E-Plus Special") || value.includes("English Communication Class");
}

function isFiveToTenPackage(packageValue) {
  const value = normalizeText(packageValue);
  return value.includes("5–10") || value.includes("5-10");
}

function needsSingleLanguage(packageValue) {
  const value = normalizeText(packageValue);
  if (!value || isBacPackage(value) || isITAdvancedPackage(value)) return false;
  if (isSpecialPackage(value)) return false;
  return (
    value.includes("5–10") ||
    value.includes("5-10") ||
    value.includes("11–14") ||
    value.includes("11-14") ||
    value.includes("15–18") ||
    value.includes("15-18") ||
    isAdultBasicPackage(value)
  );
}

function updateLanguageOptionsByPackage(packageValue) {
  const langEl = getField("campLanguage");
  if (!langEl) return;

  const hideSpanish = isFiveToTenPackage(packageValue);
  const options = [...langEl.options];

  options.forEach(option => {
    const optionText = normalizeText(option.textContent).toLowerCase();
    const optionValue = normalizeText(option.value).toLowerCase();

    const isSpanishOption =
      optionText.includes("الإسبانية") ||
      optionText.includes("اسبانية") ||
      optionText.includes("spanish") ||
      optionText.includes("español") ||
      optionValue.includes("الإسبانية") ||
      optionValue.includes("اسبانية") ||
      optionValue.includes("spanish") ||
      optionValue.includes("español");

    option.hidden = hideSpanish && isSpanishOption;
  });

  const selectedOption = langEl.options[langEl.selectedIndex];
  if (selectedOption?.hidden) {
    langEl.value = "";
  }
}

/* ─────────────────────────────────────────
   DYNAMIC FIELDS
───────────────────────────────────────── */
function initDynamicFields() {
  const packageEl = getField("campSelectedPackage");
  const langGroup = getField("campLanguageGroup");
  const langEl = getField("campLanguage");
  const comboGroup = getField("campPackageChoiceGroup");
  const itGroup = getField("campITChoiceGroup");
  const bacLangBoxes = document.querySelectorAll('input[name="bacLang"]');
  const itTrackBoxes = document.querySelectorAll('input[name="itTrack"]');

  if (!packageEl) return;

  const clearBac = () => {
    bacLangBoxes.forEach(box => {
      box.checked = false;
      box.classList.remove("camp-input-error");
    });
  };

  const clearIT = () => {
    itTrackBoxes.forEach(box => {
      box.checked = false;
      box.classList.remove("camp-input-error");
    });
  };

  const clearLang = () => {
    if (!langEl) return;
    langEl.value = "";
    langEl.classList.remove("camp-input-error");
    langEl.removeAttribute("required");
  };

  const toggleFields = () => {
    const val = normalizeText(packageEl.value);
    const showBac = isBacPackage(val);
    const showLang = needsSingleLanguage(val);
    const showIT = isITAdvancedPackage(val);

    updateLanguageOptionsByPackage(val);

    comboGroup?.classList.toggle("choice-visible", showBac);
    langGroup?.classList.toggle("lang-visible", showLang);
    itGroup?.classList.toggle("it-visible", showIT);

    if (showLang && langEl) {
      langEl.setAttribute("required", "true");
    } else {
      clearLang();
    }

    if (!showBac) clearBac();
    if (!showIT) clearIT();
  };

  packageEl.addEventListener("change", toggleFields);

  bacLangBoxes.forEach(box => {
    box.addEventListener("change", () => {
      const checked = [...bacLangBoxes].filter(item => item.checked);
      if (checked.length > 2) {
        box.checked = false;
      }
      bacLangBoxes.forEach(item => item.classList.remove("camp-input-error"));
    });
  });

  itTrackBoxes.forEach(box => {
    box.addEventListener("change", () => {
      itTrackBoxes.forEach(item => item.classList.remove("camp-input-error"));
    });
  });

  langEl?.addEventListener("change", () => {
    langEl.classList.remove("camp-input-error");
  });

  toggleFields();
}

/* ─────────────────────────────────────────
   PRICING TABS
───────────────────────────────────────── */
function initPricingTabs() {
  const tabs = document.querySelectorAll(".pricing-tab");
  const contents = document.querySelectorAll(".pricing-content");
  if (!tabs.length || !contents.length) return;

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      contents.forEach(c => {
        c.classList.remove("active");
        c.style.animation = "none";
      });

      tab.classList.add("active");

      const targetId = tab.getAttribute("data-target");
      const panel = document.getElementById(targetId);
      if (!panel) return;

      void panel.offsetHeight;
      panel.style.animation = "";
      panel.classList.add("active");
    });
  });
}

/* ─────────────────────────────────────────
   REGISTER MODAL OPEN/CLOSE
───────────────────────────────────────── */
function initRegisterModal() {
  const openModalBtn = getField("open-register-modal");
  const modal = getField("camp-register-modal");
  const closeModalBtn = getField("close-register-modal");
  const modalBox = modal?.querySelector(".camp-register-modal-box");

  if (!modal) {
    return {
      openModal: () => {},
      closeModal: () => {}
    };
  }

  const openModal = () => {
    modal.classList.add("open");
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    setBodyModalState(true);
  };

  const closeModal = () => {
    modal.classList.remove("open");
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    setBodyModalState(false);
  };

  openModalBtn?.addEventListener("click", openModal);
  closeModalBtn?.addEventListener("click", closeModal);

  modal.addEventListener("click", e => {
    if (e.target.classList.contains("camp-register-modal-backdrop")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("open")) {
      if (document.querySelector(".success-overlay")) return;
      if (document.querySelector(".summer-lightbox")) return;
      closeModal();
    }
  });

  modalBox?.addEventListener("click", e => {
    e.stopPropagation();
  });

  return { openModal, closeModal };
}

/* selectPackage — يُستعمل من HTML */
window.selectPackage = function (packageName) {
  const selectEl = getField("campSelectedPackage");
  const modal = getField("camp-register-modal");

  if (selectEl) {
    const wanted = normalizeText(packageName);
    const matchedOption = [...selectEl.options].find(
      option => normalizeText(option.value) === wanted
    );

    if (matchedOption) {
      selectEl.value = matchedOption.value;
    }

    selectEl.dispatchEvent(new Event("change", { bubbles: true }));

    selectEl.style.transition =
      "box-shadow 0.4s cubic-bezier(0.34,1.56,0.64,1), border-color 0.4s ease";
    selectEl.style.boxShadow =
      "0 0 0 4px rgba(244,180,26,0.5), 0 0 20px rgba(244,180,26,0.2)";
    selectEl.style.borderColor = "rgba(244,180,26,0.8)";

    setTimeout(() => {
      selectEl.style.boxShadow = "";
      selectEl.style.borderColor = "";
    }, 2500);
  }

  if (modal && !modal.classList.contains("open") && !modal.classList.contains("active")) {
    modal.classList.add("open");
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    setBodyModalState(true);
  }
};

/* ─────────────────────────────────────────
   SQUARES BACKGROUND
───────────────────────────────────────── */
const canvas = document.getElementById("squares-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
let squares = [];
const SQ_SIZE = 40;
const SQ_GAP = 4;
let cols = 0;
let rows = 0;
let squareAnimationId = null;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  cols = Math.ceil(window.innerWidth / (SQ_SIZE + SQ_GAP));
  rows = Math.ceil(window.innerHeight / (SQ_SIZE + SQ_GAP));
  initSquares();
}

function initSquares() {
  squares = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      squares.push({
        x: i * (SQ_SIZE + SQ_GAP),
        y: j * (SQ_SIZE + SQ_GAP),
        opacity: Math.random() * 0.22,
        targetOpacity: Math.random() * 0.28,
        speed: 0.004 + Math.random() * 0.008
      });
    }
  }
}

function animateSquares() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  squares.forEach(sq => {
    if (Math.abs(sq.opacity - sq.targetOpacity) < 0.01) {
      sq.targetOpacity = Math.random() * 0.32;
    }
    sq.opacity += (sq.targetOpacity - sq.opacity) * sq.speed;
    ctx.fillStyle = `rgba(83, 204, 255, ${sq.opacity})`;
    ctx.fillRect(sq.x, sq.y, SQ_SIZE, SQ_SIZE);
  });

  squareAnimationId = requestAnimationFrame(animateSquares);
}

function initSquaresBackground() {
  if (!canvas || !ctx) return;
  resizeCanvas();
  if (squareAnimationId) cancelAnimationFrame(squareAnimationId);
  animateSquares();
  window.addEventListener("resize", resizeCanvas, { passive: true });
}

/* ─────────────────────────────────────────
   VIDEO LOGIC
───────────────────────────────────────── */
function tryInitCloudinaryPlayer() {
  const playerEl = getField("player");
  if (!playerEl) return true;

  const cld = window.cloudinary;
  if (!cld) return false;

  try {
    if (typeof cld.videoPlayer === "function") {
      cld.videoPlayer("player", {
        cloudName: "dac4mwuwe",
        controls: true,
        muted: false,
        autoplayMode: "never",
        fluid: true
      }).source("copy_B61063D2-D03E-41C1-AB91-1B692AB1F686_rvphab");
      return true;
    }

    if (typeof cld.player === "function") {
      cld.player("player", {
        cloudName: "dac4mwuwe",
        publicId: "copy_B61063D2-D03E-41C1-AB91-1B692AB1F686_rvphab"
      });
      return true;
    }
  } catch (error) {
    console.error("Cloudinary player init failed:", error);
  }

  return false;
}

function initCampVideo() {
  const playerEl = getField("player");
  if (!playerEl) return;

  let attempts = 0;
  const maxAttempts = 30;

  const startFallbackVideo = () => {
    if (playerEl.dataset.videoReady === "true") return;
    playerEl.setAttribute("controls", "true");
    playerEl.setAttribute("preload", "metadata");
    playerEl.setAttribute("playsinline", "true");
    playerEl.innerHTML = `
      <source src="https://res.cloudinary.com/dac4mwuwe/video/upload/q_auto,f_auto/copy_B61063D2-D03E-41C1-AB91-1B692AB1F686_rvphab.mp4" type="video/mp4">
    `;
    playerEl.dataset.videoReady = "true";
  };

  const timer = setInterval(() => {
    attempts += 1;
    const ok = tryInitCloudinaryPlayer();

    if (ok) {
      playerEl.dataset.videoReady = "true";
      clearInterval(timer);
      return;
    }

    if (attempts >= maxAttempts) {
      clearInterval(timer);
      startFallbackVideo();
    }
  }, 250);
}

/* ─────────────────────────────────────────
   REVEAL & TILT
───────────────────────────────────────── */
function injectRevealStyles() {
  if (document.getElementById("summer-reveal-style")) return;

  const style = document.createElement("style");
  style.id = "summer-reveal-style";
  style.textContent = `
    .reveal-on-scroll {
      opacity: 0;
      transform: translateY(40px) scale(0.98);
      transition: opacity 0.75s cubic-bezier(0.34,1.56,0.64,1),
                  transform 0.75s cubic-bezier(0.34,1.56,0.64,1);
      will-change: opacity, transform;
    }
    .reveal-on-scroll.revealed {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .pricing-card.premium.reveal-on-scroll { transform: translateY(40px) scale(1); }
    .pricing-card.premium.reveal-on-scroll.revealed { transform: translateY(0) scale(1); }
    .pricing-card.premium:hover { transform: translateY(-6px) !important; }

    .camp-input-error {
      border-color: #ff4757 !important;
      box-shadow: 0 0 0 4px rgba(255,71,87,0.15) !important;
      animation: shakeError 0.4s ease;
    }
    @keyframes shakeError {
      0%,100% { transform: translateX(0); }
      25% { transform: translateX(-8px); }
      75% { transform: translateX(8px); }
    }

    .camp-choice-error {
      outline: 2px solid rgba(255,71,87,0.55);
      border-color: rgba(255,71,87,0.65) !important;
      box-shadow: 0 0 0 4px rgba(255,71,87,0.15) !important;
      animation: shakeError 0.4s ease;
    }

    .camp-gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .camp-gallery-item {
      position: relative; overflow: hidden;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,.15);
      background: rgba(255,255,255,.05);
      box-shadow: 0 12px 28px rgba(0,0,0,.15);
      cursor: zoom-in;
      transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
    }
    .camp-gallery-item:hover {
      transform: translateY(-5px) scale(1.02);
      box-shadow: 0 20px 40px rgba(0,0,0,.25);
      border-color: rgba(255,255,255,.3);
    }
    .camp-gallery-img {
      width: 100%; aspect-ratio: 1/1;
      object-fit: cover; display: block;
    }
    .camp-gallery-overlay {
      position: absolute; inset: auto 0 0 0;
      padding: 15px;
      background: linear-gradient(180deg, transparent, rgba(3,15,35,.85));
      color: #fff; font-size: .95rem; font-weight: 700;
    }
    .camp-gallery-empty {
      display: flex; flex-direction: column;
      align-items: center; gap: 12px;
      padding: 50px 20px; text-align: center;
      color: rgba(201,231,248,0.7);
      font-size: 1.05rem; font-weight: 700;
    }

    .success-overlay {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(3,15,45,0.88);
      backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
      animation: soFadeIn 0.3s ease;
      padding: 18px;
    }
    .success-card {
      background: linear-gradient(145deg, rgba(10,61,115,0.95), rgba(3,21,47,0.98));
      border: 1px solid rgba(255,255,255,0.18);
      padding: 44px 40px; border-radius: 36px; text-align: center;
      box-shadow: 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2);
      animation: soPopIn 0.5s cubic-bezier(0.34,1.56,0.64,1);
      max-width: 90%; width: 460px;
      position: relative; overflow: hidden;
    }
    .success-card::before {
      content: "";
      position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, transparent, #f4b41a, #ffd86b, #f4b41a, transparent);
    }

    .summer-lightbox {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(2,9,21,.92);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px; cursor: zoom-out;
      animation: soFadeIn .25s ease;
    }
    .summer-lightbox-box {
      position: relative;
      max-width: min(1100px, 100%); max-height: 90vh;
    }
    .summer-lightbox-img {
      display: block; max-width: 100%; max-height: 90vh;
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0,0,0,.55);
      animation: soPopIn .3s cubic-bezier(.34,1.56,.64,1);
    }
    .summer-lightbox-close {
      position: absolute; top: 14px; left: 14px;
      width: 46px; height: 46px; border-radius: 50%;
      background: rgba(255,255,255,.15);
      border: 1px solid rgba(255,255,255,.25);
      color: #fff; font-size: 22px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: .25s ease;
    }
    .summer-lightbox-close:hover {
      background: rgba(255,255,255,.25); transform: scale(1.1);
    }

    @keyframes soFadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes soPopIn {
      from { transform: scale(0.8) translateY(30px); opacity:0; }
      to   { transform: scale(1) translateY(0); opacity:1; }
    }
  `;
  document.head.appendChild(style);
}

function initRevealOnScroll() {
  injectRevealStyles();

  const targets = document.querySelectorAll(
    ".camp-section, .camp-workshop-card, .summer-strip-item, " +
    ".summer-journey-card, .camp-info-card, .pricing-card, .form-group"
  );

  if (!targets.length) return;

  targets.forEach((el, i) => {
    el.classList.add("reveal-on-scroll");
    el.style.transitionDelay = `${(i % 4) * 0.08}s`;
  });

  const obs = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.07, rootMargin: "0px 0px -25px 0px" });

  targets.forEach(el => obs.observe(el));
}

function initTiltEffect() {
  if (window.matchMedia("(max-width: 768px)").matches) return;

  document.querySelectorAll(
    ".camp-workshop-card, .camp-info-card, .summer-journey-card"
  ).forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const rx = ((y - r.height / 2) / (r.height / 2)) * -8;
      const ry = ((x - r.width / 2) / (r.width / 2)) * 8;
      card.style.transform =
        `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform =
        "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    });
  });
}

/* ─────────────────────────────────────────
   GALLERY
───────────────────────────────────────── */
function buildGalleryEmpty() {
  return `
    <div class="camp-gallery-empty" style="grid-column:1/-1;">
      <span style="font-size:42px;">🏕️</span>
      <span style="font-size:1.1rem;font-weight:800;color:rgba(201,231,248,0.9);">
        قريباً — سنكون معكم!
      </span>
      <span style="font-size:0.95rem;color:rgba(201,231,248,0.6);max-width:380px;line-height:1.8;">
        سيتم نشر صور وأبرز لحظات المخيم الصيفي فور انطلاقه.<br>
        ترقّبوا التجربة الصيفية المميزة ✦
      </span>
    </div>`;
}

function loadCampGallery() {
  const grid = getField("camp-gallery-grid");
  if (!grid) return;
  grid.innerHTML = buildGalleryEmpty();
}

function openLightbox(src, alt = "Summer School") {
  document.querySelector(".summer-lightbox")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "summer-lightbox";
  overlay.innerHTML = `
    <div class="summer-lightbox-box">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="summer-lightbox-img" draggable="false">
      <button type="button" class="summer-lightbox-close" aria-label="إغلاق">✕</button>
    </div>`;

  const close = () => overlay.remove();

  overlay.addEventListener("click", e => {
    if (e.target === overlay || e.target.closest(".summer-lightbox-close")) close();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") close();
  }, { once: true });

  document.body.appendChild(overlay);
}

/* ─────────────────────────────────────────
   REGISTRATION
───────────────────────────────────────── */
function markInvalid(el) {
  if (!el) return;
  el.classList.add("camp-input-error");
  el.addEventListener("input", () => el.classList.remove("camp-input-error"), { once: true });
  el.addEventListener("change", () => el.classList.remove("camp-input-error"), { once: true });
}

function markChoiceInvalid(elements) {
  elements.forEach(el => {
    const label = el.closest(".choice-checkbox-label");
    if (!label) return;
    label.classList.add("camp-choice-error");
    const clear = () => label.classList.remove("camp-choice-error");
    el.addEventListener("change", clear, { once: true });
    el.addEventListener("input", clear, { once: true });
  });
}

function validatePhone(phone) {
  return /^[+0-9]{8,18}$/.test(normalizePhone(phone));
}

function buildSuccessModal(firstName, lastName, selectedPackage, languageText) {
  const overlay = document.createElement("div");
  overlay.className = "success-overlay";
  overlay.innerHTML = `
    <div class="success-card">
      <div style="font-size:64px;margin-bottom:16px;filter:drop-shadow(0 10px 20px rgba(0,0,0,.3))">🎉</div>
      <h2 style="color:#fff;margin-bottom:10px;font-size:24px;font-weight:950;line-height:1.3;">تم تسجيل المقعد بنجاح!</h2>
      <p style="color:#c9e7f8;font-size:16px;line-height:1.9;margin-bottom:8px;">
        مرحباً
        <strong style="color:#ffd86b;font-size:19px;">${escapeHtml(firstName)} ${escapeHtml(lastName)}</strong>
      </p>
      <div style="
        display:inline-flex;align-items:center;gap:8px;
        padding:10px 20px;border-radius:14px;margin:12px 0 8px;
        background:rgba(244,180,26,0.15);border:1px solid rgba(244,180,26,0.3);
        color:#ffe090;font-weight:800;font-size:15px;
      ">✦ ${escapeHtml(selectedPackage)}</div>
      ${languageText ? `
      <div style="
        display:inline-flex;align-items:center;gap:8px;
        padding:8px 18px;border-radius:14px;margin:0 0 20px;
        background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.25);
        color:#bae6fd;font-weight:800;font-size:14px;
      ">🌐 التفاصيل المختارة: ${escapeHtml(languageText)}</div>` : '<div style="margin-bottom:20px;"></div>'}
      <p style="color:rgba(201,231,248,0.75);font-size:14px;line-height:1.8;margin-bottom:26px;">
        تم إرسال بيانات التسجيل بنجاح.<br>
        سيتم التواصل معكم قريباً عبر رقم ولي الأمر.
      </p>
      <button
        type="button"
        id="success-close-btn"
        style="
          position:relative;overflow:hidden;
          padding:14px 36px;border-radius:18px;border:none;
          background:linear-gradient(135deg,#ffc849,#ff9f1d);
          color:#03152f;font-weight:900;font-size:15px;
          cursor:pointer;box-shadow:0 15px 30px rgba(255,159,29,.35);
          transition:0.3s cubic-bezier(0.34,1.56,0.64,1);
          font-family:inherit;
        "
      >العودة للصفحة ✦</button>
    </div>`;

  const button = overlay.querySelector("#success-close-btn");
  button?.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-3px)";
    button.style.boxShadow = "0 20px 40px rgba(255,159,29,.45)";
  });
  button?.addEventListener("mouseleave", () => {
    button.style.transform = "";
    button.style.boxShadow = "0 15px 30px rgba(255,159,29,.35)";
  });
  button?.addEventListener("click", () => {
    overlay.remove();
    successOverlayShown = false;
    window.location.reload();
  });

  return overlay;
}

async function submitWithFallback(payload) {
  const jsonBody = JSON.stringify(payload);

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: jsonBody
    });
    return true;
  } catch (error1) {
    try {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value);
      });

      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: formData
      });
      return true;
    } catch (error2) {
      throw error2;
    }
  }
}

function getChosenDetails(selectedPackage, language, bacLanguages, itTrack) {
  if (isBacPackage(selectedPackage)) return `لغتا البكالوريا: ${bacLanguages}`;
  if (isITAdvancedPackage(selectedPackage)) return `مسار الإعلام الآلي: ${itTrack}`;
  if (needsSingleLanguage(selectedPackage) && language) return `اللغة المختارة: ${language}`;
  return "";
}

async function campRegister(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (isSubmitting) return false;

  const packageEl = getField("campSelectedPackage");
  const firstNameEl = getField("campFirstName");
  const lastNameEl = getField("campLastName");
  const ageEl = getField("campAge");
  const parentNameEl = getField("campParentName");
  const parentPhoneEl = getField("campParentPhone");
  const langEl = getField("campLanguage");
  const form = getField("camp-form");
  const submitBtn = getField("camp-submit-btn");
  const modal = getField("camp-register-modal");

  const bacLangBoxes = document.querySelectorAll('input[name="bacLang"]');
  const itTrackBoxes = document.querySelectorAll('input[name="itTrack"]');
  const itTrackChosen = document.querySelector('input[name="itTrack"]:checked');

  if (!packageEl || !firstNameEl || !lastNameEl || !ageEl || !parentNameEl || !parentPhoneEl) {
    return false;
  }

  const selectedPackage = normalizeText(packageEl.value);
  const firstName = normalizeText(firstNameEl.value);
  const lastName = normalizeText(lastNameEl.value);
  const age = normalizeText(ageEl.value);
  const parentName = normalizeText(parentNameEl.value);
  const parentPhone = normalizePhone(parentPhoneEl.value);
  const language = normalizeText(langEl?.value);
  const bacSelected = [...bacLangBoxes].filter(box => box.checked).map(box => normalizeText(box.value));
  const bacLanguages = bacSelected.join(" + ");
  const itTrack = itTrackChosen ? normalizeText(itTrackChosen.value) : "";

  const showBac = isBacPackage(selectedPackage);
  const showLang = needsSingleLanguage(selectedPackage);
  const showIT = isITAdvancedPackage(selectedPackage);

  let valid = true;

  [
    { el: packageEl, val: selectedPackage },
    { el: firstNameEl, val: firstName },
    { el: lastNameEl, val: lastName },
    { el: ageEl, val: age },
    { el: parentNameEl, val: parentName },
    { el: parentPhoneEl, val: parentPhone }
  ].forEach(field => {
    if (!field.val) {
      markInvalid(field.el);
      valid = false;
    }
  });

  if (showLang && !language) {
    markInvalid(langEl);
    valid = false;
  }

  if (showBac && bacSelected.length !== 2) {
    markChoiceInvalid([...bacLangBoxes]);
    alert("❌ يرجى اختيار لغتين في باقة البكالوريا.");
    valid = false;
  }

  if (showIT && !itTrack) {
    markChoiceInvalid([...itTrackBoxes]);
    alert("❌ يرجى اختيار مسار الإعلام الآلي.");
    valid = false;
  }

  const ageNum = parseInt(age, 10);
  if (!age || Number.isNaN(ageNum) || ageNum < CAMP_MIN_AGE) {
    markInvalid(ageEl);
    alert(`❌ الحد الأدنى للعمر هو ${CAMP_MIN_AGE} سنوات.`);
    valid = false;
  }

  if (parentPhone && !validatePhone(parentPhone)) {
    markInvalid(parentPhoneEl);
    alert("❌ يرجى إدخال رقم هاتف صحيح لولي الأمر.");
    valid = false;
  }

  if (!valid) return false;

  isSubmitting = true;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span>جاري الحجز...</span> <span style="animation:floatY 0.8s ease-in-out infinite;display:inline-block;">⏳</span>';
    submitBtn.style.pointerEvents = "none";
    submitBtn.style.opacity = "0.8";
  }

  const payload = {
    timestamp: new Date().toLocaleString("ar-DZ"),
    package: selectedPackage,
    bacLanguages: showBac ? bacLanguages : "",
    itTrack: showIT ? itTrack : "",
    language: showLang ? language : "",
    firstName,
    lastName,
    age: String(ageNum),
    parentName,
    parentPhone,
    page: "summer-camp",
    source: "website",
    userAgent: navigator.userAgent.slice(0, 180)
  };

  try {
    await submitWithFallback(payload);

    form?.reset();

    getField("campLanguageGroup")?.classList.remove("lang-vis
