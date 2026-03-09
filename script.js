// ─── الترجمة ─────────────────────────────────────────────
const translations = {
  ar: {
    badge:        "✦ أكاديمية التعليم المتقدم ✦",
    subtitle:     "التسجيل في الدورات والبرامج التعليمية",
    btn1:         "تسجيلات الدعم",
    btn1sub:      "Support Registration",
    btn2:         "تسجيلات دورات اللغات",
    btn2sub:      "Language Courses",
    btn3:         "تسجيلات دروس VIP",
    btn3sub:      "VIP Private Lessons",
    formTitle:    "نموذج التسجيل",
    firstName:    "الاسم",
    lastName:     "اللقب",
    birthDate:    "تاريخ الميلاد",
    birthPlace:   "مكان الميلاد",
    phone:        "رقم الهاتف",
    motivation:   "ما هو الدافع الذي جعلك تختار أكاديمية E-PLUS؟",
    optional:     "(اختياري)",
    submitBtn:    "إرسال التسجيل ✦",
    successTitle: "🎉 تم التسجيل بنجاح!",
    successMsg:   "تم تسجيل معلوماتك بنجاح،\nسيتم التواصل معك قريباً.",
    closeBtn:     "العودة إلى الصفحة الرئيسية",
    supportTitle: "تسجيلات الدعم",
    langTitle:    "تسجيلات دورات اللغات",
    vipTitle:     "تسجيلات دروس VIP"
  },
  en: {
    badge:        "✦ Advanced Education Academy ✦",
    subtitle:     "Register for Courses & Educational Programs",
    btn1:         "Support Registration",
    btn1sub:      "تسجيلات الدعم",
    btn2:         "Language Courses",
    btn2sub:      "تسجيلات دورات اللغات",
    btn3:         "VIP Private Lessons",
    btn3sub:      "تسجيلات دروس VIP",
    formTitle:    "Registration Form",
    firstName:    "First Name",
    lastName:     "Last Name",
    birthDate:    "Date of Birth",
    birthPlace:   "Place of Birth",
    phone:        "Phone Number",
    motivation:   "What motivated you to choose E-PLUS Academy?",
    optional:     "(optional)",
    submitBtn:    "Submit Registration ✦",
    successTitle: "🎉 Registered Successfully!",
    successMsg:   "Your information has been recorded.\nWe will contact you soon.",
    closeBtn:     "Back to main page",
    supportTitle: "Support Registration",
    langTitle:    "Language Courses Registration",
    vipTitle:     "VIP Lessons Registration"
  }
};

// ─── اللغة ───────────────────────────────────────────────
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
        el.innerHTML = t[key].replace('\n','<br>');
      } else {
        el.textContent = t[key];
      }
    }
  });
}

// ─── المودال ─────────────────────────────────────────────
let currentType = '';

const modalTitles = {
  support: 'supportTitle',
  lang:    'langTitle',
  vip:     'vipTitle'
};

function openModal(type) {
  currentType = type;
  const overlay  = document.getElementById('modal');
  const formView = document.getElementById('form-view');
  const succView = document.getElementById('success-view');
  const titleEl  = document.getElementById('modal-title');
  const t        = translations[currentLang];

  titleEl.textContent = t[modalTitles[type]] || t.formTitle;

  formView.style.display = 'block';
  succView.classList.remove('show');
  document.getElementById('reg-form').reset();

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.body.style.overflow = '';
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

// ─── إرسال الفورم ────────────────────────────────────────
function submitForm(e) {
  e.preventDefault();
  const form   = document.getElementById('reg-form');
  const inputs = form.querySelectorAll('[required]');
  let valid = true;

  inputs.forEach(input => {
    if (!input.value.trim()) {
      valid = false;
      input.style.borderColor = '#e86b6b';
      input.style.boxShadow   = '0 0 0 3px rgba(232,107,107,0.25)';
      setTimeout(() => {
        input.style.borderColor = '';
        input.style.boxShadow   = '';
      }, 2000);
    }
  });

  if (!valid) return;

  document.getElementById('form-view').style.display = 'none';
  document.getElementById('success-view').classList.add('show');
  launchConfetti();
}

// ─── Confetti ────────────────────────────────────────────
function launchConfetti() {
  const colors = ['#045283', '#0570b0', '#0a8acb', '#f4b41a', '#ffffff'];
  const box    = document.getElementById('modal-box');

  for (let i = 0; i < 20; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.cssText = `
      left: ${Math.random() * 100}%;
      top: 0;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay: ${Math.random() * 0.4}s;
      animation-duration: ${1.5 + Math.random()}s;
    `;
    box.appendChild(c);
    setTimeout(() => c.remove(), 2400);
  }
}

// ─── Ripple Effect على الأزرار ──────────────────────────
document.querySelectorAll('.reg-btn').forEach(btn => {
  btn.addEventListener('click', function (e) {
    const r    = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    r.className = 'ripple-effect';
    r.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${e.clientX - rect.left - size / 2}px;
      top: ${e.clientY - rect.top - size / 2}px;
    `;

    this.appendChild(r);
    setTimeout(() => r.remove(), 650);
  });
});

// ─── Particles في الخلفية ───────────────────────────────
function createParticles() {
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      animation-duration: ${9 + Math.random() * 10}s;
      animation-delay: ${Math.random() * 10}s;
      opacity: ${0.35 + Math.random() * 0.45};
      width: ${2 + Math.random() * 3}px;
      height: ${2 + Math.random() * 3}px;
      background: ${Math.random() > 0.5 ? 'rgba(4,130,195,0.8)' : 'rgba(151,198,238,0.8)'};
    `;
    document.body.appendChild(p);
  }
}

// ─── Init ────────────────────────────────────────────────
createParticles();
setLang(currentLang);
