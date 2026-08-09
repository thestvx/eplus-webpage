// ═══════════════════════════════════════════════════════════
//  EAN13 — Deterministic EAN-13 barcode value per student.
//  Scheme: '200' + 9-digit Student ID (padded) + computed
//  check digit  →  exactly 13 digits, valid GS1 EAN-13.
//  Deterministic ⇒ the SAME student always gets the SAME
//  barcode. Never changes on reprint, portal open, data edit,
//  or unregister/re-register.
//  Used ONLY by the scanner. Student ID stays the system
//  identity; the QR link stays the portal identity.
// ═══════════════════════════════════════════════════════════

const EAN13 = (function () {
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

  // '200' + up to 9 ID digits (left-padded) + check digit.
  function make(studentId) {
    const idPart = digits(studentId).slice(0, 9).padStart(9, '0');
    if (!idPart) return '';
    const d12 = '200' + idPart;
    return d12 + checkDigit(d12);
  }

  function isValid(v) {
    const s = digits(v);
    if (s.length !== 13) return false;
    return checkDigit(s.slice(0, 12)) === s[12];
  }

  // Reverse of make(): extract the embedded Student ID (valid
  // EAN-13 starting with the '200' prefix only).
  function decode(v) {
    const s = digits(v);
    if (s.length !== 13 || !s.startsWith('200') || !isValid(s)) return null;
    const idPart = s.slice(3, 12);
    return String(parseInt(idPart, 10) || 0);
  }

  return { checkDigit, make, isValid, decode };
})();

if (typeof window !== 'undefined') window.EAN13 = EAN13;
if (typeof module !== 'undefined' && module.exports) module.exports = EAN13;
