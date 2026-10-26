// ═══════════════════════════════════════════════════════════
//  EAN13 — Deterministic EAN-13 barcode value per identity.
//  Support students: '200' + 9-digit Student ID (padded) +
//  computed check digit → 13 digits, valid GS1 EAN-13.
//  Language cards:   '201' + 9-digit card ID (padded) +
//  computed check digit → a DIFFERENT scanner namespace, so a
//  language card can never be mistaken for a support student.
//  Deterministic ⇒ the SAME ID always gets the SAME barcode.
//  Never changes on reprint, portal open, data edit, or
//  unregister/re-register.
//  Used ONLY by the scanner. Student ID stays the system
//  identity; the QR link stays the portal identity.
// ═══════════════════════════════════════════════════════════

const EAN13 = (function () {
  const PREFIX_SUPPORT = '200';
  const PREFIX_LANGUAGE = '201';

  function digits(v) {
    return String(v == null ? '' : v).replace(/\D/g, '');
  }

  // Standard EAN-13 check digit from the first 12 digits.
  function checkDigit(d12) {
    const s = digits(d12);
    if (s.length !== 12) return '';
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(s[i], 10) || 0;
      sum += (i % 2 === 0) ? d : d * 3;
    }
    return String((10 - (sum % 10)) % 10);
  }

  function isValid(v) {
    const s = digits(v);
    if (s.length !== 13) return false;
    return checkDigit(s.slice(0, 12)) === s[12];
  }

  // 'PREFIX' + up to 9 ID digits (left-padded) + check digit.
  function makeWithPrefix(prefix, id) {
    const p = digits(prefix).slice(0, 3);
    const idPart = digits(id).slice(0, 9).padStart(9, '0');
    if (p.length !== 3 || !idPart) return '';
    const d12 = p + idPart;
    return d12 + checkDigit(d12);
  }

  // Reverse of makeWithPrefix(): extract the embedded ID (valid
  // EAN-13 starting with the given prefix only).
  function decodeWithPrefix(prefix, v) {
    const p = digits(prefix).slice(0, 3);
    const s = digits(v);
    if (p.length !== 3 || s.length !== 13 || !s.startsWith(p) || !isValid(s)) return null;
    const idPart = s.slice(3, 12);
    return String(parseInt(idPart, 10) || 0);
  }

  // Support students (scanner namespace '200').
  function make(studentId) { return makeWithPrefix(PREFIX_SUPPORT, studentId); }
  function decode(v) { return decodeWithPrefix(PREFIX_SUPPORT, v); }

  // Language-course cards (scanner namespace '201').
  function makeLang(cardId) { return makeWithPrefix(PREFIX_LANGUAGE, cardId); }
  function decodeLang(v) { return decodeWithPrefix(PREFIX_LANGUAGE, v); }

  return {
    PREFIX_SUPPORT, PREFIX_LANGUAGE,
    checkDigit, makeWithPrefix, decodeWithPrefix,
    make, isValid, decode, makeLang, decodeLang
  };
})();

if (typeof window !== 'undefined') window.EAN13 = EAN13;
if (typeof module !== 'undefined' && module.exports) module.exports = EAN13;
