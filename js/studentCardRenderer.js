// ═══════════════════════════════════════════════════════════
//  StudentCardRenderer — SINGLE source of truth for the student
//  ID card (front + back). Used identically by:
//    • admin.html  → preview modal (srShowCard)
//    • admin.html  → print / reprint (srPrintCard)
//    • student.html → portal 3D flip card (renderCardPage)
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
// ═══════════════════════════════════════════════════════════

const StudentCardRenderer = (function () {
  const FRONT_IMG = 'studentidcard/studentidcardfront.jpg';
  const BACK_IMG = 'studentidcard/studentidcardback.jpg';
  const CARD_W = 380;          // display width  (px)
  const CARD_H = 228;          // display height (px)
  const QR_SIZE = 64;          // base QR px size
  const CARD_W_MM = 85.6;      // physical card width  (ISO CR80)
  const CARD_H_MM = 53.98;     // physical card height (ISO CR80)

  // ── CALIBRATION — fixed mm positions of the printed DATA LAYER ──
  // Every printed element is positioned in millimetres relative to the
  // top-left corner of the 85.6 × 53.98 mm card. Adjust these values to
  // line the printed data up with the pre-printed back design (verified
  // on a real printed test card). The screen preview uses the same values.
  const CAL = {
    textRight: 20.5,           // right edge of the text column (mm from card right edge)
    nameY: 14.0,               // "الاسم الكامل" row top (label)
    idY: 20.4,                 // Student ID row top
    streamY: 26.8,             // الشعبة row top (omitted when the student has no stream)
    dateY: 33.2,               // تاريخ التسجيل row top
    labelSizeMm: 2.2,          // label font size
    nameSizeMm: 3.4,           // name value font size
    idSizeMm: 3.0,             // Student ID value font size
    streamSizeMm: 3.0,         // stream value font size
    dateSizeMm: 2.9,           // date value font size
    labelGapMm: 0.7,           // gap between label and value
    qrLeft: 6.5,               // QR left (mm from card left edge)
    qrTop: 5.0,                // QR top (mm from card top edge)
    qrSizeMm: 15,              // QR printed size
    bcLeft: 23.5,              // barcode left (mm) — centered on the card
    bcTop: 39.08,              // barcode top (mm) — flush to the bottom edge
    bcW: 38.6,                 // barcode physical width  (from barcodeSpec)
    bcH: 14.9                  // barcode physical height (from barcodeSpec)
  };

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
  function dlRules(unit, sx, sy) {
    const X = v => (v * sx).toFixed(3) + unit;
    const Y = v => (v * sy).toFixed(3) + unit;
    return `
.ec-dl{position:absolute;inset:0;direction:rtl;text-align:right}
.ec-dl-row{position:absolute;right:${X(CAL.textRight)};text-align:right;max-width:${X(42)}}
.ec-dl-label{display:block;font-weight:700;line-height:1.2;color:#0b1b3f;text-shadow:0 0 2px rgba(255,255,255,0.95),0 0 5px rgba(255,255,255,0.55)}
.ec-dl-value{display:block;font-weight:900;line-height:1.28;color:#0b1b3f;text-shadow:0 0 2px rgba(255,255,255,0.95),0 0 5px rgba(255,255,255,0.55)}
.ec-dl-value.id{font-family:'Courier New',monospace;font-weight:800;letter-spacing:0.5px}
.ec-dl-r1{top:${Y(CAL.nameY)}}
.ec-dl-r2{top:${Y(CAL.idY)}}
.ec-dl-r3{top:${Y(CAL.streamY)}}
.ec-dl-r4{top:${Y(CAL.dateY)}}
.ec-dl-r1 .ec-dl-label,.ec-dl-r2 .ec-dl-label,.ec-dl-r3 .ec-dl-label,.ec-dl-r4 .ec-dl-label{font-size:${X(CAL.labelSizeMm)}}
.ec-dl-r1 .ec-dl-label{margin-bottom:${Y(CAL.labelGapMm)}}
.ec-dl-r2 .ec-dl-label{margin-bottom:${Y(CAL.labelGapMm)}}
.ec-dl-r3 .ec-dl-label{margin-bottom:${Y(CAL.labelGapMm)}}
.ec-dl-r4 .ec-dl-label{margin-bottom:${Y(CAL.labelGapMm)}}
.ec-dl-r1 .ec-dl-value{font-size:${X(CAL.nameSizeMm)}}
.ec-dl-r2 .ec-dl-value{font-size:${X(CAL.idSizeMm)}}
.ec-dl-r3 .ec-dl-value{font-size:${X(CAL.streamSizeMm)}}
.ec-dl-r4 .ec-dl-value{font-size:${X(CAL.dateSizeMm)}}
.ec-dl-qr{position:absolute;left:${X(CAL.qrLeft)};top:${Y(CAL.qrTop)};width:${X(CAL.qrSizeMm)};height:${Y(CAL.qrSizeMm)};display:flex;align-items:center;justify-content:center;overflow:hidden}
.ec-dl-qr img,.ec-dl-qr canvas{width:100%!important;height:100%!important}
.ec-dl-bc{position:absolute;left:${X(CAL.bcLeft)};top:${Y(CAL.bcTop)};display:flex;align-items:center;justify-content:center;background:#ffffff}
`;
  }

  const CARD_CSS = `
.ec-card{width:${CARD_W}px;height:${CARD_H}px;position:relative;overflow:hidden;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);flex-shrink:0;font-family:'Tajawal',Arial,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ec-card img.bg{width:100%;height:100%;object-fit:cover;display:block}
.ec-overlay{position:absolute;inset:0}
.ec-back.no-design .bg{display:none!important}
.ec-front-fallback,.ec-back-fallback{position:absolute;inset:0;display:block;width:100%;height:100%}
${dlRules('px', CARD_W / CARD_W_MM, CARD_H / CARD_H_MM)}
.ec-dl-bc svg{width:${(CAL.bcW * CARD_W / CARD_W_MM).toFixed(1)}px!important;height:auto!important;max-width:none;display:block}
@media print{
  .ec-card{box-shadow:none;border-radius:0}
}`;

  // ── Markup builders (pure HTML, data-ec-role hooks) ───
  function frontHTML() {
    return `<div class="ec-card ec-front">
      <img class="bg ec-front-fallback" src="${FRONT_IMG}" onerror="this.style.background='linear-gradient(135deg,#6366f1,#8b5cf6)'" alt="">
    </div>`;
  }

  function dataLayerHTML(r) {
    const n = fullName(r);
    const st = streamOf(r);
    const streamRow = st
      ? `<div class="ec-dl-row ec-dl-r3"><span class="ec-dl-label">الشعبة</span><span class="ec-dl-value">${st}</span></div>`
      : '';
    return `<div class="ec-dl">
      <div class="ec-dl-row ec-dl-r1"><span class="ec-dl-label">الاسم الكامل</span><span class="ec-dl-value">${n}</span></div>
      <div class="ec-dl-row ec-dl-r2"><span class="ec-dl-label">Student ID</span><span class="ec-dl-value id">${r.id || ''}</span></div>
      ${streamRow}
      <div class="ec-dl-row ec-dl-r4"><span class="ec-dl-label">تاريخ التسجيل</span><span class="ec-dl-value date">${regDate(r)}</span></div>
      <div class="ec-dl-qr" data-ec-role="qr"></div>
      <div class="ec-dl-bc" data-ec-role="barcode"></div>
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
      const spec = barcodeSpec();
      const w = spec.widthMm + 'mm';
      const h = spec.heightMm + 'mm';
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.style.setProperty('max-width', 'none');
      svg.style.setProperty('width', w);
      svg.style.setProperty('height', 'auto');
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
    let s = '<div class="ec-grid">';
    for (let i = 1; i < Math.round(CARD_W_MM); i += 1) {
      if (i % 5 === 0) continue;
      s += H(i) + V(i);
    }
    for (let i = 5; i < Math.round(CARD_W_MM); i += 5) {
      s += `<div class="ec-g ec-g-h ec-g-maj" style="top:${P(i)}"></div>`;
      s += `<div class="ec-g ec-g-v ec-g-maj" style="left:${P(i)}"></div>`;
    }
    const spec = barcodeSpec();
    const textColLeft = CARD_W_MM - CAL.textRight - 42;
    s += `<div class="ec-g ec-g-v ec-g-data" style="left:${P(textColLeft)}"></div>`;
    [CAL.nameY, CAL.idY, CAL.streamY, CAL.dateY].forEach(y => {
      s += `<div class="ec-g ec-g-h ec-g-data" style="top:${P(y)}"></div>`;
    });
    s += `<div class="ec-g-box" style="left:${P(CAL.qrLeft)};top:${P(CAL.qrTop)};width:${P(CAL.qrSizeMm)};height:${P(CAL.qrSizeMm)}"></div>`;
    s += `<div class="ec-g-box" style="left:${P(CAL.bcLeft)};top:${P(CAL.bcTop)};width:${P(spec.widthMm)};height:${P(spec.heightMm)}"></div>`;
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
  function injectCSS(doc) {
    doc = doc || document;
    if (doc.getElementById('ec-card-css')) return;
    const st = doc.createElement('style');
    st.id = 'ec-card-css';
    st.textContent = CARD_CSS;
    doc.head.appendChild(st);
  }

  // Render front+back pair into an existing container (admin modal).
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
<script src="js/studentCardRenderer.js?v=5"><\/script>
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
<script src="js/studentCardRenderer.js?v=5"></script>
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
    CARD_W, CARD_H, CARD_W_MM, CARD_H_MM, QR_SIZE, CAL, BARCODE_OPTS, BARCODE_STD, CARD_CSS,
    fullName, streamOf, regDate, barcodeValue, qrUrl,
    barcodeSpec,
    injectCSS, renderPair, portalFaces, buildPrintHTML, hydratePrint, hydrateRoot,
    dataLayerHTML, gridOverlayHTML, GRID_CSS,
    renderBarcodeSVG, buildBarcodePrintHTML
  };
})();

window.StudentCardRenderer = StudentCardRenderer;
