// ═══════════════════════════════════════════════════════════
//  Admin — تسجيلات الدعم المدرسي
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://jftfvpultaqufhsekdle.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdGZ2cHVsdGFxdWZoc2VrZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTI2NzMsImV4cCI6MjA5OTMyODY3M30.6GzLcHQBFQJukYpLMEbFjHhbZQHWFLCj3wlTLvPN0Dc';

const COLUMNS = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'first_name', label: 'الاسم', sortable: true },
  { key: 'last_name', label: 'اللقب', sortable: true },
  { key: 'birth_date', label: 'تاريخ الميلاد', sortable: true },
  { key: 'parent_name', label: 'ولي الأمر', sortable: true },
  { key: 'parent_phone', label: 'هاتف ولي الأمر', sortable: false },
  { key: 'student_type', label: 'نوع الطالب', sortable: true },
  { key: 'level', label: 'المستوى', sortable: true },
  { key: 'institution', label: 'المؤسسة', sortable: false },
  { key: 'stream', label: 'الشعبة', sortable: true },
  { key: 'subjects', label: 'المواد', sortable: false },
  { key: 'created_at', label: 'تاريخ التسجيل', sortable: true },
  { key: 'status', label: 'الحالة', sortable: true },
];

let allData = [];
let filteredData = [];
let currentPage = 1;
const PAGE_SIZE = 15;
let sortKey = 'created_at';
let sortAsc = false;
let confirmId = null;
let deleteId = null;

function byId(id) { return document.getElementById(id); }

// ── Theme ──
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.querySelector('.theme-toggle').textContent = isDark ? '🌙' : '☀️';
}

// ── Toast ──
function showToast(msg, type = 'success') {
  const t = byId('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3000);
}

// ── Modal ──
function openModal(id) { byId(id).classList.add('open'); }
function closeModal(id) { byId(id).classList.remove('open'); }

// ── Fetch & Render ──
async function loadData() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    allData = await res.json();
    applyFilters();
  } catch (e) {
    console.error('Failed to load:', e);
    showToast('فشل تحميل البيانات', 'error');
  }
}

function refreshData() { loadData(); }

function applyFilters() {
  const search = (byId('search-input')?.value || '').trim().toLowerCase();
  const levelF = byId('level-filter')?.value || '';
  const streamF = byId('stream-filter')?.value || '';
  const instF = byId('institution-filter')?.value || '';
  const typeF = byId('type-filter')?.value || '';
  const statusF = byId('status-filter')?.value || '';

  filteredData = allData.filter(r => {
    if (search) {
      const txt = (r.id + ' ' + r.first_name + ' ' + r.last_name + ' ' + (r.parent_name || '') + ' ' + (r.parent_phone || '') + ' ' + (r.student_type || '')).toLowerCase();
      if (!txt.includes(search)) return false;
    }
    if (levelF && r.level !== levelF) return false;
    if (streamF && r.stream !== streamF) return false;
    if (instF && r.institution !== instF) return false;
    if (typeF && r.student_type !== typeF) return false;
    if (statusF && r.status !== statusF) return false;
    return true;
  });

  // Sort
  filteredData.sort((a, b) => {
    const va = (a[sortKey] || '').toString();
    const vb = (b[sortKey] || '').toString();
    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  currentPage = 1;
  renderStats();
  renderFilters();
  renderTable();
  renderLevelFilter();
}

function renderStats() {
  const total = allData.length;
  const pending = allData.filter(r => r.status === 'مسجل مبدئياً').length;
  const confirmed = allData.filter(r => r.status === 'مسجل نهائياً').length;
  byId('stats-row').innerHTML = `
    <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-val">${total}</div><div class="stat-label">إجمالي التسجيلات</div></div>
    <div class="stat-card"><div class="stat-icon">🟡</div><div class="stat-val">${pending}</div><div class="stat-label">مسجل مبدئياً</div></div>
    <div class="stat-card"><div class="stat-icon">🟢</div><div class="stat-val">${confirmed}</div><div class="stat-label">مسجل نهائياً</div></div>
  `;
}

function renderFilters() {
  const total = allData.length;
  const pending = allData.filter(r => r.status === 'مسجل مبدئياً').length;
  const confirmed = allData.filter(r => r.status === 'مسجل نهائياً').length;
  const current = byId('status-filter')?.value || '';
  byId('filter-bar').innerHTML = `
    <button class="filter-btn ${!current ? 'active' : ''}" onclick="byId('status-filter').value='';renderTable();applyFilters()">
      🏁 جميع الطلبات <span class="count">${total}</span>
    </button>
    <button class="filter-btn ${current === 'مسجل مبدئياً' ? 'active' : ''}" onclick="byId('status-filter').value='مسجل مبدئياً';renderTable();applyFilters()">
      🟡 مسجل مبدئياً <span class="count">${pending}</span>
    </button>
    <button class="filter-btn ${current === 'مسجل نهائياً' ? 'active' : ''}" onclick="byId('status-filter').value='مسجل نهائياً';renderTable();applyFilters()">
      🟢 مسجل نهائياً <span class="count">${confirmed}</span>
    </button>
  `;
}

function populateFilter(id, key, label, allLabel) {
  const sel = byId(id);
  if (!sel) return;
  const cur = sel.value;
  const vals = [...new Set(allData.map(r => r[key]).filter(Boolean))];
  sel.innerHTML = `<option value="">${allLabel}</option>` +
    vals.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${v}</option>`).join('');
}

function renderLevelFilter() {
  populateFilter('level-filter', 'level', 'المستوى', 'جميع المستويات');
  populateFilter('stream-filter', 'stream', 'الشعبة', 'جميع الشعب');
  populateFilter('institution-filter', 'institution', 'المؤسسة', 'جميع المؤسسات');
  populateFilter('type-filter', 'student_type', 'النوع', 'جميع الأنواع');
}

// ── Table ──
function renderTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filteredData.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE) || 1;

  // Header
  const head = byId('table-head');
  head.innerHTML = COLUMNS.map(c =>
    `<th onclick="${c.sortable ? "sortBy('" + c.key + "')" : ''}" style="${c.sortable ? 'cursor:pointer' : ''}">
      ${c.label} ${c.sortable ? (sortKey === c.key ? (sortAsc ? '▲' : '▼') : '⇅') : ''}
    </th>`
  ).join('') + '<th style="width:100px;">الإجراءات</th>';

  // Body
  const body = byId('table-body');
  if (page.length === 0) {
    body.innerHTML = '';
    byId('empty-state').style.display = 'block';
    byId('pagination').innerHTML = '';
    return;
  }
  byId('empty-state').style.display = 'none';

  body.innerHTML = page.map(r => {
    const isPending = r.status === 'مسجل مبدئياً';
    const subs = Array.isArray(r.subjects) ? r.subjects.map(s => typeof s === 'string' ? s : (s.subject || s)).join('، ') : '';
    return `<tr>
      <td style="direction:ltr;font-size:12px;font-weight:600">${r.id || '-'}</td>
      <td>${escHtml(r.first_name)}</td>
      <td>${escHtml(r.last_name)}</td>
      <td>${r.birth_date || '-'}</td>
      <td>${escHtml(r.parent_name || '-')}</td>
      <td dir="ltr">${r.parent_phone || '-'}</td>
      <td>${escHtml(r.student_type || '-')}</td>
      <td>${r.level || '-'}</td>
      <td>${escHtml(r.institution || '-')}</td>
      <td>${r.stream || '-'}</td>
      <td style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(subs)}">${subs || '-'}</td>
      <td style="font-size:11px;direction:ltr;text-align:right">${r.created_at ? formatDate(r.created_at) : '-'}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        <div class="actions">
          <button class="btn-view" onclick="viewDetail('${r.id}')" title="عرض"><i class="fa-solid fa-eye"></i></button>
          ${isPending ? `<button class="btn-confirm" onclick="openConfirm('${r.id}')" title="تأكيد التسجيل"><i class="fa-solid fa-check"></i></button>` : ''}
          <button class="btn-edit" onclick="editReg('${r.id}')" title="تعديل"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-delete" onclick="openDelete('${r.id}')" title="حذف"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Pagination
  const pg = byId('pagination');
  pg.innerHTML = `
    <button onclick="goPage(1)" ${currentPage <= 1 ? 'disabled' : ''}><i class="fa-solid fa-angles-right"></i></button>
    <button onclick="goPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>
    <span class="info">${currentPage} / ${totalPages}</span>
    <button onclick="goPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>
    <button onclick="goPage(${totalPages})" ${currentPage >= totalPages ? 'disabled' : ''}><i class="fa-solid fa-angles-left"></i></button>
  `;
}

function goPage(p) {
  const total = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
  if (p < 1 || p > total) return;
  currentPage = p;
  renderTable();
}

function sortBy(key) {
  if (sortKey === key) sortAsc = !sortAsc;
  else { sortKey = key; sortAsc = false; }
  applyFilters();
}

function statusBadge(status) {
  if (status === 'مسجل مبدئياً') return '<span class="status-badge pending"><i class="fa-regular fa-clock"></i> مسجل مبدئياً</span>';
  if (status === 'مسجل نهائياً') return '<span class="status-badge confirmed"><i class="fa-regular fa-circle-check"></i> مسجل نهائياً</span>';
  return `<span class="status-badge">${escHtml(status)}</span>`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function formatDate(d) {
  try { return new Date(d).toLocaleDateString('ar-DZ', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch(e) { return d || '-'; }
}

// ── View Detail ──
function viewDetail(id) {
  const r = allData.find(x => x.id === id);
  if (!r) return;
  const subs = Array.isArray(r.subjects) ? r.subjects.map(s =>
    `<span class="subj-tag">${escHtml(typeof s === 'string' ? s : (s.subject || s))}</span>`
  ).join('') : '-';
  byId('detail-content').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><div class="label">ID</div><div class="value" style="direction:ltr">${escHtml(r.id)}</div></div>
      <div class="detail-item"><div class="label">الحالة</div><div class="value">${statusBadge(r.status)}</div></div>
      <div class="detail-item"><div class="label">الاسم</div><div class="value">${escHtml(r.first_name)}</div></div>
      <div class="detail-item"><div class="label">اللقب</div><div class="value">${escHtml(r.last_name)}</div></div>
      <div class="detail-item"><div class="label">تاريخ الميلاد</div><div class="value">${r.birth_date || '-'}</div></div>
      <div class="detail-item"><div class="label">نوع الطالب</div><div class="value">${r.student_type || '-'}</div></div>
      <div class="detail-item"><div class="label">ولي الأمر</div><div class="value">${escHtml(r.parent_name || '-')}</div></div>
      <div class="detail-item"><div class="label">هاتف ولي الأمر</div><div class="value" dir="ltr">${r.parent_phone || '-'}</div></div>
      <div class="detail-item"><div class="label">المستوى</div><div class="value">${r.level || '-'}</div></div>
      <div class="detail-item"><div class="label">الشعبة</div><div class="value">${r.stream || '-'}</div></div>
      <div class="detail-item"><div class="label">المؤسسة</div><div class="value">${escHtml(r.institution || '-')}</div></div>
      <div class="detail-item"><div class="label">تاريخ التسجيل</div><div class="value">${formatDate(r.created_at)}</div></div>
      <div class="detail-item full"><div class="label">المواد المطلوبة</div><div class="subjects-list">${subs}</div></div>
    </div>
  `;
  openModal('detail-modal');
}

// ── Confirm ──
function openConfirm(id) {
  confirmId = id;
  const r = allData.find(x => x.id === id);
  byId('confirm-content').innerHTML = `هل أنت متأكد من تحويل الطالب <strong>${escHtml(r?.first_name || '')} ${escHtml(r?.last_name || '')}</strong> إلى "مسجل نهائياً"؟<br><br>بعد التأكيد، سيتم اعتبار الطالب مسجلاً بشكل نهائي في المركز.`;
  openModal('confirm-modal');
}

async function confirmYes() {
  if (!confirmId) return;
  const ok = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=eq.${encodeURIComponent(confirmId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ status: 'مسجل نهائياً' }),
  });
  if (ok.ok) {
    showToast('✅ تم تأكيد التسجيل بنجاح');
    closeModal('confirm-modal');
    loadData();
  } else {
    showToast('❌ فشل تأكيد التسجيل', 'error');
  }
  confirmId = null;
}

// ── Delete ──
function openDelete(id) {
  deleteId = id;
  openModal('delete-modal');
}

async function deleteYes() {
  if (!deleteId) return;
  const ok = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=eq.${encodeURIComponent(deleteId)}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (ok.ok) {
    showToast('🗑️ تم حذف التسجيل');
    closeModal('delete-modal');
    loadData();
  } else {
    showToast('❌ فشل حذف التسجيل', 'error');
  }
  deleteId = null;
}

// ── Edit ──
function editReg(id) {
  const r = allData.find(x => x.id === id);
  if (!r) return;
  const fn = prompt('الاسم', r.first_name);
  if (!fn) return;
  const ln = prompt('اللقب', r.last_name);
  if (!ln) return;
  const bd = prompt('تاريخ الميلاد', r.birth_date || '');
  const pn = prompt('اسم ولي الأمر', r.parent_name || '');
  const pp = prompt('رقم ولي الأمر', r.parent_phone || '');
  fetch(`${SUPABASE_URL}/rest/v1/registrations?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      first_name: fn,
      last_name: ln,
      birth_date: bd,
      parent_name: pn,
      parent_phone: pp,
    }),
  }).then(res => {
    if (res.ok) { showToast('✅ تم التعديل'); loadData(); }
    else showToast('❌ فشل التعديل', 'error');
  });
}

// ── Export ──
function exportCSV() {
  const rows = [COLUMNS.map(c => c.label)];
  filteredData.forEach(r => {
    const subs = Array.isArray(r.subjects) ? r.subjects.map(s => s.subject || s).join('; ') : '';
    rows.push(COLUMNS.map(c => {
      if (c.key === 'subjects') return subs;
      if (c.key === 'created_at') return formatDate(r[c.key]);
      return (r[c.key] || '').toString();
    }));
  });
  const csv = rows.map(row => row.map(v => '"' + v.replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'support-registrations.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('📥 تم تصدير CSV');
}

function exportExcel() {
  let html = '<table><thead><tr>' + COLUMNS.map(c => '<th>' + c.label + '</th>').join('') + '</tr></thead><tbody>';
  filteredData.forEach(r => {
    const subs = Array.isArray(r.subjects) ? r.subjects.map(s => s.subject || s).join('، ') : '';
    html += '<tr>' + COLUMNS.map(c => {
      let v = (r[c.key] || '').toString();
      if (c.key === 'subjects') v = subs;
      if (c.key === 'created_at') v = formatDate(r[c.key]);
      return '<td>' + v + '</td>';
    }).join('') + '</tr>';
  });
  html += '</tbody></table>';
  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'support-registrations.xls';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('📥 تم تصدير Excel');
}

function printTable() { window.print(); }

// ── Init ──
document.addEventListener('DOMContentLoaded', loadData);
