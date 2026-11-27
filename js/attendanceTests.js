(function () {
  'use strict';

  const SUPABASE_URL = 'https://jftfvpultaqufhsekdle.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdGZ2cHVsdGFxdWFmaHNla2RsZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY0NTM5OTU4LCJleHAiOjIwODAwMTU5NTh9.5oqYnSZS4k3qj9z8y2r0e5g8mY8vR7z2p1wK6Fq4s0c';
  const ADMIN_API = SUPABASE_URL + '/functions/v1/admin-api';

  const STATUS_LABELS = {
    draft: 'مسودة',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتمل – بانتظار التراجع',
    rolled_back: 'تم التراجع عنه',
    needs_review: 'يحتاج إلى مراجعة',
  };

  let optionsCache = null;
  let currentRunId = '';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmt(value) {
    if (!value) return '—';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return new Intl.DateTimeFormat('ar-DZ', {
        timeZone: 'Africa/Algiers',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    } catch (e) {
      return String(value);
    }
  }

  function statusLabel(status) {
    return STATUS_LABELS[String(status || '')] || String(status || 'غير معروف');
  }

  function runIdOf(result) {
    if (result && typeof result === 'object') {
      return String(result.testRunId || result.run_id || (result.run && result.run.id) || '');
    }
    return String(result || '');
  }

  function statusClass(status) {
    const map = {
      draft: 'at-status-draft',
      in_progress: 'at-status-progress',
      completed: 'at-status-completed',
      rolled_back: 'at-status-rolled',
      needs_review: 'at-status-review',
    };
    return map[String(status || '')] || 'at-status-draft';
  }

  function toast(message, type) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type || 'info');
      return;
    }
    const box = document.createElement('div');
    box.textContent = message;
    box.style.cssText = 'position:fixed;bottom:24px;left:24px;z-index:99999;padding:12px 18px;border-radius:10px;background:' + (type === 'error' ? '#b91c1c' : '#047857') + ';color:#fff;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.25)';
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 3200);
  }

  async function api(action, payload) {
    const user = window._auth && window._auth.currentUser;
    if (!user) throw new Error('يجب تسجيل الدخول كأدمن أولاً.');
    const idToken = await user.getIdToken();
    const response = await fetch(ADMIN_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + idToken,
      },
      body: JSON.stringify(Object.assign({ action: action }, payload || {})),
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    if (!response.ok) {
      const message = data && (data.error || data.message || data.details) ? (data.error || data.message || data.details) : ('طلب غير ناجح (' + response.status + ')');
      throw new Error(message);
    }
    if (data && typeof data === 'object' && !Array.isArray(data) && data.error) throw new Error(String(data.error));
    if (data && typeof data === 'object' && data.ok === true && Object.prototype.hasOwnProperty.call(data, 'data')) return data.data;
    return data;
  }

  function ensureStyles() {
    if (document.getElementById('at-styles')) return;
    const style = document.createElement('style');
    style.id = 'at-styles';
    style.textContent = `
      #section-attendance-tests{color:var(--text-primary)}
      .at-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap}
      .at-title{font-size:22px;font-weight:800;margin:0 0 6px}
      .at-subtitle{font-size:13px;color:var(--text-muted);line-height:1.7;max-width:820px}
      .at-btn{border:0;border-radius:10px;padding:10px 16px;font-weight:800;font-size:13px;cursor:pointer;background:var(--primary,#2563eb);color:#fff;transition:.18s}
      .at-btn:hover{filter:brightness(1.07);transform:translateY(-1px)}
      .at-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
      .at-btn.secondary{background:rgba(148,163,184,.16);color:var(--text-primary);border:1px solid rgba(148,163,184,.32)}
      .at-btn.danger{background:#b91c1c}
      .at-btn.ghost{background:transparent;color:var(--text-primary);border:1px solid rgba(148,163,184,.3)}
      .at-card{background:var(--card-bg,#fff);border:1px solid var(--border,rgba(148,163,184,.2));border-radius:16px;padding:18px;box-shadow:0 8px 28px rgba(15,23,42,.06)}
      .at-filters{display:grid;grid-template-columns:2fr 1.2fr 1.2fr 1fr 1fr auto;gap:10px;margin-bottom:16px;align-items:end}
      .at-field{display:flex;flex-direction:column;gap:6px}
      .at-field label{font-size:11px;font-weight:800;color:var(--text-muted)}
      .at-input,.at-select{width:100%;box-sizing:border-box;border-radius:10px;border:1px solid var(--border,rgba(148,163,184,.3));background:var(--input-bg,transparent);color:var(--text-primary);padding:9px 11px;font-size:13px;font-family:inherit}
      .at-table-wrap{overflow:auto;border-radius:14px;border:1px solid var(--border,rgba(148,163,184,.2))}
      .at-table{width:100%;border-collapse:collapse;font-size:12px;min-width:1180px}
      .at-table th{position:sticky;top:0;background:var(--th-bg,rgba(148,163,184,.12));padding:11px 10px;text-align:right;white-space:nowrap;font-weight:800;z-index:1}
      .at-table td{padding:11px 10px;border-top:1px solid var(--border,rgba(148,163,184,.16));white-space:nowrap}
      .at-table tr[data-run-id]{cursor:pointer}
      .at-table tr[data-run-id]:hover{background:rgba(37,99,235,.06)}
      .at-status{display:inline-flex;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap}
      .at-status-progress{background:rgba(245,158,11,.16);color:#b45309}
      .at-status-completed{background:rgba(16,185,129,.16);color:#047857}
      .at-status-rolled{background:rgba(100,116,139,.18);color:#475569}
      .at-status-review{background:rgba(239,68,68,.16);color:#b91c1c}
      .at-status-draft{background:rgba(148,163,184,.2);color:#475569}
      .at-empty{padding:34px;text-align:center;color:var(--text-muted);font-size:13px}
      .at-modal-bg{position:fixed;inset:0;z-index:99998;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto}
      .at-modal{width:min(980px,100%);max-height:92vh;overflow:auto;background:var(--card-bg,#fff);color:var(--text-primary);border-radius:18px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.34)}
      .at-modal.small{width:min(560px,100%)}
      .at-modal h3{margin:0 0 4px;font-size:18px}
      .at-modal p{color:var(--text-muted);font-size:12.5px;line-height:1.7;margin:6px 0}
      .at-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:16px}
      .at-close{background:transparent;border:0;font-size:22px;cursor:pointer;color:var(--text-muted)}
      .at-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}
      .at-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
      .at-box{border:1px solid var(--border,rgba(148,163,184,.2));border-radius:12px;padding:11px 12px;background:rgba(148,163,184,.06)}
      .at-box .k{font-size:11px;color:var(--text-muted);margin-bottom:4px}
      .at-box .v{font-size:13px;font-weight:800;line-height:1.5;word-break:break-word}
      .at-section-title{font-size:14px;font-weight:800;margin:18px 0 9px;padding-bottom:7px;border-bottom:1px solid var(--border,rgba(148,163,184,.2))}
      .at-list{display:flex;flex-direction:column;gap:7px;max-height:250px;overflow:auto}
      .at-row{display:flex;justify-content:space-between;gap:10px;padding:9px 11px;border-radius:10px;background:rgba(148,163,184,.08);font-size:12px;line-height:1.6}
      .at-row .muted{color:var(--text-muted);font-size:11px}
      .at-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid var(--border,rgba(148,163,184,.2))}
      .at-note{padding:11px 13px;border-radius:10px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.28);font-size:12px;line-height:1.7;color:var(--text-primary)}
      .at-note.danger{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.3)}
      @media(max-width:900px){.at-filters{grid-template-columns:1fr 1fr}.at-grid,.at-grid.three{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureSection() {
    ensureStyles();
    let section = document.getElementById('section-attendance-tests');
    if (section) return section;
    const body = document.querySelector('.dashboard-body');
    if (!body) return null;
    section = document.createElement('section');
    section.id = 'section-attendance-tests';
    section.style.display = 'none';
    section.innerHTML = `
      <div class="at-head">
        <div>
          <h2 class="at-title">اختبارات الحضور</h2>
          <div class="at-subtitle">اختبارات معزولة تمارس نفس منطق الحضور والغياب والخصم على بيانات اختبار فقط، مع سجل زمني كامل وتراجع آمن لا يؤثر على بيانات التلاميذ الحقيقية.</div>
        </div>
        <button class="at-btn" id="at-new-btn" type="button">+ اختبار حضور جديد</button>
      </div>
      <div class="at-card">
        <div class="at-filters">
          <div class="at-field"><label>بحث</label><input class="at-input" id="at-search" placeholder="رقم الاختبار، الأستاذ، المادة"></div>
          <div class="at-field"><label>المادة</label><input class="at-input" id="at-subject" placeholder="كل المواد"></div>
          <div class="at-field"><label>الحالة</label><select class="at-select" id="at-status"><option value="">كل الحالات</option><option value="in_progress">قيد التنفيذ</option><option value="completed">مكتمل – بانتظار التراجع</option><option value="rolled_back">تم التراجع عنه</option><option value="needs_review">يحتاج إلى مراجعة</option></select></div>
          <div class="at-field"><label>من تاريخ</label><input class="at-input" id="at-from" type="date"></div>
          <div class="at-field"><label>إلى تاريخ</label><input class="at-input" id="at-to" type="date"></div>
          <button class="at-btn secondary" id="at-refresh" type="button">تحديث</button>
        </div>
        <div class="at-table-wrap">
          <table class="at-table">
            <thead><tr><th>رقم الاختبار</th><th>الأستاذ</th><th>المادة</th><th>تاريخ الاختبار</th><th>وقت البداية</th><th>وقت الإغلاق</th><th>وقت التراجع</th><th>عدد الحاضرين</th><th>عدد الغائبين</th><th>إجمالي الخصومات</th><th>الحالة</th></tr></thead>
            <tbody id="at-list-body"><tr><td colspan="11" class="at-empty">جارٍ التحميل...</td></tr></tbody>
          </table>
        </div>
      </div>`;
    body.appendChild(section);

    section.querySelector('#at-new-btn').addEventListener('click', openCreateModal);
    section.querySelector('#at-refresh').addEventListener('click', loadList);
    ['at-search', 'at-subject', 'at-status', 'at-from', 'at-to'].forEach(function (id) {
      section.querySelector('#' + id).addEventListener('change', loadList);
    });
    section.querySelector('#at-search').addEventListener('input', debounce(loadList, 350));
    section.querySelector('#at-list-body').addEventListener('click', function (event) {
      const row = event.target.closest('tr[data-run-id]');
      if (row) openDetailModal(row.getAttribute('data-run-id'));
    });
    return section;
  }

  function debounce(fn, wait) {
    let timer = null;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, wait);
    };
  }

  function ensureNav() {
    if (document.querySelector('.nav-item[data-nav="attendance-tests"]')) return;
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.setAttribute('data-nav', 'attendance-tests');
    item.setAttribute('onclick', "switchNavSection('attendance-tests')");
    item.innerHTML = '<span class="nav-icon">🧪</span><span class="nav-label">اختبارات الحضور</span>';
    nav.appendChild(item);
  }

  function wrapNav() {
    if (window.__atNavWrapped || typeof window.switchNavSection !== 'function') return;
    const original = window.switchNavSection;
    window.switchNavSection = function (section) {
      original(section);
      const el = document.getElementById('section-attendance-tests');
      if (el) el.style.display = section === 'attendance-tests' ? 'block' : 'none';
      const navItem = document.querySelector('.nav-item[data-nav="attendance-tests"]');
      if (navItem) navItem.classList.toggle('active', section === 'attendance-tests');
      if (section === 'attendance-tests') loadList();
    };
    window.__atNavWrapped = true;
  }

  function filterPayload() {
    const section = document.getElementById('section-attendance-tests');
    if (!section) return {};
    return {
      search: section.querySelector('#at-search').value.trim(),
      subject: section.querySelector('#at-subject').value.trim(),
      status: section.querySelector('#at-status').value,
      from: section.querySelector('#at-from').value,
      to: section.querySelector('#at-to').value,
    };
  }

  async function loadList() {
    const tbody = document.getElementById('at-list-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="11" class="at-empty">جارٍ التحميل...</td></tr>';
    try {
      const rows = await api('attendance-test-list', filterPayload());
      const list = Array.isArray(rows) ? rows : [];
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="11" class="at-empty">لا توجد اختبارات حضور مطابقة.</td></tr>';
        return;
      }
      tbody.innerHTML = list.map(function (row) {
        return `<tr data-run-id="${esc(row.test_run_id || row.id || '')}">
          <td>${esc((row.test_run_id || row.id || '').toString().slice(0, 8))}</td>
          <td>${esc(row.teacher_name || '—')}</td>
          <td>${esc(row.subject_name || '—')}</td>
          <td>${esc(fmt(row.created_at))}</td>
          <td>${esc(fmt(row.started_at))}</td>
          <td>${esc(fmt(row.closed_at))}</td>
          <td>${esc(fmt(row.rolled_back_at))}</td>
          <td>${Number(row.present_count || 0)}</td>
          <td>${Number(row.absent_count || 0)}</td>
          <td>${Number(row.deduction_count || 0)}</td>
          <td><span class="at-status ${statusClass(row.status)}">${esc(statusLabel(row.status))}</span></td>
        </tr>`;
      }).join('');
    } catch (error) {
      tbody.innerHTML = '<tr><td colspan="11" class="at-empty">تعذر تحميل الاختبارات: ' + esc(error.message) + '</td></tr>';
    }
  }

  async function getOptions() {
    if (optionsCache) return optionsCache;
    if (!window.SubjectService || typeof window.SubjectService.buildAllTeacherSubjectOptions !== 'function') {
      throw new Error('خدمة المواد غير متاحة.');
    }
    const all = await window.SubjectService.buildAllTeacherSubjectOptions();
    const teachers = new Map();
    all.forEach(function (option) {
      const key = String(option.teacherId || option.teacherName || '');
      if (!key || teachers.has(key)) return;
      teachers.set(key, { teacherId: option.teacherId || '', teacherName: option.teacherName || option.teacher || '' });
    });
    optionsCache = { all: all, teachers: Array.from(teachers.values()) };
    return optionsCache;
  }

  function openModal(html, small) {
    const bg = document.createElement('div');
    bg.className = 'at-modal-bg';
    bg.innerHTML = '<div class="at-modal' + (small ? ' small' : '') + '">' + html + '</div>';
    function close() { bg.remove(); }
    bg.addEventListener('click', function (event) { if (event.target === bg) close(); });
    bg.querySelectorAll('[data-close]').forEach(function (btn) { btn.addEventListener('click', close); });
    document.body.appendChild(bg);
    return { root: bg, close: close };
  }

  async function openCreateModal() {
    try {
      const options = await getOptions();
      if (!options.teachers.length) throw new Error('لا توجد مواد وأساتذة متاحة لإنشاء اختبار.');
      const modal = openModal(`
        <div class="at-modal-head">
          <div><h3>بدء اختبار حضور جديد</h3><p>يتم استخدام الأستاذ والمادة من بيانات النظام الفعلية، بينما تُسجَّل كل التغييرات على تلاميذ اختبار معزولين فقط.</p></div>
          <button class="at-close" data-close type="button">×</button>
        </div>
        <div class="at-grid">
          <div class="at-field"><label>الأستاذ</label><select class="at-select" id="at-create-teacher"><option value="">اختر الأستاذ</option>${options.teachers.map(function (t) { return `<option value="${esc(t.teacherId || t.teacherName)}">${esc(t.teacherName)}</option>`; }).join('')}</select></div>
          <div class="at-field"><label>المادة المرتبطة بالأستاذ</label><select class="at-select" id="at-create-subject"><option value="">اختر الأستاذ أولاً</option></select></div>
        </div>
        <div class="at-note">لن تظهر بيانات الاختبار في كشوف الحضور أو التقارير العادية. بعد بدء الاختبار افتح صفحة الحضور واستخدم الجلسة الموسومة بـ «اختبار».</div>
        <div class="at-actions"><button class="at-btn" id="at-create-start" type="button" disabled>بدء الاختبار</button><button class="at-btn ghost" data-close type="button">إلغاء</button></div>
      `);
      const teacherSelect = modal.root.querySelector('#at-create-teacher');
      const subjectSelect = modal.root.querySelector('#at-create-subject');
      const startBtn = modal.root.querySelector('#at-create-start');
      teacherSelect.addEventListener('change', function () {
        const selected = String(teacherSelect.value || '');
        const subjects = options.all.filter(function (o) { return String(o.teacherId || o.teacherName) === selected; });
        subjectSelect.innerHTML = '<option value="">اختر المادة</option>' + subjects.map(function (o, index) { return `<option value="${index}">${esc(o.subject || o.label)}</option>`; }).join('');
        startBtn.disabled = !selected;
      });
      startBtn.addEventListener('click', async function () {
        const selectedTeacher = String(teacherSelect.value || '');
        const subjectIndex = Number(subjectSelect.value);
        const subjectOption = options.all.filter(function (o) { return String(o.teacherId || o.teacherName) === selectedTeacher; })[subjectIndex];
        if (!selectedTeacher || !subjectOption) { toast('اختر الأستاذ والمادة.', 'error'); return; }
        startBtn.disabled = true;
        startBtn.textContent = 'جارٍ بدء الاختبار...';
        try {
          const created = await api('attendance-test-create', {
            teacherId: subjectOption.teacherId || '',
            teacherName: subjectOption.teacherName || subjectOption.teacher || '',
            subjectId: subjectOption.subjectId || '',
            subjectName: subjectOption.subject || '',
          });
          const runId = runIdOf(created);
          if (!runId) throw new Error('تعذر إنشاء الاختبار.');
          await api('attendance-test-start', { testRunId: runId });
          modal.close();
          toast('تم بدء اختبار الحضور.', 'success');
          await loadList();
          openDetailModal(runId);
        } catch (error) {
          toast(error.message, 'error');
          startBtn.disabled = false;
          startBtn.textContent = 'بدء الاختبار';
        }
      });
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function openDetailModal(testRunId) {
    currentRunId = String(testRunId || '');
    const modal = openModal('<div class="at-modal-head"><div><h3>تفاصيل اختبار الحضور</h3><p>جارٍ التحميل...</p></div><button class="at-close" data-close type="button">×</button></div>');
    try {
      const detail = await api('attendance-test-detail', { testRunId: currentRunId });
      const run = detail && detail.run ? detail.run : {};
      const summary = detail && detail.summary ? detail.summary : {};
      const events = Array.isArray(detail && detail.events) ? detail.events : Array.isArray(detail && detail.timeline) ? detail.timeline : [];
      const present = Array.isArray(detail && detail.present) ? detail.present : Array.isArray(detail && detail.presentStudents) ? detail.presentStudents : [];
      const absent = Array.isArray(detail && detail.absent) ? detail.absent : Array.isArray(detail && detail.absentStudents) ? detail.absentStudents : [];
      const operations = Array.isArray(detail && detail.operations) ? detail.operations : detail && detail.rollback && Array.isArray(detail.rollback.operations) ? detail.rollback.operations : [];
      const status = String(run.status || '');
      const canRollback = status === 'completed';
      const blockedConflicts = detail && detail.rollbackBlocked && Array.isArray(detail.rollbackBlocked.conflicts) ? detail.rollbackBlocked.conflicts : [];
      const conflicts = operations.filter(function (op) { return op && op.conflict === true; }).concat(blockedConflicts);
      const rollbackOps = operations.filter(function (op) { return op && (op.reversed_at || op.rolledBack === true); });

      modal.root.querySelector('.at-modal').innerHTML = `
        <div class="at-modal-head">
          <div><h3>تفاصيل اختبار الحضور</h3><p>رقم الاختبار: ${esc(currentRunId.slice(0, 8))} — آخر تحديث: ${esc(fmt(run.updated_at))}</p></div>
          <button class="at-close" data-close type="button">×</button>
        </div>
        <div class="at-grid three">
          <div class="at-box"><div class="k">الأستاذ</div><div class="v">${esc(run.teacher_name || '—')}</div></div>
          <div class="at-box"><div class="k">المادة</div><div class="v">${esc(run.subject_name || '—')}</div></div>
          <div class="at-box"><div class="k">الحالة</div><div class="v"><span class="at-status ${statusClass(status)}">${esc(statusLabel(status))}</span></div></div>
          <div class="at-box"><div class="k">تاريخ الاختبار</div><div class="v">${esc(fmt(run.created_at))}</div></div>
          <div class="at-box"><div class="k">وقت البداية</div><div class="v">${esc(fmt(run.started_at || run.session_opened_at))}</div></div>
          <div class="at-box"><div class="k">وقت الإغلاق</div><div class="v">${esc(fmt(run.closed_at))}</div></div>
          <div class="at-box"><div class="k">وقت التراجع</div><div class="v">${esc(fmt(run.rolled_back_at))}</div></div>
          <div class="at-box"><div class="k">عدد الحاضرين</div><div class="v">${Number(summary.present_count || summary.present || run.present_count || 0)}</div></div>
          <div class="at-box"><div class="k">عدد الغائبين</div><div class="v">${Number(summary.absent_count || summary.absent || run.absent_count || 0)}</div></div>
        </div>

        ${status === 'needs_review' ? '<div class="at-note danger">هذا الاختبار يحتاج إلى مراجعة: وُجدت تغييرات لاحقة على بياناته بعد التنفيذ، لذلك لم يتم تعديل أي سجل تلقائياً.</div>' : ''}
        ${conflicts.length ? '<div class="at-section-title">تعذرات التراجع</div><div class="at-list">' + conflicts.map(function (op) { return `<div class="at-row"><span>${esc(op.entityId || op.entity_id || op.operation_type || op.event_type || 'عملية')}</span><span class="muted">${esc(op.conflict_reason || op.reason || (op.current && op.expected ? 'القيمة الحالية لا تطابق اللقطة' : 'تغيير لاحق'))}</span></div>`; }).join('') + '</div>' : ''}

        <div class="at-section-title">الملخص</div>
        <div class="at-grid three">
          <div class="at-box"><div class="k">إجمالي الخصومات</div><div class="v">${Number(summary.deduction_count || summary.deducted || 0)}</div></div>
          <div class="at-box"><div class="k">عمليات التراجع المنفذة</div><div class="v">${Number(summary.rolledBack || rollbackOps.length || 0)}</div></div>
          <div class="at-box"><div class="k">الأحداث المسجلة</div><div class="v">${Number(summary.operationCount || events.length)}</div></div>
        </div>

        <div class="at-section-title">الحاضرون</div>
        <div class="at-list">${present.length ? present.map(renderPerson).join('') : '<div class="at-empty">لا يوجد حاضرون.</div>'}</div>

        <div class="at-section-title">الغائبون وأسباب الخصم</div>
        <div class="at-list">${absent.length ? absent.map(renderPerson).join('') : '<div class="at-empty">لا يوجد غائبون.</div>'}</div>

        <div class="at-section-title">السجل الزمني الكامل</div>
        <div class="at-list">${events.length ? events.map(function (event) { const details = event.details || event.metadata || {}; return `<div class="at-row"><span>${esc(fmt(event.created_at || event.at || event.eventAt))} — ${esc(event.event_type || event.event || event.eventType || 'حدث')}</span><span class="muted">${esc(event.description || event.reason || (typeof details === 'object' ? JSON.stringify(details) : details))}</span></div>`; }).join('') : '<div class="at-empty">لا توجد أحداث.</div>'}</div>

        <div class="at-actions">
          ${status === 'in_progress' ? '<button class="at-btn secondary" id="at-continue" type="button">متابعة الاختبار في صفحة الحضور</button>' : ''}
          ${canRollback ? '<button class="at-btn" id="at-rollback" type="button">التراجع الكامل عن الاختبار</button>' : ''}
          <button class="at-btn ghost" data-close type="button">إغلاق</button>
        </div>`;

      const continueBtn = modal.root.querySelector('#at-continue');
      if (continueBtn) continueBtn.addEventListener('click', function () { window.open('attendance.html', '_blank'); });
      const rollbackBtn = modal.root.querySelector('#at-rollback');
      if (rollbackBtn) rollbackBtn.addEventListener('click', function () { openRollbackModal(currentRunId, modal); });
      modal.root.querySelectorAll('[data-close]').forEach(function (btn) { btn.addEventListener('click', modal.close); });
    } catch (error) {
      modal.root.querySelector('.at-modal').innerHTML = '<div class="at-modal-head"><div><h3>تفاصيل اختبار الحضور</h3><p style="color:#b91c1c">' + esc(error.message) + '</p></div><button class="at-close" data-close type="button">×</button></div>';
      modal.root.querySelectorAll('[data-close]').forEach(function (btn) { btn.addEventListener('click', modal.close); });
    }
  }

  function renderPerson(person) {
    const item = person || {};
    const right = [item.student_name || item.studentName || item.name || 'تلميذ', item.student_id || item.studentId || ''].filter(Boolean).join(' — ');
    const balance = item.beforeSessions == null ? '' : 'الرصيد ' + item.beforeSessions + ' ← ' + (item.afterSessions == null ? '—' : item.afterSessions);
    const left = [item.reason || item.attendance_status || item.status || item.action || '', balance, item.subscription_id || item.subscriptionId || '', fmt(item.created_at || item.checked_at || item.checkInTime || item.eventAt)].filter(function (v) { return v && v !== '—'; }).join(' · ');
    return '<div class="at-row"><span>' + esc(right) + '</span><span class="muted">' + esc(left) + '</span></div>';
  }

  function openRollbackModal(testRunId, parentModal) {
    const modal = openModal(`
      <div class="at-modal-head"><div><h3>تأكيد التراجع الكامل</h3><p>سيتم إلغاء كل تغييرات هذا الاختبار فقط، وإعادة الأرصدة إلى ما كانت عليه قبل الاختبار، مع الاحتفاظ بالسجل الزمني.</p></div><button class="at-close" data-close type="button">×</button></div>
      <div class="at-note danger">لن يتم التراجع إلا إذا كانت بيانات الاختبار لم تتغير بعد إغلاقه. إذا وُجد تعارض، سيُوقف التراجع ويُعرض الاختبار للمراجعة دون تعديل أي سجل.</div>
      <div class="at-actions"><button class="at-btn danger" id="at-rollback-confirm" type="button">تأكيد التراجع</button><button class="at-btn ghost" data-close type="button">إلغاء</button></div>
    `, true);
    modal.root.querySelector('#at-rollback-confirm').addEventListener('click', async function (event) {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'جارٍ التراجع...';
      try {
        const result = await api('attendance-test-rollback', { testRunId: testRunId });
        modal.close();
        toast(result && result.status === 'needs_review' ? 'تعذر التراجع الآلي؛ الاختبار يحتاج إلى مراجعة.' : 'تم التراجع عن الاختبار بنجاح.', result && result.status === 'needs_review' ? 'error' : 'success');
        parentModal.close();
        await loadList();
        openDetailModal(testRunId);
      } catch (error) {
        toast(error.message, 'error');
        button.disabled = false;
        button.textContent = 'تأكيد التراجع';
      }
    });
  }

  window.AttendanceTests = {
    open: function () {
      ensureNav();
      ensureSection();
      wrapNav();
      if (typeof window.switchNavSection === 'function') window.switchNavSection('attendance-tests');
    },
    loadList: loadList,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    ensureNav();
    ensureSection();
    wrapNav();
    if (window._curSection === 'attendance-tests') loadList();
  }
})();
