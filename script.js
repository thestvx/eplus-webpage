// ─── SQUARES BACKGROUND ───────────────────────────────────
const canvas = document.getElementById('squares-canvas');
const ctx = canvas.getContext('2d');

let squares = [];
const squareSize = 40;
const squareGap = 4;
let cols, rows;

function resizeCanvas() {
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
        opacity: Math.random() * 0.3,
        targetOpacity: Math.random() * 0.3,
        speed: 0.005 + Math.random() * 0.01
      });
    }
  }
}

function animateSquares() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  squares.forEach(sq => {
    if (Math.abs(sq.opacity - sq.targetOpacity) < 0.01) {
      sq.targetOpacity = Math.random() * 0.4;
    }
    sq.opacity += (sq.targetOpacity - sq.opacity) * sq.speed;
    ctx.fillStyle = `rgba(4, 130, 195, ${sq.opacity})`;
    ctx.fillRect(sq.x, sq.y, squareSize, squareSize);
  });
  requestAnimationFrame(animateSquares);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animateSquares();

// ─── TRANSLATIONS ─────────────────────────────────────────
const translations = {
  ar: {
    badge: "✦ رحلتك نحو النجاح تبدأ من هنا ✦",
    title: "EDUCATION PLUS CENTER",
    subtitle: "التسجيل في الدورات والبرامج التعليمية",
    btn1: "تسجيلات الدعم",
    btn2: "دورات اللغات",
    btn3: "دروس VIP",
    firstName: "الاسم",
    lastName: "اللقب",
    birthDate: "تاريخ الميلاد",
    birthPlace: "مكان الميلاد",
    langLevel: "مستوى اللغة (CEFR)",
    selectLevel: "-- اختر المستوى --",
    phone: "رقم الهاتف",
    motivation: "ما هو الدافع الذي جعلك تختار أكاديمية E-PLUS؟",
    optional: "(اختياري)",
    submitBtn: "إرسال التسجيل ✦",
    successTitle: "🎉 تم التسجيل بنجاح!",
    successMsg: "تم تسجيل معلوماتك بنجاح،\\nسيتم التواصل معك قريباً.",
    closeBtn: "العودة إلى الصفحة الرئيسية",
    supportTitle: "تسجيلات الدعم",
    langTitle: "تسجيل دورة لغة",
    vipTitle: "تسجيل دروس VIP",
    levels: {
      A1: "A1 - مبتدئ",
      A2: "A2 - مبتدئ متقدم",
      B1: "B1 - متوسط",
      B2: "B2 - متوسط متقدم",
      C1: "C1 - متقدم",
      C2: "C2 - احترافي"
    }
  },
  en: {
    badge: "✦ Your journey to success starts here ✦",
    title: "EDUCATION PLUS CENTER",
    subtitle: "Register for Courses & Educational Programs",
    btn1: "Support Registration",
    btn2: "Language Courses",
    btn3: "VIP Lessons",
    firstName: "First Name",
    lastName: "Last Name",
    birthDate: "Date of Birth",
    birthPlace: "Place of Birth",
    langLevel: "Language Level (CEFR)",
    selectLevel: "-- Select Level --",
    phone: "Phone Number",
    motivation: "What motivated you to choose E-PLUS Academy?",
    optional: "(optional)",
    submitBtn: "Submit Registration ✦",
    successTitle: "🎉 Registered Successfully!",
    successMsg: "Your information has been recorded.\\nWe will contact you soon.",
    closeBtn: "Back to Main Page",
    supportTitle: "Support Registration",
    langTitle: "Language Course Registration",
    vipTitle: "VIP Lessons Registration",
    levels: {
      A1: "A1 - Beginner",
      A2: "A2 - Elementary",
      B1: "B1 - Intermediate",
      B2: "B2 - Upper Intermediate",
      C1: "C1 - Advanced",
      C2: "C2 - Proficiency"
    }
  }
};

let currentLang = localStorage.getItem('eplus-lang') || 'ar';

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('eplus-lang', lang);
  const html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.getElementById('btn-ar').classList.toggle('active', lang === 'ar');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  applyTranslations();
}

function applyTranslations() {
  const t = translations[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      if (key === 'successMsg') {
        el.innerHTML = t[key].replace('\\n', '<br>');
      } else {
        el.textContent = t[key];
      }
    }
  });
  document.querySelectorAll('[data-i18n-level]').forEach(el => {
    const level = el.getAttribute('data-i18n-level');
    if (t.levels && t.levels[level]) el.textContent = t.levels[level];
  });
}

// ─── GOOGLE SHEETS ────────────────────────────────────────
// ضع هنا رابط Apps Script بعد النشر
const SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL';

// ─── MODAL ────────────────────────────────────────────────
let currentModalType = 'support';

function openModal(type) {
  currentModalType = type;
  const overlay      = document.getElementById('modal');
  const formView     = document.getElementById('form-view');
  const succView     = document.getElementById('success-view');
  const titleEl      = document.getElementById('modal-title');
  const langLevelGroup  = document.getElementById('langLevelGroup');
  const langLevelSelect = document.getElementById('langLevel');
  const langToggle   = document.getElementById('lang-toggle');
  const t = translations[currentLang];

  const titles = {
    support: t.supportTitle,
    lang:    t.langTitle,
    vip:     t.vipTitle
  };

  titleEl.textContent = titles[type] || '';

  if (type === 'lang') {
    langLevelGroup.style.display = 'block';
    langLevelSelect.setAttribute('required', 'required');
  } else {
    langLevelGroup.style.display = 'none';
    langLevelSelect.removeAttribute('required');
    langLevelSelect.value = '';
  }

  formView.style.display = 'block';
  succView.classList.remove('show');
  document.getElementById('reg-form').reset();
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (langToggle) langToggle.classList.add('hidden');
}

function closeModal() {
  const overlay    = document.getElementById('modal');
  const langToggle = document.getElementById('lang-toggle');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  if (langToggle) langToggle.classList.remove('hidden');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

// ─── FORM SUBMIT ──────────────────────────────────────────
async function submitForm(e) {
  e.preventDefault();
  const inputs = document.getElementById('reg-form').querySelectorAll('[required]');
  let valid = true;

  inputs.forEach(input => {
    input.classList.remove('error');
    if (!input.value.trim()) {
      valid = false;
      input.classList.add('error');
      setTimeout(() => input.classList.remove('error'), 2000);
    }
  });

  if (!valid) return;

  const btn = document.querySelector('#form-view .submit-btn');
  btn.classList.add('loading');

  const typeLabels = { support: 'دعم', lang: 'لغات', vip: 'VIP' };

  const data = {
    timestamp:  new Date().toLocaleString('ar-DZ'),
    type:       typeLabels[currentModalType] || currentModalType,
    firstName:  document.getElementById('firstName').value.trim(),
    lastName:   document.getElementById('lastName').value.trim(),
    birthDate:  document.getElementById('birthDate').value,
    birthPlace: document.getElementById('birthPlace').value.trim(),
    phone:      document.getElementById('phone').value.trim(),
    langLevel:  document.getElementById('langLevel').value || '-',
    motivation: document.getElementById('motivation').value.trim() || '-',
  };

  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.warn('Sheet error:', err);
  }

  btn.classList.remove('loading');
  document.getElementById('form-view').style.display = 'none';
  document.getElementById('success-view').classList.add('show');
  launchConfetti();
}

// ─── CONFETTI ─────────────────────────────────────────────
function launchConfetti() {
  const colors = ['#045283', '#0570b0', '#0a8acb', '#f4b41a', '#ffffff', '#53a9df'];
  const box = document.getElementById('modal-box');

  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const c = document.createElement('div');
      c.className = 'confetti';
      const size = 6 + Math.random() * 9;
      c.style.cssText = `
        left: ${5 + Math.random() * 90}%;
        top: 8%;
        width: ${size}px;
        height: ${size}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation-duration: ${1.2 + Math.random() * 1.2}s;
        animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
      `;
      box.appendChild(c);
      setTimeout(() => c.remove(), 2600);
    }, i * 35);
  }
}

// ─── INIT ─────────────────────────────────────────────────
setLang(currentLang);
