/* ═══════════════════════════════════════════════════════════
   js/ep-ui.js — E-PLUS custom dialogs (alert / confirm / prompt / toast)
   Replaces native alert()/confirm()/prompt() everywhere.
   Self-contained: builds its own DOM, no page markup required.
   ═══════════════════════════════════════════════════════════ */
window.EPUI = (function () {
  let uid = 0;

  function baseStyles(el) {
    Object.assign(el.style, {
      position: 'fixed', inset: '0', zIndex: '99999',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    });
  }

  function box() {
    const b = document.createElement('div');
    Object.assign(b.style, {
      background: '#0d1520', border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: '20px', maxWidth: '430px', width: '100%',
      padding: '26px 24px', textAlign: 'center',
      boxShadow: '0 30px 80px rgba(0,0,0,0.6)', fontFamily: "'Tajawal', sans-serif",
      animation: 'epUIPop .25s ease',
    });
    const st = document.createElement('style');
    st.textContent = '@keyframes epUIPop{from{transform:scale(.92) translateY(14px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}';
    b.appendChild(st);
    return b;
  }

  function titleEl(text, icon) {
    const t = document.createElement('div');
    Object.assign(t.style, {
      fontWeight: '800', fontSize: '18px', color: '#fff',
      marginBottom: '12px', lineHeight: '1.5',
    });
    t.textContent = (icon ? icon + '  ' : '') + text;
    return t;
  }

  function descEl(html) {
    const d = document.createElement('div');
    Object.assign(d.style, {
      color: 'rgba(255,255,255,0.72)', fontSize: '14px',
      lineHeight: '1.8', marginBottom: '20px', whiteSpace: 'pre-line',
      direction: 'rtl', textAlign: 'center',
    });
    d.innerHTML = html;
    return d;
  }

  function btn(label, variant, primary) {
    const b = document.createElement('button');
    const palette = {
      primary: { bg: '#f8b62d', color: '#0d1520' },
      danger: { bg: '#e5484d', color: '#fff' },
      ghost: { bg: 'rgba(255,255,255,0.08)', color: '#fff' },
      success: { bg: '#10b981', color: '#fff' },
    };
    const p = palette[variant] || palette.primary;
    Object.assign(b.style, {
      background: p.bg, color: p.color, border: 'none',
      borderRadius: '12px', padding: '10px 26px', minWidth: '110px',
      fontSize: '14px', fontWeight: '700', cursor: 'pointer',
      transition: 'transform .15s, opacity .15s', fontFamily: 'inherit',
      boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
    });
    b.textContent = label;
    b.onmouseenter = () => (b.style.transform = 'translateY(-1px)');
    b.onmouseleave = () => (b.style.transform = 'none');
    return b;
  }

  function mount(overlay) {
    document.body.appendChild(overlay);
  }

  function toast(message, type) {
    const colors = { success: '#10b981', error: '#e5484d', warn: '#f59e0b', info: '#38bdf8' };
    const c = colors[type] || colors.success;
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed', bottom: '24px', right: '50%',
      transform: 'translateX(50%)', background: '#0d1520',
      border: '1px solid ' + c, color: '#fff',
      padding: '12px 22px', borderRadius: '12px', fontSize: '13px',
      fontWeight: '700', zIndex: '999999',
      boxShadow: '0 10px 34px rgba(0,0,0,0.5)',
      fontFamily: "'Tajawal', sans-serif", maxWidth: '90vw',
    });
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 2600);
  }

  function alert(message, title) {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      baseStyles(ov);
      const b = box();
      b.appendChild(titleEl(title || 'تنبيه', '🔔'));
      b.appendChild(descEl(message));
      const ok = btn('حسناً', 'primary');
      b.appendChild(ok);
      ov.appendChild(b);
      function done() { ov.remove(); resolve(); }
      ok.onclick = done;
      ov.addEventListener('click', e => { if (e.target === ov) done(); });
      mount(ov);
      ok.focus();
    });
  }

  function confirm(message, title, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const ov = document.createElement('div');
      baseStyles(ov);
      const b = box();
      b.appendChild(titleEl(title || 'تأكيد', opts.icon || '⚠️'));
      b.appendChild(descEl(message));
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '10px';
      row.style.justifyContent = 'center';
      row.style.flexWrap = 'wrap';
      const cancel = btn(opts.cancelText || 'إلغاء', 'ghost');
      const ok = btn(opts.confirmText || 'تأكيد', opts.danger ? 'danger' : 'primary');
      cancel.onclick = () => { ov.remove(); resolve(false); };
      ok.onclick = () => { ov.remove(); resolve(true); };
      row.appendChild(cancel);
      row.appendChild(ok);
      b.appendChild(row);
      ov.appendChild(b);
      mount(ov);
      cancel.focus();
    });
  }

  function prompt(label, initial, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const ov = document.createElement('div');
      baseStyles(ov);
      const b = box();
      b.appendChild(titleEl(opts.title || 'إدخال', '✏️'));
      const d = descEl(label);
      d.style.marginBottom = '10px';
      b.appendChild(d);
      const input = document.createElement('input');
      Object.assign(input.style, {
        width: '100%', padding: '11px 14px', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'rgba(255,255,255,0.06)', color: '#fff',
        fontSize: '15px', marginBottom: '18px', fontFamily: 'inherit',
        textAlign: 'right', boxSizing: 'border-box', outline: 'none',
      });
      input.value = initial || '';
      b.appendChild(input);
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '10px';
      row.style.justifyContent = 'center';
      const cancel = btn('إلغاء', 'ghost');
      const ok = btn('حفظ', 'primary');
      cancel.onclick = () => { ov.remove(); resolve(null); };
      ok.onclick = () => { ov.remove(); resolve(input.value.trim()); };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') ok.onclick(); if (e.key === 'Escape') cancel.onclick(); });
      row.appendChild(cancel);
      row.appendChild(ok);
      b.appendChild(row);
      ov.appendChild(b);
      mount(ov);
      input.focus();
    });
  }

  function form(fields, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const ov = document.createElement('div');
      baseStyles(ov);
      const b = box();
      b.style.maxWidth = '460px';
      b.appendChild(titleEl(opts.title || 'تحرير', '✏️'));
      const body = document.createElement('div');
      body.style.marginBottom = '18px';
      const inputs = {};
      (fields || []).forEach(f => {
        const lab = document.createElement('label');
        Object.assign(lab.style, {
          display: 'block', textAlign: 'right', color: 'rgba(255,255,255,0.75)',
          fontSize: '12.5px', fontWeight: '700', margin: '10px 0 5px',
        });
        lab.textContent = f.label;
        const input = document.createElement('input');
        Object.assign(input.style, {
          width: '100%', padding: '10px 13px', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.18)',
          background: 'rgba(255,255,255,0.06)', color: '#fff',
          fontSize: '14px', fontFamily: 'inherit', textAlign: 'right',
          boxSizing: 'border-box', outline: 'none',
        });
        input.value = f.value || '';
        inputs[f.name] = input;
        body.appendChild(lab);
        body.appendChild(input);
      });
      b.appendChild(body);
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '10px';
      row.style.justifyContent = 'center';
      const cancel = btn('إلغاء', 'ghost');
      const ok = btn(opts.confirmText || 'حفظ', 'primary');
      const out = {};
      cancel.onclick = () => { ov.remove(); resolve(null); };
      ok.onclick = () => {
        (fields || []).forEach(f => { out[f.name] = inputs[f.name].value.trim(); });
        ov.remove();
        resolve(out);
      };
      (fields || []).forEach(f => inputs[f.name].addEventListener('keydown', e => {
        if (e.key === 'Enter') ok.onclick();
        if (e.key === 'Escape') cancel.onclick();
      }));
      row.appendChild(cancel);
      row.appendChild(ok);
      b.appendChild(row);
      ov.appendChild(b);
      mount(ov);
      const first = fields && fields[0] && inputs[fields[0].name];
      if (first) first.focus();
    });
  }

  return { toast, alert, confirm, prompt, form, _uid: () => ++uid };
})();
