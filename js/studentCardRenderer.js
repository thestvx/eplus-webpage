// ═══════════════════════════════════════════════════════════
//  StudentCardRenderer — SINGLE source of truth for the student
//  ID card (front + back). Used identically by:
//    • admin.html  → preview modal (srShowCard)
//    • admin.html  → print / reprint (srPrintCard)
//    • student.html → portal 3D flip card (renderCardPage)
//  Guarantees identical design, dims, fonts, QR and barcode
//  everywhere. Deterministic generation ⇒ reprint always matches.
// ═══════════════════════════════════════════════════════════

const StudentCardRenderer = (function () {
  const FRONT_IMG = 'studentidcard/studentidcardfront.jpg';
  const BACK_IMG = 'studentidcard/studentidcardback.jpg';
  const CARD_W = 380;          // display width  (px)
  const CARD_H = 228;          // display height (px)  → ratio 5:3
  const QR_SIZE = 64;          // QR size in px, identical everywhere

  // ── GS1 EAN-13 physical standard (the REAL barcode size) ──
  //  • X-dimension 0.33mm = GS1 nominal magnification (100%).
  //  • Quiet zone 11 modules (3.63mm) each side — mandatory for EAN/UPC.
  //  • Bar height 20mm — well above the GS1 retail-POS minimum (17.14mm).
  //  • modulePx is INTEGER so every bar edge lands on a whole pixel →
  //    no fractional anti-aliasing → crisp, laser-scannable edges.
  const BARCODE_STD = {
    Xmm: 0.33,          // module width in mm
    quietModules: 11,   // EAN/UPC required quiet zone per side
    barHeightMm: 20,    // generous bar height
    modulePx: 10        // integer module pixels (crisp edges)
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
    fontSize: 120,
    font: 'monospace',
    fontOptions: 'bold',
    textMargin: 12
  };

  // Physical size of the rendered EAN-13 SVG, in mm.
  function barcodeSpec() {
    const { Xmm, quietModules, modulePx } = BARCODE_STD;
    const svgWidthPx = (BARCODE_MODULES + 2 * quietModules) * modulePx;
    const svgHeightPx = BARCODE_OPTS.height + 2 * BARCODE_OPTS.margin + BARCODE_OPTS.fontSize + BARCODE_OPTS.textMargin;
    const widthMm = Math.round(svgWidthPx * Xmm / modulePx * 100) / 100;
    const heightMm = Math.round(widthMm * svgHeightPx / svgWidthPx * 100) / 100;
    const barHeightMm = Math.round(widthMm * BARCODE_OPTS.height / svgWidthPx * 100) / 100;
    const quietMm = Math.round(quietModules * Xmm * 100) / 100;
    return { Xmm, quietMm, barHeightMm, widthMm, heightMm };
  }

  const CARD_CSS = `
.ec-card{width:${CARD_W}px;height:${CARD_H}px;position:relative;overflow:hidden;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);flex-shrink:0;font-family:'Tajawal',Arial,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ec-card img.bg{width:100%;height:100%;object-fit:cover;display:block}
.ec-overlay{position:absolute;inset:0}
.ec-back-overlay{display:flex;flex-direction:column;padding:12px 16px}
.ec-back-info{display:flex;flex:1;align-items:center;gap:12px;min-height:0}
.ec-back-left{flex:1;display:flex;flex-direction:column;justify-content:center;gap:3px;min-width:0}
.ec-back-right{display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ec-label{font-size:9px;color:rgba(255,255,255,0.85);font-weight:600;text-shadow:0 2px 6px rgba(0,0,0,0.45)}
.ec-value{font-size:12.5px;font-weight:900;color:#ffffff;text-shadow:0 2px 6px rgba(0,0,0,0.45)}
.ec-value.id{font-family:monospace;font-size:11px;font-weight:800}
.ec-value.date{font-size:10px;font-weight:700}
.ec-barcode{display:flex;justify-content:center;align-items:center;background:#ffffff;margin-top:6px;flex-shrink:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ec-barcode svg{display:block;max-width:none;height:auto;margin:0;padding:0}
.ec-front-fallback,.ec-back-fallback{position:absolute;inset:0;display:block;width:100%;height:100%}
@media print{
  .ec-card{box-shadow:none;border-radius:0}
}`;

  // ── Data helpers ───────────────────────────────────────
  const fullName = r => `${r.first_name || ''} ${r.last_name || ''}`.trim();
  const regDate = () => new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
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
  const qrUrl = r => (r.student_token ? 'https://epluscenter.com/s/' + r.student_token : '');

  // ── Markup builders (pure HTML, data-ec-role hooks) ───
  function frontHTML() {
    return `<div class="ec-card ec-front">
      <img class="bg ec-front-fallback" src="${FRONT_IMG}" onerror="this.style.background='linear-gradient(135deg,#6366f1,#8b5cf6)'" alt="">
    </div>`;
  }

  function backHTML(r) {
    const n = fullName(r);
    return `<div class="ec-card ec-back">
      <img class="bg ec-back-fallback" src="${BACK_IMG}" onerror="this.style.background='linear-gradient(135deg,#e0e7ff,#f0f0ff)'" alt="">
      <div class="ec-overlay ec-back-overlay">
        <div class="ec-back-info">
          <div class="ec-back-left">
            <div class="ec-label">الاسم الكامل</div>
            <div class="ec-value">${n}</div>
            <div class="ec-label" style="margin-top:6px">Student ID</div>
            <div class="ec-value id">${r.id || ''}</div>
            <div class="ec-label" style="margin-top:6px">تاريخ التسجيل</div>
            <div class="ec-value date">${regDate()}</div>
          </div>
          <div class="ec-back-right"><div data-ec-role="qr"></div></div>
        </div>
        <div data-ec-role="barcode" class="ec-barcode"></div>
      </div>
    </div>`;
  }

  function pairHTML(r) {
    return frontHTML() + backHTML(r);
  }

  // ── Barcode / QR rendering ─────────────────────────────
  // Render an EAN-13 into an existing <svg> element at the exact GS1
  // physical size (mm), no CSS scaling, no distortion, pure #000/#fff.
  function renderBarcodeSVG(svg, value, doc) {
    if (!svg || typeof JsBarcode === 'undefined') return null;
    try {
      JsBarcode(svg, value, Object.assign({}, BARCODE_OPTS, { xmlDocument: doc || document }));
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

  function renderQR(el, url, size, doc) {
    el.innerHTML = '';
    if (!url || typeof QRCode === 'undefined') return;
    try {
      new QRCode(el, { text: url, width: size || QR_SIZE, height: size || QR_SIZE, colorDark: '#1e293b', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    } catch (e) { console.error('[StudentCardRenderer] QR error:', e); }
  }

  // Fill the [data-ec-role] slots inside a root element.
  function hydrateRoot(root, r, doc) {
    if (!root) return;
    const bcSlot = root.querySelector('[data-ec-role="barcode"]');
    const qrSlot = root.querySelector('[data-ec-role="qr"]');
    if (bcSlot) renderBarcode(bcSlot, barcodeValue(r), doc);
    if (qrSlot) renderQR(qrSlot, qrUrl(r), QR_SIZE, doc);
  }

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

  // Front/back markup for the portal 3D flip (faces already carry
  // the portal .card-face/.card-front/.card-back classes).
  function portalFaces(r) {
    return { front: frontHTML(), back: backHTML(r) };
  }

  // Complete standalone print document (string). Caller then
  // writes it, closes it and calls hydratePrint(win, r).
  function buildPrintHTML(r) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>بطاقة التسجيل - ${fullName(r)}</title>
<style>
  @media print { @page { margin: 5mm; size: landscape; } body { margin: 0; padding: 0; } .ec-card-page { page-break-after: always; } .ec-card-page:last-child { page-break-after: avoid; } }
  body { margin: 0; padding: 10px; display: flex; gap: 20px; justify-content: center; align-items: flex-start; background: #f1f5f9; }
</style>
<style>${CARD_CSS}</style>
</head><body>
  <div class="ec-card-page">${frontHTML()}</div>
  <div class="ec-card-page">${backHTML(r)}</div>
</body></html>`;
  }

  // Fill barcode+QR in an already-open print window.
  function hydratePrint(win, r) {
    if (!win || !win.document) return;
    hydrateRoot(win.document.body, r, win.document);
  }

  // Standalone white print page containing ONLY the EAN-13 at its exact
  // physical size (@page margin:0). Used by the SP-1160 hardware test
  // so TEST A (product) and TEST B (student) print at IDENTICAL dims.
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
<script src="js/studentCardRenderer.js?v=3"></script>
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
    CARD_W, CARD_H, QR_SIZE, BARCODE_OPTS, BARCODE_STD, CARD_CSS,
    fullName, regDate, barcodeValue, qrUrl,
    barcodeSpec,
    injectCSS, renderPair, portalFaces, buildPrintHTML, hydratePrint, hydrateRoot,
    renderBarcodeSVG, buildBarcodePrintHTML
  };
})();

window.StudentCardRenderer = StudentCardRenderer;
