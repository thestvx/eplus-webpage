/* ═══════════════════════════════════════════
   SUMMER SCHOOL — Advanced Registration + Gallery + Packages
════════════════════════════════════════════ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

/* ─────────────────────────────────────────
   FIREBASE
───────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyAMcplfO4veFVLtZZcyqfTJx9NGCit8gjo",
  authDomain: "eplus-center-39.firebaseapp.com",
  projectId: "eplus-center-39",
  storageBucket: "eplus-center-39.firebasestorage.app",
  messagingSenderId: "191532732034",
  appId: "1:191532732034:web:b11449a2f0595db5d02e9b"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
getFirestore(app);

const CAMP_MIN_AGE = 5;
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyoKNiPcaPBIYUTb1l_WXIlDmG2N-iPqSrx9r93Lpiio3_vKdOgCtwMTZQmq9cpQt6FWA/exec";

const VIDEO_PUBLIC_ID = "copy_B61063D2-D03E-41C1-AB91-1B692AB1F686_rvphab";
const VIDEO_CLOUD_NAME = "dac4mwuwe";
const VIDEO_FALLBACK_SRC =
  `https://res.cloudinary.com/${VIDEO_CLOUD_NAME}/video/upload/q_auto,f_auto/${VIDEO_PUBLIC_ID}.mp4`;

const prefersReducedMotion =
  window.matchMedia && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

let isSubmitting = false;
let successOverlayShown = false;
let registerModalApi = null;

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function getField(id) {
  return document.getElementById(id);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizePhone(phone) {
  return normalizeText(phone).replace(/\s+/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setBodyModalState(isOpen) {
  document.body.style.overflow = isOpen ? "hidden" : "";
}

function syncBodyModalState() {
  const modalOpen = Boolean(
    getField("camp-register-modal")?.classList.contains("open") ||
    getField("camp-register-modal")?.classList.contains("active")
  );
  const hasSuccess = Boolean(document.querySelector(".success-overlay"));
  const hasLightbox = Boolean(document.querySelector(".summer-lightbox"));
  setBodyModalState(modalOpen || hasSuccess || hasLightbox);
}

function normalizeDash(value) {
  return normalizeText(value)
    .replace(/[‐‑‒–—―]/g, "–")
    .replace(/\s*–\s*/g, " – ");
}

function simplifyPackageValue(value) {
  return normalizeDash(value)
    .replace(/\u200f|\u200e/g, "")
    .replace(/[،,]/g, "")
    .replace(/دج|da|dzd/gi, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findMatchingPackageOption(selectEl, packageName) {
  if (!selectEl) return null;

  const wanted = simplifyPackageValue(packageName);
  if (!wanted) return null;

  const options = [...selectEl.options].filter(option => normalizeText(option.value));

  let exact = options.find(option => simplifyPackageValue(option.value) === wanted);
  if (exact) return exact;

  exact = options.find(option => simplifyPackageValue(option.textContent) === wanted);
  if (exact) return exact;

  let loose = options.find(option => {
    const optionValue = simplifyPackageValue(option.value);
    return optionValue && (optionValue.includes(wanted) || wanted.includes(optionValue));
  });
  if (loose) return loose;

  loose = options.find(option => {
    const optionText = simplifyPackageValue(option.textContent);
    return optionText && (optionText.includes(wanted) || wanted.includes(optionText));
  });
  if (loose) return loose;

  const wantedWords = wanted.split(" ").filter(Boolean);
  loose = options.find(option => {
    const optionValue = simplifyPackageValue(option.value);
    return wantedWords.every(word => optionValue.includes(word));
  });
  if (loose) return loose;

  loose = options.find(option => {
    const optionText = simplifyPackageValue(option.textContent);
    return wantedWords.every(word => optionText.includes(word));
  });
  if (loose) return loose;

  return null;
}

function extractPackageNameFromInline(button) {
  if (!button) return "";
  if (button.dataset.packageName) return button.dataset.packageName;

  const onclickValue = normalizeText(button.getAttribute("onclick"));
  if (!onclickValue) return "";

  const quotedMatch = onclickValue.match(/selectPackage\\((['"`])([\s\S]*?)\1\\)/);
  if (quotedMatch) {
    return normalizeText(quotedMatch[2]);
  }

  const rawCallMatch = onclickValue.match(/selectPackage\\(([\s\S]*?)\\)/);
  if (rawCallMatch) {
    return normalizeText(rawCallMatch[1]).replace(/^['"`]|['"`]$/g, "");
  }

  return "";
}

function extractPackageNameFromCard(button) {
  if (!button) return "";

  const card = button.closest(".pricing-card");
  if (!card) return "";

  const nameEl = card.querySelector(".pc-name");
  const titleSpan = nameEl ? nameEl.querySelector("span") : null;

  const rawTitle = nameEl
    ? [...nameEl.childNodes]
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent)
        .join(" ")
    : "";

  const titleText = normalizeText(rawTitle || (nameEl ? nameEl.textContent : ""));
  const subtitleText = normalizeText(titleSpan ? titleSpan.textContent : "");
  const priceText = normalizeText(
    card.querySelector(".pc-price-contact")
      ? card.querySelector(".pc-price-contact").textContent
      : card.querySelector(".pc-price")
        ? (
            card.querySelector(".pc-price").childNodes[0]?.textContent ||
            card.querySelector(".pc-price").textContent
          )
        : ""
  );

  const candidates = [
    `${titleText} ${subtitleText} ${priceText}`,
    `${titleText} ${subtitleText}`,
    `${titleText} ${priceText}`,
    titleText,
    subtitleText,
    priceText
  ]
    .map(item => normalizeText(item))
    .filter(Boolean);

  return candidates[0] || "";
}

function buildLanguageOptionsMarkup(includeSpanish = true) {
  return `
    <option value="">-- اختر اللغة --</option>
    <option value="الإنجليزية" data-lang="english">🇬🇧 الإنجليزية</option>
    <option value="الفرنسية" data-lang="french">🇫🇷 الفرنسية</option>
    ${includeSpanish ? '<option value="الإسبانية" data-lang="spanish">🇪🇸 الإسبانية</option>' : ""}
  `;
}

function safelyRemoveNode(node) {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

function focusElement(el) {
  if (!el || typeof el.focus !== "function") return;
  try {
    el.focus({ preventScroll: false });
  } catch {
    el.focus();
  }
}

function scrollToElement(el) {
  if (!el || typeof el.scrollIntoView !== "function") return;
  try {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch {
    el.scrollIntoView();
  }
}

/* ─────────────────────────────────────────
   PACKAGE RULES
───────────────────────────────────────── */
function isBacPackage(packageValue) {
  const value = simplifyPackageValue(packageValue);
  return (
    value.includes("تحضير البكالوريا") ||
    value.includes("bac prep") ||
    value === "15000"
  );
}

function isITAdvancedPackage(packageValue) {
  const value = simplifyPackageValue(packageValue);
  return (
    value.includes("البالغين المتقدمة") ||
    value.includes("adults advanced") ||
    value === "12000"
  );
}

function isAdultBasicPackage(packageValue) {
  const value = simplifyPackageValue(packageValue);
  return (
    value.includes("باقة البالغين") ||
    value.includes("البالغين") ||
    value.includes("adults basic") ||
    value === "8000"
  );
}

function isSpecialPackage(packageValue) {
  const value = simplifyPackageValue(packageValue);
  return (
    value.includes("e-plus special") ||
    value.includes("english communication class") ||
    value.includes("english for specific purposes") ||
    value.includes("english for special purposes") ||
    value.includes("esp") ||
    value.includes("ielts preparation") ||
    value.includes("ielts prep")
  );
}

function isFiveToTenPackage(packageValue) {
  const value = normalizeText(packageValue);
  return value.includes("5–10") || value.includes("5-10") || value.includes("510");
}

function isElevenToFourteenPackage(packageValue) {
  const value = normalizeText(packageValue);
  return value.includes("11–14") || value.includes("11-14") || value.includes("1114");
}

function isFifteenToEighteenPackage(packageValue) {
  const value = normalizeText(packageValue);
  return value.includes("15–18") || value.includes("15-18") || value.includes("1518");
}

function needsSingleLanguage(packageValue) {
  const value = normalizeText(packageValue);

  if (!value) return false;
  if (isBacPackage(value) || isITAdvancedPackage(value) || isSpecialPackage(value)) return false;

  return (
    isFiveToTenPackage(value) ||
    isElevenToFourteenPackage(value) ||
    isFifteenToEighteenPackage(value) ||
    isAdultBasicPackage(value)
  );
}

function updateLanguageOptionsByPackage(packageValue) {
  const langEl = getField("campLanguage");
  if (!langEl) return;

  const previousValue = normalizeText(langEl.value);
  const allowSpanish = !isFiveToTenPackage(packageValue);

  langEl.innerHTML = buildLanguageOptionsMarkup(allowSpanish);

  const allowedValues = [...langEl.options].map(option => normalizeText(option.value));
  langEl.value = allowedValues.includes(previousValue) ? previousValue : "";
}

/* ─────────────────────────────────────────
   DYNAMIC FIELDS
───────────────────────────────────────── */
function initDynamicFields() {
  const packageEl = getField("campSelectedPackage");
  const langGroup = getField("campLanguageGroup");
  const langEl = getField("campLanguage");
  const comboGroup = getField("campPackageChoiceGroup");
  const itGroup = getField("campITChoiceGroup");
  const bacLangBoxes = document.querySelectorAll('input[name="bacLang"]');
  const itTrackBoxes = document.querySelectorAll('input[name="itTrack"]');

  if (!packageEl) return;

  const clearBac = () => {
    bacLangBoxes.forEach(box => {
      box.checked = false;
      box.classList.remove("camp-input-error");
      box.closest(".choice-checkbox-label")?.classList.remove("camp-choice-error");
    });
  };

  const clearIT = () => {
    itTrackBoxes.forEach(box => {
      box.checked = false;
      box.classList.remove("camp-input-error");
      box.closest(".choice-checkbox-label")?.classList.remove("camp-choice-error");
    });
  };

  const clearLang = () => {
    if (!langEl) return;
    langEl.value = "";
    langEl.classList.remove("camp-input-error");
    langEl.removeAttribute("required");
  };

  const toggleFields = () => {
    const val = normalizeText(packageEl.value);
    const showBac = isBacPackage(val);
    const showLang = needsSingleLanguage(val);
    const showIT = isITAdvancedPackage(val);

    updateLanguageOptionsByPackage(val);

    if (comboGroup) comboGroup.classList.toggle("choice-visible", showBac);
    if (langGroup) langGroup.classList.toggle("lang-visible", showLang);
    if (itGroup) itGroup.classList.toggle("it-visible", showIT);

    if (langEl) {
      if (showLang) {
        langEl.setAttribute("required", "true");
      } else {
        clearLang();
      }
    }

    if (!showBac) clearBac();
    if (!showIT) clearIT();
  };

  if (packageEl.dataset.dynamicBound !== "true") {
    packageEl.dataset.dynamicBound = "true";
    packageEl.addEventListener("change", toggleFields);
  }

  bacLangBoxes.forEach(box => {
    if (box.dataset.dynamicBound === "true") return;
    box.dataset.dynamicBound = "true";

    box.addEventListener("change", () => {
      const checked = [...bacLangBoxes].filter(item => item.checked);
      if (checked.length > 2) {
        box.checked = false;
      }

      bacLangBoxes.forEach(item => {
        item.classList.remove("camp-input-error");
        item.closest(".choice-checkbox-label")?.classList.remove("camp-choice-error");
      });
    });
  });

  itTrackBoxes.forEach(box => {
    if (box.dataset.dynamicBound === "true") return;
    box.dataset.dynamicBound = "true";

    box.addEventListener("change", () => {
      itTrackBoxes.forEach(item => {
        item.classList.remove("camp-input-error");
        item.closest(".choice-checkbox-label")?.classList.remove("camp-choice-error");
      });
    });
  });

  if (langEl && langEl.dataset.dynamicBound !== "true") {
    langEl.dataset.dynamicBound = "true";
    langEl.addEventListener("change", () => {
      langEl.classList.remove("camp-input-error");
    });
  }

  toggleFields();
}

/* ─────────────────────────────────────────
   PRICING TABS
───────────────────────────────────────── */
function initPricingTabs() {
  const tabs = document.querySelectorAll(".pricing-tab");
  const contents = document.querySelectorAll(".pricing-content");

  if (!tabs.length || !contents.length) return;

  tabs.forEach(tab => {
    if (tab.dataset.tabBound === "true") return;
    tab.dataset.tabBound = "true";

    tab.addEventListener("click", () => {
      tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });

      contents.forEach(c => {
        c.classList.remove("active");
        c.style.animation = "none";
      });

      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      const targetId = tab.getAttribute("data-target");
      const panel = document.getElementById(targetId);
      if (!panel) return;

      void panel.offsetHeight;
      panel.style.animation = "";
      panel.classList.add("active");
    });
  });
}

/* ─────────────────────────────────────────
   REGISTER MODAL OPEN/CLOSE
───────────────────────────────────────── */
function initRegisterModal() {
  const openModalBtn = getField("open-register-modal");
  const modal = getField("camp-register-modal");
  const closeModalBtn = getField("close-register-modal");
  const modalBox = modal ? modal.querySelector(".camp-register-modal-box") : null;
  const backdrop = modal ? modal.querySelector(".camp-register-modal-backdrop") : null;

  if (!modal) {
    return {
      openModal: () => {},
      closeModal: () => {},
      isOpen: () => false
    };
  }

  let lastFocusedElement = null;

  const isOpen = () => modal.classList.contains("open") || modal.classList.contains("active");

  const openModal = () => {
    if (isOpen()) return;

    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.classList.add("open", "active");
    modal.setAttribute("aria-hidden", "false");
    syncBodyModalState();

    setTimeout(() => {
      focusElement(closeModalBtn || modalBox || modal);
    }, 30);
  };

  const closeModal = () => {
    if (!isOpen()) return;

    modal.classList.remove("open", "active");
    modal.setAttribute("aria-hidden", "true");
    syncBodyModalState();

    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      focusElement(lastFocusedElement);
    }
  };

  if (openModalBtn && openModalBtn.dataset.modalBound !== "true") {
    openModalBtn.dataset.modalBound = "true";
    openModalBtn.addEventListener("click", openModal);
  }

  if (closeModalBtn && closeModalBtn.dataset.modalBound !== "true") {
    closeModalBtn.dataset.modalBound = "true";
    closeModalBtn.addEventListener("click", closeModal);
  }

  if (backdrop && backdrop.dataset.modalBound !== "true") {
    backdrop.dataset.modalBound = "true";
    backdrop.addEventListener("click", closeModal);
  }

  if (modalBox && modalBox.dataset.modalBound !== "true") {
    modalBox.dataset.modalBound = "true";
    modalBox.addEventListener("click", e => {
      e.stopPropagation();
    });
  }

  if (modal.dataset.escBound !== "true") {
    modal.dataset.escBound = "true";
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (!isOpen()) return;
      if (document.querySelector(".success-overlay")) return;
      if (document.querySelector(".summer-lightbox")) return;
      closeModal();
    });
  }

  return { openModal, closeModal, isOpen };
}

/* ─────────────────────────────────────────
   PACKAGE BUTTONS
───────────────────────────────────────── */
function selectPackageImpl(packageName) {
  const selectEl = getField("campSelectedPackage");
  const wanted = normalizeText(packageName);

  if (selectEl && wanted) {
    const matchedOption = findMatchingPackageOption(selectEl, wanted);

    if (matchedOption) {
      selectEl.value = matchedOption.value;
    }

    selectEl.dispatchEvent(new Event("change", { bubbles: true }));

    selectEl.style.transition =
      "box-shadow 0.4s cubic-bezier(0.34,1.56,0.64,1), border-color 0.4s ease";
    selectEl.style.boxShadow =
      "0 0 0 4px rgba(244,180,26,0.5), 0 0 20px rgba(244,180,26,0.2)";
    selectEl.style.borderColor = "rgba(244,180,26,0.8)";

    setTimeout(() => {
      selectEl.style.boxShadow = "";
      selectEl.style.borderColor = "";
    }, 2200);
  }

  if (registerModalApi && typeof registerModalApi.openModal === "function") {
    registerModalApi.openModal();
  } else {
    const modal = getField("camp-register-modal");
    if (modal) {
      modal.classList.add("open", "active");
      modal.setAttribute("aria-hidden", "false");
      syncBodyModalState();
    }
  }

  setTimeout(() => {
    if (selectEl) {
      focusElement(selectEl);
      scrollToElement(selectEl);
    }
  }, 120);
}

function initPackageButtons() {
  const buttons = document.querySelectorAll(".pc-btn");

  buttons.forEach(button => {
    const inlinePackage = extractPackageNameFromInline(button);
    const cardPackage = extractPackageNameFromCard(button);
    const packageName = inlinePackage || cardPackage;

    if (packageName && !button.dataset.packageName) {
      button.dataset.packageName = packageName;
    }

    button.removeAttribute("onclick");

    if (button.dataset.packageBound === "true") return;
    button.dataset.packageBound = "true";

    button.addEventListener("click", e => {
      e.preventDefault();
      const wanted =
        button.dataset.packageName ||
        extractPackageNameFromInline(button) ||
        extractPackageNameFromCard(button);

      if (!wanted) return;
      selectPackageImpl(wanted);
    });
  });
}

/* expose globals for inline onclick */
window.selectPackage = selectPackageImpl;
globalThis.selectPackage = selectPackageImpl;

/* ─────────────────────────────────────────
   SQUARES BACKGROUND
───────────────────────────────────────── */
let canvas = null;
let ctx = null;
let squares = [];
const SQ_SIZE = 40;
const SQ_GAP = 4;
let cols = 0;
let rows = 0;
let squareAnimationId = null;
let squaresResizeBound = false;

function setupCanvasRefs() {
  canvas = getField("squares-canvas");
  ctx = canvas ? canvas.getContext("2d") : null;
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  cols = Math.ceil(window.innerWidth / (SQ_SIZE + SQ_GAP));
  rows = Math.ceil(window.innerHeight / (SQ_SIZE + SQ_GAP));
  initSquares();
  drawSquaresFrame();
}

function initSquares() {
  squares = [];
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      squares.push({
        x: i * (SQ_SIZE + SQ_GAP),
        y: j * (SQ_SIZE + SQ_GAP),
        opacity: Math.random() * 0.22,
        targetOpacity: Math.random() * 0.28,
        speed: 0.004 + Math.random() * 0.008
      });
    }
  }
}

function drawSquaresFrame() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  squares.forEach(sq => {
    ctx.fillStyle = `rgba(83, 204, 255, ${sq.opacity})`;
    ctx.fillRect(sq.x, sq.y, SQ_SIZE, SQ_SIZE);
  });
}

function animateSquares() {
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  squares.forEach(sq => {
    if (Math.abs(sq.opacity - sq.targetOpacity) < 0.01) {
      sq.targetOpacity = Math.random() * 0.32;
    }
    sq.opacity += (sq.targetOpacity - sq.opacity) * sq.speed;
    ctx.fillStyle = `rgba(83, 204, 255, ${sq.opacity})`;
    ctx.fillRect(sq.x, sq.y, SQ_SIZE, SQ_SIZE);
  });

  squareAnimationId = requestAnimationFrame(animateSquares);
}

function initSquaresBackground() {
  setupCanvasRefs();
  if (!canvas || !ctx) return;

  resizeCanvas();

  if (squareAnimationId) {
    cancelAnimationFrame(squareAnimationId);
    squareAnimationId = null;
  }

  if (!prefersReducedMotion) {
    animateSquares();
  } else {
    drawSquaresFrame();
  }

  if (!squaresResizeBound) {
    squaresResizeBound = true;
    window.addEventListener("resize", resizeCanvas, { passive: true });
  }
}

/* ─────────────────────────────────────────
   VIDEO LOGIC
───────────────────────────────────────── */
function applyDirectVideoFallback(playerEl) {
  if (!playerEl) return;

  const currentMode = playerEl.dataset.videoMode;
  const currentSrc = playerEl.getAttribute("src") || playerEl.currentSrc || "";

  if (currentMode === "fallback" && currentSrc.includes(VIDEO_PUBLIC_ID)) {
    playerEl.dataset.videoReady = "true";
    return;
  }

  try {
    playerEl.pause?.();
  } catch (error) {
    console.error("Video pause before fallback failed:", error);
  }

  playerEl.innerHTML = "";
  playerEl.classList.add("camp-video-iframe", "cld-video-player", "cld-fluid");
  playerEl.setAttribute("playsinline", "true");
  playerEl.setAttribute("controls", "true");
  playerEl.setAttribute("preload", "metadata");
  playerEl.setAttribute("src", VIDEO_FALLBACK_SRC);
  playerEl.load();

  playerEl.dataset.videoReady = "true";
  playerEl.dataset.videoMode = "fallback";
}

function tryInitCloudinaryPlayer(playerEl) {
  if (!playerEl) return false;
  if (playerEl.dataset.videoMode === "cloudinary" && playerEl.dataset.videoReady === "true") {
    return true;
  }

  const cloudinaryGlobal = window.cloudinary;
  if (!cloudinaryGlobal || typeof cloudinaryGlobal.videoPlayer !== "function") {
    return false;
  }

  try {
    const playerId = playerEl.id || "player";
    if (!playerEl.id) playerEl.id = playerId;

    playerEl.classList.add("camp-video-iframe", "cld-video-player", "cld-fluid");
    playerEl.setAttribute("playsinline", "true");
    playerEl.setAttribute("controls", "true");
    playerEl.setAttribute("preload", "metadata");

    const player = cloudinaryGlobal.videoPlayer(playerId, {
      cloudName: VIDEO_CLOUD_NAME,
      controls: true,
      fluid: true,
      autoplayMode: "never",
      muted: false,
      secure: true
    });

    if (player && typeof player.source === "function") {
      player.source({
        publicId: VIDEO_PUBLIC_ID,
        sourceTypes: ["mp4"]
      });
    }

    if (player && typeof player.on === "function") {
      player.on("error", () => {
        applyDirectVideoFallback(playerEl);
      });
    }

    playerEl.dataset.videoReady = "true";
    playerEl.dataset.videoMode = "cloudinary";

    setTimeout(() => {
      const hasSource =
        Boolean(playerEl.currentSrc) ||
        Boolean(playerEl.getAttribute("src")) ||
        Boolean(playerEl.querySelector("source")) ||
        Boolean(document.querySelector("#player source"));

      if (!hasSource && playerEl.dataset.videoMode !== "fallback") {
        applyDirectVideoFallback(playerEl);
      }
    }, 1500);

    return true;
  } catch (error) {
    console.error("Cloudinary player init failed:", error);
    return false;
  }
}

function initCampVideo() {
  const playerEl = getField("player");
  if (!playerEl) return;

  if (playerEl.dataset.videoInitialized === "true") return;
  playerEl.dataset.videoInitialized = "true";

  playerEl.classList.add("camp-video-iframe", "cld-video-player", "cld-fluid");
  playerEl.setAttribute("playsinline", "true");
  playerEl.setAttribute("controls", "true");
  playerEl.setAttribute("preload", "metadata");

  playerEl.addEventListener("error", () => {
    applyDirectVideoFallback(playerEl);
  }, { once: true });

  let attempts = 0;
  const maxAttempts = 16;

  const boot = () => {
    attempts += 1;

    const started = tryInitCloudinaryPlayer(playerEl);
    if (started) return;

    if (attempts >= maxAttempts) {
      applyDirectVideoFallback(playerEl);
      return;
    }

    setTimeout(boot, 250);
  };

  boot();
}

/* ─────────────────────────────────────────
   REVEAL & TILT
───────────────────────────────────────── */
function injectRevealStyles() {
  if (document.getElementById("summer-reveal-style")) return;

  const style = document.createElement("style");
  style.id = "summer-reveal-style";
  style.textContent = `
    .reveal-on-scroll {
      opacity: 0;
      transform: translateY(40px) scale(0.98);
      transition: opacity 0.75s cubic-bezier(0.34,1.56,0.64,1),
                  transform 0.75s cubic-bezier(0.34,1.56,0.64,1);
      will-change: opacity, transform;
    }
    .reveal-on-scroll.revealed {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .pricing-card.premium.reveal-on-scroll { transform: translateY(40px) scale(1); }
    .pricing-card.premium.reveal-on-scroll.revealed { transform: translateY(0) scale(1); }
    .pricing-card.premium:hover { transform: translateY(-6px) !important; }

    .camp-input-error {
      border-color: #ff4757 !important;
      box-shadow: 0 0 0 4px rgba(255,71,87,0.15) !important;
      animation: shakeError 0.4s ease;
    }
    @keyframes shakeError {
      0%,100% { transform: translateX(0); }
      25% { transform: translateX(-8px); }
      75% { transform: translateX(8px); }
    }

    .camp-choice-error {
      outline: 2px solid rgba(255,71,87,0.55);
      border-color: rgba(255,71,87,0.65) !important;
      box-shadow: 0 0 0 4px rgba(255,71,87,0.15) !important;
      animation: shakeError 0.4s ease;
    }

    .camp-gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .camp-gallery-item {
      position: relative;
      overflow: hidden;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,.15);
      background: rgba(255,255,255,.05);
      box-shadow: 0 12px 28px rgba(0,0,0,.15);
      cursor: zoom-in;
      transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
    }
    .camp-gallery-item:hover {
      transform: translateY(-5px) scale(1.02);
      box-shadow: 0 20px 40px rgba(0,0,0,.25);
      border-color: rgba(255,255,255,.3);
    }
    .camp-gallery-img {
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      display: block;
    }
    .camp-gallery-overlay {
      position: absolute;
      inset: auto 0 0 0;
      padding: 15px;
      background: linear-gradient(180deg, transparent, rgba(3,15,35,.85));
      color: #fff;
      font-size: .95rem;
      font-weight: 700;
    }
    .camp-gallery-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 50px 20px;
      text-align: center;
      color: rgba(201,231,248,0.7);
      font-size: 1.05rem;
      font-weight: 700;
    }

    .success-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(3,15,45,0.88);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      animation: soFadeIn 0.3s ease;
      padding: 18px;
    }
    .success-card {
      background: linear-gradient(145deg, rgba(10,61,115,0.95), rgba(3,21,47,0.98));
      border: 1px solid rgba(255,255,255,0.18);
      padding: 44px 40px;
      border-radius: 36px;
      text-align: center;
      box-shadow: 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2);
      animation: soPopIn 0.5s cubic-bezier(0.34,1.56,0.64,1);
      max-width: 90%;
      width: 460px;
      position: relative;
      overflow: hidden;
    }
    .success-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, #f4b41a, #ffd86b, #f4b41a, transparent);
    }

    .summer-lightbox {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(2,9,21,.92);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      cursor: zoom-out;
      animation: soFadeIn .25s ease;
    }
    .summer-lightbox-box {
      position: relative;
      max-width: min(1100px, 100%);
      max-height: 90vh;
      cursor: default;
    }
    .summer-lightbox-img {
      display: block;
      max-width: 100%;
      max-height: 90vh;
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0,0,0,.55);
      animation: soPopIn .3s cubic-bezier(.34,1.56,.64,1);
    }
    .summer-lightbox-close {
      position: absolute;
      top: 14px;
      left: 14px;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: rgba(255,255,255,.15);
      border: 1px solid rgba(255,255,255,.25);
      color: #fff;
      font-size: 22px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: .25s ease;
    }
    .summer-lightbox-close:hover {
      background: rgba(255,255,255,.25);
      transform: scale(1.1);
    }

    @keyframes soFadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes soPopIn {
      from { transform: scale(0.8) translateY(30px); opacity:0; }
      to   { transform: scale(1) translateY(0); opacity:1; }
    }
  `;
  document.head.appendChild(style);
}

function initRevealOnScroll() {
  injectRevealStyles();

  const targets = document.querySelectorAll(
    ".camp-section, .camp-workshop-card, .summer-strip-item, " +
    ".summer-journey-card, .camp-info-card, .pricing-card, .form-group"
  );

  if (!targets.length) return;

  targets.forEach((el, i) => {
    el.classList.add("reveal-on-scroll");
    el.style.transitionDelay = `${(i % 4) * 0.08}s`;
  });

  const obs = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.07, rootMargin: "0px 0px -25px 0px" });

  targets.forEach(el => obs.observe(el));
}

function initTiltEffect() {
  if (
    (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) ||
    prefersReducedMotion
  ) return;

  document.querySelectorAll(
    ".camp-workshop-card, .camp-info-card, .summer-journey-card"
  ).forEach(card => {
    if (card.dataset.tiltBound === "true") return;
    card.dataset.tiltBound = "true";

    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const rx = ((y - r.height / 2) / (r.height / 2)) * -8;
      const ry = ((x - r.width / 2) / (r.width / 2)) * 8;
      card.style.transform =
        `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform =
        "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    });
  });
}

/* ─────────────────────────────────────────
   GALLERY
───────────────────────────────────────── */
function buildGalleryEmpty() {
  return `
    <div class="camp-gallery-empty" style="grid-column:1/-1;">
      <span style="font-size:42px;">🏕️</span>
      <span style="font-size:1.1rem;font-weight:800;color:rgba(201,231,248,0.9);">
        قريباً — سنكون معكم!
      </span>
      <span style="font-size:0.95rem;color:rgba(201,231,248,0.6);max-width:380px;line-height:1.8;">
        سيتم نشر صور وأبرز لحظات المخيم الصيفي فور انطلاقه.<br>
        ترقّبوا التجربة الصيفية المميزة ✦
      </span>
    </div>`;
}

function openLightbox(src, alt = "Summer School") {
  const existing = document.querySelector(".summer-lightbox");
  if (existing) {
    safelyRemoveNode(existing);
  }

  const overlay = document.createElement("div");
  overlay.className = "summer-lightbox";
  overlay.innerHTML = `
    <div class="summer-lightbox-box">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="summer-lightbox-img" draggable="false">
      <button type="button" class="summer-lightbox-close" aria-label="إغلاق">✕</button>
    </div>`;

  let closed = false;

  const escHandler = e => {
    if (e.key === "Escape") {
      close();
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", escHandler);
    safelyRemoveNode(overlay);
    syncBodyModalState();
  };

  overlay.addEventListener("click", e => {
    if (e.target === overlay || e.target.closest(".summer-lightbox-close")) {
      close();
    }
  });

  document.addEventListener("keydown", escHandler);
  document.body.appendChild(overlay);
  syncBodyModalState();
}

function bindGalleryItems() {
  const grid = getField("camp-gallery-grid");
  if (!grid) return;

  const candidates = grid.querySelectorAll(
    ".camp-gallery-item, [data-lightbox-src], img"
  );

  candidates.forEach(item => {
    if (item.dataset.galleryBound === "true") return;
    item.dataset.galleryBound = "true";

    item.addEventListener("click", e => {
      const holder = e.currentTarget;
      const explicitSrc = holder.getAttribute("data-lightbox-src");
      const img = holder.matches("img") ? holder : holder.querySelector("img");
      const src = explicitSrc || img?.currentSrc || img?.getAttribute("src");
      const alt = holder.getAttribute("data-lightbox-alt") || img?.getAttribute("alt") || "Summer School";

      if (!src) return;
      e.preventDefault();
      openLightbox(src, alt);
    });
  });
}

function loadCampGallery() {
  const grid = getField("camp-gallery-grid");
  if (!grid) return;

  const hasRealItems = Boolean(
    grid.querySelector(".camp-gallery-item, [data-lightbox-src], img")
  );

  if (hasRealItems) {
    bindGalleryItems();
    return;
  }

  if (!normalizeText(grid.innerHTML)) {
    grid.innerHTML = buildGalleryEmpty();
  } else if (!grid.querySelector(".camp-gallery-empty")) {
    grid.innerHTML = buildGalleryEmpty();
  }
}

/* ─────────────────────────────────────────
   REGISTRATION
───────────────────────────────────────── */
function markInvalid(el) {
  if (!el) return;
  el.classList.add("camp-input-error");
  el.addEventListener("input", () => el.classList.remove("camp-input-error"), { once: true });
  el.addEventListener("change", () => el.classList.remove("camp-input-error"), { once: true });
}

function markChoiceInvalid(elements) {
  elements.forEach(el => {
    const label = el.closest(".choice-checkbox-label");
    if (!label) return;
    label.classList.add("camp-choice-error");
    const clear = () => label.classList.remove("camp-choice-error");
    el.addEventListener("change", clear, { once: true });
    el.addEventListener("input", clear, { once: true });
  });
}

function validatePhone(phone) {
  return /^[+0-9]{8,18}$/.test(normalizePhone(phone));
}

function setSubmitButtonLoading() {
  const submitBtn = getField("camp-submit-btn");
  if (!submitBtn) return;

  submitBtn.disabled = true;
  submitBtn.style.pointerEvents = "none";
  submitBtn.style.opacity = "0.9";
  submitBtn.style.background = "linear-gradient(135deg,#0ea5e9,#0284c7)";
  submitBtn.innerHTML = "<span>جاري إرسال الطلب...</span>";
}

function resetSubmitButton() {
  const submitBtn = getField("camp-submit-btn");
  if (!submitBtn) return;

  submitBtn.disabled = false;
  submitBtn.style.pointerEvents = "";
  submitBtn.style.opacity = "1";
  submitBtn.style.background = "linear-gradient(135deg,#ffc849,#ff9f1d)";
  submitBtn.innerHTML = "<span>إرسال طلب التسجيل</span>";
}

function setSubmitButtonError() {
  const submitBtn = getField("camp-submit-btn");
  if (!submitBtn) return;

  submitBtn.disabled = false;
  submitBtn.style.pointerEvents = "";
  submitBtn.style.opacity = "1";
  submitBtn.style.background = "linear-gradient(135deg,#dc2626,#b91c1c)";
  submitBtn.innerHTML = "<span>حدث خطأ، أعد المحاولة</span>";

  setTimeout(() => {
    resetSubmitButton();
  }, 2200);
}

function buildSuccessModal(firstName, lastName, selectedPackage, languageText) {
  const overlay = document.createElement("div");
  overlay.className = "success-overlay";
  overlay.innerHTML = `
    <div class="success-card">
      <div style="font-size:64px;margin-bottom:16px;filter:drop-shadow(0 10px 20px rgba(0,0,0,.3))">🎉</div>
      <h2 style="color:#fff;margin-bottom:10px;font-size:24px;font-weight:950;line-height:1.3;">تم تسجيل المقعد بنجاح!</h2>
      <p style="color:#c9e7f8;font-size:16px;line-height:1.9;margin-bottom:8px;">
        مرحباً
        <strong style="color:#ffd86b;font-size:19px;">${escapeHtml(firstName)} ${escapeHtml(lastName)}</strong>
      </p>
      <div style="
        display:inline-flex;align-items:center;gap:8px;
        padding:10px 20px;border-radius:14px;margin:12px 0 8px;
        background:rgba(244,180,26,0.15);border:1px solid rgba(244,180,26,0.3);
        color:#ffe090;font-weight:800;font-size:15px;
      ">✦ ${escapeHtml(selectedPackage)}</div>
      ${languageText ? `
      <div style="
        display:inline-flex;align-items:center;gap:8px;
        padding:8px 18px;border-radius:14px;margin:0 0 20px;
        background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.25);
        color:#bae6fd;font-weight:800;font-size:14px;
      ">🌐 التفاصيل المختارة: ${escapeHtml(languageText)}</div>` : '<div style="margin-bottom:20px;"></div>'}
      <p style="color:rgba(201,231,248,0.75);font-size:14px;line-height:1.8;margin-bottom:26px;">
        تم إرسال بيانات التسجيل بنجاح.<br>
        سيتم التواصل معكم قريباً عبر رقم ولي الأمر.
      </p>
      <button
        type="button"
        id="success-close-btn"
        style="
          position:relative;overflow:hidden;
          padding:14px 36px;border-radius:18px;border:none;
          background:linear-gradient(135deg,#ffc849,#ff9f1d);
          color:#03152f;font-weight:900;font-size:15px;
          cursor:pointer;box-shadow:0 15px 30px rgba(255,159,29,.35);
          transition:0.3s cubic-bezier(0.34,1.56,0.64,1);
          font-family:inherit;
        "
      >العودة للصفحة ✦</button>
    </div>`;

  const button = overlay.querySelector("#success-close-btn");
  let closed = false;

  const escHandler = e => {
    if (e.key === "Escape") {
      closeOverlay();
    }
  };

  const closeOverlay = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", escHandler);
    safelyRemoveNode(overlay);
    successOverlayShown = false;
    isSubmitting = false;
    resetSubmitButton();
    syncBodyModalState();
  };

  if (button) {
    button.addEventListener("mouseenter", () => {
      button.style.transform = "translateY(-3px)";
      button.style.boxShadow = "0 20px 40px rgba(255,159,29,.45)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "";
      button.style.boxShadow = "0 15px 30px rgba(255,159,29,.35)";
    });

    button.addEventListener("click", closeOverlay);
  }

  document.addEventListener("keydown", escHandler);
  syncBodyModalState();

  return overlay;
}

async function submitWithFallback(payload) {
  const jsonBody = JSON.stringify(payload);

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: jsonBody
    });
    return true;
  } catch (error1) {
    try {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value);
      });

      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: formData
      });
      return true;
    } catch (error2) {
      throw error2;
    }
  }
}

function getChosenDetails(selectedPackage, language, bacLanguages, itTrack) {
  if (isBacPackage(selectedPackage)) return `لغتا البكالوريا: ${bacLanguages}`;
  if (isITAdvancedPackage(selectedPackage)) return `مسار الإعلام الآلي: ${itTrack}`;
  if (needsSingleLanguage(selectedPackage) && language) return `اللغة المختارة: ${language}`;
  return "";
}

function clearFormErrors() {
  document.querySelectorAll(".camp-input-error").forEach(el => {
    el.classList.remove("camp-input-error");
  });

  document.querySelectorAll(".camp-choice-error").forEach(el => {
    el.classList.remove("camp-choice-error");
  });
}

function resetCampFormState() {
  const form = getField("camp-form");
  const packageEl = getField("campSelectedPackage");

  if (form) form.reset();
  clearFormErrors();

  if (packageEl) {
    packageEl.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    updateLanguageOptionsByPackage("");
  }
}

async function campRegister(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (isSubmitting || successOverlayShown) return false;

  const packageEl = getField("campSelectedPackage");
  const firstNameEl = getField("campFirstName");
  const lastNameEl = getField("campLastName");
  const ageEl = getField("campAge");
  const parentNameEl = getField("campParentName");
  const parentPhoneEl = getField("campParentPhone");
  const langEl = getField("campLanguage");

  const bacLangBoxes = document.querySelectorAll('input[name="bacLang"]');
  const itTrackBoxes = document.querySelectorAll('input[name="itTrack"]');
  const itTrackChosen = document.querySelector('input[name="itTrack"]:checked');

  if (!packageEl || !firstNameEl || !lastNameEl || !ageEl || !parentNameEl || !parentPhoneEl) {
    return false;
  }

  clearFormErrors();

  const selectedPackage = normalizeText(packageEl.value);
  const firstName = normalizeText(firstNameEl.value);
  const lastName = normalizeText(lastNameEl.value);
  const age = normalizeText(ageEl.value);
  const ageNumber = Number(age);
  const parentName = normalizeText(parentNameEl.value);
  const parentPhone = normalizePhone(parentPhoneEl.value);
  const language = normalizeText(langEl ? langEl.value : "");
  const bacSelected = [...bacLangBoxes].filter(box => box.checked).map(box => normalizeText(box.value));
  const bacLanguages = bacSelected.join(" + ");
  const itTrack = itTrackChosen ? normalizeText(itTrackChosen.value) : "";

  const showBac = isBacPackage(selectedPackage);
  const showLang = needsSingleLanguage(selectedPackage);
  const showIT = isITAdvancedPackage(selectedPackage);

  let valid = true;
  let firstInvalidEl = null;
  let firstErrorMessage = "";

  const setFirstError = (el, message) => {
    if (!firstInvalidEl && el) {
      firstInvalidEl = el;
    }
    if (!firstErrorMessage && message) {
      firstErrorMessage = message;
    }
  };

  [
    { el: packageEl, val: selectedPackage, message: "❌ يرجى اختيار الباقة." },
    { el: firstNameEl, val: firstName, message: "❌ يرجى إدخال الاسم." },
    { el: lastNameEl, val: lastName, message: "❌ يرجى إدخال اللقب." },
    { el: ageEl, val: age, message: "❌ يرجى إدخال العمر." },
    { el: parentNameEl, val: parentName, message: "❌ يرجى إدخال اسم ولي الأمر." },
    { el: parentPhoneEl, val: parentPhone, message: "❌ يرجى إدخال رقم ولي الأمر." }
  ].forEach(field => {
    if (!field.val) {
      markInvalid(field.el);
      valid = false;
      setFirstError(field.el, field.message);
    }
  });

  if (age && (!Number.isFinite(ageNumber) || ageNumber < CAMP_MIN_AGE)) {
    markInvalid(ageEl);
    valid = false;
    setFirstError(ageEl, `❌ العمر الأدنى للتسجيل هو ${CAMP_MIN_AGE} سنوات.`);
  }

  if (parentPhone && !validatePhone(parentPhone)) {
    markInvalid(parentPhoneEl);
    valid = false;
    setFirstError(parentPhoneEl, "❌ رقم الهاتف غير صالح.");
  }

  if (showLang && !language) {
    markInvalid(langEl);
    valid = false;
    setFirstError(langEl, "❌ يرجى اختيار اللغة.");
  }

  if (showBac && bacSelected.length !== 2) {
    markChoiceInvalid([...bacLangBoxes]);
    valid = false;
    setFirstError(bacLangBoxes[0], "❌ يرجى اختيار لغتين فقط لباقة البكالوريا.");
  }

  if (showIT && !itTrack) {
    markChoiceInvalid([...itTrackBoxes]);
    valid = false;
    setFirstError(itTrackBoxes[0], "❌ يرجى اختيار مسار الإعلام الآلي.");
  }

  if (!valid) {
    if (firstInvalidEl) {
      scrollToElement(firstInvalidEl);
      setTimeout(() => focusElement(firstInvalidEl), 150);
    }
    if (firstErrorMessage) {
      alert(firstErrorMessage);
    }
    return false;
  }

  const chosenDetails = getChosenDetails(selectedPackage, language, bacLanguages, itTrack);
  const payload = {
    timestamp: new Date().toLocaleString("ar-DZ"),
    submittedAtISO: new Date().toISOString(),
    page: window.location.href,
    source: "summer-school",
    package: selectedPackage,
    language,
    bacLanguages,
    itTrack,
    chosenDetails,
    firstName,
    lastName,
    age,
    parentName,
    parentPhone,
    userAgent: navigator.userAgent.slice(0, 180)
  };

  isSubmitting = true;
  setSubmitButtonLoading();

  try {
    await submitWithFallback(payload);

    resetCampFormState();

    if (registerModalApi && typeof registerModalApi.closeModal === "function") {
      registerModalApi.closeModal();
    }

    const existingOverlay = document.querySelector(".success-overlay");
    if (existingOverlay) {
      safelyRemoveNode(existingOverlay);
    }

    const overlay = buildSuccessModal(firstName, lastName, selectedPackage, chosenDetails);
    document.body.appendChild(overlay);
    successOverlayShown = true;
    isSubmitting = false;
    resetSubmitButton();

    setTimeout(() => {
      focusElement(overlay.querySelector("#success-close-btn"));
    }, 50);

    return true;
  } catch (error) {
    console.error("Camp registration failed:", error);
    isSubmitting = false;
    setSubmitButtonError();
    alert("❌ تعذر إرسال الطلب حالياً. يرجى المحاولة مرة أخرى بعد قليل.");
    return false;
  }
}

function initCampForm() {
  const form = getField("camp-form");
  const submitBtn = getField("camp-submit-btn");
  const parentPhoneEl = getField("campParentPhone");
  const ageEl = getField("campAge");

  if (form && form.dataset.submitBound !== "true") {
    form.dataset.submitBound = "true";
    form.addEventListener("submit", campRegister);
  }

  if (submitBtn && submitBtn.dataset.submitBound !== "true") {
    submitBtn.dataset.submitBound = "true";
    submitBtn.addEventListener("click", e => {
      if (submitBtn.type !== "submit") {
        campRegister(e);
      }
    });
  }

  if (parentPhoneEl && parentPhoneEl.dataset.phoneBound !== "true") {
    parentPhoneEl.dataset.phoneBound = "true";
    parentPhoneEl.addEventListener("input", () => {
      const cleaned = parentPhoneEl.value.replace(/[^\d+\s]/g, "");
      if (cleaned !== parentPhoneEl.value) {
        parentPhoneEl.value = cleaned;
      }
    });
  }

  if (ageEl && ageEl.dataset.ageBound !== "true") {
    ageEl.dataset.ageBound = "true";
    ageEl.addEventListener("input", () => {
      if (Number(ageEl.value) < 0) {
        ageEl.value = "";
      }
    });
  }
}

/* expose submit globally if needed */
window.campRegister = campRegister;
globalThis.campRegister = campRegister;

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
function initSummerCampPage() {
  registerModalApi = initRegisterModal();
  initPricingTabs();
  initPackageButtons();
  initDynamicFields();
  initSquaresBackground();
  initCampVideo();
  initRevealOnScroll();
  initTiltEffect();
  loadCampGallery();
  bindGalleryItems();
  initCampForm();
  resetSubmitButton();
  syncBodyModalState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSummerCampPage, { once: true });
} else {
  initSummerCampPage();
}
