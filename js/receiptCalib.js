(function () {
  'use strict';
  var W_MM = 50;
  var STORE_KEY = 'eplus-receipt-calib-v1';
  var CENTRAL_TABLE = 'calibration_settings';
  var CENTRAL_ROW = 'receipt-thermal';

  var PX_PER_MM = 3.779527559055;

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function fmtNum(v) { return Math.round(num(v) * 100) / 100; }
  function clone(x) {
    try { return JSON.parse(JSON.stringify(x)); } catch (e) { return null; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toDigits(s, mode) {
    s = String(s == null ? '' : s);
    if (mode === 'ar') {
      var map = { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' };
      return s.replace(/[0-9]/g, function (d) { return map[d]; });
    }
    return s;
  }

  function defaultBlocks() {
    return [
      { key: 'logo', type: 'logo', hide: false, spacingTop: 0, },
      { key: 'centerName', type: 'title', hide: false, fs: 3.6, bold: true, align: 'center', indent: 0, spacingTop: 1, lh: 1.3 },
      { key: 'receiptTitle', type: 'title', hide: false, fs: 2.9, bold: true, align: 'center', indent: 0, spacingTop: 0.5, lh: 1.3 },
      { key: 'div1', type: 'divider', hide: false, thick: 0.5, dash: false, spacingTop: 1 },
      { key: 'orderId', type: 'text', label: 'رقم الوصل', hide: false, fs: 2.4, valueBold: true, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'studentName', type: 'text', label: 'التلميذ', hide: false, fs: 2.9, valueBold: true, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'studentId', type: 'text', label: 'رقم التسجيل', hide: false, fs: 2.4, valueBold: true, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'studentLevel', type: 'text', label: 'المستوى', hide: false, fs: 2.4, valueBold: false, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'parentName', type: 'text', label: 'ولي الأمر', hide: false, fs: 2.4, valueBold: false, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'parentPhone', type: 'text', label: 'هاتف ولي الأمر', hide: false, fs: 2.4, valueBold: false, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'div2', type: 'divider', hide: false, thick: 0.2, dash: true, spacingTop: 1 },
      { key: 'subject', type: 'text', label: 'المادة', hide: false, fs: 2.4, valueBold: true, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'teacher', type: 'text', label: 'الأستاذ', hide: false, fs: 2.4, valueBold: true, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'months', type: 'text', label: 'المدة', hide: false, fs: 2.4, valueBold: false, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'sessions', type: 'text', label: 'الحصص', hide: false, fs: 2.4, valueBold: false, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'period', type: 'text', label: 'الفترة', hide: false, fs: 2.4, valueBold: false, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'status', type: 'text', label: 'الحالة', hide: false, fs: 2.4, valueBold: false, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'div3', type: 'divider', hide: false, thick: 0.5, dash: false, spacingTop: 1 },
      { key: 'table', type: 'table', hide: false, fs: 2.3, spacingTop: 0.5 },
      { key: 'div4', type: 'divider', hide: false, thick: 0.2, dash: true, spacingTop: 1 },
      { key: 'amount', type: 'text', label: 'المبلغ', hide: false, fs: 3.8, valueBold: true, align: 'center', indent: 0, spacingTop: 1.4, lh: 1.2, showLabel: false },
      { key: 'amountWords', type: 'text', label: '', hide: false, fs: 2.2, valueBold: false, align: 'center', indent: 0, spacingTop: 0.3, lh: 1.6, showLabel: false },
      { key: 'date', type: 'text', label: 'تاريخ الإصدار', hide: false, fs: 2.4, valueBold: false, align: 'right', indent: 0, spacingTop: 1, lh: 1.5, showLabel: true },
      { key: 'div5', type: 'divider', hide: false, thick: 0.5, dash: false, spacingTop: 1.2 },
      { key: 'barcode', type: 'barcode', hide: false, spacingTop: 1 },
      { key: 'signature', type: 'signature', hide: false, fs: 2.2, spacingTop: 2 },
      { key: 'footer', type: 'footer', hide: false, fs: 2.1, spacingTop: 1.3, lh: 1.6 }
    ];
  }

  var BLOCK_NAMES = {
    logo: 'الشعار', centerName: 'اسم المركز', receiptTitle: 'عنوان الوصل',
    div1: 'فاصل علوي', orderId: 'رقم الوصل', studentName: 'التلميذ', studentId: 'رقم التسجيل',
    studentLevel: 'المستوى', parentName: 'ولي الأمر', parentPhone: 'هاتف ولي الأمر',
    div2: 'فاصل', subject: 'المادة', teacher: 'الأستاذ', months: 'المدة', sessions: 'الحصص',
    period: 'الفترة', status: 'الحالة', div3: 'فاصل',
    table: 'جدول الأشهر', div4: 'فاصل', amount: 'المبلغ', amountWords: 'المبلغ كتابةً',
    date: 'تاريخ الإصدار', div5: 'فاصل', barcode: 'الباركود', signature: 'التوقيع', footer: 'التذييل'
  };

  function defaultTemplate() {
    return {
      v: 1,
      widthMm: W_MM,
      paddingMm: 2,
      fontFamily: "Tajawal, 'Segoe UI', Arial, sans-serif",
      digits: 'western',
      centerName: 'مركز E-PLUS التعليمي',
      receiptTitle: 'وصل دفع اشتراك شهري',
      footerText: 'شكراً لثقتكم بالمركز التعليمي — هذا الوصل إلكتروني رسمي',
      adminLabel: 'الإدارة',
      adminEmail: '',
      logo: { show: true, src: 'schoollogo/schoollogoblack.PNG', w: 30, align: 'center' },
      moneyWordsShow: true,
      periodsShow: true,
      signatureShow: true,
      barcodeShow: false,
      barcodeContent: 'orderId',
      blocks: defaultBlocks()
    };
  }

  function normalize(tpl) {
    var def = defaultTemplate();
    var out = clone(def);
    if (!tpl || typeof tpl !== 'object') return out;
    ['widthMm', 'paddingMm', 'digits', 'centerName', 'receiptTitle', 'footerText', 'adminLabel', 'adminEmail', 'moneyWordsShow', 'periodsShow', 'signatureShow', 'barcodeShow', 'barcodeContent'].forEach(function (k) {
      if (tpl[k] !== undefined) out[k] = tpl[k];
    });
    if (tpl.fontFamily && typeof tpl.fontFamily === 'string') out.fontFamily = tpl.fontFamily;
    if (tpl.logo && typeof tpl.logo === 'object') out.logo = Object.assign({}, out.logo, tpl.logo);
    var byKey = {};
    def.blocks.forEach(function (b) { byKey[b.key] = b; });
    var saved = Array.isArray(tpl.blocks) ? tpl.blocks : [];
    var keysSeen = {};
    var merged = [];
    saved.forEach(function (b) {
      if (!b || !b.key) return;
      var base = byKey[b.key];
      if (!base) return;
      keysSeen[b.key] = true;
      merged.push(Object.assign({}, base, b));
    });
    def.blocks.forEach(function (b) {
      if (!keysSeen[b.key]) merged.push(clone(b));
    });
    out.blocks = merged;
    out.widthMm = num(out.widthMm) || W_MM;
    return out;
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? normalize(JSON.parse(raw)) : defaultTemplate();
    } catch (e) { return defaultTemplate(); }
  }
  function saveLocal(tpl) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(tpl)); } catch (e) {}
  }

  var _ep = null;
  function endpoint() {
    if (_ep) return _ep;
    var u = null, k = null;
    try {
      if (typeof SR_SUPABASE_URL !== 'undefined' && SR_SUPABASE_URL) u = SR_SUPABASE_URL;
      else if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) u = SUPABASE_URL;
      if (typeof SR_ANON_KEY !== 'undefined' && SR_ANON_KEY) k = SR_ANON_KEY;
      else if (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) k = SUPABASE_ANON_KEY;
    } catch (e) {}
    if (!u || !k) return null;
    _ep = { url: String(u).replace(/\/+$/, ''), key: k };
    return _ep;
  }
  function fetchC(method, url, body) {
    var ep = endpoint();
    if (!ep) return Promise.reject(new Error('no central endpoint'));
    var headers = { 'Content-Type': 'application/json', apikey: ep.key, Authorization: 'Bearer ' + ep.key };
    if (method === 'POST' || method === 'PATCH') headers.Prefer = 'resolution=merge-duplicates';
    var opts = { method: method, headers: headers };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(url, opts);
  }
  function loadCentral() {
    var ep = endpoint();
    if (!ep) return Promise.resolve(null);
    var q = CENTRAL_TABLE + '?id=eq.' + CENTRAL_ROW + '&select=id,calibration,updated_at';
    return fetchC('GET', ep.url + '/rest/v1/' + q)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (rows) {
        var doc = rows && rows.length ? rows[0] : null;
        var tpl = doc && doc.calibration && doc.calibration.receipt ? doc.calibration.receipt : null;
        return tpl ? normalize(tpl) : null;
      })
      .catch(function () { return null; });
  }
  function saveCentral(tpl) {
    var t = normalize(tpl);
    saveLocal(t);
    var ep = endpoint();
    if (!ep) return Promise.resolve(false);
    var payload = { id: CENTRAL_ROW, calibration: { receipt: t }, updated_at: new Date().toISOString() };
    var url = ep.url + '/rest/v1/' + CENTRAL_TABLE + '?id=eq.' + CENTRAL_ROW;
    return fetchC('POST', url, payload).then(function (r) { return r.ok; }).catch(function () { return false; });
  }
  function getTemplate() {
    return loadCentral().then(function (t) { return t || loadLocal(); }).catch(function () { return loadLocal(); });
  }
  function centralReady() { return !!endpoint(); }

  function sTop(b) { return 'margin-top:calc(var(--s)*' + fmtNum(b.spacingTop) + 'mm);'; }
  function fs(b) { return b.fs != null ? 'font-size:calc(var(--s)*' + fmtNum(b.fs) + 'mm);' : ''; }
  function ind(b) {
    if (b.align === 'left') return num(b.indent) ? 'padding-left:calc(var(--s)*' + fmtNum(b.indent) + 'mm);' : '';
    return num(b.indent) ? 'padding-right:calc(var(--s)*' + fmtNum(b.indent) + 'mm);' : '';
  }

  function renderReceiptHTML(tpl, rec, opts) {
    opts = opts || {};
    var t = normalize(tpl);
    rec = rec || {};
    var html = '';
    t.blocks.forEach(function (b) {
      if (b.hide) return;
      if (b.type === 'logo') {
        if (!t.logo.show || !t.logo.src) return;
        html += '<div data-rb="logo" class="rb rb-logo" style="text-align:' + (t.logo.align || 'center') + ';' + sTop(b) + '">' +
          '<img class="rb-logo-img" src="' + esc(t.logo.src || '') + '" alt="" style="width:calc(var(--s)*' + fmtNum(t.logo.w) + 'mm)"></div>';
        return;
      }
      if (b.type === 'divider') {
        html += '<div data-rb="' + b.key + '" class="rb rb-div" style="' + sTop(b) + 'border-top:' + fmtNum(b.thick) + 'mm ' + (b.dash ? 'dashed' : 'solid') + ' #000"></div>';
        return;
      }
      if (b.type === 'table') {
        if (!t.periodsShow || !rec.table || !rec.table.length) return;
        var rows = rec.table.map(function (r) {
          return '<tr><td>' + esc(toDigits(r[0], t.digits)) + '</td><td>' + esc(toDigits(r[1], t.digits)) + '</td><td>' + esc(toDigits(r[2], t.digits)) + '</td></tr>';
        }).join('');
        html += '<div data-rb="' + b.key + '" class="rb rb-table" style="' + fs(b) + ';' + sTop(b) + '">' +
          '<table><thead><tr><th>الشهر</th><th>الفترة</th><th>الحصص</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
        return;
      }
      if (b.type === 'barcode') {
        if (!t.barcodeShow) return;
        var bcTxt = t.barcodeContent === 'studentId' ? (rec.studentId || '') : (rec.orderId || '');
        if (!bcTxt) return;
        html += '<div data-rb="' + b.key + '" class="rb rb-bc" style="' + sTop(b) + '"><svg id="rc-barcode-svg" data-bc="' + esc(bcTxt) + '"></svg></div>';
        return;
      }
      if (b.type === 'signature') {
        if (!t.signatureShow) return;
        html += '<div data-rb="' + b.key + '" class="rb rb-sig" style="' + fs(b) + ';' + sTop(b) + '">' +
          (t.logo && t.logo.show && t.logo.src ? '<img class="rb-sig-logo" src="' + esc(t.logo.src) + '" alt="" style="width:calc(var(--s)*' + Math.min(12, fmtNum(t.logo.w)) + 'mm)">' : '') +
          '<span class="rb-sig-lbl">' + esc(t.adminLabel || 'الإدارة') + (rec.adminEmail ? '<span class="rb-sig-mail">' + esc(rec.adminEmail) + '</span>' : '') + '</span>' +
          '<span class="rb-sig-ln"></span>' +
          '</div>';
        return;
      }
      if (b.type === 'footer') {
        html += '<div data-rb="' + b.key + '" class="rb rb-footer" style="' + fs(b) + ';' + sTop(b) + '">' + esc(rec.footerText != null ? rec.footerText : t.footerText) + '</div>';
        return;
      }
      var isTitle = b.type === 'title';
      var value = rec[b.key] != null ? String(rec[b.key]) : '';
      if (b.key === 'amount' && value === '') value = '0';
      if (isTitle) {
        if (!value) return;
        var stT = fs(b) + ';' + sTop(b) + ';line-height:' + (b.lh || 1.3) + ';text-align:' + (b.align || 'center') + ';' + ind(b);
        html += '<div data-rb="' + b.key + '" class="rb rb-info rb-title" style="' + stT + '">' +
          '<span class="rb-val" style="font-weight:' + (b.bold ? '900' : '400') + '">' + esc(value) + '</span></div>';
        return;
      }
      if (b.key === 'amount') {
        html += '<div data-rb="' + b.key + '" class="rb rb-info rb-amount" style="' + fs(b) + ';' + sTop(b) + ';line-height:' + (b.lh || 1.2) + ';text-align:' + (b.align || 'center') + ';' + ind(b) + '">' +
          (b.showLabel ? '<span class="rb-lbl">' + esc(b.label) + ': </span>' : '') +
          '<span class="rb-val" style="font-weight:' + (b.valueBold ? '900' : '400') + '">' + toDigits(value, t.digits) + ' <span class="rb-cur" style="font-size:0.55em">دج</span></span></div>';
        return;
      }
      if (b.key === 'amountWords') {
        if (!t.moneyWordsShow || !value) return;
        html += '<div data-rb="' + b.key + '" class="rb rb-info rb-words" style="' + fs(b) + ';' + sTop(b) + ';line-height:' + (b.lh || 1.6) + ';text-align:' + (b.align || 'center') + ';' + ind(b) + '">' +
          '<span class="rb-val">' + esc(value) + '</span></div>';
        return;
      }
      if (!value) return;
      var st = fs(b) + ';' + sTop(b) + ';line-height:' + (b.lh || 1.5) + ';text-align:' + (b.align || 'right') + ';' + ind(b);
      var lbl = (b.showLabel && b.label) ? '<span class="rb-lbl">' + esc(b.label) + ': </span>' : '';
      html += '<div data-rb="' + b.key + '" class="rb rb-info" style="' + st + '">' + lbl +
        '<span class="rb-val" style="font-weight:' + (b.valueBold ? '900' : '400') + '">' + toDigits(value, t.digits) + '</span></div>';
    });
    return '<div class="receipt" dir="rtl" style="--s:' + (opts.scale || 1) + '">' + html + '</div>';
  }

  function receiptCSS(tpl) {
    var t = normalize(tpl);
    return '' +
      '.receipt{direction:rtl;width:calc(var(--s)*' + t.widthMm + 'mm);box-sizing:border-box;padding:calc(var(--s)*' + t.paddingMm + 'mm);font-family:' + t.fontFamily + ';color:#000;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.receipt *{box-sizing:border-box;margin:0;padding:0}' +
      '.rb{max-width:100%}' +
      '.rb-info{font-weight:400;word-wrap:break-word;overflow-wrap:break-word}' +
      '.rb-lbl{font-weight:400}' +
      '.rb-val,.rb-sig-lbl,.rb-sig-mail,.rb-footer,.rb-table td,.rb-table th{unicode-bidi:plaintext}' +
      '.rb-title .rb-val{letter-spacing:.2px}' +
      '.rb-amount .rb-val{letter-spacing:-.5px}' +
      '.rb-cur{font-weight:900}' +
      '.rb-div{width:100%;height:0}' +
      '.rb-table table{width:100%;border-collapse:collapse}' +
      '.rb-table th,.rb-table td{border:calc(var(--s)*0.12mm) solid #000;padding:calc(var(--s)*0.6mm) calc(var(--s)*0.8mm);text-align:center}' +
      '.rb-table th{font-weight:900}' +
      '.rb-bc svg{max-width:100%;display:block;margin:0 auto}' +
      '.rb-sig{width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(var(--s)*0.5mm);text-align:center}' +
      '.rb-sig-logo{display:block;margin:0 auto}' +
      '.rb-sig-ln{width:100%;border-bottom:calc(var(--s)*0.15mm) solid #000;min-height:calc(var(--s)*5mm)}' +
      '.rb-sig-lbl{font-weight:900}' +
      '.rb-sig-mail{display:block;font-size:0.62em;direction:ltr}' +
      '.rb-footer{font-weight:400}' +
      '.rb-logo-img{width:' + (function(){ return 'calc(var(--s)*' + fmtNum(t.logo.w) + 'mm)'; })() + ';display:block;margin:0 auto}';
  }

  function hydrateBarcodes(root) {
    if (!root || typeof JsBarcode === 'undefined') return;
    var svg = root.querySelector('#rc-barcode-svg');
    if (svg && svg.getAttribute('data-bc')) {
      try {
        JsBarcode(svg, svg.getAttribute('data-bc'), {
          format: 'CODE128', width: 2, height: 30, displayValue: true,
          fontSize: 11, margin: 0, background: '#fff', lineColor: '#000'
        });
      } catch (e) {}
    }
  }

  function tailScript(t, rec) {
    var s = '';
    var bcTxt = t.barcodeShow ? (rec && rec[t.barcodeContent === 'studentId' ? 'studentId' : 'orderId'] ? rec[t.barcodeContent === 'studentId' ? 'studentId' : 'orderId'] : '') : '';
    if (bcTxt) {
      var jsUrl = 'js/JsBarcode.all.min.js';
      try { jsUrl = new URL(jsUrl, location.href).href; } catch (e) {}
      s += '<script src="' + jsUrl + '"></scr' + 'ipt>';
      s += '<scr' + 'ipt>try{var _el=document.getElementById("rc-barcode-svg");if(_el&&(_el.getAttribute("data-bc"))&&window.JsBarcode){window.JsBarcode(_el,_el.getAttribute("data-bc"),{format:"CODE128",width:2,height:30,displayValue:true,fontSize:11,margin:0,background:"#fff",lineColor:"#000"});}}catch(e){}</scr' + 'ipt>';
    }
    s += '<scr' + 'ipt>window.onafterprint=function(){setTimeout(function(){window.close();},150)};' +
      'if(window.matchMedia){try{window.matchMedia("print").addEventListener("change",function(m){if(!m.matches){setTimeout(function(){window.close();},150)}})}catch(e){}}</scr' + 'ipt>';
    return s;
  }

  function printThermal(tpl, rec) {
    var t = normalize(tpl || defaultTemplate());
    rec = rec || {};
    var w = window.open('', '_blank', 'width=640,height=980');
    if (!w) return false;
    var doc = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
      '<title>وصل اشتراك — ' + esc(t.centerName || 'E-PLUS') + '</title>' +
      '<style>@page{size:' + W_MM + 'mm auto;margin:0}html,body{margin:0;padding:0;background:#fff}' + receiptCSS(t) +
      '.no-print{position:fixed;bottom:8px;left:50%;transform:translateX(-50%);padding:9px 22px;border:none;border-radius:8px;background:#111;color:#fff;font-size:13px;font-family:inherit;font-weight:700;cursor:pointer;z-index:9;box-shadow:0 4px 14px rgba(0,0,0,.25);-webkit-print-color-adjust:exact}@media print{.no-print{display:none!important}}' +
      '</style></head><body>' +
      renderReceiptHTML(t, rec, { scale: 1 }) +
      '<button class="no-print" onclick="window.print()">🖨️ طباعة</button>' +
      tailScript(t, rec) +
      '</body></html>';
    w.document.open();
    w.document.write(doc);
    w.document.close();
    w.focus();
    try { setTimeout(function () { w.print(); }, 600); } catch (e) {}
    return true;
  }

  function sample(t) {
    t = normalize(t);
    return {
      centerName: t.centerName,
      receiptTitle: t.receiptTitle,
      footerText: t.footerText,
      adminEmail: 'admin@epluscenter.com',
      orderId: 'SUB-0042',
      studentName: 'محمد الأمين حساني',
      studentId: '2425-297',
      studentLevel: 'السنة الرابعة متوسط — علوم تجريبية',
      parentName: 'عبد القادر حساني',
      parentPhone: '0660 00 00 00',
      subject: 'الرياضيات',
      teacher: 'الأستاذ عبد الله',
      months: 'شهر واحد',
      sessions: '8 حصص',
      period: '01 سبتمبر 2026 ← 30 سبتمبر 2026',
      status: 'نشط',
      amount: '5 000',
      amountWords: 'خمسة آلاف دينار جزائري',
      date: '09 سبتمبر 2026',
      table: [
        ['شهر 1', '01/09 ← 30/09', '2 / 8'],
        ['شهر 2', '01/10 ← 31/10', '5 / 8']
      ]
    };
  }

  window.ReceiptCalib = {
    W_MM: W_MM,
    PX_PER_MM: PX_PER_MM,
    defaultTemplate: defaultTemplate,
    normalize: normalize,
    loadLocal: loadLocal,
    saveLocal: saveLocal,
    loadCentral: loadCentral,
    saveCentral: saveCentral,
    getTemplate: getTemplate,
    centralReady: centralReady,
    renderReceiptHTML: renderReceiptHTML,
    receiptCSS: receiptCSS,
    hydrateBarcodes: hydrateBarcodes,
    printThermal: printThermal,
    sample: sample,
    blockNames: BLOCK_NAMES
  };
})();