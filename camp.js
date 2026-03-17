/* ═══════════════════════════════════════════
   CAMP — Registration + Gallery + Video
════════════════════════════════════════════ */

import { initializeApp }  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getFirestore, collection, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAMcplfO4veFVLtZZcyqfTJx9NGCit8gjo",
  authDomain:        "eplus-center-39.firebaseapp.com",
  projectId:         "eplus-center-39",
  storageBucket:     "eplus-center-39.firebasestorage.app",
  messagingSenderId: "191532732034",
  appId:             "1:191532732034:web:b11449a2f0595db5d02e9b"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const CAMP_MIN_AGE = 7;
const CAMP_MAX_AGE = 15;

/* ══════════════════════════════
   🎬 CAMP VIDEO — Autoplay on Scroll
══════════════════════════════ */
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
            video.muted  = false;
            video.volume = 1;
            const promise = video.play();
            if (promise !== undefined) {
              promise.catch(() => {
                video.muted = true;
                video.play();
              });
            }
          } else {
            if (video.paused) video.play();
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

/* ══════════════════════════════
   📸 CAMP GALLERY
══════════════════════════════ */
function loadCampGallery() {
  const grid = document.getElementById("camp-gallery-grid");
  if (!grid) return;

  const q = query(collection(db, "campGallery"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    if (snap.empty) {
      grid.innerHTML = `
        <div class="camp-gallery-empty">
          <span>📸</span>
          <span>سيتم نشر الصور قريباً بعد انطلاق المخيم</span>
        </div>`;
      return;
    }

    grid.innerHTML = "";
    snap.forEach(doc => {
      const data = doc.data();
      if (!data.imageUrl) return;

      const img = document.createElement("img");
      img.src           = data.imageUrl;
      img.alt           = "صورة من المخيم";
      img.loading       = "lazy";
      img.draggable     = false;
      img.className     = "camp-gallery-img";
      img.style.cssText = `
        width:100%; aspect-ratio:1; object-fit:cover;
        border-radius:14px; border:1px solid rgba(4,82,131,0.2);
        transition:transform 0.3s, box-shadow 0.3s; cursor:zoom-in;`;
      img.addEventListener("mouseover", () => {
        img.style.transform = "scale(1.03)";
        img.style.boxShadow = "0 8px 30px rgba(4,82,131,0.4)";
      });
      img.addEventListener("mouseout", () => {
        img.style.transform = "";
        img.style.boxShadow = "";
      });
      img.addEventListener("click", () => openLightbox(data.imageUrl));
      grid.appendChild(img);
    });
  });
}

/* ══ LIGHTBOX ══ */
function openLightbox(src) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:9999;
    background:rgba(2,9,21,0.95); backdrop-filter:blur(10px);
    display:flex; align-items:center; justify-content:center;
    padding:20px; cursor:zoom-out; animation:fadeIn 0.2s ease;`;
  overlay.innerHTML = `
    <img src="${src}" style="
      max-width:100%; max-height:90vh;
      border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,0.8);
      animation:scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1);" draggable="false">
    <button style="
      position:absolute; top:20px; left:20px;
      background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2);
      color:#fff; font-size:22px; width:44px; height:44px; border-radius:50%;
      cursor:pointer; display:flex; align-items:center; justify-content:center;
      backdrop-filter:blur(8px); transition:background 0.2s;">✕</button>`;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes scaleIn { from{transform:scale(0.85)} to{transform:scale(1)} }`;
  overlay.appendChild(style);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.tagName === "BUTTON") overlay.remove();
  });
  document.body.appendChild(overlay);
}

/* ══════════════════════════════
   📋 CAMP REGISTRATION
══════════════════════════════ */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzJx2NEPz7a7ntKmXQQq7i78ICeIFHiuAxTpfJyAocSkeqmbsmhx_h3YzVjbqs0eiyF/exec";

function campRegister(e) {
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

  const ageEl  = document.getElementById("campAge");
  const ageNum = parseInt(age);

  if (!age || isNaN(ageNum) || ageNum <= 0) {
    ageEl.classList.add("error");
    ageEl.addEventListener("input", () => ageEl.classList.remove("error"), { once: true });
    valid = false;
  } else if (ageNum < CAMP_MIN_AGE || ageNum > CAMP_MAX_AGE) {
    ageEl.classList.add("error");
    ageEl.addEventListener("input", () => ageEl.classList.remove("error"), { once: true });
    alert(`❌ عذراً، العمر غير مسموح به للمشاركة في المخيم.\nالفئة العمرية المقبولة: ${CAMP_MIN_AGE} إلى ${CAMP_MAX_AGE} سنة.`);
    valid = false;
  }

  if (!valid) return;

  const submitBtn = document.getElementById("camp-submit-btn");
  submitBtn.classList.add("loading");
  submitBtn.disabled = true;

  const payload = encodeURIComponent(JSON.stringify({
    firstName, lastName, age: String(age),
    parentName, parentPhone,
    timestamp: new Date().toISOString()
  }));
  new Image().src = APPS_SCRIPT_URL + "?payload=" + payload;

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

/* ══ INIT ══ */
window.campRegister = campRegister;

document.addEventListener("DOMContentLoaded", () => {
  initCampVideo();
  loadCampGallery();

  const form      = document.getElementById("camp-form");
  const submitBtn = document.getElementById("camp-submit-btn");
  if (form)      form.addEventListener("submit",  campRegister);
  if (submitBtn) submitBtn.addEventListener("click", campRegister);
});
