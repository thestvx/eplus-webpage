/* ═══════════════════════════════════════════
   SUMMER SCHOOL — Registration + Gallery + Video
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

const CAMP_MIN_AGE = 7;
const CAMP_MAX_AGE = 15;

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzJx2NEPz7a7ntKmXQQq7i78ICeIFHiuAxTpfJyAocSkeqmbsmhx_h3YzVjbqs0eiyF/exec";

/* ─────────────────────────────────────────
   SQUARES BACKGROUND
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
   VIDEO
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
   REVEAL ANIMATION
───────────────────────────────────────── */
function injectRevealStyles() {
  if (document.getElementById("summer-reveal-style")) return;

  const style = document.createElement("style");
  style.id = "summer-reveal-style";
  style.textContent = `
    .reveal-on-scroll{
      opacity:0;
      transform:translateY(30px);
      transition:opacity .7s ease, transform .7s ease;
      will-change:opacity, transform;
    }
    .reveal-on-scroll.revealed{
      opacity:1;
      transform:translateY(0);
    }
    .camp-gallery-item{
      position:relative;
      overflow:hidden;
      border-radius:20px;
      border:1px solid rgba(255,255,255,.14);
      background:rgba(255,255,255,.06);
      box-shadow:0 12px 28px rgba(0,0,0,.14);
      cursor:zoom-in;
      transition:transform .28s ease, box-shadow .28s ease, border-color .28s ease;
    }
    .camp-gallery-item:hover{
      transform:translateY(-4px) scale(1.01);
      box-shadow:0 18px 38px rgba(0,0,0,.18);
      border-color:rgba(255,255,255,.22);
    }
    .camp-gallery-img{
      width:100%;
      aspect-ratio:1 / 1;
      object-fit:cover;
      display:block;
    }
    .camp-gallery-overlay{
      position:absolute;
      inset:auto 0 0 0;
      padding:14px;
      background:linear-gradient(180deg, transparent, rgba(3,15,35,.78));
      color:#fff;
      font-size:.92rem;
      font-weight:700;
      opacity:.98;
    }
    .camp-input-error{
      border-color:rgba(255, 120, 120, .95) !important;
      box-shadow:0 0 0 4px rgba(255, 120, 120, .12) !important;
      background:rgba(255,255,255,.12) !important;
    }
    .camp-success-box{
      text-align:center;
      padding:30px 10px;
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:16px;
      animation:summerSuccessIn .45s ease;
    }
    .camp-success-icon{
      font-size:56px;
      line-height:1;
      filter:drop-shadow(0 10px 22px rgba(0,0,0,.16));
    }
    .camp-success-title{
      font-size:1.2rem;
      font-weight:900;
      color:#fff;
    }
    .camp-success-text{
      font-size:.96rem;
      line-height:1.95;
      color:rgba(230,245,255,.86);
    }
    .camp-success-name{
      color:#ffe08a;
      font-weight:900;
    }
    .camp-success-note{
      color:rgba(255,220,120,.92);
      font-size:.9rem;
      font-weight:800;
    }
    .camp-submit-btn.loading{
      position:relative;
      pointer-events:none;
      opacity:.92;
    }
    .camp-submit-btn.loading span{
      opacity:0;
    }
    .camp-submit-btn.loading::after{
      content:"جاري إرسال التسجيل...";
      position:absolute;
      inset:0;
      display:flex;
      align-items:center;
      justify-content:center;
      color:#08223e;
      font-weight:1000;
    }
    .summer-lightbox{
      position:fixed;
      inset:0;
      z-index:9999;
      background:rgba(2,9,21,.92);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      cursor:zoom-out;
      animation:summerFadeIn .22s ease;
    }
    .summer-lightbox-box{
      position:relative;
      max-width:min(1100px, 100%);
      max-height:90vh;
    }
    .summer-lightbox-img{
      display:block;
      max-width:100%;
      max-height:90vh;
      border-radius:20px;
      box-shadow:0 24px 60px rgba(0,0,0,.55);
      animation:summerScaleIn .25s cubic-bezier(.34,1.56,.64,1);
    }
    .summer-lightbox-close{
      position:absolute;
      top:14px;
      left:14px;
      width:46px;
      height:46px;
      border:none;
      border-radius:50%;
      background:rgba(255,255,255,.12);
      border:1px solid rgba(255,255,255,.18);
      color:#fff;
      font-size:22px;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 10px 28px rgba(0,0,0,.18);
      transition:.22s ease;
    }
    .summer-lightbox-close:hover{
      background:rgba(255,255,255,.20);
      transform:scale(1.05);
    }
    @keyframes summerFadeIn{
      from{opacity:0}
      to{opacity:1}
    }
    @keyframes summerScaleIn{
      from{transform:scale(.88)}
      to{transform:scale(1)}
    }
    @keyframes summerSuccessIn{
      from{opacity:0;transform:translateY(18px)}
      to{opacity:1;transform:translateY(0)}
    }
  `;
  document.head.appendChild(style);
}

function initRevealOnScroll() {
  injectRevealStyles();

  const targets = document.querySelectorAll(
    ".camp-section, .camp-workshop-card, .summer-strip-item, .summer-journey-card, .camp-info-card"
  );

  targets.forEach((el) => el.classList.add("reveal-on-scroll"));

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ─────────────────────────────────────────
   GALLERY
───────────────────────────────────────── */
function buildGalleryEmptyState() {
  return `
    <div class="camp-gallery-empty">
      <span>📸</span>
      <span>سيتم نشر الصور واللحظات المميزة بعد انطلاق المدرسة الصيفية</span>
    </div>
  `;
}

function buildGalleryItem(data) {
  if (!data?.imageUrl) return null;

  const item = document.createElement("div");
  item.className = "camp-gallery-item reveal-on-scroll";

  const img = document.createElement("img");
  img.src = data.imageUrl;
  img.alt = data.caption || "صورة من المدرسة الصيفية";
  img.loading = "lazy";
  img.draggable = false;
  img.className = "camp-gallery-img";

  const overlay = document.createElement("div");
  overlay.className = "camp-gallery-overlay";
  overlay.textContent = data.caption || "Summer School";

  item.appendChild(img);
  item.appendChild(overlay);
  item.addEventListener("click", () => openLightbox(data.imageUrl, data.caption || "Summer School"));

  return item;
}

function observeRevealElements(scope = document) {
  const els = scope.querySelectorAll(".reveal-on-scroll:not(.revealed)");
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  els.forEach((el) => observer.observe(el));
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

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const item = buildGalleryItem(data);
        if (item) grid.appendChild(item);
      });

      observeRevealElements(grid);
    },
    () => {
      grid.innerHTML = buildGalleryEmptyState();
    }
  );
}

/* ─────────────────────────────────────────
   LIGHTBOX
───────────────────────────────────────── */
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
   REGISTRATION
───────────────────────────────────────── */
function getField(id) {
  return document.getElementById(id);
}

function markInvalid(el) {
  if (!el) return;
  el.classList.add("camp-input-error");
  el.addEventListener(
    "input",
    () => {
      el.classList.remove("camp-input-error");
    },
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

  const firstNameEl = getField("campFirstName");
  const lastNameEl = getField("campLastName");
  const ageEl = getField("campAge");
  const parentNameEl = getField("campParentName");
  const parentPhoneEl = getField("campParentPhone");

  if (!firstNameEl || !lastNameEl || !ageEl || !parentNameEl || !parentPhoneEl) return false;

  const firstName = firstNameEl.value.trim();
  const lastName = lastNameEl.value.trim();
  const age = ageEl.value.trim();
  const parentName = parentNameEl.value.trim();
  const parentPhone = parentPhoneEl.value.trim();

  let valid = true;

  [
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
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;
  }

  const payload = encodeURIComponent(
    JSON.stringify({
      program: "Summer School",
      firstName,
      lastName,
      age: String(ageNum),
      parentName,
      parentPhone,
      timestamp: new Date().toISOString()
    })
  );

  new Image().src = `${APPS_SCRIPT_URL}?payload=${payload}`;

  setTimeout(() => {
    const form = getField("camp-form");
    if (form) {
      form.innerHTML = `
        <div class="camp-success-box">
          <div class="camp-success-icon">☀️</div>
          <div class="camp-success-title">تم تسجيل طلبكم بنجاح!</div>
          <div class="camp-success-text">
            أهلاً <span class="camp-success-name">${firstName} ${lastName}</span><br>
            تم استلام طلب التسجيل في <strong>Summer School</strong> بنجاح.<br>
            سيتم التواصل معكم قريباً عبر رقم ولي الأمر لتأكيد التفاصيل.
          </div>
          <div class="camp-success-note">
            نتمنى لكم تجربة صيفية ممتعة، مليئة بالتعلّم والطاقة والذكريات الجميلة 🌊✨
          </div>
        </div>
      `;
    }
  }, 1400);

  return false;
}

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
window.campRegister = campRegister;

document.addEventListener("DOMContentLoaded", () => {
  injectRevealStyles();
  initSquaresBackground();
  initCampVideo();
  initRevealOnScroll();
  loadCampGallery();

  const form = document.getElementById("camp-form");
  const submitBtn = document.getElementById("camp-submit-btn");

  if (form) form.addEventListener("submit", campRegister);
  if (submitBtn) submitBtn.addEventListener("click", campRegister);
});
