// ─────────────────────────────────────────────────────────
// SQUARES BACKGROUND
// ─────────────────────────────────────────────────────────
const squaresCanvas = document.getElementById('squares-canvas');
const squaresCtx = squaresCanvas.getContext('2d');

let squares = [];
const squareSize = 40;
const squareGap = 4;
let cols, rows;

function resizeSquares() {
  squaresCanvas.width = window.innerWidth;
  squaresCanvas.height = window.innerHeight;
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
  squaresCtx.clearRect(0, 0, squaresCanvas.width, squaresCanvas.height);
  
  squares.forEach(sq => {
    if (Math.abs(sq.opacity - sq.targetOpacity) < 0.01) {
      sq.targetOpacity = Math.random() * 0.4;
    }
    sq.opacity += (sq.targetOpacity - sq.opacity) * sq.speed;
    
    squaresCtx.fillStyle = `rgba(4, 130, 195, ${sq.opacity})`;
    squaresCtx.fillRect(sq.x, sq.y, squareSize, squareSize);
  });
  
  requestAnimationFrame(animateSquares);
}

window.addEventListener('resize', resizeSquares);

// ─────────────────────────────────────────────────────────
// SPLIT TEXT
// ─────────────────────────────────────────────────────────
function initSplitText() {
  document.querySelectorAll('.split-text').forEach((el, index) => {
    const text = el.getAttribute('data-text') || el.textContent;
    el.innerHTML = '';
    
    text.split('').forEach((char, i) => {
      const span = document.createElement('span');
      span.className = 'split-char';
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.animationDelay = `${(i * 0.05) + (index * 0.3)}s`;
      el.appendChild(span);
    });
  });
}

// ─────────────────────────────────────────────────────────
// PILL NAVIGATION
// ─────────────────────────────────────────────────────────
let currentService = 'support';

function initPillNav() {
  const pillNav = document.querySelector('.pill-nav');
  const pillSlider = document.querySelector('.pill-slider');
  const pillBtns = document.querySelectorAll('.pill-btn');
  
  if (!pillNav || !pillSlider) return;
  
  function updateSlider(btn) {
    const rect = btn.getBoundingClientRect();
    const navRect = pillNav.getBoundingClientRect();
    
    pillSlider.style.width = `${rect.width}px`;
    pillSlider.style.transform = `translateX(${rect.left - navRect.left - 6}px)`;
  }
  
  const activeBtn = document.querySelector('.pill-btn.active');
  if (activeBtn) updateSlider(activeBtn);
  
  pillBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      pillBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      updateSlider(this);
    });
  });
  
  window.addEventListener('resize', () => {
    const active = document.querySelector('.pill-btn.active');
    if (active) updateSlider(active);
  });
}

function selectService(type) {
  currentService = type;
  openModal(type);
}

// ─────────────────────────────────────────────────────────
// TRANSLATIONS
// ─────────────────────────────────────────────────────────
const translations = {
  ar: {
    badge:        "✦ أكاديمية التعليم المتقدم ✦",
    subtitle:     "التسجيل في الدورات والبرامج التعليمية",
    btn1:         "تسجيلات الدعم",
    btn2:         "دورات اللغات",
    btn3:         "دروس VIP",
    formTitle:    "نموذج التسجيل",
    firstName:    "الاسم",
    lastName:     "اللقب",
    birthDate:    "تاريخ الميلاد",
    birthPlace:   "مكان الميلاد",
    langLevel:    "مستوى اللغة (CEFR)",
    selectLevel:  "-- اختر المستوى --",
    phone:        "رقم الهاتف",
    motivation:   "ما هو الدافع الذي جعلك تختار أكاديمية E-PLUS؟",
    optional:     "(اختياري)",
    submitBtn:    "إرسال التسجيل ✦",
    successTitle: "🎉 تم التسجيل بنجاح!",
    successMsg:   "تم تسجيل معلوماتك بنجاح،\nسيتم التواصل معك قريباً.",
    closeBtn:     "العودة إلى الصفحة الرئيسية",
    supportTitle: "تسجيلات الدعم",
    langTitle:    "تسجيل دورة لغة",
    vipTitle:     "تسجيل دروس VIP"
  },
  en: {
    badge:        "✦ Advanced Education Academy ✦",
    subtitle:     "Register for Courses & Educational Programs",
    btn1:         "Support Registration",
    btn2:         "Language Courses",
    btn3:         "VIP Lessons",
    formTitle:    "Registration Form",
    firstName:    "First Name",
    lastName:     "Last Name",
    birthDate:    "Date of Birth",
    birthPlace:   "Place of Birth",
    langLevel:    "Language Level (CEFR)",
    selectLevel:  "-- Select Level --",
    phone:        "Phone Number",
    motivation:   "What motivated you to choose E-PLUS Academy?",
    optional:     "(optional)",
    submitBtn:    "Submit Registration ✦",
    successTitle: "🎉 Registered Successfully!",
    successMsg:   "Your information has been recorded.\nWe will contact you soon.",
    closeBtn:     "Back to Main Page",
    supportTitle: "Support Registration",
    langTitle:    "Language Course Registration",
    vipTitle:     "VIP Lessons Registration"
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
        el.innerHTML = t[key].replace('\n', '<br>');
      } else {
        el.textContent = t[key];
      }
    }
  });
}

// ─────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────
function openModal(type) {
  const overlay = document.getElementById('modal');
  const formView = document.getElementById('form-view');
  const succView = document.getElementById('success-view');
  const titleEl = document.getElementById('modal-title');
  const langLevelGroup = document.getElementById('langLevelGroup');
  const langLevelSelect = document.getElementById('langLevel');
  const t = translations[currentLang];
  
  const titles = {
    support: 'supportTitle',
    lang: 'langTitle',
    vip: 'vipTitle'
  };
  
  titleEl.textContent = t[titles[type]] || t.formTitle;
  
  // إظهار/إخفاء حقل مستوى اللغة
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
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.body.style.overflow = '';
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal')) {
    closeModal();
  }
}

// ─────────────────────────────────────────────────────────
// FORM SUBMIT
// ─────────────────────────────────────────────────────────
function submitForm(e) {
  e.preventDefault();
  const inputs = document.getElementById('reg-form').querySelectorAll('[required]');
  let valid = true;
  
  inputs.forEach(input => {
    if (!input.value.trim()) {
      valid = false;
      input.style.borderColor = '#e86b6b';
      input.style.boxShadow = '0 0 0 3px rgba(232,107,107,0.25)';
      setTimeout(() => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
      }, 2000);
    }
  });
  
  if (!valid) return;
  
  document.getElementById('form-view').style.display = 'none';
  document.getElementById('success-view').classList.add('show');
  launchConfetti();
}

// ─────────────────────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────────────────────
function launchConfetti() {
  const colors = ['#045283', '#0570b0', '#0a8acb', '#f4b41a', '#ffffff'];
  const box = document.getElementById('modal-box');
  
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

// ─────────────────────────────────────────────────────────
// RIPPLE EFFECT
// ─────────────────────────────────────────────────────────
function initRipple() {
  document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const r = document.createElement('span');
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
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  resizeSquares();
  animateSquares();
  initSplitText();
  initPillNav();
  initRipple();
  setLang(currentLang);
});
