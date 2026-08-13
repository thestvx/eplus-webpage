// ═══════════════════════════════════════════════════════════
//  StudentCardRenderer — SINGLE source of truth for the student
//  ID card (front + back). Used identically by:
//    • admin.html  → preview modal (srShowCard)
//    • admin.html  → print / reprint (srPrintCard)
//    • student.html → portal 3D flip card (renderCardPage)
//    • calibration-print.html → live position calibration
//  Guarantees identical design, dims, fonts, QR and barcode
//  everywhere. Deterministic generation ⇒ reprint always matches.
//
//  PRINT MODEL:
//  The physical card/paper is ALREADY printed with the back-face
//  design (background + logo + graphics). The site therefore only
//  ever prints a TRANSPARENT DATA LAYER on top: name, Student ID,
//  stream, registration date, QR + barcode — at FIXED mm positions
//  (see CAL below) that must line up with the pre-printed design.
//  No background image, logo or design is ever printed by the site.
//
//  CALIBRATION:
//  The position/size of every printed element lives in CAL (mm).
//  calibration-print.html can drag the elements, edit the values and
//  save them. A saved calibration is stored in localStorage and is
//  picked up automatically by every future print (admin print/reprint,
//  student portal preview, the print window). All coordinates are
//  relative to the top-left of the 85.6 × 53.98 mm card. For the
//  right-aligned text rows, x is the position of the row's RIGHT edge
//  measured from the card's LEFT edge (so dragging right always raises x).
// ═══════════════════════════════════════════════════════════

const StudentCardRenderer = (function () {
  const FRONT_IMG = 'studentidcard/studentidcardfront.jpg';
  const BACK_IMG = 'studentidcard/studentidcardback.jpg';
  const CARD_W = 380;          // display width  (px)
  const CARD_H = 228;          // display height (px)
  const QR_SIZE = 64;          // base QR px size
  const CARD_W_MM = 85.6;      // physical card width  (ISO CR80)
  const CARD_H_MM = 53.98;     // physical card height (ISO CR80)

  const STORE_KEY = 'eplus-card-calibration-v1';

  // ── DEFAULT CALIBRATION (millimetres) ──
  // name/id/stream/date are right-aligned text rows; x = RIGHT edge from the
  // card's LEFT edge (default 85.6 − 20.5 = 65.1 mm), y = row top.
  // qr/barcode are left-aligned boxes; x = left edge, y = top.
  // barcode w/h = null ⇒ the EAN-13 physical size from barcodeSpec() is used.
  const CAL_DEFAULTS = {
    name:   { x: 65.1, y: 14.0, fontSize: 3.4 },
    id:     { x: 65.1, y: 20.4, fontSize: 3.0 },
    stream: { x: 65.1, y: 26.8, fontSize: 3.0 },
    date:   { x: 65.1, y: 33.2, fontSize: 2.9 },
    label:  { fontSize: 2.2, gap: 0.7, maxWidth: 42 },
    qr:     { x: 6.5, y: 5.0, w: 15, h: 15 },
    bc:     { x: 23.5, y: 39.08, w: null, h: null }
  };

  // ── Calibration storage (shared by every page of the site) ──
  function _clone(o) { return JSON.parse(JSON.stringify(o)); }
  function _readStorage() {
    try { return JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null'); }
    catch (e) { return null; }
  }
  function _writeStorage(cal) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(cal)); return true; }
    catch (e) { return false; }
  }
  function _clearStorage() { try { window.localStorage.removeItem(STORE_KEY); } catch (e) {} }

  // Merge a saved (possibly partial) calibration onto the defaults with
  // sanity clamping, so a corrupt/old value can never break printing.
  function _merge(saved) {
    const cal = _clone(CAL_DEFAULTS);
    if (saved && typeof saved === 'object') {
      ['name', 'id', 'stream', 'date', 'label', 'qr', 'bc'].forEach(k => {
        const v = saved[k];
        if (v && typeof v === 'object') {
          ['x', 'y', 'w', 'h', 'fontSize', 'gap', 'maxWidth'].forEach(p => {
            if (typeof v[p] === 'number' && isFinite(v[p])) cal[k][p] = v[p];
          });
        }
      });
    }
    ['name', 'id', 'stream', 'date', 'qr', 'bc'].forEach(k => {
      cal[k].x = Math.min(Math.max(0, cal[k].x), CARD_W_MM);
      cal[k].y = Math.min(Math.max(0, cal[k].y), CARD_H_MM);
      if (cal[k].w !== null && cal[k].w !== undefined) cal[k].w = Math.min(Math.max(1, cal[k].w), CARD_W_MM);
      if (cal[k].h !== null && cal[k].h !== undefined) cal[k].h = Math.min(Math.max(1, cal[k].h), CARD_H_MM);
      if (cal[k].fontSize !== undefined) cal[k].fontSize = Math.min(Math.max(1, cal[k].fontSize), 12);
    });
    cal.label.fontSize = Math.min(Math.max(1, cal.label.fontSize), 8);
    cal.label.gap = Math.min(Math.max(0, cal.label.gap), 5);
    cal.label.maxWidth = Math.min(Math.max(10, cal.label.maxWidth), CARD_W_MM);
    return cal;
  }

  let CAL = _merge(_readStorage());

  // ── Calibration public API ──────────────────────────────
  function getCalibration() { return _clone(CAL); }
  function setCalibration(cal) { CAL = _merge(cal); return getCalibration(); }
  function saveCalibration(cal) { const c = setCalibration(cal); _writeStorage(c); return c; }
  function resetCalibration() { CAL = _clone(CAL_DEFAULTS); _clearStorage(); return getCalibration(); }
  function calibrationStorageKey() { return STORE_KEY; }

  // ── GS1 EAN-13 physical standard (the REAL barcode size) ──
  const BARCODE_STD = {
    Xmm: 0.33,
    quietModules: 11,
    barHeightMm: 11.5,
    modulePx: 10
  };
  const BARCODE_MODULES = 95; // EAN-13 total modules (guards + halves)

  const BARCODE_OPTS = {
    format: 'EAN13',
    displayValue: true,
    lineColor: '#000000',
    background: '#ffffff',
    width: BARCODE_STD.modulePx,
    height: Math.round(BARCODE_STD.barHeightMm / BARCODE_STD.Xmm * BARCODE_STD.modulePx),
    margin: BARCODE_STD.quietModules * BARCODE_STD.modulePx,
    fontSize: 96,
    font: 'monospace',
    fontOptions: 'bold',
    textMargin: 8
  };

  const SVG_MARGIN_PX = BARCODE_OPTS.margin;
  const SVG_WIDTH_PX = (BARCODE_MODULES + 2 * BARCODE_STD.quietModules) * BARCODE_STD.modulePx;
  const SVG_HEIGHT_PX = BARCODE_OPTS.height + 2 * SVG_MARGIN_PX + BARCODE_OPTS.fontSize + BARCODE_OPTS.textMargin;
  const SVG_CROP_HEIGHT_PX = SVG_HEIGHT_PX - 2 * SVG_MARGIN_PX;

  // Physical size of the printed EAN-13, in mm.
  function barcodeSpec() {
    const { Xmm, quietModules, modulePx } = BARCODE_STD;
    const widthMm = Math.round(SVG_WIDTH_PX * Xmm / modulePx * 100) / 100;
    const heightMm = Math.round(widthMm * SVG_CROP_HEIGHT_PX / SVG_WIDTH_PX * 100) / 100;
    const barHeightMm = Math.round(widthMm * BARCODE_OPTS.height / SVG_WIDTH_PX * 100) / 100;
    const quietMm = Math.round(quietModules * Xmm * 100) / 100;
    return { Xmm, quietMm, barHeightMm, widthMm, heightMm };
  }

  // Effective barcode box (mm) after calibration overrides.
  function bcBox() {
    const spec = barcodeSpec();
    return {
      w: CAL.bc.w || spec.widthMm,
      h: CAL.bc.h || spec.heightMm,
      spec
    };
  }

  // ── Data helpers ───────────────────────────────────────
  const fullName = r => `${r.first_name || ''} ${r.last_name || ''}`.trim();
  const streamOf = r => (r && (r.stream || r.stream_name || '')) || '';
  const regDate = r => {
    const src = (r && (r.created_at || r.registration_date || r.createdAt)) || null;
    let d = src ? new Date(src) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    return d.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const barcodeValue = r => {
    if (!r) return '';
    const stored = r.barcode_value || r.barcodeValue;
    if (stored) return String(stored);
    if (typeof EAN13 !== 'undefined') {
      const ean = EAN13.make(r.id);
      if (ean) return ean;
    }
    return 'EPLUS-' + (r.id || '');
  };
  const qrUrl = r => (r && r.student_token ? 'https://epluscenter.com/s/' + r.student_token : '');

  // ── Data-layer CSS — same layout in px (screen) and mm (print) ──
  // Built on demand so it always reflects the CURRENT calibration.
  function dlRules(unit, sx, sy) {
    const X = v => (v * sx).toFixed(3) + unit;
    const Y = v => (v * sy).toFixed(3) + unit;
    const box = bcBox();
    return `
.ec-dl{position:absolute;inset:0;direction:rtl;text-align:right}
.ec-dl-row{position:absolute;text-align:right;max-width:${X(CAL.label.maxWidth)}}
.ec-dl-label{display:block;font-weight:700;line-height:1.2;color:#0b1b3f;text-shadow:0 0 2px rgba(255,255,255,0.95),0 0 5px rgba(255,255,255,0.55)}
.ec-dl-value{display:block;font-weight:900;line-height:1.28;color:#0b1b3f;text-shadow:0 0 2px rgba(255,255,255,0.95),0 0 5px rgba(255,255,255,0.55)}
.ec-dl-value.id{font-family:'Courier New',monospace;font-weight:800;letter-spacing:0.5px}
.ec-dl-r1{right:${X(CARD_W_MM - CAL.name.x)};top:${Y(CAL.name.y)}}
.ec-dl-r2{right:${X(CARD_W_MM - CAL.id.x)};top:${Y(CAL.id.y)}}
.ec-dl-r3{right:${X(CARD_W_MM - CAL.stream.x)};top:${Y(CAL.stream.y)}}
.ec-dl-r4{right:${X(CARD_W_MM - CAL.date.x)};top:${Y(CAL.date.y)}}
.ec-dl-r1 .ec-dl-label,.ec-dl-r2 .ec-dl-label,.ec-dl-r3 .ec-dl-label,.ec-dl-r4 .ec-dl-label{font-size:${X(CAL.label.fontSize)};margin-bottom:${Y(CAL.label.gap)}}
.ec-dl-r1 .ec-dl-value{font-size:${X(CAL.name.fontSize)}}
.ec-dl-r2 .ec-dl-value{font-size:${X(CAL.id.fontSize)}}
.ec-dl-r3 .ec-dl-value{font-size:${X(CAL.stream.fontSize)}}
.ec-dl-r4 .ec-dl-value{font-size:${X(CAL.date.fontSize)}}
.ec-dl-qr{position:absolute;left:${X(CAL.qr.x)};top:${Y(CAL.qr.y)};width:${X(CAL.qr.w)};height:${Y(CAL.qr.h)};display:flex;align-items:center;justify-content:center;overflow:hidden}
.ec-dl-qr img,.ec-dl-qr canvas{width:100%!important;height:100%!important}
.ec-dl-bc{position:absolute;left:${X(CAL.bc.x)};top:${Y(CAL.bc.y)};width:${X(box.w)};height:${Y(box.h)};display:flex;align-items:center;justify-content:center;background:#ffffff;overflow:hidden}
`;
  }

  function cardCSS() {
    const box = bcBox();
    return `
.ec-card{width:${CARD_W}px;height:${CARD_H}px;position:relative;overflow:hidden;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);flex-shrink:0;font-family:'Tajawal',Arial,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ec-card img.bg{width:100%;height:100%;object-fit:cover;display:block}
.ec-overlay{position:absolute;inset:0}
.ec-back.no-design .bg{display:none!important}
.ec-front-fallback,.ec-back-fallback{position:absolute;inset:0;display:block;width:100%;height:100%}
${dlRules('px', CARD_W / CARD_W_MM, CARD_H / CARD_H_MM)}
.ec-dl-bc svg{width:${(box.w * CARD_W / CARD_W_MM).toFixed(1)}px!important;height:${(box.h * CARD_H / CARD_H_MM).toFixed(1)}px!important;max-width:none;display:block}
@media print{
  .ec-card{box-shadow:none;border-radius:0}
}`;
  }

  // Inject the card CSS into a document (force=true rebuilds it, so live
  // calibration changes are reflected immediately).
  function injectCSS(doc, force) {
    doc = doc || document;
    let st = doc.getElementById('ec-card-css');
    if (st && !force) return;
    if (!st) { st = doc.createElement('style'); st.id = 'ec-card-css'; doc.head.appendChild(st); }
    st.textContent = cardCSS();
  }

  // ── Markup builders (pure HTML, data-ec-role / data-cal hooks) ───
  function frontHTML() {
    return `<div class="ec-card ec-front">
      <img class="bg ec-front-fallback" src="${FRONT_IMG}" onerror="this.style.background='linear-gradient(135deg,#6366f1,#8b5cf6)'" alt="">
    </div>`;
  }

  function dataLayerHTML(r) {
    const n = fullName(r);
    const st = streamOf(r);
    const streamRow = st
      ? `<div class="ec-dl-row ec-dl-r3" data-cal="stream"><span class="ec-dl-label">الشعبة</span><span class="ec-dl-value">${st}</span></div>`
      : '';
    return `<div class="ec-dl">
      <div class="ec-dl-row ec-dl-r1" data-cal="name"><span class="ec-dl-label">الاسم الكامل</span><span class="ec-dl-value">${n}</span></div>
      <div class="ec-dl-row ec-dl-r2" data-cal="id"><span class="ec-dl-label">Student ID</span><span class="ec-dl-value id">${r.id || ''}</span></div>
      ${streamRow}
      <div class="ec-dl-row ec-dl-r4" data-cal="date"><span class="ec-dl-label">تاريخ التسجيل</span><span class="ec-dl-value date">${regDate(r)}</span></div>
      <div class="ec-dl-qr" data-ec-role="qr" data-cal="qr"></div>
      <div class="ec-dl-bc" data-ec-role="barcode" data-cal="barcode"></div>
    </div>`;
  }

  function backHTML(r) {
    return `<div class="ec-card ec-back">
      <img class="bg ec-back-fallback" src="${BACK_IMG}" onerror="this.style.background='linear-gradient(135deg,#1E3C86,#2548A1)'" alt="">
      <div class="ec-overlay">${dataLayerHTML(r)}</div>
    </div>`;
  }

  function pairHTML(r) {
    return frontHTML() + backHTML(r);
  }

  // ── Barcode / QR rendering ─────────────────────────────
  function renderBarcodeSVG(svg, value, doc) {
    if (!svg || typeof JsBarcode === 'undefined') return null;
    try {
      JsBarcode(svg, value, Object.assign({}, BARCODE_OPTS, { xmlDocument: doc || document }));
      svg.setAttribute('viewBox', '0 ' + SVG_MARGIN_PX + ' ' + SVG_WIDTH_PX + ' ' + SVG_CROP_HEIGHT_PX);
      const box = bcBox();
      svg.setAttribute('width', box.w + 'mm');
      svg.setAttribute('height', box.h + 'mm');
      svg.style.setProperty('max-width', 'none');
      svg.style.setProperty('width', box.w + 'mm');
      svg.style.setProperty('height', box.h + 'mm');
      return svg;
    } catch (e) { console.error('[StudentCardRenderer] barcode error:', e); return null; }
  }

  function renderBarcode(el, value, doc) {
    el.innerHTML = '';
    if (typeof JsBarcode === 'undefined') return;
    const svg = (doc || document).createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.appendChild(svg);
    renderBarcodeSVG(svg, value, doc);
  }

  function renderQR(el, url, px, doc) {
    el.innerHTML = '';
    if (!url || typeof QRCode === 'undefined') return;
    try {
      new QRCode(el, { text: url, width: px, height: px, colorDark: '#0b1b3f', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    } catch (e) { console.error('[StudentCardRenderer] QR error:', e); }
  }

  // Fill the [data-ec-role] slots inside a root element.
  function hydrateRoot(root, r, doc, opts) {
    if (!root) return;
    const bcSlot = root.querySelector('[data-ec-role="barcode"]');
    const qrSlot = root.querySelector('[data-ec-role="qr"]');
    if (bcSlot) renderBarcode(bcSlot, barcodeValue(r), doc);
    if (qrSlot) renderQR(qrSlot, qrUrl(r), (opts && opts.qrPx) || QR_SIZE * 2, doc);
  }

  // ── Calibration grid (never printed in production; used by the
  //    calibration page / print test to check alignment vs the
  //    pre-printed card). Fixed mm coordinates from CAL.
  function gridOverlayHTML(unit) {
    const usePx = unit === 'px';
    const U = usePx ? CARD_W / CARD_W_MM : 1;
    const su = usePx ? 'px' : 'mm';
    const P = v => (v * U).toFixed(3) + su;
    const H = v => `<div class="ec-g ec-g-h ec-g-min" style="top:${P(v)}"></div>`;
    const V = v => `<div class="ec-g ec-g-v ec-g-min" style="left:${P(v)}"></div>`;
    const box = bcBox();
    let s = '<div class="ec-grid">';
    for (let i = 1; i < Math.round(CARD_W_MM); i += 1) {
      if (i % 5 === 0) continue;
      s += H(i) + V(i);
    }
    for (let i = 5; i < Math.round(CARD_W_MM); i += 5) {
      s += `<div class="ec-g ec-g-h ec-g-maj" style="top:${P(i)}"></div>`;
      s += `<div class="ec-g ec-g-v ec-g-maj" style="left:${P(i)}"></div>`;
    }
    ['name', 'id', 'stream', 'date'].forEach(k => {
      s += `<div class="ec-g ec-g-v ec-g-data" style="left:${P(CAL[k].x)}"></div>`;
      s += `<div class="ec-g ec-g-h ec-g-data" style="top:${P(CAL[k].y)}"></div>`;
    });
    s += `<div class="ec-g-box" style="left:${P(CAL.qr.x)};top:${P(CAL.qr.y)};width:${P(CAL.qr.w)};height:${P(CAL.qr.h)}"></div>`;
    s += `<div class="ec-g-box" style="left:${P(CAL.bc.x)};top:${P(CAL.bc.y)};width:${P(box.w)};height:${P(box.h)}"></div>`;
    s += '</div>';
    return s;
  }

  const GRID_CSS = `
.ec-grid{position:absolute;inset:0;pointer-events:none;direction:ltr}
.ec-grid .ec-g{position:absolute;display:block;background:#111}
.ec-grid .ec-g-h{width:85.6mm;height:0.2mm}
.ec-grid .ec-g-v{width:0.2mm;height:53.98mm}
.ec-grid .ec-g-min{opacity:0.10}
.ec-grid .ec-g-maj{opacity:0.35}
.ec-grid .ec-g-data{background:#d32f2f;opacity:0.95;height:0.3mm;width:0.3mm}
.ec-grid .ec-g-box{position:absolute;border:0.2mm solid #d32f2f;background:none}
`;

  // ── Public API ─────────────────────────────────────────
  function renderPair(container, r) {
    if (!container) return;
    container.innerHTML = pairHTML(r);
    hydrateRoot(container, r);
    return container;
  }

  // Front/back markup for the portal 3D flip.
  function portalFaces(r) {
    return { front: frontHTML(), back: backHTML(r) };
  }

  // Back-FACE DATA LAYER ONLY — transparent over the pre-printed card.
  // No front face, no background image, no logo, no design. Fixed mm.
  // opts.grid=true adds a calibration grid (only for the calibration print test).
  function buildPrintHTML(r, opts) {
    const data = JSON.stringify(r).replace(/<\//g, '<\\/');
    const grid = opts && opts.grid ? GRID_CSS + gridOverlayHTML('mm') : '';
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>بطاقة الطالب - ${fullName(r)}</title>
<style>
  @page { size: ${CARD_W_MM}mm ${CARD_H_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  * { box-sizing: border-box; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ec-data-layer { position: relative; width: ${CARD_W_MM}mm; height: ${CARD_H_MM}mm; overflow: hidden; font-family: 'Tajawal', Arial, sans-serif; }
  ${dlRules('mm', 1, 1)}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script src="js/studentCardRenderer.js?v=6"><\/script>
</head><body>
<div class="ec-data-layer">${dataLayerHTML(r)}${grid}</div>
<script>
(function () {
  var data = ${data};
  var tries = 0;
  function ready() {
    return typeof window.JsBarcode !== 'undefined' && typeof window.QRCode !== 'undefined' && typeof window.StudentCardRenderer !== 'undefined';
  }
  function go() {
    if (!ready()) { if (tries++ < 40) { setTimeout(go, 250); return; } }
    try { if (window.StudentCardRenderer) window.StudentCardRenderer.hydratePrint(window, data); } catch (e) {}
    setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 350);
  }
  setTimeout(go, 300);
  window.onafterprint = function () { setTimeout(function () { try { window.close(); } catch (e) {} }, 250); };
})();
<\/script>
</body></html>`;
  }

  // Fill barcode+QR in an already-open print window (used as a fallback
  // by admin.html in case the print document's own loader is delayed).
  function hydratePrint(win, r) {
    if (!win || !win.document) return;
    hydrateRoot(win.document.body, r, win.document, { qrPx: 300 });
  }

  // Standalone white print page containing ONLY the EAN-13 at its exact
  // physical size (@page margin:0). Used by the SP-1160 hardware test.
  function buildBarcodePrintHTML(value) {
    const spec = barcodeSpec();
    return `<!DOCTYPE html><html dir="ltr" lang="en"><head><meta charset="utf-8"><title>EAN-13 ${value}</title>
<style>
  @media print { @page { margin: 0; size: auto; } html,body { margin: 0; padding: 0; } }
  html,body { margin: 0; padding: 0; background: #ffffff; }
  .wrap { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
  .cap { font-family: monospace; font-size: 15px; color: #334155; letter-spacing: 2px; }
  @media print { .cap { display: none; } }
</style>
</head><body>
  <div class="wrap"><div class="cap">${value}</div><div id="bc"></div></div>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<script src="js/studentCardRenderer.js?v=6"></script>
<script>
  (function () {
    var value = '${value}';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.getElementById('bc').appendChild(svg);
    StudentCardRenderer.renderBarcodeSVG(svg, value, document);
    setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 300);
    window.onafterprint = function () { try { window.close(); } catch (e) {} };
  })();
</script>
</body></html>`;
  }

  return {
    CARD_W, CARD_H, CARD_W_MM, CARD_H_MM, QR_SIZE, CAL, CAL_DEFAULTS, BARCODE_OPTS, BARCODE_STD,
    cardCSS, barcodeSpec, bcBox,
    getCalibration, setCalibration, saveCalibration, resetCalibration, calibrationStorageKey,
    fullName, streamOf, regDate, barcodeValue, qrUrl,
    injectCSS, renderPair, portalFaces, buildPrintHTML, hydratePrint, hydrateRoot,
    dataLayerHTML, gridOverlayHTML, GRID_CSS,
    renderBarcodeSVG, buildBarcodePrintHTML
  };
})();

window.StudentCardRenderer = StudentCardRenderer;
