import { initializeApp }  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAnalytics }   from "https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js";
import {
  getFirestore, collection, addDoc,
  serverTimestamp, query, orderBy, onSnapshot, getDocs
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAMcplfO4veFVLtZZcyqfTJx9NGCit8gjo",
  authDomain:        "eplus-center-39.firebaseapp.com",
  projectId:         "eplus-center-39",
  storageBucket:     "eplus-center-39.firebasestorage.app",
  messagingSenderId: "191532732034",
  appId:             "1:191532732034:web:b11449a2f0595db5d02e9b",
  measurementId:     "G-L8KVV0MEKT"
};

const _app       = initializeApp(firebaseConfig, "camp-app");
const _analytics = getAnalytics(_app);
const _db        = getFirestore(_app);

/* ════════════════════════════════════════
   GOOGLE SHEET SYNC
════════════════════════════════════════ */
const SHEET_URL    = "https://script.google.com/macros/s/AKfycbyH86crLod1oybm-RAowfa2vK2PQtpojNkQYlEd1u8ijEK8FWcPDF4g_ysyfNyLbAyh/exec";
const SHEET_SECRET = "eplus2026camp";

/* ════════════════════════════════════════
   GALLERY — يجلب روابط Cloudinary من Firestore
   collection: "camp-gallery"
   كل document: { url: "https://res.cloudinary.com/...", order: 0 }
════════════════════════════════════════ */
async function loadGallery() {
  const grid = document.getElementById("camp-gallery-grid");
  try {
    const q    = query(collection(_db, "camp-gallery"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    if (snap.empty) return; // يبقى الـ empty state
    grid.innerHTML = "";
    snap.forEach(doc => {
      const { url, caption } = doc.data();
      const img = document.createElement("img");
      img.src       = url;
      img.alt       = caption || "صورة من المخيم";
      img.className = "camp-gallery-img";
      img.draggable = false;
      img.loading   = "lazy";
      // Cloudinary transformation — جودة auto + ضغط
      if (url.includes("cloudinary.com")) {
        img.src = url.replace("/upload/", "/upload/q_auto,f_auto,w_600/");
      }
      grid.appendChild(img);
    });
  } catch (e) {
    console.warn("gallery load failed:", e);
  }
}

loadGallery();

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

  try {
    await addDoc(collection(_db, "camp-registrations"), {
      firstName, lastName,
      age:         Number(age),
      parentName,  parentPhone,
      registeredAt: serverTimestamp(),
      status:      "pending"
    });

    // مزامنة مع Google Sheet — no-cors لتجنب CORS error
    const sheetData = new URLSearchParams({
      secret:      SHEET_SECRET,
      firstName,   lastName,
      age:         String(age),
      parentName,  parentPhone
    });
    fetch(SHEET_URL, {
      method:  "POST",
      mode:    "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    sheetData.toString()
    }).catch(err => console.warn("Sheet sync failed:", err));

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
  } catch (err) {
    console.error(err);
    submitBtn.classList.remove("loading");
    submitBtn.disabled = false;
    alert("حدث خطأ أثناء التسجيل، يرجى المحاولة مرة أخرى.");
  }
});
