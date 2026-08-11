// ═══════════════════════════════════════════════════════════
//  BarcodeScanner — shared USB-HID barcode scanner (Smart SP-1160)
//  Used by: attendance.html (kiosk) + admin.html (subscription modal).
//  The SP-1160 types as a USB HID keyboard. We rebuild the barcode
//  value ONLY from event.code (physical key = layout-independent).
//  event.key is layout-dependent (Arabic/French layouts turn digits
//  into é/à/&/_...) and is kept ONLY for diagnostics — never used
//  to build the value and never sent to the backend.
// ═══════════════════════════════════════════════════════════
window.BarcodeScanner = (function () {
  'use strict';

  function Scanner(opts) {
    opts = opts || {};
    this.logPrefix = opts.logPrefix || '[SCANNER]';
    this.FINALIZE_MS = opts.finalizeMs || 250;   // idle gap after last key = scan complete (no Enter needed)
    this.BURST_GAP_MS = opts.burstGapMs || 120;  // gap larger than this = new scan
    this.onScan = opts.onScan || function () {};
    this.onInvalid = opts.onInvalid || function () {};
    this.onState = opts.onState || null;         // 'start' | 'key' | 'nondigit' | 'complete'
    this.shouldIgnoreKey = opts.shouldIgnoreKey || null;

    this.enabled = false;
    this.busy = false;
    this.buf = [];
    this.keyBuf = [];
    this.active = false;
    this.timer = null;
    this.startTs = 0;
    this.lastTs = 0;
    this.enterSeen = false;
    this.sawNonDigit = false;

    this._kd = this._onKeyDown.bind(this);
    this._kp = this._onKeyPress.bind(this);
  }

  Scanner.prototype.log = function () {
    try {
      console.log.apply(console, [this.logPrefix].concat(Array.prototype.slice.call(arguments)));
    } catch (e) {}
  };

  // Start capturing globally (capture phase — works with no input focus).
  Scanner.prototype.start = function () {
    if (this.enabled) return;
    this.enabled = true;
    this.reset();
    document.addEventListener('keydown', this._kd, true);
    document.addEventListener('keypress', this._kp, true);
    this.log('Scanner listener active (event.code-based)');
  };

  // Stop capturing + wipe buffer + clear timeout. No admin keys are
  // intercepted while the scanner is stopped.
  Scanner.prototype.stop = function () {
    this.enabled = false;
    this.reset();
    document.removeEventListener('keydown', this._kd, true);
    document.removeEventListener('keypress', this._kp, true);
    this.log('Scanner listener stopped');
  };

  Scanner.prototype.reset = function () {
    this.buf = [];
    this.keyBuf = [];
    this.active = false;
    this.enterSeen = false;
    this.sawNonDigit = false;
    this.startTs = 0;
    this.lastTs = 0;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  };

  // Debounce: while true, digits/Enter are swallowed so a second scan
  // cannot fire a second lookup mid-processing.
  Scanner.prototype.setBusy = function (b) { this.busy = !!b; };

  Scanner.prototype._emit = function (name, data) {
    if (this.onState) {
      try { this.onState(name, data); } catch (e) {}
    }
  };

  Scanner.prototype._onKeyDown = function (e) {
    if (!this.enabled) return;
    if (this.shouldIgnoreKey && this.shouldIgnoreKey(e)) return;

    // Debounce lock — swallow scan keys while a lookup is running.
    if (this.busy) {
      var bc = e.code || '';
      if (/^(Digit|Numpad)[0-9]$/.test(bc) || bc === 'Enter' || bc === 'NumpadEnter' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      return;
    }

    var now = Date.now();
    var code = e.code || '';

    // Gap between keys larger than a burst = previous scan already ended.
    if (this.active && now - this.lastTs > this.BURST_GAP_MS) this._finalize();

    var m = /^(Digit|Numpad)([0-9])$/.exec(code);

    if (m) {
      // ── Digit key → part of a barcode scan ──────────────
      if (!this.active) {
        this.active = true;
        this.startTs = now;
        this.enterSeen = false;
        this.sawNonDigit = false;
        this.log('Scan started');
        this._emit('start', null);
      }
      this.lastTs = now;

      // Block the key from ever reaching the browser/DOM/console
      // (so é/à/& never become text and are never evaluated as JS).
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      this.buf.push(m[2]);
      this.keyBuf.push(typeof e.key === 'string' ? e.key : '');
      this.log('code=' + code + ' mapped=' + m[2] + ' buffer=' + this.buf.join(''));
      this._emit('key', {
        code: code,
        key: typeof e.key === 'string' ? e.key : '',
        mapped: m[2],
        buffer: this.buf.slice(),
        digit: m[2],
        startTs: this.startTs,
        evt: e
      });

      // Idle finalize: the scanner sends digits then stops (may send no Enter).
      var self = this;
      clearTimeout(this.timer);
      this.timer = setTimeout(function () { if (self.active) self._finalize(); }, this.FINALIZE_MS);
      return;
    }

    if (code === 'Enter' || code === 'NumpadEnter' || e.key === 'Enter') {
      if (this.active) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.enterSeen = true;
        this._finalize();
      }
      return;
    }

    if (/^Key[A-Z]$/.test(code) || /^F\d+$/.test(code)) {
      this.sawNonDigit = true;
      this.log('Non-digit key: code=' + code + ' key=' + JSON.stringify(typeof e.key === 'string' ? e.key : '') + ' (ignored)');
      this._emit('nondigit', { code: code, key: typeof e.key === 'string' ? e.key : '' });
    }
  };

  // Defensive: while a scan burst is active, also stop any keypress text
  // insertion (Firefox) so garbled chars never reach the page/console.
  Scanner.prototype._onKeyPress = function (e) {
    if (this.enabled && this.active) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  };

  Scanner.prototype._finalize = function () {
    if (!this.enabled) return;
    if (!this.active && this.buf.length === 0) return;

    var codeVal = this.buf.join('');
    var meta = {
      keyVal: this.keyBuf.join(''),
      duration: codeVal.length ? (this.lastTs - this.startTs) : 0,
      enter: this.enterSeen,
      sawNonDigit: this.sawNonDigit
    };

    this.reset();

    this.log('Scan complete');
    this.log('rawCodeValue=' + codeVal);
    this.log('length=' + codeVal.length);
    this._emit('complete', { codeVal: codeVal, meta: meta });

    if (!codeVal) return;
    if (!/^\d+$/.test(codeVal)) {
      this.log('INVALID — non-digit characters in rawCodeValue');
      if (this.onInvalid) { try { this.onInvalid(codeVal, meta); } catch (e) {} }
      return;
    }
    if (this.onScan) { try { this.onScan(codeVal, meta); } catch (e) {} }
  };

  return { Scanner: Scanner };
})();
