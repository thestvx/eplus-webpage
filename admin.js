import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, setDoc, getDoc, getDocs, query, orderBy, where, onSnapshot, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAMcplfO4veFVLtZZcyqfTJx9NGCit8gjo",
  authDomain: "eplus-center-39.firebaseapp.com",
  projectId: "eplus-center-39",
  storageBucket: "eplus-center-39.firebasestorage.app",
  messagingSenderId: "191532732034",
  appId: "1:191532732034:web:b11449a2f0595db5d02e9b",
  databaseURL: "https://eplus-center-39-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// ── Secondary app لإنشاء حسابات الأساتذة دون إلغاء جلسة الأدمين ──
let secondaryApp;
let secondaryAuth;
try {
  secondaryApp = initializeApp(firebaseConfig, 'secondary');
  secondaryAuth = getAuth(secondaryApp);
} catch(e) {
  // إذا كان موجوداً مسبقاً
  secondaryApp = getApps().find(a => a.name === 'secondary');
  secondaryAuth = getAuth(secondaryApp);
}

// Date in topbar
const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const now = new Date();
document.getElementById('topbar-date').textContent = `${days[now.getDay()]}، ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

// ── Flag لمنع تحميل قائمة الأساتذة كاملة عند دخول أستاذ ──
let isTeacherMode = false;

onAuthStateChanged(auth, async user => {
  const ls = document.getElementById('login-screen');
  const dash = document.getElementById('dashboard');
  if (user) {
// تحقق هل هذا المستخدم أستاذ
try {
  const teacherSnap = await getDoc(doc(db, 'teachers', user.uid));
  if (teacherSnap.exists()) {
    // ── وضع الأستاذ ──
    isTeacherMode = true;
    ls.classList.add('hidden');
    setTimeout(() => ls.style.display = 'none', 600);
    dash.style.display = 'flex';
    const td = teacherSnap.data();
    document.getElementById('admin-name').textContent = td.name || user.email;
    document.getElementById('admin-role-text') && (document.getElementById('admin-role-text').textContent = 'أستاذ');
    document.querySelector('.admin-role').textContent = '👨‍🏫 أستاذ';
    document.getElementById('topbar-greeting').textContent = `أهلاً، ${td.name || user.email} 👋`;
    // إخفاء عناصر الأدمين، إظهار قسم الأساتذة فقط
    document.querySelectorAll('.nav-item').forEach(el => el.style.display = 'none');
    const teacherNav = document.querySelectorAll('.nav-item')[3];
    if (teacherNav) { teacherNav.style.display = 'flex'; teacherNav.classList.add('active'); }
    document.querySelectorAll('.nav-section').forEach(el => el.style.display = 'none');
    document.getElementById('maintenance-card').style.display = 'none';
    ['home','announcements','summer','settings'].forEach(s => {
      const el = document.getElementById('section-' + s);
      if (el) el.style.display = 'none';
    });
    document.getElementById('section-teachers').style.display = 'block';
    // إخفاء نموذج إضافة أستاذ وسجل النشاطات
    document.querySelector('.teacher-form-panel').style.display = 'none';
    const logPanel = document.getElementById('admin-log-panel');
    if (logPanel) logPanel.style.display = 'none';
    // عرض نافذة الترحيب
    currentTeacherData = { uid: user.uid, id: user.uid, ...td };
    document.getElementById('welcome-teacher-name').textContent = `أهلاً استاذ ${td.name} .. يوم سعيد 🌟`;
    document.getElementById('welcome-modal').classList.add('open');
    // تحميل بيانات الأستاذ
    loadTeacherStudentsView(user.uid, td);
    loadTickets(); // نحتاج بيانات التذاكر لعرض حالة الدفع في قائمة الحضور
    return;
  }
} catch(e) { console.warn('Teacher check error:', e); }
// ── وضع الأدمين ──
isTeacherMode = false;
ls.classList.add('hidden');
setTimeout(() => ls.style.display = 'none', 600);
dash.style.display = 'flex';
const uname = user.email.split('@')[0];
document.getElementById('admin-name').textContent = uname;
document.getElementById('topbar-greeting').textContent = `أهلاً، ${uname} 👋`;
document.querySelector('.admin-role').textContent = 'مشرف النظام';
// إعادة إظهار جميع عناصر الأدمين (في حالة سبق دخول أستاذ وأخفاها)
document.querySelectorAll('.nav-item').forEach(el => el.style.display = '');
document.querySelectorAll('.nav-section').forEach(el => el.style.display = '');
const mc = document.getElementById('maintenance-card');
if (mc) mc.style.display = '';
const tfp = document.querySelector('.teacher-form-panel');
if (tfp) tfp.style.display = '';
const lp = document.getElementById('admin-log-panel');
if (lp) lp.style.display = '';
// إعادة ضبط القسم الافتراضي
switchNavSection('home');
loadRegistrations();
loadVisitorStats();
loadMaintenanceStatus();
loadAnnouncements();
loadTickets();
loadTeachers();
  } else {
isTeacherMode = false;
ls.style.display = 'flex';
ls.classList.remove('hidden');
dash.style.display = 'none';
  }
});

window.doLogin = async () => {
  const email = document.getElementById('email-inp').value.trim();
  const pass = document.getElementById('password-inp').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  try {
await signInWithEmailAndPassword(auth, email, pass);
  } catch {
errEl.style.display = 'block';
  }
};
window.doLogout = () => {
  if (_unsubTickets) { _unsubTickets(); _unsubTickets = null; }
  signOut(auth);
};

// NAV SWITCHING (sidebar-based, not tabs)
window.switchNavSection = (section) => {
  ['home','announcements','summer','teachers','settings'].forEach(s => {
const el = document.getElementById('section-' + s);
if (el) el.style.display = s === section ? 'block' : 'none';
  });
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const navMap = {home:0, announcements:1, summer:2, teachers:3, settings:4};
  const navItems = document.querySelectorAll('.nav-item');
  if (navMap[section] !== undefined) navItems[navMap[section]]?.classList.add('active');
};

// Keep old switchTab for compatibility
window.switchTab = (tab) => {
  const map = {announcements:'announcements', summer:'summer', settings:'settings'};
  switchNavSection(map[tab] || tab);
};

async function loadMaintenanceStatus() {
  try {
const snap = await getDoc(doc(db, 'settings', 'maintenance'));
updateMaintenanceUI(snap.exists() && snap.data().active === true);
  } catch(e) { console.error(e); }
}

window.toggleMaintenance = async () => {
  const snap = await getDoc(doc(db, 'settings', 'maintenance'));
  const isOn = snap.exists() && snap.data().active === true;
  const msg = isOn ? 'هل أنت متأكد من إعادة فتح الموقع للزوار؟' : 'هل أنت متأكد من تفعيل وضع الصيانة وإغلاق الموقع؟';
  if (!confirm(msg)) return;
  try {
await setDoc(doc(db, 'settings', 'maintenance'), { active: !isOn, updatedAt: serverTimestamp() });
updateMaintenanceUI(!isOn);
showToast(!isOn ? '⚠️ تم تفعيل وضع الصيانة' : '✅ تم إعادة فتح المنصة');
  } catch(e) { showToast('خطأ: ' + e.message, true); }
};

function updateMaintenanceUI(isOn) {
  const card = document.getElementById('maintenance-card');
  const text = document.getElementById('status-text');
  const btn = document.getElementById('btn-maintenance');
  card.classList.toggle('is-on', isOn);
  text.textContent = isOn ? '⚠️ المنصة مغلقة (وضع الصيانة مفعّل)' : '✅ المنصة تعمل ومتاحة للزوار';
  btn.textContent = isOn ? '🔓 إعادة فتح المنصة' : '🔒 إغلاق المنصة للصيانة';
}

window.showToast = (msg, isError = false) => {
  const t = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  document.getElementById('toast-msg').textContent = msg;
  icon.textContent = isError ? '!' : '✓';
  t.classList.toggle('error', isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
};

function loadRegistrations() {
  onSnapshot(query(collection(db, 'registrations'), orderBy('timestamp', 'desc')), snap => {
const r = snap.docs.map(d => d.data());
document.getElementById('stat-total').textContent = r.length;
document.getElementById('stat-support').textContent = r.filter(x => x.type === 'support').length;
document.getElementById('stat-lang').textContent = r.filter(x => x.type === 'lang').length;
document.getElementById('stat-vip').textContent = r.filter(x => x.type === 'vip').length;
  });
}

function loadVisitorStats() {
  onValue(ref(rtdb, 'visitors/total'), s => document.getElementById('vis-total').textContent = s.val() || 0);
  onValue(ref(rtdb, 'visitors/online'), s => document.getElementById('vis-online').textContent = s.val() || 0);
  const n = Timestamp.now();
  const t24 = Timestamp.fromMillis(n.toMillis() - 24 * 3600000);
  const t7d = Timestamp.fromMillis(n.toMillis() - 7 * 24 * 3600000);
  onSnapshot(query(collection(db,'pageViews'), where('visitedAt','>=',t24)), s => document.getElementById('vis-24h').textContent = s.size);
  onSnapshot(query(collection(db,'pageViews'), where('visitedAt','>=',t7d)), s => document.getElementById('vis-week').textContent = s.size);
}

// ═══════════════════════════════════════════
// ANNOUNCEMENTS PRO
// ═══════════════════════════════════════════
let annImageBase64 = null;
let allAnnouncements = [];
let currentAnnFilter = 'all';

window.setAnnType = (type, btn) => {
  document.getElementById('ann-type').value = type;
  document.querySelectorAll('.ann-type-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
};

window.onAnnImageChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('❌ الصورة أكبر من 5MB', true); return; }
  const reader = new FileReader();
  reader.onload = (ev) => {
annImageBase64 = ev.target.result;
document.getElementById('ann-img-preview').src = annImageBase64;
document.getElementById('ann-img-preview').style.display = 'block';
document.getElementById('ann-img-placeholder').style.display = 'none';
document.getElementById('ann-img-remove').style.display = 'flex';
document.getElementById('ann-img-zone').classList.add('has-img');
  };
  reader.readAsDataURL(file);
};

window.removeAnnImage = (e) => {
  e.stopPropagation();
  annImageBase64 = null;
  document.getElementById('ann-img-input').value = '';
  document.getElementById('ann-img-preview').style.display = 'none';
  document.getElementById('ann-img-placeholder').style.display = 'block';
  document.getElementById('ann-img-remove').style.display = 'none';
  document.getElementById('ann-img-zone').classList.remove('has-img');
};

window.publishAnnouncement = async () => {
  const title = document.getElementById('ann-title').value.trim();
  const text  = document.getElementById('ann-text').value.trim();
  const link  = document.getElementById('ann-link').value.trim();
  const type  = document.getElementById('ann-type').value || 'general';
  if (!title) { showToast('يرجى كتابة عنوان الإعلان', true); return; }
  const btn = document.getElementById('submit-ann-btn');
  btn.disabled = true; btn.textContent = '⏳ جاري النشر...';
  try {
const payload = { title, text, link, type, hidden: false, createdAt: serverTimestamp() };
if (annImageBase64) payload.imageBase64 = annImageBase64;
await addDoc(collection(db, 'announcements'), payload);
showToast('✨ تم نشر الإعلان بنجاح!');
document.getElementById('ann-title').value = '';
document.getElementById('ann-text').value = '';
document.getElementById('ann-link').value = '';
removeAnnImage({ stopPropagation: () => {} });
// reset type to general
setAnnType('general', document.querySelector('.ann-type-chip[data-type="general"]'));
  } catch(e) { showToast('خطأ: ' + e.message, true); }
  btn.disabled = false; btn.textContent = '🚀 نشر الإعلان';
};

const ANN_TYPE_LABELS = {
  general: { label: 'عام', emoji: '📢' },
  event:   { label: 'فعالية', emoji: '🎉' },
  urgent:  { label: 'عاجل', emoji: '🚨' },
  offer:   { label: 'عرض', emoji: '🎁' },
  news:    { label: 'خبر', emoji: '📰' },
};

function renderAnnGrid(data) {
  const el = document.getElementById('admin-ann-list');
  const filtered = data.filter(({x}) => {
if (currentAnnFilter === 'visible') return !x.hidden;
if (currentAnnFilter === 'hidden')  return x.hidden;
if (currentAnnFilter === 'urgent')  return x.type === 'urgent';
return true;
  });
  if (!filtered.length) {
el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📭</div><h3>لا توجد إعلانات</h3><p>ابدأ بنشر أول إعلان الآن</p></div>`;
return;
  }
  el.innerHTML = '';
  filtered.forEach(({id, x}) => {
const dateStr = x.createdAt?.toDate ? x.createdAt.toDate().toLocaleDateString('ar-DZ') : '';
const typeInfo = ANN_TYPE_LABELS[x.type] || ANN_TYPE_LABELS.general;
const card = document.createElement('div');
card.className = 'ann-card' + (x.hidden ? ' hidden-item' : '');
const imgHtml = x.imageBase64
  ? `<img class="ann-card-img" src="${x.imageBase64}" alt="صورة الإعلان" loading="lazy">`
  : `<div class="ann-card-img-placeholder">${typeInfo.emoji}</div>`;
const linkBtn = x.link ? `<a href="${x.link}" target="_blank" class="btn-sm" style="text-decoration:none;font-size:11px">🔗 الرابط</a>` : '';
card.innerHTML = `
  ${imgHtml}
  <div class="ann-card-body">
    <div class="ann-card-meta">
      <span class="ann-type-badge ${x.type || 'general'}">${typeInfo.emoji} ${typeInfo.label}</span>
      <span class="ann-card-date">📅 ${dateStr}</span>
    </div>
    <div class="ann-card-title">${x.title}</div>
    ${x.text ? `<div class="ann-card-text">${x.text}</div>` : ''}
  </div>
  <div class="ann-card-footer">
    <span class="ann-visibility-chip ${x.hidden ? 'hidden-chip' : 'visible'}">${x.hidden ? '🙈 مخفي' : '👁️ مرئي'}</span>
    <div class="ann-card-actions">
      ${linkBtn}
      <button class="btn-sm warn" onclick="toggleAnn('${id}',${x.hidden})">${x.hidden ? '👁️' : '🙈'}</button>
      <button class="btn-sm danger" onclick="deleteAnn('${id}')">🗑️</button>
    </div>
  </div>`;
el.appendChild(card);
  });
}

window.filterAnn = (filter, btn) => {
  currentAnnFilter = filter;
  document.querySelectorAll('.ann-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAnnGrid(allAnnouncements);
};

function loadAnnouncements() {
  onSnapshot(query(collection(db,'announcements'), orderBy('createdAt','desc')), snap => {
allAnnouncements = snap.docs.map(d => ({ id: d.id, x: d.data() }));
// update stats
const total   = allAnnouncements.length;
const visible = allAnnouncements.filter(({x}) => !x.hidden).length;
const hidden  = allAnnouncements.filter(({x}) => x.hidden).length;
const urgent  = allAnnouncements.filter(({x}) => x.type === 'urgent').length;
document.getElementById('ann-stat-total').textContent   = total;
document.getElementById('ann-stat-visible').textContent = visible;
document.getElementById('ann-stat-hidden').textContent  = hidden;
document.getElementById('ann-stat-urgent').textContent  = urgent;
renderAnnGrid(allAnnouncements);
  });
}

window.toggleAnn = async (id, isHidden) => {
  try { await updateDoc(doc(db,'announcements',id), { hidden: !isHidden }); showToast('✅ تم التحديث'); } catch(e) { showToast('خطأ: ' + e.message, true); }
};
window.deleteAnn = async (id) => {
  if (!confirm('⚠️ حذف الإعلان نهائياً؟')) return;
  try { await deleteDoc(doc(db,'announcements',id)); showToast('🗑️ تم الحذف'); } catch(e) { showToast('خطأ: ' + e.message, true); }
};

// ===== TICKET GENERATION =====
let selectedProgram = null;

// ── اختيار من قائمة الباقات ──
window.onPackSelect = (val) => {
  if (!val) return;
  // عطّل البرامج
  document.querySelectorAll('#program-btns .prog-btn').forEach(b => {
b.disabled = true;
b.style.opacity = '0.35';
b.style.pointerEvents = 'none';
  });
  document.getElementById('category-group').style.display = 'none';
  document.getElementById('reset-row').style.display = 'block';
  document.getElementById('sc-pack').value = val;
  document.getElementById('sc-amount').value = '';
  selectedProgram = null;

  const PRICES = {
'الباقة الأساسية (5-10)':8000,'باقة النخبة (5-10)':10000,
'الباقة الأساسية (11-14)':8000,'باقة النخبة (11-14)':10000,
'الباقة الأساسية (15-18)':8000,'باقة النخبة (15-18)':10000,
'باقة تحضير البكالوريا (15-18)':15000,
'باقة البالغين':8000,'باقة البالغين المتقدمة':12000,
'English Communication Class':8000
// English for Specific Purposes و IELTS Preparation: سعر بالتواصل — لا يُعبأ تلقائياً
  };
  if (PRICES[val]) document.getElementById('sc-amount').value = PRICES[val];
};

// ── اختيار برنامج ──
window.selectProgram = (programName, btn) => {
  selectedProgram = programName;
  // عطّل قائمة الباقات
  const packSel = document.getElementById('sc-pack-select');
  packSel.disabled = true;
  packSel.style.opacity = '0.35';
  packSel.value = '';
  document.getElementById('sc-pack').value = '';
  document.getElementById('sc-amount').value = '';
  // Highlight
  document.querySelectorAll('#program-btns .prog-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  // أظهر فئة البرنامج
  document.getElementById('category-group').style.display = 'block';
  document.querySelectorAll('#category-btns .cat-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('reset-row').style.display = 'block';
};

// ── اختيار فئة البرنامج ──
window.selectCategory = (category, price, btn) => {
  document.getElementById('sc-pack').value = `${selectedProgram} — فئة ${category}`;
  document.getElementById('sc-amount').value = price;
  document.querySelectorAll('#category-btns .cat-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  showToast(`✅ ${selectedProgram} — فئة ${category} — ${price.toLocaleString('ar-DZ')} دج`);
};

// ── إعادة الضبط ──
window.resetSelection = () => {
  selectedProgram = null;
  // أعد تفعيل كل شيء
  const packSel = document.getElementById('sc-pack-select');
  packSel.disabled = false;
  packSel.style.opacity = '';
  packSel.value = '';
  document.querySelectorAll('#program-btns .prog-btn').forEach(b => {
b.disabled = false;
b.style.opacity = '';
b.style.pointerEvents = '';
b.classList.remove('selected');
  });
  document.querySelectorAll('#category-btns .cat-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('category-group').style.display = 'none';
  document.getElementById('reset-row').style.display = 'none';
  document.getElementById('sc-pack').value = '';
  document.getElementById('sc-amount').value = '';
};

// ── kept for compatibility ──
window.resetProgram = window.resetSelection;
window.autoFillAmount = () => {};

// ══════════════════════════════════════════════════════
// البحث عن الطالب في جدولَي Google Sheets
// ══════════════════════════════════════════════════════

// ← ضع هنا معرّفَي جدولَي Google Sheets
const SHEET_ID_1 = '1dsCDRAo0f5mDSbTjaK_iqWGFBaEXmkHqkDPFp8ClkNI';   // الجدول الأول
const SHEET_ID_2 = '1AM1uKyQ9GjuPlw7_baWfU3z6nMAkwtl4i83ydJc8Rb4';  // الجدول الثاني

// اسم الصفحة (Sheet) داخل كل ملف — عدّل حسب حاجتك
const SHEET_NAME_1 = 'SummerPlus';
const SHEET_NAME_2 = 'programsummerschool';

// ── جدول الأسعار حسب الباقة واللغات ──
const PACK_BASE_PRICES = {
  'الباقة الأساسية (5-10)':8000,'باقة النخبة (5-10)':10000,
  'الباقة الأساسية (11-14)':8000,'باقة النخبة (11-14)':10000,
  'الباقة الأساسية (15-18)':8000,'باقة النخبة (15-18)':10000,
  'باقة تحضير البكالوريا (15-18)':15000,
  'باقة البالغين':8000,'باقة البالغين المتقدمة':12000,
  'English Communication Class':8000,
};
// سعر كل لغة — كل لغة = 8,000 دج (نفس منطق camp.js)
const PRICE_PER_LANG = 8000;

// ══════════════════════════════════════════════════════════════
// ⚡ APPS SCRIPT PROXY — الحل الوحيد لمشكلة CORS
//
// خطوات الإعداد (مرة واحدة فقط):
//  1. افتح: https://script.google.com/  → New Project
//  2. احذف الكود الموجود والصق هذا الكود:
//
//     function doGet(e) {
//       var id   = e.parameter.id;
//       var name = e.parameter.sheet;
//       var ss   = SpreadsheetApp.openById(id);
//       var sh   = ss.getSheetByName(name);
//       var data = sh.getDataRange().getValues();
//       var keys = data[0];
//       var rows = data.slice(1).map(function(r){
//         var obj = {};
//         keys.forEach(function(k,i){ obj[k] = r[i] === undefined ? '' : String(r[i]); });
//         return obj;
//       });
//       return ContentService
//         .createTextOutput(JSON.stringify(rows))
//         .setMimeType(ContentService.MimeType.JSON);
//     }
//
//  3. Deploy → New Deployment → Web App
//     - Execute as: Me
//     - Who has access: Anyone
//  4. انسخ الـ URL وضعه في APPS_SCRIPT_URL أدناه
// ══════════════════════════════════════════════════════════════
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwzTUAA620VFJwlJZOaPXF48AQmzmEiRTca3Js4nOWDYPJrSVYTvJaOEcqF5GhGhhs1bQ/exec'; // ← ضع الرابط هنا

async function fetchSheetData(sheetId, sheetName) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
console.warn('⚠️ APPS_SCRIPT_URL غير مُعيَّن');
return [];
  }
  try {
const url = `${APPS_SCRIPT_URL}?action=sheet&id=${encodeURIComponent(sheetId)}&sheet=${encodeURIComponent(sheetName)}`;
const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
// يدعم الردّين: مصفوفة مباشرة [] أو كائن { rows: [] }
return Array.isArray(data) ? data : (Array.isArray(data.rows) ? data.rows : []);
  } catch(e) {
console.warn('خطأ في جلب الشيت:', sheetId, e);
return [];
  }
}

// حساب السعر الاحتياطي (يُستخدم فقط إذا لم يكن المبلغ الإجمالي موجوداً في الشيت)
function calcTotalPrice(pack, langCount) {
  // باقات بسعر ثابت بغض النظر عن اللغات
  const FIXED = {
'باقة النخبة (5-10)': 10000,
'باقة النخبة (11-14)': 10000,
'باقة النخبة (15-18)': 10000,
'باقة تحضير البكالوريا (15-18)': 15000,
'باقة البالغين المتقدمة': 12000,
'English Communication Class': 8000,
  };
  if (FIXED[pack]) return FIXED[pack];
  // باقات اللغة: كل لغة = 8,000 دج
  const langs = parseInt(langCount) || 1;
  return langs * PRICE_PER_LANG;
}

window.searchStudent = async () => {
  const query = document.getElementById('student-search-inp').value.trim();
  if (!query) { showToast('⚠️ اكتب اسم الطالب أولاً', true); return; }

  const btn = document.getElementById('student-search-btn');
  const resultsDiv = document.getElementById('student-search-results');
  btn.disabled = true;
  btn.textContent = '⏳ جاري البحث...';
  resultsDiv.style.display = 'none';

  try {
// جلب البيانات من الجدولين
const [rows1, rows2] = await Promise.all([
  SHEET_ID_1 !== 'YOUR_FIRST_SHEET_ID'  ? fetchSheetData(SHEET_ID_1, SHEET_NAME_1) : [],
  SHEET_ID_2 !== 'YOUR_SECOND_SHEET_ID' ? fetchSheetData(SHEET_ID_2, SHEET_NAME_2) : [],
]);

const allRows = [
  ...rows1.map(r => ({ ...r, _source: 'الجدول الأول' })),
  ...rows2.map(r => ({ ...r, _source: 'الجدول الثاني' })),
];

// بحث غير حساس لحالة الأحرف وللمسافات
const q = query.trim().toLowerCase();

// أسماء الأعمدة الحقيقية من الجدولين:
// جدول 1 (SummerPlus):        الاسم، اللقب، الباقة، اللغة المختارة
// جدول 2 (programsummerschool): الاسم، اللقب، نوع البرنامج
const nameKeys = ['الاسم', 'اللقب', 'الاسم الكامل', 'name', 'student', 'اسم الطالب', 'Student Name'];

const matches = allRows.filter(row => {
  // بحث في عمودَي الاسم واللقب أولاً
  const firstName  = String(row['الاسم']  || '').toLowerCase();
  const lastName   = String(row['اللقب']  || '').toLowerCase();
  const fullName   = (firstName + ' ' + lastName).trim();
  if (firstName.includes(q) || lastName.includes(q) || fullName.includes(q)) return true;
  // fallback: بحث في أي حقل آخر
  return Object.values(row).some(v => String(v).toLowerCase().includes(q));
});

if (!matches.length) {
  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = `<div style="text-align:center;padding:14px;color:var(--text-muted);font-weight:700;font-size:13px;background:rgba(239,68,68,0.05);border-radius:10px;border:1px solid rgba(239,68,68,0.15)">❌ لم يُعثر على طالب بهذا الاسم في كلا الجدولين</div>`;
  return;
}

// عرض النتائج
resultsDiv.style.display = 'block';
resultsDiv.innerHTML = `<div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">🎯 ${matches.length} نتيجة — اختر الطالب:</div>`;

matches.slice(0, 8).forEach((row, idx) => {
  // ── استخلاص الاسم الكامل ──
  const firstName   = String(row['الاسم']  || '').trim();
  const lastName    = String(row['اللقب']  || '').trim();
  const studentName = [firstName, lastName].filter(Boolean).join(' ') || Object.values(row)[0] || '—';

  // ── الباقة ──
  const packKey = ['الباقة', 'نوع البرنامج', 'الباقة المختارة', 'pack', 'Package', 'plan'].find(k => row[k]);
  const pack = packKey ? String(row[packKey]).trim() : '';

  // ── اللغات ──
  const langsRaw = String(row['اللغات'] || row['اللغة المختارة'] || row['languages'] || '').trim();

  // ── مسار الإعلام الآلي ──
  const itTrack = String(row['مسار الإعلام الآلي'] || row['itTrack'] || '').trim();

  // ── المبلغ الإجمالي من الشيت مباشرة (العمود J) ──
  const sheetTotalRaw = String(row['المبلغ الإجمالي'] || '').trim();
  // نستخرج الرقم: "16,000 دج" → 16000
  const sheetTotalNum = parseFloat(sheetTotalRaw.replace(/[^\d.]/g, '')) || 0;

  // ── معلومات ولي الأمر ──
  const parentName  = String(row['اسم ولي الأمر'] || row['parentName'] || '').trim();
  const parentPhone = String(row['رقم هاتف ولي الأمر'] || row['رقم الهاتف'] || row['parentPhone'] || '').trim();
  const age         = String(row['العمر'] || row['age'] || '').trim();

  // ── حساب totalPrice: من الشيت أولاً، وإلا من جدول الأسعار ──
  const langCount  = langsRaw ? (langsRaw.split('+').length || 1) : 1;
  const totalPrice = sheetTotalNum > 0 ? sheetTotalNum : calcTotalPrice(pack, langCount);

  const card = document.createElement('div');
  card.style.cssText = 'padding:12px 14px;border-radius:12px;border:1px solid var(--border-2);background:white;cursor:pointer;transition:all 0.2s;margin-bottom:8px';
  card.onmouseenter = () => { card.style.borderColor = 'var(--primary)'; card.style.background = 'var(--primary-light)'; };
  card.onmouseleave = () => { card.style.borderColor = 'var(--border-2)'; card.style.background = 'white'; };
  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
      <div style="flex:1">
        <div style="font-size:14px;font-weight:800;color:var(--text)">${studentName}</div>
        ${pack ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">📦 ${pack}</div>` : ''}
        ${langsRaw ? `<div style="font-size:12px;color:var(--text-muted);margin-top:1px">🌍 ${langsRaw}</div>` : ''}
        ${itTrack ? `<div style="font-size:12px;color:var(--text-muted);margin-top:1px">💻 ${itTrack}</div>` : ''}
        ${parentPhone ? `<div style="font-size:12px;color:var(--text-muted);margin-top:1px">📞 ${parentPhone}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
          ${totalPrice > 0 ? `<span style="font-size:11px;padding:3px 8px;border-radius:99px;background:rgba(124,58,237,0.1);color:var(--primary);font-weight:800">💰 ${totalPrice.toLocaleString('ar-DZ')} دج</span>` : ''}
          ${sheetTotalRaw && sheetTotalRaw !== '—' && sheetTotalRaw !== 'غير محدد' ? `<span style="font-size:11px;padding:3px 8px;border-radius:99px;background:rgba(34,197,94,0.1);color:#059669;font-weight:800">✅ مبلغ الشيت</span>` : ''}
        </div>
      </div>
      <span style="font-size:10px;padding:2px 7px;border-radius:6px;background:rgba(124,58,237,0.08);color:var(--primary);font-weight:700;white-space:nowrap">${row._source}</span>
    </div>`;

  card.onclick = () => applyStudentData(
    studentName, pack, langCount, totalPrice, 0, totalPrice,
    row, firstName, lastName,
    langsRaw, itTrack, parentName, parentPhone, age, sheetTotalNum
  );
  resultsDiv.appendChild(card);
});

if (matches.length > 8) {
  const more = document.createElement('div');
  more.style.cssText = 'text-align:center;font-size:12px;color:var(--text-muted);font-weight:700;padding:6px';
  more.textContent = `+ ${matches.length - 8} نتيجة أخرى — دقّق اسم البحث`;
  resultsDiv.appendChild(more);
}
  } catch(e) {
resultsDiv.style.display = 'block';
resultsDiv.innerHTML = `<div style="padding:12px;color:var(--danger);font-weight:700;font-size:13px;background:var(--danger-soft);border-radius:10px">⚠️ خطأ في البحث: ${e.message}</div>`;
  } finally {
btn.disabled = false;
btn.textContent = '🔍 بحث';
  }
};

function applyStudentData(name, pack, langCount, totalPrice, paid, remaining, rawRow,
                      firstName, lastName,
                      langsRaw, itTrack, parentName, parentPhone, age, sheetTotalNum) {

  // ── 1. الاسم الكامل ──
  const fullName = firstName && lastName ? firstName + ' ' + lastName : name;
  document.getElementById('sc-name').value = fullName;

  // ── 2. الباقة ──
  const finalTotal = sheetTotalNum > 0 ? sheetTotalNum : totalPrice;

  if (pack) {
console.log('📦 قيمة الباقة من الشيت:', JSON.stringify(pack));
const sel = document.getElementById('sc-pack-select');

// دالة تنظيف للمقارنة: تزيل الأقواس والمسافات الزائدة وتوحّد الأرقام
const norm = s => String(s).trim()
  .replace(/[()（）\-–—]/g, ' ')
  .replace(/\s+/g, ' ')
  .toLowerCase();

const packNorm = norm(pack);
let found = false;

// 1) مطابقة كاملة
for (const opt of sel.options) {
  if (!opt.value) continue;
  if (opt.value === pack) { sel.value = opt.value; found = true; break; }
}
// 2) مطابقة بعد التنظيف
if (!found) {
  for (const opt of sel.options) {
    if (!opt.value) continue;
    if (norm(opt.value) === packNorm) { sel.value = opt.value; found = true; break; }
  }
}
// 3) مطابقة جزئية: الـ option موجود داخل قيمة الشيت
if (!found) {
  for (const opt of sel.options) {
    if (!opt.value) continue;
    if (packNorm.includes(norm(opt.value))) { sel.value = opt.value; found = true; break; }
  }
}

console.log(found ? '✅ تم تحديد الباقة: ' + sel.value : '❌ لم تُوجد الباقة في القائمة — تحقق من الكونسول');

// احفظ القيمة الكاملة (مع اللغات) في الحقل المخفي
document.getElementById('sc-pack').value = pack;
  }

  // ── 3. سعر الباقة الكامل ──
  if (finalTotal > 0) {
document.getElementById('sc-full-price').value = finalTotal;
document.getElementById('sc-paid-amount').value = finalTotal; // افتراضي: دفع الكل
document.getElementById('sc-amount').value = finalTotal;
calcRemaining();
  }

  // ── 4. ملاحظة اللغات ومسار IT في حقل الباقة إن لم تكن موجودة في القائمة ──
  const packField = document.getElementById('sc-pack');
  if (langsRaw || itTrack) {
const currentPack = packField.value || pack;
const extras = [langsRaw, itTrack].filter(Boolean).join(' | ');
if (extras && !currentPack.includes(langsRaw || '')) {
  packField.value = currentPack + (extras ? ' — ' + extras : '');
}
  }

  // ── 5. تاريخ اليوم كافتراضي (بدون تغيير ما هو محدد) ──
  // لا نغيّره — الأدمين يحدده يدوياً

  // ── 6. أغلق نتائج البحث ──
  document.getElementById('student-search-results').style.display = 'none';
  document.getElementById('student-search-inp').value = '';

  // ── 7. تمرير لأعلى نموذج التذكرة ──
  document.getElementById('sc-name').scrollIntoView({ behavior: 'smooth', block: 'center' });

  // ── 8. toast يلخص البيانات المُدخلة ──
  const parts = [`✅ ${fullName}`];
  if (pack) parts.push(`📦 ${pack}`);
  if (langsRaw) parts.push(`🌍 ${langsRaw}`);
  if (itTrack) parts.push(`💻 ${itTrack}`);
  if (parentPhone) parts.push(`📞 ${parentPhone}`);
  if (finalTotal > 0) parts.push(`💰 ${finalTotal.toLocaleString('ar-DZ')} دج`);
  showToast(parts.join('  '));
}

// ══ إدخال المبلغ يدوياً ══
let manualAmountMode = false;
window.toggleManualAmount = () => {
  manualAmountMode = !manualAmountMode;
  const btn = document.getElementById("manual-amount-btn");
  const note = document.getElementById("manual-amount-note");
  const inp = document.getElementById("sc-amount");
  if (manualAmountMode) {
btn.style.background = "var(--primary)";
btn.style.color = "white";
btn.style.borderStyle = "solid";
btn.textContent = "✏️ يدوي ✔";
note.style.display = "block";
inp.removeAttribute("readonly");
inp.focus();
inp.select();
showToast("✏️ وضع الإدخال اليدوي — اكتب المبلغ كما تريد");
  } else {
btn.style.background = "var(--primary-light)";
btn.style.color = "var(--primary)";
btn.style.borderStyle = "dashed";
btn.textContent = "✏️ يدوي";
note.style.display = "none";
  }
};

window.onAmountChange = () => {
  const paidField = document.getElementById("sc-paid-amount");
  if (!paidField.value) {
paidField.value = document.getElementById("sc-amount").value;
  }
  calcRemaining();
};

// ══ حاسبة المبلغ المتبقي ══
window.calcRemaining = () => {
  const full = parseFloat(document.getElementById("sc-full-price").value) || 0;
  const paid = parseFloat(document.getElementById("sc-paid-amount").value) || 0;
  const resultBox = document.getElementById("remaining-result");
  if (!full && !paid) { resultBox.style.display = "none"; return; }
  resultBox.style.display = "block";
  const remaining = full - paid;
  const remVal = document.getElementById("remaining-value");
  const remNote = document.getElementById("remaining-note");
  const applyBtn = document.getElementById("apply-remaining-btn");
  if (remaining > 0) {
remVal.textContent = remaining.toLocaleString("ar-DZ") + " دج";
remVal.style.color = "var(--danger)";
remNote.textContent = "دفع " + paid.toLocaleString("ar-DZ") + " دج من أصل " + full.toLocaleString("ar-DZ") + " دج";
applyBtn.style.display = "block";
  } else if (remaining === 0) {
remVal.textContent = "✅ المبلغ مكتمل";
remVal.style.color = "var(--success)";
remNote.textContent = "دُفع كامل مبلغ " + full.toLocaleString("ar-DZ") + " دج";
applyBtn.style.display = "none";
  } else {
remVal.textContent = "⚠️ المبلغ المدفوع أكبر من سعر الباقة";
remVal.style.color = "var(--warning)";
remNote.textContent = "فرق: " + Math.abs(remaining).toLocaleString("ar-DZ") + " دج";
applyBtn.style.display = "none";
  }
};

window.applyRemainingToTicket = () => {
  const full = parseFloat(document.getElementById("sc-full-price").value) || 0;
  const paid = parseFloat(document.getElementById("sc-paid-amount").value) || 0;
  if (paid <= 0) return;
  document.getElementById("sc-amount").value = paid;
  const remaining = full - paid;
  showToast("✅ تم تسجيل " + paid.toLocaleString("ar-DZ") + " دج — المتبقي: " + remaining.toLocaleString("ar-DZ") + " دج");
};

let currentReceipt = null;

function generateReceiptNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SP-${y}${m}${d}-${rand}`;
}

window.generateTicket = async () => {
  const name = document.getElementById('sc-name').value.trim();
  const pack = document.getElementById('sc-pack').value;
  const amount = document.getElementById('sc-amount').value;
  const dateRaw = document.getElementById('sc-date').value;
  const status = document.getElementById('sc-status').value;
  if (!name || !pack || !amount) { showToast('يرجى ملء الحقول الإلزامية', true); return; }
  const btn = document.getElementById('sc-gen-btn');
  btn.disabled = true; btn.textContent = '⏳ جاري التوليد...';
  const receipt = generateReceiptNumber();
  currentReceipt = receipt;
  const verifyURL = `https://e-plus-center.pages.dev/verify.html?r=${receipt}`;
  const dateFormatted = dateRaw ? new Date(dateRaw).toLocaleDateString('ar-DZ',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : '—';
  const qrContainer = document.getElementById('qr-gen-hidden');
  qrContainer.innerHTML = '';
  new QRCode(qrContainer, { text: verifyURL, width: 200, height: 200, colorDark:'#000000', colorLight:'#ffffff', correctLevel: QRCode.CorrectLevel.H });
  setTimeout(async () => {
const qrCanvas = qrContainer.querySelector('canvas');
try {
  const fullPrice = parseFloat(document.getElementById('sc-full-price').value) || 0;
  const paidCalc = parseFloat(document.getElementById('sc-paid-amount').value) || 0;
  const remainingAmount = fullPrice > 0 ? Math.max(0, fullPrice - paidCalc) : 0;
  await addDoc(collection(db,'summerTickets'), { name, pack, amount: Number(amount), fullPrice: fullPrice || Number(amount), remainingAmount, date: dateRaw, status, receipt, verifyURL, createdAt: serverTimestamp() });
  drawTicketOnCanvas({ name, pack, amount, dateRaw, dateFormatted, status, receipt, remainingAmount }, qrCanvas, btn, verifyURL);
} catch(e) { showToast('خطأ في الحفظ: ' + e.message, true); btn.disabled = false; btn.textContent = '🎟️ توليد التذكرة وحفظها'; }
  }, 400);
};

function drawTicketOnCanvas(data, qrCanvas, btn, verifyURL) {
  const canvas = document.getElementById('ticket-canvas');
  // Actual ticket image: 2480 × 1063 px
  const W = 2480, H = 1063;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const img = new Image();
  img.src = 'images/ticketsummerplus.png';
  img.onload = () => {
ctx.drawImage(img, 0, 0, W, H);

// ═══════════════════════════════════════════════════════
// PIXEL-PERFECT COORDINATES — measured by scanning the
// original blank ticket image (2480×1063) for label text
//
// Label bands (from dark-pixel scan):
//   الاسم الكامل  : y = 359–382   → value baseline = 424
//   اسم الباقة    : y = 441–468   → value baseline = 510
//   المبلغ         : y = 533–557   → value baseline = 599
//   التاريخ        : y = 624–650   → value baseline = 692
//   رقم الوصل     : y = 697–730   → value baseline = 772
//
// Right anchor (text right-edge): x = 2440
// Panel left edge: x = 1850
// Value font: 28px (fits the ~42px slot between labels)
//
// QR zone (free area between dashed line & labels):
//   x = 1665 → 2045  (380px wide)
//   y = 390  → 770   (380px tall)
// ═══════════════════════════════════════════════════════

const R   = 2440;        // right anchor
const CLR = '#0D2080';   // dark navy

ctx.textAlign = 'right';
ctx.direction = 'rtl';
ctx.fillStyle = CLR;

// ── helper: draw value text, clipped to right panel ──
const val = (txt, baseline, font) => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(1852, baseline - 32, 592, 40);   // clip to value slot
  ctx.clip();
  ctx.font = font || 'bold 28px Tajawal, Arial';
  ctx.fillStyle = CLR;
  ctx.fillText(txt || '—', R, baseline);
  ctx.restore();
};

val(data.name,                                                  424);
val(data.pack,                                                  510);
val(Number(data.amount || 0).toLocaleString('ar-DZ') + ' دج', 599);
val(data.dateFormatted || '—',                                  692);
val(data.receipt || '—',                                        772, 'bold 26px monospace');

// ── المبلغ المتبقي ──
// إحداثيات من Photoshop Info: X=2140, Y=600
const remainingAmtDraw = data.remainingAmount !== undefined
  ? data.remainingAmount
  : (() => {
      const full = parseFloat(document.getElementById('sc-full-price').value) || 0;
      const paid = parseFloat(document.getElementById('sc-paid-amount').value) || 0;
      return full > 0 ? Math.max(0, full - paid) : 0;
    })();

// نص المبلغ المتبقي: إذا كان 0 نكتب "0 دج"، وإذا كان موجود نكتب القيمة
const remainingTxt = remainingAmtDraw > 0
  ? Number(remainingAmtDraw).toLocaleString('ar-DZ') + ' دج'
  : '0 دج';

ctx.save();
ctx.font = 'bold 28px Tajawal, Arial';
ctx.fillStyle = remainingAmtDraw > 0 ? '#DC2626' : CLR;
ctx.textAlign = 'right';
ctx.direction = 'rtl';
ctx.beginPath();
// إحداثيات من Photoshop: X=2147, Y=579 — W=206, H=48
// منطقة الكتابة: من x=1942 إلى x=2147، baseline = Y+H = 627
ctx.rect(1942, 579, 206, 48);
ctx.clip();
ctx.fillText(remainingTxt, 2147, 620);
ctx.restore();

// ── QR code ──────────────────────────────────────────
// Exact position from Photoshop Info panel: X=2007, Y=846
if (qrCanvas) {
  const qrSize = 180;
  const qrX = 2007 - qrSize / 2;  // centered on X=2007 → 1917
  const qrY = 846;                  // starts at Y=846
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 10);
  ctx.fill();
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
}

document.getElementById('ticket-empty').style.display = 'none';
document.getElementById('ticket-canvas-wrap').style.display = 'block';
if (btn) { btn.disabled = false; btn.textContent = '🎟️ توليد التذكرة وحفظها'; }
showToast('🎉 تم توليد التذكرة وحفظها بنجاح!');
  };

  img.onerror = () => {
const grad = ctx.createLinearGradient(0,0,W,H);
grad.addColorStop(0,'#1a0533'); grad.addColorStop(1,'#0f1a3d');
ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'right';
ctx.fillText('⚠️ صورة التذكرة غير موجودة', W-60, 120);
ctx.fillText('images/ticketsummerplus.jpg', W-60, 180);
ctx.fillStyle = '#A78BFA'; ctx.font = 'bold 50px Arial';
ctx.fillText(data.name, W-60, 300);
if (qrCanvas) ctx.drawImage(qrCanvas, 60, 200, 300, 300);
document.getElementById('ticket-empty').style.display = 'none';
document.getElementById('ticket-canvas-wrap').style.display = 'block';
if (btn) { btn.disabled = false; btn.textContent = '🎟️ توليد التذكرة وحفظها'; }
showToast('⚠️ صورة التذكرة غير موجودة', true);
  };
}

window.downloadTicket = () => {
  const canvas = document.getElementById('ticket-canvas');
  const link = document.createElement('a');
  link.download = `ticket-${currentReceipt || 'eplus'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

window.printTicketCanvas = () => {
  const canvas = document.getElementById('ticket-canvas');
  const dataURL = canvas.toDataURL('image/png');
  ['print-img-1','print-img-2','print-img-3'].forEach(id => document.getElementById(id).src = dataURL);
  document.getElementById('print-area').style.display = 'flex';
  window.print();
  setTimeout(() => document.getElementById('print-area').style.display = 'none', 1000);
};

window.copyReceiptNum = () => {
  if (currentReceipt) { navigator.clipboard.writeText(currentReceipt).then(() => showToast('📋 تم نسخ رقم الوصل: ' + currentReceipt)); }
};

// store tickets globally for export
let allTicketsData = [];
let _ticketsSearchVal = '';

// ─── بناء صفوف جدول التذاكر ───
function renderTicketRows(data) {
  const tbody = document.getElementById('tickets-tbody');
  if (!tbody) return;
  const norm = s => String(s || '').trim().toLowerCase();
  const q = norm(_ticketsSearchVal);
  const filtered = q
? data.filter(x => norm(x.receipt).includes(q) || norm(x.name).includes(q))
: data;

  tbody.innerHTML = '';
  if (!filtered.length) {
tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">${q ? '🔍 لا توجد نتائج مطابقة' : '📭 لم يتم إصدار أي تذاكر بعد'}</td></tr>`;
return;
  }
  filtered.forEach(x => {
const remaining  = Number(x.remainingAmount || 0);
const dateStr    = x.date ? new Date(x.date).toLocaleDateString('ar-DZ') : '—';
const statusHtml = x.status === 'paid'
  ? '<span class="status-paid">✅ مفعّلة</span>'
  : '<span class="status-pending">⏳ قيد المراجعة</span>';
const tr = document.createElement('tr');
tr.innerHTML = `
  <td><span class="receipt-code">${x.receipt || '—'}</span></td>
  <td style="font-weight:700;color:var(--text)">${x.name || '—'}</td>
  <td><span class="pack-chip">${x.pack || '—'}</span></td>
  <td><span class="amount-badge">${Number(x.amount || 0).toLocaleString('ar-DZ')} دج</span></td>
  <td>${remaining > 0
    ? `<span style="font-size:12px;font-weight:800;padding:4px 10px;border-radius:99px;background:rgba(239,68,68,0.1);color:#DC2626">${Number(remaining).toLocaleString('ar-DZ')} دج</span>`
    : '<span style="font-size:12px;font-weight:800;padding:4px 10px;border-radius:99px;background:rgba(16,185,129,0.1);color:#059669">✅ مكتمل</span>'}</td>
  <td style="color:var(--text-muted)">${dateStr}</td>
  <td>${statusHtml}</td>
  <td style="display:flex;gap:6px">
    <button class="tbl-action view" onclick="previewFromDB('${x.id}')">👁️ عرض</button>
    <button class="tbl-action del" onclick="deleteTicket('${x.id}')">🗑️</button>
  </td>`;
tbody.appendChild(tr);
  });
}

// ─── فلترة الجدول عند الكتابة ───
window.filterTicketsTable = (val) => {
  _ticketsSearchVal = val;
  renderTicketRows(allTicketsData);
};

let _unsubTickets = null;

function loadTickets() {
  // إلغاء الاشتراك السابق إن وُجد
  if (_unsubTickets) { _unsubTickets(); _unsubTickets = null; }
  let paid = 0, pending = 0;
  _unsubTickets = onSnapshot(query(collection(db,'summerTickets'), orderBy('createdAt','desc')), snap => {
paid = 0; pending = 0;
allTicketsData = [];
let totalExpected = 0, totalCollected = 0, totalRemaining = 0;
let studentsWithRemaining = 0;

// تحديث allTicketsData دائماً (للأستاذ والأدمين)
snap.forEach(d => {
  const x = d.data();
  allTicketsData.push({ id: d.id, ...x });
});
// إعادة رسم قائمة الحضور إذا كانت مفتوحة
refreshAttendanceListIfOpen();

// باقي التحديثات للأدمين فقط — إذا ما كان الـ DOM موجود نتوقف
const tbody = document.getElementById('tickets-tbody');
if (!tbody) return;

if (snap.empty) {
  renderTicketRows([]);
  updateSummerStats(0,0,0);
  updateFinancialStats(0,0,0,0,0,0);
  return;
}
snap.forEach(d => {
  const x = d.data();
  if (x.status === 'paid') paid++; else pending++;

  const amountPaid    = Number(x.amount || 0);
  const remaining     = Number(x.remainingAmount || 0);
  const fullPrice     = Number(x.fullPrice || 0);
  const expectedTotal = fullPrice > 0 ? fullPrice : (amountPaid + remaining);

  totalExpected   += expectedTotal;
  totalCollected  += amountPaid;
  totalRemaining  += remaining;
  if (remaining > 0) studentsWithRemaining++;
});
renderTicketRows(allTicketsData);
updateSummerStats(snap.size, paid, pending);
updateFinancialStats(snap.size, paid, studentsWithRemaining, totalExpected, totalCollected, totalRemaining);
document.getElementById('nav-badge-summer').textContent = snap.size;
// إعادة رسم قائمة الحضور إذا كانت مفتوحة — حتى تنعكس أي تغييرات في حالة التذاكر فوراً
refreshAttendanceListIfOpen();
  });
}

/* ══════════════════════════════════════════════════
   FINANCIAL ENGINE — نظام الحسابات المالية الكامل
══════════════════════════════════════════════════ */

let _finActivePeriod = 'weekly';   // الفترة المختارة في Hero
let _chartActiveView = 'weekly';   // عرض المخطط

/* ── دالة مساعدة: حدود الفترة ── */
function getDateBounds(period) {
  const now = new Date();
  if (period === 'weekly') {
const start = new Date(now);
start.setDate(now.getDate() - now.getDay()); // بداية الأسبوع (الأحد)
start.setHours(0, 0, 0, 0);
return start;
  }
  if (period === 'monthly') {
return new Date(now.getFullYear(), now.getMonth(), 1); // بداية الشهر
  }
  return new Date(0); // الكل
}

/* ── حساب إجماليات لفترة معينة ── */
function calcPeriodTotals(data, since) {
  let collected = 0, expected = 0, remaining = 0, count = 0;
  data.forEach(x => {
const d = x.date ? new Date(x.date) : null;
if (!d || d < since) return;
const amountPaid  = Number(x.amount || 0);
const rem         = Number(x.remainingAmount || 0);
const fp          = Number(x.fullPrice || 0);
const exp         = fp > 0 ? fp : (amountPaid + rem);
collected += amountPaid;
expected  += exp;
remaining += rem;
count++;
  });
  return { collected, expected, remaining, count };
}

/* ── تحديث Hero Period Display ── */
function updateHeroDisplay(period) {
  const fmt = n => Number(n).toLocaleString('ar-DZ');
  const since = getDateBounds(period);
  const t = calcPeriodTotals(allTicketsData, since);
  const labels = { weekly:'المدخول هذا الأسبوع', monthly:'المدخول هذا الشهر', all:'الإجمالي الكلي' };
  document.getElementById('fin-period-label').textContent  = labels[period] || '—';
  document.getElementById('fin-period-amount').textContent = fmt(t.collected) + ' دج';
  document.getElementById('fin-period-count').textContent  = t.count + ' تسجيل';
}

/* ── مفتاح الفترة في Hero ── */
window.finSwitchPeriod = btn => {
  document.querySelectorAll('.fin-pp-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _finActivePeriod = btn.dataset.period;
  updateHeroDisplay(_finActivePeriod);
};

/* ── مفتاح المخطط ── */
window.finSwitchChart = btn => {
  document.querySelectorAll('.fin-ct').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _chartActiveView = btn.dataset.view;
  renderFinancialChart(_chartActiveView);
};

/* ═══════════════════════════════════════
   updateFinancialStats — الدالة الرئيسية
═══════════════════════════════════════ */
function updateFinancialStats(total, paidCount, withRemaining, totalExpected, totalCollected, totalRemaining) {
  const fmt = n => Number(n).toLocaleString('ar-DZ');
  const pct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  /* ── Hero (الإجمالي الكلي دائماً) ── */
  document.getElementById('fc-collected-amount').textContent = fmt(totalCollected) + ' دج';
  document.getElementById('fin-hero-pct-val').textContent    = pct + '%';
  document.getElementById('fin-hero-paid-count').textContent = paidCount + ' دفعة مكتملة';

  /* ── KPI Cards — الأرقام الكلية ── */
  document.getElementById('fc-total-amount').textContent         = fmt(totalExpected) + ' دج';
  document.getElementById('fc-total-count').textContent          = total + ' طالب';
  document.getElementById('fc-collected-amount-kpi').textContent = fmt(totalCollected) + ' دج';
  document.getElementById('fc-paid-count').textContent           = paidCount + ' دفعة مكتملة';
  document.getElementById('fc-collected-sub').textContent        = '📈 ' + pct + '% من الإجمالي';
  document.getElementById('fc-remaining-amount').textContent     = fmt(totalRemaining) + ' دج';
  document.getElementById('fc-remaining-count').textContent      = withRemaining + ' طالب لم يكمل';
  document.getElementById('fc-remaining-sub').textContent        = '⚠️ ' + (100 - pct) + '% من الإجمالي';

  /* ── حساب الأسبوعي والشهري لكل KPI ── */
  const weekSince  = getDateBounds('weekly');
  const monthSince = getDateBounds('monthly');
  const wk = calcPeriodTotals(allTicketsData, weekSince);
  const mn = calcPeriodTotals(allTicketsData, monthSince);

  // إجمالي
  document.getElementById('fin-week-total').textContent  = fmt(wk.expected)   + ' دج';
  document.getElementById('fin-month-total').textContent = fmt(mn.expected)   + ' دج';
  // محصّل
  document.getElementById('fin-week-collected').textContent  = fmt(wk.collected)  + ' دج';
  document.getElementById('fin-month-collected').textContent = fmt(mn.collected)  + ' دج';
  // متبقي
  document.getElementById('fin-week-remaining').textContent  = fmt(wk.remaining)  + ' دج';
  document.getElementById('fin-month-remaining').textContent = fmt(mn.remaining)  + ' دج';

  /* ── Hero period display ── */
  updateHeroDisplay(_finActivePeriod);

  /* ── Progress bar ── */
  document.getElementById('fc-pct').textContent = pct + '%';
  const fill  = document.getElementById('progress-fill');
  const track = document.getElementById('progress-track');
  fill.style.width = pct + '%';
  track.classList.toggle('progress-danger', pct < 50);
  document.getElementById('progress-mid-label').textContent   = fmt(Math.round(totalExpected / 2)) + ' دج';
  document.getElementById('progress-total-label').textContent = fmt(totalExpected) + ' دج';

  /* ── رسم المخطط ── */
  renderFinancialChart(_chartActiveView);
}

/* ═══════════════════════════════════════════
   renderFinancialChart — مخطط SVG احترافي
═══════════════════════════════════════════ */
function renderFinancialChart(view) {
  const svg = document.getElementById('fin-chart-svg');
  if (!svg || !allTicketsData.length) {
if (svg) svg.innerHTML = `<text x="350" y="90" text-anchor="middle" font-size="13" fill="#B8B4D8" font-family="Tajawal">لا توجد بيانات كافية للعرض</text>`;
return;
  }

  const W = 700, H = 180;
  const pad = { t: 18, r: 10, b: 32, l: 42 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;

  /* ── بناء buckets ── */
  const now  = new Date();
  let buckets = [], labels = [];

  if (view === 'weekly') {
const dayAr = ['أحد','اثن','ثلث','أرب','خمس','جمع','سبت'];
for (let i = 6; i >= 0; i--) {
  const d  = new Date(now); d.setDate(now.getDate() - i); d.setHours(0,0,0,0);
  const d2 = new Date(d); d2.setHours(23,59,59,999);
  let col=0, exp=0, rem=0;
  allTicketsData.forEach(x => {
    const xd = x.date ? new Date(x.date) : null;
    if (!xd || xd < d || xd > d2) return;
    const a = Number(x.amount||0), r = Number(x.remainingAmount||0), fp = Number(x.fullPrice||0);
    col += a; rem += r; exp += fp>0?fp:(a+r);
  });
  buckets.push({ col, exp, rem });
  labels.push(dayAr[d.getDay()]);
}
  } else {
const mAr = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
for (let i = 5; i >= 0; i--) {
  const ms  = new Date(now.getFullYear(), now.getMonth()-i, 1);
  const me  = new Date(now.getFullYear(), now.getMonth()-i+1, 0, 23, 59, 59);
  let col=0, exp=0, rem=0;
  allTicketsData.forEach(x => {
    const xd = x.date ? new Date(x.date) : null;
    if (!xd || xd < ms || xd > me) return;
    const a = Number(x.amount||0), r = Number(x.remainingAmount||0), fp = Number(x.fullPrice||0);
    col += a; rem += r; exp += fp>0?fp:(a+r);
  });
  buckets.push({ col, exp, rem });
  labels.push(mAr[ms.getMonth()]);
}
  }

  const n = buckets.length;
  const maxVal = Math.max(...buckets.map(b => Math.max(b.col, b.exp)), 1);
  const sy = v => pad.t + cH - (v / maxVal) * cH;
  const sx = i => pad.l + (n > 1 ? (i / (n-1)) * cW : cW/2);
  const fmtK = v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? Math.round(v/1000)+'K' : v;

  /* paths */
  const pathCol = buckets.map((b,i) => `${i===0?'M':'L'}${sx(i).toFixed(1)},${sy(b.col).toFixed(1)}`).join(' ');
  const pathExp = buckets.map((b,i) => `${i===0?'M':'L'}${sx(i).toFixed(1)},${sy(b.exp).toFixed(1)}`).join(' ');
  const areaCol = pathCol + ` L${sx(n-1).toFixed(1)},${(pad.t+cH).toFixed(1)} L${sx(0).toFixed(1)},${(pad.t+cH).toFixed(1)} Z`;
  const areaExp = pathExp + ` L${sx(n-1).toFixed(1)},${(pad.t+cH).toFixed(1)} L${sx(0).toFixed(1)},${(pad.t+cH).toFixed(1)} Z`;

  /* grid lines */
  const gridLines = [0.25, 0.5, 0.75, 1].map(f => {
const y = sy(maxVal*f).toFixed(1);
return `<line x1="${pad.l}" y1="${y}" x2="${W-pad.r}" y2="${y}" stroke="#F0EEFF" stroke-width="1"/>
        <text x="${pad.l-4}" y="${parseFloat(y)+4}" text-anchor="end" font-size="9" fill="#C4C0E8" font-family="Tajawal">${fmtK(Math.round(maxVal*f))}</text>`;
  }).join('');

  /* bar chart for individual buckets */
  const barW = Math.max(8, (cW / n) * 0.45);
  const bars = buckets.map((b,i) => {
const x = sx(i) - barW/2;
const barH = b.col > 0 ? (b.col/maxVal)*cH : 0;
const y = pad.t + cH - barH;
return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}"
          rx="3" fill="url(#barGrad)" opacity="0.6"/>`;
  }).join('');

  /* dots with tooltip triggers */
  const dots = buckets.map((b,i) => {
const cx = sx(i).toFixed(1), cy = sy(b.col).toFixed(1);
const tip = `${labels[i]} — محصّل: ${Number(b.col).toLocaleString('ar-DZ')} دج / متوقع: ${Number(b.exp).toLocaleString('ar-DZ')} دج`;
return `<circle cx="${cx}" cy="${cy}" r="5" fill="#7C3AED" stroke="#fff" stroke-width="2"
          style="cursor:pointer"
          onmouseenter="showFinTip(event,'${tip}',${cx},${cy})"
          onmouseleave="hideFinTip()"/>`;
  }).join('');

  /* x labels */
  const xlabels = labels.map((l,i) =>
`<text x="${sx(i).toFixed(1)}" y="${(H-6).toFixed(1)}" text-anchor="middle" font-size="10" fill="#8B87B8" font-family="Tajawal">${l}</text>`
  ).join('');

  /* render */
  svg.innerHTML = `
<defs>
  <linearGradient id="gradCol" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.22"/>
    <stop offset="100%" stop-color="#7C3AED" stop-opacity="0.01"/>
  </linearGradient>
  <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#DDD6FE" stop-opacity="0.5"/>
    <stop offset="100%" stop-color="#DDD6FE" stop-opacity="0.01"/>
  </linearGradient>
  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#7C3AED"/>
    <stop offset="100%" stop-color="#A78BFA"/>
  </linearGradient>
</defs>
${gridLines}
${bars}
<path d="${areaExp}" fill="url(#gradExp)"/>
<path d="${pathExp}" fill="none" stroke="#DDD6FE" stroke-width="1.8" stroke-dasharray="5,4"/>
<path d="${areaCol}" fill="url(#gradCol)"/>
<path d="${pathCol}" fill="none" stroke="#7C3AED" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
${dots}
${xlabels}
  `;
}

/* ── Tooltip helpers ── */
window.showFinTip = (e, text, cx, cy) => {
  const tip  = document.getElementById('fin-tooltip');
  const wrap = document.getElementById('fin-chart-svg');
  if (!tip || !wrap) return;
  const rect  = wrap.getBoundingClientRect();
  const scaleX = rect.width  / 700;
  const scaleY = rect.height / 180;
  tip.textContent = text;
  tip.style.left    = (cx * scaleX) + 'px';
  tip.style.top     = (cy * scaleY - 12) + 'px';
  tip.style.opacity = '1';
};
window.hideFinTip = () => {
  const t = document.getElementById('fin-tooltip');
  if (t) t.style.opacity = '0';
};

window.exportFinancialReport = () => {
  if (!allTicketsData.length) { showToast('⚠️ لا توجد بيانات للتصدير', true); return; }
  const rows = [['رقم الوصل','الاسم الكامل','الباقة','المدفوع (دج)','المتبقي (دج)','السعر الكامل (دج)','التاريخ','الحالة']];
  allTicketsData.forEach(x => {
rows.push([
  x.receipt || '',
  x.name || '',
  x.pack || '',
  Number(x.amount || 0),
  Number(x.remainingAmount || 0),
  Number(x.fullPrice || (Number(x.amount||0) + Number(x.remainingAmount||0))),
  x.date ? new Date(x.date).toLocaleDateString('ar-DZ') : '',
  x.status === 'paid' ? 'مفعّلة' : 'قيد المراجعة'
]);
  });
  // add summary rows
  const totalExp = allTicketsData.reduce((s,x)=>{const fp=Number(x.fullPrice||0);return s+(fp>0?fp:(Number(x.amount||0)+Number(x.remainingAmount||0)));},0);
  const totalCol = allTicketsData.reduce((s,x)=>s+Number(x.amount||0),0);
  const totalRem = allTicketsData.reduce((s,x)=>s+Number(x.remainingAmount||0),0);
  rows.push([]);
  rows.push(['الإجمالي','','',totalCol,totalRem,totalExp,'','']);

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const bom = '\uFEFF'; // UTF-8 BOM for Arabic
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `تقرير-المخيم-الصيفي-${new Date().toLocaleDateString('ar-DZ').replace(/\//g,'-')}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast('📥 تم تصدير التقرير بنجاح');
};

function updateSummerStats(total, paid, pending) {
  document.getElementById('sc-count').textContent  = total;
  document.getElementById('sc-paid').textContent    = paid;
  document.getElementById('sc-pending').textContent = pending;
}

window.deleteTicket = async (id) => {
  if (!confirm('⚠️ حذف هذه التذكرة نهائياً؟')) return;
  try { await deleteDoc(doc(db,'summerTickets',id)); showToast('🗑️ تم حذف التذكرة'); } catch(e) { showToast('خطأ: ' + e.message, true); }
};

window.previewFromDB = async (id) => {
  try {
const snap = await getDoc(doc(db,'summerTickets',id));
if (!snap.exists()) return;
const x = snap.data();
switchNavSection('summer');
document.getElementById('sc-name').value   = x.name   || '';
document.getElementById('sc-pack').value   = x.pack   || '';
document.getElementById('sc-amount').value = x.amount || '';
document.getElementById('sc-date').value   = x.date   || '';
document.getElementById('sc-status').value = x.status || 'paid';
// تحميل بيانات الحاسبة إن وجدت
if (x.fullPrice) document.getElementById('sc-full-price').value = x.fullPrice;
if (x.remainingAmount !== undefined) {
  document.getElementById('sc-paid-amount').value = x.amount || '';
  calcRemaining();
}
// Show pack info in program UI
if (x.pack) {
  document.getElementById('program-group').style.display = 'none';
  document.getElementById('category-group').style.display = 'block';
  document.querySelector('#category-group label').textContent = '✅ الباقة المختارة: ' + x.pack;
}
currentReceipt = x.receipt;
const btn = document.getElementById('sc-gen-btn');
btn.disabled = true; btn.textContent = '⏳ جاري عرض التذكرة...';
const qrContainer = document.getElementById('qr-gen-hidden');
qrContainer.innerHTML = '';
new QRCode(qrContainer, { text: x.verifyURL || `https://e-plus-center.pages.dev/verify.html?r=${x.receipt}`, width: 200, height: 200, colorDark:'#000000', colorLight:'#ffffff', correctLevel: QRCode.CorrectLevel.H });
setTimeout(() => {
  const qrCanvas = qrContainer.querySelector('canvas');
  const dateFormatted = x.date ? new Date(x.date).toLocaleDateString('ar-DZ',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : '—';
  drawTicketOnCanvas({ name: x.name, pack: x.pack, amount: x.amount, dateRaw: x.date, dateFormatted, status: x.status, receipt: x.receipt, remainingAmount: x.remainingAmount }, qrCanvas, btn, x.verifyURL);
  document.getElementById('ticket-canvas').scrollIntoView({ behavior:'smooth', block:'start' });
}, 400);
  } catch(e) { showToast('خطأ في عرض التذكرة: ' + e.message, true); }
};

// ══════════════════════════════════════════════════════════════
// TEACHERS & ATTENDANCE SYSTEM
// ══════════════════════════════════════════════════════════════

const AR_DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
let allTeachers = [];
let currentTeacherData = null;
let currentAttTeacherId = null;
let currentAttStudents = [];
let newTeacherPhotoBase64 = null;
let editTeacherPhotoBase64 = null;

// ─── Add teacher modal ───
window.openAddTeacherModal = () => {
  document.getElementById('add-teacher-modal').classList.add('open');
};
window.closeAddTeacherModal = () => {
  document.getElementById('add-teacher-modal').classList.remove('open');
};

// ─── Day picker toggle ───
document.getElementById('t-days-picker').addEventListener('click', e => {
  const btn = e.target.closest('.day-pick-btn');
  if (btn) btn.classList.toggle('selected');
});
document.getElementById('edit-days-picker').addEventListener('click', e => {
  const btn = e.target.closest('.day-pick-btn');
  if (btn) btn.classList.toggle('selected');
});

function getSelectedDays(pickerId) {
  return [...document.querySelectorAll(`#${pickerId} .day-pick-btn.selected`)].map(b => b.dataset.day);
}
function setSelectedDays(pickerId, days) {
  document.querySelectorAll(`#${pickerId} .day-pick-btn`).forEach(b => {
b.classList.toggle('selected', days.includes(b.dataset.day));
  });
}

// ─── Teacher photo handling ───
window.onTeacherPhotoChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
newTeacherPhotoBase64 = ev.target.result;
const prev = document.getElementById('teacher-photo-preview');
prev.src = newTeacherPhotoBase64; prev.style.display = 'block';
  };
  reader.readAsDataURL(file);
};
window.onEditPhotoChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
editTeacherPhotoBase64 = ev.target.result;
const prev = document.getElementById('edit-photo-preview');
prev.src = editTeacherPhotoBase64; prev.style.display = 'block';
  };
  reader.readAsDataURL(file);
};

// ─── Generate teacher ID ───
function genTeacherId() {
  return 'T-' + Date.now().toString(36).toUpperCase().slice(-5);
}
function genStudentId(teacherId, idx) {
  return teacherId + '-S' + String(idx + 1).padStart(3, '0');
}

// ─── Add teacher (admin creates Firebase Auth account + Firestore doc) ───
// ⚠️ نستخدم secondaryAuth لإنشاء الحساب حتى لا تتغير جلسة الأدمين الحالية
window.addTeacher = async () => {
  const name = document.getElementById('t-name').value.trim();
  const email = document.getElementById('t-email').value.trim();
  const pass = document.getElementById('t-password').value;
  const spec = document.getElementById('t-spec').value.trim();
  const levels = document.getElementById('t-levels').value.trim();
  const days = getSelectedDays('t-days-picker');
  if (!name || !email || !pass || !spec || !days.length) {
showToast('❌ يرجى ملء جميع الحقول واختيار يوم واحد على الأقل', true); return;
  }
  if (pass.length < 6) { showToast('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل', true); return; }
  const btn = document.getElementById('add-teacher-btn');
  btn.disabled = true; btn.textContent = '⏳ جاري الإنشاء...';
  try {
// إنشاء حساب Firebase Auth عبر الـ app الثاني — جلسة الأدمين لا تتأثر ✅
const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
const uid = cred.user.uid;
// تسجيل خروج الـ secondary auth حالاً لتنظيفه
await signOut(secondaryAuth);
const teacherId = genTeacherId();
const payload = {
  name, email, spec, levels, days,
  teacherId, uid,
  photo: newTeacherPhotoBase64 || null,
  createdAt: serverTimestamp()
};
await setDoc(doc(db, 'teachers', uid), payload);
await addLog('➕ أستاذ جديد', `تم إنشاء حساب للأستاذ ${name} (${teacherId})`, '👨‍🏫');
showToast(`✅ تم إنشاء حساب الأستاذ ${name} بنجاح! — يمكنه الدخول الآن بالبريد وكلمة المرور`);
// إعادة ضبط النموذج
document.getElementById('t-name').value = '';
document.getElementById('t-email').value = '';
document.getElementById('t-password').value = '';
document.getElementById('t-spec').value = '';
document.getElementById('t-levels').value = '';
setSelectedDays('t-days-picker', []);
newTeacherPhotoBase64 = null;
document.getElementById('teacher-photo-preview').style.display = 'none';
document.getElementById('teacher-photo-input').value = '';
// إغلاق الـ modal
closeAddTeacherModal();
  } catch(e) {
let msg = e.message;
if (e.code === 'auth/email-already-in-use') msg = 'البريد الإلكتروني مستخدم بالفعل';
else if (e.code === 'auth/invalid-email') msg = 'البريد الإلكتروني غير صالح';
else if (e.code === 'auth/weak-password') msg = 'كلمة المرور ضعيفة جداً';
showToast('❌ ' + msg, true);
  }
  btn.disabled = false; btn.textContent = '👨‍🏫 إنشاء حساب الأستاذ';
};

// ─── Load teachers list ───
function loadTeachers() {
  // الأساتذة لا يحملون قائمة بقية الأساتذة
  if (isTeacherMode) return;
  onSnapshot(query(collection(db, 'teachers'), orderBy('createdAt', 'desc')), async snap => {
allTeachers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
document.getElementById('nav-badge-teachers').textContent = allTeachers.length;
document.getElementById('t-stat-total').textContent = allTeachers.length;
// Count total students
let totalStudents = 0;
allTeachers.forEach(t => { totalStudents += (t.students || []).length; });
document.getElementById('t-stat-students').textContent = totalStudents;
// Today's label
const todayName = AR_DAYS[new Date().getDay()];
const todayCount = allTeachers.filter(t => (t.days || []).includes(todayName)).length;
document.getElementById('t-stat-today').textContent = todayCount;
document.getElementById('t-today-label').textContent = `📅 اليوم: ${todayName} — ${todayCount} أستاذ`;
renderTeachersGrid(allTeachers);
  });
}

// ─── Render teachers grid ───
function renderTeachersGrid(teachers) {
  const grid = document.getElementById('teachers-grid');
  if (!teachers.length) {
grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:48px;opacity:0.3;margin-bottom:10px">👨‍🏫</div><div style="font-weight:700">لا يوجد أساتذة بعد</div></div>`;
return;
  }
  const todayName = AR_DAYS[new Date().getDay()];
  grid.innerHTML = '';
  teachers.forEach(t => {
const card = document.createElement('div');
card.className = 'teacher-card';
const avatarHtml = t.photo
  ? `<img class="teacher-avatar" src="${t.photo}" alt="${t.name}">`
  : `<div class="teacher-avatar-placeholder">${(t.name || '?')[0]}</div>`;
const daysHtml = (t.days || []).map(d =>
  `<span class="day-chip ${d === todayName ? 'today' : ''}">${d}</span>`
).join('');
const students = t.students || [];
card.innerHTML = `
  <div class="teacher-card-top">
    <div class="teacher-avatar-wrap">
      ${avatarHtml}
      ${(t.days || []).includes(todayName) ? '<div class="teacher-online-dot"></div>' : ''}
    </div>
    <div class="teacher-info">
      <div class="teacher-name">${t.name}</div>
      <div class="teacher-id">🪪 ${t.teacherId}</div>
      <div class="teacher-spec">${t.spec}</div>
    </div>
  </div>
  <div class="teacher-card-body">
    <div class="teacher-days-wrap">${daysHtml}</div>
    ${t.levels ? `<div class="teacher-levels">📚 ${t.levels}</div>` : ''}
    <div style="font-size:12px;color:var(--text-muted);font-weight:600">👥 ${students.length} تلميذ مسجّل</div>
  </div>
  <div class="teacher-card-footer">
    <button class="btn-sm-icon" onclick="openAttModal('${t.id}')">📋 الحضور</button>
    <button class="btn-sm-icon" onclick="openTeacherEditModal('${t.id}')">✏️ تعديل</button>
    <button class="btn-sm-icon danger" onclick="deleteTeacher('${t.id}','${t.name}')">🗑️</button>
  </div>`;
grid.appendChild(card);
  });
}

// ─── Delete teacher ───
window.deleteTeacher = async (id, name) => {
  if (!confirm(`⚠️ حذف الأستاذ "${name}" نهائياً مع كل بياناته؟`)) return;
  try {
await deleteDoc(doc(db, 'teachers', id));
await addLog('🗑️ حذف أستاذ', `تم حذف بيانات الأستاذ ${name}`, '❌');
showToast(`🗑️ تم حذف الأستاذ ${name}`);
  } catch(e) { showToast('خطأ: ' + e.message, true); }
};

// ─── Edit teacher modal ───
window.openTeacherEditModal = (id) => {
  const t = allTeachers.find(x => x.id === id);
  if (!t) return;
  document.getElementById('edit-teacher-id').value = id;
  document.getElementById('edit-t-name').value = t.name || '';
  document.getElementById('edit-t-spec').value = t.spec || '';
  document.getElementById('edit-t-levels').value = t.levels || '';
  setSelectedDays('edit-days-picker', t.days || []);
  editTeacherPhotoBase64 = t.photo || null;
  const prev = document.getElementById('edit-photo-preview');
  if (t.photo) { prev.src = t.photo; prev.style.display = 'block'; }
  else prev.style.display = 'none';
  document.getElementById('teacher-edit-modal').classList.add('open');
};
window.closeTeacherEditModal = () => {
  document.getElementById('teacher-edit-modal').classList.remove('open');
  editTeacherPhotoBase64 = null;
};
window.saveTeacherEdit = async () => {
  const id = document.getElementById('edit-teacher-id').value;
  const name = document.getElementById('edit-t-name').value.trim();
  const spec = document.getElementById('edit-t-spec').value.trim();
  const levels = document.getElementById('edit-t-levels').value.trim();
  const days = getSelectedDays('edit-days-picker');
  if (!name || !spec || !days.length) { showToast('❌ ملء الاسم والتخصص والأيام مطلوب', true); return; }
  const updates = { name, spec, levels, days };
  if (editTeacherPhotoBase64) updates.photo = editTeacherPhotoBase64;
  try {
await updateDoc(doc(db, 'teachers', id), updates);
await addLog('✏️ تعديل بيانات', `تم تعديل بيانات الأستاذ ${name}`, '📝');
showToast('✅ تم حفظ التعديلات');
closeTeacherEditModal();
  } catch(e) { showToast('خطأ: ' + e.message, true); }
};

// ─── Attendance modal (admin view) ───
window.openAttModal = async (teacherId) => {
  const t = allTeachers.find(x => x.id === teacherId);
  if (!t) return;
  currentAttTeacherId = teacherId;
  currentAttStudents = t.students ? [...t.students] : [];
  // تحميل سجلات الحصص الخاصة بهذا الأستاذ لملخص الشهر
  _allRecordedSessions = {};
  const sessSnap = await getDocs(query(collection(db, 'sessionAttendance'), where('teacherId', '==', teacherId)));
  sessSnap.forEach(d => { const data = d.data(); if (data.sessionNum) _allRecordedSessions[data.sessionNum] = data; });
  // Header
  const avatarWrap = document.getElementById('att-modal-avatar-wrap');
  avatarWrap.innerHTML = t.photo
? `<img class="att-modal-avatar" src="${t.photo}" alt="${t.name}">`
: `<div class="att-modal-avatar-placeholder">${(t.name||'?')[0]}</div>`;
  document.getElementById('att-modal-teacher-name').textContent = t.name;
  const todayLabel = `تسجيل حضور — ${AR_DAYS[new Date().getDay()]} ${new Date().toLocaleDateString('ar-DZ')}`;
  document.getElementById('att-modal-date-label').textContent = todayLabel;
  document.getElementById('att-search').value = '';
  document.getElementById('new-student-name').value = '';
  _attCurrentPage = 0;
  renderAttStudents(currentAttStudents, '');
  updateAttSummary(currentAttStudents);
  document.getElementById('att-modal').classList.add('open');
};
window.closeAttModal = () => {
  document.getElementById('att-modal').classList.remove('open');
  currentAttTeacherId = null;
};

// ─── Pagination للقائمة ───
const ATT_PAGE_SIZE = 10;
let _attCurrentPage = 0; // الصفحة الحالية (0-indexed)

function renderAttStudents(students, filter, page) {
  const list = document.getElementById('att-students-list');
  if (!list) return;
  const filtered = filter ? students.filter(s => s.name.includes(filter)) : students;

  if (!filtered.length) {
list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">
  ${filter ? 'لم يتم العثور على نتائج' : 'لا يوجد تلاميذ بعد — أضف تلميذاً أدناه'}
</div>`;
// أزل pagination إن وجدت
const old = document.getElementById('att-pagination');
if (old) old.remove();
return;
  }

  // حساب الصفحات
  const totalPages = Math.ceil(filtered.length / ATT_PAGE_SIZE);
  if (page === undefined) page = _attCurrentPage;
  // تأكد الصفحة في النطاق
  if (page >= totalPages) page = totalPages - 1;
  if (page < 0) page = 0;
  _attCurrentPage = page;

  const start = page * ATT_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + ATT_PAGE_SIZE);

  list.innerHTML = '';
  pageItems.forEach(s => {
const { ps: payStatus, rc: receipt } = getLivePayStatus(s);

const badgeHtml =
  payStatus === 'paid'   ? `<span class="pay-badge paid">✅ مفعّلة</span>` :
  payStatus === 'unpaid' ? `<span class="pay-badge unpaid">⏳ غير مفعّلة</span>` :
                           `<span class="pay-badge unknown">— لا تذكرة</span>`;

const receiptHtml = receipt
  ? `<span style="font-size:10px;font-family:monospace;color:var(--primary);background:var(--primary-light);padding:2px 7px;border-radius:6px;flex-shrink:0">${receipt}</span>`
  : '';

const dotsHtml = Array.from({length:12},(_,d) =>
  `<span class="sdot" id="dot-${s.id}-${d+1}"></span>`
).join('');

const row = document.createElement('div');
row.className = 'att-student-row';
row.dataset.sid = s.id;
row.innerHTML = `
  <span class="att-student-id">${s.id}</span>
  <span class="att-student-name">${s.name}</span>
  ${badgeHtml}
  ${receiptHtml}
  <div class="student-dots-row" style="flex:1">${dotsHtml}</div>
  <div class="att-toggle">
    <div class="att-check ${s.present ? 'present' : ''}" title="حاضر" onclick="toggleStudentAtt('${s.id}',true,this)">✓</div>
    <div class="att-check ${!s.present && s.marked ? 'absent' : ''}" title="غائب" onclick="toggleStudentAtt('${s.id}',false,this)" style="font-size:12px">✗</div>
  </div>
  <button style="padding:4px 8px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:var(--danger-soft);color:var(--danger);font-size:11px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700;flex-shrink:0" onclick="removeStudent('${s.id}')">حذف</button>`;
list.appendChild(row);
  });

  // أزل pagination القديمة وأضف الجديدة إن احتجنا
  const oldPag = document.getElementById('att-pagination');
  if (oldPag) oldPag.remove();

  if (totalPages > 1) {
const pag = document.createElement('div');
pag.id = 'att-pagination';
pag.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)';

const btnStyle = (active) =>
  `padding:7px 13px;border-radius:10px;border:1.5px solid ${active ? 'var(--primary)' : 'var(--border)'};background:${active ? 'var(--primary)' : 'white'};color:${active ? 'white' : 'var(--text-2)'};font-size:13px;font-weight:800;cursor:${active ? 'default' : 'pointer'};font-family:'Tajawal',sans-serif;transition:all 0.2s`;

// زر السابق
const prevBtn = document.createElement('button');
prevBtn.textContent = '→';
prevBtn.style.cssText = `padding:7px 13px;border-radius:10px;border:1.5px solid var(--border);background:white;color:var(--text-2);font-size:13px;font-weight:800;cursor:pointer;font-family:'Tajawal',sans-serif;transition:all 0.2s;opacity:${page === 0 ? 0.35 : 1}`;
prevBtn.disabled = page === 0;
prevBtn.onclick = () => renderAttStudents(students, filter, _attCurrentPage - 1);
pag.appendChild(prevBtn);

// أرقام الصفحات
for (let p = 0; p < totalPages; p++) {
  const btn = document.createElement('button');
  btn.textContent = p + 1;
  btn.style.cssText = btnStyle(p === page);
  if (p !== page) btn.onclick = ((_p) => () => renderAttStudents(students, filter, _p))(p);
  pag.appendChild(btn);
}

// زر التالي
const nextBtn = document.createElement('button');
nextBtn.textContent = '←';
nextBtn.style.cssText = `padding:7px 13px;border-radius:10px;border:1.5px solid var(--border);background:white;color:var(--text-2);font-size:13px;font-weight:800;cursor:pointer;font-family:'Tajawal',sans-serif;transition:all 0.2s;opacity:${page === totalPages - 1 ? 0.35 : 1}`;
nextBtn.disabled = page === totalPages - 1;
nextBtn.onclick = () => renderAttStudents(students, filter, _attCurrentPage + 1);
pag.appendChild(nextBtn);

// إدراج pagination بعد القائمة مباشرة
list.after(pag);
  }
}

window.toggleStudentAtt = (sid, isPresent, el) => {
  const s = currentAttStudents.find(x => x.id === sid);
  if (!s) return;
  s.present = isPresent;
  s.marked = true;
  const row = el.closest('.att-student-row');
  row.querySelectorAll('.att-check').forEach(c => c.classList.remove('present','absent'));
  if (isPresent) row.querySelectorAll('.att-check')[0].classList.add('present');
  else row.querySelectorAll('.att-check')[1].classList.add('absent');
  updateAttSummary(currentAttStudents);
};

function updateAttSummary(students) {
  const total = students.length;
  const present = students.filter(s => s.present).length;
  document.getElementById('att-total').textContent = total;
  document.getElementById('att-present').textContent = present;
  document.getElementById('att-absent').textContent = total - present;
}

window.filterStudents = () => {
  const val = document.getElementById('att-search').value;
  _attCurrentPage = 0; // ارجع للصفحة الأولى عند كل بحث
  renderAttStudents(currentAttStudents, val);
};

// ─── إعادة رسم قائمة الحضور عند تحديث التذاكر ───
function refreshAttendanceListIfOpen() {
  const list = document.getElementById('att-students-list');
  if (!list || !currentAttStudents.length) return;
  const saveBtn = document.getElementById('save-att-btn');
  if (!saveBtn) return; // وضع القراءة فقط — لا نُحدّث
  const searchVal = (document.getElementById('att-search') || {}).value || '';
  renderAttStudents(currentAttStudents, searchVal);
}

// ─── متغير لحفظ بيانات التلميذ المختار من البحث ───
let _selectedStudentData = null;

// ─── بحث ذكي في التذاكر: بالاسم أو رقم الوصل ───
window.searchStudentSuggestions = (val) => {
  const suggestionsEl = document.getElementById('student-suggestions');
  const infoEl = document.getElementById('selected-student-info');
  if (!suggestionsEl) return;

  // إذا مسح المستخدم الحقل، نصفّر الاختيار
  if (!val || val.trim().length < 2) {
suggestionsEl.style.display = 'none';
if (infoEl) infoEl.style.display = 'none';
_selectedStudentData = null;
return;
  }

  const norm = s => String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  const q = norm(val);

  // البحث في التذاكر
  const matches = (allTicketsData || []).filter(t => {
return norm(t.name).includes(q) || (t.receipt && norm(t.receipt).includes(q));
  }).slice(0, 8);

  if (!matches.length) {
// لا نتائج — نعرض خيار إضافة يدوية
suggestionsEl.style.display = 'block';
suggestionsEl.innerHTML = `
  <div style="padding:14px 16px">
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;font-weight:600">لم يُوجد في التذاكر — يمكنك الإضافة يدوياً:</div>
    <div class="student-suggest-item" style="border:1.5px dashed var(--border-2);border-radius:10px;cursor:pointer;padding:10px 14px" onclick="selectManualStudent('${val.replace(/'/g,"\\'")}')">
      <div style="font-size:14px;font-weight:800;color:var(--text)">➕ ${val}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:2px">إضافة بدون تذكرة — لا يوجد رقم وصل</div>
    </div>
  </div>`;
return;
  }

  suggestionsEl.style.display = 'block';
  suggestionsEl.innerHTML = matches.map(t => {
const isPaid = t.status === 'paid';
const badgeColor = isPaid ? 'var(--success)' : 'var(--danger)';
const badgeBg = isPaid ? 'var(--success-soft)' : 'var(--danger-soft)';
const badgeText = isPaid ? '✅ مفعّلة' : '⏳ غير مفعّلة';
// التحقق إذا كان التلميذ مضاف مسبقاً
const alreadyAdded = currentAttStudents.some(s => s.receipt === t.receipt || (s.name === t.name && !s.receipt && !t.receipt));
return `
  <div class="student-suggest-item" onclick="selectTicketStudent('${(t.receipt||'').replace(/'/g,"\\'")}','${t.name.replace(/'/g,"\\'")}')" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.15s;${alreadyAdded?'opacity:0.5;pointer-events:none;':''}">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="flex:1">
        <div style="font-size:14px;font-weight:800;color:var(--text)">${t.name}${alreadyAdded?' <span style="font-size:10px;color:var(--text-muted)">(مضاف)</span>':''}</div>
        ${t.receipt ? `<div style="font-size:11px;font-family:monospace;color:var(--primary);margin-top:2px">🎟️ ${t.receipt}</div>` : ''}
        ${t.pack ? `<div style="font-size:11px;color:var(--text-muted);margin-top:1px">📦 ${t.pack}</div>` : ''}
      </div>
      <span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:99px;background:${badgeBg};color:${badgeColor};border:1px solid ${badgeColor}30;white-space:nowrap">${badgeText}</span>
    </div>
  </div>`;
  }).join('') + (matches.length >= 8 ? `<div style="padding:10px 16px;font-size:11px;color:var(--text-muted);font-weight:700;text-align:center">+ دقّق البحث لرؤية نتائج أكثر</div>` : '');
};

// ─── اختيار تلميذ من التذاكر ───
window.selectTicketStudent = (receipt, name) => {
  const ticket = (allTicketsData || []).find(t => t.receipt === receipt) || (allTicketsData || []).find(t => t.name === name);
  if (!ticket) return;
  _selectedStudentData = {
name: ticket.name,
receipt: ticket.receipt || null,
payStatus: ticket.status === 'paid' ? 'paid' : 'unpaid',
fromTicket: true
  };
  const inp = document.getElementById('new-student-name');
  if (inp) inp.value = ticket.name;
  const sug = document.getElementById('student-suggestions');
  if (sug) sug.style.display = 'none';
  const info = document.getElementById('selected-student-info');
  if (info) {
const isPaid = ticket.status === 'paid';
info.style.display = 'block';
info.innerHTML = `
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <span style="font-size:16px">✅</span>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:800;color:var(--text)">${ticket.name}</div>
      ${ticket.receipt ? `<div style="font-size:11px;font-family:monospace;color:var(--primary);margin-top:1px">🎟️ ${ticket.receipt}</div>` : ''}
    </div>
    <span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:99px;background:${isPaid?'var(--success-soft)':'var(--danger-soft)'};color:${isPaid?'#059669':'#DC2626'}">
      ${isPaid?'✅ مفعّلة':'⏳ غير مفعّلة'}
    </span>
  </div>`;
  }
};

// ─── إضافة يدوية بدون تذكرة ───
window.selectManualStudent = (name) => {
  _selectedStudentData = { name, receipt: null, payStatus: 'unknown', fromTicket: false };
  const inp = document.getElementById('new-student-name');
  if (inp) inp.value = name;
  const sug = document.getElementById('student-suggestions');
  if (sug) sug.style.display = 'none';
  const info = document.getElementById('selected-student-info');
  if (info) {
info.style.display = 'block';
info.innerHTML = `<span style="font-size:13px;color:var(--text-2)">📝 ${name} — سيُضاف بدون رقم وصل</span>`;
  }
};

// ─── دالة مساعدة: البحث عن تذكرة التلميذ في سجل التذاكر ───
// ─── حالة الدفع الحية — تتجاهل القيمة المحفوظة وتبحث دائماً في التذاكر ───
function getLivePayStatus(student) {
  if (!allTicketsData || !allTicketsData.length) return { ps: 'unknown', rc: student.receipt || null };
  // البحث أولاً برقم الوصل (أدق)
  let ticket = student.receipt
? allTicketsData.find(t => t.receipt && t.receipt === student.receipt)
: null;
  // ثم بالاسم
  if (!ticket) ticket = findStudentTicket(student.name);
  if (!ticket) return { ps: 'unknown', rc: student.receipt || null };
  return {
ps: ticket.status === 'paid' ? 'paid' : 'unpaid',
rc: ticket.receipt || student.receipt || null
  };
}

function findStudentTicket(name) {
  if (!allTicketsData || !allTicketsData.length) return null;
  const norm = s => String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  const target = norm(name);
  // مطابقة كاملة أولاً
  let match = allTicketsData.find(t => norm(t.name) === target);
  // مطابقة جزئية إذا لم تُوجد
  if (!match) match = allTicketsData.find(t => norm(t.name).includes(target) || target.includes(norm(t.name)));
  return match || null;
}

window.addStudent = async () => {
  const nameInp = document.getElementById('new-student-name');
  const rawName = nameInp ? nameInp.value.trim() : '';
  if (!rawName) return;

  let name, receipt, isPaid, isUnpaid, payStatus;

  if (_selectedStudentData) {
// استخدام بيانات التلميذ المختار من البحث
name      = _selectedStudentData.name;
receipt   = _selectedStudentData.receipt;
payStatus = _selectedStudentData.payStatus;
isPaid    = payStatus === 'paid';
isUnpaid  = payStatus === 'unpaid';
  } else {
// البحث التلقائي (fallback إذا أضاف مباشرة بدون اختيار)
name = rawName;
const ticket = findStudentTicket(name);
isPaid   = !!(ticket && ticket.status === 'paid');
isUnpaid = !!(ticket && ticket.status !== 'paid');
receipt  = ticket ? (ticket.receipt || null) : null;
payStatus = ticket ? (isPaid ? 'paid' : 'unpaid') : 'unknown';
  }

  // منع التكرار — بالوصل إذا موجود، وإلا بالاسم
  const duplicate = currentAttStudents.some(s =>
(receipt && s.receipt === receipt) ||
(!receipt && !s.receipt && s.name === name)
  );
  if (duplicate) {
showToast(`⚠️ ${name} مضاف مسبقاً في القائمة`, true);
return;
  }

  const idx = currentAttStudents.length;
  const id  = receipt || genStudentId(currentAttTeacherId.slice(-4).toUpperCase(), idx);

  const newStudent = { id, name, present: false, marked: false, payStatus, receipt: receipt || null };

  currentAttStudents.push(newStudent);
  _suppressSnapshot = true;
  await updateDoc(doc(db, 'teachers', currentAttTeacherId), { students: currentAttStudents });
  setTimeout(() => { _suppressSnapshot = false; }, 1500);

  // تنظيف الحقل والاختيار
  if (nameInp) nameInp.value = '';
  _selectedStudentData = null;
  const sug = document.getElementById('student-suggestions');
  if (sug) sug.style.display = 'none';
  const info = document.getElementById('selected-student-info');
  if (info) info.style.display = 'none';

  // إعادة رسم القائمة مع تثبيت موضع الـ scroll
  const inlineList = document.getElementById('att-students-list');
  if (inlineList) {
const scrollY = window.scrollY; // حفظ موضع الصفحة
const studentsHtml = currentAttStudents.map(s => {
  const { ps, rc } = getLivePayStatus(s);
  const badgeHtml =
    ps === 'paid'   ? `<span class="pay-badge paid">✅ مفعّلة</span>` :
    ps === 'unpaid' ? `<span class="pay-badge unpaid">⏳ غير مفعّلة</span>` :
                     `<span class="pay-badge unknown">— لا تذكرة</span>`;
  const receiptHtml = rc ? `<span style="font-size:10px;font-family:monospace;color:var(--primary);background:var(--primary-light);padding:2px 7px;border-radius:6px;flex-shrink:0">${rc}</span>` : '';
  const sessionDots = currentOpenSession
    ? Array.from({length:12},(_,i)=>`<span class="sdot ${i===currentOpenSession-1?'current-dot':''}"></span>`).join('')
    : Array.from({length:12},()=>`<span class="sdot"></span>`).join('');
  return `<div class="att-student-row" data-sid="${s.id}">
    <span class="att-student-id">${s.id}</span>
    <span class="att-student-name">${s.name}</span>
    ${badgeHtml}${receiptHtml}
    <div class="student-dots-row">${sessionDots}</div>
    <div class="att-toggle" style="margin-right:auto">
      <div class="att-check ${s.present?'present':''}" title="حاضر" onclick="toggleStudentAtt('${s.id}',true,this)">✓</div>
      <div class="att-check ${!s.present&&s.marked?'absent':''}" title="غائب" onclick="toggleStudentAtt('${s.id}',false,this)" style="font-size:12px">✗</div>
    </div>
    <button style="padding:4px 8px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:var(--danger-soft);color:var(--danger);font-size:11px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700;flex-shrink:0" onclick="removeStudent('${s.id}')">حذف</button>
  </div>`;
}).join('') || `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">لا يوجد تلاميذ بعد</div>`;
inlineList.innerHTML = studentsHtml;
window.scrollTo({ top: scrollY }); // إعادة موضع الصفحة
  } else {
renderAttStudents(currentAttStudents, '');
  }
  updateAttSummary(currentAttStudents);

  if (isPaid)    showToast(`✅ تمت إضافة ${name} — التذكرة مفعّلة ✔`);
  else if (isUnpaid) showToast(`⚠️ تمت إضافة ${name} — التذكرة غير مفعّلة`, true);
  else           showToast(`✅ تمت إضافة ${name} — لا توجد تذكرة مسجّلة`);
};

window.removeStudent = async (sid) => {
  if (!confirm('حذف هذا التلميذ نهائياً؟')) return;
  // حذف فوري من DOM
  const row = document.querySelector(`.att-student-row[data-sid="${sid}"]`);
  if (row) row.remove();
  // تحديث البيانات
  currentAttStudents = currentAttStudents.filter(s => s.id !== sid);
  updateAttSummary(currentAttStudents);
  // حفظ في Firestore مع تجميد الـ snapshot
  _suppressSnapshot = true;
  await updateDoc(doc(db, 'teachers', currentAttTeacherId), { students: currentAttStudents });
  setTimeout(() => { _suppressSnapshot = false; }, 1500);
};

window.saveAttendance = async () => {
  if (!currentAttTeacherId) return;
  const todayKey = new Date().toISOString().slice(0,10);
  const record = {
date: todayKey,
savedAt: serverTimestamp(),
students: currentAttStudents.map(s => ({ id: s.id, name: s.name, present: !!s.present }))
  };
  try {
await setDoc(doc(db, 'attendance', `${currentAttTeacherId}_${todayKey}`), {
  teacherId: currentAttTeacherId,
  ...record
});
const t = allTeachers.find(x => x.id === currentAttTeacherId) || currentTeacherData;
const present = currentAttStudents.filter(s => s.present).length;
await addLog('📋 تسجيل حضور', `${t?.name || 'أستاذ'} — ${present}/${currentAttStudents.length} حاضر (${todayKey})`, '✅');
showToast('✅ تم حفظ سجل الحضور');
// في وضع الأدمين نغلق الـ modal — في وضع الأستاذ نبقى في الصفحة
if (!isTeacherMode) closeAttModal();
  } catch(e) { showToast('خطأ: ' + e.message, true); }
};

// ─── Teacher self-view (when teacher logs in) ───
async function loadTeacherStudentsView(uid, teacherData) {
let _suppressSnapshot = false;

  onSnapshot(doc(db, 'teachers', uid), snap => {
if (!snap.exists()) return;
if (_suppressSnapshot) return; // جاري تعديل — تجاهل هذا التحديث
const t = snap.data();
currentTeacherData = { uid, id: uid, ...t };
currentAttStudents = t.students ? [...t.students] : [];

// تحديث إحصائيات الهيدر — مع تحقق آمن من وجود العنصر
const heroEl = document.getElementById('teachers-hero');
if (heroEl) {
  const heroSub = heroEl.querySelector('.teachers-hero-sub');
  if (heroSub) {
    heroSub.textContent = `مرحباً ${t.name} — تخصص: ${t.spec} — أيام التدريس: ${(t.days||[]).join('، ')}`;
  }
}
const statTotal = document.getElementById('t-stat-total');
if (statTotal) statTotal.textContent = 1;
const statStudents = document.getElementById('t-stat-students');
if (statStudents) statStudents.textContent = currentAttStudents.length;

// عرض قائمة حضور الأستاذ مباشرة في الصفحة (وليس في modal)
showTeacherInlineAttendance(uid, t);
  });
}

// ─── عرض نظام الحضور بالـ 12 حصة للأستاذ ───
function showTeacherInlineAttendance(teacherId, teacherData) {
  currentAttTeacherId = teacherId;
  const grid = document.getElementById('teachers-grid');
  if (!grid) return;

  const teacherDays = teacherData.days || [];
  // بناء 12 حصة موزعة على الأيام (نكرر الدورة حتى 12)
  const sessions = [];
  for (let i = 0; i < 12; i++) {
sessions.push({
  num: i + 1,
  day: teacherDays[i % teacherDays.length] || '—',
  dayIndex: i % teacherDays.length
});
  }

  // نحدد الحصة الحالية: أول حصة لم تُسجَّل بعد
  // سنحملها من Firestore — نعرض الهيكل أولاً ونحدّث لاحقاً
  const avatarHtml = teacherData.photo
? `<img src="${teacherData.photo}" alt="${teacherData.name}" style="width:56px;height:56px;border-radius:16px;object-fit:cover;flex-shrink:0">`
: `<div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,var(--primary),#9333EA);display:flex;align-items:center;justify-content:center;font-size:22px;color:white;font-weight:900;flex-shrink:0">${(teacherData.name||'?')[0]}</div>`;

  grid.innerHTML = `
<div style="grid-column:1/-1">
  <!-- هيدر الأستاذ -->
  <div class="sessions-header">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">
      ${avatarHtml}
      <div>
        <div style="font-size:18px;font-weight:900;color:var(--text)">${teacherData.name}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:2px">🎓 ${teacherData.spec}</div>
        <div style="font-size:12px;color:var(--primary);font-weight:700;margin-top:3px">📅 أيام التدريس: ${teacherDays.join('، ')}</div>
      </div>
    </div>
    <div class="sessions-title">📅 سجل الحضور — 12 حصة في الشهر</div>
    <div class="sessions-sub">اضغط على الحصة الحالية لتسجيل حضور التلاميذ — الحصص الأخرى مغلقة حتى يحين موعدها</div>
  </div>

  <!-- شبكة الـ 12 حصة -->
  <div class="sessions-grid" id="sessions-grid">
    ${sessions.map((s,i) => `
      <div class="session-card locked" id="session-card-${i+1}" data-session="${i+1}" onclick="openSession(${i+1})">
        <div class="session-num">حصة ${s.num}</div>
        <div class="session-day">${s.day}</div>
        <div class="session-dots" id="session-dots-${i+1}">
          <!-- النقاط تُحشى ديناميكياً -->
        </div>
        <div id="session-chip-${i+1}"></div>
      </div>
    `).join('')}
    <!-- بطاقة الملخص بعد الحصة 12 -->
    <div class="summary-card" onclick="openSummaryModal()">
      <div class="summary-card-title">📊 ملخص الشهر</div>
      <div class="summary-card-num" id="summary-sessions-done">0/12</div>
      <div class="summary-card-sub">حصة مسجّلة</div>
      <div style="margin-top:8px;font-size:11px;color:var(--primary);font-weight:700">اضغط للتفاصيل ←</div>
    </div>
  </div>
</div>`;

  // تحميل سجلات الحضور من Firestore وتحديث الحصص
  loadSessionsData(teacherId, teacherData, sessions);
}

// ─── Modal تسجيل الحضور (يُبنى مرة واحدة في DOM) ───
function ensureSessionModal() {
  if (document.getElementById('session-modal-bg')) return;
  const bg = document.createElement('div');
  bg.id = 'session-modal-bg';
  bg.style.cssText = 'position:fixed;inset:0;background:rgba(15,10,40,0.65);backdrop-filter:blur(8px);z-index:4000;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;visibility:hidden;transition:all 0.3s ease';
  bg.innerHTML = `<div id="session-modal-inner" style="background:var(--card,#fff);border-radius:24px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,0.35);transform:translateY(20px) scale(0.97);transition:all 0.3s ease;border:1px solid var(--border,#e5e7eb)"></div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeSessionModal(); });
  document.body.appendChild(bg);
}
function openSessionModal(html) {
  ensureSessionModal();
  const bg = document.getElementById('session-modal-bg');
  document.getElementById('session-modal-inner').innerHTML = html;
  bg.style.opacity = '1';
  bg.style.visibility = 'visible';
  document.getElementById('session-modal-inner').style.transform = 'translateY(0) scale(1)';
  document.body.style.overflow = 'hidden';
}
window.closeSessionModal = () => {
  const bg = document.getElementById('session-modal-bg');
  if (!bg) return;
  bg.style.opacity = '0';
  bg.style.visibility = 'hidden';
  document.getElementById('session-modal-inner').style.transform = 'translateY(20px) scale(0.97)';
  document.body.style.overflow = '';
  currentOpenSession = null;
};

// ─── تحميل بيانات الحصص من Firestore ───
async function loadSessionsData(teacherId, teacherData, sessions) {
  onSnapshot(
query(collection(db, 'sessionAttendance'), where('teacherId', '==', teacherId)),
snap => {
  const recordedSessions = {};
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.sessionNum) recordedSessions[data.sessionNum] = data;
  });
  updateSessionCards(sessions, recordedSessions, teacherData);
}
  );
}

// ─── تحديث بطاقات الحصص بناءً على البيانات ───
let _allRecordedSessions = {}; // نحتفظ بها لملخص الحضور

function updateSessionCards(sessions, recordedSessions, teacherData) {
  _allRecordedSessions = recordedSessions;
  const students = currentAttStudents;

  // ── تحديد الحصة الحالية بناءً على يوم الأسبوع الفعلي ──
  const arabicDayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const todayArabic = arabicDayNames[new Date().getDay()];
  const teacherDays = teacherData.days || [];

  // نبني خريطة: رقم الحصة → هل يومها فات أم لا
  // الفكرة: نمشي الحصص بالترتيب. أي حصة غير مسجلة ويومها != اليوم الحالي
  // نعتبرها "فائتة" إذا كان ترتيبها قبل الحصة الحالية.
  // "الحصة الحالية" = أول حصة غير مسجلة يومها == اليوم أو ما زلنا لم نصلها.

  // نحدد الحصة الحالية: أول حصة غير مسجلة
  let currentSession = 13; // افتراضياً كل مسجلة
  for (let i = 1; i <= 12; i++) {
if (!recordedSessions[i]) { currentSession = i; break; }
  }

  // الحصة الحالية يومها
  const currentSessionDay = currentSession <= 12 ? sessions[currentSession - 1]?.day : null;
  // هل يوم الحصة الحالية هو اليوم نفسه؟
  const isSessionDayToday = currentSessionDay === todayArabic;

  // تحديث عداد الملخص
  const doneCount = Object.keys(recordedSessions).length;
  const summaryEl = document.getElementById('summary-sessions-done');
  if (summaryEl) summaryEl.textContent = `${doneCount}/12`;

  for (let i = 1; i <= 12; i++) {
const card = document.getElementById(`session-card-${i}`);
const dotsEl = document.getElementById(`session-dots-${i}`);
const chipEl = document.getElementById(`session-chip-${i}`);
if (!card) continue;

const isRecorded = !!recordedSessions[i];
const isCurrent  = i === currentSession;
const sessionDay = sessions[i - 1]?.day || '';

// الحصة "فائتة": قبل الحصة الحالية، غير مسجلة، ويومها ≠ اليوم
const isMissed = !isRecorded && !isCurrent && i < currentSession;

card.classList.remove('locked', 'current', 'done', 'missed');
// تحديث onclick: الحصة المسجلة أو الفائتة تفتح عرض القراءة فقط
if (isRecorded) {
  card.setAttribute('onclick', `viewSessionHistory(${i})`);
} else if (isMissed) {
  card.setAttribute('onclick', `viewSessionHistory(${i})`);
} else if (isCurrent) {
  card.setAttribute('onclick', `openSession(${i})`);
} else {
  card.setAttribute('onclick', '');
}

if (isRecorded) {
  card.classList.add('done');
  const recDate = recordedSessions[i].savedAt?.toDate
    ? recordedSessions[i].savedAt.toDate().toLocaleDateString('ar-DZ', {day:'numeric', month:'short'})
    : (recordedSessions[i].date || '');
  chipEl.innerHTML = `<span class="session-status-chip done-chip">✅ مسجّلة</span>${recDate ? `<div style="font-size:9px;color:#059669;font-weight:700;margin-top:3px">${recDate}</div>` : ''}`;
  const recStudents = recordedSessions[i].students || [];
  dotsEl.innerHTML = recStudents.length
    ? recStudents.map(s => `<span class="sdot ${s.present ? 'recorded' : ''}" title="${s.name}: ${s.present ? 'حاضر' : 'غائب'}"></span>`).join('')
    : `<span class="sdot recorded"></span>`;
} else if (isMissed) {
  card.classList.add('missed');
  chipEl.innerHTML = `<span class="session-status-chip" style="background:rgba(245,158,11,0.12);color:#d97706;border:1px solid rgba(245,158,11,0.25)">⚠️ فائتة</span><div style="font-size:9px;color:#d97706;font-weight:700;margin-top:3px">انتهى وقتها</div>`;
  dotsEl.innerHTML = students.length
    ? students.map(s => `<span class="sdot" style="opacity:0.4" title="${s.name}"></span>`).join('')
    : `<span class="sdot" style="opacity:0.4"></span>`;
} else if (isCurrent) {
  card.classList.add('current');
  const todayStr = new Date().toLocaleDateString('ar-DZ', {day:'numeric', month:'short'});
  chipEl.innerHTML = `<span class="session-status-chip current-chip">▶ الحصة الحالية</span><div style="font-size:9px;color:var(--primary);font-weight:700;margin-top:3px">${todayStr}</div>`;
  dotsEl.innerHTML = students.length
    ? students.map((s,idx) => `<span class="sdot ${idx===0?'current-dot':''}" title="${s.name}"></span>`).join('')
    : `<span class="sdot current-dot"></span>`;
} else {
  card.classList.add('locked');
  chipEl.innerHTML = `<span class="session-status-chip locked-chip">🔒 مغلقة</span>`;
  dotsEl.innerHTML = students.length
    ? students.map(s => `<span class="sdot" title="${s.name}"></span>`).join('')
    : `<span class="sdot"></span>`;
}
  }
}

// ─── عرض سجل حصة فائتة أو مسجّلة (قراءة فقط) ───
window.viewSessionHistory = (sessionNum) => {
  const record = _allRecordedSessions[sessionNum];
  const isMissed = !record;

  const recDate = record?.savedAt?.toDate
? record.savedAt.toDate().toLocaleDateString('ar-DZ', {weekday:'long', day:'numeric', month:'long'})
: (record?.date || '');

  const studentsHtml = isMissed
? `<div style="text-align:center;padding:30px 20px">
    <div style="font-size:36px;margin-bottom:10px">⚠️</div>
    <div style="font-size:15px;font-weight:800;color:#d97706;margin-bottom:6px">لم يُسجَّل الحضور لهذه الحصة</div>
    <div style="font-size:12px;color:var(--text-muted)">انتهى وقت تسجيل هذه الحصة — تم قفلها تلقائياً</div>
  </div>`
: (record.students || []).map(s => `
    <div class="att-student-row" style="pointer-events:none;opacity:${s.present?1:0.6}">
      <span class="att-student-id">${s.id || '—'}</span>
      <span class="att-student-name">${s.name}</span>
      <span class="pay-badge ${s.present?'paid':'unpaid'}" style="margin-right:auto">${s.present ? '✅ حاضر' : '❌ غائب'}</span>
    </div>`).join('') || `<div style="text-align:center;padding:20px;color:var(--text-muted)">لا يوجد تلاميذ</div>`;

  const presentCount = isMissed ? 0 : (record.students || []).filter(s => s.present).length;
  const totalCount   = isMissed ? 0 : (record.students || []).length;

  openSessionModal(`
<div class="session-att-header" style="background:${isMissed?'rgba(245,158,11,0.08)':'var(--success-soft)'};border-radius:24px 24px 0 0;border-bottom:1px solid var(--border)">
  <div style="font-size:22px">${isMissed ? '⚠️' : '📋'}</div>
  <div style="flex:1">
    <div style="font-size:16px;font-weight:900;color:var(--text)">سجل الحصة ${sessionNum} — ${isMissed ? 'فائتة' : 'مسجّلة'}</div>
    ${recDate ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">📅 ${recDate}</div>` : ''}
  </div>
  ${!isMissed ? `<div style="font-size:13px;font-weight:800;color:var(--success)">${presentCount}/${totalCount} حاضر</div>` : ''}
  <button onclick="closeSessionModal()" style="padding:8px 16px;border-radius:12px;border:1px solid var(--border-2);background:var(--card);color:var(--text-muted);font-size:13px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700">✕</button>
</div>
<div style="padding:20px 24px">
  <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--text-muted);font-weight:700;text-align:center">
    🔒 هذه الحصة في وضع القراءة فقط — لا يمكن التعديل عليها
  </div>
  <div class="att-students-list">${studentsHtml}</div>
</div>`);
};

// ─── فتح حصة لتسجيل الحضور ───
window.openSession = (sessionNum) => {
  const card = document.getElementById(`session-card-${sessionNum}`);
  if (!card || card.classList.contains('locked')) return;
  if (card.classList.contains('done')) {
showToast('✅ هذه الحصة مسجّلة مسبقاً', false); return;
  }

  currentOpenSession = sessionNum;

  const buildModalHtml = () => {
const students = currentAttStudents;
const studentsHtml = students.length
  ? students.map(s => {
      const { ps, rc } = getLivePayStatus(s);
      const badgeHtml =
        ps === 'paid'   ? `<span class="pay-badge paid">✅ مفعّلة</span>` :
        ps === 'unpaid' ? `<span class="pay-badge unpaid">⏳ غير مفعّلة</span>` :
                         `<span class="pay-badge unknown">— لا تذكرة</span>`;
      const receiptHtml = rc ? `<span style="font-size:10px;font-family:monospace;color:var(--primary);background:var(--primary-light);padding:2px 7px;border-radius:6px;flex-shrink:0">${rc}</span>` : '';
      return `
      <div class="att-student-row" data-sid="${s.id}">
        <span class="att-student-id">${s.id}</span>
        <span class="att-student-name">${s.name}</span>
        ${badgeHtml}${receiptHtml}
        <div class="student-dots-row">
          ${Array.from({length:12},(_,i)=>`<span class="sdot ${i===sessionNum-1?'current-dot':''}"></span>`).join('')}
        </div>
        <div class="att-toggle" style="margin-right:auto">
          <div class="att-check ${s.present?'present':''}" title="حاضر" onclick="toggleStudentAtt('${s.id}',true,this)">✓</div>
          <div class="att-check ${!s.present&&s.marked?'absent':''}" title="غائب" onclick="toggleStudentAtt('${s.id}',false,this)" style="font-size:12px">✗</div>
        </div>
        <button style="padding:4px 8px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:var(--danger-soft);color:var(--danger);font-size:11px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700;flex-shrink:0" onclick="removeStudent('${s.id}')">حذف</button>
      </div>`;
    }).join('')
  : `<div style="text-align:center;padding:30px;color:var(--text-muted)">لا يوجد تلاميذ — أضف تلاميذ أولاً</div>`;

return `
  <div class="session-att-header" style="border-radius:24px 24px 0 0;border-bottom:1px solid var(--border)">
    <div style="font-size:22px">📋</div>
    <div style="flex:1">
      <div style="font-size:16px;font-weight:900;color:var(--text)">تسجيل حضور الحصة ${sessionNum} من 12</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px">حدد الحضور لكل تلميذ ثم احفظ</div>
    </div>
    <button onclick="closeSessionModal()" style="padding:8px 16px;border-radius:12px;border:1px solid var(--border-2);background:var(--card);color:var(--text-muted);font-size:13px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700">✕</button>
  </div>
  <div style="padding:20px 24px">
    <div class="att-summary-grid" style="margin-bottom:16px">
      <div class="att-summary-card"><div class="att-summary-n" id="att-total">0</div><div class="att-summary-l">إجمالي</div></div>
      <div class="att-summary-card" style="background:var(--success-soft);border-color:rgba(16,185,129,0.2)"><div class="att-summary-n" id="att-present" style="color:var(--success)">0</div><div class="att-summary-l">حاضر</div></div>
      <div class="att-summary-card" style="background:var(--danger-soft);border-color:rgba(239,68,68,0.15)"><div class="att-summary-n" id="att-absent" style="color:var(--danger)">0</div><div class="att-summary-l">غائب</div></div>
    </div>
    <div class="att-search-wrap" style="margin-bottom:12px">
      <span class="att-search-icon">🔍</span>
      <input class="inp" type="text" id="att-search" placeholder="ابحث عن تلميذ..." style="padding-right:40px" oninput="filterStudents()">
    </div>
    <div class="att-students-list" id="att-students-list">${studentsHtml}</div>
    <div class="att-add-student" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);flex-direction:column;gap:8px">
      <div style="display:flex;gap:10px;width:100%">
        <div style="position:relative;flex:1">
          <input class="inp" type="text" id="new-student-name" placeholder="ابحث باسم التلميذ أو رقم الوصل..." style="width:100%;padding-left:40px" oninput="searchStudentSuggestions(this.value)">
          <span style="position:absolute;top:50%;left:14px;transform:translateY(-50%);font-size:16px;pointer-events:none">🔍</span>
        </div>
        <button class="btn-primary" style="width:auto;padding:12px 20px;white-space:nowrap" onclick="addStudent()">➕ إضافة</button>
      </div>
      <div id="student-suggestions" style="display:none;background:white;border:1px solid var(--border-2);border-radius:14px;box-shadow:var(--shadow-lg);overflow:hidden;max-height:220px;overflow-y:auto;width:100%"></div>
      <div id="selected-student-info" style="display:none;background:linear-gradient(135deg,var(--primary-light),rgba(16,185,129,0.06));border:1px solid var(--border-2);border-radius:12px;padding:10px 14px;font-size:12px;font-weight:700;color:var(--text-2)"></div>
    </div>
    <button class="btn-primary" id="save-att-btn" onclick="saveSessionAttendance()" style="margin-top:14px">💾 حفظ حضور الحصة ${sessionNum}</button>
  </div>`;
  };

  openSessionModal(buildModalHtml());
  updateAttSummary(currentAttStudents);
};

// حفظ حضور حصة معينة
let currentOpenSession = null;
window.saveSessionAttendance = async () => {
  if (!currentAttTeacherId || !currentOpenSession) return;
  const sessionKey = `${currentAttTeacherId}_session_${currentOpenSession}`;
  const record = {
teacherId: currentAttTeacherId,
sessionNum: currentOpenSession,
savedAt: serverTimestamp(),
students: currentAttStudents.map(s => ({ id: s.id, name: s.name, present: !!s.present }))
  };
  try {
await setDoc(doc(db, 'sessionAttendance', sessionKey), record);
const present = currentAttStudents.filter(s => s.present).length;
await addLog('📋 تسجيل حضور', `حصة ${currentOpenSession} — ${present}/${currentAttStudents.length} حاضر`, '✅');
showToast(`✅ تم حفظ حضور الحصة ${currentOpenSession}`);
closeSessionModal();
  } catch(e) { showToast('خطأ: ' + e.message, true); }
};

// ─── ملخص حضور التلاميذ ───
window.openSummaryModal = () => {
  const students = currentAttStudents;
  if (!students.length) { showToast('لا يوجد تلاميذ بعد', true); return; }

  const recordedCount = Object.keys(_allRecordedSessions).length;
  const subEl = document.getElementById('summary-modal-sub');
  if (subEl) subEl.textContent = `${recordedCount} حصة مسجّلة من أصل 12`;

  // بناء إحصائيات كل تلميذ عبر جميع الحصص المسجلة
  const studentStats = {};
  students.forEach(s => { studentStats[s.id] = { name: s.name, present: 0, absent: 0, dots: [] }; });

  for (let i = 1; i <= 12; i++) {
const rec = _allRecordedSessions[i];
if (rec && rec.students) {
  rec.students.forEach(s => {
    if (!studentStats[s.id]) studentStats[s.id] = { name: s.name, present: 0, absent: 0, dots: [] };
    if (s.present) { studentStats[s.id].present++; studentStats[s.id].dots.push(true); }
    else { studentStats[s.id].absent++; studentStats[s.id].dots.push(false); }
  });
} else {
  // حصة غير مسجلة — نضيف فراغ
  students.forEach(s => { if (studentStats[s.id]) studentStats[s.id].dots.push(null); });
}
  }

  const contentEl = document.getElementById('summary-modal-content');
  contentEl.innerHTML = Object.values(studentStats).map(st => {
const dotsHtml = st.dots.map((d,i) =>
  d === true  ? `<span class="sdot recorded" title="حصة ${i+1}: حاضر"></span>` :
  d === false ? `<span class="sdot" style="border-color:rgba(239,68,68,0.4)" title="حصة ${i+1}: غائب"></span>` :
               `<span class="sdot" style="opacity:0.3" title="حصة ${i+1}: لم تُسجَّل"></span>`
).join('');
return `
  <div class="student-summary-row">
    <div class="student-summary-name">${st.name}</div>
    <div class="student-summary-dots">${dotsHtml}</div>
    <span class="student-summary-stat stat-present">✅ ${st.present}</span>
    <span class="student-summary-stat stat-absent">❌ ${st.absent}</span>
  </div>`;
  }).join('') || `<div style="text-align:center;padding:30px;color:var(--text-muted)">لا توجد بيانات بعد</div>`;

  // تحديث حالة الراتب — للأدمين فقط
  const payBar = document.getElementById('payment-status-bar');
  if (payBar) payBar.style.display = isTeacherMode ? 'none' : 'flex';
  if (!isTeacherMode) loadTeacherPaymentStatus();

  document.getElementById('summary-modal').classList.add('open');
};

window.closeSummaryModal = () => {
  document.getElementById('summary-modal').classList.remove('open');
};

// ─── حالة راتب الأستاذ ───
async function loadTeacherPaymentStatus() {
  if (!currentAttTeacherId) return;
  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  try {
const snap = await getDoc(doc(db, 'teacherPayments', `${currentAttTeacherId}_${monthKey}`));
const isPaid = snap.exists() && snap.data().paid === true;
updatePaymentUI(isPaid);
  } catch(e) { updatePaymentUI(false); }
}

function updatePaymentUI(isPaid) {
  const chip = document.getElementById('payment-chip');
  const btn  = document.getElementById('payment-toggle-btn');
  if (!chip || !btn) return;
  if (isPaid) {
chip.className = 'payment-chip paid';
chip.textContent = '✅ تم الصرف';
btn.style.background = 'linear-gradient(135deg,var(--danger),#B91C1C)';
btn.textContent = '↩️ إلغاء الصرف';
  } else {
chip.className = 'payment-chip unpaid';
chip.textContent = '⏳ لم يُصرف بعد';
btn.style.background = 'linear-gradient(135deg,var(--success),#059669)';
btn.textContent = '✅ تأكيد الصرف';
  }
}

window.toggleTeacherPayment = async () => {
  if (!currentAttTeacherId) return;
  const monthKey = new Date().toISOString().slice(0, 7);
  const docRef = doc(db, 'teacherPayments', `${currentAttTeacherId}_${monthKey}`);
  try {
const snap = await getDoc(docRef);
const isPaid = snap.exists() && snap.data().paid === true;
await setDoc(docRef, {
  teacherId: currentAttTeacherId,
  month: monthKey,
  paid: !isPaid,
  updatedAt: serverTimestamp()
});
updatePaymentUI(!isPaid);
const t = allTeachers.find(x => x.id === currentAttTeacherId) || currentTeacherData;
await addLog(!isPaid ? '💰 صرف راتب' : '↩️ إلغاء صرف', `${t?.name || 'أستاذ'} — ${monthKey}`, '💸');
showToast(!isPaid ? '✅ تم تسجيل صرف الراتب' : '↩️ تم إلغاء الصرف');
  } catch(e) { showToast('خطأ: ' + e.message, true); }
};

// ─── Welcome modal for teacher ───
window.confirmTeacherPresence = () => {
  document.getElementById('welcome-modal').classList.remove('open');
  // القائمة تظهر مباشرة في الصفحة — لا حاجة لفتح modal
  // scrollToAttendance بعد لحظة قصيرة
  setTimeout(() => {
const grid = document.getElementById('teachers-grid');
if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 350);
};

// ─── Admin log ───
async function addLog(title, detail, icon) {
  const entry = { title, detail, icon, createdAt: serverTimestamp() };
  try { await addDoc(collection(db, 'adminLog'), entry); } catch(e) {}
}
function loadAdminLog() {
  onSnapshot(query(collection(db, 'adminLog'), orderBy('createdAt', 'desc')), snap => {
const list = document.getElementById('admin-log-list');
if (!snap.docs.length) {
  list.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:13px">لا توجد نشاطات بعد</div>`;
  return;
}
list.innerHTML = '';
snap.docs.slice(0, 30).forEach(d => {
  const x = d.data();
  const dateStr = x.createdAt?.toDate ? x.createdAt.toDate().toLocaleString('ar-DZ') : '';
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <div class="log-icon-wrap" style="background:var(--primary-light)">${x.icon || '📌'}</div>
    <div class="log-content">
      <div class="log-title">${x.title}</div>
      <div class="log-meta">${x.detail} — ${dateStr}</div>
    </div>`;
  list.appendChild(entry);
});
  });
}

// Initialize teachers when section is opened (lazy)
const _origSwitch = window.switchNavSection;
window.switchNavSection = (section) => {
  _origSwitch(section);
  // سجل النشاطات للأدمين فقط
  if (section === 'teachers' && !isTeacherMode) loadAdminLog();
};
