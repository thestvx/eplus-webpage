// ═══════════════════════════════════════════════════════════
// admin.js — لوحة الإدارة، أكاديمية E-PLUS
// تم تجميعه من 3 كتل <script> في الملف الأصلي
// ملاحظة: هذا الملف يحتوي على ES Module imports، لذا يجب
// تحميله في HTML عبر: <script type="module" src="admin.js"></script>
// ═══════════════════════════════════════════════════════════

/* ─────────────── [الجزء 1] نظام المصادقة + لوحة التحكم الرئيسية ─────────────── */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, setDoc, getDoc, getDocs, query, orderBy, where, onSnapshot, serverTimestamp, Timestamp, writeBatch, limit } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
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
window._auth = auth;
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

// كشف المتغيرات للـ modules الأخرى
window._secondaryAuth = secondaryAuth;
window._signOut = signOut;
window._signInWithEmailAndPassword = signInWithEmailAndPassword;
window._mainDb = db; // مشاركة db مع باقي الـ modules (Finance, etc.)

// Date in topbar
const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const now = new Date();
document.getElementById('topbar-date').textContent = `${days[now.getDay()]}، ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

// ── Flag لمنع تحميل قائمة الأساتذة كاملة عند دخول أستاذ ──
let isTeacherMode = false;


// ─── إعدادات حسابات الموظفين ───
const EMPLOYEES = {
  'hafnaouilanez@epluscenter.com': {
    uid: 'hosccL14t9cSAI0MP1BcUZ7xr7Y2',
    name: 'الحفناوي العانز',
    role: 'موظف',
    allowedSections: ['home', 'summer', 'teachers', 'msgs', 'finance', 'settings'],
    showWebsite: true,
    restrictions: {
      noDeleteTicket: true,
      noEditTicket: true,
      noDeleteMsg: true,
      noClearMsg: true,
      noAddTeacher: true,
      noEditTeacher: true,
      noDeleteTeacher: true,
      noMaintenanceToggle: true,
      noActivityLog: true,
      teachersReadOnly: true,
    }
  }
};

function applyEmployeeMode(cfg) {
  window._employeeRestrictions = cfg.restrictions;

  // ── الـ sidebar: إظهار الأقسام المسموحة فقط ──
  const navItems = document.querySelectorAll('.nav-item');
  // ترتيب navItems: 0=home,1=announcements,2=summer,3=teachers,4=msgs,5=finance,6=settings,7=website
  const navMap = [
    { section: 'home' },
    { section: 'announcements' },
    { section: 'summer' },
    { section: 'teachers' },
    { section: 'msgs' },
    { section: 'finance' },
    { section: 'settings' },
    { section: 'website' },
  ];
  navItems.forEach((el, i) => {
    const sec = navMap[i]?.section;
    if (!sec) return;
    if (sec === 'website') { el.style.display = cfg.showWebsite ? '' : 'none'; return; }
    el.style.display = cfg.allowedSections.includes(sec) ? '' : 'none';
  });
  document.querySelectorAll('.nav-section').forEach(el => el.style.display = '');

  // ── إخفاء سجل النشاطات ──
  if (cfg.restrictions.noActivityLog) {
    const lp = document.getElementById('admin-log-panel');
    if (lp) lp.style.display = 'none';
  }

  // ── إخفاء بطاقة الصيانة ──
  if (cfg.restrictions.noMaintenanceToggle) {
    const mc = document.getElementById('maintenance-card');
    if (mc) mc.style.display = 'none';
  }

  // ── قسم الأساتذة: إخفاء نموذج الإضافة/التعديل ──
  if (cfg.restrictions.noAddTeacher) {
    const tfp = document.querySelector('.teacher-form-panel');
    if (tfp) tfp.style.display = 'none';
  }

  // ── إخفاء أزرار الحذف في التذاكر ──
  if (cfg.restrictions.noDeleteTicket) {
    document.querySelectorAll('.tbl-action.del').forEach(b => b.style.display = 'none');
  }

  // ── تعطيل تعديل وحذف الأساتذة من جدول الأساتذة ──
  if (cfg.restrictions.noEditTeacher || cfg.restrictions.noDeleteTeacher) {
    // نراقب تحديثات DOM في قسم الأساتذة
    const observer = new MutationObserver(() => {
      if (cfg.restrictions.noDeleteTeacher)
        document.querySelectorAll('button[onclick*="deleteTeacher"]').forEach(b => b.style.display = 'none');
      if (cfg.restrictions.noEditTeacher)
        document.querySelectorAll('button[onclick*="editTeacher"]').forEach(b => b.style.display = 'none');
      if (cfg.restrictions.noDeleteTicket)
        document.querySelectorAll('.tbl-action.del').forEach(b => b.style.display = 'none');
      if (cfg.restrictions.noDeleteMsg || cfg.restrictions.noClearMsg)
        document.querySelectorAll('button[onclick*="_deleteMsg"], .msg-clear-btn, button[onclick*="clearRoom"]').forEach(b => b.style.display = 'none');
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── تعطيل دوال الحذف/التعديل مباشرة ──
  if (cfg.restrictions.noDeleteTicket) {
    window.deleteTicket = () => showToast('⛔ ليس لديك صلاحية حذف التذاكر', true);
  }
  if (cfg.restrictions.noDeleteTeacher) {
    window.deleteTeacher = () => showToast('⛔ ليس لديك صلاحية حذف الأساتذة', true);
  }
  if (cfg.restrictions.noEditTeacher) {
    window.editTeacher = () => showToast('⛔ ليس لديك صلاحية تعديل بيانات الأستاذ', true);
    window.addTeacher  = () => showToast('⛔ ليس لديك صلاحية إضافة أستاذ', true);
  }
  if (cfg.restrictions.noMaintenanceToggle) {
    window.toggleMaintenance = () => showToast('⛔ ليس لديك صلاحية تغيير حالة الصيانة', true);
    const mc = document.getElementById('btn-maintenance');
    if (mc) { mc.disabled = true; mc.style.opacity = '0.4'; mc.style.cursor = 'not-allowed'; }
  }
  if (cfg.restrictions.noDeleteMsg || cfg.restrictions.noClearMsg) {
    window._deleteMsg  = () => showToast('⛔ ليس لديك صلاحية حذف الرسائل', true);
    window.clearRoom   = () => showToast('⛔ ليس لديك صلاحية مسح المحادثة', true);
  }

  // ── الانتقال للقسم الأول المتاح ──
  switchNavSection(cfg.allowedSections[0] || 'home');
}

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
        window.setGreeting(td.name || user.email);
        // إخفاء عناصر الأدمين، إظهار قسم الأساتذة فقط
        document.querySelectorAll('.nav-item').forEach(el => el.style.display = 'none');
        if (document.getElementById('nav-finance')) document.getElementById('nav-finance').style.display = 'none';
        const teacherNav = document.querySelectorAll('.nav-item')[3];
        if (teacherNav) { teacherNav.style.display = 'flex'; teacherNav.classList.add('active'); }
        // إظهار زر الرسائل للأستاذ أيضاً
        const msgsNav = document.querySelectorAll('.nav-item')[4];
        if (msgsNav) { msgsNav.style.display = 'flex'; }
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
        // إخفاء البانر البنفسجي كاملاً في حساب الأستاذ
        const teachersHero = document.getElementById('teachers-hero');
        if (teachersHero) teachersHero.style.display = 'none';
        // عرض نافذة الترحيب
        currentTeacherData = { uid: user.uid, id: user.uid, ...td };
        window.currentTeacherData = currentTeacherData;
        document.getElementById('welcome-teacher-name').textContent = `أهلاً استاذ ${td.name} .. يوم سعيد 🌟`;
        document.getElementById('welcome-modal').classList.add('open');
        // تحميل بيانات الأستاذ
        loadTeacherStudentsView(user.uid, td);
        loadTickets(); // نحتاج بيانات التذاكر لعرض حالة الدفع في قائمة الحضور
        // تهيئة نظام الرسائل للأستاذ
        setTimeout(() => { if (window.initMessaging) window.initMessaging(user.uid, td.name || user.email, false); }, 800);
        return;
      }
    } catch(e) { console.warn('Teacher check error:', e); }
    // ── فحص هل هو موظف ──
    const empCfg = EMPLOYEES[user.email];
    isTeacherMode = false;
    ls.classList.add('hidden');
    setTimeout(() => ls.style.display = 'none', 600);
    dash.style.display = 'flex';
    const uname = empCfg ? empCfg.name : user.email.split('@')[0];
    document.getElementById('admin-name').textContent = uname;
    window.setGreeting(uname);
    document.querySelector('.admin-role').textContent = empCfg ? ('👔 ' + empCfg.role) : 'مشرف النظام';
    // إعادة إظهار جميع عناصر الأدمين
    document.querySelectorAll('.nav-item').forEach(el => el.style.display = '');
    document.querySelectorAll('.nav-section').forEach(el => el.style.display = '');
    const mc = document.getElementById('maintenance-card');
    if (mc) mc.style.display = '';
    const tfp = document.querySelector('.teacher-form-panel');
    if (tfp) tfp.style.display = '';
    const lp = document.getElementById('admin-log-panel');
    if (lp) lp.style.display = '';
    // تحميل البيانات
    loadRegistrations();
    loadVisitorStats();
    loadMaintenanceStatus();
    loadAnnouncements();
    loadTickets();
    loadTeachers();
    const isEmpAdmin = !empCfg; // الأدمين الحقيقي فقط
    setTimeout(() => { if (window.initMessaging) window.initMessaging(user.uid, empCfg ? empCfg.name : 'الإدارة', isEmpAdmin); }, 800);
    if (empCfg) {
      // وضع الموظف — تطبيق الصلاحيات بعد تحميل البيانات
      setTimeout(() => applyEmployeeMode(empCfg), 500);
    } else {
      // وضع الأدمين الكامل
      switchNavSection('home');
    }
  } else {
    isTeacherMode = false;
    ls.style.display = 'flex';
    ls.classList.remove('hidden');
    dash.style.display = 'none';
  }
});

window.syncEmailInp = () => {
  const user = document.getElementById('email-user-inp').value.trim();
  document.getElementById('email-inp').value = user ? user + '@epluscenter.com' : '';
};

window.doLogin = async () => {
  syncEmailInp();
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
  ['home','announcements','summer','teachers','finance','settings'].forEach(s => {
    const el = document.getElementById('section-' + s);
    if (el) el.style.display = s === section ? 'block' : 'none';
  });
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const navMap = {home:0, announcements:1, summer:2, teachers:3, settings:5};
  const navItems = document.querySelectorAll('.nav-item');
  if (navMap[section] !== undefined) navItems[navMap[section]]?.classList.add('active');
  // Finance nav item by ID
  const finNav = document.getElementById('nav-finance');
  if (finNav) finNav.classList.toggle('active', section === 'finance');
  if (section === 'finance') {
    if (window.loadFinanceSection) window.loadFinanceSection();
    else setTimeout(() => window.loadFinanceSection?.(), 600);
  }
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
  if (!(await EPUI.confirm(msg, 'وضع الصيانة'))) return;
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
  if (!(await EPUI.confirm('⚠️ حذف الإعلان نهائياً؟', 'حذف الإعلان', { danger: true }))) return;
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

// ── اختيار برنامج بسعر ثابت (بدون فئات) ──
window.selectProgramFixed = (programName, price, btn) => {
  selectedProgram = programName;
  const packSel = document.getElementById('sc-pack-select');
  packSel.disabled = true;
  packSel.style.opacity = '0.35';
  packSel.value = '';
  document.getElementById('sc-pack').value = programName;
  document.getElementById('sc-amount').value = price;
  document.querySelectorAll('#program-btns .prog-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  // أخفِ فئة البرنامج (لأن السعر ثابت)
  document.getElementById('category-group').style.display = 'none';
  document.querySelectorAll('#category-btns .cat-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('reset-row').style.display = 'block';
  showToast(`✅ ${programName} — ${price.toLocaleString('ar-DZ')} دج`);
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
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzGcJb8TVAfyyGjlvbXKwsbELBeYI831KU09cpit7k4smSgZ0kRmSPhdjC_m4NO5tcw4g/exec';

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
    // ✅ حفظ بيانات الشيت لاستخدامها في نظام الحضور (تحديد مصدر التلاميذ وباقتهم)
    window._lastSheetRows = [...rows1, ...rows2];

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

  // ── 4b. تفعيل checkboxes اللغة تلقائياً حسب اللغات المختارة من الشيت ──
  // هذا يضمن أن حقل الملاحظة في التذكرة يحتوي على اللغات المختارة
  if (langsRaw) {
    const cbEn = document.getElementById('tick-lang-en');
    const cbFr = document.getElementById('tick-lang-fr');
    const cbEs = document.getElementById('tick-lang-es');
    const langsLower = langsRaw.toLowerCase();
    // إعادة تعيين أولاً
    if (cbEn) cbEn.checked = false;
    if (cbFr) cbFr.checked = false;
    if (cbEs) cbEs.checked = false;
    // تفعيل حسب ما هو موجود في القيمة
    if (cbEn && (langsLower.includes('الإنجليزية') || langsLower.includes('english') || langsLower.includes('انجليزية'))) cbEn.checked = true;
    if (cbFr && (langsLower.includes('الفرنسية') || langsLower.includes('français') || langsLower.includes('french') || langsLower.includes('فرنسية'))) cbFr.checked = true;
    if (cbEs && (langsLower.includes('الإسبانية') || langsLower.includes('español') || langsLower.includes('spanish') || langsLower.includes('اسبانية') || langsLower.includes('إسبانية'))) cbEs.checked = true;
    // تحديث واجهة chips اللغة
    if (typeof window.updateLangChips === 'function') window.updateLangChips();
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

// ── Language chips ──
window.toggleLangChip = (label) => {
  // Prevent double-toggle from label click + checkbox change
  const cb = label.querySelector('input[type=checkbox]');
  // The click on label will toggle checkbox automatically, just sync UI
  setTimeout(() => {
    updateLangChips();
  }, 0);
};

window.updateLangChips = () => {
  const chips = [
    { chip: document.getElementById('chip-en'), cb: document.getElementById('tick-lang-en') },
    { chip: document.getElementById('chip-fr'), cb: document.getElementById('tick-lang-fr') },
    { chip: document.getElementById('chip-es'), cb: document.getElementById('tick-lang-es') },
  ];
  const selected = [];
  chips.forEach(({ chip, cb }) => {
    if (cb && cb.checked) { if(chip) chip.classList.add('selected'); selected.push(cb.value); }
    else { if(chip) chip.classList.remove('selected'); }
  });
  const preview = document.getElementById('lang-preview');
  const previewText = document.getElementById('lang-preview-text');
  if (selected.length > 0) {
    if(preview) preview.style.display = 'block';
    if(previewText) previewText.textContent = selected.join(' + ');
    // تحديث حقل الملاحظة اليدوية تلقائياً
    const manualInp = document.getElementById('sc-note-manual');
    if (manualInp) manualInp.value = selected.join(' + ');
  } else {
    if(preview) preview.style.display = 'none';
  }
};

window.syncNoteFromManual = (val) => {
  const preview = document.getElementById('lang-preview');
  const previewText = document.getElementById('lang-preview-text');
  if (val.trim()) {
    if (preview) preview.style.display = 'block';
    if (previewText) previewText.textContent = val.trim();
  } else {
    if (preview) preview.style.display = 'none';
  }
};

function getSelectedLanguages() {
  const langs = [];
  const cbEn = document.getElementById('tick-lang-en');
  const cbFr = document.getElementById('tick-lang-fr');
  const cbEs = document.getElementById('tick-lang-es');
  if (cbEn && cbEn.checked) langs.push('الإنجليزية');
  if (cbFr && cbFr.checked) langs.push('الفرنسية');
  if (cbEs && cbEs.checked) langs.push('الإسبانية');
  if (langs.length > 0) return langs.join(' + ');
  // fallback: الحقل اليدوي
  const manual = (document.getElementById('sc-note-manual') || {}).value || '';
  return manual.trim();
}

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
  const note = getSelectedLanguages();
  const now = new Date();
  const dateRaw = now.toISOString().split('T')[0];
  const status = 'paid';
  if (!name || !pack || !amount) { showToast('يرجى ملء الحقول الإلزامية', true); return; }
  const btn = document.getElementById('sc-gen-btn');
  btn.disabled = true; btn.textContent = '⏳ جاري التوليد...';
  const receipt = generateReceiptNumber();
  currentReceipt = receipt;
  const verifyURL = `https://e-plus-center.pages.dev/verify.html?r=${receipt}`;
  const dateFormatted = dateRaw ? new Date(dateRaw).toLocaleDateString('ar-DZ',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : '—';
  try {
    const fullPrice = parseFloat(document.getElementById('sc-full-price').value) || 0;
    const paidCalc = parseFloat(document.getElementById('sc-paid-amount').value) || 0;
    const remainingAmount = fullPrice > 0 ? Math.max(0, fullPrice - paidCalc) : 0;
    const paidAmount = Number(amount);
    const finalFullPrice = fullPrice > 0 ? fullPrice : paidAmount;

    // ── حفظ التذكرة في summerTickets والحصول على ticketId ──
    const ticketRef = await addDoc(collection(db,'summerTickets'), {
      name, pack, amount: paidAmount,
      fullPrice: finalFullPrice,
      remainingAmount, date: dateRaw, status, receipt, note, verifyURL,
      financeSynced: false,
      createdAt: serverTimestamp()
    });
    const ticketId = ticketRef.id;

    // ── تسجيل المبلغ في الموارد المالية (مع ticketId لمنع التكرار) ──
    if (paidAmount > 0) {
      try {
        await addDoc(collection(db,'financeTx'), {
          type: 'income',
          desc: `☀️ تذكرة مخيم — ${name} (${pack})`,
          amount: paidAmount,
          date: dateRaw,
          receipt,
          ticketId,
          source: 'summer_ticket',
          createdAt: serverTimestamp()
        });
        // وضع علامة أن التذكرة مسجّلة مالياً
        await updateDoc(ticketRef, { financeSynced: true }).catch(() => {});
        console.log('✅ financeTx saved for', name, paidAmount, 'ticketId:', ticketId);
      } catch(finErr) {
        console.error('financeTx save failed:', finErr.code, finErr.message);
        showToast('⚠️ التذكرة حُفظت لكن المبلغ لم يُسجَّل في الموارد المالية — ' + finErr.message, true);
      }
    }

    drawTicketOnCanvas({ name, pack, amount, dateRaw, dateFormatted, status, receipt, remainingAmount, note }, null, btn, verifyURL);
  } catch(e) { showToast('خطأ: ' + e.message, true); btn.disabled = false; btn.textContent = '🎟️ توليد التذكرة وحفظها'; }
};

function drawTicketOnCanvas(data, qrCanvas, btn, verifyURL) {
  const canvas = document.getElementById('ticket-canvas');
  // ticketeplus.png — 2480 × 1063 px @ 72 PPI (landscape)
  const W = 2480, H = 1063;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const img = new Image();
  img.src = 'images/ticketeplus.png?v=' + Date.now();
  img.onload = () => {
    // خلفية بيضاء أولاً لمنع الشفافية من الظهور كأزرق عند الطباعة
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);

    // ══════════════════════════════════════════════════════════
    // إحداثيات مستخرجة بدقة بكسل من تحليل ticketeplus.png
    // Canvas: 2480 × 1063 px
    //
    // كل قيمة تُكتب على يسار الـ label مباشرة (textAlign=right)
    // baseline = y الوسطي لنص الـ label المستخرج من الصورة
    //
    //  الحقل            baseline  rightEdge  maxW
    //  الاسم واللقب      348       2204       700
    //  اسم الباقة        444       2250       900
    //  المبلغ             556       2324       480
    //  المبلغ المتبقي     556       1935       450
    //  التاريخ            675       2314       900
    //  رقم الوصل         771       2247       900
    // ══════════════════════════════════════════════════════════

    const CLR = '#0D2080';

    // ══════════════════════════════════════════════════════════════════
    // إحداثيات محسوبة بدقة بكسل من ticketeplus.png (2480×1063)
    // المعلومات على اليسار — القيم تُكتب يمين الـ label (textAlign=left)
    //
    //  الحقل             y      leftEdge   maxW
    //  الاسم واللقب     248      651        1789
    //  اسم الباقة       345      654        1786
    //  المبلغ           460      651        1789
    //  المبلغ المتبقي   460      382        450
    //  التاريخ          580      650        1790
    //  رقم الوصل        679      650        1790
    // ══════════════════════════════════════════════════════════════════

    // القيم تُكتب يسار كل label (textAlign=right, rightEdge = label_xStart - 20)
    const val = (txt, rightEdge, baseline, maxW, font, color) => {
      ctx.save();
      ctx.font = font || 'bold 36px Tajawal, Arial';
      ctx.fillStyle = color || CLR;
      ctx.textAlign = 'right';
      let t = String(txt || '—');
      while (ctx.measureText(t).width > maxW && t.length > 1) t = t.slice(0, -1);
      ctx.fillText(t, rightEdge, baseline);
      ctx.restore();
    };

    val(data.name,
        384, 218, 344, 'bold 36px Tajawal, Arial');

    val(data.pack,
        428, 315, 388, 'bold 32px Tajawal, Arial');

    val(Number(data.amount || 0).toLocaleString('ar-DZ') + ' دج',
        502, 430, 462, 'bold 32px Tajawal, Arial');

    val(data.dateFormatted || '—',
        493, 550, 453, 'bold 32px Tajawal, Arial');

    val(data.receipt || '—',
        427, 649, 387, 'bold 28px monospace');

    // ── المبلغ المتبقي — سطر مستقل y=490 (بين المبلغ والتاريخ) ──
    const remainingAmtDraw = data.remainingAmount !== undefined
      ? data.remainingAmount
      : (() => {
          const full = parseFloat(document.getElementById('sc-full-price').value) || 0;
          const paid = parseFloat(document.getElementById('sc-paid-amount').value) || 0;
          return full > 0 ? Math.max(0, full - paid) : 0;
        })();

    val(Number(remainingAmtDraw).toLocaleString('ar-DZ') + ' دج',
        357, 490, 317,
        'bold 28px Tajawal, Arial',
        remainingAmtDraw > 0 ? '#DC2626' : CLR);

    // ── الملاحظة (اللغة المختارة) — نفس baseline حقل ملاحظة: y=700, rightEdge=483 ──
    if (data.note) {
      val(data.note,
          483, 700, 360,
          'bold 30px Tajawal, Arial',
          '#14B8A6');
    }

    document.getElementById('ticket-empty').style.display = 'none';
    document.getElementById('ticket-canvas-wrap').style.display = 'block';
    if (btn) { btn.disabled = false; btn.textContent = '🎟️ توليد التذكرة وحفظها'; }
    showToast('🎉 تم توليد التذكرة وحفظها بنجاح!');
  };

  img.onerror = () => {
    ctx.fillStyle = '#1a0533'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'right';
    ctx.fillText('⚠️ images/ticketeplus.png غير موجودة', W - 60, 100);
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

// ─── نظام طباعة التذكرة المحسّن ───
let _printMode = 'single'; // 'single' | 'double'

window.setPrintMode = (mode) => {
  _printMode = mode;
  document.getElementById('pmt-single').classList.toggle('active', mode === 'single');
  document.getElementById('pmt-double').classList.toggle('active', mode === 'double');
  _buildPrintPreview();
};

function _buildPrintPreview() {
  const canvas = document.getElementById('ticket-canvas');
  const dataURL = canvas.toDataURL('image/png');
  const page = document.getElementById('print-preview-page');

  if (_printMode === 'single') {
    page.className = 'print-preview-page a4-landscape';
    page.innerHTML = `<div class="preview-ticket-single"><img src="${dataURL}" alt="ticket"></div>`;
  } else {
    page.className = 'print-preview-page a4-landscape';
    page.innerHTML = `<div class="preview-ticket-double"><img src="${dataURL}" alt="ticket"><img src="${dataURL}" alt="ticket"></div>`;
  }
}

window.openPrintPreview = () => {
  const canvas = document.getElementById('ticket-canvas');
  if (!canvas || canvas.width === 0) { showToast('⚠️ لا توجد تذكرة للطباعة', true); return; }
  _printMode = 'single';
  document.getElementById('pmt-single').classList.add('active');
  document.getElementById('pmt-double').classList.remove('active');
  _buildPrintPreview();
  document.getElementById('print-preview-modal').classList.add('open');
};

window.closePrintPreview = () => {
  document.getElementById('print-preview-modal').classList.remove('open');
};

window.executePrint = () => {
  const srcCanvas = document.getElementById('ticket-canvas');
  if (!srcCanvas || srcCanvas.width === 0) { showToast('⚠️ لا توجد تذكرة للطباعة', true); return; }
  const isDouble = _printMode === 'double';

  // ══════════════════════════════════════════════════════════════════
  // التذكرة: 2480 × 1063 px (landscape)
  // نطبع مباشرة بدون دوران — نستخدم @page landscape
  // الصورة تُضمّن كـ dataURL في popup → Chrome يحترم landscape لأن
  // الـ img نفسه عريض (2480 > 1063) ويملأ الصفحة أفقياً
  // ══════════════════════════════════════════════════════════════════

  const dataURL = srcCanvas.toDataURL('image/png');
  const count = isDouble ? 2 : 1;

  let imgs = '';
  for (let i = 0; i < count; i++) {
    imgs += `<img src="${dataURL}" style="display:block;width:100%;${count===2?'height:48vh;':'height:95vh;'}object-fit:contain;object-position:center;">`;
    if (i === 0 && count === 2) imgs += '<div style="height:2vh"></div>';
  }

  const ST = '<scr'+'ipt>', SE = '<\/scr'+'ipt>';

  // ══════════════════════════════════════════════════════════════════
  // نبني HTML الطباعة:
  // - @page landscape لكل المتصفحات
  // - الصورة بـ width:100vw height:100vh object-fit:contain
  // - meta viewport يجبر الـ layout على landscape
  // - CSS transform fallback لو المتصفح ما احترمش @page
  // ══════════════════════════════════════════════════════════════════
  const html = '<!DOCTYPE html>'
    + '<html><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=297mm,height=210mm">'
    + '<style>'
    + '@page{size:297mm 210mm landscape;margin:0}'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'html,body{'
    +   'width:297mm;height:210mm;'
    +   'overflow:hidden;background:#fff;'
    +   '-webkit-print-color-adjust:exact!important;'
    +   'print-color-adjust:exact!important;'
    +   'display:flex;align-items:center;justify-content:center'
    + '}'
    + '.ticket-wrap{width:297mm;height:210mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:' + (isDouble?'4mm':'0') + '}'
    + '.ticket-img{display:block;max-width:297mm;max-height:' + (isDouble?'100mm':'210mm') + ';width:auto;height:auto;object-fit:contain}'
    + '@media print{'
    +   '@page{size:297mm 210mm landscape;margin:0}'
    +   'html,body{width:297mm;height:210mm}'
    + '}'
    + '</style>'
    + '</head><body>'
    + '<div class="ticket-wrap">'
    + imgs.replace(/style="[^"]*"/g, 'class="ticket-img"')
    + '</div>'
    + ST
    + '(function(){'
    +   'function doPrint(){'
    +     'window.print();'
    +   '}'
    +   'var images=document.querySelectorAll("img");'
    +   'var total=images.length,done=0;'
    +   'if(!total){setTimeout(doPrint,500);return;}'
    +   'images.forEach(function(img){'
    +     'function onDone(){done++;if(done>=total)setTimeout(doPrint,300);}'
    +     'if(img.complete&&img.naturalWidth>0)onDone();'
    +     'else{img.onload=onDone;img.onerror=onDone;}'
    +   '});'
    + '})();'
    + SE
    + '</html>';

  const printWin = window.open('', '_blank', 'width=1120,height=800');
  if (!printWin) { showToast('⚠️ يرجى السماح بالنوافذ المنبثقة', true); return; }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
};


// إبقاء الاسم القديم للتوافق
window.printTicketCanvas = window.openPrintPreview;

window.copyReceiptNum = () => {
  if (currentReceipt) { navigator.clipboard.writeText(currentReceipt).then(() => showToast('📋 تم نسخ رقم الوصل: ' + currentReceipt)); }
};

// store tickets globally for export
let allTicketsData = [];

// ══════════════════════════════════════════════════════════════
// 🎯 توحيد الأسماء — يحل مشكلة ترتيب الاسم واللقب
//    "فاروق كير" === "كير فاروق" دائماً
// ══════════════════════════════════════════════════════════════
function normalizeName(n) {
  return String(n || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[آأإ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىيئ]/g, "ي")
    .toLowerCase();
}

function matchNames(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;
  const sa = na.split(" ").sort().join(" ");
  const sb = nb.split(" ").sort().join(" ");
  if (sa === sb) return true;
  const wa = na.split(" ").filter(w => w.length > 1);
  const wb = nb.split(" ").filter(w => w.length > 1);
  if (wa.length > 0 && wb.length > 0) {
    if (wa.every(w => wb.some(x => x === w || x.includes(w) || w.includes(x)))) return true;
    if (wb.every(w => wa.some(x => x === w || x.includes(w) || w.includes(x)))) return true;
  }
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

let _ticketsSearchVal = '';
let _ticketsFilterVal = 'all';

// ─── بناء صفوف جدول التذاكر ───
function renderTicketRows(data) {
  const tbody = document.getElementById('tickets-tbody');
  if (!tbody) return;
  const norm = s => String(s || '').trim().toLowerCase();
  const q = norm(_ticketsSearchVal);
  const f = _ticketsFilterVal;

  // ── وضع سلة المحذوفات ──
  const isTrash = f === 'trash';
  const thStatus = document.getElementById('th-status-col');
  if (thStatus) thStatus.textContent = isTrash ? 'حُذف بواسطة' : 'الحالة';

  let filtered = isTrash
    ? data.filter(x => x.deleted === true)
    : data.filter(x => !x.deleted);

  if (!isTrash) {
    filtered = q ? filtered.filter(x => norm(x.receipt).includes(q) || norm(x.name).includes(q)) : filtered;
    if (f === 'paid')           filtered = filtered.filter(x => x.status === 'paid');
    else if (f === 'pending')   filtered = filtered.filter(x => x.status !== 'paid');
    else if (f.startsWith('pack:')) { const pk=norm(f.slice(5)); filtered=filtered.filter(x=>norm(x.pack).includes(pk)); }
    else if (f === 'source:website') filtered = filtered.filter(x => x.receipt && x.receipt.trim() !== '');
    else if (f === 'source:manual')  filtered = filtered.filter(x => !x.receipt || x.receipt.trim() === '');
  } else {
    filtered = q ? filtered.filter(x => norm(x.receipt).includes(q) || norm(x.name).includes(q)) : filtered;
  }

  // تحديث badge عدد المحذوفات
  const trashCount = data.filter(x => x.deleted === true).length;
  const badge = document.getElementById('trash-count-badge');
  if (badge) { badge.textContent = trashCount; badge.style.display = trashCount > 0 ? 'inline' : 'none'; }

  tbody.innerHTML = '';
  if (!filtered.length) {
    const msg = isTrash ? '🎉 سلة المحذوفات فارغة' : (q ? '🔍 لا توجد نتائج مطابقة' : '📭 لم يتم إصدار أي تذاكر بعد');
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">${msg}</td></tr>`;
    return;
  }
  filtered.forEach(x => {
    const remaining = Number(x.remainingAmount || 0);
    const dateStr   = x.date ? new Date(x.date).toLocaleDateString('ar-DZ') : '—';
    const tr = document.createElement('tr');
    if (isTrash) tr.style.cssText = 'opacity:0.75;background:rgba(239,68,68,0.03)';

    const statusCell = isTrash
      ? `<span style="font-size:12px;font-weight:700;color:#DC2626">${x.deletedBy || 'مشرف'}</span>`
      : (x.status === 'paid'
          ? '<span class="status-paid">✅ مفعّلة</span>'
          : '<span class="status-pending">⏳ قيد المراجعة</span>');

    const actionsCell = isTrash
      ? `<button class="tbl-action" onclick="restoreTicket('${x.id}')" style="background:rgba(16,185,129,0.1);color:#059669;border-color:rgba(16,185,129,0.3)">↩️ استرجاع</button>`
      : `<button class="tbl-action view" onclick="previewFromDB('${x.id}')">👁️ عرض</button>
         <button class="tbl-action" onclick="openEditTicketModal('${x.id}')" style="background:var(--primary-light);color:var(--primary);border-color:var(--border-2)">✏️ تعديل</button>
         <button class="tbl-action del" onclick="deleteTicket('${x.id}')">🗑️</button>`;

    const isWebSource = x.receipt && x.receipt.trim() !== '';
    const sourceCell = isWebSource
      ? '<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:99px;background:rgba(20,184,166,0.1);color:var(--teal);border:1px solid rgba(20,184,166,0.25);white-space:nowrap">🌐 موقع</span>'
      : '<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:99px;background:var(--primary-light);color:var(--primary);border:1px solid var(--border-2);white-space:nowrap">✏️ يدوي</span>';
    tr.innerHTML = `
      <td><span class="receipt-code">${x.receipt || '—'}</span></td>
      <td style="font-weight:700;color:var(--text)">${x.name || '—'}</td>
      <td><span class="pack-chip">${x.pack || '—'}</span></td>
      <td><span class="amount-badge">${Number(x.amount || 0).toLocaleString('ar-DZ')} دج</span></td>
      <td>${remaining > 0
        ? `<span style="font-size:12px;font-weight:800;padding:4px 10px;border-radius:99px;background:rgba(239,68,68,0.1);color:#DC2626">${Number(remaining).toLocaleString('ar-DZ')} دج</span>`
        : '<span style="font-size:12px;font-weight:800;padding:4px 10px;border-radius:99px;background:rgba(16,185,129,0.1);color:#059669">✅ مكتمل</span>'}</td>
      <td style="color:var(--text-muted)">${dateStr}</td>
      <td>${statusCell}</td>
      <td>${sourceCell}</td>
      <td style="display:flex;gap:6px">${actionsCell}</td>`;
    tbody.appendChild(tr);
  });
}

// ─── فلترة الجدول عند الكتابة ───
window.filterTicketsTable = (val) => { _ticketsSearchVal = val; renderTicketRows(allTicketsData); };
window.setTicketFilter = (val, btn) => {
  _ticketsFilterVal = val;
  document.querySelectorAll('#tickets-filter-bar .ticket-filter-btn').forEach(b => b.classList.remove('active','active-green','active-amber'));
  if (btn) { if(val==='paid') btn.classList.add('active-green'); else if(val==='pending') btn.classList.add('active-amber'); else btn.classList.add('active'); }
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
    window._allTicketsData = allTicketsData; // expose for edit modal
    window.allTicketsData = allTicketsData; // expose for SOV panel
    // تحديث الموارد المالية إذا كانت محمّلة — لضمان التزامن الفوري مع المخيم
    if (typeof window.renderFinanceKPIs === 'function') window.renderFinanceKPIs();
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
    allTicketsData.forEach(x => {
      if (x.deleted) return; // تجاهل المحذوفات في الإحصائيات
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
    const activeTickets = allTicketsData.filter(x => !x.deleted);
    const tsmA=document.getElementById('tsm-active'), tsmP=document.getElementById('tsm-pending'), tsmT=document.getElementById('tsm-total-amount');
    if(tsmA) tsmA.textContent=paid;
    if(tsmP) tsmP.textContent=pending;
    if(tsmT) tsmT.textContent=activeTickets.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.amount||0),0).toLocaleString('ar-DZ')+' دج';
    updateSummerStats(activeTickets.length, paid, pending);
    updateFinancialStats(activeTickets.length, paid, studentsWithRemaining, totalExpected, totalCollected, totalRemaining);
    document.getElementById('nav-badge-summer').textContent = activeTickets.length;
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
  const pct          = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const remainingPct = totalExpected > 0 ? Math.round((totalRemaining / totalExpected) * 100) : 0;

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
  document.getElementById('fc-remaining-sub').textContent        = '⚠️ ' + remainingPct + '% من الإجمالي';

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

// ── سجل نشاط: تسجيل كل عملية ──
async function logActivity(action, ticketId, details) {
  try {
    const adminName = document.getElementById('topbar-greeting')?.getAttribute('data-name') || 'مشرف';
    await addDoc(collection(db, 'ticketActivityLogs'), {
      action,       // "delete" | "restore" | "edit" | "create"
      ticketId,
      adminName,
      details,
      timestamp: serverTimestamp()
    });
  } catch(e) { console.warn('logActivity error:', e); }
}

// ── Soft Delete: حذف آمن بدل الحذف النهائي ──
window.deleteTicket = async (id) => {
  const confirmed = await showDeleteConfirm();
  if (!confirmed) return;
  try {
    const snap = await getDoc(doc(db, 'summerTickets', id));
    const data = snap.exists() ? snap.data() : {};
    const adminName = document.getElementById('topbar-greeting')?.getAttribute('data-name') || 'مشرف';
    await updateDoc(doc(db, 'summerTickets', id), {
      deleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: adminName
    });
    await logActivity('delete', id, { name: data.name, receipt: data.receipt, pack: data.pack });
    showToast('🗑️ تم نقل التذكرة لسلة المحذوفات');
  } catch(e) { showToast('خطأ: ' + e.message, true); }
};

// ── استرجاع تذكرة من السلة ──
window.restoreTicket = async (id) => {
  try {
    const snap = await getDoc(doc(db, 'summerTickets', id));
    const data = snap.exists() ? snap.data() : {};
    await updateDoc(doc(db, 'summerTickets', id), {
      deleted: false,
      deletedAt: null,
      deletedBy: null
    });
    await logActivity('restore', id, { name: data.name, receipt: data.receipt });
    showToast('✅ تم استرجاع التذكرة بنجاح');
  } catch(e) { showToast('خطأ: ' + e.message, true); }
};

// ── نافذة تأكيد الحذف المخصصة ──
function showDeleteConfirm() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease';
    overlay.innerHTML = `
      <div style="background:var(--card-bg);border-radius:20px;padding:28px 32px;max-width:360px;width:90%;box-shadow:var(--shadow-lg);border:1px solid var(--border-2);text-align:center">
        <div style="font-size:42px;margin-bottom:12px">🗑️</div>
        <h3 style="font-size:17px;font-weight:800;color:var(--text);margin-bottom:8px">حذف التذكرة</h3>
        <p style="font-size:13px;color:var(--text-muted);line-height:1.6;margin-bottom:20px">سيتم نقل التذكرة إلى <strong>سلة المحذوفات</strong><br>ويمكنك استرجاعها في أي وقت</p>
        <div style="display:flex;gap:10px;justify-content:center">
          <button id="del-cancel" style="flex:1;padding:10px;border-radius:12px;border:1px solid var(--border-2);background:var(--card-bg);color:var(--text-2);font-size:14px;font-weight:700;font-family:'Tajawal',sans-serif;cursor:pointer">إلغاء</button>
          <button id="del-confirm" style="flex:1;padding:10px;border-radius:12px;border:none;background:#EF4444;color:white;font-size:14px;font-weight:800;font-family:'Tajawal',sans-serif;cursor:pointer">🗑️ حذف</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#del-confirm').onclick = () => { document.body.removeChild(overlay); resolve(true); };
    overlay.querySelector('#del-cancel').onclick  = () => { document.body.removeChild(overlay); resolve(false); };
    overlay.onclick = (e) => { if (e.target === overlay) { document.body.removeChild(overlay); resolve(false); } };
  });
}

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
    if (x.fullPrice) document.getElementById('sc-full-price').value = x.fullPrice;
    if (x.remainingAmount !== undefined) {
      document.getElementById('sc-paid-amount').value = x.amount || '';
      calcRemaining();
    }
    if (x.pack) {
      document.getElementById('program-group').style.display = 'none';
      document.getElementById('category-group').style.display = 'block';
      document.querySelector('#category-group label').textContent = '✅ الباقة المختارة: ' + x.pack;
    }
    currentReceipt = x.receipt;
    const btn = document.getElementById('sc-gen-btn');
    btn.disabled = true; btn.textContent = '⏳ جاري عرض التذكرة...';
    const dateFormatted = x.date ? new Date(x.date).toLocaleDateString('ar-DZ',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : '—';
    drawTicketOnCanvas({ name: x.name, pack: x.pack, amount: x.amount, dateRaw: x.date, dateFormatted, status: x.status, receipt: x.receipt, remainingAmount: x.remainingAmount, note: x.note || '' }, null, btn, x.verifyURL);
    document.getElementById('ticket-canvas').scrollIntoView({ behavior:'smooth', block:'start' });
  } catch(e) { showToast('خطأ في عرض التذكرة: ' + e.message, true); }
};

// ══════════════════════════════════════════════════════════════
// TEACHERS & ATTENDANCE SYSTEM
// ══════════════════════════════════════════════════════════════

const AR_DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
let allTeachers = [];
let currentTeacherData = null;
let currentAttTeacherId = null; window.currentAttTeacherId = null;
let currentAttStudents  = [];
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

// ════════════════════════════════════════
// ───────── نظام الأفواج (Groups) ─────────
// ════════════════════════════════════════
const GROUP_DAYS = ['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];

function buildGroupRow(containerId, groupData) {
  /* groupData = { name, days:[], students:[] } */
  const container = document.getElementById(containerId);
  const emptyEl = document.getElementById(containerId.replace('-list','-empty'));
  if (emptyEl) emptyEl.style.display = 'none';

  const idx = container.children.length;
  const g = groupData || { name: '', days: [], students: [] };

  const row = document.createElement('div');
  row.className = 'group-row';
  row.dataset.gidx = idx;

  // رسم الأيام
  const daysHtml = GROUP_DAYS.map(d =>
    `<button type="button" class="group-day-btn${(g.days||[]).includes(d)?' sel':''}" data-day="${d}" onclick="toggleGroupDay(this)">${d}</button>`
  ).join('');

  // رسم التلاميذ
  const studentsHtml = (g.students||[]).map((name,si) =>
    `<span class="group-student-chip" data-si="${si}"><span>${name}</span><button onclick="removeGroupStudent(this)" title="حذف">✕</button></span>`
  ).join('');

  row.innerHTML = `
    <div class="group-row-header">
      <span style="font-size:16px">🏫</span>
      <input class="group-name-inp" type="text" placeholder="اسم الفوج (مثال: فوج أ، مجموعة 1...)" value="${(g.name||'').replace(/"/g,'&quot;')}">
      <button class="group-del-btn" onclick="deleteGroupRow(this)" title="حذف الفوج">🗑️</button>
    </div>
    <div class="group-label-sm">📅 أيام الفوج</div>
    <div class="group-days-wrap">${daysHtml}</div>
    <div class="group-label-sm">👥 تلاميذ الفوج</div>
    <div class="group-students-area">${studentsHtml}</div>
    <div class="group-add-student-wrap" style="flex-wrap:wrap;position:relative">
      <div style="flex:1;position:relative;min-width:160px">
        <input class="inp" type="text" placeholder="اسم التلميذ..." style="width:100%;padding:7px 12px;font-size:13px"
          onkeydown="handleGroupStudentKey(event,this)"
          oninput="onGroupStudentTyping(this)">
        <div class="group-sheet-suggestions" style="display:none;position:absolute;top:100%;right:0;left:0;z-index:300;background:var(--card-bg);border:1.5px solid var(--border-2);border-radius:12px;box-shadow:0 8px 28px rgba(124,58,237,0.15);max-height:200px;overflow-y:auto;margin-top:4px"></div>
      </div>
      <button type="button" onclick="addGroupStudentFromInp(this.previousElementSibling.querySelector('input'))" style="padding:7px 14px;border-radius:10px;border:1.5px solid var(--border-2);background:var(--primary-light);color:var(--primary);font-size:12px;font-weight:800;cursor:pointer;font-family:'Tajawal',sans-serif;white-space:nowrap;flex-shrink:0">+ تلميذ</button>
    </div>`;

  container.appendChild(row);
}

window.addGroupRow = (containerId) => {
  buildGroupRow(containerId, null);
};

window.toggleGroupDay = (btn) => {
  btn.classList.toggle('sel');
};

window.deleteGroupRow = (btn) => {
  const row = btn.closest('.group-row');
  const container = row.parentElement;
  row.remove();
  const emptyId = container.id.replace('-list','-empty');
  const emptyEl = document.getElementById(emptyId);
  if (emptyEl && !container.children.length) emptyEl.style.display = 'block';
};

window.addGroupStudentFromInp = (inp) => {
  const name = inp.value.trim();
  if (!name) return;
  const area = inp.closest('.group-row').querySelector('.group-students-area');
  const chip = document.createElement('span');
  chip.className = 'group-student-chip';
  chip.innerHTML = `<span>${name}</span><button onclick="removeGroupStudent(this)" title="حذف">✕</button>`;
  area.appendChild(chip);
  inp.value = '';
};

window.removeGroupStudent = (btn) => {
  btn.closest('.group-student-chip').remove();
};

// ══════════════════════════════════════════════════
// AUTOCOMPLETE الأفواج من Google Sheet SummerPlus
// ══════════════════════════════════════════════════
let _sheetStudentsCache = null;
let _sheetStudentsLoading = false;

async function loadSheetStudentsCache() {
  if (_sheetStudentsCache !== null) return _sheetStudentsCache;
  if (_sheetStudentsLoading) {
    await new Promise(res => { const t = setInterval(() => { if(!_sheetStudentsLoading){clearInterval(t);res();} }, 100); });
    return _sheetStudentsCache || [];
  }
  _sheetStudentsLoading = true;
  try {
    const rows = await fetchSheetData(SHEET_ID_1, SHEET_NAME_1);
    // نحفظ objects كاملة — اسم + كل بيانات الصف
    _sheetStudentsCache = rows.map(r => {
      const first = String(r['الاسم'] || '').trim();
      const last  = String(r['اللقب'] || '').trim();
      const fullName = [first, last].filter(Boolean).join(' ');
      if (!fullName) return null;
      return {
        name:     fullName,
        pack:     String(r['الباقة'] || r['نوع البرنامج'] || r['الباقة المختارة'] || '').trim(),
        langs:    String(r['اللغة المختارة'] || r['اللغات'] || r['languages'] || '').trim(),
        age:      String(r['العمر'] || r['age'] || '').trim(),
        phone:    String(r['رقم هاتف ولي الأمر'] || r['رقم الهاتف'] || '').trim(),
        parent:   String(r['اسم ولي الأمر'] || '').trim(),
      };
    }).filter(Boolean);
    console.log('✅ Sheet cache loaded:', _sheetStudentsCache.length, 'students');
    return _sheetStudentsCache;
  } catch(e) {
    console.warn('⚠️ تعذّر تحميل بيانات الشيت:', e.message);
    _sheetStudentsCache = [];
    return [];
  } finally {
    _sheetStudentsLoading = false;
  }
}

// Pre-load cache in background when page is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => loadSheetStudentsCache(), 3000);
});

window.handleGroupStudentKey = (e, inp) => {
  const sugBox = inp.parentElement.querySelector('.group-sheet-suggestions');
  if (e.key === 'Escape') {
    if (sugBox) sugBox.style.display = 'none';
  } else if (e.key === 'Enter') {
    e.preventDefault();
    // إذا فيه suggestion مختار، استخدمه
    const highlighted = sugBox && sugBox.querySelector('[data-highlighted="true"]');
    if (highlighted) {
      inp.value = highlighted.dataset.name;
      sugBox.style.display = 'none';
    }
    addGroupStudentFromInp(inp);
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!sugBox || sugBox.style.display === 'none') return;
    const items = [...sugBox.querySelectorAll('[data-name]')];
    if (!items.length) return;
    const cur = items.findIndex(i => i.dataset.highlighted === 'true');
    items.forEach(i => delete i.dataset.highlighted);
    const next = e.key === 'ArrowDown' ? Math.min(cur + 1, items.length - 1) : Math.max(cur - 1, 0);
    const target = items[cur === -1 ? 0 : next];
    if (target) {
      target.dataset.highlighted = 'true';
      target.style.background = 'var(--primary-light)';
      target.scrollIntoView({ block: 'nearest' });
    }
  }
};

window.onGroupStudentTyping = async (inp) => {
  const q = inp.value.trim().toLowerCase();
  const sugBox = inp.parentElement.querySelector('.group-sheet-suggestions');
  if (!sugBox) return;

  if (q.length < 2) { sugBox.style.display = 'none'; return; }

  // أظهر loading مؤقت
  sugBox.innerHTML = `<div style="padding:10px 14px;font-size:12px;color:var(--text-muted);font-weight:700">⏳ جاري البحث...</div>`;
  sugBox.style.display = 'block';

  const allStudents = await loadSheetStudentsCache();

  if (inp.value.trim().toLowerCase() !== q) return; // تجاهل إذا تغيّر النص

  const matches = allStudents.filter(s => s.name.toLowerCase().includes(q)).slice(0, 10);

  if (!matches.length) {
    sugBox.innerHTML = `<div style="padding:10px 14px;font-size:12px;color:var(--text-muted);font-weight:700;text-align:center">❌ لا نتائج في الشيت</div>`;
    return;
  }

  const esc = s => s.replace(/"/g, '&quot;');
  const highlight = (text, q) => {
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return text.slice(0, idx) + `<mark style="background:rgba(124,58,237,0.15);color:var(--primary);border-radius:3px;padding:0 2px">${text.slice(idx, idx + q.length)}</mark>` + text.slice(idx + q.length);
  };

  sugBox.innerHTML = matches.map(s => `
    <div style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.12s"
      data-name="${esc(s.name)}"
      onmousedown="event.preventDefault()"
      onclick="selectGroupSuggestion(this, event)"
      onmouseenter="this.style.background='var(--primary-light)'"
      onmouseleave="this.style.background=''"
    >
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:${s.pack||s.langs||s.age?'4px':'0'}">
        <span style="font-size:14px">👤</span>
        <span style="font-size:13px;font-weight:800;color:var(--text)">${highlight(s.name, q)}</span>
      </div>
      ${s.pack||s.langs||s.age ? `<div style="display:flex;flex-wrap:wrap;gap:5px;padding-right:21px">
        ${s.pack ? `<span style="font-size:11px;padding:2px 8px;border-radius:99px;background:rgba(124,58,237,0.08);color:var(--primary);font-weight:700">📦 ${s.pack}</span>` : ''}
        ${s.langs ? `<span style="font-size:11px;padding:2px 8px;border-radius:99px;background:rgba(20,184,166,0.1);color:var(--teal);font-weight:700">🌍 ${s.langs}</span>` : ''}
        ${s.age ? `<span style="font-size:11px;padding:2px 8px;border-radius:99px;background:rgba(245,158,11,0.1);color:#92400e;font-weight:700">🎂 ${s.age} سنة</span>` : ''}
      </div>` : ''}
    </div>
  `).join('');
  sugBox.style.display = 'block';

  // إغلاق عند فقدان التركيز
  inp.onblur = () => setTimeout(() => { if (sugBox) sugBox.style.display = 'none'; }, 200);
};

window.selectGroupSuggestion = (el, e) => {
  e.stopPropagation();
  const name = el.dataset.name;
  const sugBox = el.closest('.group-sheet-suggestions');
  const inp = sugBox ? sugBox.previousElementSibling : null;
  if (!inp) return;
  inp.value = name;
  sugBox.style.display = 'none';
  addGroupStudentFromInp(inp);
};

function collectGroups(containerId) {
  const rows = document.querySelectorAll(`#${containerId} .group-row`);
  const groups = [];
  rows.forEach(row => {
    const name = row.querySelector('.group-name-inp').value.trim();
    const days = [...row.querySelectorAll('.group-day-btn.sel')].map(b => b.dataset.day);
    const students = [...row.querySelectorAll('.group-students-area .group-student-chip span:first-child')].map(s => s.textContent.trim());
    if (name) groups.push({ name, days, students });
  });
  return groups;
}

function populateGroupsList(containerId, groups) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const emptyEl = document.getElementById(containerId.replace('-list','-empty'));
  if (!groups || !groups.length) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  groups.forEach(g => buildGroupRow(containerId, g));
}
// ════════════════════════════════════════

window.addTeacher = async () => {
  const name = document.getElementById('t-name').value.trim();
  const email = document.getElementById('t-email').value.trim();
  const pass = document.getElementById('t-password').value;
  const spec = document.getElementById('t-spec').value.trim();
  const levels = document.getElementById('t-levels').value.trim();
  const days = getSelectedDays('t-days-picker');
  const groups = collectGroups('t-groups-list');
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
      name, email, spec, levels, days, groups,
      teacherId, uid,
      password: pass,
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
    document.getElementById('t-groups-list').innerHTML = '';
    document.getElementById('t-groups-empty').style.display = 'block';
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

// ─── بحث التلميذ عبر جميع الأساتذة ───
window.crossSearchStudent = async (rawVal) => {
  const val = (rawVal || '').trim().toLowerCase();
  const container = document.getElementById('cross-search-results');
  if (!container) return;

  if (val.length < 2) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'block';
  container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-weight:700">⏳ جاري البحث...</div>`;

  // ── 1. ابحث في allTeachers عن كل تلميذ يطابق الاسم ──
  const matches = []; // { teacher, student, groupName, groupIdx }
  for (const t of allTeachers) {
    const allStudents = t.students || [];
    const groups = t.groups || [];

    // ابحث بدون أفواج
    allStudents.forEach(s => {
      if (!s.name) return;
      if (!s.name.toLowerCase().includes(val)) return;
      // حدد الفوج
      let groupName = '—';
      let groupIdx = -1;
      groups.forEach((g, gi) => {
        if ((g.students || []).some(gs => gs.trim().toLowerCase() === s.name.trim().toLowerCase())) {
          groupName = g.name;
          groupIdx = gi;
        }
      });
      matches.push({ teacher: t, student: s, groupName, groupIdx });
    });
  }

  if (!matches.length) {
    container.innerHTML = `<div class="cs-no-result"><div style="font-size:36px;margin-bottom:10px">🔍</div><div style="font-weight:700">لم يُعثر على تلميذ بهذا الاسم</div><div style="font-size:12px;margin-top:4px">تأكد من الكتابة الصحيحة</div></div>`;
    return;
  }

  // ── 2. لكل تطابق: اجلب سجلات الحضور من Firestore ──
  const resultsHtml = await Promise.all(matches.map(async ({ teacher, student, groupName, groupIdx }) => {
    const tid = teacher.id;
    const groupSuffix = groupIdx >= 0 ? `_g${groupIdx}` : '_g0';

    let presentCount = 0, absentCount = 0, totalSessions = 0;
    try {
      const snap = await getDocs(
        query(collection(db, 'sessionAttendance'),
          where('teacherId', '==', tid + groupSuffix))
      );
      snap.forEach(d => {
        const data = d.data();
        const stuArr = data.students || [];
        const stuRec = stuArr.find(s => s.name?.trim().toLowerCase() === student.name?.trim().toLowerCase());
        if (stuRec !== undefined) {
          totalSessions++;
          if (stuRec.present) presentCount++;
          else absentCount++;
        }
      });
    } catch(e) {}

    // ── 3. ابحث في التذاكر عن حالة الدفع ──
    const ticketData = (() => {
      const _tks = window._allTicketsData || allTicketsData || [];
      const _norm = s => String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
      const _sortNorm = s => _norm(s).split(' ').sort().join(' ');
      const _t = _norm(student.name), _ts = _sortNorm(student.name);
      return _tks.find(tk => _norm(tk.name) === _t)
          || _tks.find(tk => _sortNorm(tk.name) === _ts)
          || _tks.find(tk => _norm(tk.name).includes(_t) || _t.includes(_norm(tk.name)))
          || undefined;
    })();

    const packLabel  = ticketData?.pack || student.pack || '—';
    const noteLabel  = ticketData?.note || '';
    const paidAmt    = ticketData ? Number(ticketData.amount || 0) : null;
    const remaining  = ticketData ? Number(ticketData.remainingAmount || 0) : null;
    const isPaid     = ticketData ? (remaining === 0) : null;
    const receipt    = ticketData?.receipt || '';

    const payBadge = ticketData === undefined
      ? `<span class="cs-badge unpaid">❓ لا تذكرة</span>`
      : isPaid
        ? `<span class="cs-badge paid">✅ مدفوع — ${paidAmt?.toLocaleString('ar-DZ')} دج</span>`
        : `<span class="cs-badge unpaid">⏳ متبقي ${remaining?.toLocaleString('ar-DZ')} دج</span>`;

    const presentPct = totalSessions > 0 ? Math.round(presentCount / totalSessions * 100) : null;
    const barColor   = presentPct === null ? '#d1d5db' : presentPct >= 75 ? '#10B981' : presentPct >= 50 ? '#F59E0B' : '#EF4444';

    return `
      <div class="cs-result-card">
        <div class="cs-header">
          <div class="cs-avatar">${(student.name||'?')[0]}</div>
          <div style="flex:1">
            <div class="cs-name">${student.name}</div>
            <div class="cs-teacher">👨‍🏫 ${teacher.name} &nbsp;·&nbsp; 🎓 ${teacher.spec || '—'}</div>
          </div>
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);background:var(--bg-2);padding:4px 10px;border-radius:8px">🔑 ${receipt || '—'}</div>
        </div>

        <div class="cs-stats">
          <div class="cs-stat">
            <div class="cs-stat-n" style="color:var(--success)">${presentCount}</div>
            <div class="cs-stat-l">✅ حصص حاضر</div>
          </div>
          <div class="cs-stat">
            <div class="cs-stat-n" style="color:var(--danger)">${absentCount}</div>
            <div class="cs-stat-l">❌ حصص غائب</div>
          </div>
          <div class="cs-stat">
            <div class="cs-stat-n" style="color:var(--primary)">${totalSessions}</div>
            <div class="cs-stat-l">📋 حصص مسجّلة</div>
          </div>
          <div class="cs-stat">
            <div class="cs-stat-n" style="color:${barColor}">${presentPct !== null ? presentPct + '%' : '—'}</div>
            <div class="cs-stat-l">📈 نسبة الحضور</div>
          </div>
        </div>

        ${totalSessions > 0 ? `
        <div style="margin-bottom:14px">
          <div style="height:8px;border-radius:99px;background:#e5e7eb;overflow:hidden">
            <div style="height:100%;width:${presentPct}%;background:${barColor};border-radius:99px;transition:width 0.6s ease"></div>
          </div>
        </div>` : ''}

        <div class="cs-info-row">
          ${groupName !== '—' ? `<span class="cs-badge group">🏫 ${groupName}</span>` : ''}
          ${packLabel !== '—' ? `<span class="cs-badge pack">📦 ${packLabel}</span>` : ''}
          ${noteLabel ? `<span class="cs-badge note">🌍 ${noteLabel}</span>` : ''}
          ${payBadge}
        </div>
      </div>`;
  }));

  container.innerHTML = `
    <div style="font-size:12px;font-weight:800;color:var(--text-muted);margin-bottom:12px">
      🔎 ${matches.length} نتيجة لـ "<span style="color:var(--primary)">${rawVal.trim()}</span>"
    </div>
    ${resultsHtml.join('')}`;
};

// ─── Load teachers list ───
function loadTeachers() {
  // الأساتذة لا يحملون قائمة بقية الأساتذة
  if (isTeacherMode) return;
  onSnapshot(query(collection(db, 'teachers'), orderBy('createdAt', 'desc')), async snap => {
    allTeachers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window._allTeachersCache = allTeachers; // for finance salary dropdown
    window.allTeachers = allTeachers; // expose for SOV panel
    document.getElementById('nav-badge-teachers').textContent = allTeachers.length;
    document.getElementById('t-stat-total').textContent = allTeachers.length;
    // Count total students
    let totalStudents = 0;
    allTeachers.forEach(t => { totalStudents += (t.students || []).length; });
    document.getElementById('t-stat-students').textContent = totalStudents;
    // Today's label
    const todayName = AR_DAYS[new Date(new Date().toLocaleString('en-US',{timeZone:'Africa/Algiers'})).getDay()];
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
  const todayName = AR_DAYS[new Date(new Date().toLocaleString('en-US',{timeZone:'Africa/Algiers'})).getDay()];
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
        <button class="btn-sm-icon" onclick="openChangeCredentialsModal('${t.id}','${(t.name||'').replace(/'/g,String.fromCharCode(39))}')">🔐 دخول</button>
        <button class="btn-sm-icon danger" onclick="deleteTeacher('${t.id}','${t.name}')">🗑️</button>
      </div>`;
    grid.appendChild(card);
  });
}

// ─── Delete teacher ───
window.deleteTeacher = async (id, name) => {
  if (!(await EPUI.confirm(`⚠️ حذف الأستاذ "${name}" نهائياً مع كل بياناته؟`, 'حذف أستاذ', { danger: true }))) return;
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
  populateGroupsList('edit-groups-list', t.groups || []);
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
  const groups = collectGroups('edit-groups-list');
  if (!name || !spec || !days.length) { showToast('❌ ملء الاسم والتخصص والأيام مطلوب', true); return; }

  // ── مزامنة تلاميذ الأفواج مع قائمة students الرئيسية ──
  const teacher = allTeachers.find(t => t.id === id);
  const existingStudents = teacher ? [...(teacher.students || [])] : [];

  // جمع كل أسماء التلاميذ من جميع الأفواج
  const allGroupStudentNames = new Set();
  groups.forEach(g => (g.students || []).forEach(s => allGroupStudentNames.add(s.trim().toLowerCase())));

  // إضافة التلاميذ الجدد (من الأفواج) إلى القائمة الرئيسية إذا ما كانوا موجودين
  const existingNames = new Set(existingStudents.map(s => s.name.trim().toLowerCase()));
  allGroupStudentNames.forEach(nameLC => {
    if (!existingNames.has(nameLC)) {
      // نجيب الاسم بصيغته الأصلية من الأفواج
      let originalName = nameLC;
      groups.forEach(g => (g.students || []).forEach(s => {
        if (s.trim().toLowerCase() === nameLC) originalName = s.trim();
      }));
      existingStudents.push({
        id: 'gs_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
        name: originalName,
        present: false,
        marked: false,
        payStatus: 'unknown'
      });
    }
  });

  const updates = { name, spec, levels, days, groups, students: existingStudents };
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
  // نقرأ البيانات من Firestore مباشرة لضمان الحصول على آخر تحديث
  let t;
  try {
    const freshSnap = await getDoc(doc(db, 'teachers', teacherId));
    if (freshSnap.exists()) {
      t = { id: freshSnap.id, ...freshSnap.data() };
      const cacheIdx = allTeachers.findIndex(x => x.id === teacherId);
      if (cacheIdx !== -1) allTeachers[cacheIdx] = t;
    }
  } catch(e) { /* fallback */ }
  if (!t) t = allTeachers.find(x => x.id === teacherId);
  if (!t) return;
  currentAttTeacherId = teacherId; window.currentAttTeacherId = currentAttTeacherId;
  // ✅ نحتفظ بكل التلاميذ في متغير مؤقت للاستخدام لاحقاً
  const allStudentsOfTeacher = t.students ? [...t.students] : [];
  window._activeAttGroupIdx  = 'all';
  window._activeAttGroups    = t.groups || [];
  window._activeAttTeacherId = teacherId;
  _allRecordedSessions = {};
  _allRecordedSessionsByGroup = {};
  try {
    const sessSnap = await getDocs(query(
      collection(db, 'sessionAttendance'),
      where('teacherId', '>=', teacherId + '_g'),
      where('teacherId', '<=', teacherId + '_g')
    ));
    sessSnap.forEach(d => {
      const data = d.data();
      if (!data.sessionNum) return;
      const gStr = String(data.teacherId || '');
      const gi = parseInt((gStr.match(/_g(\d+)$/) || [0,0])[1]);
      if (!_allRecordedSessionsByGroup[gi]) _allRecordedSessionsByGroup[gi] = {};
      _allRecordedSessionsByGroup[gi][data.sessionNum] = data;
      if (gi === 0) _allRecordedSessions[data.sessionNum] = data;
    });
  } catch(e) {}
  // Header
  const avatarWrap = document.getElementById('att-modal-avatar-wrap');
  avatarWrap.innerHTML = t.photo
    ? `<img class="att-modal-avatar" src="${t.photo}" alt="${t.name}">`
    : `<div class="att-modal-avatar-placeholder">${(t.name||'?')[0]}</div>`;
  document.getElementById('att-modal-teacher-name').textContent = t.name;
  const _dzNow = new Date(new Date().toLocaleString('en-US',{timeZone:'Africa/Algiers'}));
  const todayLabel = `سجل الحضور — ${AR_DAYS[_dzNow.getDay()]} ${_dzNow.toLocaleDateString('ar-DZ')}`;
  document.getElementById('att-modal-date-label').textContent = todayLabel;

  // تحديد الحصة الحالية
  const gi0Sessions = _allRecordedSessionsByGroup[0] || {};
  let currentSessionNum = 13;
  for (let i = 1; i <= 12; i++) { if (!gi0Sessions[i]) { currentSessionNum = i; break; } }
  const currentRecordedSession = currentSessionNum <= 12 ? gi0Sessions[currentSessionNum] : null;

  // ── بانر حالة الحصة ──
  const bannerEl = document.getElementById('att-session-status-banner');
  if (bannerEl) {
    bannerEl.style.display = 'block';
    bannerEl.style.marginTop = '8px';
    bannerEl.style.padding = '12px 16px';
    bannerEl.style.borderRadius = '14px';
    bannerEl.style.fontSize = '13px';
    bannerEl.style.fontWeight = '700';
    bannerEl.style.lineHeight = '1.6';
    if (currentSessionNum > 12) {
      bannerEl.style.background = 'var(--success-soft)';
      bannerEl.style.border = '1px solid rgba(16,185,129,0.25)';
      bannerEl.style.color = '#059669';
      bannerEl.innerHTML = `✅ أكمل الأستاذ <strong>${t.name}</strong> جميع الـ 12 حصة — يمكنك تعديل أي حصة من "تعديل حصة مسجّلة"`;
    } else if (currentRecordedSession) {
      const absentList = (currentRecordedSession.students || []).filter(s => !s.present);
      const presentCount = (currentRecordedSession.students || []).filter(s => s.present).length;
      const totalCount = (currentRecordedSession.students || []).length;
      bannerEl.style.background = 'rgba(124,58,237,0.06)';
      bannerEl.style.border = '1px solid var(--border-2)';
      bannerEl.style.color = 'var(--text-2)';
      bannerEl.innerHTML = `📋 الحصة <strong>${currentSessionNum}</strong> — سجّلها الأستاذ ✅ &nbsp;|&nbsp; <span style="color:var(--success);font-weight:900">${presentCount} حاضر</span> &nbsp;/&nbsp; <span style="color:var(--danger);font-weight:900">${absentList.length} غائب</span> من ${totalCount} تلميذ` + (absentList.length > 0 ? `<br><span style="font-size:11px;color:var(--text-muted);margin-top:4px;display:block">👇 التلاميذ الغائبون أدناه — للتعديل اضغط "تعديل حصة مسجّلة"</span>` : '');
    } else {
      bannerEl.style.background = 'rgba(245,158,11,0.08)';
      bannerEl.style.border = '1px solid rgba(245,158,11,0.3)';
      bannerEl.style.color = '#92400e';
      bannerEl.innerHTML = `⏳ الحصة <strong>${currentSessionNum}</strong> — لم يُسجِّلها الأستاذ بعد<br><span style="font-size:11px;color:var(--primary);margin-top:4px;display:block">✏️ بإمكانك تسجيل الحضور مباشرةً من شبكة الحصص أدناه</span>`;
    }
  }

  // ── تحديد التلاميذ المعروضة ──
  // إذا سجّل الأستاذ الحصة → نعرض الغائبين فقط
  // إذا لم يُسجّل بعد → نعرض القائمة كاملة (وضع عرض)
  let studentsToShow = [];
  if (currentRecordedSession) {
    studentsToShow = (currentRecordedSession.students || [])
      .filter(s => !s.present)
      .map(s => {
        const full = allStudentsOfTeacher.find(x =>
          x.id === s.id || x.name.trim().toLowerCase() === s.name.trim().toLowerCase()
        );
        return full ? { ...full, present: false, marked: true } : { ...s, present: false, marked: true };
      });
  } else {
    studentsToShow = allStudentsOfTeacher.map(s => ({ ...s, marked: false }));
  }
  currentAttStudents = studentsToShow; window.currentAttStudents = currentAttStudents;

  // ── بناء تبويبات الأفواج ──
  const groups = t.groups || [];
  const tabsWrap = document.getElementById('att-groups-tabs-wrap');
  const tabsEl = document.getElementById('att-groups-tabs');
  const groupHeader = document.getElementById('att-group-header');
  tabsEl.innerHTML = '';

  if (groups.length > 0) {
    tabsWrap.style.display = 'block';
    const allTab = document.createElement('button');
    allTab.className = 'att-group-tab active';
    allTab.dataset.gidx = 'all';
    allTab.innerHTML = `🏫 الكل <span class="g-count">${studentsToShow.length}</span>`;
    allTab.onclick = () => switchAttGroupTab('all', t, groups);
    tabsEl.appendChild(allTab);
    groups.forEach((g, idx) => {
      const tab = document.createElement('button');
      tab.className = 'att-group-tab';
      tab.dataset.gidx = idx;
      tab.innerHTML = `🏫 ${g.name} <span class="g-count">${(g.students||[]).length}</span>`;
      tab.onclick = () => switchAttGroupTab(idx, t, groups);
      tabsEl.appendChild(tab);
    });
    groupHeader.style.display = 'none';
  } else {
    tabsWrap.style.display = 'none';
  }

  renderAttStudents(currentAttStudents, '');
  updateAttSummary(currentAttStudents);

  // ✅ تهيئة فلتر الدفع
  window._adminPayFilter = 'all';
  document.querySelectorAll('#admin-pay-filter-bar .pay-filter-btn').forEach((b,i) => {
    b.classList.remove('active','active-green','active-red');
    if (i===0) b.classList.add('active');
  });
  adminApplyPayFilter();

  // ✅ تحميل حالة القفل والفتح اليدوي من Firestore ثم رسم الشبكة
  (async () => {
    try {
      const tDoc = await getDoc(doc(db, 'teachers', t.id));
      if (tDoc.exists()) {
        const locked = tDoc.data().lockedSessions || {};
        const opened = tDoc.data().openedSessions || {};
        if (!window._lockedSessions) window._lockedSessions = {};
        if (!window._openedSessions) window._openedSessions = {};
        // بناء cache: key = tid_gi, val = { sessionNum: true }
        const groups = t.groups || [];
        groups.forEach((_, gi) => {
          window._lockedSessions[t.id + '_' + gi] = {};
          window._openedSessions[t.id + '_' + gi] = {};
          Object.entries(locked).forEach(([k, v]) => {
            const [gStr, sStr] = k.split('_');
            if (parseInt(gStr) === gi && v === true)
              window._lockedSessions[t.id + '_' + gi][parseInt(sStr)] = true;
          });
          Object.entries(opened).forEach(([k, v]) => {
            const [gStr, sStr] = k.split('_');
            if (parseInt(gStr) === gi && v === true)
              window._openedSessions[t.id + '_' + gi][parseInt(sStr)] = true;
          });
        });
      }
    } catch(e) { console.warn('lock load error', e); }
    renderAdminAttGroupsGrid(t);
  })();

  document.getElementById('att-modal').classList.add('open');
};
window.closeAttModal = () => {
  document.getElementById('att-modal').classList.remove('open');
  currentAttTeacherId = null; window.currentAttTeacherId = null;
};

// ─── رسم شبكة الأفواج + الـ 12 حصة للأدمين داخل att-modal ───
function renderAdminAttGroupsGrid(teacher) {
  const container = document.getElementById('admin-att-groups-grid');
  if (!container) return;
  const groups = teacher.groups || [];
  const teacherDays = teacher.days || [];
  const tid = teacher.id;

  if (!groups.length) {
    // لا أفواج — شبكة واحدة
    container.innerHTML = buildSessionGridHtml(tid, 0, { name: '', days: teacherDays, students: teacher.students || [] }, teacherDays);
    return;
  }

  // تبويبات الأفواج + شبكة لكل فوج
  const tabsHtml = groups.map((g, i) =>
    `<button onclick="adminSwitchAttGroup(${i})" id="admin-gtab-${i}"
      style="padding:7px 16px;border-radius:99px;border:2px solid ${i===0?'var(--primary)':'var(--border-2)'};
      background:${i===0?'linear-gradient(135deg,var(--primary),#9333EA)':'white'};
      color:${i===0?'white':'var(--text-2)'};font-size:12px;font-weight:800;cursor:pointer;
      font-family:'Tajawal',sans-serif;transition:all 0.2s;white-space:nowrap;flex-shrink:0">
      🏫 ${g.name}
      <span style="font-size:10px;opacity:0.75">(${(g.students||[]).length})</span>
    </button>`
  ).join('');

  const gridsHtml = groups.map((g, i) =>
    `<div id="admin-gp-${i}" style="display:${i===0?'block':'none'}">
      ${buildSessionGridHtml(tid, i, g, teacherDays)}
    </div>`
  ).join('');

  container.innerHTML = `
    <div style="font-size:12px;font-weight:800;color:var(--text-muted);margin-bottom:8px">📋 شبكة الحصص — اضغط على أي حصة لتسجيل الحضور</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${tabsHtml}</div>
    ${gridsHtml}`;

  window.adminSwitchAttGroup = (gi) => {
    groups.forEach((_,i) => {
      const p = document.getElementById(`admin-gp-${i}`);
      const t = document.getElementById(`admin-gtab-${i}`);
      if (p) p.style.display = i===gi?'block':'none';
      if (t) {
        t.style.background = i===gi?'linear-gradient(135deg,var(--primary),#9333EA)':'white';
        t.style.color = i===gi?'white':'var(--text-2)';
        t.style.borderColor = i===gi?'var(--primary)':'var(--border-2)';
      }
    });
  };
}

function buildSessionGridHtml(tid, gi, group, teacherDays) {
  const gDays = (group.days && group.days.length) ? group.days : teacherDays;
  const sessions = [];
  for (let i = 0; i < 12; i++) sessions.push({ num: i+1, day: gDays[i % (gDays.length||1)] || '—' });

  // ── قراءة حالة القفل وحالة الفتح اليدوي من Firestore cache ──
  const lockedSessions = (window._lockedSessions || {})[tid + '_' + gi] || {};
  const openedSessions = (window._openedSessions || {})[tid + '_' + gi] || {};

  const sessionCards = sessions.map(s => {
    const rec = (_allRecordedSessionsByGroup[gi] || {})[s.num];
    const isDone = !!rec;
    const isLocked = !!lockedSessions[s.num];
    const isManuallyOpened = !!openedSessions[s.num];
    const pres = isDone ? (rec.students||[]).filter(x=>x.present).length : 0;
    const tot  = isDone ? (rec.students||[]).length : 0;
    let bg, clickFn;
    if (isLocked) {
      bg = 'background:rgba(107,114,128,0.08);border-color:rgba(107,114,128,0.3);opacity:0.7';
      clickFn = '';
    } else if (isDone) {
      bg = 'background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.06));border-color:rgba(16,185,129,0.35)';
      clickFn = `editSession_g(${s.num},${gi})`;
    } else if (isManuallyOpened) {
      bg = 'background:linear-gradient(135deg,rgba(59,130,246,0.12),rgba(59,130,246,0.06));border-color:rgba(59,130,246,0.4)';
      clickFn = `adminOpenSession(${s.num},${gi})`;
    } else {
      bg = 'background:white;border-color:var(--border-2)';
      clickFn = `adminOpenSession(${s.num},${gi})`;
    }
    const lockBtnHtml = isLocked
      ? `<button class="admin-session-lock-btn unlock" onclick="event.stopPropagation();adminToggleSessionLock('${tid}',${gi},${s.num},false)" style="margin-top:6px">🔓 فتح</button>`
      : `<button class="admin-session-lock-btn lock" onclick="event.stopPropagation();adminToggleSessionLock('${tid}',${gi},${s.num},true)" style="margin-top:6px">🔒 قفل</button>`;
    // ── زر فتح/إغلاق الحصة يدوياً للأستاذ (مستقل عن قفل الأدمين أعلاه) ──
    const teacherOpenBtnHtml = (!isLocked && !isDone)
      ? (isManuallyOpened
          ? `<button class="admin-session-lock-btn unlock" onclick="event.stopPropagation();adminToggleSessionOpenForTeacher('${tid}',${gi},${s.num},false)" style="margin-top:4px;background:rgba(59,130,246,0.12);color:#2563EB">🔵 مفتوحة — إلغاء</button>`
          : `<button class="admin-session-lock-btn" onclick="event.stopPropagation();adminToggleSessionOpenForTeacher('${tid}',${gi},${s.num},true)" style="margin-top:4px;background:rgba(59,130,246,0.08);color:#2563EB;border:1px dashed rgba(59,130,246,0.4)">🔓 فتح للأستاذ</button>`)
      : '';
    return `<div onclick="${isLocked ? '' : clickFn}" style="padding:10px 8px;border-radius:12px;border:1.5px solid;${bg};cursor:${isLocked?'default':'pointer'};text-align:center;transition:all 0.2s;min-width:0;position:relative"
        ${isLocked ? '' : "onmouseover=\"this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(124,58,237,0.15)'\""}
        ${isLocked ? '' : "onmouseout=\"this.style.transform='';this.style.boxShadow=''\""}>
      <div style="font-size:11px;font-weight:900;color:var(--text)">${isLocked?'🔒':(isManuallyOpened?'🔵':'')} حصة ${s.num}</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${s.day}</div>
      ${isDone
        ? `<div style="margin-top:5px;font-size:10px;font-weight:800;color:#059669">✅ ${pres}/${tot}</div>
           ${isLocked ? '' : '<div style="font-size:9px;color:var(--text-muted)">تعديل ✏️</div>'}`
        : `<div style="margin-top:5px;font-size:18px;opacity:0.3">${isLocked?'—':'+'}</div>
           ${isManuallyOpened && !isLocked ? '<div style="font-size:9px;color:#2563EB;font-weight:800;margin-top:2px">مفتوحة يدوياً للأستاذ</div>' : ''}`}
      ${lockBtnHtml}
      ${teacherOpenBtnHtml}
    </div>`;
  }).join('');

  // ── إحصائيات الفوج (حضور تراكمي عبر كل الحصص) ──
  const allGroupSessions = _allRecordedSessionsByGroup[gi] || {};
  let totalPresent = 0, totalAbsent = 0, totalLate = 0, recordedCount = 0;
  Object.values(allGroupSessions).forEach(sess => {
    if (!sess || !sess.students) return;
    recordedCount++;
    sess.students.forEach(st => {
      if (st.late) { totalLate++; totalPresent++; }
      else if (st.present) totalPresent++;
      else totalAbsent++;
    });
  });
  const totalStudents = (group.students||[]).length || (Object.values(allGroupSessions)[0]?.students?.length || 0);
  const totalExpectedAttendance = totalStudents * recordedCount;
  const attPct = totalExpectedAttendance > 0 ? Math.round((totalPresent / totalExpectedAttendance) * 100) : null;
  const statsHtml = recordedCount > 0 ? `
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:8px 12px;background:var(--bg);border-radius:10px;border:1px solid var(--border);margin-bottom:8px;font-size:12px;font-weight:800">
      <span style="color:var(--text-muted)">📊 تراكمي (${recordedCount} حصة):</span>
      <span style="color:var(--success)">✅ ${totalPresent} حضر</span>
      <span style="color:var(--danger)">❌ ${totalAbsent} غائب</span>
      <span style="color:#F59E0B">⏱ ${totalLate} متأخر</span>
      ${attPct !== null ? `<span style="color:var(--primary);margin-right:auto">نسبة: ${attPct}%</span>` : ''}
    </div>` : '';

  const groupLabel = group.name ? `<div style="font-size:12px;font-weight:800;color:var(--text-2);margin-bottom:8px;padding:6px 12px;background:var(--primary-light);border-radius:8px;border:1px solid var(--border-2)">🏫 ${group.name} — ${(group.students||[]).length} تلميذ — 📅 ${(group.days||teacherDays).join('، ')}</div>` : '';

  return `${groupLabel}${statsHtml}<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${sessionCards}</div>`;
}

// ─── قفل/فتح حصة ───
window.adminToggleSessionLock = async (tid, gi, sessionNum, lock) => {
  try {
    const key = `lockedSessions.${gi}_${sessionNum}`;
    const updateData = {};
    // نقرأ الـ locked sessions الحالية ثم نعدّلها كـ object كامل
    const snap = await getDoc(doc(db, 'teachers', tid));
    const existing = snap.exists() ? (snap.data().lockedSessions || {}) : {};
    const lockKey = gi + '_' + sessionNum;
    if (lock) existing[lockKey] = true;
    else delete existing[lockKey];
    await updateDoc(doc(db, 'teachers', tid), { lockedSessions: existing });
    // تحديث cache
    if (!window._lockedSessions) window._lockedSessions = {};
    const cacheKey = tid + '_' + gi;
    if (!window._lockedSessions[cacheKey]) window._lockedSessions[cacheKey] = {};
    if (lock) window._lockedSessions[cacheKey][sessionNum] = true;
    else delete window._lockedSessions[cacheKey][sessionNum];
    // إعادة رسم الشبكة
    const teacher = allTeachers.find(x => x.id === tid);
    if (teacher) renderAdminAttGroupsGrid(teacher);
    showToast(lock ? `🔒 تم قفل الحصة ${sessionNum}` : `🔓 تم فتح الحصة ${sessionNum}`);
  } catch(e) { showToast('خطأ: ' + e.message, true); }
};

// ─── فتح/إلغاء فتح حصة يدوياً للأستاذ (بغض النظر عن يومها أو نافذتها الزمنية) ───
// مستقل تماماً عن adminToggleSessionLock أعلاه:
// - القفل (lockedSessions) = يمنع الأستاذ من الوصول للحصة نهائياً
// - الفتح اليدوي (openedSessions) = يسمح للأستاذ بتسجيل الحصة حتى لو لم يحن يومها/وقتها الطبيعي
window.adminToggleSessionOpenForTeacher = async (tid, gi, sessionNum, open) => {
  try {
    const snap = await getDoc(doc(db, 'teachers', tid));
    const existing = snap.exists() ? (snap.data().openedSessions || {}) : {};
    const openKey = gi + '_' + sessionNum;
    if (open) existing[openKey] = true;
    else delete existing[openKey];
    await updateDoc(doc(db, 'teachers', tid), { openedSessions: existing });
    // تحديث cache
    if (!window._openedSessions) window._openedSessions = {};
    const cacheKey = tid + '_' + gi;
    if (!window._openedSessions[cacheKey]) window._openedSessions[cacheKey] = {};
    if (open) window._openedSessions[cacheKey][sessionNum] = true;
    else delete window._openedSessions[cacheKey][sessionNum];
    // إعادة رسم الشبكة
    const teacher = allTeachers.find(x => x.id === tid);
    if (teacher) renderAdminAttGroupsGrid(teacher);
    showToast(open ? `🔓 تم فتح الحصة ${sessionNum} للأستاذ` : `تم إلغاء الفتح اليدوي للحصة ${sessionNum}`);
  } catch(e) { showToast('خطأ: ' + e.message, true); }
};

// ─── فتح حصة للأدمين مباشرة من att-modal ───
window.adminOpenSession = (sessionNum, gi) => {
  // تعيين currentAttTeacherId و group index قبل فتح الـ modal
  window._activeAttGroupIdx = gi;
  window._currentGroupIdx   = gi;

  // ✅ إصلاح رئيسي: تحميل تلاميذ الفوج المختار في currentAttStudents
  // حتى يعرض openSession_g القائمة الصحيحة
  const teacherData = allTeachers.find(x => x.id === currentAttTeacherId);
  if (teacherData) {
    const allStuds  = teacherData.students || [];
    const groupData = (teacherData.groups || [])[gi];
    if (groupData && (groupData.students || []).length > 0) {
      const groupNames = new Set(groupData.students.map(s => s.trim().toLowerCase()));
      currentAttStudents = allStuds.filter(s => groupNames.has(s.name.trim().toLowerCase()));
    } else {
      currentAttStudents = [...allStuds];
    }
    window.currentAttStudents = currentAttStudents;
    // مزامنة _activeAttGroups لدوال الحفظ
    window._activeAttGroups = teacherData.groups || [];
  }

  openSession_g(sessionNum, gi);
};

// ─── تبديل تبويب الفوج في modal الحضور ───
window.switchAttGroupTab = (gidx, teacher, groups) => {
  // تتبع الفوج النشط حالياً
  window._activeAttGroupIdx    = gidx;
  window._activeAttGroups      = groups;
  window._activeAttTeacherId   = teacher ? teacher.id : currentAttTeacherId;

  // تحديث active
  document.querySelectorAll('.att-group-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.att-group-tab[data-gidx="${gidx}"]`);
  if (activeTab) activeTab.classList.add('active');

  const groupHeader = document.getElementById('att-group-header');

  if (gidx === 'all') {
    groupHeader.style.display = 'none';
    // عرض كل التلاميذ
    renderAttStudents(currentAttStudents, '');
    updateAttSummary(currentAttStudents);
    return;
  }

  const g = groups[gidx];
  if (!g) return;

  // تحديث header الفوج
  groupHeader.style.display = 'flex';
  document.getElementById('att-group-header-name').textContent = `فوج: ${g.name}`;
  const days = (g.days || []).join('، ');
  document.getElementById('att-group-header-meta').textContent = `📅 ${days || 'يومياً'} — 👥 ${(g.students||[]).length} تلميذ`;

  // تصفية التلاميذ حسب أسماء الفوج
  const groupStudentNames = new Set((g.students || []).map(s => s.trim().toLowerCase()));
  const filtered = currentAttStudents.filter(s =>
    groupStudentNames.has(s.name.trim().toLowerCase())
  );

  // إذا لا يوجد تطابق، ندمج تلاميذ الفوج في currentAttStudents لتجنب الاختفاء المؤقت
  if (filtered.length === 0 && g.students && g.students.length > 0) {
    // بناء قائمة التلاميذ الجدد الغائبين عن currentAttStudents وإضافتهم
    const newStudents = [];
    g.students.forEach((name, idx) => {
      const existing = currentAttStudents.find(s => s.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (!existing) {
        newStudents.push({ id: `g${gidx}_${idx}_${Date.now()}`, name, present: false, marked: false, payStatus: 'unknown' });
      }
    });
    if (newStudents.length > 0) {
      currentAttStudents.push(...newStudents);
      // حفظ القائمة المحدثة في Firestore
      _suppressSnapshot = true;
      setDoc(doc(db, 'teachers', currentAttTeacherId), { students: currentAttStudents }, { merge: true })
        .catch(e => showToast('خطأ: ' + e.message, true))
        .finally(() => { setTimeout(() => { _suppressSnapshot = false; }, 1500); });
    }
    // الآن نُصفّي مجدداً من currentAttStudents المحدثة
    const groupStudentNames2 = new Set((g.students || []).map(s => s.trim().toLowerCase()));
    const filtered2 = currentAttStudents.filter(s => groupStudentNames2.has(s.name.trim().toLowerCase()));
    renderAttStudents(filtered2, '');
    updateAttSummary(filtered2);
  } else {
    renderAttStudents(filtered, '');
    updateAttSummary(filtered);
  }
};

function getStudentSourceInfo(s) {
  const ticket = (allTicketsData || []).find(t =>
    (s.receipt && t.receipt === s.receipt) ||
    matchNames(t.name, s.name)
  );

  const sheetEntry = (window._lastSheetRows || []).find(r => {
    const fn = String(r['الاسم'] || "").trim();
    const ln = String(r['اللقب'] || "").trim();
    const full = [fn, ln].filter(Boolean).join(" ");
    return matchNames(full, s.name) || matchNames(fn, s.name);
  });

  let source = "manual";
  if (ticket) source = "ticket";
  if (sheetEntry) source = "sheet";

  let pack = "";
  if (ticket && ticket.pack) pack = ticket.pack;
  else if (sheetEntry) {
    const pk = ["الباقة", "نوع البرنامج", "الباقة المختارة", "pack"].find(k => sheetEntry[k]);
    if (pk) pack = String(sheetEntry[pk]).trim();
  }

  return { source, pack };
}

function renderAttStudents(students, filter) {
  const list = document.getElementById('att-students-list');
  if (!list) return;
  const filtered = filter ? students.filter(s => s.name.includes(filter)) : students;

  if (!filtered.length) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">
      ${filter ? 'لم يتم العثور على نتائج' : 'لا يوجد تلاميذ بعد — أضف تلميذاً أدناه'}
    </div>`;
    return;
  }

  list.innerHTML = '';
  filtered.forEach(s => {
    const { ps: payStatus, rc: receipt } = getLivePayStatus(s);
    const { source, pack } = getStudentSourceInfo(s);

    const badgeHtml =
      payStatus === 'paid'   ? `<span class="pay-badge paid">✅ مفعّلة</span>` :
      payStatus === 'unpaid' ? `<span class="pay-badge unpaid">⏳ غير مفعّلة</span>` :
                               `<span class="pay-badge unknown">— لا تذكرة</span>`;

    const receiptHtml = receipt
      ? `<span style="font-size:10px;font-family:monospace;color:var(--primary);background:var(--primary-light);padding:2px 7px;border-radius:6px;flex-shrink:0">${receipt}</span>`
      : '';

    // بادج المصدر
    const sourceBadge =
      source === 'sheet'  ? `<span title="مسجّل في جدول Google Sheet" style="font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px;background:rgba(20,184,166,0.12);color:var(--teal);border:1px solid rgba(20,184,166,0.3);white-space:nowrap;flex-shrink:0">📊 Sheet</span>` :
      source === 'ticket' ? `<span title="من سجل التذاكر" style="font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px;background:rgba(124,58,237,0.1);color:var(--primary);border:1px solid var(--border-2);white-space:nowrap;flex-shrink:0">🎟️ تذكرة</span>` :
                            `<span title="مضاف يدوياً" style="font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px;background:rgba(245,158,11,0.12);color:#92400e;border:1px solid rgba(245,158,11,0.3);white-space:nowrap;flex-shrink:0">✏️ يدوي</span>`;

    // بادج الباقة
    const packBadge = pack
      ? `<span title="الباقة المختارة" style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;background:rgba(99,102,241,0.08);color:#4f46e5;border:1px solid rgba(99,102,241,0.18);white-space:nowrap;max-width:100px;overflow:hidden;text-overflow:ellipsis;flex-shrink:0" title="${pack}">📦 ${pack.length > 14 ? pack.slice(0,13)+'…' : pack}</span>`
      : '';

    const row = document.createElement('div');
    row.className = 'att-student-row';
    row.dataset.sid = s.id;
    row.innerHTML = `
      <span class="att-student-id">${s.id}</span>
      <span class="att-student-name">${s.name}</span>
      ${badgeHtml}
      ${receiptHtml}
      ${sourceBadge}
      ${packBadge}
      <div class="att-toggle" style="margin-right:auto">
        <div class="att-check ${s.present && !s.late ? 'present' : ''}" title="حاضر" onclick="toggleStudentAtt('${s.id}',true,this)">✓</div>
        <div class="att-check ${!s.present && !s.late && s.marked ? 'absent' : ''}" title="غائب" onclick="toggleStudentAtt('${s.id}',false,this)" style="font-size:12px">✗</div>
        <div class="att-check ${s.late ? 'late' : ''}" title="متأخر" onclick="toggleStudentLate('${s.id}',this)" style="font-size:11px">⏰</div>
      </div>
      <button style="padding:4px 8px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:var(--danger-soft);color:var(--danger);font-size:11px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700;flex-shrink:0" onclick="removeStudent('${s.id}')">حذف</button>`;
    list.appendChild(row);
  });

}

window.toggleStudentAtt = (sid, isPresent, el) => {
  // تحديث المتغير إذا كان التلميذ موجوداً
  const s = currentAttStudents.find(x => x.id === sid);
  if (s) { s.present = isPresent; s.marked = true; s.late = false; } // ✅ إلغاء وضع "متأخر" عند تغيير الحضور
  // ✅ تحديث الـ DOM دائماً
  const row = el.closest('.att-student-row');
  row.querySelectorAll('.att-check').forEach(c => c.classList.remove('present','absent','late'));
  if (isPresent) row.querySelectorAll('.att-check')[0].classList.add('present');
  else           row.querySelectorAll('.att-check')[1].classList.add('absent');
  updateAttSummary(currentAttStudents);
};

// ─── تبديل حالة "متأخر" ───
// المتأخر = حاضر فعلياً + علامة تأخر (يُحسب في عداد الحضور كحاضر)
window.toggleStudentLate = (sid, el) => {
  const row = el.closest('.att-student-row');
  const checks = row.querySelectorAll('.att-check');
  const isCurrentlyLate = el.classList.contains('late');
  // ✅ إزالة كل الحالات أولاً
  checks.forEach(c => c.classList.remove('present','absent','late'));
  const s = currentAttStudents.find(x => x.id === sid);
  if (isCurrentlyLate) {
    // إلغاء التأخر → يرجع لغير محدد (غائب)
    if (s) { s.late = false; s.present = false; s.marked = true; }
    checks[1].classList.add('absent');
  } else {
    // تفعيل المتأخر → حاضر + متأخر
    if (s) { s.late = true; s.present = true; s.marked = true; }
    checks[0].classList.add('present'); // ✓ يضيء (حاضر ضمنياً)
    el.classList.add('late');           // ⏰ يضيء
  }
  updateAttSummary(currentAttStudents);
};

function updateAttSummary(students) {
  // ─── تحديد الحاوية النشطة ───
  // نعطي الأولوية لـ session-modal-inner إذا كان مرئياً، وإلا نرجع للـ att-modal
  const sessionModalBg = document.getElementById('session-modal-bg');
  const sessionModalOpen = sessionModalBg && sessionModalBg.style.visibility === 'visible';

  // اختر الحاوية الصحيحة لقراءة العناصر منها
  const container = sessionModalOpen
    ? document.getElementById('session-modal-inner')
    : document.getElementById('att-modal');

  // دالة مساعدة: تجلب عنصراً بـ ID من داخل الحاوية النشطة فقط
  const getEl = (id) => container ? container.querySelector('#' + id) : document.getElementById(id);

  // ✅ نحسب دائماً من الـ array (أدق وأسرع)
  // currentAttStudents يُحدَّث في toggleStudentAtt و toggleStudentLate قبل استدعاء هذه الدالة
  const src = (students && students.length > 0) ? students : (window.currentAttStudents || []);
  const total   = src.length;
  const late    = src.filter(s => s.late).length;
  const present = src.filter(s => s.present).length; // شامل المتأخرين
  const absent  = total - present;

  const totalEl   = getEl('att-total');
  const presentEl = getEl('att-present');
  const absentEl  = getEl('att-absent');
  const lateEl    = getEl('att-late');
  if (totalEl)   totalEl.textContent   = total;
  if (presentEl) presentEl.textContent = present - late; // حاضر فقط (بدون المتأخرين)
  if (absentEl)  absentEl.textContent  = absent;
  if (lateEl)    lateEl.textContent    = late;
}

window.filterStudents = () => {
  const val = document.getElementById('att-search').value;
  // ✅ إصلاح: نُصفّي من الفوج النشط فقط وليس من كل التلاميذ
  const activeGidx = window._activeAttGroupIdx;
  const activeGroups = window._activeAttGroups || [];
  if (activeGidx !== 'all' && activeGidx !== undefined && activeGroups[activeGidx]) {
    const groupNames = new Set((activeGroups[activeGidx].students || []).map(s => s.trim().toLowerCase()));
    const groupStudents = currentAttStudents.filter(s => groupNames.has(s.name.trim().toLowerCase()));
    renderAttStudents(groupStudents, val);
  } else {
    renderAttStudents(currentAttStudents, val);
  }
};

// ─── فلتر التلاميذ حسب حالة الدفع (خاص بالأدمين في att-modal) ───
window._adminPayFilter = 'all';
window.adminFilterByPayment = (type, btn) => {
  window._adminPayFilter = type;
  // تحديث الأزرار
  document.querySelectorAll('#admin-pay-filter-bar .pay-filter-btn').forEach(b => {
    b.classList.remove('active','active-green','active-red');
  });
  if (type === 'paid')   btn.classList.add('active-green');
  else if (type === 'unpaid') btn.classList.add('active-red');
  else btn.classList.add('active');
  // تطبيق الفلتر
  adminApplyPayFilter();
};

function adminApplyPayFilter() {
  // جلب تلاميذ الفوج الحالي
  const activeGidx = window._activeAttGroupIdx;
  const activeGroups = window._activeAttGroups || [];
  let students = currentAttStudents;
  if (activeGidx !== 'all' && activeGidx !== undefined && activeGroups[activeGidx]) {
    const groupNames = new Set((activeGroups[activeGidx].students || []).map(s => s.trim().toLowerCase()));
    students = currentAttStudents.filter(s => groupNames.has(s.name.trim().toLowerCase()));
  }
  const filter = window._adminPayFilter || 'all';
  let filtered;
  if (filter === 'paid') {
    filtered = students.filter(s => getLivePayStatus(s).ps === 'paid');
  } else if (filter === 'unpaid') {
    filtered = students.filter(s => getLivePayStatus(s).ps !== 'paid');
  } else {
    filtered = students;
  }
  // تحديث العداد
  const countEl = document.getElementById('admin-pay-filter-count');
  if (countEl) {
    const paidCount   = students.filter(s => getLivePayStatus(s).ps === 'paid').length;
    const unpaidCount = students.filter(s => getLivePayStatus(s).ps !== 'paid').length;
    countEl.innerHTML = `✅ <b>${paidCount}</b> مفعّل &nbsp;|&nbsp; ⏳ <b>${unpaidCount}</b> غير مفعّل &nbsp;/&nbsp; 👥 <b>${students.length}</b> إجمالي`;
  }
  renderAttStudents(filtered, '');
  // تحديث الإحصائيات
  adminUpdateGroupStats(filtered);
}

function adminUpdateGroupStats(students) {
  // حضور الحصة الأخيرة المسجّلة
  const gi = window._activeAttGroupIdx;
  const allGroupSessions = _allRecordedSessionsByGroup[typeof gi === 'number' ? gi : 0] || {};
  const sessionNums = Object.keys(allGroupSessions).map(Number).sort((a,b) => b-a);
  const lastSession = sessionNums.length ? allGroupSessions[sessionNums[0]] : null;
  let total = students.length, present = 0, absent = 0, late = 0;
  if (lastSession && lastSession.students) {
    const names = new Set(students.map(s => s.name.trim().toLowerCase()));
    lastSession.students.forEach(st => {
      if (!names.has(st.name.trim().toLowerCase())) return;
      if (st.late) { late++; present++; }
      else if (st.present) present++;
      else absent++;
    });
    absent = total - present;
  }
  const pct = total > 0 ? Math.round((present / total) * 100) : null;
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('gas-total', total);
  setEl('gas-present', present - late);
  setEl('gas-absent', absent);
  setEl('gas-late', late);
  setEl('gas-pct', pct !== null ? pct + '%' : '—');
}

// ─── إعادة رسم قائمة الحضور عند تحديث التذاكر ───
function refreshAttendanceListIfOpen() {
  const list = document.getElementById('att-students-list');
  if (!list || !currentAttStudents.length) return;
  const saveBtn = document.getElementById('save-att-btn');
  if (!saveBtn) return; // وضع القراءة فقط — لا نُحدّث
  const searchVal = (document.getElementById('att-search') || {}).value || '';
  renderAttStudents(currentAttStudents, searchVal);
}

// ─── متغيرات مشتركة لقائمة الحضور ───
let _selectedStudentData = null;
let _suppressSnapshot = false;

// ─── بحث ذكي في التذاكر: بالاسم أو رقم الوصل ───
window.searchStudentSuggestions = async (val) => {
  // ── نبحث عن العناصر المرئية دائماً ──
  const findVisible = (sel) => {
    const all = document.querySelectorAll(sel);
    for (const el of all) { if (el.offsetParent !== null || el.closest('#session-modal-bg')?.style.visibility === 'visible') return el; }
    return all[all.length - 1] || null;
  };
  const suggestionsEl = findVisible('#student-suggestions');
  const infoEl = findVisible('#selected-student-info');
  if (!suggestionsEl) return;

  // إذا مسح المستخدم الحقل، نصفّر الاختيار
  if (!val || val.trim().length < 2) {
    suggestionsEl.style.display = 'none';
    if (infoEl) infoEl.style.display = 'none';
    _selectedStudentData = null;
    return;
  }

  // إذا كان التلميذ مختاراً مسبقاً والاسم لا يزال نفسه — لا نتدخل
  if (_selectedStudentData && _selectedStudentData.name === val.trim()) return;

  const norm  = s => String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  const normSort = s => norm(s).split(' ').sort().join(' ');
  const q     = norm(val);
  const qSort = normSort(val);

  // ── 1. البحث في التذاكر (Firebase) ──
  const ticketMatches = (allTicketsData || []).filter(t => {
    const tn = norm(t.name);
    const ts = normSort(t.name);
    return tn.includes(q) || ts.includes(qSort) || qSort.includes(ts) ||
           (t.receipt && norm(t.receipt).includes(q));
  }).slice(0, 8);

  // ── 2. إذا لم توجد نتائج في التذاكر — ابحث في Google Sheet ──
  if (!ticketMatches.length) {
    // أظهر loading مؤقت
    suggestionsEl.style.display = 'block';
    suggestionsEl.innerHTML = `<div style="padding:12px 16px;font-size:12px;color:var(--text-muted);font-weight:700;text-align:center">🔍 جاري البحث في جدول المخيم...</div>`;

    let sheetMatches = [];
    try {
      const sheetRows = await loadSheetStudentsCache();
      // sheetRows الآن objects — نبحث في الاسم
      sheetMatches = sheetRows.filter(s => {
        const sn = norm(s.name); const ss = normSort(s.name);
        return sn.includes(q) || ss.includes(qSort) || qSort.includes(ss) ||
               q.split(' ').every(part => part.length > 0 && sn.includes(part));
      }).slice(0, 8);
    } catch(e) { console.warn('sheet search error:', e); }

    // إذا تغيّر النص أثناء الانتظار — تجاهل
    const curVal = findVisible('#new-student-name');
    if (curVal && norm(curVal.value) !== q) return;

    if (!sheetMatches.length) {
      // لا نتائج في أي مكان — عرض إضافة يدوية
      suggestionsEl.innerHTML = `
        <div style="padding:14px 16px">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;font-weight:600">لم يُوجد في التذاكر ولا في جدول المخيم — يمكنك الإضافة يدوياً:</div>
          <div class="student-suggest-item" style="border:1.5px dashed var(--border-2);border-radius:10px;cursor:pointer;padding:10px 14px" onclick="selectManualStudent('${val.replace(/'/g,"\\'")}')">
            <div style="font-size:14px;font-weight:800;color:var(--text)">➕ ${val}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">إضافة بدون تذكرة — لا يوجد رقم وصل</div>
          </div>
        </div>`;
      return;
    }

    // ── عرض نتائج الشيت مع الباقة واللغة والعمر ──
    const esc2 = s => s.replace(/'/g, "\\'");
    const hlQ = (text) => {
      const idx = norm(text).indexOf(q);
      if (idx === -1) return text;
      return text.slice(0, idx) + `<mark style="background:rgba(124,58,237,0.15);color:var(--primary);border-radius:3px;padding:0 1px">${text.slice(idx, idx+q.length)}</mark>` + text.slice(idx+q.length);
    };
    suggestionsEl.innerHTML = `
      <div style="padding:8px 14px 4px;font-size:11px;color:var(--text-muted);font-weight:800;border-bottom:1px solid var(--border)">
        📋 من جدول المخيم — لا تذكرة بعد
      </div>
      ${sheetMatches.map(s => `
        <div class="student-suggest-item" onclick="selectManualStudent('${esc2(s.name)}')"
          style="padding:11px 16px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.12s"
          onmouseenter="this.style.background='var(--primary-light)'"
          onmouseleave="this.style.background=''">
          <div style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:${s.pack||s.langs||s.age?'5px':'0'}">
            👤 ${hlQ(s.name)}
          </div>
          ${s.pack||s.langs||s.age ? `<div style="display:flex;flex-wrap:wrap;gap:5px">
            ${s.pack  ? `<span style="font-size:11px;padding:2px 9px;border-radius:99px;background:rgba(124,58,237,0.08);color:var(--primary);font-weight:700;border:1px solid var(--border-2)">📦 ${s.pack}</span>` : ''}
            ${s.langs ? `<span style="font-size:11px;padding:2px 9px;border-radius:99px;background:rgba(20,184,166,0.1);color:var(--teal);font-weight:700;border:1px solid rgba(20,184,166,0.2)">🌍 ${s.langs}</span>` : ''}
            ${s.age   ? `<span style="font-size:11px;padding:2px 9px;border-radius:99px;background:rgba(245,158,11,0.1);color:#92400e;font-weight:700;border:1px solid rgba(245,158,11,0.2)">🎂 ${s.age} سنة</span>` : ''}
          </div>` : `<div style="font-size:11px;color:var(--text-muted)">من جدول SummerPlus</div>`}
        </div>`).join('')}
      <div style="padding:10px 14px;border-top:1px solid var(--border)">
        <div class="student-suggest-item" style="border:1.5px dashed var(--border-2);border-radius:10px;cursor:pointer;padding:8px 12px" onclick="selectManualStudent('${esc2(val)}')">
          <div style="font-size:12px;font-weight:800;color:var(--text-muted)">➕ إضافة "${val}" يدوياً كما هو</div>
        </div>
      </div>`;
    return;
  }

  // ── عرض نتائج التذاكر (الحالة الاعتيادية) ──
  const matches = ticketMatches;

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
  // البحث عن العناصر المرئية
  const allInps = document.querySelectorAll('#new-student-name');
  let inp = null;
  for (const el of allInps) { if (el.offsetParent !== null || el.closest('#session-modal-bg')?.style.visibility === 'visible') { inp = el; break; } }
  if (!inp) inp = allInps[allInps.length - 1];
  if (inp) inp.value = ticket.name;
  const allSugs = document.querySelectorAll('#student-suggestions');
  let sug = null;
  for (const el of allSugs) { if (el.offsetParent !== null || el.closest('#session-modal-bg')?.style.visibility === 'visible') { sug = el; break; } }
  if (!sug) sug = allSugs[allSugs.length - 1];
  if (sug) sug.style.display = 'none';
  const allInfos = document.querySelectorAll('#selected-student-info');
  let info = null;
  for (const el of allInfos) { if (el.offsetParent !== null || el.closest('#session-modal-bg')?.style.visibility === 'visible') { info = el; break; } }
  if (!info) info = allInfos[allInfos.length - 1];
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
  const allInps = document.querySelectorAll('#new-student-name');
  let inp = null;
  for (const el of allInps) { if (el.offsetParent !== null || el.closest('#session-modal-bg')?.style.visibility === 'visible') { inp = el; break; } }
  if (!inp) inp = allInps[allInps.length - 1];
  if (inp) inp.value = name;
  const allSugs = document.querySelectorAll('#student-suggestions');
  let sug = null;
  for (const el of allSugs) { if (el.offsetParent !== null || el.closest('#session-modal-bg')?.style.visibility === 'visible') { sug = el; break; } }
  if (!sug) sug = allSugs[allSugs.length - 1];
  if (sug) sug.style.display = 'none';
  const allInfos = document.querySelectorAll('#selected-student-info');
  let info = null;
  for (const el of allInfos) { if (el.offsetParent !== null || el.closest('#session-modal-bg')?.style.visibility === 'visible') { info = el; break; } }
  if (!info) info = allInfos[allInfos.length - 1];
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
  return allTicketsData.find(t => matchNames(t.name, name)) || null;
}

window.addStudent = async () => {
  // ── نبحث عن الحقل المرئي (قد يوجد أكثر من عنصر بنفس الـ id) ──
  const allNameInps = document.querySelectorAll('#new-student-name');
  let nameInp = null;
  for (const el of allNameInps) {
    if (el.offsetParent !== null || el.closest('#session-modal-bg')?.style.visibility === 'visible') {
      nameInp = el; break;
    }
  }
  if (!nameInp) nameInp = allNameInps[allNameInps.length - 1];
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

  // منع التكرار — بالوصل إذا موجود، وإلا بالاسم مع مقارنة الكلمات بغض النظر عن الترتيب
  const normName = n => String(n||'').trim().toLowerCase().replace(/\s+/g,' ').split(' ').sort().join(' ');
  const duplicate = currentAttStudents.some(s =>
    (receipt && s.receipt && s.receipt === receipt) ||
    (!receipt && normName(s.name) === normName(name))
  );
  if (duplicate) {
    showToast(`⚠️ ${name} مضاف مسبقاً في القائمة`, true);
    return;
  }

  // ── ضمان currentAttTeacherId — fallback لوضع الأستاذ ──
  if (!currentAttTeacherId && window.currentTeacherData?.uid) {
    currentAttTeacherId = window.currentTeacherData.uid; window.currentAttTeacherId = currentAttTeacherId;
  }
  if (!currentAttTeacherId) {
    showToast('⚠️ خطأ: لم يتم تحديد الأستاذ، يرجى إعادة تحميل الصفحة', true);
    return;
  }

  const idx = currentAttStudents.length;
  const id  = receipt || genStudentId(currentAttTeacherId.slice(-4).toUpperCase(), idx);

  // ✅ إصلاح التلميذ المتأخر:
  // إذا كانت حصة مفتوحة الآن، فأي تلميذ يُضاف خلالها يُعتبر "متأخراً" تلقائياً
  const isSessionCurrentlyOpen = !!window._buildSessionModalHtml;
  const newStudent = {
    id,
    name,
    present: isSessionCurrentlyOpen, // متأخر = حاضر ضمنياً
    late:    isSessionCurrentlyOpen, // علامة التأخر
    marked:  isSessionCurrentlyOpen,
    payStatus,
    receipt: receipt || null
  };

  currentAttStudents.push(newStudent);

  // ── إذا كان المستخدم في تاب فوج معين، أضف التلميذ في groups[x].students أيضاً ──
  const activeGidx  = window._activeAttGroupIdx;
  // في وضع الأستاذ يكون _activeAttGroups غير محدد — نأخذ الأفواج من currentTeacherData
  const _rawGroups = (window._activeAttGroups && window._activeAttGroups.length > 0)
    ? window._activeAttGroups
    : (window.currentTeacherData?.groups || []);
  const activeGroups = _rawGroups.map(g => ({...g, students: [...(g.students||[])]}));
  if (activeGidx !== 'all' && activeGidx !== undefined && activeGroups[activeGidx]) {
    const gStudents = activeGroups[activeGidx].students;
    const alreadyInGroup = gStudents.some(s => s.trim().toLowerCase() === name.trim().toLowerCase());
    if (!alreadyInGroup) {
      gStudents.push(name);
      window._activeAttGroups = activeGroups;
      // تحديث currentTeacherData محلياً حتى يبقى الفلتر دقيقاً قبل Firestore snapshot
      if (window.currentTeacherData?.groups?.[activeGidx]) {
        window.currentTeacherData.groups[activeGidx].students = activeGroups[activeGidx].students;
      }
    }
  }

  // ✅ إصلاح: نحفظ currentAttStudents دائماً في قائمة الأستاذ الكاملة (merge آمن)
  _suppressSnapshot = true;
  // دمج التلميذ الجديد مع القائمة الكاملة للأستاذ (وليس فقط القائمة المعروضة)
  const savePayload = { students: currentAttStudents };
  if (activeGidx !== 'all' && activeGroups.length > 0) savePayload.groups = activeGroups;
  try {
    // نقرأ أولاً القائمة الكاملة ونضيف الطالب إليها بأمان
    const teacherDoc = await getDoc(doc(db, 'teachers', currentAttTeacherId));
    const existingFull = teacherDoc.exists() ? (teacherDoc.data().students || []) : [];
    const normN = n => String(n||'').trim().toLowerCase().replace(/\s+/g,' ').split(' ').sort().join(' ');
    const alreadyInFull = existingFull.some(s =>
      (newStudent.receipt && s.receipt === newStudent.receipt) ||
      normN(s.name) === normN(newStudent.name)
    );
    if (!alreadyInFull) existingFull.push(newStudent);
    const mergedPayload = { students: existingFull };
    if (activeGidx !== 'all' && activeGroups.length > 0) mergedPayload.groups = activeGroups;
    await setDoc(doc(db, 'teachers', currentAttTeacherId), mergedPayload, { merge: true });
  } catch(e) {
    showToast('خطأ في حفظ التلميذ: ' + e.message, true);
    _suppressSnapshot = false;
    return;
  }
  setTimeout(() => { _suppressSnapshot = false; }, 1500);

  // تحديث عداد تاب الفوج النشط
  if (activeGidx !== 'all' && activeGroups[activeGidx]) {
    const activeTabEl = document.querySelector(`.att-group-tab[data-gidx="${activeGidx}"]`);
    if (activeTabEl) {
      const cnt = activeTabEl.querySelector('.g-count');
      if (cnt) cnt.textContent = activeGroups[activeGidx].students.length;
    }
    // تحديث header الفوج
    const metaEl = document.getElementById('att-group-header-meta');
    if (metaEl) {
      const days = (activeGroups[activeGidx].days || []).join('، ');
      metaEl.textContent = `📅 ${days || 'يومياً'} — 👥 ${activeGroups[activeGidx].students.length} تلميذ`;
    }
  }
  // تحديث عداد تاب الكل
  const allTabEl = document.querySelector('.att-group-tab[data-gidx="all"]');
  if (allTabEl) { const cnt = allTabEl.querySelector('.g-count'); if (cnt) cnt.textContent = currentAttStudents.length; }

  // تنظيف الحقل والاختيار
  _selectedStudentData = null;

  // ── إعادة رسم الـ modal أو القائمة حسب السياق ──
  if (window._buildSessionModalHtml) {
    // وضع الأستاذ: نعيد بناء session modal بالكامل مع القائمة المحدثة
    openSessionModal(window._buildSessionModalHtml());
    // ملخص الحضور على تلاميذ الفوج النشط فقط
    const _gi = window._activeAttGroupIdx;
    const _grpData = (window.currentTeacherData?.groups || [])[_gi];
    if (_grpData && _grpData.students && _grpData.students.length > 0) {
      const _gSet = new Set(_grpData.students.map(s => s.trim().toLowerCase()));
      updateAttSummary(currentAttStudents.filter(s => _gSet.has(s.name.trim().toLowerCase())));
    } else {
      updateAttSummary(currentAttStudents);
    }
  } else {
    // وضع الأدمين: نستخدم renderAttStudents العادية
    const scrollY = window.scrollY;
    if (activeGidx !== 'all' && activeGidx !== undefined && activeGroups[activeGidx]) {
      const groupStudentNames = new Set((activeGroups[activeGidx].students || []).map(s => s.trim().toLowerCase()));
      const filteredForGroup = currentAttStudents.filter(s => groupStudentNames.has(s.name.trim().toLowerCase()));
      renderAttStudents(filteredForGroup, '');
      updateAttSummary(filteredForGroup);
    } else {
      renderAttStudents(currentAttStudents, '');
      updateAttSummary(currentAttStudents);
    }
    window.scrollTo({ top: scrollY });
  }

  const lateNote = isSessionCurrentlyOpen ? ' — ⏰ مُضاف كمتأخر' : '';
  if (isPaid)         showToast(`✅ تمت إضافة ${name}${lateNote} — التذكرة مفعّلة ✔`);
  else if (isUnpaid)  showToast(`⚠️ تمت إضافة ${name}${lateNote} — التذكرة غير مفعّلة`, true);
  else                showToast(`✅ تمت إضافة ${name}${lateNote} — لا توجد تذكرة مسجّلة`);
};

window.removeStudent = async (sid) => {
  if (!(await EPUI.confirm('حذف هذا التلميذ نهائياً؟', 'حذف تلميذ', { danger: true }))) return;
  // حذف فوري من DOM
  const row = document.querySelector(`.att-student-row[data-sid="${sid}"]`);
  if (row) row.remove();

  // اسم التلميذ المحذوف
  const removedStudent = currentAttStudents.find(s => s.id === sid);
  const removedName = removedStudent ? removedStudent.name.trim().toLowerCase() : null;

  // تحديث القائمة الرئيسية
  currentAttStudents = currentAttStudents.filter(s => s.id !== sid);
  updateAttSummary(currentAttStudents);

  // حذف التلميذ من جميع الأفواج أيضاً
  const updatedGroups = (window._activeAttGroups || []).map(g => ({
    ...g,
    students: (g.students || []).filter(s => s.trim().toLowerCase() !== removedName)
  }));
  window._activeAttGroups = updatedGroups;

  // حفظ في Firestore مع تجميد الـ snapshot
  _suppressSnapshot = true;
  try {
    await setDoc(doc(db, 'teachers', currentAttTeacherId),
      { students: currentAttStudents, groups: updatedGroups }, { merge: true });
  } catch(e) { showToast('خطأ: ' + e.message, true); }
  setTimeout(() => { _suppressSnapshot = false; }, 1500);

  // تحديث عداد تاب الكل
  const allTabEl = document.querySelector('.att-group-tab[data-gidx="all"]');
  if (allTabEl) { const cnt = allTabEl.querySelector('.g-count'); if (cnt) cnt.textContent = currentAttStudents.length; }
};

window.saveAttendance = async () => {
  if (!currentAttTeacherId) return;
  const tid      = currentAttTeacherId;
  // ✅ إصلاح: _activeAttGroupIdx دائماً رقم عند الحفظ (يُعيَّن في openSession_g و adminOpenSession)
  // إذا كانت قيمته 'all' فهذا خطأ في التسلسل — نستخدم _currentGroupIdx كـ fallback
  const gi = (typeof window._activeAttGroupIdx === 'number')
    ? window._activeAttGroupIdx
    : (typeof window._currentGroupIdx === 'number' ? window._currentGroupIdx : 0);
  const todayKey = new Date().toISOString().slice(0,10);
  // ✅ إصلاح: حفظ تلاميذ الفوج المحدد فقط (وليس كل التلاميذ)
  let studentsToSave = currentAttStudents;
  const activeGroup = (window._activeAttGroups || [])[gi];
  if (activeGroup && activeGroup.students && activeGroup.students.length > 0) {
    const groupNames = new Set(activeGroup.students.map(s => s.trim().toLowerCase()));
    studentsToSave = currentAttStudents.filter(s => groupNames.has(s.name.trim().toLowerCase()));
  }
  const students = studentsToSave.map(s => ({ id: s.id, name: s.name, present: !!s.present }));
  const existingSessions = _allRecordedSessionsByGroup[gi] || {};
  let sessionNum = 1;
  for (let i = 1; i <= 12; i++) { if (!existingSessions[i]) { sessionNum = i; break; } }
  const groupSuffix = '_g' + gi;
  const sessionKey  = tid + groupSuffix + '_session_' + sessionNum;
  const record = { teacherId: tid + groupSuffix, sessionNum, date: todayKey, savedAt: serverTimestamp(), students };
  try {
    await setDoc(doc(db, 'sessionAttendance', sessionKey), record);
    await setDoc(doc(db, 'attendance', tid + '_' + todayKey),
      { teacherId: tid, date: todayKey, savedAt: serverTimestamp(), students }, { merge: true });
    if (!_allRecordedSessionsByGroup[gi]) _allRecordedSessionsByGroup[gi] = {};
    _allRecordedSessionsByGroup[gi][sessionNum] = record;
    if (gi === 0) _allRecordedSessions[sessionNum] = record;
    const t     = allTeachers.find(x => x.id === tid) || currentTeacherData;
    const pres  = students.filter(s => s.present).length;
    const gName = (window._activeAttGroups || [])[gi]?.name || '';
    await addLog('📋 تسجيل حضور',
      (t?.name||'أستاذ') + ' — حصة ' + sessionNum + (gName?' ('+gName+')':'') + ' — ' + pres + '/' + students.length + ' حاضر', '✅');
    showToast('✅ تم حفظ حضور الحصة ' + sessionNum + (gName?' ('+gName+')':''));
    if (!isTeacherMode) closeAttModal();
  } catch(e) { showToast('خطأ: ' + e.message, true); }
};

// ─── Teacher self-view (when teacher logs in) ───
async function loadTeacherStudentsView(uid, teacherData) {

  onSnapshot(doc(db, 'teachers', uid), snap => {
    if (!snap.exists()) return;
    if (_suppressSnapshot) return; // جاري تعديل — تجاهل هذا التحديث
    // ✅ إصلاح نهائي: لا تُعدِّل currentAttStudents إذا كان الـ session modal مفتوحاً
    // (المستخدم يسجّل حضور أو يعدّله الآن)
    const sessionModalOpen = (() => {
      const bg = document.getElementById('session-modal-bg');
      return bg && bg.style.visibility === 'visible';
    })();
    const t = snap.data();
    currentTeacherData = { uid, id: uid, ...t };
    window.currentTeacherData = currentTeacherData;
    // ── تحميل حالة قفل الحصص والفتح اليدوي للأستاذ ──
    const lockedData = t.lockedSessions || {};
    const openedData = t.openedSessions || {};
    if (!window._lockedSessions) window._lockedSessions = {};
    if (!window._openedSessions) window._openedSessions = {};
    const groups = t.groups || [];
    groups.forEach((_, gi) => {
      window._lockedSessions[uid + '_' + gi] = {};
      window._openedSessions[uid + '_' + gi] = {};
      Object.entries(lockedData).forEach(([k, v]) => {
        const parts = k.split('_');
        if (parts.length === 2 && parseInt(parts[0]) === gi && v === true)
          window._lockedSessions[uid + '_' + gi][parseInt(parts[1])] = true;
      });
      Object.entries(openedData).forEach(([k, v]) => {
        const parts = k.split('_');
        if (parts.length === 2 && parseInt(parts[0]) === gi && v === true)
          window._openedSessions[uid + '_' + gi][parseInt(parts[1])] = true;
      });
    });
    // ✅ إصلاح: حفظ رقم الفوج النشط قبل إعادة البناء
    const _savedGroupIdx = window._currentGroupIdx || 0;
    if (!sessionModalOpen) {
      currentAttStudents = t.students ? [...t.students] : []; window.currentAttStudents = currentAttStudents;
    }

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
    // ✅ إصلاح: استعادة الفوج النشط بعد إعادة البناء
    setTimeout(() => {
      if (_savedGroupIdx > 0 && window.switchGroupTab) {
        window.switchGroupTab(_savedGroupIdx);
      }
    }, 100);
  });
}

// ─── عرض نظام الحضور بالـ 12 حصة للأستاذ — مقسّم على الأفواج ───
function showTeacherInlineAttendance(teacherId, teacherData) {
  currentAttTeacherId = teacherId; window.currentAttTeacherId = currentAttTeacherId;
  const grid = document.getElementById('teachers-grid');
  if (!grid) return;

  const teacherDays   = teacherData.days || [];
  const groups        = teacherData.groups || [];
  const arabicDayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const todayArabic   = arabicDayNames[new Date(new Date().toLocaleString('en-US',{timeZone:'Africa/Algiers'})).getDay()];

  const avatarHtml = teacherData.photo
    ? `<img src="${teacherData.photo}" alt="${teacherData.name}" style="width:56px;height:56px;border-radius:16px;object-fit:cover;flex-shrink:0">`
    : `<div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,var(--primary),#9333EA);display:flex;align-items:center;justify-content:center;font-size:22px;color:white;font-weight:900;flex-shrink:0">${(teacherData.name||'?')[0]}</div>`;

  // ── بناء tabs الأفواج ──
  const hasGroups = groups.length > 0;
  const groupsTabsHtml = hasGroups ? `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px" id="group-tabs-row">
      ${groups.map((g,i) => {
        const isActiveToday = (g.days||[]).includes(todayArabic);
        return `<button onclick="switchGroupTab(${i})" id="gtab-${i}"
          style="padding:8px 18px;border-radius:99px;border:2px solid ${i===0?'var(--primary)':'var(--border-2)'};
          background:${i===0?'linear-gradient(135deg,var(--primary),#9333EA)':'white'};
          color:${i===0?'white':'var(--text-2)'};font-size:13px;font-weight:800;cursor:pointer;
          font-family:'Tajawal',sans-serif;transition:all 0.2s;white-space:nowrap">
          🏫 ${g.name}
          ${isActiveToday?`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${i===0?'rgba(255,255,255,0.85)':'var(--success)'};margin-right:5px;vertical-align:middle"></span>`:''}
        </button>`;
      }).join('')}
    </div>` : '';

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
        <div class="sessions-sub">
          ${hasGroups
            ? 'اختر الفوج ثم اضغط على أي حصة لتسجيل الحضور أو تعديله'
            : 'اضغط على أي حصة لتسجيل الحضور — الحصص المسجّلة قابلة للتعديل في أي وقت'}
        </div>
      </div>

      ${groupsTabsHtml}

      <!-- حاوية الشبكات (فوج واحد يظهر في الوقت ذاته) -->
      <div id="groups-sessions-container">
        ${hasGroups ? groups.map((g, gi) => {
            // حصص هذا الفوج تُبنى على أيامه الخاصة
            const gDays = g.days && g.days.length ? g.days : teacherDays;
            const sessions = [];
            for (let i = 0; i < 12; i++) {
              sessions.push({ num: i+1, day: gDays[i % gDays.length] });
            }
            return `<div id="group-panel-${gi}" style="display:${gi===0?'block':'none'}">
              <div style="background:var(--primary-light);border:1px solid var(--border-2);border-radius:14px;padding:10px 16px;margin-bottom:14px;font-size:13px;font-weight:700;color:var(--text-2);display:flex;align-items:center;gap:8px">
                <span style="font-size:16px">🏫</span>
                <span>${g.name}</span>
                ${(g.days||[]).length ? `<span style="font-size:11px;color:var(--primary);background:white;padding:2px 10px;border-radius:99px;border:1px solid var(--border-2)">${(g.days||[]).join(' · ')}</span>` : ''}
                <span style="margin-right:auto;font-size:11px;color:var(--text-muted)">${(g.students||[]).length} تلميذ</span>
              </div>
              <div class="sessions-grid" id="sessions-grid-g${gi}">
                ${sessions.map((s,i) => `
                  <div class="session-card locked" id="session-card-g${gi}-${i+1}" data-session="${i+1}" data-group="${gi}" onclick="">
                    <div class="session-num">حصة ${s.num}</div>
                    <div class="session-day">${s.day}</div>
                    <div class="session-dots" id="session-dots-g${gi}-${i+1}"></div>
                    <div id="session-chip-g${gi}-${i+1}"></div>
                  </div>`).join('')}
                <!-- بطاقة الملخص -->
                <div class="summary-card" onclick="openSummaryModal()">
                  <div class="summary-card-title">📊 ملخص الشهر</div>
                  <div class="summary-card-num" id="summary-sessions-done-g${gi}">0/12</div>
                  <div class="summary-card-sub">حصة مسجّلة</div>
                  <div style="margin-top:8px;font-size:11px;color:var(--primary);font-weight:700">اضغط للتفاصيل ←</div>
                </div>
              </div>
            </div>`;
          }).join('')
        : /* لا أفواج — نعرض شبكة واحدة كما كانت */ (() => {
            const sessions = [];
            for (let i = 0; i < 12; i++) {
              sessions.push({ num: i+1, day: teacherDays[i % teacherDays.length] || '—' });
            }
            return `<div id="group-panel-0">
              <div class="sessions-grid" id="sessions-grid-g0">
                ${sessions.map((s,i) => `
                  <div class="session-card locked" id="session-card-g0-${i+1}" data-session="${i+1}" data-group="0" onclick="">
                    <div class="session-num">حصة ${s.num}</div>
                    <div class="session-day">${s.day}</div>
                    <div class="session-dots" id="session-dots-g0-${i+1}"></div>
                    <div id="session-chip-g0-${i+1}"></div>
                  </div>`).join('')}
                <div class="summary-card" onclick="openSummaryModal()">
                  <div class="summary-card-title">📊 ملخص الشهر</div>
                  <div class="summary-card-num" id="summary-sessions-done-g0">0/12</div>
                  <div class="summary-card-sub">حصة مسجّلة</div>
                  <div style="margin-top:8px;font-size:11px;color:var(--primary);font-weight:700">اضغط للتفاصيل ←</div>
                </div>
              </div>
            </div>`;
          })()}
      </div>
    </div>`;

  // متغير الفوج الحالي
  window._currentGroupIdx = 0;

  // تبديل الأفواج
  window.switchGroupTab = (gi) => {
    window._currentGroupIdx = gi;
    groups.forEach((_,i) => {
      const panel = document.getElementById(`group-panel-${i}`);
      const tab   = document.getElementById(`gtab-${i}`);
      if (panel) panel.style.display = i === gi ? 'block' : 'none';
      if (tab) {
        tab.style.background = i === gi ? 'linear-gradient(135deg,var(--primary),#9333EA)' : 'white';
        tab.style.color      = i === gi ? 'white' : 'var(--text-2)';
        tab.style.borderColor= i === gi ? 'var(--primary)' : 'var(--border-2)';
      }
    });
  };

  // تحميل بيانات الحصص من Firestore لكل فوج
  const allGroups = hasGroups ? groups : [{ name: 'all', days: teacherDays, students: currentAttStudents }];
  allGroups.forEach((g, gi) => {
    const gDays = g.days && g.days.length ? g.days : teacherDays;
    const sessions = [];
    for (let i = 0; i < 12; i++) {
      sessions.push({ num: i+1, day: gDays[i % gDays.length] });
    }
    loadSessionsDataForGroup(teacherId, teacherData, sessions, gi, g);
  });
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
  window._buildSessionModalHtml = null; // تنظيف عند الإغلاق
};

// ─── تحميل بيانات الحصص من Firestore لفوج معين ───
async function loadSessionsDataForGroup(teacherId, teacherData, sessions, gi, groupData) {
  const groupSuffix = `_g${gi}`;
  onSnapshot(
    query(collection(db, 'sessionAttendance'), where('teacherId', '==', teacherId + groupSuffix)),
    snap => {
      const recordedSessions = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.sessionNum) recordedSessions[data.sessionNum] = data;
      });
      updateSessionCardsForGroup(sessions, recordedSessions, teacherData, gi, groupData);
    }
  );
}

// دالة توافقية للأدمين (تبقى كما هي)
async function loadSessionsData(teacherId, teacherData, sessions) {
  loadSessionsDataForGroup(teacherId, teacherData, sessions, 0, { days: teacherData.days, students: currentAttStudents });
}

// ─── تحديث بطاقات الحصص بناءً على البيانات — مع دعم الأفواج ───
let _allRecordedSessions = {}; // نحتفظ بها لملخص الحضور
let _allRecordedSessionsByGroup = {}; // per group

function updateSessionCardsForGroup(sessions, recordedSessions, teacherData, gi, groupData) {
  _allRecordedSessionsByGroup[gi] = recordedSessions;
  if (gi === (window._currentGroupIdx || 0)) _allRecordedSessions = recordedSessions;
  const students = currentAttStudents;

  const arabicDayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

  // ─── الوقت الرسمي في الجزائر (UTC+1) — لا نعتمد على توقيت المتصفح
  const nowDZ = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Algiers' }));
  const nowMs = nowDZ.getTime();
  const todayArabic = arabicDayNames[nowDZ.getDay()];

  // الأيام المسموح بها لهذا الفوج
  const allowedDays = groupData && groupData.days && groupData.days.length ? groupData.days : (teacherData.days || []);

  // ─── دالة مساعدة: هل هذه الحصة مفتوحة يدوياً من الأدمين؟ (تتجاوز اليوم/الوقت) ──
  const isManuallyOpened = (sessionNum) => {
    const _openedKey = (window._openedSessions || {})[(currentTeacherData?.id || teacherData?.id) + '_' + gi] || {};
    return !!_openedKey[sessionNum];
  };

  // ─── دالة مساعدة: هل نافذة تسجيل هذه الحصة مفتوحة الآن؟
  // القاعدة (بتوقيت الجزائر):
  //   • الحصة تنفتح من 01:00 صباحاً ليوم تدريسها
  //   • تُقفل عند 23:59:59 من نفس اليوم
  //   • فقط الحصة الأولى بالترتيب (isCurrent) هي التي تفتح
  //   • استثناء: إذا فتحها الأدمين يدوياً (isManuallyOpened) فهي مفتوحة دائماً بغض النظر عن اليوم/الوقت
  const isSessionOpen = (sessionDay, sessionNum) => {
    if (sessionNum != null && isManuallyOpened(sessionNum)) return true;
    if (!allowedDays.includes(sessionDay)) return false;
    const dayIdx = arabicDayNames.indexOf(sessionDay);
    if (dayIdx === -1) return false;
    // يجب أن يكون يوم الحصة هو اليوم الحالي بتوقيت الجزائر
    if (nowDZ.getDay() !== dayIdx) return false;
    // نافذة التسجيل: 01:00 → 23:59:59 بتوقيت الجزائر
    const h = nowDZ.getHours(), m = nowDZ.getMinutes();
    const totalMins = h * 60 + m;
    return totalMins >= 60 && totalMins <= 1439; // 01:00=60دق ← 23:59=1439دق
  };

  // الأدمين: لا قيود زمنية — كل حصة غير مسجّلة قابلة للتسجيل
  const adminCanRecord = !isTeacherMode;

  // ─── تحديد "الحصة الحالية" بشكل صحيح:
  // هي أول حصة غير مسجّلة يومها هو اليوم الحالي (بتوقيت الجزائر)، أو فُتحت يدوياً من الأدمين.
  // إذا لم توجد حصة اليوم → نأخذ أول حصة غير مسجّلة بالترتيب (للعرض فقط).
  let firstUnrecorded = 13; // أول حصة غير مسجّلة بالترتيب المطلق
  for (let i = 1; i <= 12; i++) {
    if (!recordedSessions[i]) { firstUnrecorded = i; break; }
  }
  // الحصة الحالية: أول حصة غير مسجّلة (يومها اليوم أو مفتوحة يدوياً)، بشرط ألا تكون قبل firstUnrecorded
  let currentSession = 13;
  for (let i = firstUnrecorded; i <= 12; i++) {
    const sDay = sessions[i - 1]?.day || '';
    if (!recordedSessions[i] && isSessionOpen(sDay, i)) { currentSession = i; break; }
  }
  // إذا ما لقينا حصة مفتوحة اليوم، نرجع لأول حصة غير مسجّلة (للعرض)
  if (currentSession === 13) currentSession = firstUnrecorded;

  // تحديث عداد الملخص
  const doneCount = Object.keys(recordedSessions).length;
  const summaryEl = document.getElementById(`summary-sessions-done-g${gi}`);
  if (summaryEl) summaryEl.textContent = `${doneCount}/12`;

  for (let i = 1; i <= 12; i++) {
    const card    = document.getElementById(`session-card-g${gi}-${i}`);
    const dotsEl  = document.getElementById(`session-dots-g${gi}-${i}`);
    const chipEl  = document.getElementById(`session-chip-g${gi}-${i}`);
    if (!card) continue;

    const isRecorded  = !!recordedSessions[i];
    const sessionDay  = sessions[i - 1]?.day || '';
    const isCurrent   = i === currentSession;

    // ── الحصة مفتوحة: هي الحصة الحالية (بالمنطق أعلاه) = يومها اليوم + النافذة مفتوحة، أو مفتوحة يدوياً
    const sessionIsOpen = (isCurrent && isSessionOpen(sessionDay, i)) || isManuallyOpened(i);

    // ── الحصة "فائتة": لم تُسجّل، قبل الحصة الحالية، ونافذتها مغلقة، وغير مفتوحة يدوياً
    const isMissed = !isRecorded && !sessionIsOpen && i < currentSession;

    card.classList.remove('locked', 'current', 'done', 'missed');

    // ── فحص القفل الذي يضعه الأدمين ──
    const _lockedKey = (window._lockedSessions || {})[currentTeacherData?.id + '_' + gi] || {};
    const isAdminLocked = !!_lockedKey[i] && isTeacherMode; // القفل يؤثر على الأستاذ فقط
    if (isAdminLocked) {
      card.classList.add('locked');
      card.setAttribute('onclick', '');
      chipEl.innerHTML = `<span class="session-status-chip locked-chip">🔒 مغلقة</span>`;
      dotsEl.innerHTML = '';
      continue;
    }

    if (isRecorded) {
      // مسجّلة — الأدمين يعدّل دائماً، الأستاذ خلال 24 ساعة فقط
      let teacherCanEdit = false;
      if (isTeacherMode) {
        const rec = recordedSessions[i];
        const savedTs = rec?.savedAt?.toDate ? rec.savedAt.toDate() : (rec?.date ? new Date(rec.date + 'T00:00:00') : null);
        if (savedTs) teacherCanEdit = (nowMs - savedTs.getTime()) / (1000 * 60 * 60) < 24;
      }
      if (!isTeacherMode || teacherCanEdit) {
        card.setAttribute('onclick', `editSession_g(${i}, ${gi})`);
      } else {
        card.setAttribute('onclick', `viewSessionHistory_g(${i}, ${gi})`);
      }
    } else if (adminCanRecord) {
      // الأدمين: كل حصة غير مسجّلة — مفتوحة للتسجيل بلا قيود
      card.setAttribute('onclick', `openSession_g(${i}, ${gi})`);
    } else if (isMissed) {
      card.setAttribute('onclick', `viewSessionHistory_g(${i}, ${gi})`);
    } else if (sessionIsOpen) {
      card.setAttribute('onclick', `openSession_g(${i}, ${gi})`);
    } else {
      card.setAttribute('onclick', '');
    }

    if (isRecorded) {
      card.classList.add('done');
      const recDate = recordedSessions[i].savedAt?.toDate
        ? recordedSessions[i].savedAt.toDate().toLocaleDateString('ar-DZ', {day:'numeric', month:'short'})
        : (recordedSessions[i].date || '');
      let editHint = '';
      if (!isTeacherMode) {
        editHint = `<div style="font-size:9px;color:var(--primary);font-weight:700;margin-top:3px">✏️ اضغط للتعديل</div>`;
      } else {
        const rec2 = recordedSessions[i];
        const savedTs2 = rec2?.savedAt?.toDate ? rec2.savedAt.toDate() : (rec2?.date ? new Date(rec2.date + 'T00:00:00') : null);
        if (savedTs2) {
          const hrs = (Date.now() - savedTs2.getTime()) / (1000 * 60 * 60);
          if (hrs < 24) {
            const hrsLeft = Math.max(0, Math.ceil(24 - hrs));
            editHint = `<div style="font-size:9px;color:var(--primary);font-weight:700;margin-top:3px">✏️ تعديل (${hrsLeft}س متبقية)</div>`;
          } else {
            editHint = `<div style="font-size:9px;color:var(--text-muted);font-weight:700;margin-top:3px">🔒 انتهت مدة التعديل</div>`;
          }
        }
      }
      chipEl.innerHTML = `<span class="session-status-chip done-chip">✅ مسجّلة</span>${recDate ? `<div style="font-size:9px;color:#059669;font-weight:700;margin-top:3px">${recDate}</div>` : ''}${editHint}`;
      const recStudents = recordedSessions[i].students || [];
      dotsEl.innerHTML = recStudents.length
        ? recStudents.map(s => {
            if (s.late)    return `<span class="sdot" style="background:#F59E0B;border-color:#F59E0B" title="${s.name}: متأخر"></span>`;
            if (s.present) return `<span class="sdot recorded" title="${s.name}: حاضر"></span>`;
            return `<span class="sdot" title="${s.name}: غائب"></span>`;
          }).join('')
        : `<span class="sdot recorded"></span>`;
    } else if (isMissed) {
      card.classList.add('missed');
      if (adminCanRecord) {
        chipEl.innerHTML = `<span class="session-status-chip" style="background:rgba(245,158,11,0.12);color:#d97706;border:1px solid rgba(245,158,11,0.25)">⚠️ فائتة</span><div style="font-size:9px;color:var(--primary);font-weight:700;margin-top:3px">✏️ اضغط للتسجيل</div>`;
      } else {
        chipEl.innerHTML = `<span class="session-status-chip" style="background:rgba(245,158,11,0.12);color:#d97706;border:1px solid rgba(245,158,11,0.25)">⚠️ فائتة</span><div style="font-size:9px;color:#d97706;font-weight:700;margin-top:3px">انتهى وقتها</div>`;
      }
      dotsEl.innerHTML = students.length
        ? students.map(s => `<span class="sdot" style="opacity:0.4" title="${s.name}"></span>`).join('')
        : `<span class="sdot" style="opacity:0.4"></span>`;
    } else if (sessionIsOpen) {
      card.classList.add('current');
      const openedManually = isManuallyOpened(i);
      if (openedManually) {
        // فُتحت يدوياً من الأدمين — لا قيد وقت/يوم
        chipEl.innerHTML = `<span class="session-status-chip current-chip" style="background:rgba(59,130,246,0.12);color:#2563EB;border-color:rgba(59,130,246,0.3)">🔓 فُتحت لك من الإدارة</span><div style="font-size:9px;color:#2563EB;font-weight:700;margin-top:3px">يمكنك تسجيلها الآن</div>`;
      } else {
        // الوقت المتبقي حتى قفل الحصة (23:59 بتوقيت الجزائر)
        const minsLeft2 = Math.max(0, (23 * 60 + 59) - (nowDZ.getHours() * 60 + nowDZ.getMinutes()));
        const timeHint2 = minsLeft2 > 60
          ? `${Math.ceil(minsLeft2/60)}س متبقية`
          : `${minsLeft2} دقيقة`;
        const todayStr = nowDZ.toLocaleDateString('ar-DZ', {day:'numeric', month:'short'});
        chipEl.innerHTML = `<span class="session-status-chip current-chip">▶ الحصة الحالية</span><div style="font-size:9px;color:var(--primary);font-weight:700;margin-top:3px">${todayStr} — ⏳ ${timeHint2}</div>`;
      }
      dotsEl.innerHTML = students.length
        ? students.map((s,idx) => `<span class="sdot ${idx===0?'current-dot':''}" title="${s.name}"></span>`).join('')
        : `<span class="sdot current-dot"></span>`;
    } else {
      card.classList.add('locked');
      // الحصة مقفلة — الأدمين يقدر يسجّل في أي وقت
      if (adminCanRecord) {
        chipEl.innerHTML = `<span class="session-status-chip" style="background:rgba(124,58,237,0.08);color:var(--primary);border:1px solid var(--border-2);font-size:9px">📅 ${sessionDay||'—'}</span><div style="font-size:9px;color:var(--primary);font-weight:700;margin-top:3px">✏️ اضغط للتسجيل</div>`;
      } else if (sessionDay) {
        // حساب تاريخ الفتح القادم بتوقيت الجزائر
        const dayIdx3 = arabicDayNames.indexOf(sessionDay);
        const todayIdx3 = nowDZ.getDay();
        let daysUntil3 = (dayIdx3 - todayIdx3 + 7) % 7;
        // 0 = اليوم نفسه لكن النافذة مغلقة (قبل 01:00 أو ليست الحصة الحالية) → الأسبوع القادم
        if (daysUntil3 === 0) daysUntil3 = 7;
        const opensOn3 = new Date(nowDZ); opensOn3.setDate(nowDZ.getDate() + daysUntil3);
        const opensStr3 = opensOn3.toLocaleDateString('ar-DZ', {weekday:'long', day:'numeric', month:'short'});
        chipEl.innerHTML = `<span class="session-status-chip locked-chip" style="font-size:9px">🔒 ${sessionDay}</span><div style="font-size:9px;color:#888;font-weight:700;margin-top:3px">تنفتح ${opensStr3} 01:00</div>`;
      } else {
        chipEl.innerHTML = `<span class="session-status-chip locked-chip" style="font-size:9px">📅 ${sessionDay}</span>`;
      }
      dotsEl.innerHTML = students.length
        ? students.map(s => `<span class="sdot" title="${s.name}"></span>`).join('')
        : `<span class="sdot"></span>`;
    }
  }
}

// دالة توافقية قديمة للأدمين
function updateSessionCards(sessions, recordedSessions, teacherData) {
  updateSessionCardsForGroup(sessions, recordedSessions, teacherData, 0, teacherData);
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
        <div class="att-student-row" style="pointer-events:none;opacity:${(s.present||s.late)?1:0.6}">
          <span class="att-student-id">${s.id || '—'}</span>
          <span class="att-student-name">${s.name}</span>
          <span class="pay-badge" style="margin-right:auto;${s.late?'background:rgba(245,158,11,0.1);color:#d97706;border:1px solid rgba(245,158,11,0.3)':s.present?'background:var(--success-soft);color:#059669;border:1px solid rgba(16,185,129,0.25)':'background:var(--danger-soft);color:#DC2626;border:1px solid rgba(239,68,68,0.2)'}">
            ${s.late ? '⏰ متأخر' : s.present ? '✅ حاضر' : '❌ غائب'}
          </span>
        </div>`).join('') || `<div style="text-align:center;padding:20px;color:var(--text-muted)">لا يوجد تلاميذ</div>`;

  const presentCount = isMissed ? 0 : (record.students || []).filter(s => s.present || s.late).length;
  const lateCountV   = isMissed ? 0 : (record.students || []).filter(s => s.late).length;
  const totalCount   = isMissed ? 0 : (record.students || []).length;

  openSessionModal(`
    <div class="session-att-header" style="background:${isMissed?'rgba(245,158,11,0.08)':'var(--success-soft)'};border-radius:24px 24px 0 0;border-bottom:1px solid var(--border)">
      <div style="font-size:22px">${isMissed ? '⚠️' : '📋'}</div>
      <div style="flex:1">
        <div style="font-size:16px;font-weight:900;color:var(--text)">سجل الحصة ${sessionNum} — ${isMissed ? 'فائتة' : 'مسجّلة'}</div>
        ${recDate ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">📅 ${recDate}</div>` : ''}
      </div>
      ${!isMissed ? `<div style="font-size:13px;font-weight:800;color:var(--success)">${presentCount}/${totalCount} حاضر${lateCountV ? ` <span style="color:#d97706;font-size:11px">(${lateCountV} متأخر)</span>` : ''}</div>` : ''}
      <button onclick="closeSessionModal()" style="padding:8px 16px;border-radius:12px;border:1px solid var(--border-2);background:var(--card);color:var(--text-muted);font-size:13px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700">✕</button>
    </div>
    <div style="padding:20px 24px">
      <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--text-muted);font-weight:700;text-align:center">
        🔒 هذه الحصة في وضع القراءة فقط — لا يمكن التعديل عليها
      </div>
      <div class="att-students-list">${studentsHtml}</div>
    </div>`);
};

// ─── فتح حصة لفوج معين ───
window.openSession_g = (sessionNum, gi) => {
  currentOpenSession = sessionNum;
  window._currentGroupIdx = gi;
  // ✅ إصلاح: مزامنة _activeAttGroupIdx مع gi حتى تعمل addStudent بشكل صحيح
  window._activeAttGroupIdx = gi;
  // ── ضمان أن currentAttTeacherId محدد دائماً (مهم لدالة addStudent) ──
  if (!currentAttTeacherId && window.currentTeacherData?.uid) {
    currentAttTeacherId = window.currentTeacherData.uid; window.currentAttTeacherId = currentAttTeacherId;
  }

  // ── دالة بناء HTML للـ modal — محفوظة على window لإعادة الاستخدام بعد إضافة تلميذ ──
  window._buildSessionModalHtml = () => {
    // ✅ إصلاح: جلب بيانات الأستاذ من allTeachers عند الأدمين (currentTeacherData غير محدد)
    const teacherRecord = window.currentTeacherData || (allTeachers||[]).find(x => x.id === currentAttTeacherId) || {};
    const teacherGroups = teacherRecord.groups || window._activeAttGroups || [];
    const groupData = teacherGroups[gi];
    let students = currentAttStudents;
    if (groupData && groupData.students && groupData.students.length > 0) {
      const groupNames = new Set(groupData.students.map(s => s.trim().toLowerCase()));
      students = currentAttStudents.filter(s => groupNames.has(s.name.trim().toLowerCase()));
    }
    const studentsHtml = students.length
      ? students.map(s => {
          const { ps, rc } = getLivePayStatus(s);
          const { source, pack } = getStudentSourceInfo(s);
          const badgeHtml =
            ps === 'paid'   ? `<span class="pay-badge paid">✅ مفعّلة</span>` :
            ps === 'unpaid' ? `<span class="pay-badge unpaid">⏳ غير مفعّلة</span>` :
                             `<span class="pay-badge unknown">— لا تذكرة</span>`;
          const receiptHtml = rc ? `<span style="font-size:10px;font-family:monospace;color:var(--primary);background:var(--primary-light);padding:2px 7px;border-radius:6px;flex-shrink:0">${rc}</span>` : '';
          const sourceBadge =
            source === 'sheet'  ? `<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;background:rgba(20,184,166,0.12);color:var(--teal);border:1px solid rgba(20,184,166,0.3);white-space:nowrap;flex-shrink:0">📊</span>` :
            source === 'ticket' ? `<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;background:rgba(124,58,237,0.1);color:var(--primary);border:1px solid var(--border-2);white-space:nowrap;flex-shrink:0">🎟️</span>` :
                                  `<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;background:rgba(245,158,11,0.12);color:#92400e;border:1px solid rgba(245,158,11,0.3);white-space:nowrap;flex-shrink:0">✏️</span>`;
          const packBadge = pack ? `<span style="font-size:9px;padding:2px 6px;border-radius:99px;background:rgba(99,102,241,0.08);color:#4f46e5;border:1px solid rgba(99,102,241,0.18);white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis;display:inline-block;vertical-align:middle;flex-shrink:0" title="${pack}">📦</span>` : '';
          return `
          <div class="att-student-row" data-sid="${s.id}">
            <span class="att-student-id">${s.id}</span>
            <span class="att-student-name">${s.name}</span>
            ${badgeHtml}${receiptHtml}${sourceBadge}${packBadge}
            <div class="student-dots-row">
              ${Array.from({length:12},(_,i)=>`<span class="sdot ${i===sessionNum-1?'current-dot':''}"></span>`).join('')}
            </div>
            <div class="att-toggle" style="margin-right:auto">
              <div class="att-check ${s.present&&!s.late?'present':''}" title="حاضر" onclick="toggleStudentAtt('${s.id}',true,this)">✓</div>
              <div class="att-check ${(!s.present&&s.marked)||(!s.present&&!s.late&&s.marked)?'absent':''}" title="غائب" onclick="toggleStudentAtt('${s.id}',false,this)" style="font-size:12px">✗</div>
              <div class="att-check ${s.late?'late':''}" title="متأخر" onclick="toggleStudentLate('${s.id}',this)" style="font-size:11px">⏰</div>
            </div>
            <button style="padding:4px 8px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:var(--danger-soft);color:var(--danger);font-size:11px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700;flex-shrink:0" onclick="removeStudent('${s.id}')">حذف</button>
          </div>`;
        }).join('')
      : `<div style="text-align:center;padding:30px;color:var(--text-muted)">لا يوجد تلاميذ — أضف تلاميذ أولاً</div>`;

    const groupName = groupData?.name || '';

    return `
      <div class="session-att-header" style="border-radius:24px 24px 0 0;border-bottom:1px solid var(--border)">
        <div style="font-size:22px">📋</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:900;color:var(--text)">تسجيل حضور الحصة ${sessionNum} من 12 ${groupName?`— ${groupName}`:''}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">حدد الحضور لكل تلميذ ثم احفظ</div>
        </div>
        <button onclick="closeSessionModal()" style="padding:8px 16px;border-radius:12px;border:1px solid var(--border-2);background:var(--card);color:var(--text-muted);font-size:13px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700">✕</button>
      </div>
      <div style="padding:20px 24px">
        <div class="att-summary-grid" style="margin-bottom:16px">
          <div class="att-summary-card"><div class="att-summary-n" id="att-total">0</div><div class="att-summary-l">إجمالي</div></div>
          <div class="att-summary-card" style="background:var(--success-soft);border-color:rgba(16,185,129,0.2)"><div class="att-summary-n" id="att-present" style="color:var(--success)">0</div><div class="att-summary-l">حاضر</div></div>
          <div class="att-summary-card" style="background:var(--danger-soft);border-color:rgba(239,68,68,0.15)"><div class="att-summary-n" id="att-absent" style="color:var(--danger)">0</div><div class="att-summary-l">غائب</div></div>
          <div class="att-summary-card" style="background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.2)"><div class="att-summary-n" id="att-late" style="color:#d97706">0</div><div class="att-summary-l">متأخر</div></div>
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
        <button class="btn-primary" id="save-att-btn" onclick="saveSessionAttendance_g(${sessionNum}, ${gi})" style="margin-top:14px">💾 حفظ حضور الحصة ${sessionNum}</button>
      </div>`;
  };

  openSessionModal(window._buildSessionModalHtml());
  // ✅ إصلاح: حساب ملخص الحضور على تلاميذ الفوج فقط
  const _grps = window.currentTeacherData?.groups || [];
  const _gData = _grps[gi];
  if (_gData && _gData.students && _gData.students.length > 0) {
    const _gNames = new Set(_gData.students.map(s => s.trim().toLowerCase()));
    const _gStudents = currentAttStudents.filter(s => _gNames.has(s.name.trim().toLowerCase()));
    updateAttSummary(_gStudents);
  } else {
    updateAttSummary(currentAttStudents);
  }
};

// ─── فتح حصة للأدمين (دالة توافقية) ───
window.openSession = (sessionNum) => {
  const card = document.getElementById(`session-card-g0-${sessionNum}`) || document.getElementById(`session-card-${sessionNum}`);
  if (!card || card.classList.contains('locked')) return;
  if (card.classList.contains('done')) {
    showToast('✅ هذه الحصة مسجّلة مسبقاً', false); return;
  }
  openSession_g(sessionNum, window._currentGroupIdx || 0);
};

// ─── تعديل حصة مسجّلة — للأدمين فقط ───
// ─── إعادة تسجيل الحضور من الصفر — حذف كل sessionAttendance للأستاذ ───
window.resetAttendance = async () => {
  const tid = currentAttTeacherId;
  if (!tid) return;
  const teacherName = document.getElementById('att-modal-teacher-name')?.textContent || 'الأستاذ';

  const confirmed = await EPUI.confirm(`⚠️ سيتم حذف جميع سجلات الحضور للأستاذ "${teacherName}" نهائياً.\n\nهذه العملية لا يمكن التراجع عنها.\n\nهل أنت متأكد؟`, 'حذف الحضور', { danger: true });
  if (!confirmed) return;

  // تأكيد ثانٍ
  const confirmed2 = await EPUI.confirm(`تأكيد أخير: حذف كل سجلات حضور "${teacherName}"؟`, 'تأكيد نهائي', { danger: true });
  if (!confirmed2) return;

  try {
    // جلب كل docs الخاصة بهذا الأستاذ من sessionAttendance
    const q = query(
      collection(db, 'sessionAttendance'),
      where('teacherId', '>=', tid + '_g'),
      where('teacherId', '<=', tid + '_g\uf8ff')
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      showToast('لا توجد سجلات حضور لهذا الأستاذ', false);
      return;
    }

    // حذف batch
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    // تصفير المتغيرات المحلية
    _allRecordedSessions = {};
    _allRecordedSessionsByGroup = {};

    await addLog('🔄 إعادة ضبط الحضور', `تم حذف ${snap.size} سجل حضور للأستاذ ${teacherName}`, '⚠️');
    showToast(`✅ تم حذف ${snap.size} سجل — الحضور جاهز للتسجيل من جديد`);
    closeAttModal();
  } catch(e) {
    showToast('خطأ: ' + e.message, true);
  }
};

// ─── picker: اختيار حصة مسجّلة للتعديل ───
window.openEditSessionPicker = () => {
  const tid = currentAttTeacherId;
  if (!tid) return;

  // جمع كل الحصص المسجّلة من جميع الأفواج
  const allRecorded = []; // { sessionNum, gi, groupName, date, present, total }
  const groups = window._activeAttGroups || [];

  Object.entries(_allRecordedSessionsByGroup || {}).forEach(([giStr, sessions]) => {
    const gi = parseInt(giStr);
    const groupName = groups[gi]?.name || (Object.keys(_allRecordedSessionsByGroup).length > 1 ? `فوج ${gi+1}` : '');
    Object.entries(sessions).forEach(([num, record]) => {
      const present = (record.students || []).filter(s => s.present).length;
      const total   = (record.students || []).length;
      const date    = record.savedAt?.toDate
        ? record.savedAt.toDate().toLocaleDateString('ar-DZ', {day:'numeric', month:'long'})
        : (record.date || '');
      allRecorded.push({ sessionNum: parseInt(num), gi, groupName, date, present, total });
    });
  });

  if (!allRecorded.length) {
    showToast('⚠️ لا توجد حصص مسجّلة لهذا الأستاذ بعد', true);
    return;
  }

  // ترتيب: فوج ثم رقم الحصة
  allRecorded.sort((a, b) => a.gi - b.gi || a.sessionNum - b.sessionNum);

  const rowsHtml = allRecorded.map(r => `
    <div onclick="editSession_g(${r.sessionNum}, ${r.gi})"
      style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;border:1.5px solid var(--border);background:white;cursor:pointer;transition:all 0.2s;margin-bottom:8px"
      onmouseover="this.style.borderColor='var(--primary)';this.style.background='var(--primary-light)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.background='white'">
      <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(217,119,6,0.12),rgba(245,158,11,0.08));display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#b45309;flex-shrink:0">${r.sessionNum}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:800;color:var(--text)">
          حصة ${r.sessionNum}${r.groupName ? ` — ${r.groupName}` : ''}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
          ${r.date ? `📅 ${r.date} · ` : ''}👥 ${r.present}/${r.total} حاضر
        </div>
      </div>
      <div style="font-size:12px;font-weight:800;color:#b45309;flex-shrink:0">تعديل ✏️</div>
    </div>`).join('');

  openSessionModal(`
    <div class="session-att-header" style="border-radius:24px 24px 0 0;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(124,58,237,0.04))">
      <div style="font-size:22px">✏️</div>
      <div style="flex:1">
        <div style="font-size:16px;font-weight:900;color:var(--text)">اختر الحصة للتعديل</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${allRecorded.length} حصة مسجّلة</div>
      </div>
      <button onclick="closeSessionModal()" style="padding:8px 16px;border-radius:12px;border:1px solid var(--border-2);background:var(--card);color:var(--text-muted);font-size:13px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700">✕</button>
    </div>
    <div style="padding:20px 24px">${rowsHtml}</div>`);
};

window.editSession_g = async (sessionNum, gi) => {
  const tid = currentAttTeacherId;
  if (!tid) return;

  // نفس المفتاح المستخدم في saveSessionAttendance_g
  const sessionKey = `${tid}_g${gi}_session_${sessionNum}`;
  const docRef     = doc(db, 'sessionAttendance', sessionKey);
  const docSnap    = await getDoc(docRef);

  let savedStudents = [];
  if (docSnap.exists()) {
    savedStudents = docSnap.data().students || [];
  } else {
    showToast('⚠️ لم يُعثر على سجل لهذه الحصة', true);
    return;
  }

  // ✅ تحقق من نافذة 24 ساعة للأستاذ فقط
  if (isTeacherMode) {
    const recData  = docSnap.data();
    const savedTs  = recData?.savedAt?.toDate ? recData.savedAt.toDate()
                   : (recData?.date ? new Date(recData.date + 'T00:00:00') : null);
    if (savedTs) {
      const hoursSince = (Date.now() - savedTs.getTime()) / (1000 * 60 * 60);
      if (hoursSince >= 24) {
        showToast('🔒 انتهت مدة التعديل — يمكن التعديل خلال 24 ساعة فقط من تسجيل الحضور', true);
        return;
      }
    }
  }

  // تحميل قائمة التلاميذ إلى currentAttStudents
  currentAttStudents = savedStudents.map(s => ({ ...s, marked: true })); window.currentAttStudents = currentAttStudents;
  currentOpenSession = sessionNum;
  window._currentGroupIdx = gi;
  window._activeAttGroupIdx = gi; // ✅ إصلاح: مزامنة _activeAttGroupIdx لدالة addStudent
  window._editingDocRef    = docRef;

  const teacherGroups = (window.currentTeacherData?.groups) || (allTeachers||[]).find(x => x.id === currentAttTeacherId)?.groups || window._activeAttGroups || [];
  const groupName = teacherGroups[gi]?.name || '';

  const studentsHtml = () => currentAttStudents.length
    ? currentAttStudents.map(s => {
        const { ps, rc } = getLivePayStatus(s);
        const { source, pack } = getStudentSourceInfo(s);
        const badgeHtml =
          ps === 'paid'   ? `<span class="pay-badge paid">✅ مفعّلة</span>` :
          ps === 'unpaid' ? `<span class="pay-badge unpaid">⏳ غير مفعّلة</span>` :
                           `<span class="pay-badge unknown">— لا تذكرة</span>`;
        const receiptHtml = rc ? `<span style="font-size:10px;font-family:monospace;color:var(--primary);background:var(--primary-light);padding:2px 7px;border-radius:6px;flex-shrink:0">${rc}</span>` : '';
        const sourceBadge =
          source === 'sheet'  ? `<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;background:rgba(20,184,166,0.12);color:var(--teal);border:1px solid rgba(20,184,166,0.3);white-space:nowrap;flex-shrink:0" title="من Google Sheet">📊</span>` :
          source === 'ticket' ? `<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;background:rgba(124,58,237,0.1);color:var(--primary);border:1px solid var(--border-2);white-space:nowrap;flex-shrink:0" title="من التذاكر">🎟️</span>` :
                                `<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;background:rgba(245,158,11,0.12);color:#92400e;border:1px solid rgba(245,158,11,0.3);white-space:nowrap;flex-shrink:0" title="مضاف يدوياً">✏️</span>`;
        const packBadge = pack ? `<span style="font-size:9px;padding:2px 6px;border-radius:99px;background:rgba(99,102,241,0.08);color:#4f46e5;border:1px solid rgba(99,102,241,0.18);white-space:nowrap;flex-shrink:0" title="${pack}">📦</span>` : '';
        return `
        <div class="att-student-row" data-sid="${s.id}">
          <span class="att-student-id">${s.id}</span>
          <span class="att-student-name">${s.name}</span>
          ${badgeHtml}${receiptHtml}${sourceBadge}${packBadge}
          <div class="att-toggle" style="margin-right:auto">
            <div class="att-check ${s.present&&!s.late?'present':''}" title="حاضر" onclick="toggleStudentAtt('${s.id}',true,this)">✓</div>
            <div class="att-check ${!s.present&&!s.late&&s.marked?'absent':''}" title="غائب" onclick="toggleStudentAtt('${s.id}',false,this)" style="font-size:12px">✗</div>
            <div class="att-check ${s.late?'late':''}" title="متأخر" onclick="toggleStudentLate('${s.id}',this)" style="font-size:11px">⏰</div>
          </div>
          <button style="padding:4px 8px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:var(--danger-soft);color:var(--danger);font-size:11px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700;flex-shrink:0" onclick="removeStudent('${s.id}')">حذف</button>
        </div>`;
      }).join('')
    : `<div style="text-align:center;padding:30px;color:var(--text-muted)">لا يوجد تلاميذ في هذه الحصة</div>`;

  // ✅ إصلاح: تعريف _buildSessionModalHtml حتى تعمل addStudent بشكل صحيح داخل modal التعديل
  window._buildSessionModalHtml = () => `
    <div class="session-att-header" style="border-radius:24px 24px 0 0;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(124,58,237,0.06))">
      <div style="font-size:22px">✏️</div>
      <div style="flex:1">
        <div style="font-size:16px;font-weight:900;color:var(--text)">تعديل حضور الحصة ${sessionNum} من 12 ${groupName?`— ${groupName}`:''}</div>
        <div id="edit-session-time-hint" style="font-size:12px;color:#d97706;font-weight:700;margin-top:2px">⚠️ أنت تعدّل حصة مسجّلة مسبقاً</div>
      </div>
      <button onclick="closeSessionModal()" style="padding:8px 16px;border-radius:12px;border:1px solid var(--border-2);background:var(--card);color:var(--text-muted);font-size:13px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700">✕</button>
    </div>
    <div style="padding:20px 24px">
      <div class="att-summary-grid" style="margin-bottom:16px">
        <div class="att-summary-card"><div class="att-summary-n" id="att-total">0</div><div class="att-summary-l">إجمالي</div></div>
        <div class="att-summary-card" style="background:var(--success-soft);border-color:rgba(16,185,129,0.2)"><div class="att-summary-n" id="att-present" style="color:var(--success)">0</div><div class="att-summary-l">حاضر</div></div>
        <div class="att-summary-card" style="background:var(--danger-soft);border-color:rgba(239,68,68,0.15)"><div class="att-summary-n" id="att-absent" style="color:var(--danger)">0</div><div class="att-summary-l">غائب</div></div>
        <div class="att-summary-card" style="background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.2)"><div class="att-summary-n" id="att-late" style="color:#d97706">0</div><div class="att-summary-l">متأخر</div></div>
      </div>
      <div class="att-search-wrap" style="margin-bottom:12px">
        <span class="att-search-icon">🔍</span>
        <input class="inp" type="text" id="att-search" placeholder="ابحث عن تلميذ..." style="padding-right:40px" oninput="filterStudents()">
      </div>
      <div class="att-students-list" id="att-students-list">${studentsHtml()}</div>
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
      <button class="btn-primary" id="save-att-btn" onclick="saveEditedSession_g(${sessionNum}, ${gi})" style="margin-top:14px;background:linear-gradient(135deg,#d97706,#b45309)">💾 حفظ التعديلات على الحصة ${sessionNum}</button>
    </div>`;

  openSessionModal(window._buildSessionModalHtml());
  updateAttSummary(currentAttStudents);

  // ✅ تحديث hint الوقت المتبقي للتعديل
  if (isTeacherMode) {
    const recData2 = docSnap.data();
    const ts2 = recData2?.savedAt?.toDate ? recData2.savedAt.toDate()
              : (recData2?.date ? new Date(recData2.date + 'T00:00:00') : null);
    const hintEl = document.getElementById('edit-session-time-hint');
    if (hintEl && ts2) {
      const hrsLeft = Math.max(0, 24 - (Date.now() - ts2.getTime()) / (1000 * 60 * 60));
      const minsLeft = Math.ceil(hrsLeft * 60);
      if (minsLeft > 60) {
        hintEl.textContent = `✏️ يمكنك التعديل — متبقي ${Math.ceil(hrsLeft)} ساعة`;
        hintEl.style.color = '#059669';
      } else {
        hintEl.textContent = `⚠️ تنتهي مدة التعديل خلال ${minsLeft} دقيقة`;
        hintEl.style.color = '#d97706';
      }
    }
  }
};

// ─── حفظ تعديلات حصة مسجّلة ───
window.saveEditedSession_g = async (sessionNum, gi) => {
  const docRef = window._editingDocRef;
  if (!docRef) { showToast('خطأ: لم يُحدد سجل للتعديل', true); return; }

  // ✅ تحقق أخير من نافذة 24 ساعة قبل الحفظ (حماية إضافية للأستاذ)
  if (isTeacherMode) {
    const snap24 = await getDoc(docRef);
    if (snap24.exists()) {
      const d = snap24.data();
      const ts = d?.savedAt?.toDate ? d.savedAt.toDate() : (d?.date ? new Date(d.date + 'T00:00:00') : null);
      if (ts && (Date.now() - ts.getTime()) / (1000 * 60 * 60) >= 24) {
        showToast('🔒 انتهت مدة التعديل — لا يمكن الحفظ بعد 24 ساعة', true);
        closeSessionModal();
        return;
      }
    }
  }

  try {
    // ✅ قراءة الحضور من DOM — المصدر الوحيد للحقيقة (يشمل وضع "متأخر")
    const domData = readAttendanceFromDOM();
    const savedStudents = domData
      ? domData
      : currentAttStudents.map(s => ({ id: s.id, name: s.name, present: !!s.present, late: !!s.late }));

    if (savedStudents.length === 0) {
      showToast('⚠️ لا يوجد تلاميذ للحفظ — حاول مرة أخرى', true);
      return;
    }
    await setDoc(docRef, {
      teacherId: currentAttTeacherId + `_g${gi}`,
      sessionNum,
      students: savedStudents,
      editedAt: serverTimestamp(),
      editedByAdmin: true
    }, { merge: true });

    // ✅ إصلاح: تحديث _allRecordedSessionsByGroup في الذاكرة حتى يعكس ملخص الشهر التعديلات فوراً
    if (!_allRecordedSessionsByGroup[gi]) _allRecordedSessionsByGroup[gi] = {};
    _allRecordedSessionsByGroup[gi][sessionNum] = {
      ...((_allRecordedSessionsByGroup[gi][sessionNum]) || {}),
      students: savedStudents,
      sessionNum,
      editedByAdmin: true
    };
    if (gi === 0) _allRecordedSessions[sessionNum] = _allRecordedSessionsByGroup[gi][sessionNum];

    const present = savedStudents.filter(s => s.present).length;
    const groupName = (window.currentTeacherData?.groups||[])[gi]?.name || '';
    await addLog('✏️ تعديل حضور', `الحصة ${sessionNum}${groupName?' — '+groupName:''} — ${present}/${savedStudents.length} حاضر`, '🔧');
    showToast('✅ تم حفظ التعديلات');
    closeSessionModal();
  } catch(e) { showToast('خطأ: ' + e.message, true); }
};

// ─── عرض سجل حصة فائتة أو مسجّلة — مع الأفواج ───
window.viewSessionHistory_g = (sessionNum, gi) => {
  const recordedSessions = _allRecordedSessionsByGroup[gi] || {};
  const record = recordedSessions[sessionNum];
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
        <div class="att-student-row" style="pointer-events:none;opacity:${(s.present||s.late)?1:0.6}">
          <span class="att-student-id">${s.id || '—'}</span>
          <span class="att-student-name">${s.name}</span>
          <span class="pay-badge ${s.late ? '' : s.present ? 'paid' : 'unpaid'}" style="margin-right:auto;${s.late ? 'background:rgba(245,158,11,0.1);color:#d97706;border:1px solid rgba(245,158,11,0.3)' : ''}">
            ${s.late ? '⏰ متأخر' : s.present ? '✅ حاضر' : '❌ غائب'}
          </span>
        </div>`).join('') || `<div style="text-align:center;padding:20px;color:var(--text-muted)">لا يوجد تلاميذ</div>`;
  const presentCount = isMissed ? 0 : (record.students || []).filter(s => s.present || s.late).length;
  const lateCount    = isMissed ? 0 : (record.students || []).filter(s => s.late).length;
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

window.viewSessionHistory = (sessionNum) => {
  viewSessionHistory_g(sessionNum, window._currentGroupIdx || 0);
};

// ═══════════════════════════════════════════════════════════════════════
// ── دالة قراءة حالة الحضور من DOM — المصدر الوحيد للحقيقة ──
// تُرجع: { id, name, present, late } لكل صف
// ═══════════════════════════════════════════════════════════════════════
function readAttendanceFromDOM() {
  const rows = document.querySelectorAll('#session-modal-inner .att-student-row');
  if (!rows.length) return null;
  return Array.from(rows).map(row => {
    const sid  = row.getAttribute('data-sid') || '';
    const name = row.querySelector('.att-student-name')?.textContent?.trim() || '';
    const btns = row.querySelectorAll('.att-check');
    const presentBtn = btns[0];
    const lateBtn    = btns[2];
    const isLate     = lateBtn    ? lateBtn.classList.contains('late')    : false;
    const isPresent  = presentBtn ? presentBtn.classList.contains('present') : false;
    return { id: sid, name, present: isPresent || isLate, late: isLate };
  });
}

// حفظ حضور حصة معينة — مع الفوج
window.saveSessionAttendance_g = async (sessionNum, gi) => {
  if (!currentAttTeacherId && window.currentTeacherData?.uid) {
    currentAttTeacherId = window.currentTeacherData.uid;
    window.currentAttTeacherId = currentAttTeacherId;
  }
  if (!currentAttTeacherId) {
    showToast('⚠️ خطأ: لم يتم تحديد الأستاذ، يرجى إعادة تحميل الصفحة', true);
    return;
  }
  const groupSuffix  = `_g${gi}`;
  const sessionKey   = `${currentAttTeacherId}${groupSuffix}_session_${sessionNum}`;
  const todayDateKey = new Date().toISOString().slice(0, 10);

  // ✅ القراءة من DOM أولاً، fallback للذاكرة
  const domData = readAttendanceFromDOM();
  const studentsToSave = domData
    ? domData
    : currentAttStudents.map(s => ({ id: s.id, name: s.name, present: !!s.present, late: !!s.late }));

  if (!studentsToSave.length) {
    showToast('⚠️ لا يوجد تلاميذ للحفظ', true);
    return;
  }

  const record = {
    teacherId: currentAttTeacherId + groupSuffix,
    sessionNum,
    date: todayDateKey,
    savedAt: serverTimestamp(),
    students: studentsToSave
  };
  try {
    await setDoc(doc(db, 'sessionAttendance', sessionKey), record);
    if (!_allRecordedSessionsByGroup[gi]) _allRecordedSessionsByGroup[gi] = {};
    _allRecordedSessionsByGroup[gi][sessionNum] = { ...record, savedAt: new Date() };
    if (gi === 0) _allRecordedSessions[sessionNum] = _allRecordedSessionsByGroup[gi][sessionNum];
    const present = studentsToSave.filter(s => s.present).length;
    const late    = studentsToSave.filter(s => s.late).length;
    const teacherGroups = window.currentTeacherData?.groups || (allTeachers||[]).find(x=>x.id===currentAttTeacherId)?.groups || [];
    const groupName = teacherGroups[gi]?.name || '';
    const lateNote  = late ? ` (${late} متأخر)` : '';
    await addLog('📋 تسجيل حضور', `حصة ${sessionNum}${groupName?' — '+groupName:''} — ${present}/${studentsToSave.length} حاضر${lateNote}`, '✅');
    showToast(`✅ تم حفظ حضور الحصة ${sessionNum}${groupName?' ('+groupName+')':''}`);
    closeSessionModal();
    if (!window.isTeacherMode) {
      const teacher = (allTeachers||[]).find(x => x.id === currentAttTeacherId);
      if (teacher) renderAdminAttGroupsGrid(teacher);
    }
  } catch(e) { showToast('خطأ في الحفظ: ' + e.message, true); console.error(e); }
};

// حفظ حضور حصة معينة (توافق قديم — للأدمين أو بدون أفواج)
let currentOpenSession = null;
window.saveSessionAttendance = async () => {
  if (!currentAttTeacherId && window.currentTeacherData?.uid) {
    currentAttTeacherId = window.currentTeacherData.uid;
    window.currentAttTeacherId = currentAttTeacherId;
  }
  if (!currentAttTeacherId || !currentOpenSession) return;
  await saveSessionAttendance_g(currentOpenSession, window._currentGroupIdx || 0);
};

// ─── متغيرات ملخص الشهر ───
let _summaryStudentStats  = {};    // البيانات الأصلية
let _summaryEditMode      = false; // وضع التعديل
let _summaryEdits         = {};    // { studentId: { dots: [...] } } للتعديلات المؤقتة
let _summarySearchQuery   = '';
let _summarySortKey       = 'name'; // name | present | absent | rate
let _summaryExpandedId    = null;   // id التلميذ المفتوح تفصيلاً

// ─── فتح ملخص الشهر ───
window.openSummaryModal = () => {
  const students = currentAttStudents;
  if (!students.length) { showToast('لا يوجد تلاميذ بعد', true); return; }

  const mergedSessions = {};
  Object.values(_allRecordedSessionsByGroup).forEach(groupSessions => {
    Object.entries(groupSessions).forEach(([sNum, rec]) => {
      const n = parseInt(sNum);
      if (!mergedSessions[n]) mergedSessions[n] = { students: [], date: rec.date, savedAt: rec.savedAt };
      mergedSessions[n].students.push(...(rec.students || []));
    });
  });
  if (!Object.keys(mergedSessions).length) {
    Object.entries(_allRecordedSessions).forEach(([sNum, rec]) => { mergedSessions[parseInt(sNum)] = rec; });
  }
  const recordedCount = Object.keys(mergedSessions).length;
  const subEl = document.getElementById('summary-modal-sub');
  if (subEl) subEl.textContent = recordedCount + ' حصة مسجّلة من أصل 12';

  // ── بناء إحصائيات كل تلميذ ──
  _summaryStudentStats = {};
  students.forEach(s => {
    const { source, pack } = getStudentSourceInfo(s);
    _summaryStudentStats[s.id] = { id: s.id, name: s.name, present: 0, absent: 0, dots: [], source, pack, joinedAt: null };
  });

  for (let i = 1; i <= 12; i++) {
    const rec = mergedSessions[i];
    const sessionLookup = {};
    if (rec && rec.students) {
      rec.students.forEach(s => { if (s.id) sessionLookup[s.id] = s; });
    }

    students.forEach(s => {
      if (!_summaryStudentStats[s.id]) return;
      if (!rec) {
        _summaryStudentStats[s.id].dots.push(null);
        return;
      }
      const found = sessionLookup[s.id];
      if (found) {
        if (found.late) {
          _summaryStudentStats[s.id].present++;
          _summaryStudentStats[s.id].dots.push('late');
        } else if (found.present) {
          _summaryStudentStats[s.id].present++;
          _summaryStudentStats[s.id].dots.push(true);
        } else {
          _summaryStudentStats[s.id].absent++;
          _summaryStudentStats[s.id].dots.push(false);
        }
      } else {
        let firstSessionWithStudent = 13;
        for (let j = 1; j <= 12; j++) {
          const r = mergedSessions[j];
          if (r && r.students && r.students.some(x => x.id === s.id)) {
            firstSessionWithStudent = j;
            break;
          }
        }
        if (i < firstSessionWithStudent) {
          _summaryStudentStats[s.id].dots.push('joined_late');
          if (!_summaryStudentStats[s.id].joinedAt) _summaryStudentStats[s.id].joinedAt = i;
        } else {
          _summaryStudentStats[s.id].absent++;
          _summaryStudentStats[s.id].dots.push(false);
        }
      }
    });
  }

  // ── إعادة ضبط الحالة ──
  _summaryEdits = {};
  _summaryEditMode = false;
  _summarySearchQuery = '';
  _summarySortKey = 'name';
  _summaryExpandedId = null;
  const editBtn = document.getElementById('summary-edit-toggle-btn');
  if (editBtn) { editBtn.innerHTML = '✏️ تعديل'; editBtn.style.background = 'var(--primary-light)'; editBtn.style.color = 'var(--primary)'; }
  const editBar = document.getElementById('summary-edit-bar');
  if (editBar) editBar.style.display = 'none';
  document.querySelectorAll('.summary-sort-btn').forEach(b => b.classList.remove('active'));
  const sortNameBtn = document.getElementById('sort-btn-name');
  if (sortNameBtn) sortNameBtn.classList.add('active');
  const searchInp = document.getElementById('summary-search-inp');
  if (searchInp) searchInp.value = '';
  // عرض المحتوى
  _renderSummaryContent();

  // حالة الراتب للأدمين
  const payBar = document.getElementById('payment-status-bar');
  if (payBar) payBar.style.display = isTeacherMode ? 'none' : 'flex';
  if (!isTeacherMode) loadTeacherPaymentStatus();

  document.getElementById('summary-modal').classList.add('open');
};

// ─── رسم محتوى ملخص الشهر ───
function _renderSummaryContent() {
  const contentEl = document.getElementById('summary-modal-content');
  if (!contentEl) return;

  let rows = Object.values(_summaryStudentStats);

  // تطبيق البحث
  if (_summarySearchQuery) {
    rows = rows.filter(st => st.name.includes(_summarySearchQuery));
  }

  // تطبيق الترتيب
  if (_summarySortKey === 'present')     rows.sort((a,b) => b.present - a.present);
  else if (_summarySortKey === 'absent') rows.sort((a,b) => b.absent - a.absent);
  else if (_summarySortKey === 'rate') {
    rows.sort((a,b) => {
      const ra = (a.present+a.absent)>0 ? a.present/(a.present+a.absent) : -1;
      const rb = (b.present+b.absent)>0 ? b.present/(b.present+b.absent) : -1;
      return rb - ra;
    });
  } else {
    rows.sort((a,b) => a.name.localeCompare(b.name, 'ar'));
  }

  const hasJoinedLate = rows.some(st => st.dots.includes('joined_late'));

  // Legend
  contentEl.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px 14px;background:var(--bg);border-radius:10px;border:1px solid var(--border);margin-bottom:14px;font-size:11px;font-weight:700;color:var(--text-muted)">
      <span style="display:flex;align-items:center;gap:5px"><span class="sdot recorded" style="width:10px;height:10px;flex-shrink:0;display:inline-block"></span> حاضر</span>
      <span style="display:flex;align-items:center;gap:5px"><span class="sdot" style="width:10px;height:10px;border-color:rgba(239,68,68,0.4);flex-shrink:0;display:inline-block"></span> غائب</span>
      <span style="display:flex;align-items:center;gap:5px"><span class="sdot" style="width:10px;height:10px;background:#F59E0B;border-color:#F59E0B;flex-shrink:0;font-size:7px;display:inline-flex;align-items:center;justify-content:center">⏰</span> تأخر</span>
      ${hasJoinedLate ? `<span style="display:flex;align-items:center;gap:5px"><span class="sdot" style="width:10px;height:10px;background:rgba(99,102,241,0.12);border-color:rgba(99,102,241,0.3);font-size:7px;color:#6366f1;font-weight:900;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">➖</span> انضم لاحقاً</span>` : ''}
      <span style="display:flex;align-items:center;gap:5px"><span class="sdot" style="width:10px;height:10px;opacity:0.3;flex-shrink:0;display:inline-block"></span> لم تُسجَّل</span>
      <span style="margin-right:auto;display:flex;gap:10px">
        <span style="font-size:9px;padding:2px 7px;border-radius:99px;background:rgba(20,184,166,0.12);color:var(--teal);border:1px solid rgba(20,184,166,0.3)">📊 Sheet</span>
        <span style="font-size:9px;padding:2px 7px;border-radius:99px;background:rgba(124,58,237,0.1);color:var(--primary);border:1px solid var(--border-2)">🎟️ تذكرة</span>
        <span style="font-size:9px;padding:2px 7px;border-radius:99px;background:rgba(245,158,11,0.12);color:#92400e;border:1px solid rgba(245,158,11,0.3)">✏️ يدوي</span>
      </span>
    </div>` +
  (rows.length
    ? rows.map(st => _buildStudentSummaryRow(st)).join('')
    : `<div style="text-align:center;padding:30px;color:var(--text-muted)">لا توجد بيانات — أو لا يوجد تطابق مع البحث</div>`);
}

// ─── بناء صف تلميذ واحد في الملخص ───
function _buildStudentSummaryRow(st) {
  const dots = _summaryEdits[st.id]?.dots || st.dots;
  const lateCount2 = dots.filter(d => d === 'late').length;
  const joinedAfter = dots.filter(d => d === 'joined_late').length;
  const validSessions = st.present + st.absent;
  const absRate = validSessions > 0 ? Math.round(st.present / validSessions * 100) : null;
  const rateColor = absRate === null ? 'var(--text-muted)' : absRate >= 80 ? 'var(--success)' : absRate >= 60 ? '#d97706' : 'var(--danger)';

  // بادج المصدر
  const sourceBadge =
    st.source === 'sheet'  ? `<span style="font-size:9px;padding:2px 7px;border-radius:99px;background:rgba(20,184,166,0.12);color:var(--teal);border:1px solid rgba(20,184,166,0.3);white-space:nowrap;flex-shrink:0">📊 Sheet</span>` :
    st.source === 'ticket' ? `<span style="font-size:9px;padding:2px 7px;border-radius:99px;background:rgba(124,58,237,0.1);color:var(--primary);border:1px solid var(--border-2);white-space:nowrap;flex-shrink:0">🎟️ تذكرة</span>` :
                             `<span style="font-size:9px;padding:2px 7px;border-radius:99px;background:rgba(245,158,11,0.12);color:#92400e;border:1px solid rgba(245,158,11,0.3);white-space:nowrap;flex-shrink:0">✏️ يدوي</span>`;
  const packBadge = st.pack
    ? `<span style="font-size:9px;padding:2px 7px;border-radius:99px;background:rgba(99,102,241,0.08);color:#4f46e5;border:1px solid rgba(99,102,241,0.18);white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis;display:inline-block;vertical-align:middle" title="${st.pack}">📦 ${st.pack.length>13?st.pack.slice(0,12)+'…':st.pack}</span>`
    : '';

  const joinedInfo = st.joinedAt
    ? `<span style="font-size:9px;color:var(--primary);font-weight:800;background:var(--primary-light);padding:2px 7px;border-radius:99px;white-space:nowrap">📅 دخل في ح${st.joinedAt}</span>`
    : '';

  const dotsHtml = dots.map((d,i) => {
    // في وضع التعديل: كل الدوتات قابلة للنقر بدون استثناء
    // الدوران: غائب → حاضر → متأخر → غائب
    const stateLabel =
      d === 'late'        ? 'متأخر ⏰'   :
      d === 'joined_late' ? 'غائب ❌'    : // joined_late تُعرض كغائب في العرض
      d === true          ? 'حاضر ✅'    :
      d === false         ? 'غائب ❌'    : 'لم تُسجَّل ○';
    const nextLabel =
      (d === false || d === null || d === 'joined_late') ? '← اضغط: حاضر' :
      d === true          ? '← اضغط: متأخر' :
      d === 'late'        ? '← اضغط: غائب'  : '← اضغط: حاضر';
    const title = `ح${i+1}: ${stateLabel}${_summaryEditMode ? '  ' + nextLabel : ''}`;

    if (_summaryEditMode) {
      // ── وضع التعديل: كل دوت قابل للنقر ومع hover واضح ──
      const baseClick = `onclick="toggleSummaryDot('${st.id}',${i})"`;
      const hoverStyle = `onmouseenter="this.style.transform='scale(1.5)';this.style.zIndex='10'" onmouseleave="this.style.transform='';this.style.zIndex=''"`; 
      const cursorStyle = `cursor:pointer;transition:transform 0.15s ease;`;

      if (d === 'late')
        return `<span class="sdot" ${baseClick} ${hoverStyle} style="${cursorStyle}background:#F59E0B;border-color:#F59E0B;box-shadow:0 1px 4px rgba(245,158,11,0.4)" title="${title}">⏰</span>`;
      if (d === true)
        return `<span class="sdot recorded" ${baseClick} ${hoverStyle} style="${cursorStyle}" title="${title}"></span>`;
      if (d === false)
        return `<span class="sdot" ${baseClick} ${hoverStyle} style="${cursorStyle}border-color:rgba(239,68,68,0.5);background:rgba(239,68,68,0.08)" title="${title}"></span>`;
      // null أو joined_late — تظهر بشكل مختلف لتوضيح أنها غير مسجّلة لكن قابلة للتعديل
      return `<span class="sdot" ${baseClick} ${hoverStyle} style="${cursorStyle}opacity:0.45;border-style:dashed;border-color:var(--primary)" title="${title}"></span>`;
    }

    // ── وضع العرض العادي ──
    if (d === 'late')
      return `<span class="sdot" style="background:#F59E0B;border-color:#F59E0B;box-shadow:0 1px 4px rgba(245,158,11,0.4)" title="${title}">⏰</span>`;
    if (d === 'joined_late')
      return `<span class="sdot" style="background:rgba(99,102,241,0.12);border-color:rgba(99,102,241,0.3);font-size:7px;color:#6366f1;font-weight:900;display:inline-flex;align-items:center;justify-content:center" title="ح${i+1}: انضم لاحقاً">➖</span>`;
    if (d === true)
      return `<span class="sdot recorded" title="${title}"></span>`;
    if (d === false)
      return `<span class="sdot" style="border-color:rgba(239,68,68,0.4)" title="${title}"></span>`;
    return `<span class="sdot" style="opacity:0.3" title="ح${i+1}: لم تُسجَّل"></span>`;
  }).join('');

  const isExpanded = _summaryExpandedId === st.id;

  return `
    <div class="student-summary-row${_summaryEditMode?' edit-mode':''}" id="srow-${st.id}" style="cursor:default">
      <div class="student-summary-name" style="display:flex;flex-direction:column;gap:3px;cursor:pointer" onclick="toggleStudentSummaryDetail('${st.id}')">
        <span style="font-size:13px;font-weight:800">${st.name} <span style="font-size:11px;color:var(--text-muted)">▾</span></span>
        <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
          ${sourceBadge}
          ${packBadge}
          ${joinedInfo}
        </div>
        ${joinedAfter > 0 ? `<span style="font-size:9px;color:#6366f1;font-weight:800">انضم ➖ ${joinedAfter} ح</span>` : ''}
      </div>
      <div class="student-summary-dots">${dotsHtml}</div>
      <span class="student-summary-stat stat-present">✅ ${st.present}</span>
      ${lateCount2 ? `<span class="student-summary-stat" style="color:#d97706;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2)">⏰ ${lateCount2}</span>` : ''}
      <span class="student-summary-stat stat-absent">❌ ${st.absent}</span>
      ${absRate !== null ? `<span class="student-summary-stat" style="background:rgba(99,102,241,0.07);color:${rateColor};border:1px solid rgba(99,102,241,0.15);font-size:10px">${absRate}%</span>` : ''}
      ${_summaryEditMode ? `<button onclick="removeSummaryStudent('${st.id}')" style="padding:3px 8px;border-radius:7px;border:1px solid rgba(239,68,68,0.3);background:var(--danger-soft);color:var(--danger);font-size:10px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:700;flex-shrink:0">حذف</button>` : ''}
    </div>
    ${isExpanded ? _buildStudentDetailPanel(st, dots) : ''}`;
}

// ─── لوحة تفاصيل التلميذ (expand) ───
function _buildStudentDetailPanel(st, dots) {
  const sessions = [];
  for (let i = 1; i <= 12; i++) {
    const d = dots[i-1];
    const status = d === 'late' ? '⏰ متأخر' : d === true ? '✅ حاضر' : d === false ? '❌ غائب' : d === 'joined_late' ? '➖ لم ينضم بعد' : '⏳ لم تُسجَّل';
    const bg = d === true || d === 'late' ? 'rgba(16,185,129,0.07)' : d === false ? 'rgba(239,68,68,0.06)' : 'rgba(0,0,0,0.03)';
    sessions.push(`<div style="padding:7px 12px;border-radius:10px;border:1px solid var(--border);background:${bg};display:flex;justify-content:space-between;align-items:center;font-size:12px">
      <span style="font-weight:800;color:var(--text-muted)">ح ${i}</span>
      <span style="font-weight:800;color:var(--text)">${status}</span>
    </div>`);
  }
  const validSessions = st.present + st.absent;
  const rate = validSessions > 0 ? Math.round(st.present / validSessions * 100) : null;
  return `
    <div class="student-detail-panel">
      <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:120px;padding:10px 14px;border-radius:12px;background:var(--success-soft);border:1px solid rgba(16,185,129,0.2);text-align:center">
          <div style="font-size:20px;font-weight:900;color:var(--success)">${st.present}</div>
          <div style="font-size:11px;color:var(--success)">حاضر</div>
        </div>
        <div style="flex:1;min-width:120px;padding:10px 14px;border-radius:12px;background:var(--danger-soft);border:1px solid rgba(239,68,68,0.15);text-align:center">
          <div style="font-size:20px;font-weight:900;color:var(--danger)">${st.absent}</div>
          <div style="font-size:11px;color:var(--danger)">غائب</div>
        </div>
        ${rate !== null ? `<div style="flex:1;min-width:120px;padding:10px 14px;border-radius:12px;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.15);text-align:center">
          <div style="font-size:20px;font-weight:900;color:#4f46e5">${rate}%</div>
          <div style="font-size:11px;color:#4f46e5">نسبة الحضور</div>
        </div>` : ''}
        ${st.joinedAt ? `<div style="flex:1;min-width:140px;padding:10px 14px;border-radius:12px;background:var(--primary-light);border:1px solid var(--border-2);text-align:center">
          <div style="font-size:16px;font-weight:900;color:var(--primary)">ح ${st.joinedAt}</div>
          <div style="font-size:11px;color:var(--primary)">أول دخول للفوج</div>
        </div>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px">${sessions.join('')}</div>
    </div>`;
}

// ─── تبديل عرض تفاصيل التلميذ ───
window.toggleStudentSummaryDetail = (id) => {
  _summaryExpandedId = _summaryExpandedId === id ? null : id;
  _renderSummaryContent();
};

// ─── تبديل دوت حضور في وضع التعديل ───
window.toggleSummaryDot = (studentId, sessionIdx) => {
  if (!_summaryEditMode) return;
  const st = _summaryStudentStats[studentId];
  if (!st) return;

  if (!_summaryEdits[studentId]) {
    _summaryEdits[studentId] = { dots: [...st.dots] };
  }
  const current = _summaryEdits[studentId].dots[sessionIdx];
  // دوران ثلاثي فقط: غائب (false) → حاضر (true) → متأخر ('late') → غائب
  // أي حالة أخرى (null / joined_late) تبدأ من غائب مباشرة
  const cycle = { false: true, true: 'late', late: false };
  const key = (current === false) ? 'false' : (current === true) ? 'true' : (current === 'late') ? 'late' : null;
  _summaryEdits[studentId].dots[sessionIdx] = key ? cycle[key] : false;

  // إعادة حساب الإحصائيات المعدّلة
  const newDots = _summaryEdits[studentId].dots;
  let present = 0, absent = 0;
  newDots.forEach(d => { if (d === true || d === 'late') present++; else if (d === false) absent++; });
  _summaryEdits[studentId].present = present;
  _summaryEdits[studentId].absent  = absent;
  _summaryStudentStats[studentId].present = present;
  _summaryStudentStats[studentId].absent  = absent;
  _summaryStudentStats[studentId].dots    = newDots;

  _renderSummaryContent();
};

// ─── تبديل وضع التعديل ───
window.toggleSummaryEditMode = () => {
  _summaryEditMode = !_summaryEditMode;
  const editBtn = document.getElementById('summary-edit-toggle-btn');
  const editBar = document.getElementById('summary-edit-bar');
  if (_summaryEditMode) {
    editBtn.innerHTML = '✅ انتهيت من التعديل';
    editBtn.style.background = 'linear-gradient(135deg,var(--success),#059669)';
    editBtn.style.color = 'white';
    editBtn.style.border = 'none';
    if (editBar) editBar.style.display = 'block';
    showToast('✏️ وضع التعديل مفعّل — اضغط على أي دوت لتغيير حالة الحضور');
  } else {
    editBtn.innerHTML = '✏️ تعديل';
    editBtn.style.background = 'var(--primary-light)';
    editBtn.style.color = 'var(--primary)';
    editBtn.style.border = '2px solid var(--primary)';
    if (editBar) editBar.style.display = 'none';
  }
  _renderSummaryContent();
};

// ─── إضافة تلميذ جديد للملخص ───
window.summaryAddStudent = () => {
  const inp = document.getElementById('summary-add-student-inp');
  if (!inp) return;
  const name = inp.value.trim();
  if (!name) { showToast('⚠️ أدخل اسم التلميذ', true); return; }
  const exists = Object.values(_summaryStudentStats).some(st => st.name.trim().toLowerCase() === name.toLowerCase());
  if (exists) { showToast('⚠️ التلميذ موجود مسبقاً', true); return; }
  const newId = 'manual_' + Date.now();
  _summaryStudentStats[newId] = { id: newId, name, present: 0, absent: 0, dots: Array(12).fill(null), source: 'manual', pack: '', joinedAt: null };
  inp.value = '';
  showToast(`✅ تمت إضافة ${name} للملخص`);
  _renderSummaryContent();
};

// ─── حذف تلميذ من الملخص ───
window.removeSummaryStudent = async (id) => {
  if (!(await EPUI.confirm('حذف هذا التلميذ من ملخص الشهر؟', 'حذف من الملخص', { danger: true }))) return;
  const name = _summaryStudentStats[id]?.name || 'التلميذ';
  delete _summaryStudentStats[id];
  if (_summaryEdits[id]) delete _summaryEdits[id];
  showToast(`🗑️ تم حذف ${name} من الملخص`);
  _renderSummaryContent();
};

// ─── حفظ تعديلات الملخص على Firestore ───
window.saveSummaryEdits = async () => {
  if (!Object.keys(_summaryEdits).length) {
    showToast('لا توجد تعديلات للحفظ');
    return;
  }
  try {
    const batch = writeBatch(db);
    // نعدّل كل حصة مُعدَّلة في sessionAttendance
    const tid = currentAttTeacherId;
    if (!tid) { showToast('خطأ: لا يوجد أستاذ محدد', true); return; }

    // نجمع التعديلات حسب الحصة
    const sessionEdits = {}; // { sessionNum_gi: { [studentId]: newStatus } }

    Object.entries(_summaryEdits).forEach(([studentId, edit]) => {
      (edit.dots || []).forEach((newVal, i) => {
        const sessionNum = i + 1;
        // نبحث عن الفوج الصحيح لهذه الحصة
        Object.entries(_allRecordedSessionsByGroup).forEach(([giStr, sessions]) => {
          const gi = parseInt(giStr);
          const rec = sessions[sessionNum];
          if (!rec) return;
          const hasStudent = (rec.students||[]).some(s => s.id === studentId);
          if (!hasStudent) return;
          const key = `${sessionNum}_${gi}`;
          if (!sessionEdits[key]) sessionEdits[key] = { sessionNum, gi, students: [...(rec.students||[])] };
          // تحديث حالة التلميذ في هذه الحصة
          const sidx = sessionEdits[key].students.findIndex(s => s.id === studentId);
          if (sidx !== -1) {
            sessionEdits[key].students[sidx] = {
              ...sessionEdits[key].students[sidx],
              present: newVal === true || newVal === 'late',
              late: newVal === 'late'
            };
          }
        });
      });
    });

    // نطبق التعديلات على Firestore
    Object.entries(sessionEdits).forEach(([key, data]) => {
      const docRef = doc(db, 'sessionAttendance', `${tid}_g${data.gi}_session_${data.sessionNum}`);
      batch.update(docRef, { students: data.students, editedByAdmin: true, editedAt: serverTimestamp() });
    });

    await batch.commit();
    _summaryEdits = {};
    await addLog('✏️ تعديل ملخص الشهر', `تم تعديل حضور ${Object.keys(_summaryEdits).length} تلميذ`, '📊');
    showToast('✅ تم حفظ التعديلات بنجاح');
    toggleSummaryEditMode(); // إغلاق وضع التعديل
  } catch(e) {
    showToast('خطأ في الحفظ: ' + e.message, true);
  }
};

// ─── فلترة الملخص بالبحث ───
window.filterSummaryRows = (query) => {
  _summarySearchQuery = query;
  _renderSummaryContent();
};

// ─── ترتيب الملخص ───
window.sortSummary = (key, btn) => {
  _summarySortKey = key;
  document.querySelectorAll('.summary-sort-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  _renderSummaryContent();
};

// ─── تصدير ملخص الشهر CSV ───
window.exportSummaryCSV = () => {
  const rows = Object.values(_summaryStudentStats);
  if (!rows.length) { showToast('لا توجد بيانات للتصدير', true); return; }
  const header = ['الاسم','المصدر','الباقة','أول حصة','حاضر','غائب','متأخر','نسبة الحضور','ح1','ح2','ح3','ح4','ح5','ح6','ح7','ح8','ح9','ح10','ح11','ح12'];
  const csvRows = [header.join(',')];
  rows.forEach(st => {
    const dots = _summaryEdits[st.id]?.dots || st.dots;
    const lateC = dots.filter(d=>d==='late').length;
    const validS = st.present + st.absent;
    const rate = validS > 0 ? Math.round(st.present/validS*100)+'%' : '—';
    const dotVals = dots.map(d =>
      d === true ? 'حاضر' : d === false ? 'غائب' : d === 'late' ? 'متأخر' : d === 'joined_late' ? 'لم ينضم' : '—'
    );
    const sourceLabel = st.source === 'sheet' ? 'Google Sheet' : st.source === 'ticket' ? 'تذكرة' : 'يدوي';
    csvRows.push([st.name, sourceLabel, st.pack||'—', st.joinedAt?`ح${st.joinedAt}`:'ح1', st.present, st.absent, lateC, rate, ...dotVals].join(','));
  });
  const blob = new Blob(['\uFEFF'+csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = 'summary_attendance.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('📥 تم تصدير ملخص الحضور CSV');
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


/* ─────────────── [الجزء 2] نظام التواصل (Messaging) ─────────────── */
/* (الاستيراد موجود في أعلى الملف ضمن الجزء 1، لا حاجة لتكراره) */

/* ══════════════════════════════════════════════════
   نظام التواصل — E-PLUS Academy
   ────────────────────────────────────────────────
   Collections في Firestore:
   • messages          — كل الرسائل (general + private)
     { roomId, text, senderId, senderName, isAdmin, sentAt }
   • msgRooms          — معلومات الغرف الخاصة
     { id, participants:[], names:{}, lastMsg, lastAt }

   قواعد Firestore المطلوبة (أضفها في Firebase Console):
   ─────────────────────────────────────────────────
   match /messages/{id} {
     allow read, write: if request.auth != null;
   }
   match /msgRooms/{id} {
     allow read, write: if request.auth != null;
   }
══════════════════════════════════════════════════ */

let _db;
try {
  const existingApp = getApps().find(a => a.name === '[DEFAULT]') || getApps()[0];
  if (existingApp) {
    _db = getFirestore(existingApp);
  } else {
    // fallback: تهيئة Firebase مستقلة إذا لم يكن الـ app الرئيسي جاهزاً بعد
    const _fbApp = initializeApp({
      apiKey: "AIzaSyAMcplfO4veFVLtZZcyqfTJx9NGCit8gjo",
      authDomain: "eplus-center-39.firebaseapp.com",
      projectId: "eplus-center-39",
      storageBucket: "eplus-center-39.firebasestorage.app",
      messagingSenderId: "191532732034",
      appId: "1:191532732034:web:b11449a2f0595db5d02e9b"
    }, 'messaging');
    _db = getFirestore(_fbApp);
  }
} catch(e) {
  const fallbackApp = getApps().find(a => a.name === 'messaging') || getApps()[0];
  _db = fallbackApp ? getFirestore(fallbackApp) : null;
  if (!_db) console.warn('Messaging: Firebase not ready', e);
}

// ─── State ───
let _me = null;           // { uid, name, isAdmin }
let _room = null;         // 'general' | roomId
let _msgUnsub2 = null;
let _roomsUnsub = null;
let _localTeachers = [];  // يُملأ من allTeachers الموجودة

// ═══════════════════════════
// تهيئة
// ═══════════════════════════
window.initMessaging = (uid, name, isAdmin) => {
  if (!_db) return;
  _me = { uid, name, isAdmin };
  // سحب قائمة الأساتذة من المتغير العام (موجود في نفس الصفحة)
  setTimeout(() => {
    _localTeachers = window.allTeachers || [];
  }, 1500);
  _renderRoomsList();
  // للأدمين نفتح الغرفة العامة تلقائياً
  if (isAdmin) _openRoom('general');
  // زر "محادثة جديدة" للأدمين فقط
  const nb = document.getElementById('msg-new-btn-wrap');
  if (nb) nb.style.display = isAdmin ? 'block' : 'none';
};

// ═══════════════════════════
// فتح/إغلاق Modal
// ═══════════════════════════
window.openMsgModal = () => {
  if (!_me) { window.showToast && showToast('⏳ يرجى الانتظار...', true); return; }
  // تحديث قائمة الأساتذة عند كل فتح
  _localTeachers = window.allTeachers || [];
  document.getElementById('msg-modal-bg').classList.add('open');
  // إعادة فتح الغرفة الحالية أو العامة
  _openRoom(_room || 'general');
};
window.closeMsgModal = () => {
  document.getElementById('msg-modal-bg').classList.remove('open');
  if (_msgUnsub2) { _msgUnsub2(); _msgUnsub2 = null; }
};

// ═══════════════════════════
// قائمة الغرف في السايدبار
// ═══════════════════════════
function _renderRoomsList() {
  if (!_db || !_me) return;
  if (_roomsUnsub) { _roomsUnsub(); _roomsUnsub = null; }
  const listEl = document.getElementById('msg-private-list');
  if (!listEl) return;

  _roomsUnsub = onSnapshot(
    query(collection(_db, 'msgRooms'), orderBy('lastAt', 'desc')),
    snap => {
      const myRooms = snap.docs.filter(d => {
        const p = d.data().participants || [];
        const hidden = d.data().hiddenBy || {};
        return p.includes(_me.uid) && !hidden[_me.uid];
      });
      // حذف العناصر القديمة
      listEl.querySelectorAll('.msg-room-btn').forEach(e => e.remove());
      if (!myRooms.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:11px;color:var(--text-muted);padding:10px 4px;text-align:center';
        empty.textContent = 'لا توجد محادثات خاصة بعد';
        empty.id = 'msg-no-private';
        listEl.appendChild(empty);
        return;
      }
      document.getElementById('msg-no-private')?.remove();
      myRooms.forEach(d => {
        const data = d.data();
        const otherId = (data.participants || []).find(p => p !== _me.uid);
        const otherName = data.names?.[otherId] || 'أستاذ';
        const btn = document.createElement('div');
        btn.className = 'msg-room-btn' + (_room === d.id ? ' active' : '');
        btn.id = 'msg-room-' + d.id;
        btn.onclick = () => _openRoom(d.id, otherName, data);
        const lastMsg = data.lastMsg ? data.lastMsg.substring(0, 30) + (data.lastMsg.length > 30 ? '…' : '') : 'لا توجد رسائل';
        btn.innerHTML = `
          <div class="msg-room-icon" style="background:var(--primary-light);color:var(--primary);font-weight:900;font-size:15px">${(otherName[0]||'؟').toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div class="msg-room-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${otherName}</div>
            <div class="msg-room-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lastMsg}</div>
          </div>
          <button class="msg-room-delete-btn" title="إخفاء المحادثة" onclick="_hidePrivateRoom(event,'${d.id}','${otherName}')">🗑️</button>`;
        listEl.appendChild(btn);
      });
    },
    err => console.warn('msgRooms listen error:', err.code)
  );
}

// ═══════════════════════════
// فتح غرفة
// ═══════════════════════════
async function _openRoom(roomId, roomName, roomData) {
  if (!_db || !_me) return;
  _room = roomId;

  // تحديث active
  document.querySelectorAll('.msg-room-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('msg-room-' + roomId)?.classList.add('active');
  document.getElementById('msg-room-general')?.classList.toggle('active', roomId === 'general');

  // تحديد الاسم والأيقونة
  let hName, hSub;
  if (roomId === 'general') {
    hName = 'غرفة الأساتذة العامة';
    hSub = 'مرئية لجميع الأساتذة والإدارة';
  } else {
    const otherId = (roomData?.participants || []).find(p => p !== _me.uid);
    hName = roomName || roomData?.names?.[otherId] || 'محادثة خاصة';
    hSub = 'محادثة خاصة 🔒';
  }

  const chatArea = document.getElementById('msg-chat-area');
  const initials = roomId === 'general' ? '👥' : (hName[0]||'؟').toUpperCase();
  const clearBtnHtml = (roomId === 'general' && _me.isAdmin)
    ? `<button onclick="window._clearGeneralChat()" title="مسح جميع رسائل الغرفة العامة"
        style="padding:7px 14px;border-radius:11px;border:1.5px solid rgba(239,68,68,0.3);background:var(--danger-soft);color:#DC2626;font-size:12px;font-weight:800;cursor:pointer;font-family:'Tajawal',sans-serif;display:flex;align-items:center;gap:6px;transition:all 0.2s;flex-shrink:0"
        onmouseover="this.style.background='rgba(239,68,68,0.15)';this.style.borderColor='rgba(239,68,68,0.5)'"
        onmouseout="this.style.background='var(--danger-soft)';this.style.borderColor='rgba(239,68,68,0.3)'">
        🗑️ مسح الشات
      </button>`
    : '';
  chatArea.innerHTML = `
    <div class="msg-chat-header">
      <div class="msg-chat-avatar" style="${roomId==='general'?'font-size:20px':'font-size:16px;font-weight:900'}">${initials}</div>
      <div style="flex:1">
        <div class="msg-chat-name">${hName}</div>
        <div class="msg-chat-status">${hSub}</div>
      </div>
      ${clearBtnHtml}
    </div>
    <div class="msg-messages" id="msg-messages-list">
      <div class="msg-messages-watermark"><img src="images/education-plus-center-logo---b.png" alt="" draggable="false"></div>
      <div class="msg-empty"><div class="msg-empty-icon">💬</div><div style="font-size:13px">لا توجد رسائل بعد</div></div>
    </div>
    <div class="msg-edit-banner" id="msg-edit-banner">
      <span>✏️</span>
      <span id="msg-edit-preview" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px"></span>
      <button class="msg-edit-cancel" onclick="window._cancelEdit()" title="إلغاء التعديل">✕</button>
    </div>
    <div class="msg-input-area">
      <label title="إرفاق ملف (PDF, Word, Excel, JPG, PNG)" style="padding:9px 12px;border-radius:12px;background:var(--primary-light);color:var(--primary);font-size:17px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;border:1.5px solid var(--border-2);transition:all 0.2s" onmouseover="this.style.background='var(--border-2)'" onmouseout="this.style.background='var(--primary-light)'">
        📎
        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp" style="display:none" onchange="if(this.files[0])window._sendFile(this.files[0]);this.value=''">
      </label>
      <textarea class="msg-input" id="msg-text-inp" placeholder="اكتب رسالتك هنا..." rows="1"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.sendMsg()}"
        oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'"></textarea>
      <button class="msg-send-btn" id="msg-send-btn" onclick="window.sendMsg()">إرسال ←</button>
    </div>`;

  // الاستماع للرسائل
  if (_msgUnsub2) { _msgUnsub2(); _msgUnsub2 = null; }
  _msgUnsub2 = onSnapshot(
    query(collection(_db, 'messages'), where('roomId', '==', roomId), orderBy('sentAt', 'asc'), limit(200)),
    snap => _renderMessages(snap.docs),
    err => {
      console.warn('messages listen error:', err.code, err.message);
      const list = document.getElementById('msg-messages-list');
      if (list) list.innerHTML = `<div class="msg-empty" style="color:var(--danger)"><div style="font-size:32px">⚠️</div><div style="font-size:13px;font-weight:700">خطأ في الاتصال</div><div style="font-size:12px;margin-top:4px">تحقق من صلاحيات Firestore — راجع التعليمات أدناه</div></div>`;
    }
  );
}
window.openMsgRoom = (roomId, roomName, data) => _openRoom(roomId, roomName, data);

// ═══════════════════════════
// رسم الرسائل
// ═══════════════════════════
function _renderMessages(docs) {
  const list = document.getElementById('msg-messages-list');
  if (!list) return;
  // keep watermark
  const watermark = list.querySelector('.msg-messages-watermark');
  if (!docs.length) {
    list.innerHTML = `<div class="msg-empty"><div class="msg-empty-icon">💬</div><div style="font-size:13px">لا توجد رسائل — ابدأ المحادثة!</div></div>`;
    if (watermark) list.insertBefore(watermark, list.firstChild);
    return;
  }
  let lastDate = '';
  list.innerHTML = '';
  if (watermark) list.appendChild(watermark);
  docs.forEach(d => {
    const m = d.data();
    const msgId = d.id;
    const isMine = m.senderId === _me?.uid;
    const dateObj = m.sentAt?.toDate ? m.sentAt.toDate() : new Date();
    const dateStr = dateObj.toLocaleDateString('ar-DZ', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = dateObj.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });

    if (dateStr !== lastDate) {
      lastDate = dateStr;
      const sep = document.createElement('div');
      sep.className = 'msg-date-sep';
      sep.textContent = dateStr;
      list.appendChild(sep);
    }

    const wrap = document.createElement('div');
    wrap.className = `msg-bubble ${isMine ? 'mine' : 'theirs'}`;
    wrap.dataset.msgId = msgId;
    const adminBadge = m.isAdmin && !isMine ? `<span style="font-size:9px;background:linear-gradient(135deg,var(--primary),#9333EA);color:white;padding:2px 6px;border-radius:99px;font-weight:800;margin-inline-start:4px">إدارة</span>` : '';

    // محتوى الرسالة — نص أو ملف
    let contentHtml = '';
    if (m.fileUrl) {
      const ext = (m.fileName || '').split('.').pop().toLowerCase();
      const isImg = ['jpg','jpeg','png','gif','webp'].includes(ext);
      if (isImg) {
        contentHtml = `<img src="${m.fileUrl}" alt="${m.fileName||'صورة'}" style="max-width:220px;max-height:180px;border-radius:10px;display:block;margin-bottom:4px;cursor:zoom-in" onclick="_openImgLightbox(this.src)">`;
      } else {
        const fileEmoji = ext === 'pdf' ? '📄' : (ext === 'xlsx' || ext === 'xls') ? '📊' : (ext === 'doc' || ext === 'docx') ? '📝' : '📎';
        contentHtml = `<a href="${m.fileUrl}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(255,255,255,0.15);border-radius:10px;text-decoration:none;color:inherit;font-size:13px;font-weight:700;max-width:220px">${fileEmoji} <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.fileName||'ملف'}</span></a>`;
      }
      if (m.text) contentHtml += `<div style="margin-top:6px">${(m.text||'').replace(/\n/g,'<br>')}</div>`;
    } else {
      contentHtml = `${(m.text || '').replace(/\n/g,'<br>')}`;
      if (m.edited) contentHtml += ` <span style="font-size:9px;opacity:0.55;font-style:italic">(تم التعديل)</span>`;
    }

    // زر 3 نقاط — يظهر عند hover لكل الرسائل (mine أو theirs إذا أدمين)
    const canAct = isMine || (_me?.isAdmin === true);

    // بناء زر 3 نقاط
    const dotWrap = document.createElement('div');
    dotWrap.className = 'msg-three-dot-wrap';

    const dotBtn = document.createElement('button');
    dotBtn.className = 'msg-three-dot';
    dotBtn.innerHTML = '&#8942;'; // ⋮ ثلاث نقاط عمودية
    dotBtn.title = 'خيارات';

    const menu = document.createElement('div');
    menu.className = 'msg-menu';
    menu.style.display = 'none';

    if (!m.fileUrl) {
      const editItem = document.createElement('div');
      editItem.className = 'msg-menu-item';
      editItem.innerHTML = '✏️ تعديل';
      editItem.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = 'none';
        window._editMsg && window._editMsg(msgId, m.text || '');
      });
      menu.appendChild(editItem);
    }

    const delItem = document.createElement('div');
    delItem.className = 'msg-menu-item danger';
    delItem.innerHTML = '🗑️ حذف';
    delItem.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = 'none';
      window._deleteMsg && window._deleteMsg(msgId);
    });
    menu.appendChild(delItem);

    dotBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.style.display === 'block';
      document.querySelectorAll('.msg-menu').forEach(el => el.style.display = 'none');
      if (!isOpen) { menu.style.display = 'block'; menu.style.animation = 'menuPop 0.15s ease'; }
    });

    dotWrap.appendChild(dotBtn);
    dotWrap.appendChild(menu);

    // صف يحتوي الفقاعة + الزر جنبها
    const bubbleRow = document.createElement('div');
    bubbleRow.className = 'msg-bubble-row';

    const bubbleInner = document.createElement('div');
    bubbleInner.className = 'msg-bubble-inner';
    bubbleInner.innerHTML = contentHtml;

    if (isMine) {
      bubbleRow.appendChild(dotWrap);
      bubbleRow.appendChild(bubbleInner);
    } else {
      bubbleRow.appendChild(bubbleInner);
      if (canAct) bubbleRow.appendChild(dotWrap);
    }

    if (!isMine) {
      const senderDiv = document.createElement('div');
      senderDiv.className = 'msg-sender-name';
      senderDiv.innerHTML = `${m.senderName || 'مجهول'}${adminBadge}`;
      wrap.appendChild(senderDiv);
    }

    wrap.appendChild(bubbleRow);

    const metaDiv = document.createElement('div');
    metaDiv.className = 'msg-meta';
    metaDiv.innerHTML = `${timeStr}${isMine ? ' <span style="color:#A5F3FC;font-size:11px">✓✓</span>' : ''}`;
    wrap.appendChild(metaDiv);

    list.appendChild(wrap);
  });
  list.scrollTop = list.scrollHeight;
}

// ═══════════════════════════
// حذف رسالة — نافذة تأكيد مخصصة
// ═══════════════════════════
window._deleteMsg = (msgId) => {
  // إنشاء نافذة التأكيد
  const bg = document.createElement('div');
  bg.className = 'del-confirm-bg';
  bg.id = 'del-confirm-bg';
  bg.innerHTML = `
    <div class="del-confirm-box">
      <div class="del-confirm-icon">🗑️</div>
      <div class="del-confirm-title">حذف الرسالة</div>
      <div class="del-confirm-sub">هل أنت متأكد من حذف هذه الرسالة؟<br>لا يمكن التراجع عن هذا الإجراء.</div>
      <div class="del-confirm-btns">
        <button class="del-confirm-cancel" id="del-cancel-btn">إلغاء</button>
        <button class="del-confirm-ok" id="del-ok-btn">🗑️ حذف</button>
      </div>
    </div>`;
  document.body.appendChild(bg);

  const close = () => bg.remove();
  document.getElementById('del-cancel-btn').onclick = close;
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  document.getElementById('del-ok-btn').onclick = async () => {
    close();
    try {
      await deleteDoc(doc(_db, 'messages', msgId));
    } catch(e) {
      window.showToast && showToast('❌ تعذّر الحذف: ' + e.message, true);
    }
  };
};

// ═══════════════════════════
// تعديل رسالة — عبر شريط الكتابة
// ═══════════════════════════
let _editingMsgId = null;

window._editMsg = (msgId, currentText) => {
  const decoded = currentText.replace(/&#39;/g,"'").replace(/<br>/g,'\n').replace(/<[^>]+>/g,'');
  const inp = document.getElementById('msg-text-inp');
  const banner = document.getElementById('msg-edit-banner');
  const preview = document.getElementById('msg-edit-preview');
  const sendBtn = document.getElementById('msg-send-btn');
  if (!inp || !banner) return;

  _editingMsgId = msgId;
  inp.value = decoded;
  inp.style.height = 'auto';
  inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
  inp.focus();

  if (preview) preview.textContent = decoded.length > 40 ? decoded.slice(0,40)+'…' : decoded;
  banner.classList.add('visible');
  if (sendBtn) { sendBtn.textContent = '✏️ تعديل'; sendBtn.style.background = 'linear-gradient(135deg,#059669,#10B981)'; sendBtn.style.boxShadow = '0 4px 14px rgba(16,185,129,0.35)'; }
};

window._cancelEdit = () => {
  _editingMsgId = null;
  const inp = document.getElementById('msg-text-inp');
  const banner = document.getElementById('msg-edit-banner');
  const sendBtn = document.getElementById('msg-send-btn');
  if (inp) { inp.value = ''; inp.style.height = ''; }
  if (banner) banner.classList.remove('visible');
  if (sendBtn) { sendBtn.textContent = 'إرسال ←'; sendBtn.style.background = ''; sendBtn.style.boxShadow = ''; }
};

// ═══════════════════════════
// رفع ملف وإرساله
// ═══════════════════════════
window._sendFile = async (file) => {
  if (!_db || !_me || !_room) return;
  // التحقق من النوع والحجم
  const allowedTypes = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/jpg','image/gif','image/webp'];
  if (!allowedTypes.includes(file.type)) {
    window.showToast && showToast('❌ نوع الملف غير مدعوم — PDF, Word, Excel, JPG, PNG فقط', true); return;
  }
  if (file.size > 5 * 1024 * 1024) {
    window.showToast && showToast('❌ حجم الملف يتجاوز 5MB', true); return;
  }
  // تحويل الملف إلى base64 وتخزينه في Firestore كـ dataUrl
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const dataUrl = ev.target.result;
    try {
      const msgDoc = {
        roomId: _room,
        text: '',
        fileName: file.name,
        fileUrl: dataUrl,
        fileType: file.type,
        senderId: _me.uid,
        senderName: _me.name,
        isAdmin: _me.isAdmin || false,
        sentAt: serverTimestamp()
      };
      await addDoc(collection(_db, 'messages'), msgDoc);
      if (_room !== 'general') {
        await updateDoc(doc(_db, 'msgRooms', _room), {
          lastMsg: `📎 ${file.name}`,
          lastAt: serverTimestamp()
        }).catch(() => {});
      }
      window.showToast && showToast(`📎 تم إرسال ${file.name}`);
    } catch(e) {
      window.showToast && showToast('❌ فشل إرسال الملف: ' + e.message, true);
    }
  };
  reader.readAsDataURL(file);
};
window.sendMsg = async () => {
  if (!_db || !_me || !_room) return;
  const inp = document.getElementById('msg-text-inp');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;

  // وضع التعديل
  if (_editingMsgId) {
    const editId = _editingMsgId;
    window._cancelEdit();
    updateDoc(doc(_db, 'messages', editId), { text, edited: true }).catch(e => {
      window.showToast && showToast('❌ تعذّر التعديل: ' + e.message, true);
    });
    return;
  }

  inp.value = '';
  inp.style.height = '';
  try {
    await addDoc(collection(_db, 'messages'), {
      roomId: _room,
      text,
      senderId: _me.uid,
      senderName: _me.name,
      isAdmin: _me.isAdmin || false,
      sentAt: serverTimestamp()
    });
    // تحديث آخر رسالة في الغرفة الخاصة + إظهارها لو كانت مخفية
    if (_room !== 'general') {
      await updateDoc(doc(_db, 'msgRooms', _room), {
        lastMsg: text,
        lastAt: serverTimestamp(),
        hiddenBy: {}
      }).catch(() => {});
    }
  } catch(e) {
    console.error('sendMsg error:', e.code, e.message);
    window.showToast && showToast('❌ خطأ: ' + (e.code === 'permission-denied' ? 'راجع صلاحيات Firestore' : e.message), true);
  }
};

// ═══════════════════════════
// فتح picker اختيار الأستاذ (أدمين)
// ═══════════════════════════
window.openNewConvPicker = () => {
  const bg = document.getElementById('msg-new-conv-bg');
  bg.style.display = 'flex';
  const si = document.getElementById('msg-teacher-search');
  if (si) si.value = '';
  _buildTeacherPicker();
};
window.closeNewConvPicker = () => {
  document.getElementById('msg-new-conv-bg').style.display = 'none';
};

function _buildTeacherPicker() {
  window._buildTP = _buildTeacherPicker; // expose for inline oninput
  const list = document.getElementById('msg-teacher-picker-list');
  // تحديث القائمة من المتغير العام
  _localTeachers = window.allTeachers || [];
  if (!_localTeachers.length) {
    // حاول تحميل الأساتذة مباشرة من Firestore إذا كانت القائمة فارغة
    list.innerHTML = `<div style="text-align:center;padding:28px;color:var(--text-muted)">
      <div style="font-size:36px;opacity:0.4;margin-bottom:8px">⏳</div>
      <div style="font-weight:700">جاري تحميل الأساتذة...</div>
    </div>`;
    getDocs(collection(_db, 'teachers')).then(snap => {
      _localTeachers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      window.allTeachers = _localTeachers;
      _buildTeacherPicker();
    }).catch(() => {
      list.innerHTML = `<div style="text-align:center;padding:28px;color:var(--text-muted)">
        <div style="font-size:36px;opacity:0.4;margin-bottom:8px">👨‍🏫</div>
        <div style="font-weight:700">لا يوجد أساتذة مسجّلون بعد</div>
      </div>`;
    });
    return;
  }
  // فلترة البحث
  const searchVal = (document.getElementById('msg-teacher-search')?.value || '').trim().toLowerCase();
  const filtered = searchVal
    ? _localTeachers.filter(t => t.name?.toLowerCase().includes(searchVal) || t.spec?.toLowerCase().includes(searchVal))
    : _localTeachers;

  list.innerHTML = '';
  if (!filtered.length) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">🔍 لا توجد نتائج مطابقة</div>`;
    return;
  }
  filtered.forEach(t => {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;border:1.5px solid var(--border);background:white;cursor:pointer;transition:all 0.2s;margin-bottom:8px';
    card.onmouseenter = () => { card.style.borderColor = 'var(--primary)'; card.style.background = 'var(--primary-light)'; card.style.transform = 'translateY(-1px)'; };
    card.onmouseleave = () => { card.style.borderColor = 'var(--border)'; card.style.background = 'white'; card.style.transform = ''; };
    card.onclick = () => _startPrivateConv(t.id, t.name);

    const avatarHtml = t.photo
      ? `<img src="${t.photo}" style="width:44px;height:44px;border-radius:13px;object-fit:cover;flex-shrink:0" alt="${t.name}">`
      : `<div style="width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,var(--primary),#9333EA);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:17px;flex-shrink:0">${(t.name||'?')[0]}</div>`;

    const todayName = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'][new Date().getDay()];
    const isActive = (t.days||[]).includes(todayName);

    card.innerHTML = `
      ${avatarHtml}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:14px;font-weight:800;color:var(--text)">${t.name}</span>
          ${isActive ? `<span style="font-size:10px;padding:2px 7px;border-radius:99px;background:var(--success-soft);color:var(--success);font-weight:800">● اليوم</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">🎓 ${t.spec || '—'}</div>
        <div style="font-size:11px;color:var(--primary);margin-top:1px;font-weight:600">📅 ${(t.days||[]).join('، ') || '—'}</div>
      </div>
      <div style="padding:8px 14px;border-radius:10px;background:var(--primary-light);color:var(--primary);font-size:12px;font-weight:800;flex-shrink:0">راسل ←</div>`;
    list.appendChild(card);
  });
}

// ═══════════════════════════
// بدء محادثة خاصة
// ═══════════════════════════
async function _startPrivateConv(teacherUid, teacherName) {
  if (!_db || !_me) return;
  closeNewConvPicker();

  // البحث عن غرفة موجودة
  let roomId = null;
  try {
    const snap = await getDocs(collection(_db, 'msgRooms'));
    snap.docs.forEach(d => {
      const p = d.data().participants || [];
      if (p.includes(_me.uid) && p.includes(teacherUid)) roomId = d.id;
    });
  } catch(e) { console.warn('msgRooms read error:', e.code); }

  if (!roomId) {
    try {
      const newRoom = await addDoc(collection(_db, 'msgRooms'), {
        participants: [_me.uid, teacherUid],
        names: { [_me.uid]: _me.name, [teacherUid]: teacherName },
        lastMsg: '',
        lastAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      roomId = newRoom.id;
    } catch(e) {
      console.error('create room error:', e.code);
      window.showToast && showToast('❌ تعذّر إنشاء المحادثة — تحقق من صلاحيات Firestore', true);
      return;
    }
  }

  const roomData = { participants: [_me.uid, teacherUid], names: { [_me.uid]: _me.name, [teacherUid]: teacherName } };
  _openRoom(roomId, teacherName, roomData);
}
window.startPrivateConv = _startPrivateConv;


// ═══════════════════════════
// قائمة 3 نقاط — direct listeners (مضافة عند إنشاء الأزرار)
// ═══════════════════════════
// إغلاق القوائم عند الضغط خارجها
document.addEventListener('click', (e) => {
  if (!e.target.closest('.msg-three-dot') && !e.target.closest('.msg-menu')) {
    document.querySelectorAll('.msg-menu').forEach(m => m.style.display = 'none');
  }
}, true);

// ═══════════════════════════
// Lightbox للصور
// ═══════════════════════════
window._openImgLightbox = (src) => {
  const bg = document.createElement('div');
  bg.className = 'img-lightbox-bg';
  bg.onclick = () => bg.remove();
  const img = document.createElement('img');
  img.src = src;
  img.onclick = e => e.stopPropagation();
  const closeBtn = document.createElement('button');
  closeBtn.className = 'img-lightbox-close';
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => bg.remove();
  bg.appendChild(img);
  bg.appendChild(closeBtn);
  document.body.appendChild(bg);
};

// ═══════════════════════════
// مسح الشات العام (أدمين فقط)
// ═══════════════════════════
window._clearGeneralChat = async () => {
  if (!_db || !_me || !_me.isAdmin) return;
  const confirmed = await EPUI.confirm('⚠️ هل أنت متأكد من مسح جميع رسائل الغرفة العامة؟\nهذا الإجراء لا يمكن التراجع عنه.', 'مسح الشات', { danger: true });
  if (!confirmed) return;

  const btn = document.querySelector('[onclick="window._clearGeneralChat()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري المسح...'; }

  try {
    // جلب كل الرسائل العامة
    const snap = await getDocs(
      query(collection(_db, 'messages'), where('roomId', '==', 'general'))
    );
    if (snap.empty) {
      window.showToast && showToast('💬 الغرفة العامة فارغة أصلاً');
      if (btn) { btn.disabled = false; btn.innerHTML = '🗑️ مسح الشات'; }
      return;
    }
    // حذف بالـ batch (50 في كل مرة كحد أقصى لـ Firestore)
    const batchSize = 50;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(_db);
      docs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    window.showToast && showToast(`✅ تم مسح ${docs.length} رسالة من الغرفة العامة`);
  } catch(e) {
    window.showToast && showToast('❌ خطأ أثناء المسح: ' + e.message, true);
    console.error('clearGeneralChat error:', e);
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '🗑️ مسح الشات'; }
};

// ═══════════════════════════
// إخفاء محادثة خاصة من القائمة
// ═══════════════════════════
window._hidePrivateRoom = (e, roomId, roomName) => {
  e.stopPropagation();
  // نافذة تأكيد
  const bg = document.createElement('div');
  bg.className = 'del-confirm-bg';
  bg.innerHTML = `
    <div class="del-confirm-box">
      <div class="del-confirm-icon">🗑️</div>
      <div class="del-confirm-title">إخفاء المحادثة</div>
      <div class="del-confirm-sub">هل تريد إخفاء محادثتك مع <strong>${roomName}</strong> من القائمة؟<br><span style="font-size:11px;color:var(--text-muted)">ستظهر مجدداً عند مراسلته مرة أخرى.</span></div>
      <div class="del-confirm-btns">
        <button class="del-confirm-cancel" id="hpr-cancel">إلغاء</button>
        <button class="del-confirm-ok" id="hpr-ok">🗑️ إخفاء</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  document.getElementById('hpr-cancel').onclick = close;
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  document.getElementById('hpr-ok').onclick = async () => {
    close();
    // نضيف الـ uid في hiddenBy بدون حذف الغرفة — يشوفها الطرف الآخر بعدين
    try {
      await updateDoc(doc(_db, 'msgRooms', roomId), {
        [`hiddenBy.${_me.uid}`]: true
      });
      // لو كانت مفتوحة، نغلقها
      if (_room === roomId) {
        _room = null;
        document.getElementById('msg-chat-area').innerHTML = `
          <div class="msg-no-conv">
            <div class="msg-no-conv-icon">💬</div>
            <div style="font-size:14px;font-weight:700">اختر محادثة للبدء</div>
            <div style="font-size:12px;color:var(--text-muted)">أو تصفّح غرفة الأساتذة</div>
          </div>`;
      }
      window.showToast && showToast('✅ تم إخفاء المحادثة');
    } catch(e) {
      window.showToast && showToast('❌ تعذّر الإخفاء: ' + e.message, true);
    }
  };
};

// ══════════════════════════════════════════════
// FINANCE MODULE
// ══════════════════════════════════════════════

let _finTxs = [];      // كل المعاملات محلياً
let _finTreasury = 0;  // الرصيد الابتدائي للخزينة
let _finUnsubTx = null; // real-time listener

// دالة مساعدة: الحصول على db الصحيح (fallback للـ main db)
function getFinDb() { return _db || window._mainDb; }

// تحميل البيانات من Firestore — real-time
window.loadFinanceSection = async function loadFinanceSection() {
  const finDb = getFinDb();
  if (!finDb) { console.error('Finance: db not ready'); showToast && showToast('❌ خطأ في الاتصال بقاعدة البيانات', true); return; }
  try {
    // تحميل رصيد الخزينة
    const tSnap = await getDoc(doc(finDb, 'settings', 'treasury'));
    _finTreasury = tSnap.exists() ? (tSnap.data().balance || 0) : 0;

    // إلغاء الاستماع السابق إن وُجد
    if (_finUnsubTx) { _finUnsubTx(); _finUnsubTx = null; }

    // real-time listener — يضمن ظهور كل تعديل فوراً
    _finUnsubTx = onSnapshot(query(collection(finDb, 'financeTx'), orderBy('date','desc')), snap => {
      _finTxs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderFinanceKPIs();
      renderFinanceTable();
    }, e => {
      console.error('financeTx listener:', e);
      showToast && showToast('❌ خطأ في الاتصال بقاعدة البيانات المالية', true);
    });
  } catch(e) {
    console.error('loadFinanceSection:', e);
    showToast && showToast('❌ خطأ في تحميل البيانات المالية', true);
  }
}

window.renderFinanceKPIs = function renderFinanceKPIs() {
  const totalExpense    = _finTxs.filter(t => t.type === 'expense').reduce((a,t) => a + (t.amount||0), 0);
  const totalSalary     = _finTxs.filter(t => t.type === 'salary' ).reduce((a,t) => a + (t.amount||0), 0);
  // الإيرادات غير المخيم الصيفي (مدخلة يدوياً)
  const manualIncome    = _finTxs.filter(t => t.type === 'income' && t.source !== 'summer_ticket').reduce((a,t) => a + (t.amount||0), 0);

  // ── KPI تذاكر المخيم الصيفي ──
  // المصدر الوحيد للحقيقة: summerTickets مباشرة (window._allTicketsData)
  // يضمن التطابق الكامل مع أرقام صفحة المخيم الصيفي
  const allTickets = window._allTicketsData || [];
  const paidTickets = allTickets.filter(t => !t.deleted && t.status === 'paid' && Number(t.amount||0) > 0);
  const summerTotal = paidTickets.reduce((a,t) => a + Number(t.amount||0), 0);

  // الإجمالي الكلي للإيرادات = إيرادات يدوية + مخيم صيفي (من المصدر الصحيح)
  const totalIncome = manualIncome + summerTotal;
  const balance = _finTreasury + totalIncome - totalExpense - totalSalary;

  const fmt = n => n.toLocaleString('ar-DZ') + ' دج';
  document.getElementById('fin-treasury').textContent = fmt(balance);
  document.getElementById('fin-treasury').style.color = balance >= 0 ? '#059669' : '#DC2626';
  document.getElementById('fin-total-expense').textContent = fmt(totalExpense);
  document.getElementById('fin-total-income').textContent  = fmt(totalIncome);
  document.getElementById('fin-total-salary').textContent  = fmt(totalSalary);

  // مجموعة المراجع المُسجَّلة في financeTx (للتحقق من ما تم استيراده)
  const summerTxs = _finTxs.filter(t => t.type === 'income' && t.source === 'summer_ticket');
  const importedTicketIds = new Set(summerTxs.map(t => t.ticketId).filter(Boolean));
  const importedReceipts  = new Set(summerTxs.map(t => t.receipt).filter(Boolean));

  // التذاكر المدفوعة غير المستوردة — نفس منطق importSummerTicketsToFinance
  const pendingImport = paidTickets.filter(t => {
    if (t.id && importedTicketIds.has(t.id)) return false;
    if (t.receipt && importedReceipts.has(t.receipt)) return false;
    return true;
  });

  const registeredCount = paidTickets.filter(t => {
    if (t.id && importedTicketIds.has(t.id)) return true;
    if (t.receipt && importedReceipts.has(t.receipt)) return true;
    return false;
  }).length;

  const sumTotalEl  = document.getElementById('fin-summer-total');
  const sumMetaEl   = document.getElementById('fin-summer-meta');
  const importBtn   = document.getElementById('btn-import-summer');
  if (sumTotalEl)  sumTotalEl.textContent  = fmt(summerTotal);
  if (sumMetaEl)   sumMetaEl.textContent   = `${registeredCount} تذكرة مسجّلة كمدخول — ${pendingImport.length} بانتظار الاستيراد`;
  if (importBtn) {
    if (pendingImport.length > 0) {
      importBtn.style.opacity = '1';
      importBtn.style.pointerEvents = '';
      importBtn.innerHTML = `☀️ استيراد ${pendingImport.length} تذكرة غير مسجّلة`;
    } else {
      importBtn.style.opacity = '0.5';
      importBtn.style.pointerEvents = 'none';
      importBtn.innerHTML = `✅ جميع التذاكر مسجّلة`;
    }
  }
}

window.renderFinanceTable = function renderFinanceTable() {
  const filter = document.getElementById('fin-filter')?.value || '';
  let rows;
  if (filter === 'income_summer') {
    rows = _finTxs.filter(t => t.type === 'income' && t.source === 'summer_ticket');
  } else if (filter) {
    rows = _finTxs.filter(t => t.type === filter);
  } else {
    rows = _finTxs;
  }
  const body = document.getElementById('fin-tx-body');
  if (!body) return;

  if (!rows.length) {
    body.innerHTML = `<div class="finance-empty"><div style="font-size:40px;margin-bottom:10px">📒</div><div style="font-weight:700">لا توجد معاملات</div></div>`;
    return;
  }

  const typeLabels = {
    expense: { label:'مصروف', icon:'📤' },
    income:  { label:'إيراد', icon:'📥' },
    salary:  { label:'راتب', icon:'👨‍🏫' }
  };

  body.innerHTML = rows.map(t => {
    const isSummerTicket = t.type === 'income' && t.source === 'summer_ticket';
    const info = isSummerTicket
      ? { label: 'تذكرة مخيم', icon: '☀️' }
      : (typeLabels[t.type] || { label: t.type, icon: '💰' });

    const dateStr = t.date
      ? new Date(t.date + 'T00:00:00').toLocaleDateString('ar-DZ', {day:'2-digit', month:'2-digit', year:'numeric'})
      : '—';
    const amountColor = t.type === 'income' ? (isSummerTicket ? '#C2410C' : '#059669') : '#DC2626';
    const amountSign  = t.type === 'income' ? '+' : '-';

    const receiptBadge = t.receipt
      ? `<span style="font-size:10px;font-family:monospace;color:var(--primary);background:var(--primary-light);padding:2px 7px;border-radius:6px;display:inline-block;margin-top:3px">${t.receipt}</span>`
      : '';

    const rowBg = isSummerTicket
      ? 'background:linear-gradient(135deg,rgba(249,115,22,0.04),rgba(234,88,12,0.02));'
      : '';

    return `<div class="finance-tx-row" style="${rowBg}">
      <div style="font-size:12px;color:var(--text-muted);font-weight:700">${dateStr}</div>
      <div style="font-weight:700;color:var(--text)">
        ${t.desc || '—'}
        ${t.teacher ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">👨‍🏫 ${t.teacher}</div>` : ''}
        ${receiptBadge}
      </div>
      <div>
        <span class="finance-tx-type ${t.type}${isSummerTicket ? ' summer-ticket' : ''}">${info.icon} ${info.label}</span>
      </div>
      <div style="font-weight:900;color:${amountColor}">${amountSign}${(t.amount||0).toLocaleString('ar-DZ')} دج</div>
      <div><button class="finance-tx-del" onclick="deleteFinanceTx('${t.id}')" title="حذف">🗑️</button></div>
    </div>`;
  }).join('');
}

// ── فتح Modal المعاملة ──
window.openFinanceModal = (type) => {
  const titles = { expense: '📤 إضافة مصروف', income: '📥 إضافة إيراد', salary: '👨‍🏫 صرف راتب' };
  const icons  = { expense: '📤', income: '📥', salary: '👨‍🏫' };
  document.getElementById('fin-modal-title').textContent = titles[type] || 'معاملة';
  document.getElementById('fin-modal-icon').textContent = icons[type] || '💰';
  document.getElementById('fin-tx-type').value = type;
  document.getElementById('fin-tx-desc').value = '';
  document.getElementById('fin-tx-amount').value = '';
  document.getElementById('fin-tx-date').value = new Date().toISOString().split('T')[0];

  // راتب: عرض قائمة الأساتذة
  const teacherRow = document.getElementById('fin-teacher-row');
  const teacherSel = document.getElementById('fin-tx-teacher');
  if (type === 'salary') {
    teacherRow.style.display = 'block';
    const teachers = window._allTeachersCache || [];
    teacherSel.innerHTML = '<option value="">— اختر الأستاذ —</option>' +
      teachers.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
  } else {
    teacherRow.style.display = 'none';
  }

  document.getElementById('finance-tx-modal').classList.add('open');
};
window.closeFinanceModal = () => document.getElementById('finance-tx-modal').classList.remove('open');

// ── حفظ المعاملة ──
window.saveFinanceTx = async () => {
  const type   = document.getElementById('fin-tx-type').value;
  const desc   = document.getElementById('fin-tx-desc').value.trim();
  const amount = parseFloat(document.getElementById('fin-tx-amount').value) || 0;
  const date   = document.getElementById('fin-tx-date').value;
  const teacher = document.getElementById('fin-tx-teacher')?.value || '';

  if (!desc) return showToast && showToast('أدخل وصفاً للمعاملة', true);
  if (!amount || amount <= 0) return showToast && showToast('أدخل مبلغاً صحيحاً', true);
  if (!date) return showToast && showToast('اختر التاريخ', true);

  const btn = document.getElementById('fin-save-btn');
  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';

  try {
    const tx = { type, desc, amount, date, createdAt: serverTimestamp() };
    if (teacher) tx.teacher = teacher;
    await addDoc(collection(getFinDb(), 'financeTx'), tx);
    // onSnapshot سيحدّث _finTxs تلقائياً
    closeFinanceModal();
    showToast && showToast('✅ تم حفظ المعاملة');
  } catch(e) {
    showToast && showToast('❌ خطأ في الحفظ: ' + e.message, true);
  } finally {
    btn.disabled = false; btn.innerHTML = '💾 حفظ';
  }
};

// ── حذف معاملة ──
window.deleteFinanceTx = async (txId) => {
  if (!(await EPUI.confirm('حذف هذه المعاملة نهائياً؟', 'حذف معاملة', { danger: true }))) return;
  try {
    await deleteDoc(doc(getFinDb(), 'financeTx', txId));
    // onSnapshot سيحدّث الجدول تلقائياً
    showToast && showToast('🗑️ تم الحذف');
  } catch(e) {
    showToast && showToast('❌ خطأ: ' + e.message, true);
  }
};

// ── استيراد تذاكر المخيم الصيفي المدفوعة إلى الموارد المالية ──
window.importSummerTicketsToFinance = async () => {
  const finDb = getFinDb();
  if (!finDb) { showToast && showToast('❌ خطأ في الاتصال', true); return; }

  const allTickets = window._allTicketsData || [];
  if (!allTickets.length) { showToast && showToast('⚠️ لا توجد تذاكر بعد', true); return; }

  // ── مجموعة التذاكر المُسجَّلة مسبقاً بكلا المرجعين (ticketId + receipt) ──
  const importedTicketIds = new Set(
    _finTxs
      .filter(t => t.type === 'income' && t.source === 'summer_ticket' && t.ticketId)
      .map(t => t.ticketId)
  );
  const importedReceipts = new Set(
    _finTxs
      .filter(t => t.type === 'income' && t.source === 'summer_ticket' && t.receipt)
      .map(t => t.receipt)
  );

  // ── التذاكر المدفوعة غير المستوردة بعد ──
  // نعتبر التذكرة مستوردة إذا كان ticketId موجوداً في السجلات
  // أو receipt موجود (للتوافق مع التذاكر القديمة)
  const toImport = allTickets.filter(t => {
    if (t.status !== 'paid') return false;
    if (Number(t.amount || 0) <= 0) return false;
    // إذا ticket موجود بـ ticketId → تجاهل
    if (t.id && importedTicketIds.has(t.id)) return false;
    // إذا ticket موجود بـ receipt (تذاكر قديمة بدون ticketId في financeTx) → تجاهل
    if (t.receipt && importedReceipts.has(t.receipt)) return false;
    return true;
  });

  if (!toImport.length) {
    showToast && showToast('✅ جميع التذاكر المدفوعة مسجَّلة بالفعل في الموارد المالية');
    return;
  }

  const confirmed = await EPUI.confirm(
    `☀️ سيتم إضافة ${toImport.length} تذكرة كمدخول في الموارد المالية:\n` +
    toImport.slice(0, 5).map(t => `• ${t.name} — ${Number(t.amount).toLocaleString('ar-DZ')} دج`).join('\n') +
    (toImport.length > 5 ? `\n... و${toImport.length - 5} تذاكر أخرى` : '') +
    '\n\nهل تريد المتابعة؟',
    'استيراد تذاكر المخيم'
  );
  if (!confirmed) return;

  const btn = document.getElementById('btn-import-summer');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ جاري الاستيراد...'; }

  let successCount = 0, errorCount = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const ticket of toImport) {
    try {
      await addDoc(collection(finDb, 'financeTx'), {
        type: 'income',
        source: 'summer_ticket',
        desc: `☀️ تذكرة مخيم — ${ticket.name}${ticket.pack ? ' (' + ticket.pack + ')' : ''}`,
        amount: Number(ticket.amount),
        date: ticket.date || today,
        receipt: ticket.receipt || '',
        ticketId: ticket.id || '',
        createdAt: serverTimestamp()
      });
      // وضع علامة financeSynced على التذكرة
      if (ticket.id) {
        updateDoc(doc(finDb, 'summerTickets', ticket.id), { financeSynced: true }).catch(() => {});
      }
      successCount++;
    } catch(e) {
      console.error('Import error for', ticket.name, e.message);
      errorCount++;
    }
  }

  if (btn) { btn.disabled = false; }

  if (successCount > 0) {
    showToast && showToast(`✅ تم استيراد ${successCount} تذكرة بنجاح${errorCount > 0 ? ` — ${errorCount} فشلت` : ''}`);
  } else {
    showToast && showToast('❌ فشل الاستيراد — تحقق من صلاحيات Firebase', true);
  }
};

// ── تعديل رصيد الخزينة ──
window.openTreasuryModal = () => {
  document.getElementById('treasury-amount').value = _finTreasury;
  document.getElementById('treasury-modal').classList.add('open');
};
window.closeTreasuryModal = () => document.getElementById('treasury-modal').classList.remove('open');

window.saveTreasuryBalance = async () => {
  const amount = parseFloat(document.getElementById('treasury-amount').value) || 0;
  try {
    await setDoc(doc(getFinDb(), 'settings', 'treasury'), { balance: amount, updatedAt: serverTimestamp() });
    _finTreasury = amount;
    renderFinanceKPIs();
    closeTreasuryModal();
    showToast && showToast('✅ تم تحديث رصيد الخزينة');
  } catch(e) {
    showToast && showToast('❌ خطأ: ' + e.message, true);
  }
};

// ══════════════════════════════════════════════
// تغيير إيميل/باسوورد الأستاذ (أدمين)
// ══════════════════════════════════════════════
window.openChangeCredentialsModal = async (teacherId, teacherName) => {
  document.getElementById('cred-teacher-id').value = teacherId;
  document.getElementById('cred-teacher-name').textContent = teacherName;
  document.getElementById('cred-email').value = '';
  document.getElementById('cred-password').value = '';
  document.getElementById('cred-current-password').value = '';

  // تحقق إذا الباسوورد محفوظ في Firestore
  const snap = await getDoc(doc(_db, 'teachers', teacherId));
  const hasPassword = snap.exists() && !!snap.data().password;
  const currentPwRow = document.getElementById('cred-current-password-row');
  currentPwRow.style.display = hasPassword ? 'none' : 'block';

  document.getElementById('change-cred-modal').classList.add('open');
};
window.closeChangeCredentialsModal = () => document.getElementById('change-cred-modal').classList.remove('open');

window.saveTeacherCredentials = async () => {
  const teacherId      = document.getElementById('cred-teacher-id').value;
  const newEmail       = document.getElementById('cred-email').value.trim();
  const newPassword    = document.getElementById('cred-password').value;
  const currentPwInput = document.getElementById('cred-current-password').value;

  if (!newEmail && !newPassword) return showToast && showToast('أدخل إيميل أو باسوورد جديد', true);
  if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return showToast && showToast('الإيميل غير صحيح', true);
  if (newPassword && newPassword.length < 6) return showToast && showToast('الباسوورد يجب أن يكون 6 أحرف على الأقل', true);

  const btn = document.getElementById('cred-save-btn');
  btn.disabled = true; btn.textContent = '⏳ جاري التحديث...';

  try {
    const apiKey = 'AIzaSyAMcplfO4veFVLtZZcyqfTJx9NGCit8gjo';

    // ── 1: جيب بيانات الأستاذ من Firestore ──
    const teacherSnap = await getDoc(doc(_db, 'teachers', teacherId));
    if (!teacherSnap.exists()) throw new Error('لم يتم العثور على بيانات الأستاذ');
    const teacherData  = teacherSnap.data();
    const currentEmail = teacherData.email || '';

    // ── 2: حدد الباسوورد الحالي (من Firestore أو من حقل الإدخال) ──
    let currentPassword = teacherData.password || '';
    if (!currentPassword) {
      // الأستاذ قديم — الأدمين يجب أن يدخله يدوياً
      if (!currentPwInput) throw new Error('أدخل الباسوورد الحالي للأستاذ أولاً');
      currentPassword = currentPwInput;
    }

    if (!currentEmail) throw new Error('الإيميل الحالي غير موجود في قاعدة البيانات');

    // ── 3: سجّل دخول بحساب الأستاذ عبر secondaryAuth ──
    const _secondaryAuth = window._secondaryAuth;
    const _signIn        = window._signInWithEmailAndPassword;
    const _signOutFn     = window._signOut;
    let credResult;
    try {
      credResult = await _signIn(_secondaryAuth, currentEmail, currentPassword);
    } catch(authErr) {
      await _signOutFn(_secondaryAuth).catch(()=>{});
      if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/wrong-password') {
        throw new Error('الباسوورد الحالي غير صحيح');
      }
      throw new Error('فشل التحقق: ' + authErr.message);
    }
    const idToken = await credResult.user.getIdToken();
    await _signOutFn(_secondaryAuth);

    // ── 4: عدّل الإيميل/الباسوورد باستخدام idToken ──
    const updatePayload = { idToken, returnSecureToken: false };
    if (newEmail)    updatePayload.email    = newEmail;
    if (newPassword) updatePayload.password = newPassword;

    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatePayload) }
    );
    const data = await r.json();
    if (data.error) {
      if (data.error.message?.includes('EMAIL_EXISTS'))  throw new Error('هذا الإيميل مستخدم من حساب آخر');
      if (data.error.message?.includes('INVALID_EMAIL')) throw new Error('الإيميل غير صحيح');
      if (data.error.message?.includes('WEAK_PASSWORD')) throw new Error('الباسوورد ضعيف، استخدم 6 أحرف أو أكثر');
      throw new Error(data.error.message);
    }

    // ── 5: حدّث Firestore بالبيانات الجديدة (دائماً احفظ الباسوورد) ──
    const firestoreUpdate = { password: newPassword || currentPassword };
    if (newEmail)    firestoreUpdate.email    = newEmail;
    if (newPassword) firestoreUpdate.password = newPassword;
    await updateDoc(doc(_db, 'teachers', teacherId), firestoreUpdate);

    closeChangeCredentialsModal();
    showToast && showToast('✅ تم تحديث بيانات الدخول بنجاح');
  } catch(e) {
    showToast && showToast('❌ ' + e.message, true);
  }
  btn.disabled = false; btn.innerHTML = '💾 حفظ التغييرات';
};

// ══════════════════════════════════════════════
// تعديل التذكرة
// ══════════════════════════════════════════════
window.openEditTicketModal = (ticketId) => {
  const _tickets = window._allTicketsData || [];
  const t = _tickets.find(x => x.id === ticketId);
  if (!t) return showToast && showToast('لم يتم العثور على التذكرة', true);

  document.getElementById('et-id').value        = ticketId;
  document.getElementById('et-name').value      = t.name || '';
  document.getElementById('et-receipt').value   = t.receipt || '';
  document.getElementById('et-date').value      = t.date || '';
  document.getElementById('et-pack').value      = t.pack || '';
  document.getElementById('et-amount').value    = t.amount || 0;
  document.getElementById('et-remaining').value = t.remainingAmount || 0;
  document.getElementById('et-fullprice').value = t.fullPrice || 0;

  document.getElementById('edit-ticket-modal').classList.add('open');
};

window.closeEditTicketModal = () => document.getElementById('edit-ticket-modal').classList.remove('open');

window.saveEditTicket = async () => {
  const id = document.getElementById('et-id').value;
  if (!id) return;

  const name      = document.getElementById('et-name').value.trim();
  const receipt   = document.getElementById('et-receipt').value.trim();
  const date      = document.getElementById('et-date').value;
  const pack      = document.getElementById('et-pack').value.trim();
  const amount    = parseFloat(document.getElementById('et-amount').value) || 0;
  const remaining = parseFloat(document.getElementById('et-remaining').value) || 0;
  const fullPriceInput = parseFloat(document.getElementById('et-fullprice').value) || 0;
  const status    = 'paid';

  if (!name) return showToast && showToast('أدخل اسم المشترك', true);

  // ── التحقق من صحة المبالغ ──
  // fullPrice يجب أن يكون >= amount دائماً
  const computedFullPrice = fullPriceInput > 0 ? fullPriceInput : (amount + remaining);
  if (computedFullPrice < amount) {
    return showToast && showToast('⚠️ السعر الكامل للباقة لا يمكن أن يكون أقل من المبلغ المدفوع', true);
  }
  // إعادة حساب المتبقي تلقائياً للتأكد من الاتساق
  const finalRemaining = Math.max(0, computedFullPrice - amount);

  const btn = document.getElementById('et-save-btn');
  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';

  // ── نجيب المبلغ القديم قبل التعديل لحساب الفرق ──
  const _tickets = window._allTicketsData || [];
  const oldTicket = _tickets.find(x => x.id === id);
  const oldAmount = oldTicket ? Number(oldTicket.amount || 0) : 0;

  try {
    await updateDoc(doc(_db, 'summerTickets', id), {
      name, receipt, date, pack,
      amount,
      remainingAmount: finalRemaining,
      fullPrice: computedFullPrice,
      status
    });

    // ── مزامنة المبلغ في الموارد المالية — تحديث مباشر لضمان التطابق مع المخيم ──
    if (amount !== oldAmount) {
      try {
        const finDb = (typeof getFinDb === 'function' ? getFinDb() : null) || _db;
        if (finDb) {
          // جلب كل سجلات هذه التذكرة المرتبطة بـ ticketId
          const txSnap = await getDocs(
            query(collection(finDb, 'financeTx'),
              where('source', '==', 'summer_ticket'),
              where('ticketId', '==', id)
            )
          );

          if (!txSnap.empty) {
            // يوجد سجل — نحدّث الأول بالمبلغ الجديد الكلي ونحذف أي سجلات زائدة
            const txDocs = txSnap.docs;
            await updateDoc(txDocs[0].ref, {
              amount,
              desc: `☀️ تذكرة مخيم — ${name} (${pack || '—'})`,
              date: date || txDocs[0].data().date || new Date().toISOString().split('T')[0],
              receipt: receipt || ''
            });
            // حذف السجلات المكررة الزائدة
            for (let i = 1; i < txDocs.length; i++) {
              await deleteDoc(txDocs[i].ref).catch(() => {});
            }
          } else {
            // لا يوجد سجل — أنشئ واحداً بالمبلغ الكلي الحالي
            await addDoc(collection(finDb, 'financeTx'), {
              type: 'income',
              source: 'summer_ticket',
              desc: `☀️ تذكرة مخيم — ${name} (${pack || '—'})`,
              amount,
              date: date || new Date().toISOString().split('T')[0],
              receipt: receipt || '',
              ticketId: id,
              createdAt: serverTimestamp()
            });
          }
        }
      } catch(finErr) {
        console.warn('financeTx sync error:', finErr.message);
      }
    }

    showToast && showToast('✅ تم تحديث التذكرة');
    closeEditTicketModal();
  } catch(e) {
    showToast && showToast('❌ خطأ: ' + e.message, true);
  }
  btn.disabled = false; btn.innerHTML = '💾 حفظ التعديلات';
};

/* ─────────────── [الجزء 3] نظام الثيمات + اللغة + تذاكر التعديل ─────────────── */
// ═══════════════════════════════════════════════════════════
//  THEME SYSTEM
// ═══════════════════════════════════════════════════════════
window._currentLang = localStorage.getItem('eplus_lang') || 'ar';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('eplus_theme', theme);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

// ═══════════════════════════════════════════════════════════
//  i18n DICTIONARY — UI labels only (dynamic data stays as-is)
// ═══════════════════════════════════════════════════════════
const I18N = {
  ar: {
    // sidebar
    ctrl_panel:'لوحة التحكم',
    sys_admin:'مشرف النظام',
    role_teacher:'👨‍\u200Dتعليم أستاذ',
    // nav sections
    main_menu:'القائمة الرئيسية',
    events:'الفعاليات',
    teachers_mgmt:'إدارة الأساتذة',
    communication:'التواصل',
    finance:'المالية',
    system:'النظام',
    // nav items
    stats_dashboard:'لوحة الإحصائيات',
    announcements:'الإعلانات',
    summer_camp:'المخيم الصيفي',
    teachers_att:'الأساتذة والحضور',
    messages:'الرسائل',
    financial_res:'الموارد المالية',
    settings:'الإعدادات',
    visit_site:'زيارة الموقع',
    // topbar
    logout:'تسجيل الخروج',
    logout_short:'🚪 خروج',
    main_site:'🏠 الموقع الرئيسي',
    platform_status:'حالة المنصة',
    greeting_prefix:'أهلاً،',
  },
  fr: {
    ctrl_panel:'Tableau de bord',
    sys_admin:'Administrateur',
    role_teacher:'👨‍\u200Dتعليم Professeur',
    main_menu:'Menu principal',
    events:'Événements',
    teachers_mgmt:'Gestion des profs',
    communication:'Communication',
    finance:'Finance',
    system:'Système',
    stats_dashboard:'Statistiques',
    announcements:'Annonces',
    summer_camp:"Camp d'été",
    teachers_att:'Profs & Présence',
    messages:'Messages',
    financial_res:'Ressources fin.',
    settings:'Paramètres',
    visit_site:'Visiter le site',
    logout:'Se déconnecter',
    logout_short:'🚪 Quitter',
    main_site:'🏠 Site principal',
    platform_status:'État de la plateforme',
    greeting_prefix:'Bonjour,',
  },
  en: {
    ctrl_panel:'Control Panel',
    sys_admin:'System Admin',
    role_teacher:'👨‍\u200Dتعليم Teacher',
    main_menu:'Main Menu',
    events:'Events',
    teachers_mgmt:'Teachers Mgmt',
    communication:'Communication',
    finance:'Finance',
    system:'System',
    stats_dashboard:'Statistics',
    announcements:'Announcements',
    summer_camp:'Summer Camp',
    teachers_att:'Teachers & Attendance',
    messages:'Messages',
    financial_res:'Financial Resources',
    settings:'Settings',
    visit_site:'Visit Website',
    logout:'Log Out',
    logout_short:'🚪 Logout',
    main_site:'🏠 Main Website',
    platform_status:'Platform Status',
    greeting_prefix:'Hello,',
  }
};

// ── t(key) — translate a key with current lang ──
function t(key) {
  const d = I18N[window._currentLang] || I18N.ar;
  return d[key] !== undefined ? d[key] : (I18N.ar[key] || key);
}

function applyLang(lang) {
  window._currentLang = lang;
  const isRtl = lang === 'ar';
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');

  // Translate all [data-i18n] elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });

  // Re-translate dynamic elements that JS overwrites
  const greetingEl = document.getElementById('topbar-greeting');
  if (greetingEl) {
    // Extract the name part (after the first space-comma or space)
    const stored = greetingEl.getAttribute('data-name') || '';
    if (stored) greetingEl.textContent = t('greeting_prefix') + ' ' + stored + ' 👋';
  }

  // Active lang button
  ['ar','fr','en'].forEach(l => {
    const btn = document.getElementById('lang-' + l);
    if (btn) btn.classList.toggle('active', l === lang);
  });

  localStorage.setItem('eplus_lang', lang);
}

function setLang(lang) { applyLang(lang); }

// ── Patch: intercept greeting writes so we can re-translate them ──
// We monkey-patch the greeting element's textContent setter via a helper
window.setGreeting = function(name) {
  const el = document.getElementById('topbar-greeting');
  if (!el) return;
  el.setAttribute('data-name', name);
  el.textContent = t('greeting_prefix') + ' ' + name + ' 👋';
};

// ═══════════════════════════════════════════════════════════
//  INIT on page load
// ═══════════════════════════════════════════════════════════
(function initPrefs() {
  const savedTheme = localStorage.getItem('eplus_theme') || 'light';
  const savedLang  = localStorage.getItem('eplus_lang')  || 'ar';
  applyTheme(savedTheme);
  // lang applied after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyLang(savedLang));
  } else {
    applyLang(savedLang);
  }
})();

// ═══════════════════════════════════════════════════════════
// ===== STUDENTS OVERVIEW PANEL (نظرة عامة على التلاميذ) =====
// ═══════════════════════════════════════════════════════════
window._sovTab = 'all';

window.setSovTab = function(tab, btn) {
  window._sovTab = tab;
  ['sov-tab-all','sov-tab-active','sov-tab-noticket'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  btn.classList.add('active');
  window.sovFilter();
};

function buildSovData() {
  const teachers = window.allTeachers || window._allTeachersCache || [];
  const tickets  = window.allTicketsData || window._allTicketsData || [];
  if (!teachers.length) return [];

  // ── تطبيع الاسم: lowercase + ترتيب الكلمات أبجدياً (يحل مشكلة "فاروق كير" vs "كير فاروق")
  const normName = n => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const sortedNorm = n => normName(n).split(' ').sort().join(' ');

  // ── مطابقة التذكرة بالاسم المرتّب (يتجاهل ترتيب الكلمات)
  const findTicket = name => {
    const sn = sortedNorm(name);
    // 1. تطابق تام بعد الترتيب
    let found = tickets.find(t => sortedNorm(t.name) === sn);
    if (found) return found;
    // 2. تطابق جزئي (الاسم جزء من اسم التذكرة أو العكس)
    found = tickets.find(t => {
      const tn = sortedNorm(t.name);
      return tn.includes(sn) || sn.includes(tn);
    });
    return found || null;
  };

  // ── dedup بالاسم المرتّب فقط (يمنع تكرار نفس التلميذ عند أكثر من أستاذ)
  const seenNames = new Set();   // dedup عالمي بالاسم (بغض النظر عن الأستاذ)
  const seenPerTeacher = new Set(); // dedup داخل نفس الأستاذ

  const rows = [];

  for (const teacher of teachers) {
    const groups = teacher.groups || [];
    for (const stu of (teacher.students || [])) {
      if (!stu.name) continue;

      const sn = sortedNorm(stu.name);

      // منع التكرار داخل نفس الأستاذ
      const teacherKey = sn + '|' + teacher.id;
      if (seenPerTeacher.has(teacherKey)) continue;
      seenPerTeacher.add(teacherKey);

      // إذا التلميذ موجود عند أستاذ آخر بالفعل — نتحقق إذا عنده تذكرة
      // إذا عنده تذكرة: نكتفي بأول مرة ظهر فيها
      // إذا ما عنده تذكرة: نضيفه لكل أستاذ (لأن قد يكون شخص مختلف)
      const ticket = findTicket(stu.name);
      if (ticket && seenNames.has(sn)) continue; // نفس الشخص عند أكثر من أستاذ — تجاهل التكرار
      if (ticket) seenNames.add(sn);

      const groupNames = groups
        .filter(g => (g.students || []).some(gs => sortedNorm(gs) === sn))
        .map(g => g.name).join(', ') || '—';

      let status, badgeClass, badgeLabel;
      if (!ticket) {
        status = 'noticket'; badgeClass = 'sov-no-ticket'; badgeLabel = '⛔ بدون تذكرة';
      } else if (ticket.status === 'paid') {
        status = 'active'; badgeClass = 'sov-active'; badgeLabel = '✅ مدفوع';
      } else {
        status = 'active'; badgeClass = 'sov-pending'; badgeLabel = '⏳ معلّق';
      }

      rows.push({
        name: stu.name,
        teacherName: teacher.name,
        teacherId: teacher.id,
        groupNames,
        status, badgeClass, badgeLabel,
        pack: ticket?.pack || '—',
        remaining: ticket ? (Number(ticket.remainingAmount) || 0) : null,
        receipt: ticket?.receipt || null
      });
    }
  }
  return rows;
}

window.populateSovTeacherFilter = function() {
  const sel = document.getElementById('sov-teacher-filter');
  if (!sel) return;
  const teachers = window.allTeachers || window._allTeachersCache || [];
  const current = sel.value;
  sel.innerHTML = '<option value="">كل الأساتذة</option>';
  teachers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    if (t.id === current) opt.selected = true;
    sel.appendChild(opt);
  });
};

window.populateSovPackFilter = function() {
  const sel = document.getElementById('sov-pack-filter');
  if (!sel) return;
  const current = sel.value;
  const PACKS = [
    'الباقة الأساسية (5-10)',
    'باقة النخبة (5-10)',
    'الباقة الأساسية (11-14)',
    'باقة النخبة (11-14)',
    'الباقة الأساسية (15-18)',
    'باقة النخبة (15-18)',
    'باقة تحضير البكالوريا (15-18)',
    'باقة البالغين',
    'باقة البالغين المتقدمة',
    'English Communication Class',
    'English for Specific Purposes',
    'IELTS Preparation',
    'تعلم التصوير والمونتاج',
    'تحسين الخط',
    'الحساب الذهني',
    'البرمجة',
  ];
  sel.innerHTML = '<option value="">كل الباقات</option>';
  PACKS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    if (p === current) opt.selected = true;
    sel.appendChild(opt);
  });
};

window.sovFilter = function() {
  const searchVal     = (document.getElementById('sov-search-inp')?.value || '').trim().toLowerCase();
  const teacherFilter = document.getElementById('sov-teacher-filter')?.value || '';
  const packFilter    = document.getElementById('sov-pack-filter')?.value || '';
  const tab           = window._sovTab || 'all';
  const allRows       = buildSovData();

  // Update stat counters (always unfiltered)
  const sovActive    = document.getElementById('sov-stat-active');
  const sovNoTicket  = document.getElementById('sov-stat-no-ticket');
  const sovTotal     = document.getElementById('sov-stat-total');
  if (sovActive)   sovActive.textContent   = allRows.filter(r => r.status === 'active').length;
  if (sovNoTicket) sovNoTicket.textContent = allRows.filter(r => r.status === 'noticket').length;
  if (sovTotal)    sovTotal.textContent    = allRows.length;

  const filtered = allRows.filter(r => {
    if (tab === 'active'   && r.status !== 'active')   return false;
    if (tab === 'noticket' && r.status !== 'noticket') return false;
    if (teacherFilter && r.teacherId !== teacherFilter) return false;
    if (packFilter && r.pack !== packFilter) return false;
    if (searchVal && !r.name.toLowerCase().includes(searchVal)) return false;
    return true;
  });

  const tbody = document.getElementById('sov-tbody');
  const empty = document.getElementById('sov-empty');
  const table = document.getElementById('sov-table');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = '';
    if (table) table.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (table) table.style.display = '';
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = filtered.map((r, i) => `
    <tr>
      <td style="color:var(--text-muted);font-size:11px">${i + 1}</td>
      <td style="font-weight:700;color:var(--text)">${r.name}</td>
      <td><span style="font-size:12px;background:var(--primary-light);color:var(--primary);padding:3px 10px;border-radius:99px;font-weight:700">${r.teacherName}</span></td>
      <td style="font-size:12px;color:var(--text-muted)">${r.groupNames}</td>
      <td><span class="sov-badge ${r.badgeClass}">${r.badgeLabel}</span></td>
      <td style="font-size:12px">${r.pack}</td>
      <td style="font-size:12px;font-weight:700;color:${r.remaining === null ? 'var(--text-muted)' : r.remaining > 0 ? 'var(--danger)' : 'var(--success)'}">
        ${r.remaining === null ? '—' : r.remaining === 0 ? '✓ مكتمل' : r.remaining.toLocaleString('ar-DZ') + ' دج'}
      </td>
      <td style="font-size:11px;font-family:monospace;color:var(--primary)">${r.receipt || '—'}</td>
    </tr>`).join('');
};

// ── Hook into renderTeachersGrid للتحديث التلقائي ──
(function _sovHookRender() {
  const _origRender = window.renderTeachersGrid;
  if (typeof _origRender === 'function') {
    window.renderTeachersGrid = function(teachers) {
      _origRender(teachers);
      window.populateSovTeacherFilter();
      window.populateSovPackFilter();
      window.sovFilter();
    };
  }
})();

// ── Polling للتحميل الأولي (يشتغل مرة واحدة) ──
(function _sovInitPoll() {
  const poll = setInterval(() => {
    const teachers = window.allTeachers || window._allTeachersCache;
    const tickets  = window.allTicketsData || window._allTicketsData;
    if (teachers && tickets) {
      clearInterval(poll);
      window.populateSovTeacherFilter();
      window.populateSovPackFilter();
      window.sovFilter();
    }
  }, 600);
})();
// ===== END STUDENTS OVERVIEW PANEL =====

// ═══════════════════════════════════════════════════════════
// 🔍 فحص شامل — يقارن التلاميذ في قوائم الحضور مع التذاكر
// ═══════════════════════════════════════════════════════════
window.sovFullCheck = function() {
  const data = buildSovData();
  const withTicket = data.filter(r => r.status === "active");
  const withoutTicket = data.filter(r => r.status === "noticket");
  
  let report = "📊 **تقرير فحص التلاميذ**\n\n";
  report += "✅ " + withTicket.length + " تلميذ عندهم تذكرة (مفعّلة)\n";
  report += "⛔ " + withoutTicket.length + " تلميذ بدون تذكرة\n";
  report += "📋 " + data.length + " تلميذ إجمالاً\n\n";
  
  if (withoutTicket.length > 0) {
    report += "⛔ **تلاميذ بدون تذاكر:**\n";
    withoutTicket.forEach(function(r, i) {
      report += (i+1) + ". " + r.name + " — مع الأستاذ: " + r.teacherName + "\n";
    });
  }
  
  EPUI.alert(report, '📋 تقرير التذاكر');
  
  window._sovTab = "noticket";
  document.querySelectorAll("#sov-tab-all, #sov-tab-active, #sov-tab-noticket").forEach(function(b) { b.classList.remove("active"); });
  var noticketBtn = document.getElementById("sov-tab-noticket");
  if (noticketBtn) noticketBtn.classList.add("active");
  window.sovFilter();
  
  showToast("🔍 الفحص اكتمل — " + withoutTicket.length + " بدون تذكرة من " + data.length + " تلميذ");
};

