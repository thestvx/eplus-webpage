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
//  A4 MULTI-CARD SHEETS (two-pass workflow):
//  Step 1 — buildA4FrontSheetHTML(): prints the FRONT sheet with the 4 card
//  designs (studentidcardfront1.jpg) at the saved CARD_SLOTS — the master
//  grid: all cards centred on A4 (same X), stacked vertically with EQUAL gaps.
//  Step 2 — buildA4BackSheetHTML(): prints the BACK sheet — the back design
//  (studentidcardback1.jpg) plus a SOLID WHITE QR square and a SOLID WHITE
//  barcode rectangle on EVERY card (no student data), so the sheet is ready
//  to receive the data layer later. It prints at the SAME CARD_SLOTS as the
//  front sheet (preview == print, no flip).
//  Step 3 — buildA4PrintHTML(): after re-feeding the same paper, prints the
//  student data for ONE chosen card inside its slot — the transparent data
//  layer only ('info', the daily workflow) or the back design + data ('back').
//  ALL faces use the SAME CARD_SLOTS at the SAME X/Y/W/H — no mirror, no
//  scaleX(-1), no rotateY, no feed shift — so Front #N == Back #N ==
//  the data of card #N at the same coordinates.
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
    // Colors of the printed data layer (saved in the SAME calibration store,
    // so admin/portal prints pick them up automatically). Text accepts any
    // hex; 'white'/'black' legacy keys are normalized on load.
    textColor: '#0b1b3f',
    qrColor: '#000000',
    bcColor: '#000000',
    // Optional solid fill BEHIND the student text rows only (element-scoped,
    // never the whole card). 'transparent' = no background painted.
    textBgColor: 'transparent',
    // Background fill behind the QR and the barcode (white by default so the
    // QR/barcode stay readable on the pre-printed design). Their POSITION and
    // SIZE are DERIVED from the QR/barcode data boxes (qrBgGeom/bcBgGeom) so
    // the white area is exactly the size of the printed QR/barcode; only the
    // color / radius / z below are calibrated. z-order: design → white rect →
    // QR/barcode.
    qrBg: { color: '#ffffff', radius: 0, z: 0 },
    bcBg: { color: '#ffffff', radius: 0, z: 0 },
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
  // Normalize a color value: accept '#rgb'/'#rrggbb'/'#rrggbbaa' hex and the
  // literal 'transparent'. Anything else falls back to `def`.
  function _normColor(v, def) {
    if (typeof v !== 'string') return def;
    v = v.trim().toLowerCase();
    if (v === 'transparent') return 'transparent';
    if (v.charAt(0) === '#') {
      const hex = v.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        v = '#' + hex.split('').map(c => c + c).join('');
        return /^#([0-9a-f]{6}|[0-9a-f]{8})$/.test(v) ? v : def;
      }
      return /^#[0-9a-f]{6}$|^#[0-9a-f]{8}$/.test(v) ? v : def;
    }
    return def;
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
          ['x', 'y', 'w', 'h', 'fontSize', 'gap', 'maxWidth', 'radius', 'z'].forEach(p => {
            if (typeof v[p] === 'number' && isFinite(v[p])) cal[k][p] = v[p];
          });
          if (typeof v.color === 'string') cal[k].color = _normColor(v.color, cal[k].color);
        }
      });
      ['qrBg', 'bcBg'].forEach(k => {
        const v = saved[k];
        if (v && typeof v === 'object') {
          if (typeof v.radius === 'number' && isFinite(v.radius)) cal[k].radius = v.radius;
          if (typeof v.z === 'number' && isFinite(v.z)) cal[k].z = v.z;
          if (typeof v.color === 'string') cal[k].color = _normColor(v.color, cal[k].color);
        }
      });
      if (saved.textColor !== undefined) {
        const t = saved.textColor;
        if (t === 'white') cal.textColor = '#ffffff';
        else if (t === 'black') cal.textColor = '#0b1b3f';
        else cal.textColor = _normColor(t, cal.textColor);
      }
      if (saved.qrColor !== undefined) cal.qrColor = _normColor(saved.qrColor, cal.qrColor);
      if (saved.bcColor !== undefined) cal.bcColor = _normColor(saved.bcColor, cal.bcColor);
      if (saved.textBgColor !== undefined) cal.textBgColor = _normColor(saved.textBgColor, cal.textBgColor);
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
    ['name', 'id', 'stream', 'date', 'label', 'qr', 'bc', 'qrBg', 'bcBg'].forEach(k => {
      if (cal[k].fontSize !== undefined) cal[k].fontSize = Math.min(Math.max(1, cal[k].fontSize), 12);
      if (cal[k].radius !== undefined) cal[k].radius = Math.min(Math.max(0, cal[k].radius), 20);
      if (cal[k].z !== undefined) cal[k].z = Math.min(Math.max(-10, cal[k].z), 10);
    });
    ['name', 'id', 'stream', 'date', 'qr', 'bc'].forEach(k => {
      cal[k].x = Math.min(Math.max(0, cal[k].x), CARD_W_MM);
      cal[k].y = Math.min(Math.max(0, cal[k].y), CARD_H_MM);
      if (cal[k].w !== null && cal[k].w !== undefined) cal[k].w = Math.min(Math.max(1, cal[k].w), CARD_W_MM);
      if (cal[k].h !== null && cal[k].h !== undefined) cal[k].h = Math.min(Math.max(1, cal[k].h), CARD_H_MM);
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

  // ── A4 SHEET LAYOUT (multi-card printing) ──────────────â”€
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
    if (!s || typeof s !== 'object') return null;
    let params = null;
    let slots = null;
    if (s.params && typeof s.params === 'object') {
      // New layout: 4 cards derived from cardW/cardH/centerX/startY/gapY.
      params = _mergeParams(s.params);
      slots = slotsFromParams(params);
    } else if (Array.isArray(s.slots) && s.slots.length) {
      // Legacy sheet (per-card slots, typically an 8-card grid). Migrate to
      // the param model: keep the first card's size/rotation and its Y column,
      // and derive the vertical gap from the same-column next card.
      const raw = [];
      s.slots.forEach(sl => {
        if (!sl || typeof sl !== 'object') return;
        const w = _num(sl.w, CARD_W_MM, 10, A4_W_MM);
        const h = _num(sl.h, CARD_H_MM, 10, A4_H_MM);
        raw.push({
          x: _num(sl.x, 0, 0, A4_W_MM - w),
          y: _num(sl.y, 0, 0, A4_H_MM - h),
          w,
          h,
          rot: _num(sl.rot, 0, -360, 360)
        });
      });
      if (!raw.length) return null;
      const first = raw[0];
      const next = raw[2] || raw[1];
      const gapY = next ? Math.max(0, +(next.y - first.y - first.h).toFixed(2)) : CARD_PARAMS_DEFAULTS.gapY;
      params = {
        cards: 4,
        cardW: first.w,
        cardH: first.h,
        centerX: +(first.x + first.w / 2).toFixed(2),
        startY: first.y,
        gapY,
        rot: first.rot || 0
      };
      slots = slotsFromParams(params);
    }
    if (!params || !slots) return null;
    const out = { params, slots };
    if (s.flip === 'long' || s.flip === 'short') out.flip = s.flip;
    // Duplex paper mode + ONE global back-face offset (mm), applied to ALL
    // cards once. 'long'/'short' mirror the back POSITION (never the image)
    // to match a manual paper flip; 'none' = the printer flips automatically.
    // Legacy sheets that only saved `flip` derive their duplex mode from it.
    let dMode = (s.duplex && s.duplex.mode === 'long') ? 'long'
      : (s.duplex && s.duplex.mode === 'short') ? 'short' : null;
    if (!dMode && (s.flip === 'long' || s.flip === 'short')) dMode = s.flip;
    out.duplex = {
      mode: dMode || 'none',
      dx: _num(s.duplex && s.duplex.dx, 0, -50, 50),
      dy: _num(s.duplex && s.duplex.dy, 0, -50, 50)
    };
    return out;
  }

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

  // ── CARD_SLOTS (4 cards, single source of truth) ──────────────────────
  // The A4 sheet is defined by PARAMS (never per-card coordinates):
  //   cardW / cardH — the size of every card (mm)
  //   centerX       — the horizontal CENTER shared by all 4 cards (default 105)
  //   startY        — top of card #1 (the topmost, centred card)
  //   gapY          — equal vertical gap between cards (also the default top/bottom margin)
  //   rot           — rotation applied to every card (default 0)
  // Cards #1..#4 are DERIVED from these params, so the layout stays perfectly
  // centred and evenly spaced by construction. Everything (front sheet, back
  // sheet, data layer, preview, calibration) reads the same derived slots.
  const CARD_PARAMS_DEFAULTS = {
    cards: 4,
    cardW: CARD_W_MM,
    cardH: CARD_H_MM,
    centerX: +(A4_W_MM / 2).toFixed(2),
    startY: +((A4_H_MM - 4 * CARD_H_MM) / 5).toFixed(2),
    gapY: +((A4_H_MM - 4 * CARD_H_MM) / 5).toFixed(2),
    rot: 0
  };

  function _mergeParams(p) {
    const d = CARD_PARAMS_DEFAULTS;
    const w = _num(p.cardW, d.cardW, 10, A4_W_MM);
    const h = _num(p.cardH, d.cardH, 10, A4_H_MM);
    const gap = _num(p.gapY, +((A4_H_MM - 4 * h) / 5).toFixed(2), 0, A4_H_MM);
    return {
      cards: 4,
      cardW: w,
      cardH: h,
      centerX: _num(p.centerX, A4_W_MM / 2, 0, A4_W_MM),
      startY: _num(p.startY, +( (A4_H_MM - 4 * h) / 5 ).toFixed(2), 0, A4_H_MM - h),
      gapY: gap,
      rot: _num(p.rot, 0, -360, 360)
    };
  }

  // Derive the 4 card slots from a params object (single geometry source).
  function slotsFromParams(p) {
    const par = _mergeParams(p || {});
    const x = +Math.min(Math.max(par.centerX - par.cardW / 2, 0), A4_W_MM - par.cardW).toFixed(2);
    const slots = [];
    for (let i = 0; i < par.cards; i++) {
      slots.push({
        x,
        y: +(par.startY + i * (par.cardH + par.gapY)).toFixed(2),
        w: par.cardW,
        h: par.cardH,
        rot: par.rot
      });
    }
    return slots;
  }

  function defaultCardSlots() { return slotsFromParams(CARD_PARAMS_DEFAULTS); }
  function defaultSheetLayout() {
    return { params: _clone(CARD_PARAMS_DEFAULTS), slots: defaultCardSlots(), duplex: { mode: 'none', dx: 0, dy: 0 } };
  }
  function sheetParams() { return SHEET ? _clone(SHEET.params) : _clone(CARD_PARAMS_DEFAULTS); }

  // SHEET must be initialised AFTER CARD_PARAMS_DEFAULTS (line ~323) and the
  // params helpers, because _mergeSheet/_mergeParams read it while building
  // the merged layout — referencing a const during its TDZ throws.
  let SHEET = _mergeSheet(_readSheet());

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

  // ── A4 Duplex paper mode ────────────────────────────────────────────
  // The FRONT face prints at the raw CARD_SLOTS (the master grid — the single
  // reference). For the BACK face the SAME paper is physically flipped before
  // re-feeding, so the back content must be placed at the mirrored FEED
  // position to land exactly behind its front counterpart. This is a
  // POSITION-ONLY transform — the back image is NEVER mirrored (no scaleX(-1),
  // no rotateY(180°)); the design keeps its natural orientation. Only the
  // (x, y) is recomputed; width/height stay identical to the front slot.
  //   'long'  → flip around the long edge (page turn):  x' = W − x − w
  //   'short' → tumble around the short edge:          y' = H − y − h
  //   'none'  → the printer duplexes automatically (driver flips the sheet).
  // (dx, dy) is ONE global back-face offset (mm) that compensates the paper
  // feed tolerance of the printer and is applied to ALL 8 cards together —
  // it is never a per-card coordinate. Its sign is "observed deviation on the
  // duplex test sheet", i.e. entering +0.5 moves the printed back by −0.5 mm
  // physically so the total lands exactly on the front.
  function duplexFromSheet(sheet) {
    const d = (sheet && sheet.duplex) || {};
    const mode = (d.mode === 'long' || d.mode === 'short') ? d.mode
      : (sheet && (sheet.flip === 'long' || sheet.flip === 'short')) ? sheet.flip : 'none';
    return { mode, dx: _num(d.dx, 0, -50, 50), dy: _num(d.dy, 0, -50, 50) };
  }
  function duplexBackSlot(raw, mode, dx, dy) {
    // Feed position of a card's BACK content in the back print page.
    const shifted = { x: _r2(raw.x - (dx || 0)), y: _r2(raw.y - (dy || 0)), w: raw.w, h: raw.h, rot: raw.rot || 0 };
    const f = (mode === 'long' || mode === 'short') ? flipSlot(shifted, mode) : shifted;
    return { x: f.x, y: f.y, w: f.w, h: f.h, rot: f.rot };
  }
  function physicalBackSlot(raw, mode, dx, dy) {
    // Where the printed back content lands on the sheet in PHYSICAL
    // coordinates (used by the duplex overlay preview). flipSlot is an
    // involution, so this always equals raw − (dx, dy): with dx=dy=0 the back
    // lands exactly on the front slot.
    return flipSlot(duplexBackSlot(raw, mode, dx, dy), mode);
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

  // The white QR/barcode background rectangles are DERIVED from the QR/barcode
  // DATA boxes (same position, same size), so the printed white area is exactly
  // the size/position of the printed QR and barcode — no margin around them.
  // Only color / radius / z stay independently calibrated (CAL.qrBg / CAL.bcBg).
  function qrBgGeom() {
    return {
      x: CAL.qr.x, y: CAL.qr.y, w: CAL.qr.w, h: CAL.qr.h,
      color: CAL.qrBg.color, radius: CAL.qrBg.radius, z: CAL.qrBg.z
    };
  }
  function bcBgGeom() {
    const box = bcBox();
    return {
      x: CAL.bc.x, y: CAL.bc.y, w: box.w, h: box.h,
      color: CAL.bcBg.color, radius: CAL.bcBg.radius, z: CAL.bcBg.z
    };
  }

  // ── Data helpers ──────────────────────────────────────â”€
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
  // Text colours. The `color` is the REAL FILL that must reach the printer.
  // The `stroke`/`strokeW` are only a design accent and must NEVER replace the
  // fill. White text is rendered with a ZERO-width stroke (no shadow): the
  // solid #ffffff fill is the only thing painted, so it prints as SOLID WHITE
  // (a rim would dominate the thin Arabic glyphs and read as an outline).
  // Other colours keep the stronger white stroke for contrast (confirmed working).
  const TEXT_COLORS = {
    black: { color: '#0b1b3f', shadow: '0 0 1.5px rgba(255,255,255,0.85)', stroke: 'rgba(255,255,255,0.9)', strokeW: '1.4px', strokeWmm: '0.3mm' },
    white: { color: '#ffffff', shadow: 'none', stroke: '#0b1b3f', strokeW: '0px', strokeWmm: '0mm' }
  };

  // Resolve a text color to its full style. `c` may be a key ('white'/'black')
  // or an arbitrary hex (e.g. '#2548a1'). Any non-white hex gets the white
  // stroke accent so it stays legible on the pre-printed blue design.
  function textColorStyle(c) {
    if (c === 'white' || c === '#ffffff' || c === '#FFF') return TEXT_COLORS.white;
    if (c === 'black' || c === '#0b1b3f') return TEXT_COLORS.black;
    return { color: c, shadow: TEXT_COLORS.black.shadow, stroke: TEXT_COLORS.black.stroke, strokeW: TEXT_COLORS.black.strokeW, strokeWmm: TEXT_COLORS.black.strokeWmm };
  }

  function dlRules(unit, sx, sy, scope, textColor, opts) {
    const sc = scope ? scope + ' ' : '';
    const X = v => (v * sx).toFixed(3) + unit;
    const Y = v => (v * sy).toFixed(3) + unit;
    const box = bcBox();
    const tc = textColorStyle(textColor || CAL.textColor);
    const sw = unit === 'px' ? tc.strokeW : tc.strokeWmm;
    const textBg = CAL.textBgColor && CAL.textBgColor !== 'transparent'
      ? `background:${CAL.textBgColor};-webkit-print-color-adjust:exact;print-color-adjust:exact`
      : '';
    // omitBg: the info-only data layer adds ONLY the student text + QR +
    // barcode — the white QR/barcode backgrounds already live on the
    // pre-printed A4 back sheet, so they are NOT drawn here (avoids any
    // position/size mismatch). The back sheet itself draws them (solid fills).
    const omitBg = !!(opts && opts.omitBg);
    const GQ = qrBgGeom();
    const GB = bcBgGeom();
    return `
${sc}.ec-dl{position:absolute;inset:0;direction:rtl;unicode-bidi:plaintext;text-align:right;font-family:'Tajawal',Arial,sans-serif}
${sc}.ec-dl-row{position:absolute;text-align:right;max-width:${X(CAL.label.maxWidth)};z-index:1;${textBg}}
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
${omitBg ? '' : `${sc}.ec-dl-qrbg{position:absolute;left:${X(GQ.x)};top:${Y(GQ.y)};width:${X(GQ.w)};height:${Y(GQ.h)};z-index:${GQ.z};display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact}
${sc}.ec-dl-qrbg rect{width:100%;height:100%;fill:${GQ.color === 'transparent' ? 'none' : GQ.color};rx:${Y(GQ.radius)};ry:${Y(GQ.radius)};-webkit-print-color-adjust:exact;print-color-adjust:exact}
${sc}.ec-dl-bcbg{position:absolute;left:${X(GB.x)};top:${Y(GB.y)};width:${X(GB.w)};height:${Y(GB.h)};z-index:${GB.z};display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact}
${sc}.ec-dl-bcbg rect{width:100%;height:100%;fill:${GB.color === 'transparent' ? 'none' : GB.color};rx:${Y(GB.radius)};ry:${Y(GB.radius)};-webkit-print-color-adjust:exact;print-color-adjust:exact}`}
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

  // ── Markup builders (pure HTML, data-ec-role / data-cal hooks) ──â”€
  function frontHTML() {
    return `<div class="ec-card ec-front">
      <img class="bg ec-front-fallback" src="${FRONT_IMG}" onerror="this.style.background='linear-gradient(135deg,#6366f1,#8b5cf6)'" alt="">
    </div>`;
  }

  function dataLayerHTML(r, opts) {
    const n = fullName(r);
    const st = streamOf(r);
    const omitBg = !!(opts && opts.omitBg);
    const GQ = qrBgGeom();
    const GB = bcBgGeom();
    const streamRow = st
      ? `<div class="ec-dl-row ec-dl-r3" data-cal="stream"><span class="ec-dl-label">الشعبة</span><span class="ec-dl-value">${st}</span></div>`
      : '';
    const bgEls = omitBg ? '' : `
      <svg class="ec-dl-qrbg" data-cal="qrbg" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100%" height="100%" rx="${GQ.radius}" ry="${GQ.radius}" fill="${GQ.color === 'transparent' ? 'none' : GQ.color}"/></svg>
      <svg class="ec-dl-bcbg" data-cal="bcbg" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100%" height="100%" rx="${GB.radius}" ry="${GB.radius}" fill="${GB.color === 'transparent' ? 'none' : GB.color}"/></svg>`;
    const codeEls = `
      <div class="ec-dl-qr" data-ec-role="qr" data-cal="qr"></div>
      <div class="ec-dl-bc" data-ec-role="barcode" data-cal="barcode"></div>`;
    return `<div class="ec-dl">
      <div class="ec-dl-row ec-dl-r1" data-cal="name"><span class="ec-dl-label">الاسم الكامل</span><span class="ec-dl-value">${n}</span></div>
      <div class="ec-dl-row ec-dl-r2" data-cal="id"><span class="ec-dl-label">Student ID</span><span class="ec-dl-value id">${r.id || ''}</span></div>
      ${streamRow}
      <div class="ec-dl-row ec-dl-r4" data-cal="date"><span class="ec-dl-label">تاريخ التسجيل</span><span class="ec-dl-value date">${regDate(r)}</span></div>${bgEls}${codeEls}
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

  // ── Barcode / QR rendering ────────────────────────────â”€
  function renderBarcodeSVG(svg, value, doc) {
    if (!svg || typeof JsBarcode === 'undefined') return null;
    try {
      const bgFill = CAL.bcBg.color === 'transparent' ? 'none' : CAL.bcBg.color;
      JsBarcode(svg, value, Object.assign({}, BARCODE_OPTS, {
        lineColor: CAL.bcColor,
        background: bgFill,
        xmlDocument: doc || document
      }));
      svg.setAttribute('viewBox', '0 ' + SVG_MARGIN_PX + ' ' + SVG_WIDTH_PX + ' ' + SVG_CROP_HEIGHT_PX);
      const box = bcBox();
      svg.setAttribute('width', box.w + 'mm');
      svg.setAttribute('height', box.h + 'mm');
      svg.style.setProperty('max-width', 'none');
      svg.style.setProperty('width', box.w + 'mm');
      svg.style.setProperty('height', box.h + 'mm');
      // Bake the background rectangle as the FIRST painted element of the
      // barcode SVG. It is real vector content (not CSS background), so the
      // printer receives an actual filled rectangle behind the bars — even if
      // the browser drops CSS backgrounds during printing. Transparent mode
      // uses fill="none" (nothing painted).
      const NS = 'http://www.w3.org/2000/svg';
      const bg = (doc || document).createElementNS(NS, 'rect');
      bg.setAttribute('x', '0');
      bg.setAttribute('y', '0');
      bg.setAttribute('width', '100%');
      bg.setAttribute('height', '100%');
      bg.setAttribute('fill', bgFill);
      bg.setAttribute('rx', '0');
      bg.setAttribute('ry', '0');
      svg.insertBefore(bg, svg.firstChild);
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
      new QRCode(el, {
        text: url,
        width: px,
        height: px,
        colorDark: CAL.qrColor,
        colorLight: CAL.qrBg.color === 'transparent' ? 'rgba(255,255,255,0)' : CAL.qrBg.color,
        correctLevel: QRCode.CorrectLevel.M
      });
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
    const GQ = qrBgGeom(), GB = bcBgGeom();
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
    s += `<div class="ec-g-rect" style="left:${P(GQ.x)};top:${P(GQ.y)};width:${P(GQ.w)};height:${P(GQ.h)};background:${GQ.color === 'transparent' ? 'none' : GQ.color}"></div>`;
    s += `<div class="ec-g-rect" style="left:${P(GB.x)};top:${P(GB.y)};width:${P(GB.w)};height:${P(GB.h)};background:${GB.color === 'transparent' ? 'none' : GB.color}"></div>`;
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

  // ── Public API ────────────────────────────────────────â”€
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
  //
  // Local Tajawal @font-face (fonts/tajawal.css equivalents) so the printed
  // card renders REAL Arabic shaping even though the print window is a fresh
  // document.write page that does NOT inherit the site's Google Fonts link.
  const TAJWAL_FACES = `<style>
@font-face{font-family:'Tajawal';font-style:normal;font-weight:400;font-display:swap;src:url('fonts/Tajawal-Regular.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EC2-10EC4,U+10EFC-10EFF,U+1EE00-1EE03,U+1EE05-1EE1F,U+1EE21-1EE22,U+1EE24,U+1EE27,U+1EE29-1EE32,U+1EE34-1EE37,U+1EE39,U+1EE3B,U+1EE42,U+1EE47,U+1EE49,U+1EE4B,U+1EE4D-1EE4F,U+1EE51-1EE52,U+1EE54,U+1EE57,U+1EE59,U+1EE5B,U+1EE5D,U+1EE5F,U+1EE61-1EE62,U+1EE64,U+1EE67-1EE6A,U+1EE6C-1EE72,U+1EE74-1EE77,U+1EE79-1EE7C,U+1EE7E,U+1EE80-1EE89,U+1EE8B-1EE9B,U+1EEA1-1EEA3,U+1EEA5-1EEA9,U+1EEAB-1EEBB,U+1EEF0-1EEF1}
@font-face{font-family:'Tajawal';font-style:normal;font-weight:400;font-display:swap;src:url('fonts/Tajawal-Regular-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Tajawal';font-style:normal;font-weight:700;font-display:swap;src:url('fonts/Tajawal-Bold.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EC2-10EC4,U+10EFC-10EFF,U+1EE00-1EE03,U+1EE05-1EE1F,U+1EE21-1EE22,U+1EE24,U+1EE27,U+1EE29-1EE32,U+1EE34-1EE37,U+1EE39,U+1EE3B,U+1EE42,U+1EE47,U+1EE49,U+1EE4B,U+1EE4D-1EE4F,U+1EE51-1EE52,U+1EE54,U+1EE57,U+1EE59,U+1EE5B,U+1EE5D,U+1EE5F,U+1EE61-1EE62,U+1EE64,U+1EE67-1EE6A,U+1EE6C-1EE72,U+1EE74-1EE77,U+1EE79-1EE7C,U+1EE7E,U+1EE80-1EE89,U+1EE8B-1EE9B,U+1EEA1-1EEA3,U+1EEA5-1EEA9,U+1EEAB-1EEBB,U+1EEF0-1EEF1}
@font-face{font-family:'Tajawal';font-style:normal;font-weight:700;font-display:swap;src:url('fonts/Tajawal-Bold-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Tajawal';font-style:normal;font-weight:800;font-display:swap;src:url('fonts/Tajawal-ExtraBold.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EC2-10EC4,U+10EFC-10EFF,U+1EE00-1EE03,U+1EE05-1EE1F,U+1EE21-1EE22,U+1EE24,U+1EE27,U+1EE29-1EE32,U+1EE34-1EE37,U+1EE39,U+1EE3B,U+1EE42,U+1EE47,U+1EE49,U+1EE4B,U+1EE4D-1EE4F,U+1EE51-1EE52,U+1EE54,U+1EE57,U+1EE59,U+1EE5B,U+1EE5D,U+1EE5F,U+1EE61-1EE62,U+1EE64,U+1EE67-1EE6A,U+1EE6C-1EE72,U+1EE74-1EE77,U+1EE79-1EE7C,U+1EE7E,U+1EE80-1EE89,U+1EE8B-1EE9B,U+1EEA1-1EEA3,U+1EEA5-1EEA9,U+1EEAB-1EEBB,U+1EEF0-1EEF1}
@font-face{font-family:'Tajawal';font-style:normal;font-weight:800;font-display:swap;src:url('fonts/Tajawal-ExtraBold-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Tajawal';font-style:normal;font-weight:900;font-display:swap;src:url('fonts/Tajawal-Black.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EC2-10EC4,U+10EFC-10EFF,U+1EE00-1EE03,U+1EE05-1EE1F,U+1EE21-1EE22,U+1EE24,U+1EE27,U+1EE29-1EE32,U+1EE34-1EE37,U+1EE39,U+1EE3B,U+1EE42,U+1EE47,U+1EE49,U+1EE4B,U+1EE4D-1EE4F,U+1EE51-1EE52,U+1EE54,U+1EE57,U+1EE59,U+1EE5B,U+1EE5D,U+1EE5F,U+1EE61-1EE62,U+1EE64,U+1EE67-1EE6A,U+1EE6C-1EE72,U+1EE74-1EE77,U+1EE79-1EE7C,U+1EE7E,U+1EE80-1EE89,U+1EE8B-1EE9B,U+1EEA1-1EEA3,U+1EEA5-1EEA9,U+1EEAB-1EEBB,U+1EEF0-1EEF1}
@font-face{font-family:'Tajawal';font-style:normal;font-weight:900;font-display:swap;src:url('fonts/Tajawal-Black-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
</style>`;
  function buildPrintHTML(r, opts) {
    const data = JSON.stringify(r).replace(/<\//g, '<\\/');
    const grid = opts && opts.grid ? GRID_CSS + gridOverlayHTML('mm') : '';
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>بطاقة الطالب - ${fullName(r)}</title>
${TAJWAL_FACES}
<style>
  @page { size: ${CARD_W_MM}mm ${CARD_H_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  * { box-sizing: border-box; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  .ec-data-layer { position: relative; width: ${CARD_W_MM}mm; height: ${CARD_H_MM}mm; overflow: hidden; font-family: 'Tajawal', Arial, sans-serif; }
  ${dlRules('mm', 1, 1, '', opts && opts.textColor)}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script src="js/studentCardRenderer.js?v=17"><\/script>
</head><body>
<div class="ec-data-layer">${dataLayerHTML(r)}${grid}</div>
<script>
(function () {
  var data = ${data};
  var tries = 0;
  function ready() {
    return typeof window.JsBarcode !== 'undefined' && typeof window.QRCode !== 'undefined' && typeof window.StudentCardRenderer !== 'undefined';
  }
  function fontsReady() {
    var d = window.document;
    if (!d.fonts) return true;
    var p = d.fonts.load('700 16px Tajawal', '\u0627\u0644\u0639\u0631\u0628\u064a\u0629').then(function () { return true; }, function () { return true; });
    return d.fonts.ready ? Promise.all([d.fonts.ready, p]).then(function () { return true; }) : p;
  }
  function doPrint() {
    try { window.focus(); window.print(); } catch (e) {}
  }
  function go() {
    if (!ready()) { if (tries++ < 40) { setTimeout(go, 250); return; } }
    try { if (window.StudentCardRenderer) window.StudentCardRenderer.hydratePrint(window, data); } catch (e) {}
    Promise.resolve(fontsReady()).then(function () { setTimeout(doPrint, 350); });
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
<script src="js/studentCardRenderer.js?v=17"></script>
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
.ec-a4-decor{position:absolute;display:block}
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

  // SOLID white QR square + SOLID white barcode rectangle, drawn inside a card
  // slot of the A4 BACK sheet (data-layer geometry, so they align perfectly
  // with the later data layer). Always SOLID #ffffff — these are ready-made
  // placeholders on the pre-printed back sheet, independent of the CAL QR/bc
  // background colour (which only applies to the data layer). Real filled SVG
  // rects (never borders/outlines) with exact print-color-adjust so they print
  // as opaque white, forming the placeholders that receive the student
  // QR/barcode later.
  function a4BackDecorHTML(slot, unit, scale) {
    const su = unit === 'px' ? 'px' : 'mm';
    const U = unit === 'px' ? (scale || 1) : 1;
    const g = a4DataGeom(slot);
    const P = (x, y, w, h) => `left:${_u(su,U,g.dx + x * g.sc)};top:${_u(su,U,g.dy + y * g.sc)};width:${_u(su,U,w * g.sc)};height:${_u(su,U,h * g.sc)}`;
    const rect = (geom, rx) => `<svg class="ec-a4-decor" style="${P(geom.x, geom.y, geom.w, geom.h)}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100%" height="100%" rx="${rx}" ry="${rx}" fill="#ffffff" style="-webkit-print-color-adjust:exact;print-color-adjust:exact"/></svg>`;
    const GQ = qrBgGeom(), GB = bcBgGeom();
    return rect(GQ, GQ.radius) + rect(GB, GB.radius);
  }

  // ── A4 two-pass workflow (print this page in step 3) ─────────────────
  // Step 1 (buildA4FrontSheetHTML): print the FRONT sheet — 4 front designs
  // at the saved CARD_SLOTS (the MASTER grid — the single reference), no data.
  // Step 2 (buildA4BackSheetHTML): print the BACK sheet — the 4 back designs
  // plus the SOLID white QR/barcode placeholders (no student data), ready for
  // the data layer. Step 3 (this function): re-feed the SAME paper and print
  // the student data for ONE chosen card. The overlay is placed at the RAW
  // CARD_SLOT — the exact same X/Y/W/H as the pre-printed back card #N and as
  // the front card #N — so the data lands EXACTLY over Back #N's design and
  // white placeholders, with the same cut boundaries. No feed shift, no flip,
  // no mirror: the design keeps its natural orientation.
  //   opts.mode = 'info' (default): transparent data layer ONLY (name, ID,
  //     stream, date, QR, barcode) inside the chosen slot — for back sheets
  //     that were already printed. The white QR/barcode backgrounds are NOT
  //     drawn here (they are part of the pre-printed back sheet).
  //   opts.mode = 'back': the BACK design (studentidcardback1.jpg) PLUS the
  //     white placeholders PLUS the student data together inside the chosen
  //     slot only; all other slots stay empty in the print output.
  // PREVIEW vs PRINT: the chosen card's back+data sit at the RAW slot (the
  // finished sheet: Front #N + Back #N over it) on screen, and @media print
  // prints them at that SAME position (ghosts + instructions hidden), so the
  // preview shows exactly what the printer produces. A screen-only bar states
  // the print settings (A4, Portrait, Scale 100%, Margins None).
  function buildA4PrintHTML(r, slotIndex, opts) {
    const sheet = (opts && opts.sheet) || getSheetLayout();
    if (!sheet || !sheet.slots || !sheet.slots[slotIndex]) return null;
    const rawSlot = sheet.slots[slotIndex];
    const mode = (opts && opts.mode === 'back') ? 'back' : 'info';
    const data = JSON.stringify(r).replace(/<\//g, '<\\/');
    const g = a4DataGeom(rawSlot);
    const sc = g.sc;
    const slotsHtml = sheet.slots.map((s, i) => {
      const gs = a4DataStyle(s, 'mm', 1);
      const isSel = i === slotIndex;
      let inner = '';
      if (mode === 'back') {
        inner += isSel
          ? `<div class="ec-a4-back" style="${gs}"><img src="${BACK_IMG}" alt="">${a4BackDecorHTML(s, 'mm', 1)}</div>`
          : `<div class="ec-a4-ghost" style="${gs}"><img src="${BACK_IMG}" alt=""></div>`;
      } else {
        inner += `<div class="ec-a4-ghost" style="${gs}"><img src="${BACK_IMG}" alt=""></div>`;
      }
      if (isSel) inner += `<div class="ec-a4-data" style="${gs}">${dataLayerHTML(r, { omitBg: mode === 'info' })}</div>`;
      return `<div class="ec-a4-slot${isSel ? ' ec-sel-slot' : ''}" data-i="${i}" style="${a4SlotStyle(s, 'mm', 1)}">
    ${inner}
  </div>`;
    }).join('');
    const modeLabel = mode === 'back' ? 'المعلومات + تصميم الوجه الخلفي' : 'طباعة المعلومات فقط';
    const info = `<div class="ec-a4-info"><b>طباعة بطاقة الطالب — البطاقة #${slotIndex + 1} من ${sheet.slots.length}</b> ·
  نوع الطباعة: ${modeLabel} ·
  <span class="hi">إعدادات الطباعة: A4 · Portrait · Scale 100% · Margins None (بدون تصغير/توسيع)</span>
  <div class="sub">تُطبع بيانات البطاقة #${slotIndex + 1} (الاسم الكامل، Student ID، الشعبة، تاريخ التسجيل، QR والباركود) فوق الوجه الخلفي المُطابق — نفس CARD_SLOTS ونفس موضع Front #${slotIndex + 1} بالضبط. الصورة لا تُعكس.</div></div>`;
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>بطاقة الطالب - ${fullName(r)}</title>
${TAJWAL_FACES}
<style>
  @page { size: ${A4_W_MM}mm ${A4_H_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: transparent; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  * { box-sizing: border-box; }
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .ec-a4-ghost, .ec-a4-info { display: none !important; }
  }
  .ec-a4-info { font-family: 'Tajawal', Arial, sans-serif; font-size: 3.4mm; line-height: 1.5; color: #0f172a; background: #f8fafc; border: 0.3mm solid #cbd5e1; border-radius: 1.5mm; padding: 2.5mm 4mm; margin: 3mm 3mm 4mm; }
  .ec-a4-info .hi { color: #059669; font-weight: 800; }
  .ec-a4-info .sub { font-size: 2.9mm; color: #475569; margin-top: 1mm; }
  .ec-a4 { position: relative; width: ${A4_W_MM}mm; height: ${A4_H_MM}mm; overflow: hidden; }
  .ec-a4-slot { position: absolute; transform-origin: 0 0; }
  .ec-a4-ghost { position: absolute; overflow: hidden; }
  .ec-a4-ghost img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .ec-a4-back { position: absolute; overflow: hidden; }
  .ec-a4-back img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .ec-a4-decor { position: absolute; display: block; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ec-a4-data { position: absolute; }
  ${dlRules('mm', sc, sc, '', opts && opts.textColor, Object.assign({}, opts, { omitBg: mode === 'info' }))}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script src="js/studentCardRenderer.js?v=17"><\/script>
</head><body>
${info}
<div class="ec-a4">
  ${slotsHtml}
</div>
<script>
(function () {
  var data = ${data};
  var tries = 0;
  function ready() {
    return typeof window.JsBarcode !== 'undefined' && typeof window.QRCode !== 'undefined' && typeof window.StudentCardRenderer !== 'undefined';
  }
  function fontsReady() {
    var d = window.document;
    if (!d.fonts) return true;
    var p = d.fonts.load('700 16px Tajawal', '\u0627\u0644\u0639\u0631\u0628\u064a\u0629').then(function () { return true; }, function () { return true; });
    return d.fonts.ready ? Promise.all([d.fonts.ready, p]).then(function () { return true; }) : p;
  }
  function doPrint() {
    try { window.focus(); window.print(); } catch (e) {}
  }
  function go() {
    if (!ready()) { if (tries++ < 40) { setTimeout(go, 250); return; } }
    try { if (window.StudentCardRenderer) window.StudentCardRenderer.hydratePrint(window, data); } catch (e) {}
    Promise.resolve(fontsReady()).then(function () { setTimeout(doPrint, 350); });
  }
  setTimeout(go, 300);
  window.onafterprint = function () { setTimeout(function () { try { window.close(); } catch (e) {} }, 250); };
})();
<\/script>
</body></html>`;
  }

  // ── A4 two-pass workflow (print this page in step 1) ─────────────────
  // FRONT sheet: the 4 front designs (studentidcardfront1.jpg) at the saved
  // CARD_SLOTS — the MASTER grid (all cards centred on A4, stacked vertically
  // with equal gaps). The back sheet (buildA4BackSheetHTML) and the student
  // overlay (buildA4PrintHTML) use the SAME slots, so Front #N / Back #N cut
  // boundaries coincide exactly. No flip, no mirror, no student data on this
  // sheet. Optional cut lines (full-width dashed horizontal guides spanning
  // the whole sheet at the TOP and BOTTOM edge of every card) show exactly
  // where to cut so every face stays aligned with the info overlay. Uses the
  // saved sheet layout, or the default 4-card centred column.
  function buildA4FrontSheetHTML(opts) {
    const sheet = (opts && opts.sheet) || getSheetLayout();
    const slots = (sheet && sheet.slots && sheet.slots.length) ? sheet.slots : defaultCardSlots();
    const cut = !opts || opts.cutLines !== false;
    // Full-width dashed horizontal guides at the TOP and BOTTOM edge of every
    // card, spanning the whole sheet (left edge → right edge), so the user can
    // cut along them to separate the cards exactly at the card boundaries.
    const cutLinesHtml = cut ? slots.map(s =>
      `<i class="ec-a4-cut" style="top:${s.y.toFixed(2)}mm"></i><i class="ec-a4-cut" style="top:${(s.y + s.h).toFixed(2)}mm"></i>`
    ).join('') : '';
    const slotsHtml = slots.map(s =>
      `<div class="ec-a4-front-slot" style="${a4SlotStyle(s, 'mm', 1)}"><img src="${FRONT_IMG}" alt=""></div>`
    ).join('');
    const info = `<div class="ec-a4-info">طباعة الوجه الأمامي (الخطوة 1) — ورقة A4 · Portrait · Scale 100% · Margins None ·
  ${slots.length} بطاقات في منتصف الصفحة. هذه الورقة هي المرجع: الوجه الخلفي يُطبع على نفس المواضع (CARD_SLOTS) بنفس حدود القص —
  <div class="sub">الخطوط المتقطعة (بعرض الورقة كاملاً) عند الحافة العلوية والسفلية لكل بطاقة هي دليل القص: اقصّ على طول الخط بالضبط لتظل البطاقة مقصوصة على نفس حدود الأمام/الخلف وتقع جميع المعلومات في مكانها تماماً.</div></div>`;
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>الوجه الأمامي — ورقة A4 (بطاقات)</title>
<style>
  @page { size: ${A4_W_MM}mm ${A4_H_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  * { box-sizing: border-box; }
  @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .ec-a4-info { display: none !important; } }
  .ec-a4-info { font-family: 'Tajawal', Arial, sans-serif; font-size: 3.4mm; line-height: 1.5; color: #0f172a; background: #f8fafc; border: 0.3mm solid #cbd5e1; border-radius: 1.5mm; padding: 2.5mm 4mm; margin: 3mm 3mm 4mm; }
  .ec-a4 { position: relative; width: ${A4_W_MM}mm; height: ${A4_H_MM}mm; overflow: hidden; }
  .ec-a4-front-slot { position: absolute; transform-origin: 0 0; background: #ffffff; }
  .ec-a4-front-slot img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .ec-a4-cut { position: absolute; left: 0; width: 100%; border-top: 0.3mm dashed #555555; pointer-events: none; }
</style>
</head><body>
${info}
<div class="ec-a4">${cutLinesHtml}${slotsHtml}</div>
<script>
(function () {
  var tries = 0;
  function go() {
    var imgs = document.querySelectorAll('.ec-a4-front-slot img');
    var ready = true;
    for (var i = 0; i < imgs.length; i++) {
      if (!imgs[i].complete || imgs[i].naturalWidth === 0) { ready = false; break; }
    }
    if (ready || tries++ > 40) { try { window.focus(); window.print(); } catch (e) {} }
    else { setTimeout(go, 250); }
  }
  setTimeout(go, 300);
  window.onafterprint = function () { setTimeout(function () { try { window.close(); } catch (e) {} }, 250); };
    setTimeout(function () { try { window.close(); } catch (e) {} }, 120000);
})();
<\/script>
</body></html>`;
  }

  // ── A4 two-pass workflow (print this page in step 2) ─────────────────
  // BACK sheet: the 4 back designs (studentidcardback1.jpg) PLUS the SOLID
  // white QR square and SOLID white barcode rectangle on EVERY card — the
  // ready-made placeholders that receive the student QR/barcode later. NO
  // student data on this sheet. The cards sit at the RAW CARD_SLOTS — the
  // SAME coordinates as the front sheet — in BOTH the screen preview and the
  // print output, so Front #N == Back #N (same X/Y/W/H, same centred column,
  // same cut boundaries). No feed shift, no flip, no mirror: the back image
  // keeps its natural orientation. Optional cut lines are full-width dashed
  // horizontal guides spanning the whole sheet at the TOP and BOTTOM edge of
  // every card (same as the front sheet).
  function buildA4BackSheetHTML(opts) {
    const sheet = (opts && opts.sheet) || getSheetLayout();
    const slots = (sheet && sheet.slots && sheet.slots.length) ? sheet.slots : defaultCardSlots();
    const cut = !opts || opts.cutLines !== false;
    const cutLinesHtml = cut ? slots.map(s =>
      `<i class="ec-a4-cut" style="top:${s.y.toFixed(2)}mm"></i><i class="ec-a4-cut" style="top:${(s.y + s.h).toFixed(2)}mm"></i>`
    ).join('') : '';
    const slotsHtml = slots.map((s, i) =>
      `<div class="ec-a4-back-slot" data-i="${i}" style="${a4SlotStyle(s, 'mm', 1)}"><img src="${BACK_IMG}" alt="">${a4BackDecorHTML(s, 'mm', 1)}</div>`
    ).join('');
    const info = `<div class="ec-a4-info"><b>طباعة الوجه الخلفي (الخطوة 2)</b> — ورقة A4 · Portrait · Scale 100% · Margins None ·
  ${slots.length} بطاقات في <b>نفس مواضع الوجه الأمامي بالضبط</b> (نفس CARD_SLOTS · Front #N == Back #N) —
  <div class="sub">التصميم الخلفي + المربع الأبيض للـQR + المستطيل الأبيض للباركود تُطبع معاً على كل بطاقة في نفس موضع البطاقة الأمامية المقابلة (بدون أي بيانات طالب) — الورقة تصبح جاهزة لطبقة معلومات الطالب لاحقاً. الصورة لا تُعكس.</div>
  <div class="sub">الخطوط المتقطعة (بعرض الورقة كاملاً) عند الحافة العلوية والسفلية لكل بطاقة هي دليل القص: اقصّ على طول الخط بالضبط بنفس حدود ورقة الأمام لتطابق حدود البطاقتين.</div></div>`;
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>الوجه الخلفي — ورقة A4 (تصميم + مربع QR + مستطيل باركود)</title>
<style>
  @page { size: ${A4_W_MM}mm ${A4_H_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  * { box-sizing: border-box; }
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .ec-a4-info { display: none !important; }
  }
  .ec-a4-info { font-family: 'Tajawal', Arial, sans-serif; font-size: 3.4mm; line-height: 1.5; color: #0f172a; background: #f8fafc; border: 0.3mm solid #cbd5e1; border-radius: 1.5mm; padding: 2.5mm 4mm; margin: 3mm 3mm 4mm; }
  .ec-a4-info .hi { color: #059669; font-weight: 800; }
  .ec-a4-info .sub { font-size: 2.9mm; color: #475569; margin-top: 1mm; }
  .ec-a4 { position: relative; width: ${A4_W_MM}mm; height: ${A4_H_MM}mm; overflow: hidden; }
  .ec-a4-back-slot { position: absolute; transform-origin: 0 0; background: #ffffff; }
  .ec-a4-back-slot img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .ec-a4-decor { position: absolute; display: block; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ec-a4-cut { position: absolute; left: 0; width: 100%; border-top: 0.3mm dashed #555555; pointer-events: none; }
</style>
</head><body>
${info}
<div class="ec-a4">${cutLinesHtml}${slotsHtml}</div>
<script>
(function () {
  var tries = 0;
  function go() {
    var imgs = document.querySelectorAll('.ec-a4-back-slot img');
    var ready = true;
    for (var i = 0; i < imgs.length; i++) {
      if (!imgs[i].complete || imgs[i].naturalWidth === 0) { ready = false; break; }
    }
    if (ready || tries++ > 40) { try { window.focus(); window.print(); } catch (e) {} }
    else { setTimeout(go, 250); }
  }
  setTimeout(go, 300);
  window.onafterprint = function () { setTimeout(function () { try { window.close(); } catch (e) {} }, 250); };
  setTimeout(function () { try { window.close(); } catch (e) {} }, 120000);
})();
<\/script>
</body></html>`;
  }

  // White A4 test sheet: slot outlines + slot numbers (+ optional grid).
  // Printed on blank paper and laid over the pre-printed A4 to verify the
  // saved slot positions match the real card grid. No designs, no data.
  function buildA4TestSheetHTML(opts) {
    const sheet = (opts && opts.sheet) || getSheetLayout();
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

  // ── Duplex alignment TEST sheet (2 pages) ───────────────────────────
  // Page 1: FRONT cut borders (solid) at the raw CARD_SLOTS.
  // Page 2: BACK cut borders (dashed) at the duplex feed positions
  //         (duplexBackSlot: mirrored per mode + the ONE global offset).
  // Workflow: print page 1, physically flip the paper per the duplex mode,
  // re-feed it, then print ONLY page 2. Hold the sheet to light: when the
  // mode + offset are correct, every dashed Back #N border sits EXACTLY
  // inside the solid Front #N border — any mm deviation is directly visible.
  function buildDuplexTestSheetHTML(opts) {
    const sheet = (opts && opts.sheet) || getSheetLayout();
    if (!sheet || !sheet.slots || !sheet.slots.length) return null;
    const duplex = opts && opts.duplex ? duplexFromSheet({ duplex: opts.duplex }) : duplexFromSheet(sheet);
    const backSlots = sheet.slots.map(s => duplexBackSlot(s, duplex.mode, duplex.dx, duplex.dy));
    const page = (slots, label, cls) => `<div class="ts-page">${slots.map((s, i) =>
      `<div class="ts-slot ${cls}" style="${a4SlotStyle(s, 'mm', 1)}"><span class="ts-num">${label} #${i + 1}</span></div>`
    ).join('')}</div>`;
    const duplexLabel = duplex.mode === 'long' ? 'قلب الحافة الطويلة'
      : duplex.mode === 'short' ? 'قلب الحافة القصيرة' : 'قلب تلقائي (الطابعة)';
    const info = `<div class="ts-info">
  <b>اختبار تطابق الوجهين (Front/Back)</b> ·
  وضع Duplex: ${duplexLabel} · الإزاحة العامة X/Y: ${duplex.dx.toFixed(2)} / ${duplex.dy.toFixed(2)} مم ·
  <span class="hi">إعدادات الطباعة: A4 · Portrait · Scale 100% · Margins None</span><br>
  1) اطبع <b>الصفحة 1</b> (حدود أمامية صُلبة). 2) أقلب الورقة حسب طريقة القلب المختارة وأعد إدخالها.
  3) اطبع <b>الصفحة 2 فقط</b> (حدود خلفية متقطعة). 4) ارفع الورقة للنور: يجب أن تقع حدود الخلف #N داخل حدود الأمام #N تماماً — أي انحراف بالملمتر يظهر فوراً.
</div>`;
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>اختبار تطابق Front / Back (Duplex)</title>
<style>
  @page { size: ${A4_W_MM}mm ${A4_H_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  * { box-sizing: border-box; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .ts-info { display: none !important; } }
  .ts-info { font-family: 'Tajawal', Arial, sans-serif; font-size: 3.4mm; line-height: 1.6; color: #0f172a; background: #f8fafc; border: 0.3mm solid #cbd5e1; border-radius: 1.5mm; padding: 2.5mm 4mm; margin: 3mm 3mm 4mm; }
  .ts-info .hi { color: #059669; font-weight: 800; }
  .ts-page { position: relative; width: ${A4_W_MM}mm; height: ${A4_H_MM}mm; overflow: hidden; page-break-after: always; }
  .ts-page:last-child { page-break-after: auto; }
  .ts-slot { position: absolute; box-sizing: border-box; display: flex; align-items: center; justify-content: center; transform-origin: 0 0; }
  .ts-slot.ts-front { border: 0.35mm solid #d32f2f; }
  .ts-slot.ts-back { border: 0.35mm dashed #1d4ed8; }
  .ts-num { font-family: 'Tajawal', Arial, sans-serif; font-weight: 700; font-size: 30pt; }
  .ts-front .ts-num { color: #d32f2f; }
  .ts-back .ts-num { color: #1d4ed8; }
</style>
</head><body>
${info}
${page(sheet.slots, 'الأمامي', 'ts-front')}
${page(backSlots, 'الخلفي', 'ts-back')}
<script>
  setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 350);
  window.onafterprint = function () { setTimeout(function () { try { window.close(); } catch (e) {} }, 250); };
  setTimeout(function () { try { window.close(); } catch (e) {} }, 120000);
<\/script>
</body></html>`;
  }

  return {
    CARD_W, CARD_H, CARD_W_MM, CARD_H_MM, A4_W_MM, A4_H_MM, QR_SIZE, CAL, CAL_DEFAULTS, BARCODE_OPTS, BARCODE_STD,
    cardCSS, barcodeSpec, bcBox, qrBgGeom, bcBgGeom,
    getCalibration, setCalibration, saveCalibration, resetCalibration, calibrationStorageKey,
    addShape, removeShape,
    getSheetLayout, setSheetLayout, saveSheetLayout, resetSheetLayout, sheetStorageKey, defaultSlotGrid,
    slotsFromParams, defaultCardSlots, defaultSheetLayout, sheetParams, CARD_PARAMS_DEFAULTS,
    flipSlot, flipSlots,
    duplexFromSheet, duplexBackSlot, physicalBackSlot,
    fullName, streamOf, regDate, barcodeValue, qrUrl,
    injectCSS, renderPair, portalFaces, buildPrintHTML, hydratePrint, hydrateRoot,
    dataLayerHTML, dlRules, gridOverlayHTML, GRID_CSS,
    a4SheetCSS, a4SlotStyle, a4DataStyle, a4DataGeom, a4BackDecorHTML, a4GridOverlayHTML, A4_GRID_CSS,
    buildA4PrintHTML, buildA4TestSheetHTML, buildA4FrontSheetHTML, buildA4BackSheetHTML, buildDuplexTestSheetHTML,
    renderBarcodeSVG, buildBarcodePrintHTML
  };
})();

window.StudentCardRenderer = StudentCardRenderer;

