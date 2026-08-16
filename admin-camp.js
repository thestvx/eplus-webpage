// ═══════════════════════════════════════════════════════════
//  لوحة إدارة المخيم الصيفي — النسخة الثانية
//  جدول: summer_camp_registrations (Supabase)
//
//  ⚠️ البرامج والأسعار والمدة والمستويات تُقرأ من المصدر المركزي
//  window.CAMP_PROGRAMS / window.CAMP_LEVELS (js/camp-programs.js)
//  نفس المصدر المستخدم في نموذج التسجيل — أي تعديل يظهر هنا تلقائياً.
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  const CAMP_PROGRAMS = (window.CAMP_PROGRAMS && window.CAMP_PROGRAMS.length)
    ? window.CAMP_PROGRAMS
    : [
        { id: 'fr', icon: '🇫🇷', name: 'اللغة الفرنسية', price: 4000, duration: 'مكثّف لمدة شهر' },
        { id: 'en', icon: '🇬🇧', name: 'اللغة الإنجليزية', price: 4000, duration: 'مكثّف لمدة شهر' },
        { id: 'it', icon: '💻', name: 'IT', price: 2000, duration: 'لمدة شهر' },
        { id: 'line', icon: '✍️', name: 'تحسين الخط', price: 2000, duration: 'لمدة شهر' },
        { id: 'soroban', icon: '🧠', name: 'الحساب الذهني — سوروبان', price: 2000, duration: 'لمدة شهر' },
      ];
  const CAMP_LEVELS = (window.CAMP_LEVELS && window.CAMP_LEVELS.length)
    ? window.CAMP_LEVELS
    : [
        { value: 'ابتدائي', label: 'المستوى الابتدائي', emoji: '🟢' },
        { value: 'متوسط', label: 'المستوى المتوسط', emoji: '🔵' },
        { value: 'ثانوي', label: 'المستوى الثانوي', emoji: '🟣' },
      ];

  const CAMP_TABLE = 'summer_camp_registrations';

  let allRows = [];
  let filteredRows = [];
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let sortField = 'created_at';
  let sortDir = 'desc';

  const $ = (id) => document.getElementById(id);

  // ── إعدادات Supabase (من نفس ملف لوحة التحكم admin.html) ──
  function supabaseConfig() {
    if (typeof SR_SUPABASE_URL !== 'undefined' && typeof SR_ANON_KEY !== 'undefined') {
      return { url: SR_SUPABASE_URL, key: SR_ANON_KEY };
    }
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
      return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
    }
    throw new Error('تعذر العثور على إعدادات قاعدة البيانات');
  }

  function supabaseFetch(url, options) {
    const { key } = supabaseConfig();
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        ...(options?.headers || {}),
      },
    });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function normalizePrograms(row) {
    let p = row.programs;
    if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = []; } }
    return Array.isArray(p) ? p : [];
  }

  function levelLabel(value) {
    const l = CAMP_LEVELS.find(x => x.value === value);
    return l ? l.emoji + ' ' + l.label : (value || '—');
  }

  function levelShort(value) {
    const l = CAMP_LEVELS.find(x => x.value === value);
    return l ? l.label : (value || '—');
  }

  function programById(id) {
    return CAMP_PROGRAMS.find(p => p.id === id);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('ar-DZ') + ' ' + d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(iso); }
  }

  function formatDateShort(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('ar-DZ');
    } catch (e) { return String(iso); }
  }

  function formatMoney(n) {
    return (Number(n) || 0).toLocaleString('fr-DZ') + ' دج';
  }

  function fullName(row) {
    return ((row.first_name || '') + ' ' + (row.last_name || '')).trim();
  }

  // ═══════ منطق نقي قابل للاختبار ═══════

  function camp2FilterRows(rows, opts) {
    const q = (opts.search || '').trim().toLowerCase();
    const level = (opts.level || '').trim();
    const program = (opts.program || '').trim();
    return (rows || []).filter(r => {
      if (level && r.education_level !== level) return false;
      if (program) {
        const has = normalizePrograms(r).some(p => p.id === program || p.name === program);
        if (!has) return false;
      }
      if (q) {
        const hay = [
          r.first_name, r.last_name, fullName(r),
          r.guardian_name, r.guardian_phone,
        ].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function camp2BuildStats(rows) {
    const list = rows || [];
    const stats = {
      total: list.length,
      totalAmount: 0,
      levels: {},
      programs: {},
    };
    CAMP_LEVELS.forEach(l => { stats.levels[l.value] = 0; });
    CAMP_PROGRAMS.forEach(p => { stats.programs[p.id] = 0; });
    list.forEach(r => {
      stats.totalAmount += Number(r.total_amount) || 0;
      if (r.education_level && stats.levels[r.education_level] != null) stats.levels[r.education_level]++;
      normalizePrograms(r).forEach(p => {
        const key = p.id || p.name;
        if (key && stats.programs[key] != null) stats.programs[key]++;
      });
    });
    return stats;
  }

  function camp2SortRows(rows, field, dir) {
    const arr = (rows || []).slice();
    const d = dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va, vb;
      if (field === 'created_at') {
        va = new Date(a.created_at || 0).getTime();
        vb = new Date(b.created_at || 0).getTime();
      } else if (field === 'total_amount') {
        va = Number(a.total_amount) || 0;
        vb = Number(b.total_amount) || 0;
      } else {
        va = String(a[field] || '');
        vb = String(b[field] || '');
        const cmp = va.localeCompare(vb, 'ar');
        return cmp * d;
      }
      return (va - vb) * d;
    });
    return arr;
  }

  function camp2GroupByLevel(rows) {
    return CAMP_LEVELS.map(l => ({
      level: l,
      rows: (rows || []).filter(r => r.education_level === l.value),
    })).filter(g => g.rows.length > 0);
  }

  function camp2GroupByProgram(rows) {
    return CAMP_PROGRAMS.map(p => ({
      program: p,
      rows: (rows || []).filter(r => normalizePrograms(r).some(x => x.id === p.id || x.name === p.name)),
    })).filter(g => g.rows.length > 0);
  }

  function camp2Csv(rows) {
    const header = ['رقم التسجيل', 'الاسم', 'اللقب', 'تاريخ الميلاد', 'اسم ولي الأمر', 'هاتف ولي الأمر', 'المستوى', 'البرامج', 'الإجمالي (دج)', 'تاريخ التسجيل'];
    const lines = [header.join(',')];
    (rows || []).forEach(r => {
      const progs = normalizePrograms(r).map(p => p.name).join(' + ');
      const escCsv = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      lines.push([
        escCsv(r.id),
        escCsv(r.first_name),
        escCsv(r.last_name),
        escCsv(r.birth_date || ''),
        escCsv(r.guardian_name),
        escCsv(r.guardian_phone),
        escCsv(levelShort(r.education_level)),
        escCsv(progs),
        escCsv(Number(r.total_amount) || 0),
        escCsv(formatDateShort(r.created_at)),
      ].join(','));
    });
    return lines.join('\n');
  }

  function camp2RowDetailHtml(r) {
    const progs = normalizePrograms(r).map(p => {
      const name = p.name || (programById(p.id) ? programById(p.id).name : p.id);
      const price = p.price != null ? p.price : (programById(p.id) ? programById(p.id).price : 0);
      const dur = p.duration || (programById(p.id) ? programById(p.id).duration : '');
      return `<div class="camp2-detail-prog">
        <span>${esc(p.icon || '')} <strong>${esc(name)}</strong></span>
        <span>${esc(dur)}</span>
        <span>${formatMoney(price)}</span>
      </div>`;
    }).join('');
    return `
      <div class="camp2-detail-block">
        <div class="camp2-detail-row"><span class="camp2-detail-label">رقم التسجيل</span><span class="camp2-detail-val" dir="ltr">${esc(r.id)}</span></div>
        <div class="camp2-detail-row"><span class="camp2-detail-label">الاسم الكامل</span><span class="camp2-detail-val">${esc(r.first_name)} ${esc(r.last_name)}</span></div>
        <div class="camp2-detail-row"><span class="camp2-detail-label">تاريخ الميلاد</span><span class="camp2-detail-val">${esc(r.birth_date || '—')}</span></div>
        <div class="camp2-detail-row"><span class="camp2-detail-label">ولي الأمر</span><span class="camp2-detail-val">${esc(r.guardian_name || '—')}</span></div>
        <div class="camp2-detail-row"><span class="camp2-detail-label">الهاتف</span><span class="camp2-detail-val" dir="ltr">${esc(r.guardian_phone || '—')}</span></div>
        <div class="camp2-detail-row"><span class="camp2-detail-label">المستوى الدراسي</span><span class="camp2-detail-val">${levelLabel(r.education_level)}</span></div>
      </div>
      <div class="camp2-detail-block">
        <div class="camp2-detail-label" style="margin-bottom:8px">البرامج المطلوبة</div>
        ${progs || '<div style="font-size:13px;color:var(--text-muted)">لا توجد برامج</div>'}
      </div>
      <div class="camp2-detail-block">
        <div class="camp2-detail-total"><span>الإجمالي</span><strong>${formatMoney(r.total_amount)}</strong></div>
      </div>
      <div class="camp2-detail-block">
        <div class="camp2-detail-row"><span class="camp2-detail-label">تاريخ التسجيل</span><span class="camp2-detail-val">${formatDate(r.created_at)}</span></div>
        <div class="camp2-detail-row"><span class="camp2-detail-label">قبول القوانين</span><span class="camp2-detail-val">${r.terms_accepted ? 'نعم' : '—'}</span></div>
      </div>`;
  }

  // ═══════ واجهة المستخدم ═══════

  function populateFilters() {
    const levelSel = $('camp2-filter-level');
    if (levelSel && !levelSel.dataset.populated) {
      CAMP_LEVELS.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.value;
        opt.textContent = l.emoji + ' ' + l.label;
        levelSel.appendChild(opt);
      });
      levelSel.dataset.populated = '1';
    }
    const progSel = $('camp2-filter-program');
    if (progSel && !progSel.dataset.populated) {
      CAMP_PROGRAMS.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.icon + ' ' + p.name;
        progSel.appendChild(opt);
      });
      progSel.dataset.populated = '1';
    }
  }

  function currentFilters() {
    return {
      search: $('camp2-search') ? $('camp2-search').value : '',
      level: $('camp2-filter-level') ? $('camp2-filter-level').value : '',
      program: $('camp2-filter-program') ? $('camp2-filter-program').value : '',
    };
  }

  function renderStats(rows) {
    const s = camp2BuildStats(rows);
    const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    set('camp2-stat-total', s.total);
    set('camp2-stat-total-amount', formatMoney(s.totalAmount));
    set('camp2-stat-level-initial', s.levels['ابتدائي'] || 0);
    set('camp2-stat-level-middle', s.levels['متوسط'] || 0);
    set('camp2-stat-level-high', s.levels['ثانوي'] || 0);
    CAMP_PROGRAMS.forEach(p => {
      const el = $('camp2-stat-prog-' + p.id);
      if (el) el.textContent = s.programs[p.id] || 0;
    });
    const badge = $('nav-badge-camp2');
    if (badge) badge.textContent = allRows.length;
  }

  function renderTable() {
    const tbody = $('camp2-tbody');
    if (!tbody) return;
    const rows = camp2SortRows(filteredRows, sortField, sortDir);
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > pages) currentPage = pages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const page = rows.slice(start, start + PAGE_SIZE);

    if (!page.length) {
      tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--text-muted)">لا توجد تسجيلات</td></tr>';
    } else {
      tbody.innerHTML = page.map((r, i) => {
        const progs = normalizePrograms(r);
        const progsText = progs.map(p => (p.icon || '') + ' ' + (p.name || p.id)).join(' • ') || '—';
        return `<tr>
          <td>${start + i + 1}</td>
          <td dir="ltr" style="font-weight:700;color:var(--summer)">${esc(r.id)}</td>
          <td>${esc(r.last_name || '—')}</td>
          <td>${esc(r.first_name || '—')}</td>
          <td>${esc(r.birth_date || '—')}</td>
          <td>${esc(r.guardian_name || '—')}</td>
          <td dir="ltr">${esc(r.guardian_phone || '—')}</td>
          <td>${levelShort(r.education_level)}</td>
          <td style="font-size:12px;max-width:230px">${esc(progsText)}</td>
          <td style="font-weight:800">${formatMoney(r.total_amount)}</td>
          <td style="font-size:11.5px">${formatDate(r.created_at)}</td>
          <td><button class="tbl-action view" onclick="camp2OpenDetails('${esc(r.id)}')" title="تفاصيل">👁</button></td>
        </tr>`;
      }).join('');
    }

    const info = $('camp2-pagination-info');
    if (info) info.textContent = total ? `عرض ${start + 1}–${Math.min(start + PAGE_SIZE, total)} من ${total} تسجيل` : 'لا توجد نتائج';

    const btns = $('camp2-pagination-btns');
    if (btns) {
      let html = '';
      if (currentPage > 1) html += `<button class="tbl-action" onclick="camp2GoPage(1)">«</button>`;
      if (currentPage > 1) html += `<button class="tbl-action" onclick="camp2GoPage(${currentPage - 1})">‹</button>`;
      for (let p = 1; p <= pages; p++) {
        if (pages > 9 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== pages) continue;
        html += `<button class="tbl-action ${p === currentPage ? 'view' : ''}" onclick="camp2GoPage(${p})">${p}</button>`;
      }
      if (currentPage < pages) html += `<button class="tbl-action" onclick="camp2GoPage(${currentPage + 1})">›</button>`;
      if (currentPage < pages) html += `<button class="tbl-action" onclick="camp2GoPage(${pages})">»</button>`;
      btns.innerHTML = html;
    }
  }

  function camp2ApplyFilters() {
    currentPage = 1;
    const f = currentFilters();
    filteredRows = camp2FilterRows(allRows, f);
    renderTable();
  }

  async function camp2LoadData() {
    populateFilters();
    const tbody = $('camp2-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--text-muted)">⏳ جاري تحميل البيانات...</td></tr>';
    try {
      const { url } = supabaseConfig();
      const res = await supabaseFetch(`${url}/rest/v1/${CAMP_TABLE}?select=*&order=created_at.desc`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      allRows = await res.json();
      if (!Array.isArray(allRows)) allRows = [];
      renderStats(allRows);
      camp2ApplyFilters();
    } catch (e) {
      console.error('Camp2 load error:', e);
      if (tbody) tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--danger)">❌ فشل تحميل البيانات</td></tr>';
    }
  }

  function camp2Refresh() {
    camp2LoadData();
  }

  function camp2Sort(field) {
    if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortField = field; sortDir = field === 'id' || field === 'last_name' || field === 'first_name' ? 'asc' : 'desc'; }
    renderTable();
  }

  function camp2GoPage(p) {
    const rows = camp2SortRows(filteredRows, sortField, sortDir);
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    currentPage = Math.min(pages, Math.max(1, p));
    renderTable();
  }

  function camp2OpenDetails(id) {
    const r = allRows.find(x => x.id === id);
    if (!r) return;
    const c = $('camp2-detail-content');
    if (c) c.innerHTML = camp2RowDetailHtml(r);
    const m = $('camp2-detail-modal');
    if (m) m.classList.add('open');
  }

  function camp2CloseDetails() {
    const m = $('camp2-detail-modal');
    if (m) m.classList.remove('open');
  }

  // ═══════ الطباعة ═══════
  function printTableHtml(title, rows, extraTitle) {
    const head = ['رقم التسجيل', 'اللقب', 'الاسم', 'تاريخ الميلاد', 'ولي الأمر', 'الهاتف', 'المستوى', 'البرامج', 'الإجمالي', 'تاريخ التسجيل'];
    const body = rows.map(r => {
      const progs = normalizePrograms(r).map(p => p.name || p.id).join(' + ');
      return `<tr>
        <td>${esc(r.id)}</td>
        <td>${esc(r.last_name)}</td>
        <td>${esc(r.first_name)}</td>
        <td>${esc(r.birth_date || '—')}</td>
        <td>${esc(r.guardian_name || '—')}</td>
        <td dir="ltr">${esc(r.guardian_phone || '—')}</td>
        <td>${levelShort(r.education_level)}</td>
        <td>${esc(progs)}</td>
        <td>${formatMoney(r.total_amount)}</td>
        <td>${formatDateShort(r.created_at)}</td>
      </tr>`;
    }).join('');
    const sub = extraTitle ? `<div class="pt-sub">${esc(extraTitle)}</div>` : '';
    return `
      <div class="pt-group">
        <h3>${esc(title)}</h3>
        ${sub}
        <table>
          <thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${body || '<tr><td colspan="10" style="text-align:center;color:#888">لا توجد تسجيلات</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  function camp2Print() {
    const range = $('camp2-print-range') ? $('camp2-print-range').value : 'current';
    const sorted = camp2SortRows(filteredRows, sortField, sortDir);
    const all = camp2SortRows(allRows, sortField, sortDir);
    let groupsHtml = '';

    if (range === 'current') {
      groupsHtml = printTableHtml('تسجيلات المخيم الصيفي — نتائج الفلتر', sorted);
    } else if (range === 'all') {
      groupsHtml = printTableHtml('تسجيلات المخيم الصيفي — جميع التسجيلات', all);
    } else if (range === 'bylevel') {
      groupsHtml = camp2GroupByLevel(all).map(g =>
        printTableHtml(levelLabel(g.level.value), g.rows)
      ).join('') || '<div class="pt-group"><h3>لا توجد تسجيلات</h3></div>';
    } else if (range === 'byprogram') {
      groupsHtml = camp2GroupByProgram(all).map(g =>
        printTableHtml(g.program.icon + ' ' + g.program.name, g.rows, g.program.duration + ' — ' + formatMoney(g.program.price))
      ).join('') || '<div class="pt-group"><h3>لا توجد تسجيلات</h3></div>';
    }

    const w = window.open('', '_blank', 'width=1100,height=700');
    if (!w) { alert('يرجى السماح بالنوافذ المنبثقة للطباعة'); return; }
    w.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>طباعة المخيم الصيفي</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;text-align:right;color:#111;padding:24px;margin:0;background:#fff}
  .pt-head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #EA580C;padding-bottom:10px;margin-bottom:18px}
  .pt-head h1{margin:0;font-size:20px;color:#C2410C}
  .pt-meta{font-size:12px;color:#555;margin-top:4px}
  .pt-group{margin-bottom:24px;break-inside:avoid}
  .pt-group h3{margin:0 0 6px;font-size:15px;color:#111;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:8px 12px}
  .pt-sub{font-size:12px;color:#666;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:6px}
  th,td{border:1px solid #ddd;padding:6px 8px;text-align:right}
  th{background:#FFF1E2;font-weight:700;color:#7C2D12}
  tr:nth-child(even){background:#FDF9F4}
  .pt-foot{margin-top:14px;font-size:11px;color:#777;border-top:1px solid #ddd;padding-top:8px}
  @media print{body{padding:8px}}
</style>
</head>
<body>
  <div class="pt-head">
    <div>
      <h1>🏕️ المخيم الصيفي — النسخة الثانية</h1>
      <div class="pt-meta">مركز E-PLUS للتعليم — ${new Date().toLocaleString('ar-DZ')} — إجمالي التسجيلات: ${all.length} — إجمالي القيمة: ${formatMoney(camp2BuildStats(all).totalAmount)}</div>
    </div>
  </div>
  ${groupsHtml}
  <div class="pt-foot">تم إنشاء هذا التقرير تلقائياً من لوحة إدارة مركز E-PLUS</div>
  <script>window.print();<\/script>
</body>
</html>`);
    w.document.close();
  }

  // ═══════ تصدير CSV ═══════
  function camp2ExportCSV() {
    const rows = camp2SortRows(filteredRows, sortField, sortDir);
    const csv = '\uFEFF' + camp2Csv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'المخيم-الصيفي-' + new Date().toLocaleDateString('ar-DZ').replace(/\//g, '-') + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ═══════ تصدير الدوال ═══════
  window.camp2LoadData = camp2LoadData;
  window.camp2ApplyFilters = camp2ApplyFilters;
  window.camp2Refresh = camp2Refresh;
  window.camp2Sort = camp2Sort;
  window.camp2GoPage = camp2GoPage;
  window.camp2OpenDetails = camp2OpenDetails;
  window.camp2CloseDetails = camp2CloseDetails;
  window.camp2Print = camp2Print;
  window.camp2ExportCSV = camp2ExportCSV;

  // دوال منطقية نقيّة (تُستخدم في الاختبارات الآلية)
  window.camp2FilterRows = camp2FilterRows;
  window.camp2BuildStats = camp2BuildStats;
  window.camp2GroupByLevel = camp2GroupByLevel;
  window.camp2GroupByProgram = camp2GroupByProgram;
  window.camp2Csv = camp2Csv;
})();
