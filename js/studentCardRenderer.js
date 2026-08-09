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
  const QR_SIZE = 100;         // QR size in px, identical everywhere

  const BARCODE_OPTS = {
    format: 'CODE128',
    displayValue: true,
    lineColor: '#000000',
    background: '#ffffff',
    width: 2.2,
    height: 30,
    margin: 8,
    fontSize: 10,
    font: 'monospace',
    fontOptions: 'bold',
    textMargin: 4
  };

  const CARD_CSS = `
.ec-card{width:${CARD_W}px;height:${CARD_H}px;position:relative;overflow:hidden;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);flex-shrink:0;font-family:'Tajawal',Arial,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ec-card img.bg{width:100%;height:100%;object-fit:cover;display:block}
.ec-overlay{position:absolute;inset:0}
.ec-back-overlay{display:flex;flex-direction:column;padding:16px 20px}
.ec-back-info{display:flex;flex:1;align-items:center;gap:16px;min-height:0}
.ec-back-left{flex:1;display:flex;flex-direction:column;justify-content:center;gap:4px;min-width:0}
.ec-back-right{display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ec-label{font-size:10px;color:rgba(255,255,255,0.85);font-weight:600;text-shadow:0 2px 6px rgba(0,0,0,0.45)}
.ec-value{font-size:13px;font-weight:900;color:#ffffff;text-shadow:0 2px 6px rgba(0,0,0,0.45)}
.ec-value.id{font-family:monospace;font-size:12px;font-weight:800}
.ec-value.date{font-size:11px;font-weight:700}
.ec-barcode{display:flex;justify-content:center;align-items:center;background:#ffffff;border-radius:6px;padding:4px 6px;margin-top:8px;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ec-barcode svg{display:block;max-width:100%;height:auto}
.ec-front-fallback,.ec-back-fallback{position:absolute;inset:0;display:block;width:100%;height:100%}
@media print{
  .ec-card{box-shadow:none;border-radius:0}
}`;

  // ── Data helpers ───────────────────────────────────────
  const fullName = r => `${r.first_name || ''} ${r.last_name || ''}`.trim();
  const regDate = () => new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
  const barcodeValue = r => 'EPLUS-' + (r.id || '');
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
  function renderBarcode(el, value, doc) {
    el.innerHTML = '';
    if (typeof JsBarcode === 'undefined') return;
    try {
      const svg = (doc || document).createElementNS('http://www.w3.org/2000/svg', 'svg');
      el.appendChild(svg);
      JsBarcode(svg, value, Object.assign({}, BARCODE_OPTS, { xmlDocument: doc || document }));
    } catch (e) { console.error('[StudentCardRenderer] barcode error:', e); }
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

  return {
    CARD_W, CARD_H, QR_SIZE, BARCODE_OPTS, CARD_CSS,
    fullName, regDate, barcodeValue, qrUrl,
    injectCSS, renderPair, portalFaces, buildPrintHTML, hydratePrint, hydrateRoot
  };
})();

window.StudentCardRenderer = StudentCardRenderer;
