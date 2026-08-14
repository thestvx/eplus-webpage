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
//
//  A4 MULTI-CARD SHEETS:
//  Card designs are pre-printed onto A4 (210 × 297 mm). A saved SHEET
//  LAYOUT (localStorage) defines an ordered list of card SLOTS (x/y/w/h/
//  rotation on the A4). The data layer is printed only inside the chosen
//  slot using the same slot-relative CAL coordinates, so the site prints
//  ONLY the transparent data layer over the pre-printed A4. A separate
//  test sheet prints the slot outlines for overlay verification.
// ═══════════════════════════════════════════════════════════

const StudentCardRenderer = (function () {
  const FRONT_IMG = 'studentidcard/studentidcardfront1.jpg';
  const BACK_IMG = 'studentidcard/studentidcardback1.jpg';
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
    bc:     { x: 23.5, y: 39.08, w: null, h: null },
    textColor: 'black',
    // Independent background rectangles behind the QR and the barcode.
    // Calibrated in the CARD section (not per A4 slot); z-order: design →
    // rectangle → QR/barcode. mm coordinates.
    qrBg: { x: 4.3, y: 2.8, w: 19.4, h: 19.4, color: '#ffffff', radius: 2.0, z: 0 },
    bcBg: { x: 21.3, y: 38.6, w: 43.0, h: 15.38, color: '#ffffff', radius: 1.6, z: 0 },
    // User-added design shapes (squares/rectangles) drawn in the data layer
    // of every card. Each: { x, y, w, h, color, radius, z } in mm.
    shapes: []
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
      ['name', 'id', 'stream', 'date', 'label', 'qr', 'bc', 'qrBg', 'bcBg'].forEach(k => {
        const v = saved[k];
        if (v && typeof v === 'object') {
          ['x', 'y', 'w', 'h', 'fontSize', 'gap', 'maxWidth', 'radius', 'z'].forEach(p => {
            if (typeof v[p] === 'number' && isFinite(v[p])) cal[k][p] = v[p];
          });
          if (typeof v.color === 'string' && /^#([0-9a-fA-F]{3,8})$/.test(v.color)) cal[k].color = v.color;
        }
      });
      if (saved.textColor === 'white' || saved.textColor === 'black') cal.textColor = saved.textColor;
      if (Array.isArray(saved.shapes)) {
        cal.shapes = saved.shapes
          .map(s => s && typeof s === 'object' ? {
            x: isFinite(s.x) ? s.x : 0,
            y: isFinite(s.y) ? s.y : 0,
            w: isFinite(s.w) ? s.w : 10,
            h: isFinite(s.h) ? s.h : 10,
            color: typeof s.color === 'string' && /^#([0-9a-fA-F]{3,8})$/.test(s.color) ? s.color : '#e2e8f0',
            radius: isFinite(s.radius) ? s.radius : 0,
            z: isFinite(s.z) ? s.z : 0
          } : null)
          .filter(Boolean);
      }
    }
    ['name', 'id', 'stream', 'date', 'qr', 'bc', 'qrBg', 'bcBg'].forEach(k => {
      cal[k].x = Math.min(Math.max(0, cal[k].x), CARD_W_MM);
      cal[k].y = Math.min(Math.max(0, cal[k].y), CARD_H_MM);
      if (cal[k].w !== null && cal[k].w !== undefined) cal[k].w = Math.min(Math.max(1, cal[k].w), CARD_W_MM);
      if (cal[k].h !== null && cal[k].h !== undefined) cal[k].h = Math.min(Math.max(1, cal[k].h), CARD_H_MM);
      if (cal[k].fontSize !== undefined) cal[k].fontSize = Math.min(Math.max(1, cal[k].fontSize), 12);
      if (cal[k].radius !== undefined) cal[k].radius = Math.min(Math.max(0, cal[k].radius), 20);
      if (cal[k].z !== undefined) cal[k].z = Math.min(Math.max(-10, cal[k].z), 10);
    });
    cal.shapes.forEach(s => {
      s.x = Math.min(Math.max(0, s.x), CARD_W_MM);
      s.y = Math.min(Math.max(0, s.y), CARD_H_MM);
      s.w = Math.min(Math.max(1, s.w), CARD_W_MM);
      s.h = Math.min(Math.max(1, s.h), CARD_H_MM);
      s.radius = Math.min(Math.max(0, s.radius), 20);
      s.z = Math.min(Math.max(-10, s.z), 10);
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
  // User-added design shapes (squares/rectangles). addShape appends a new
  // default shape and persists the whole calibration in one source, so it
  // shows up in every print stage.
  function addShape(partial) {
    const s = Object.assign({ x: 5, y: 5, w: 30, h: 20, color: '#e2e8f0', radius: 2, z: 0 }, partial || {});
    const c = _clone(CAL);
    c.shapes.push(s);
    return saveCalibration(c);
  }
  function removeShape(index) {
    const c = _clone(CAL);
    if (!c.shapes[index]) return getCalibration();
    c.shapes.splice(index, 1);
    return saveCalibration(c);
  }

  // ── A4 SHEET LAYOUT (multi-card printing) ───────────────
  // Cards are pre-printed on A4 (210 × 297 mm). A SHEET is an ordered
  // list of SLOTS; each slot is an absolute position/size/rotation on the
  // A4. The data layer is printed inside the chosen slot using the SAME
  // CAL (slot-relative) coordinates, so a saved sheet + saved calibration
  // reproduce any student on any slot of the pre-printed A4.
  const SHEET_STORE_KEY = 'eplus-a4-layout-v1';
  const A4_W_MM = 210;
  const A4_H_MM = 297;

  function _num(v, def, min, max) {
    v = parseFloat(v);
    if (!isFinite(v)) v = def;
    return +(Math.min(Math.max(v, min), max)).toFixed(2);
  }
  function _r2(v) { return Math.round(v * 100) / 100; }
  function _readSheet() {
    try { return JSON.parse(window.localStorage.getItem(SHEET_STORE_KEY) || 'null'); }
    catch (e) { return null; }
  }
  function _writeSheet(s) {
    try { window.localStorage.setItem(SHEET_STORE_KEY, JSON.stringify(s)); return true; }
    catch (e) { return false; }
  }
  function _clearSheet() { try { window.localStorage.removeItem(SHEET_STORE_KEY); } catch (e) {} }

  function _mergeSheet(s) {
    if (!s || !Array.isArray(s.slots)) return null;
    const slots = [];
    s.slots.forEach(sl => {
      if (!sl || typeof sl !== 'object') return;
      const w = _num(sl.w, CARD_W_MM, 10, A4_W_MM);
      const h = _num(sl.h, CARD_H_MM, 10, A4_H_MM);
      const x = _num(sl.x, 0, 0, A4_W_MM - w);
      const y = _num(sl.y, 0, 0, A4_H_MM - h);
      const rot = _num(sl.rot, 0, -360, 360);
      const label = (typeof sl.label === 'string' && sl.label.trim()) ? String(sl.label).slice(0, 40) : null;
      const slot = { x, y, w, h, rot };
      if (label) slot.label = label;
      slots.push(slot);
    });
    const out = { slots };
    if (s.flip === 'long' || s.flip === 'short') out.flip = s.flip;
    return out;
  }

  let SHEET = _mergeSheet(_readSheet());

  function getSheetLayout() { return SHEET ? _clone(SHEET) : null; }
  function setSheetLayout(sheet) { SHEET = _mergeSheet(sheet); return getSheetLayout(); }
  function saveSheetLayout(sheet) { const s = setSheetLayout(sheet); if (s) _writeSheet(s); return s; }
  function resetSheetLayout() { SHEET = null; _clearSheet(); return null; }
  function sheetStorageKey() { return SHEET_STORE_KEY; }

  // Convenience default arrangement: cols×rows grid of card-sized slots
  // evenly spaced on the A4 sheet (used by the sheet editor / first run).
  function defaultSlotGrid(cols, rows) {
    cols = cols || 2; rows = rows || 4;
    const w = CARD_W_MM, h = CARD_H_MM;
    const gapX = Math.max(5, (A4_W_MM - cols * w) / (cols + 1));
    const gapY = Math.max(5, (A4_H_MM - rows * h) / (rows + 1));
    const slots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        slots.push({
          x: +(gapX + c * (w + gapX)).toFixed(2),
          y: +(gapY + r * (h + gapY)).toFixed(2),
          w, h, rot: 0
        });
      }
    }
    return slots;
  }

  // ── Back-of-sheet flip (front/back matching on the SAME A4 sheet) ──
  // The sheet is printed FRONT first, then re-fed after a physical flip to
  // print the BACK. The back face's feed coordinates are the mirror image of
  // the front face, so a slot must be mirrored to land exactly BEHIND its
  // front counterpart:
  //   'long'  → flip around the long edge (page turn): x = W − x − w
  //   'short' → tumble around the short edge:            y = H − y − h
  // Rotation direction reverses under the mirror.
  // Both faces always use the SAME source CARD_SLOTS — the back only applies
  // this deterministic geometric transform (never its own layout).
  function flipSlot(s, method) {
    const x = s.x, y = s.y, w = s.w, h = s.h, rot = s.rot || 0;
    if (method === 'long') return { x: _r2(A4_W_MM - x - w), y, w, h, rot: _r2(-rot) };
    if (method === 'short') return { x, y: _r2(A4_H_MM - y - h), w, h, rot: _r2(-rot) };
    return { x, y, w, h, rot };
  }
  function flipSlots(slots, method) {
    if (!Array.isArray(slots)) return slots;
    return slots.map(s => flipSlot(s, method));
  }

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
  // scope (optional) prefixes every selector so a second data layer can
  // coexist with the card-scale one (A4 sheet editor / admin A4 preview).
  //
  // WHITE FRAMES (replaced by the calibratable background rectangles below):
  //  • QR and barcode each get a real coloured rectangle (default white) with
  //    configurable x/y/w/h/color/radius/z, calibrated in the CARD section.
  //    They sit BEHIND the QR/barcode only — never behind the student text.
  //  • The student text rows (name / Student ID / stream / date) stay PURE
  //    TEXT — no background, no border, no card behind them.
  const TEXT_COLORS = {
    black: { color: '#0b1b3f', shadow: '0 0 1.5px rgba(255,255,255,0.85)', stroke: 'rgba(255,255,255,0.9)' },
    white: { color: '#ffffff', shadow: '0 0 1.5px rgba(0,0,0,0.6)', stroke: '#0b1b3f' }
  };
  function dlRules(unit, sx, sy, scope) {
    const sc = scope ? scope + ' ' : '';
    const X = v => (v * sx).toFixed(3) + unit;
    const Y = v => (v * sy).toFixed(3) + unit;
    const box = bcBox();
    const tc = TEXT_COLORS[CAL.textColor] || TEXT_COLORS.black;
    const sw = unit === 'px' ? '1.4px' : '0.3mm';
    return `
${sc}.ec-dl{position:absolute;inset:0;direction:rtl;text-align:right}
${sc}.ec-dl-row{position:absolute;text-align:right;max-width:${X(CAL.label.maxWidth)};z-index:1}
${sc}.ec-dl-label{display:block;font-weight:700;line-height:1.2;color:${tc.color};text-shadow:${tc.shadow};-webkit-text-stroke:${sw} ${tc.stroke};paint-order:stroke fill}
${sc}.ec-dl-value{display:block;font-weight:900;line-height:1.28;color:${tc.color};text-shadow:${tc.shadow};-webkit-text-stroke:${sw} ${tc.stroke};paint-order:stroke fill}
${sc}.ec-dl-value.id{font-family:'Courier New',monospace;font-weight:800;letter-spacing:0.5px}
${sc}.ec-dl-r1{right:${X(CARD_W_MM - CAL.name.x)};top:${Y(CAL.name.y)}}
${sc}.ec-dl-r2{right:${X(CARD_W_MM - CAL.id.x)};top:${Y(CAL.id.y)}}
${sc}.ec-dl-r3{right:${X(CARD_W_MM - CAL.stream.x)};top:${Y(CAL.stream.y)}}
${sc}.ec-dl-r4{right:${X(CARD_W_MM - CAL.date.x)};top:${Y(CAL.date.y)}}
${sc}.ec-dl-r1 .ec-dl-label,${sc}.ec-dl-r2 .ec-dl-label,${sc}.ec-dl-r3 .ec-dl-label,${sc}.ec-dl-r4 .ec-dl-label{font-size:${X(CAL.label.fontSize)};margin-bottom:${Y(CAL.label.gap)}}
${sc}.ec-dl-r1 .ec-dl-value{font-size:${X(CAL.name.fontSize)}}
${sc}.ec-dl-r2 .ec-dl-value{font-size:${X(CAL.id.fontSize)}}
${sc}.ec-dl-r3 .ec-dl-value{font-size:${X(CAL.stream.fontSize)}}
${sc}.ec-dl-r4 .ec-dl-value{font-size:${X(CAL.date.fontSize)}}
${sc}.ec-dl-qrbg{position:absolute;left:${X(CAL.qrBg.x)};top:${Y(CAL.qrBg.y)};width:${X(CAL.qrBg.w)};height:${Y(CAL.qrBg.h)};background:${CAL.qrBg.color};border-radius:${Y(CAL.qrBg.radius)};z-index:${CAL.qrBg.z}}
${sc}.ec-dl-bcbg{position:absolute;left:${X(CAL.bcBg.x)};top:${Y(CAL.bcBg.y)};width:${X(CAL.bcBg.w)};height:${Y(CAL.bcBg.h)};background:${CAL.bcBg.color};border-radius:${Y(CAL.bcBg.radius)};z-index:${CAL.bcBg.z}}
${sc}.ec-dl-qr{position:absolute;left:${X(CAL.qr.x)};top:${Y(CAL.qr.y)};width:${X(CAL.qr.w)};height:${Y(CAL.qr.h)};display:flex;align-items:center;justify-content:center;z-index:2}
${sc}.ec-dl-qr img,${sc}.ec-dl-qr canvas{width:100%!important;height:100%!important;position:relative;z-index:1}
${sc}.ec-dl-bc{position:absolute;left:${X(CAL.bc.x)};top:${Y(CAL.bc.y)};width:${X(box.w)};height:${Y(box.h)};display:flex;align-items:center;justify-content:center;z-index:2}
${sc}.ec-dl-bc svg{width:${X(box.w)}!important;height:${Y(box.h)}!important;max-width:none;display:block;position:relative;z-index:1}
${sc}.ec-dl-shape{position:absolute;box-sizing:border-box}
${CAL.shapes.map((s, i) => `${sc}.ec-dl-shape${i}{left:${X(s.x)};top:${Y(s.y)};width:${X(s.w)};height:${Y(s.h)};background:${s.color};border-radius:${Y(s.radius)};z-index:${s.z}}`).join('')}
`;
  }

  function cardCSS() {
    return `
.ec-card{width:${CARD_W}px;height:${CARD_H}px;position:relative;overflow:hidden;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);flex-shrink:0;font-family:'Tajawal',Arial,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ec-card img.bg{width:100%;height:100%;object-fit:cover;display:block}
.ec-overlay{position:absolute;inset:0}
.ec-back.no-design .bg{display:none!important}
.ec-front-fallback,.ec-back-fallback{position:absolute;inset:0;display:block;width:100%;height:100%}
${dlRules('px', CARD_W / CARD_W_MM, CARD_H / CARD_H_MM)}
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
      <div class="ec-dl-qrbg" data-cal="qrbg"></div>
      <div class="ec-dl-qr" data-ec-role="qr" data-cal="qr"></div>
      <div class="ec-dl-bcbg" data-cal="bcbg"></div>
      <div class="ec-dl-bc" data-ec-role="barcode" data-cal="barcode"></div>
      ${CAL.shapes.map((s, i) => `<div class="ec-dl-shape ec-dl-shape${i}" data-cal="shape${i}"></div>`).join('')}
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
    s += `<div class="ec-g-rect" style="left:${P(CAL.qrBg.x)};top:${P(CAL.qrBg.y)};width:${P(CAL.qrBg.w)};height:${P(CAL.qrBg.h)};background:${CAL.qrBg.color}"></div>`;
    s += `<div class="ec-g-rect" style="left:${P(CAL.bcBg.x)};top:${P(CAL.bcBg.y)};width:${P(CAL.bcBg.w)};height:${P(CAL.bcBg.h)};background:${CAL.bcBg.color}"></div>`;
    CAL.shapes.forEach(sh => {
      s += `<div class="ec-g-rect" style="left:${P(sh.x)};top:${P(sh.y)};width:${P(sh.w)};height:${P(sh.h)};background:${sh.color}"></div>`;
    });
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
.ec-grid .ec-g-rect{position:absolute;opacity:0.40;border:0.2mm solid #d32f2f;box-sizing:border-box}
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
  @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  .ec-data-layer { position: relative; width: ${CARD_W_MM}mm; height: ${CARD_H_MM}mm; overflow: hidden; font-family: 'Tajawal', Arial, sans-serif; }
  ${dlRules('mm', 1, 1)}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script src="js/studentCardRenderer.js?v=10"><\/script>
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
  @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  .wrap { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
  .cap { font-family: monospace; font-size: 15px; color: #334155; letter-spacing: 2px; }
  @media print { .cap { display: none; } }
</style>
</head><body>
  <div class="wrap"><div class="cap">${value}</div><div id="bc"></div></div>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<script src="js/studentCardRenderer.js?v=10"></script>
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

  // ── A4 sheet geometry/style helpers (unit='mm' for print,
  //    unit='px' for on-screen with a scale) ────────────────
  function _u(su, U, v) { return (v * U).toFixed(3) + su; }
  function a4SlotStyle(slot, unit, scale) {
    const su = unit === 'px' ? 'px' : 'mm';
    const U = unit === 'px' ? (scale || 1) : 1;
    return `left:${_u(su,U,slot.x)};top:${_u(su,U,slot.y)};width:${_u(su,U,slot.w)};height:${_u(su,U,slot.h)};transform:rotate(${(slot.rot||0)}deg);transform-origin:0 0`;
  }

  const A4_GRID_CSS = `
.ec-a4-grid{position:absolute;inset:0;pointer-events:none;direction:ltr}
.ec-a4-grid .ag{position:absolute;display:block;background:#111}
.ec-a4-grid .ag-v{top:0;bottom:0;width:0.2mm}
.ec-a4-grid .ag-h{left:0;right:0;height:0.2mm}
.ec-a4-grid .ag-min{opacity:0.05}
.ec-a4-grid .ag-maj{opacity:0.2}
.ec-a4-grid .ag-cen{background:#d32f2f;opacity:0.55}
`;

  function a4SheetCSS(unit, scale) {
    const su = unit === 'px' ? 'px' : 'mm';
    const U = unit === 'px' ? (scale || 1) : 1;
    const L = v => _u(su, U, v);
    return `
.ec-a4{position:relative;width:${L(A4_W_MM)};height:${L(A4_H_MM)};overflow:hidden;background:#ffffff;direction:ltr;font-family:'Tajawal',Arial,sans-serif}
.ec-a4-slot{position:absolute;transform-origin:0 0}
.ec-a4-data{position:absolute}
${A4_GRID_CSS}`;
  }

  function a4GridOverlayHTML(unit, scale) {
    const su = unit === 'px' ? 'px' : 'mm';
    const U = unit === 'px' ? (scale || 1) : 1;
    const P = v => _u(su, U, v);
    let s = '<div class="ec-a4-grid">';
    for (let i = 1; i < Math.round(A4_W_MM); i++) {
      if (i % 10 === 0) s += `<div class="ag ag-v ag-maj" style="left:${P(i)}"></div>`;
      else if (i % 5 !== 0) s += `<div class="ag ag-v ag-min" style="left:${P(i)}"></div>`;
    }
    for (let i = 1; i < Math.round(A4_H_MM); i++) {
      if (i % 10 === 0) s += `<div class="ag ag-h ag-maj" style="top:${P(i)}"></div>`;
      else if (i % 5 !== 0) s += `<div class="ag ag-h ag-min" style="top:${P(i)}"></div>`;
    }
    s += `<div class="ag ag-v ag-cen" style="left:${P(A4_W_MM / 2)}"></div>`;
    s += `<div class="ag ag-h ag-cen" style="top:${P(A4_H_MM / 2)}"></div>`;
    s += '</div>';
    return s;
  }

  // Data-box geometry inside a slot: the card (CAL coordinates) is scaled
  // UNIFORMLY to fit while preserving aspect, then centred — so the data
  // layer always lines up with an object-fit:contain design image.
  function a4DataGeom(slot) {
    const sc = Math.min(slot.w / CARD_W_MM, slot.h / CARD_H_MM);
    const dw = CARD_W_MM * sc, dh = CARD_H_MM * sc;
    return { sc, dw, dh, dx: (slot.w - dw) / 2, dy: (slot.h - dh) / 2 };
  }
  function a4DataStyle(slot, unit, scale) {
    const su = unit === 'px' ? 'px' : 'mm';
    const U = unit === 'px' ? (scale || 1) : 1;
    const g = a4DataGeom(slot);
    return `left:${_u(su,U,g.dx)};top:${_u(su,U,g.dy)};width:${_u(su,U,g.dw)};height:${_u(su,U,g.dh)}`;
  }

  // Print ONLY the transparent data layer for one student on ONE slot of a
  // pre-printed A4 sheet. 210×297 mm page, transparent background (never
  // prints white over the design). No slot outlines, no grid, no designs.
  // The back card design is shown on screen ONLY (hidden in @media print) so
  // the print PREVIEW looks exactly like the finished sheet (design + data);
  // the actual print emits just the transparent data layer. If the saved
  // sheet layout (or opts.flip) has a flip method, the chosen slot is first
  // mirrored to the back-of-sheet feed coordinates (x = 210−x−w / y = 297−y−h)
  // so the data lands on the back of the correct card. The content is NOT
  // mirrored: paper alignment comes from the slot position transform only,
  // and the image/data keep their natural orientation (right stays right).
  function buildA4PrintHTML(r, slotIndex, opts) {
    const sheet = (opts && opts.sheet) || getSheetLayout();
    if (!sheet || !sheet.slots || !sheet.slots[slotIndex]) return null;
    let slot = sheet.slots[slotIndex];
    const flip = (opts && opts.flip) || sheet.flip || null;
    if (flip) slot = flipSlot(slot, flip);
    const data = JSON.stringify(r).replace(/<\//g, '<\\/');
    const g = a4DataGeom(slot);
    const sc = g.sc;
    const ghostStyle = a4DataStyle(slot, 'mm', 1);
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>بطاقة الطالب - ${fullName(r)}</title>
<style>
  @page { size: ${A4_W_MM}mm ${A4_H_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: transparent; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  * { box-sizing: border-box; }
  @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .ec-a4-ghost { display: none !important; } }
  .ec-a4 { position: relative; width: ${A4_W_MM}mm; height: ${A4_H_MM}mm; overflow: hidden; }
  .ec-a4-slot { position: absolute; transform-origin: 0 0; }
  .ec-a4-ghost { position: absolute; overflow: hidden; }
  .ec-a4-ghost img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .ec-a4-data { position: absolute; }
  ${dlRules('mm', sc, sc)}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script src="js/studentCardRenderer.js?v=10"><\/script>
</head><body>
<div class="ec-a4">
  <div class="ec-a4-slot" style="${a4SlotStyle(slot, 'mm', 1)}">
    <div class="ec-a4-ghost" style="${ghostStyle}"><img src="${BACK_IMG}" alt=""></div>
    <div class="ec-a4-data" style="${ghostStyle}">${dataLayerHTML(r)}</div>
  </div>
</div>
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

  // White A4 test sheet: slot outlines + slot numbers (+ optional grid).
  // Printed on blank paper and laid over the pre-printed A4 to verify the
  // saved slot positions match the real card grid. No designs, no data.
  function buildA4TestSheetHTML(opts) {
    const sheet = getSheetLayout();
    if (!sheet || !sheet.slots || !sheet.slots.length) return null;
    const grid = opts && opts.grid ? a4GridOverlayHTML('mm', 1) : '';
    const slots = sheet.slots.map((s, i) =>
      `<div class="ec-a4-test-slot" style="${a4SlotStyle(s, 'mm', 1)}"><span class="ec-a4-num">بطاقة #${i + 1}</span></div>`
    ).join('');
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>اختبار تخطيط A4</title>
<style>
  @page { size: ${A4_W_MM}mm ${A4_H_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  * { box-sizing: border-box; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  .ec-a4 { position: relative; width: ${A4_W_MM}mm; height: ${A4_H_MM}mm; }
  ${A4_GRID_CSS}
  .ec-a4-test-slot { position: absolute; border: 0.4mm solid #d32f2f; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
  .ec-a4-num { font-family: 'Tajawal', Arial, sans-serif; font-weight: 700; font-size: 34pt; color: #d32f2f; }
</style>
</head><body>
<div class="ec-a4">${slots}${grid}</div>
<script>
  setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 300);
  window.onafterprint = function () { setTimeout(function () { try { window.close(); } catch (e) {} }, 250); };
<\/script>
</body></html>`;
  }

  return {
    CARD_W, CARD_H, CARD_W_MM, CARD_H_MM, A4_W_MM, A4_H_MM, QR_SIZE, CAL, CAL_DEFAULTS, BARCODE_OPTS, BARCODE_STD,
    cardCSS, barcodeSpec, bcBox,
    getCalibration, setCalibration, saveCalibration, resetCalibration, calibrationStorageKey,
    addShape, removeShape,
    getSheetLayout, setSheetLayout, saveSheetLayout, resetSheetLayout, sheetStorageKey, defaultSlotGrid,
    flipSlot, flipSlots,
    fullName, streamOf, regDate, barcodeValue, qrUrl,
    injectCSS, renderPair, portalFaces, buildPrintHTML, hydratePrint, hydrateRoot,
    dataLayerHTML, dlRules, gridOverlayHTML, GRID_CSS,
    a4SheetCSS, a4SlotStyle, a4DataStyle, a4DataGeom, a4GridOverlayHTML, A4_GRID_CSS,
    buildA4PrintHTML, buildA4TestSheetHTML,
    renderBarcodeSVG, buildBarcodePrintHTML
  };
})();

window.StudentCardRenderer = StudentCardRenderer;
