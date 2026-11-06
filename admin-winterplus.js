(function () {
  'use strict';

  const WPREG_URL = 'https://jftfvpultaqufhsekdle.supabase.co';
  const WPREG_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdGZ2cHVsdGFxdWZoc2VrZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTI2NzMsImV4cCI6MjA5OTMyODY3M30.ep8b2omBGaN2qUB_XG8EE8XDhoRfAVAwnxOgEodEKBc';
  const WPREG_TABLE = 'program_registrations';
  const WPREG_TYPE = 'winterplus';
  const PAGE_SIZE = 20;

  let allRows = [];
  let filteredRows = [];
  let currentPage = 1;
  let sortField = 'created_at';
  let sortDir = 'desc';

  const $ = (id) => document.getElementById(id);

  function wpregFetch(url, options) {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': WPREG_KEY,
        'Authorization': 'Bearer ' + WPREG_KEY,
        ...(options && options.headers ? options.headers : {}),
      },
    });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function extraOf(row) {
    let extra = row ? row.extra : null;
    if (typeof extra === 'string') {
      try { extra = JSON.parse(extra); } catch (e) { extra = {}; }
    }
    return extra && typeof extra === 'object' && !Array.isArray(extra) ? extra : {};
  }

  function ageOf(row) {
    const age = parseInt(extraOf(row).age, 10);
    return Number.isFinite(age) && age > 0 ? age : null;
  }

  function normalizeGroup(value) {
    const s = String(value || '').replace(/\s/g, '');
    if (/^6[-–—]9$/.test(s)) return '6–9';
    if (/^10[-–—]14$/.test(s)) return '10–14';
    return String(value || '').trim();
  }

  function groupOf(row) {
    const fromExtra = normalizeGroup(extraOf(row).age_group);
    if (fromExtra) return fromExtra;
    const age = ageOf(row);
    if (age == null) return '—';
    return age <= 9 ? '6–9' : '10–14';
  }

  function fullName(row) {
    return ((row.last_name || '') + ' ' + (row.first_name || '')).trim() || '—';
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
    try { return new Date(iso).toLocaleDateString('ar-DZ'); }
    catch (e) { return String(iso); }
  }

  function daysOf(row) {
    const days = extraOf(row).days;
    if (Array.isArray(days)) return days.map(d => String(d || '').trim()).filter(Boolean);
    if (typeof days === 'string' && days.trim()) {
      return days.split(/[,،|+]/).map(d => d.trim()).filter(Boolean);
    }
    return [];
  }

  function truncate(value, max) {
    const s = String(value || '').replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  function canManage() {
    return !window._employeeRestrictions;
  }

  function notify(message, isError) {
    if (typeof showToast === 'function') showToast(message, !!isError);
    else window.alert(message);
  }

  function wpregFilterRows(rows, opts) {
    const q = String((opts && opts.search) || '').trim().toLowerCase();
    const group = normalizeGroup(opts && opts.group);
    return (rows || []).filter(r => {
      if (group && groupOf(r) !== group) return false;
      if (!q) return true;
      const e = extraOf(r);
      const hay = [
        fullName(r), r.id, r.first_name, r.last_name, r.phone,
        r.parent_name, r.parent_phone, e.program, e.motivation,
        groupOf(r), ageOf(r),
      ].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function wpregBuildStats(rows) {
    const list = rows || [];
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const stats = { total: list.length, g69: 0, g1014: 0, week: 0 };
    list.forEach(r => {
      const group = groupOf(r);
      if (group === '6–9') stats.g69++;
      else if (group === '10–14') stats.g1014++;
      const t = new Date(r.created_at || 0).getTime();
      if (Number.isFinite(t) && t >= weekAgo) stats.week++;
    });
    return stats;
  }

  function wpregSortRows(rows, field, dir) {
    const arr = (rows || []).slice();
    const d = dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va;
      let vb;
      if (field === 'created_at') {
        va = new Date(a.created_at || 0).getTime();
        vb = new Date(b.created_at || 0).getTime();
      } else if (field === 'age') {
        va = ageOf(a) == null ? -1 : ageOf(a);
        vb = ageOf(b) == null ? -1 : ageOf(b);
      } else if (field === 'last_name') {
        va = fullName(a);
        vb = fullName(b);
        return va.localeCompare(vb, 'ar') * d;
      } else {
        va = String(a[field] || '');
        vb = String(b[field] || '');
        return va.localeCompare(vb, 'ar') * d;
      }
      return (va - vb) * d;
    });
    return arr;
  }

  function wpregGroupByAge(rows) {
    return ['6–9', '10–14'].map(group => ({
      group,
      rows: (rows || []).filter(r => groupOf(r) === group),
    })).filter(item => item.rows.length > 0);
  }

  function wpregCsv(rows) {
    const header = ['رقم التسجيل', 'اللقب', 'الاسم', 'العمر', 'الفئة', 'ولي الأمر', 'الهاتف', 'الدافع', 'أيام البرنامج', 'الحالة', 'تاريخ التسجيل'];
    const lines = [header.join(',')];
    const csvEsc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    (rows || []).forEach(r => {
      const e = extraOf(r);
      lines.push([
        csvEsc(r.id),
        csvEsc(r.last_name),
        csvEsc(r.first_name),
        csvEsc(ageOf(r) == null ? '' : ageOf(r)),
        csvEsc(groupOf(r)),
        csvEsc(r.parent_name),
        csvEsc(r.parent_phone || r.phone),
        csvEsc(e.motivation || ''),
        csvEsc(daysOf(r).join(' + ')),
        csvEsc(r.status || ''),
        csvEsc(formatDateShort(r.created_at)),
      ].join(','));
    });
    return lines.join('\n');
  }

  function wpregRowDetailHtml(row) {
    const e = extraOf(row);
    const age = ageOf(row);
    const group = groupOf(row);
    const status = row.status || '—';
    const initial = String((row.first_name || '؟').trim().charAt(0) || '؟');
    const statusStyle = status === 'مسجل نهائياً'
      ? 'background:rgba(16,185,129,0.12);color:#059669;border:1px solid rgba(16,185,129,0.25)'
      : 'background:rgba(245,158,11,0.14);color:#d97706;border:1px solid rgba(245,158,11,0.3)';
    const days = daysOf(row);
    const daysHtml = days.length
      ? days.map(day => `<div class="sr-detail-subject"><span class="sr-detail-subject-name">📌 ${esc(day)}</span></div>`).join('')
      : '<div class="sr-detail-empty">—</div>';

    let html = '<div class="sr-detail-hero">'
      + '<div class="sr-detail-avatar">' + esc(initial) + '</div>'
      + '<div style="min-width:0">'
      + '<div class="sr-detail-hero-name">' + esc(fullName(row)) + '</div>'
      + '<div class="sr-detail-hero-id" dir="ltr">' + esc(row.id) + ' · WinterPlus</div>'
      + '</div>'
      + '<span class="sr-detail-status-badge" style="' + statusStyle + '">' + esc(status) + '</span>'
      + '</div>';

    html += '<div class="sr-detail-grid">'
      + '<div class="sr-detail-cell"><span class="sr-detail-label">العمر</span><span class="sr-detail-val">' + esc(age == null ? '—' : age + ' سنة') + '</span></div>'
      + '<div class="sr-detail-cell"><span class="sr-detail-label">الفئة العمرية</span><span class="sr-detail-val">' + esc(group) + '</span></div>'
      + '<div class="sr-detail-cell"><span class="sr-detail-label">ولي الأمر</span><span class="sr-detail-val">' + esc(row.parent_name || '—') + '</span></div>'
      + '<div class="sr-detail-cell"><span class="sr-detail-label">الهاتف</span><span class="sr-detail-val" dir="ltr">' + esc(row.parent_phone || row.phone || '—') + '</span></div>'
      + '<div class="sr-detail-cell"><span class="sr-detail-label">البرنامج</span><span class="sr-detail-val">' + esc(e.program || 'WinterPlus 2026') + '</span></div>'
      + '<div class="sr-detail-cell"><span class="sr-detail-label">تاريخ التسجيل</span><span class="sr-detail-val">' + esc(formatDate(row.created_at)) + '</span></div>'
      + '<div class="sr-detail-cell"><span class="sr-detail-label">قبول القوانين</span><span class="sr-detail-val">' + (row.terms_accepted ? '✅ نعم' : '—') + '</span></div>'
      + '<div class="sr-detail-cell"><span class="sr-detail-label">الرسوم</span><span class="sr-detail-val">' + (row.fee_amount == null || Number(row.fee_amount) === 0 ? '🎁 بدون رسوم' : esc(row.fee_amount) + ' دج') + '</span></div>'
      + '</div>';

    if (e.motivation) {
      html += '<div class="sr-detail-block-title">دافع المشاركة</div><div class="sr-detail-empty" style="text-align:right">' + esc(e.motivation) + '</div>';
    }

    html += '<div class="sr-detail-block-title">أيام البرنامج</div>' + daysHtml;

    if (canManage()) {
      html += '<div class="sr-detail-actions"><button class="tbl-action del" onclick="winterplusDeleteRow(\'' + esc(row.id) + '\')" style="border-color:rgba(220,38,38,0.3);color:#dc2626;font-weight:800;padding:8px 20px;font-size:12px">🗑️ حذف التسجيل</button></div>';
    }

    return html;
  }

  function renderStats(rows) {
    const stats = wpregBuildStats(rows);
    const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };
    set('wpreg-stat-total', stats.total);
    set('wpreg-stat-6-9', stats.g69);
    set('wpreg-stat-10-14', stats.g1014);
    set('wpreg-stat-week', stats.week);
    const badge = $('nav-badge-winterplus');
    if (badge) badge.textContent = allRows.length;
  }

  function renderTable() {
    const tbody = $('wpreg-tbody');
    if (!tbody) return;
    const rows = wpregSortRows(filteredRows, sortField, sortDir);
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > pages) currentPage = pages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const page = rows.slice(start, start + PAGE_SIZE);

    if (!page.length) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted)">لا توجد تسجيلات</td></tr>';
    } else {
      tbody.innerHTML = page.map((r, i) => {
        const age = ageOf(r);
        const e = extraOf(r);
        return `<tr ondblclick="winterplusOpenDetails('${esc(r.id)}')" style="cursor:pointer" title="اضغط مرتين لعرض التفاصيل">
          <td>${start + i + 1}</td>
          <td dir="ltr" style="font-weight:700;color:#0284C7">${esc(r.id)}</td>
          <td>${esc(fullName(r))}</td>
          <td>${age == null ? '—' : age}</td>
          <td>${esc(groupOf(r))}</td>
          <td>${esc(r.parent_name || '—')}</td>
          <td dir="ltr">${esc(r.parent_phone || r.phone || '—')}</td>
          <td style="font-size:12px;max-width:220px">${esc(e.motivation ? truncate(e.motivation, 70) : '—')}</td>
          <td style="font-size:11.5px">${formatDate(r.created_at)}</td>
          <td><button class="tbl-action" onclick="event.stopPropagation();winterplusOpenDetails('${esc(r.id)}')" style="padding:5px 12px">👁️ عرض</button></td>
        </tr>`;
      }).join('');
    }

    const info = $('wpreg-pagination-info');
    if (info) info.textContent = total ? `عرض ${start + 1}–${Math.min(start + PAGE_SIZE, total)} من ${total} تسجيل` : 'لا توجد نتائج';

    const btns = $('wpreg-pagination-btns');
    if (btns) {
      let html = '';
      if (currentPage > 1) html += `<button class="tbl-action" onclick="winterplusGoPage(1)">«</button>`;
      if (currentPage > 1) html += `<button class="tbl-action" onclick="winterplusGoPage(${currentPage - 1})">‹</button>`;
      for (let p = 1; p <= pages; p++) {
        if (pages > 9 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== pages) continue;
        html += `<button class="tbl-action ${p === currentPage ? 'view' : ''}" onclick="winterplusGoPage(${p})">${p}</button>`;
      }
      if (currentPage < pages) html += `<button class="tbl-action" onclick="winterplusGoPage(${currentPage + 1})">›</button>`;
      if (currentPage < pages) html += `<button class="tbl-action" onclick="winterplusGoPage(${pages})">»</button>`;
      btns.innerHTML = html;
    }
  }

  function currentFilters() {
    return {
      search: $('wpreg-search') ? $('wpreg-search').value : '',
      group: $('wpreg-filter-group') ? $('wpreg-filter-group').value : '',
    };
  }

  function winterplusApplyFilters() {
    currentPage = 1;
    filteredRows = wpregFilterRows(allRows, currentFilters());
    renderTable();
  }

  async function winterplusLoadData() {
    const tbody = $('wpreg-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted)">⏳ جاري تحميل البيانات...</td></tr>';
    try {
      const res = await wpregFetch(`${WPREG_URL}/rest/v1/${WPREG_TABLE}?select=*&type=eq.${WPREG_TYPE}&order=created_at.desc`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      allRows = (Array.isArray(data) ? data : []).filter(r => !r.deleted_at && String(r.type || '') === WPREG_TYPE);
      renderStats(allRows);
      winterplusApplyFilters();
    } catch (e) {
      console.error('WinterPlus load error:', e);
      if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--danger)">❌ فشل تحميل البيانات</td></tr>';
    }
  }

  function winterplusRefresh() {
    winterplusLoadData();
  }

  function winterplusSort(field) {
    if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortField = field; sortDir = field === 'id' || field === 'last_name' || field === 'age' ? 'asc' : 'desc'; }
    renderTable();
  }

  function winterplusGoPage(page) {
    const rows = wpregSortRows(filteredRows, sortField, sortDir);
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    currentPage = Math.min(pages, Math.max(1, page));
    renderTable();
  }

  function winterplusOpenDetails(id) {
    const row = allRows.find(x => String(x.id) === String(id));
    if (!row) return;
    const content = $('wpreg-detail-content');
    if (content) content.innerHTML = wpregRowDetailHtml(row);
    const modal = $('wpreg-detail-modal');
    if (modal) modal.classList.add('open');
  }

  function winterplusCloseDetails() {
    const modal = $('wpreg-detail-modal');
    if (modal) modal.classList.remove('open');
  }

  async function winterplusDeleteRow(id) {
    if (!canManage()) { notify('⛔ ليس لديك صلاحية حذف تسجيلات WinterPlus', true); return; }
    const row = allRows.find(x => String(x.id) === String(id));
    if (!row) return;
    const name = fullName(row);
    let ok = false;
    if (typeof cmConfirm === 'function') {
      ok = await cmConfirm('حذف تسجيل WinterPlus', `هل أنت متأكد من حذف تسجيل <strong>${esc(name)}</strong> (${esc(row.id)})؟\n\nلا يمكن التراجع عن هذا الإجراء.`, '🗑️', { danger: true, confirmText: 'حذف' });
    } else {
      ok = window.confirm('حذف تسجيل WinterPlus: ' + name + '؟');
    }
    if (!ok) return;
    try {
      const res = await wpregFetch(`${WPREG_URL}/rest/v1/${WPREG_TABLE}?id=eq.${encodeURIComponent(id)}&type=eq.${WPREG_TYPE}`, {
        method: 'DELETE',
        headers: { 'Prefer': 'return=minimal' },
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      allRows = allRows.filter(x => String(x.id) !== String(id));
      winterplusCloseDetails();
      winterplusApplyFilters();
      renderStats(allRows);
      notify('✅ تم حذف تسجيل: ' + name);
    } catch (e) {
      console.error('WinterPlus delete error:', e);
      notify('❌ فشل الحذف: ' + (e.message || ''), true);
    }
  }

  function printTableHtml(title, rows, extraTitle) {
    const head = ['رقم التسجيل', 'اللقب', 'الاسم', 'العمر', 'الفئة', 'ولي الأمر', 'الهاتف', 'الدافع', 'أيام البرنامج', 'تاريخ التسجيل'];
    const body = (rows || []).map(r => {
      const e = extraOf(r);
      const age = ageOf(r);
      return `<tr>
        <td>${esc(r.id)}</td>
        <td>${esc(r.last_name)}</td>
        <td>${esc(r.first_name)}</td>
        <td>${age == null ? '—' : age}</td>
        <td>${esc(groupOf(r))}</td>
        <td>${esc(r.parent_name || '—')}</td>
        <td dir="ltr">${esc(r.parent_phone || r.phone || '—')}</td>
        <td>${esc(e.motivation || '—')}</td>
        <td>${esc(daysOf(r).join(' + ') || '—')}</td>
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

  function winterplusPrint() {
    const range = $('wpreg-print-range') ? $('wpreg-print-range').value : 'current';
    const sorted = wpregSortRows(filteredRows, sortField, sortDir);
    const all = wpregSortRows(allRows, sortField, sortDir);
    let groupsHtml = '';

    if (range === 'current') {
      groupsHtml = printTableHtml('تسجيلات WinterPlus — نتائج الفلتر', sorted);
    } else if (range === 'all') {
      groupsHtml = printTableHtml('تسجيلات WinterPlus — جميع التسجيلات', all);
    } else if (range === 'bygroup') {
      groupsHtml = wpregGroupByAge(all).map(group =>
        printTableHtml('الفئة العمرية ' + group.group + ' سنوات', group.rows)
      ).join('') || '<div class="pt-group"><h3>لا توجد تسجيلات</h3></div>';
    }

    const w = window.open('', '_blank', 'width=1100,height=700');
    if (!w) { window.alert('يرجى السماح بالنوافذ المنبثقة للطباعة'); return; }
    w.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>طباعة WinterPlus</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;text-align:right;color:#111;padding:24px;margin:0;background:#fff}
  .pt-head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0284C7;padding-bottom:10px;margin-bottom:18px}
  .pt-head h1{margin:0;font-size:20px;color:#0369A1}
  .pt-meta{font-size:12px;color:#555;margin-top:4px}
  .pt-group{margin-bottom:24px;break-inside:avoid}
  .pt-group h3{margin:0 0 6px;font-size:15px;color:#111;background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;padding:8px 12px}
  .pt-sub{font-size:12px;color:#666;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:6px}
  th,td{border:1px solid #ddd;padding:6px 8px;text-align:right}
  th{background:#E0F2FE;font-weight:700;color:#075985}
  tr:nth-child(even){background:#F8FCFF}
  .pt-foot{margin-top:14px;font-size:11px;color:#777;border-top:1px solid #ddd;padding-top:8px}
  @media print{body{padding:8px}}
</style>
</head>
<body>
  <div class="pt-head">
    <div>
      <h1>❄️ المخيم الشتوي — WinterPlus</h1>
      <div class="pt-meta">مركز E-PLUS للتعليم — ${new Date().toLocaleString('ar-DZ')} — إجمالي التسجيلات: ${all.length}</div>
    </div>
  </div>
  ${groupsHtml}
  <div class="pt-foot">تم إنشاء هذا التقرير تلقائياً من لوحة إدارة مركز E-PLUS</div>
  <script>window.print();<\/script>
</body>
</html>`);
    w.document.close();
  }

  function winterplusExportCSV() {
    const rows = wpregSortRows(filteredRows, sortField, sortDir);
    const csv = '\uFEFF' + wpregCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'WinterPlus-' + new Date().toLocaleDateString('ar-DZ').replace(/\//g, '-') + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.winterplusLoadData = winterplusLoadData;
  window.winterplusApplyFilters = winterplusApplyFilters;
  window.winterplusRefresh = winterplusRefresh;
  window.winterplusSort = winterplusSort;
  window.winterplusGoPage = winterplusGoPage;
  window.winterplusOpenDetails = winterplusOpenDetails;
  window.winterplusCloseDetails = winterplusCloseDetails;
  window.winterplusDeleteRow = winterplusDeleteRow;
  window.winterplusPrint = winterplusPrint;
  window.winterplusExportCSV = winterplusExportCSV;

  window.wpregFilterRows = wpregFilterRows;
  window.wpregBuildStats = wpregBuildStats;
  window.wpregSortRows = wpregSortRows;
  window.wpregGroupByAge = wpregGroupByAge;
  window.wpregCsv = wpregCsv;
  window.wpregRowDetailHtml = wpregRowDetailHtml;
  window.wpregGroupOf = groupOf;
})();
