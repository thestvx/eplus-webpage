/* ═══════════════════════════════════════════
   SUMMER SCHOOL — Advanced Registration + Gallery + Packages
════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// تحديث العمر حسب الباقات الجديدة
const CAMP_MIN_AGE = 5;
const CAMP_MAX_AGE = 18;

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzJx2NEPz7a7ntKmXQQq7i78ICeIFHiuAxTpfJyAocSkeqmbsmhx_h3YzVjbqs0eiyF/exec";

/* ─────────────────────────────────────────
   PRICING TABS & PACKAGE SELECTION (NEW)
───────────────────────────────────────── */
function initPricingTabs() {
  const tabs = document.querySelectorAll(".pricing-tab");
  const contents = document.querySelectorAll(".pricing-content");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // إزالة الكلاس النشط
      tabs.forEach(t => t.classList.remove("active"));
      contents.forEach(c => c.classList.remove("active"));

      // تفعيل الكلاس للتاب والمحتوى المطلوب
      tab.classList.add("active");
      const targetId = tab.getAttribute("data-target");
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add("active");
    });
  });
}

// تنقل الزائر للنموذج وتختار باقته تلقائياً
window.selectPackage = function(packageName) {
  const selectEl = document.getElementById("campSelectedPackage");
  if (selectEl) {
    selectEl.value = packageName;
    // تأثير بصري للفت انتباه المستخدم
    selectEl.style.transition = "0.3s";
    selectEl.style.boxShadow = "0 0 0 4px rgba(244,180,26,0.5)";
    setTimeout(() => selectEl.style.boxShadow = "", 2000);
  }
  
  const formSection = document.getElementById("camp-register");
  if (formSection) {
    formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};


/* ─────────────────────────────────────────
   1. SQUARES BACKGROUND (Animated)
───────────────────────────────────────── */
const canvas = document.getElementById("squares-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
let squares = [];
const squareSize = 40;
const squareGap = 4;
let cols = 0;
let rows = 0;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  cols = Math.ceil(window.innerWidth / (squareSize + squareGap));
  rows = Math.ceil(window.innerHeight / (squareSize + squareGap));
  initSquares();
}

function initSquares() {
  squares = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      squares.push({
        x: i * (squareSize + squareGap),
        y: j * (squareSize + squareGap),
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

  squares.forEach((sq) => {
    if (Math.abs(sq.opacity - sq.targetOpacity) < 0.01) {
      sq.targetOpacity = Math.random() * 0.32;
    }
    sq.opacity += (sq.targetOpacity - sq.opacity) * sq.speed;
    ctx.fillStyle = `rgba(83, 204, 255, ${sq.opacity})`;
    ctx.fillRect(sq.x, sq.y, squareSize, squareSize);
  });

  requestAnimationFrame(animateSquares);
}

function initSquaresBackground() {
  if (!canvas || !ctx) return;
  resizeCanvas();
  animateSquares();
  window.addEventListener("resize", resizeCanvas);
}

/* ─────────────────────────────────────────
   2. VIDEO LOGIC
───────────────────────────────────────── */
function initCampVideo() {
  const video = document.getElementById("camp-video");
  if (!video) return;

  let hasPlayed = false;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!hasPlayed) {
            hasPlayed = true;
            video.muted = false;
            video.volume = 1;

            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                video.muted = true;
                video.play().catch(() => {});
              });
            }
          } else if (video.paused) {
            video.play().catch(() => {});
          }
        } else {
          if (!video.paused) {
            video.pause();
            video.muted = true;
          }
        }
      });
    },
    { threshold: 0.4 }
  );

  observer.observe(video);
}

/* ─────────────────────────────────────────
   3. 3D TILT EFFECT & REVEAL ANIMATION
───────────────────────────────────────── */
function injectRevealStyles() {
  if (document.getElementById("summer-reveal-style")) return;

  const style = document.createElement("style");
  style.id = "summer-reveal-style";
  style.textContent = `
    /* Reveal Animation */
    .reveal-on-scroll {
      opacity: 0;
      transform: translateY(40px) scale(0.98);
      transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
      will-change: opacity, transform;
    }
    .reveal-on-scroll.revealed {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    
    /* Form Errors */
    .camp-input-error {
      border-color: #ff4757 !important;
      box-shadow: 0 0 0 4px rgba(255, 71, 87, 0.15) !important;
      animation: shakeError 0.4s ease;
    }
    @keyframes shakeError {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-8px); }
      75% { transform: translateX(8px); }
    }

    /* Gallery Items */
    .camp-gallery-item {
      position: relative;
      overflow: hidden;
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
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      display: block;
    }
    .camp-gallery-overlay {
      position: absolute;
      inset: auto 0 0 0;
      padding: 15px;
      background: linear-gradient(180deg, transparent, rgba(3,15,35,.85));
      color: #fff;
      font-size: .95rem;
      font-weight: 700;
    }

    /* Success Modal */
    .success-overlay {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(3, 15, 45, 0.85); backdrop-filter: blur(15px);
      animation: fadeIn 0.3s ease;
    }
    .success-card {
      background: linear-gradient(145deg, #0a3d73, #03152f);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 40px; border-radius: 36px; text-align: center;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.2);
      animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      max-width: 90%; width: 450px;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    /* Lightbox */
    .summer-lightbox {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(2,9,21,.92); backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px; cursor: zoom-out; animation: fadeIn .25s ease;
    }
    .summer-lightbox-box { position: relative; max-width: min(1100px, 100%); max-height: 90vh; }
    .summer-lightbox-img {
      display: block; max-width: 100%; max-height: 90vh; border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0,0,0,.55); animation: popIn .3s cubic-bezier(.34,1.56,.64,1);
    }
    .summer-lightbox-close {
      position: absolute; top: 14px; left: 14px; width: 46px; height: 46px;
      border: none; border-radius: 50%; background: rgba(255,255,255,.15);
      border: 1px solid rgba(255,255,255,.25); color: #fff; font-size: 22px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: .25s ease;
    }
    .summer-lightbox-close:hover { background: rgba(255,255,255,.25); transform: scale(1.1); }
  `;
  document.head.appendChild(style);
}

function initTiltEffect() {
  if (window.matchMedia("(max-width: 768px)").matches) return;

  const cards = document.querySelectorAll(".camp-workshop-card, .camp-info-card, .summer-journey-card");
  
  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });
  });
}

function initRevealOnScroll() {
  injectRevealStyles();

  const targets = document.querySelectorAll(
    ".camp-section, .camp-workshop-card, .summer-strip-item, .summer-journey-card, .camp-info-card, .pricing-card, .form-group"
  );

  targets.forEach((el, index) => {
    el.classList.add("reveal-on-scroll");
    // إضافة تأخير للظهور المتدرج
    el.style.transitionDelay = `${(index % 4) * 0.1}s`;
  });

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ─────────────────────────────────────────
   4. GALLERY
───────────────────────────────────────── */
function buildGalleryEmptyState() {
  return `
    <div class="camp-gallery-empty" style="grid-column: 1 / -1;">
      <span style="font-size:30px;">📸</span>
      <span>سيتم نشر الصور واللحظات المميزة بعد انطلاق المدرسة الصيفية</span>
    </div>
  `;
}

function loadCampGallery() {
  const grid = document.getElementById("camp-gallery-grid");
  if (!grid) return;

  const q = query(collection(db, "campGallery"), orderBy("createdAt", "desc"));

  onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        grid.innerHTML = buildGalleryEmptyState();
        return;
      }

      grid.innerHTML = "";

      snap.forEach((docSnap, index) => {
        const data = docSnap.data();
        if (!data.imageUrl) return;

        const item = document.createElement("div");
        item.className = "camp-gallery-item reveal-on-scroll";
        item.style.transitionDelay = `${(index % 3) * 0.1}s`;

        const img = document.createElement("img");
        img.src = data.imageUrl;
        img.alt = data.caption || "Summer School";
        img.loading = "lazy";
        img.draggable = false;
        img.className = "camp-gallery-img";

        const overlay = document.createElement("div");
        overlay.className = "camp-gallery-overlay";
        overlay.textContent = data.caption || "Summer School";

        item.appendChild(img);
        item.appendChild(overlay);
        item.addEventListener("click", () => openLightbox(data.imageUrl, data.caption));

        grid.appendChild(item);
        
        // تفعيل الظهور مباشرة للصور
        setTimeout(() => item.classList.add("revealed"), 50);
      });
    },
    () => {
      grid.innerHTML = buildGalleryEmptyState();
    }
  );
}

function openLightbox(src, alt = "Summer School") {
  const old = document.querySelector(".summer-lightbox");
  if (old) old.remove();

  const overlay = document.createElement("div");
  overlay.className = "summer-lightbox";

  overlay.innerHTML = `
    <div class="summer-lightbox-box">
      <img src="${src}" alt="${alt}" class="summer-lightbox-img" draggable="false">
      <button type="button" class="summer-lightbox-close" aria-label="Close">✕</button>
    </div>
  `;

  const close = () => overlay.remove();

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".summer-lightbox-close")) close();
  });

  document.addEventListener(
    "keydown",
    function escHandler(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escHandler);
      }
    },
    { once: true }
  );

  document.body.appendChild(overlay);
}

/* ─────────────────────────────────────────
   5. REGISTRATION LOGIC (Updated for Packages)
───────────────────────────────────────── */
function getField(id) {
  return document.getElementById(id);
}

function markInvalid(el) {
  if (!el) return;
  el.classList.add("camp-input-error");
  el.addEventListener(
    "input",
    () => { el.classList.remove("camp-input-error"); },
    { once: true }
  );
}

function validatePhone(phone) {
  const cleaned = phone.replace(/\s+/g, "");
  return /^[+0-9]{8,18}$/.test(cleaned);
}

function campRegister(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const packageEl = getField("campSelectedPackage"); // الحقل الجديد
  const firstNameEl = getField("campFirstName");
  const lastNameEl = getField("campLastName");
  const ageEl = getField("campAge");
  const parentNameEl = getField("campParentName");
  const parentPhoneEl = getField("campParentPhone");

  if (!packageEl || !firstNameEl || !lastNameEl || !ageEl || !parentNameEl || !parentPhoneEl) return false;

  const selectedPackage = packageEl.value.trim();
  const firstName = firstNameEl.value.trim();
  const lastName = lastNameEl.value.trim();
  const age = ageEl.value.trim();
  const parentName = parentNameEl.value.trim();
  const parentPhone = parentPhoneEl.value.trim();

  let valid = true;

  [
    { el: packageEl, val: selectedPackage },
    { el: firstNameEl, val: firstName },
    { el: lastNameEl, val: lastName },
    { el: parentNameEl, val: parentName },
    { el: parentPhoneEl, val: parentPhone }
  ].forEach((field) => {
    if (!field.val) {
      markInvalid(field.el);
      valid = false;
    }
  });

  const ageNum = parseInt(age, 10);

  if (!age || Number.isNaN(ageNum) || ageNum <= 0) {
    markInvalid(ageEl);
    valid = false;
  } else if (ageNum < CAMP_MIN_AGE || ageNum > CAMP_MAX_AGE) {
    markInvalid(ageEl);
    alert(
      `❌ عذراً، العمر غير مناسب للتسجيل.\nالفئة العمرية المسموح بها: من ${CAMP_MIN_AGE} إلى ${CAMP_MAX_AGE} سنة.`
    );
    valid = false;
  }

  if (parentPhone && !validatePhone(parentPhone)) {
    markInvalid(parentPhoneEl);
    alert("❌ يرجى إدخال رقم هاتف صحيح لولي الأمر.");
    valid = false;
  }

  if (!valid) return false;

  const submitBtn = getField("camp-submit-btn");
  if (submitBtn) {
    submitBtn.innerHTML = "جاري الحجز... ⏳";
    submitBtn.style.pointerEvents = "none";
    submitBtn.style.opacity = "0.8";
  }

  // تضمين حقل الباقة المختارة مع البيانات المُرسلة إلى Google Sheets
  const payload = encodeURIComponent(
    JSON.stringify({
      program: "Summer Academy 2026",
      selectedPackage: selectedPackage,
      firstName,
      lastName,
      age: String(ageNum),
      parentName,
      parentPhone,
      timestamp: new Date().toISOString()
    })
  );

  new Image().src = `${APPS_SCRIPT_URL}?payload=${payload}`;

  // إظهار بطاقة النجاح الفاخرة مع اسم الباقة
  setTimeout(() => {
    const overlay = document.createElement("div");
    overlay.className = "success-overlay";
    
    // استخراج اسم الباقة بدون الأعمار للرسالة (مثلاً: الباقة الأساسية)
    const shortPackageName = selectedPackage.split('-')[0].trim();
    
    overlay.innerHTML = `
      <div class="success-card">
        <div style="font-size:70px; margin-bottom:15px; filter:drop-shadow(0 10px 20px rgba(0,0,0,0.3));">✨🚀</div>
        <h2 style="color:#fff; margin-bottom:15px; font-size:26px; font-weight:900;">تم حجز المقعد بنجاح!</h2>
        <p style="color:#c9e7f8; font-size:17px; line-height:1.8; margin-bottom:25px;">
          أهلاً بالمبدع <strong style="color:#f4b41a; font-size:20px;">${firstName} ${lastName}</strong><br>
          تم حجز <strong>${shortPackageName}</strong> بنجاح.<br>
          سنتواصل معكم قريباً عبر رقم ولي الأمر.
        </p>
        <button onclick="location.reload()" style="padding:14px 35px; border-radius:20px; border:none; background:linear-gradient(135deg, #ffc849, #ff9f1d); color:#03152f; font-weight:900; font-size:16px; cursor:pointer; box-shadow:0 15px 30px rgba(255,159,29,0.3); transition:0.3s;">العودة للصفحة</button>
      </div>`;
    document.body.appendChild(overlay);
  }, 1500);

  return false;
}

/* ─────────────────────────────────────────
   6. INIT
───────────────────────────────────────── */
window.campRegister = campRegister;

document.addEventListener("DOMContentLoaded", () => {
  initPricingTabs(); // تشغيل نظام تبويبات الأسعار
  initSquaresBackground();
  initRevealOnScroll();
  initTiltEffect();
  initCampVideo();
  loadCampGallery();

  const form = document.getElementById("camp-form");
  const submitBtn = document.getElementById("camp-submit-btn");

  if (form) form.addEventListener("submit", campRegister);
  if (submitBtn) submitBtn.addEventListener("click", campRegister);
});
