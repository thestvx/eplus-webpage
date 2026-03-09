// ─── Translations ─────────────────────────────────────────
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
    langLevel:    "مستوى اللغة",
    selectLevel:  "-- اختر المستوى --",
    phone:        "رقم الهاتف",
    motivation:   "لماذا اخترت E-PLUS؟",
    optional:     "(اختياري)",
    submitBtn:    "إرسال التسجيل ✦",
    successTitle: "🎉 تم التسجيل بنجاح!",
    successMsg:   "تم تسجيل معلوماتك بنجاح،\nسيتم التواصل معك قريباً.",
    closeBtn:     "إغلاق",
    supportTitle: "تسجيلات الدعم",
    langTitle:    "دورات اللغات",
    vipTitle:     "دروس VIP"
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
    langLevel:    "Language Level",
    selectLevel:  "-- Select Level --",
    phone:        "Phone Number",
    motivation:   "Why did you choose E-PLUS?",
    optional:     "(optional)",
    submitBtn:    "Submit Registration ✦",
    successTitle: "🎉 Registered Successfully!",
    successMsg:   "Your information has been recorded.\nWe will contact you soon.",
    closeBtn:     "Close",
    supportTitle: "Support Registration",
    langTitle:    "Language Courses",
    vipTitle:     "VIP Lessons"
  }
};

// ─── Language ─────────────────────────────────────────────
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
      if (key === 'successMsg') el.innerHTML = t[key].replace('\n', '<br>');
      else el.textContent = t[key];
    }
  });
}

// ─── Modal ────────────────────────────────────────────────
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
  titleEl.textContent = t[modalTitles[type]];
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

function closeModalOutside(e)
