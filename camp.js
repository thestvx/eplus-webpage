import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

/* =========================
   FIREBASE
========================= */
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

/* =========================
   CONSTANTS
========================= */
const CAMP_MIN_AGE = 5;
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec"; // بدله بالرابط الحقيقي
const SPECIAL_APPS_SCRIPT_URL = APPS_SCRIPT_URL;

const VIDEO_PUBLIC_ID = "copy_B61063D2-D03E-41C1-AB91-1B692AB1F686_rvphab";
const VIDEO_CLOUD_NAME = "dac4mwuwe";
const VIDEO_FALLBACK_SRC = `https://res.cloudinary.com/${VIDEO_CLOUD_NAME}/video/upload/q_auto,f_auto/${VIDEO_PUBLIC_ID}.mp4`;

const prefersReducedMotion =
  window.matchMedia &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let isSubmitting = false;
let successOverlayShown = false;
let registerModalApi = null;
let specialRegisterModalApi = null;

/* =========================
   HELPERS
========================= */
function getField(id) {
  return document.getElementById(id);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizePhone(phone) {
  return normalizeText(phone).replace(/[^\d+]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safelyRemoveNode(node) {
  if (node && node.parentNode) node.parentNode.removeChild(node);
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

function normalizeDash(value) {
  return normalizeText(value).replace(/[–—]/g, "-");
}

function simplifyPackageValue(value) {
  return normalizeDash(value)
    .replace(/[\u200f\u200e]/g, "")
    .replace(/[,،]/g, "")
    .replace(/\s*d\.?a\.?j?\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function setBodyModalState(isOpen) {
  document.body.style.overflow = isOpen ? "hidden" : "";
}

function syncBodyModalState() {
  const ids = ["camp-register-modal", "special-register-modal"];
  const modalOpen = ids.some((id) => {
    const el = getField(id);
    return Boolean(
      el &&
        (el.classList.contains("open") ||
          el.classList.contains("active") ||
          el.getAttribute("aria-hidden") === "false")
    );
  });

  const hasSuccess = Boolean(document.querySelector(".success-overlay"));
  const hasLightbox = Boolean(document.querySelector(".summer-lightbox"));

  setBodyModalState(modalOpen || hasSuccess || hasLightbox);
}

function getPackageSearchText(input) {
  const selectEl = getField("campSelectedPackage");
  let option = null;
  let rawValue = "";

  if (input instanceof HTMLSelectElement) {
    option = input.selectedOptions?.[0] || null;
    rawValue = option?.value || option?.textContent || "";
  } else {
    rawValue = normalizeText(input);
    if (selectEl) option = findMatchingPackageOption(selectEl, rawValue);
  }

  const parts = [
    rawValue,
    option?.value,
    option?.textContent,
    option?.parentElement?.label,
    option?.parentElement?.getAttribute?.("label")
  ];

  return simplifyPackageValue(parts.filter(Boolean).join(" "));
}

function getPackageSearchTextFromOption(option) {
  if (!option) return "";
  return simplifyPackageValue(
    [
      option.value,
      option.textContent,
      option.parentElement?.label,
      option.parentElement?.getAttribute?.("label")
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function findMatchingPackageOption(selectEl, packageName) {
  if (!selectEl) return null;
  const wanted = simplifyPackageValue(packageName);
  if (!wanted) return null;

  const options = [...selectEl.options].filter((option) => normalizeText(option.value));

  let exact = options.find((option) => getPackageSearchTextFromOption(option) === wanted);
  if (exact) return exact;

  exact = options.find((option) => simplifyPackageValue(option.value) === wanted);
  if (exact) return exact;

  exact = options.find((option) => simplifyPackageValue(option.textContent) === wanted);
  if (exact) return exact;

  let loose = options.find((option) => {
    const haystack = getPackageSearchTextFromOption(option);
    return haystack && (haystack.includes(wanted) || wanted.includes(haystack));
  });
  if (loose) return loose;

  const wantedWords = wanted.split(" ").filter(Boolean);
  loose = options.find((option) => {
    const haystack = getPackageSearchTextFromOption(option);
    return wantedWords.every((word) => haystack.includes(word));
  });

  return loose || null;
}

function clearErrorState(el) {
  if (!el) return;
  el.classList.remove("camp-input-error");
}

function clearChoiceErrorByName(name) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.classList.remove("camp-input-error");
    input.closest(".choice-checkbox-label")?.classList.remove("camp-choice-error");
  });
}

function trapFocusInModal(e, modal) {
  if (e.key !== "Tab" || !modal) return;

  const focusable = [...modal.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((el) => el.offsetParent !== null);

  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (e.shiftKey && active === first) {
    e.preventDefault();
    focusElement(last);
    return;
  }

  if (!e.shiftKey && active === last) {
    e.preventDefault();
    focusElement(first);
  }
}

/* =========================
   PACKAGE RULES
========================= */
function isBacPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return value.includes("bac prep") || value.includes("باكالوريا");
}

function isITAdvancedPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return (
    value.includes("adults advanced") ||
    value.includes("office") ||
    value.includes("powerpoint") ||
    value.includes("excel") ||
    value.includes("word") ||
    value.includes("html css")
  );
}

function isAdultPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return value.includes("adults") || value.includes("adult");
}

function isAdultBasicPackage(packageValue) {
  return isAdultPackage(packageValue) && !isITAdvancedPackage(packageValue);
}

function isEnglishCommunicationPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return value.includes("english communication class");
}

function isIELTSPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return value.includes("ielts preparation") || value.includes("ielts prep");
}

function isESPPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return (
    value.includes("english for specific purposes") ||
    value.includes("english for special purposes") ||
    value.includes(" esp ")
  );
}

function isSpecialPackage(packageValue) {
  return (
    isEnglishCommunicationPackage(packageValue) ||
    isIELTSPackage(packageValue) ||
    isESPPackage(packageValue) ||
    getPackageSearchText(packageValue).includes("e-plus special")
  );
}

function isFiveToTenPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return value.includes("5-10") || value.includes("510") || value.includes("5 10");
}

function isElevenToFourteenPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return value.includes("11-14") || value.includes("1114") || value.includes("11 14");
}

function isFifteenToEighteenPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return value.includes("15-18") || value.includes("1518") || value.includes("15 18");
}

function needsLanguageChoices(packageValue) {
  if (!normalizeText(packageValue)) return false;
  if (isBacPackage(packageValue)) return false;
  if (isESPPackage(packageValue)) return false;
  return (
    isFiveToTenPackage(packageValue) ||
    isElevenToFourteenPackage(packageValue) ||
    isFifteenToEighteenPackage(packageValue) ||
    isAdultBasicPackage(packageValue) ||
    isEnglishCommunicationPackage(packageValue) ||
    isIELTSPackage(packageValue)
  );
}

function getAllowedLanguageCount(packageValue) {
  if (isFiveToTenPackage(packageValue)) return 1;
  return 2;
}

function allowSpanishByPackage(packageValue) {
  return !isFiveToTenPackage(packageValue) && !isEnglishCommunicationPackage(packageValue) && !isIELTSPackage(packageValue);
}

/* =========================
   DYNAMIC FIELDS
========================= */
function initDynamicFields() {
  const packageEl = getField("campSelectedPackage");
  const langGroup = getField("campLanguageGroup");
  const comboGroup = getField("campPackageChoiceGroup");
  const itGroup = getField("campITChoiceGroup");
  const adultLevelGroup = getField("campAdultLevelGroup");
  const adultTestGroup = getField("campAdultTestGroup");
  const adultLevelEl = getField("campAdultLevel");

  const bacLangBoxes = document.querySelectorAll('input[name="bacLang"]');
  const itTrackBoxes = document.querySelectorAll('input[name="itTrack"]');
  const adultTestRadios = document.querySelectorAll('input[name="adultTest"]');
  const campLanguageBoxes = document.querySelectorAll('input[name="campLanguageChoice"]');

  if (!packageEl) return;

  const clearBac = () => {
    bacLangBoxes.forEach((box) => {
      box.checked = false;
      box.classList.remove("camp-input-error");
      box.closest(".choice-checkbox-label")?.classList.remove("camp-choice-error");
    });
  };

  const clearIT = () => {
    itTrackBoxes.forEach((box) => {
      box.checked = false;
      box.classList.remove("camp-input-error");
      box.closest(".choice-checkbox-label")?.classList.remove("camp-choice-error");
    });
  };

  const clearLang = () => {
    campLanguageBoxes.forEach((box) => {
      box.checked = false;
      box.classList.remove("camp-input-error");
      box.closest(".choice-checkbox-label")?.classList.remove("camp-choice-error");
    });
  };

  const clearAdult = () => {
    if (adultLevelEl) {
      adultLevelEl.value = "";
      adultLevelEl.classList.remove("camp-input-error");
      adultLevelEl.removeAttribute("required");
    }
    adultTestRadios.forEach((radio) => {
      radio.checked = false;
      radio.classList.remove("camp-input-error");
      radio.closest(".choice-checkbox-label")?.classList.remove("camp-choice-error");
    });
  };

  function toggleAdultTest() {
    const isAdult = isAdultPackage(packageEl.value) || isEnglishCommunicationPackage(packageEl.value);
    const hasLevel = Boolean(adultLevelEl && normalizeText(adultLevelEl.value));
    adultTestGroup?.classList.toggle("adult-test-visible", isAdult && hasLevel);

    if (!isAdult || !hasLevel) {
      adultTestRadios.forEach((radio) => {
        radio.checked = false;
        radio.classList.remove("camp-input-error");
        radio.closest(".choice-checkbox-label")?.classList.remove("camp-choice-error");
      });
    }
  }

  function toggleFields() {
    const selected = packageEl.value;

    const showBac = isBacPackage(selected);
    const showLang = needsLanguageChoices(selected);
    const showIT = isITAdvancedPackage(selected);
    const showAdultLevel = isAdultPackage(selected) || isEnglishCommunicationPackage(selected);

    comboGroup?.classList.toggle("choice-visible", showBac);
    langGroup?.classList.toggle("lang-visible", showLang);
    itGroup?.classList.toggle("it-visible", showIT);
    adultLevelGroup?.classList.toggle("adult-level-visible", showAdultLevel);

    const showSpanish = allowSpanishByPackage(selected);
    campLanguageBoxes.forEach((box) => {
      const label = box.closest(".choice-checkbox-label");
      const isSpanish = normalizeText(box.value).toLowerCase() === "spanish";
      if (!isSpanish) return;

      if (showSpanish) {
        box.disabled = false;
        if (label) label.style.display = "";
      } else {
        box.checked = false;
        box.disabled = true;
        if (label) label.style.display = "none";
      }
    });

    if (!showBac) clearBac();
    if (!showIT) clearIT();
    if (!showLang) clearLang();
    if (!showAdultLevel) clearAdult();

    if (adultLevelEl) {
      if (showAdultLevel) adultLevelEl.setAttribute("required", "true");
      else adultLevelEl.removeAttribute("required");
    }

    toggleAdultTest();

    const langLimitNote = langGroup?.querySelector(".choice-limit-note");
    if (langLimitNote) {
      if (isFiveToTenPackage(selected)) {
        langLimitNote.textContent = "لفئة 5-10 سنوات اختر لغة واحدة فقط: الإنجليزية أو الفرنسية.";
      } else {
        langLimitNote.textContent = "اختر لغة واحدة أو لغتين حسب نوع الباقة.";
      }
    }
  }

  if (packageEl.dataset.dynamicBound !== "true") {
    packageEl.dataset.dynamicBound = "true";
    packageEl.addEventListener("change", toggleFields);
  }

  if (adultLevelEl && adultLevelEl.dataset.dynamicBound !== "true") {
    adultLevelEl.dataset.dynamicBound = "true";
    adultLevelEl.addEventListener("change", () => {
      adultLevelEl.classList.remove("camp-input-error");
      toggleAdultTest();
    });
  }

  bacLangBoxes.forEach((box) => {
    if (box.dataset.dynamicBound === "true") return;
    box.dataset.dynamicBound = "true";
    box.addEventListener("change", () => {
      const checked = [...bacLangBoxes].filter((item) => item.checked);
      if (checked.length > 2) box.checked = false;
      clearChoiceErrorByName("bacLang");
    });
  });

  itTrackBoxes.forEach((box) => {
    if (box.dataset.dynamicBound === "true") return;
    box.dataset.dynamicBound = "true";
    box.addEventListener("change", () => clearChoiceErrorByName("itTrack"));
  });

  adultTestRadios.forEach((box) => {
    if (box.dataset.dynamicBound === "true") return;
    box.dataset.dynamicBound = "true";
    box.addEventListener("change", () => clearChoiceErrorByName("adultTest"));
  });

  campLanguageBoxes.forEach((box) => {
    if (box.dataset.dynamicBound === "true") return;
    box.dataset.dynamicBound = "true";

    box.addEventListener("change", () => {
      const selected = packageEl.value;
      const maxAllowed = getAllowedLanguageCount(selected);
      const checked = [...campLanguageBoxes].filter((item) => item.checked && !item.disabled);

      if (checked.length > maxAllowed) {
        box.checked = false;
      }

      clearChoiceErrorByName("campLanguageChoice");
    });
  });

  toggleFields();
}

/* =========================
   PRICING TABS
========================= */
function initPricingTabs() {
  const tabs = document.querySelectorAll(".pricing-tab");
  const contents = document.querySelectorAll(".pricing-content");
  if (!tabs.length || !contents.length) return;

  tabs.forEach((tab, index) => {
    const targetId = tab.getAttribute("data-target");
    tab.setAttribute("role", "tab");
    tab.setAttribute("tabindex", tab.classList.contains("active") ? "0" : "-1");
    tab.setAttribute("aria-selected", tab.classList.contains("active") ? "true" : "false");

    const panel = targetId ? document.getElementById(targetId) : null;
    if (panel) {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-hidden", panel.classList.contains("active") ? "false" : "true");
    }

    const activateTab = () => {
      tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
        t.setAttribute("tabindex", "-1");
      });

      contents.forEach((c) => {
        c.classList.remove("active");
        c.setAttribute("aria-hidden", "true");
        c.style.animation = "none";
      });

      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      tab.setAttribute("tabindex", "0");

      if (!panel) return;
      void panel.offsetHeight;
      panel.style.animation = "";
      panel.classList.add("active");
      panel.setAttribute("aria-hidden", "false");
    };

    if (tab.dataset.tabBound !== "true") {
      tab.dataset.tabBound = "true";
      tab.addEventListener("click", activateTab);
      tab.addEventListener("keydown", (e) => {
        const list = [...tabs];
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault();

        let nextIndex = index;
        if (e.key === "ArrowRight") nextIndex = (index + 1) % list.length;
        if (e.key === "ArrowLeft") nextIndex = (index - 1 + list.length) % list.length;
        if (e.key === "Home") nextIndex = 0;
        if (e.key === "End") nextIndex = list.length - 1;

        focusElement(list[nextIndex]);
        list[nextIndex].click();
      });
    }
  });
}

/* =========================
   MODALS
========================= */
function createModalController({ modalId, openIds = [], closeIds = [] }) {
  const modal = getField(modalId);
  if (!modal) {
    return {
      openModal() {},
      closeModal() {},
      isOpen() { return false; }
    };
  }

  const modalBox = modal.querySelector(".camp-register-modal-box");
  const backdrop = modal.querySelector(".camp-register-modal-backdrop");
  const openButtons = openIds.map(getField).filter(Boolean);
  const closeButtons = closeIds.map(getField).filter(Boolean);

  let lastFocusedElement = null;

  const isOpen = () =>
    modal.classList.contains("open") ||
    modal.classList.contains("active") ||
    modal.getAttribute("aria-hidden") === "false";

  const openModal = () => {
    if (isOpen()) return;
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.classList.add("open", "active");
    modal.setAttribute("aria-hidden", "false");
    syncBodyModalState();

    setTimeout(() => {
      focusElement(closeButtons[0] || modalBox || modal);
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

  openButtons.forEach((btn) => {
    if (btn.dataset.modalBound === "true") return;
    btn.dataset.modalBound = "true";
    btn.addEventListener("click", openModal);
  });

  closeButtons.forEach((btn) => {
    if (btn.dataset.modalBound === "true") return;
    btn.dataset.modalBound = "true";
    btn.addEventListener("click", closeModal);
  });

  if (backdrop && backdrop.dataset.modalBound !== "true") {
    backdrop.dataset.modalBound = "true";
    backdrop.addEventListener("click", closeModal);
  }

  if (modalBox && modalBox.dataset.modalBound !== "true") {
    modalBox.dataset.modalBound = "true";
    modalBox.addEventListener("click", (e) => e.stopPropagation());
  }

  if (modal.dataset.escBound !== "true") {
    modal.dataset.escBound = "true";

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen() && !document.querySelector(".success-overlay")) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (isOpen()) trapFocusInModal(e, modal);
    });
  }

  return { openModal, closeModal, isOpen };
}

function initRegisterModals() {
  registerModalApi = createModalController({
    modalId: "camp-register-modal",
    openIds: ["open-register-modal"],
    closeIds: ["close-register-modal"]
  });

  specialRegisterModalApi = createModalController({
    modalId: "special-register-modal",
    openIds: ["open-special-register-modal"],
    closeIds: ["close-special-register-modal"]
  });
}

/* =========================
   PACKAGE BUTTONS
========================= */
function selectPackageImpl(packageName) {
  const selectEl = getField("campSelectedPackage");
  const wanted = normalizeText(packageName);

  if (selectEl && wanted) {
    const matchedOption = findMatchingPackageOption(selectEl, wanted);
    if (matchedOption) {
      selectEl.value = matchedOption.value;
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));

      selectEl.style.transition = "box-shadow 0.4s cubic-bezier(0.34,1.56,0.64,1), border-color 0.4s ease";
      selectEl.style.boxShadow = "0 0 0 4px rgba(244,180,26,0.5), 0 0 20px rgba(244,180,26,0.2)";
      selectEl.style.borderColor = "rgba(244,180,26,0.8)";

      setTimeout(() => {
        selectEl.style.boxShadow = "";
        selectEl.style.borderColor = "";
      }, 2200);
    }
  }

  registerModalApi?.openModal?.();

  setTimeout(() => {
    if (selectEl) {
      focusElement(selectEl);
      scrollToElement(selectEl);
    }
  }, 120);
}

function getCheckedRadioValue(groupName) {
  return document.querySelector(`input[name="${groupName}"]:checked`)?.value || "";
}

function selectKidsPackageImpl(packageName, radioGroupName) {
  selectPackageImpl(packageName);

  const selectedLang = getCheckedRadioValue(radioGroupName) || "English";

  setTimeout(() => {
    const boxes = [...document.querySelectorAll('input[name="campLanguageChoice"]')];
    boxes.forEach((box) => {
      box.checked = !box.disabled && normalizeText(box.value) === normalizeText(selectedLang);
    });

    clearChoiceErrorByName("campLanguageChoice");
  }, 80);
}

function inferPackageNameFromCard(button) {
  const card = button.closest(".pricing-card");
  if (!card) return "";

  const explicit = normalizeText(card.dataset.package);
  if (explicit) return explicit;

  const nameEl = card.querySelector(".pc-name");
  const titleSpan = nameEl?.querySelector("span");
  const priceEl = card.querySelector(".pc-price");
  const priceContact = card.querySelector(".pc-price-contact");

  const rawTitle = nameEl
    ? [...nameEl.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join(" ")
    : "";

  const titleText = normalizeText(rawTitle || nameEl?.textContent);
  const subtitleText = normalizeText(titleSpan?.textContent);
  const priceText = normalizeText(
    priceContact?.textContent ||
    priceEl?.childNodes?.[0]?.textContent ||
    priceEl?.textContent
  );

  const candidates = [
    `${titleText} | ${priceText}`,
    `${titleText} ${subtitleText} | ${priceText}`,
    `${titleText} ${subtitleText}`,
    titleText
  ].map(normalizeText).filter(Boolean);

  return candidates[0] || "";
}

function initPackageButtons() {
  const buttons = document.querySelectorAll(".pc-btn");

  buttons.forEach((button) => {
    if (button.dataset.packageBound === "true") return;
    button.dataset.packageBound = "true";

    button.addEventListener("click", (e) => {
      e.preventDefault();

      const explicitKidsPackage = button.getAttribute("data-kids-package");
      const explicitKidsLangGroup = button.getAttribute("data-kids-lang-group");

      if (explicitKidsPackage && explicitKidsLangGroup) {
        selectKidsPackageImpl(explicitKidsPackage, explicitKidsLangGroup);
        return;
      }

      const packageName =
        normalizeText(button.dataset.packageName) ||
        inferPackageNameFromCard(button);

      if (!packageName) return;
      selectPackageImpl(packageName);
    });
  });

  window.selectPackage = selectPackageImpl;
  window.selectKidsPackage = selectKidsPackageImpl;
  globalThis.selectPackage = selectPackageImpl;
  globalThis.selectKidsPackage = selectKidsPackageImpl;
}

/* =========================
   BACKGROUND
========================= */
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
  squares.forEach((sq) => {
    ctx.fillStyle = `rgba(83, 204, 255, ${sq.opacity})`;
    ctx.fillRect(sq.x, sq.y, SQ_SIZE, SQ_SIZE);
  });
}

function animateSquares() {
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  squares.forEach((sq) => {
    if (Math.abs(sq.opacity - sq.targetOpacity) < 0.01) {
      sq.targetOpacity = Math.random() * 0.32;
    }
    sq.opacity += (sq.targetOpacity - sq.opacity) * sq.speed;
    ctx.fillStyle = `rgba(83, 204, 255, ${sq.opacity})`;
    ctx.fillRect(sq.x, sq.y, SQ_SIZE, SQ_SIZE);
  });

  squareAnimationId = requestAnimationFrame(animateSquares);
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

function initSquaresBackground() {
  setupCanvasRefs();
  if (!canvas || !ctx) return;

  resizeCanvas();

  if (squareAnimationId) {
    cancelAnimationFrame(squareAnimationId);
    squareAnimationId = null;
  }

  if (!prefersReducedMotion) animateSquares();
  else drawSquaresFrame();

  if (!squaresResizeBound) {
    squaresResizeBound = true;
    window.addEventListener("resize", resizeCanvas, { passive: true });
  }
}

/* =========================
   VIDEO
========================= */
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
    console.error("Video pause before fallback failed", error);
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
  if (playerEl.dataset.videoMode === "cloudinary") {
    playerEl.dataset.videoReady = "true";
    return true;
  }

  const cloudinaryGlobal = window.cloudinary;
  if (!cloudinaryGlobal || typeof cloudinaryGlobal.videoPlayer !== "function") return false;

  try {
    let playerId = playerEl.id || "player";
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
      player.on("error", () => applyDirectVideoFallback(playerEl));
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
    console.error("Cloudinary player init failed", error);
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
  playerEl.addEventListener("error", () => applyDirectVideoFallback(playerEl), { once: true });

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

/* =========================
   VISUAL ENHANCEMENTS
========================= */
function injectRevealStyles() {
  if (document.getElementById("summer-reveal-style")) return;

  const style = document.createElement("style");
  style.id = "summer-reveal-style";
  style.textContent = `
    .reveal-on-scroll{
      opacity:0;
      transform:translateY(40px) scale(.98);
      transition:opacity .75s cubic-bezier(.34,1.56,.64,1), transform .75s cubic-bezier(.34,1.56,.64,1);
      will-change:opacity,transform;
    }
    .reveal-on-scroll.revealed{
      opacity:1;
      transform:translateY(0) scale(1);
    }
    .pricing-card.premium.reveal-on-scroll{transform:translateY(40px) scale(1);}
    .pricing-card.premium.reveal-on-scroll.revealed{transform:translateY(0) scale(1);}
    .camp-input-error{
      border-color:#ff4757 !important;
      box-shadow:0 0 0 4px rgba(255,71,87,.15) !important;
      animation:shakeError .4s ease;
    }
    @keyframes shakeError{
      0%,100%{transform:translateX(0)}
      25%{transform:translateX(-8px)}
      75%{transform:translateX(8px)}
    }
    .camp-choice-error{
      outline:2px solid rgba(255,71,87,.55);
      border-color:rgba(255,71,87,.65) !important;
      box-shadow:0 0 0 4px rgba(255,71,87,.15) !important;
      animation:shakeError .4s ease;
    }
    .camp-gallery-grid{
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
      gap:16px;
    }
    .camp-gallery-item{
      position:relative;
      overflow:hidden;
      border-radius:20px;
      border:1px solid rgba(255,255,255,.15);
      background:rgba(255,255,255,.05);
      box-shadow:0 12px 28px rgba(0,0,0,.15);
      cursor:zoom-in;
      transition:transform .3s ease, box-shadow .3s ease, border-color .3s ease;
    }
    .camp-gallery-item:hover{
      transform:translateY(-5px) scale(1.02);
      box-shadow:0 20px 40px rgba(0,0,0,.25);
      border-color:rgba(255,255,255,.3);
    }
    .camp-gallery-img{
      width:100%;
      aspect-ratio:1/1;
      object-fit:cover;
      display:block;
    }
    .camp-gallery-overlay{
      position:absolute;
      inset:auto 0 0 0;
      padding:15px;
      background:linear-gradient(180deg,transparent,rgba(3,15,35,.85));
      color:#fff;
      font-size:.95rem;
      font-weight:700;
    }
    .camp-gallery-empty{
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:12px;
      padding:50px 20px;
      text-align:center;
      color:rgba(201,231,248,.7);
      font-size:1.05rem;
      font-weight:700;
    }
    .success-overlay{
      position:fixed;
      inset:0;
      z-index:9999;
      display:flex;
      align-items:center;
      justify-content:center;
      background:rgba(3,15,45,.88);
      backdrop-filter:blur(18px);
      -webkit-backdrop-filter:blur(18px);
      animation:soFadeIn .3s ease;
      padding:18px;
    }
    .success-card{
      background:linear-gradient(145deg, rgba(10,61,115,.95), rgba(3,21,47,.98));
      border:1px solid rgba(255,255,255,.18);
      padding:44px 40px;
      border-radius:36px;
      text-align:center;
      box-shadow:0 40px 80px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.2);
      animation:soPopIn .5s cubic-bezier(.34,1.56,.64,1);
      max-width:90%;
      width:460px;
      position:relative;
      overflow:hidden;
    }
    .success-card::before{
      content:"";
      position:absolute;
      top:0;
      left:0;
      right:0;
      height:3px;
      background:linear-gradient(90deg, transparent, #f4b41a, #ffd86b, #f4b41a, transparent);
    }
    .summer-lightbox{
      position:fixed;
      inset:0;
      z-index:9999;
      background:rgba(2,9,21,.92);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      cursor:zoom-out;
      animation:soFadeIn .25s ease;
    }
    .summer-lightbox-box{
      position:relative;
      max-width:min(1100px,100%);
      max-height:90vh;
      cursor:default;
    }
    .summer-lightbox-img{
      display:block;
      max-width:100%;
      max-height:90vh;
      border-radius:20px;
      box-shadow:0 24px 60px rgba(0,0,0,.55);
      animation:soPopIn .3s cubic-bezier(.34,1.56,.64,1);
    }
    .summer-lightbox-close{
      position:absolute;
      top:14px;
      left:14px;
      width:46px;
      height:46px;
      border-radius:50%;
      background:rgba(255,255,255,.15);
      border:1px solid rgba(255,255,255,.25);
      color:#fff;
      font-size:22px;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      transition:.25s ease;
    }
    .summer-lightbox-close:hover{
      background:rgba(255,255,255,.25);
      transform:scale(1.1);
    }
    @keyframes soFadeIn{from{opacity:0}to{opacity:1}}
    @keyframes soPopIn{from{transform:scale(.8) translateY(30px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
  `;
  document.head.appendChild(style);
}

function initRevealOnScroll() {
  injectRevealStyles();

  const targets = document.querySelectorAll(
    ".camp-section, .camp-workshop-card, .summer-strip-item, .summer-journey-card, .camp-info-card, .pricing-card, .form-group"
  );

  if (!targets.length) return;

  if (prefersReducedMotion) {
    targets.forEach((el) => el.classList.add("revealed"));
    return;
  }

  targets.forEach((el, i) => {
    el.classList.add("reveal-on-scroll");
    el.style.transitionDelay = `${(i % 4) * 0.08}s`;
  });

  const obs = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.07, rootMargin: "0px 0px -25px 0px" }
  );

  targets.forEach((el) => obs.observe(el));
}

function initTiltEffect() {
  if (
    (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) ||
    prefersReducedMotion
  ) return;

  document.querySelectorAll(".camp-workshop-card, .camp-info-card, .summer-journey-card")
    .forEach((card) => {
      if (card.dataset.tiltBound === "true") return;
      card.dataset.tiltBound = "true";

      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const rx = ((y - r.height / 2) / (r.height / 2)) * -8;
        const ry = ((x - r.width / 2) / (r.width / 2)) * 8;
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
      });
    });
}

/* =========================
   GALLERY
========================= */
function buildGalleryEmpty() {
  return `
    <div class="camp-gallery-empty" style="grid-column:1 / -1;">
      <span style="font-size:42px;">📷</span>
      <span style="font-size:1.1rem;font-weight:800;color:rgba(201,231,248,0.9);">سيتم إضافة صور المعرض هنا</span>
      <span style="font-size:0.95rem;color:rgba(201,231,248,0.6);max-width:380px;line-height:1.8;">
        عند إضافة الصور داخل القسم، سيتم تفعيل المعرض والتكبير التفاعلي تلقائيًا.
      </span>
    </div>
  `;
}

function openLightbox(src, alt = "Summer School") {
  const existing = document.querySelector(".summer-lightbox");
  if (existing) safelyRemoveNode(existing);

  const overlay = document.createElement("div");
  overlay.className = "summer-lightbox";
  overlay.innerHTML = `
    <div class="summer-lightbox-box">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="summer-lightbox-img" draggable="false">
      <button type="button" class="summer-lightbox-close" aria-label="إغلاق">×</button>
    </div>
  `;

  let closed = false;
  const escHandler = (e) => {
    if (e.key === "Escape") close();
  };

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", escHandler);
    safelyRemoveNode(overlay);
    syncBodyModalState();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".summer-lightbox-close")) close();
  });

  document.addEventListener("keydown", escHandler);
  document.body.appendChild(overlay);
  syncBodyModalState();
}

function bindGalleryItems() {
  const grid = getField("camp-gallery-grid");
  if (!grid) return;

  const candidates = grid.querySelectorAll(".camp-gallery-item, [data-lightbox-src], img");

  candidates.forEach((item) => {
    if (item.dataset.galleryBound === "true") return;
    item.dataset.galleryBound = "true";

    item.addEventListener("click", (e) => {
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

  const hasRealItems = Boolean(grid.querySelector(".camp-gallery-item, [data-lightbox-src], img"));
  if (hasRealItems) {
    bindGalleryItems();
    return;
  }

  if (!normalizeText(grid.innerHTML) || !grid.querySelector(".camp-gallery-empty")) {
    grid.innerHTML = buildGalleryEmpty();
  }
}

/* =========================
   VALIDATION
========================= */
function markInvalid(el) {
  if (!el) return;
  el.classList.add("camp-input-error");
  el.addEventListener("input", () => el.classList.remove("camp-input-error"), { once: true });
  el.addEventListener("change", () => el.classList.remove("camp-input-error"), { once: true });
}

function markChoiceInvalid(elements) {
  elements.forEach((el) => {
    const label = el.closest(".choice-checkbox-label");
    if (!label) return;
    label.classList.add("camp-choice-error");

    const clear = () => label.classList.remove("camp-choice-error");
    el.addEventListener("change", clear, { once: true });
    el.addEventListener("input", clear, { once: true });
  });
}

function validatePhone(phone) {
  return /^[0-9+]{8,18}$/.test(normalizePhone(phone));
}

function setButtonState(buttonId, text, {
  disabled = false,
  opacity = 1,
  pointerEvents = "",
  background = ""
} = {}) {
  const btn = getField(buttonId);
  if (!btn) return;

  btn.disabled = disabled;
  btn.style.pointerEvents = pointerEvents;
  btn.style.opacity = opacity;
  if (background) btn.style.background = background;
  btn.innerHTML = `<span>${escapeHtml(text)}</span>`;
}

function setSubmitButtonLoading(buttonId, text) {
  setButtonState(buttonId, text, {
    disabled: true,
    pointerEvents: "none",
    opacity: 0.9,
    background: "linear-gradient(135deg,#0ea5e9,#0284c7)"
  });
}

function resetSubmitButton(buttonId, text) {
  setButtonState(buttonId, text, {
    disabled: false,
    pointerEvents: "",
    opacity: 1,
    background: "linear-gradient(135deg,#ffc849,#ff9f1d)"
  });
}

function setSubmitButtonError(buttonId, text = "حدث خطأ", resetText = "إرسال التسجيل") {
  setButtonState(buttonId, text, {
    disabled: false,
    pointerEvents: "",
    opacity: 1,
    background: "linear-gradient(135deg,#dc2626,#b91c1c)"
  });

  setTimeout(() => resetSubmitButton(buttonId, resetText), 2200);
}

function collectCheckedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((el) => normalizeText(el.value));
}

function getCheckedValue(name) {
  return normalizeText(document.querySelector(`input[name="${name}"]:checked`)?.value);
}

/* =========================
   SUCCESS OVERLAY
========================= */
function buildSuccessModal(firstName, lastName, selectedPackage, detailsText = "") {
  const overlay = document.createElement("div");
  overlay.className = "success-overlay";
  overlay.innerHTML = `
    <div class="success-card" role="dialog" aria-modal="true" aria-label="تم الإرسال بنجاح">
      <div style="font-size:64px;margin-bottom:16px;filter:drop-shadow(0 10px 20px rgba(0,0,0,.3));">✅</div>
      <h2 style="color:#fff;margin-bottom:10px;font-size:24px;font-weight:950;line-height:1.3;">تم إرسال التسجيل بنجاح</h2>
      <p style="color:#c9e7f8;font-size:16px;line-height:1.9;margin-bottom:8px;">
        شكرًا <strong style="color:#ffd86b;font-size:19px;">${escapeHtml(firstName)} ${escapeHtml(lastName)}</strong>
      </p>
      <div style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:14px;margin:12px 0 8px;background:rgba(244,180,26,.15);border:1px solid rgba(244,180,26,.3);color:#ffe090;font-weight:800;font-size:15px;">
        ${escapeHtml(selectedPackage)}
      </div>
      ${detailsText ? `
        <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:14px;margin:0 0 20px;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.25);color:#bae6fd;font-weight:800;font-size:14px;">
          ${escapeHtml(detailsText)}
        </div>
      ` : ""}
      <div style="margin-bottom:20px;"></div>
      <p style="color:rgba(201,231,248,.75);font-size:14px;line-height:1.8;margin-bottom:26px;">
        سيتم مراجعة بياناتك والتواصل معك في أقرب وقت ممكن.
      </p>
      <button type="button" id="success-close-btn"
        style="position:relative;overflow:hidden;padding:14px 36px;border-radius:18px;border:none;background:linear-gradient(135deg,#ffc849,#ff9f1d);color:#03152f;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 15px 30px rgba(255,159,29,.35);transition:.3s cubic-bezier(.34,1.56,.64,1);font-family:inherit;">
        إغلاق
      </button>
    </div>
  `;

  const button = overlay.querySelector("#success-close-btn");
  let closed = false;

  const escHandler = (e) => {
    if (e.key === "Escape") closeOverlay();
  };

  function closeOverlay() {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", escHandler);
    safelyRemoveNode(overlay);
    successOverlayShown = false;
    isSubmitting = false;
    resetSubmitButton("camp-submit-btn", "إرسال التسجيل");
    resetSubmitButton("special-submit-btn", "إرسال الطلب");
    syncBodyModalState();
  }

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
  setTimeout(() => focusElement(button), 50);
  syncBodyModalState();

  return overlay;
}

/* =========================
   SUBMIT HELPERS
========================= */
async function submitWithFallback(payload, endpoint = APPS_SCRIPT_URL) {
  const jsonBody = JSON.stringify(payload);

  try {
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: jsonBody
    });
    return true;
  } catch (firstError) {
    console.warn("Primary submit failed, trying fallback", firstError);
  }

  try {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      params.append(key, value == null ? "" : String(value));
    });

    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: params.toString()
    });
    return true;
  } catch (secondError) {
    console.warn("Form-urlencoded fallback failed", secondError);
  }

  if (navigator.sendBeacon) {
    try {
      const blob = new Blob([jsonBody], { type: "text/plain;charset=utf-8" });
      const sent = navigator.sendBeacon(endpoint, blob);
      if (sent) return true;
    } catch (beaconError) {
      console.warn("sendBeacon fallback failed", beaconError);
    }
  }

  throw new Error("All submit methods failed.");
}

function buildTimestamp() {
  try {
    return new Date().toLocaleString("ar-DZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    return new Date().toISOString();
  }
}

/* =========================
   MAIN FORM
========================= */
function validateMainForm() {
  const packageEl = getField("campSelectedPackage");
  const adultLevelEl = getField("campAdultLevel");
  const firstNameEl = getField("campFirstName");
  const lastNameEl = getField("campLastName");
  const ageEl = getField("campAge");
  const parentNameEl = getField("campParentName");
  const phoneEl = getField("campParentPhone");

  const selectedPackage = normalizeText(packageEl?.value);
  const adultLevel = normalizeText(adultLevelEl?.value);
  const adultTest = getCheckedValue("adultTest");
  const bacLangs = collectCheckedValues("bacLang");
  const itTrack = getCheckedValue("itTrack");
  const selectedLanguages = collectCheckedValues("campLanguageChoice");

  const firstName = normalizeText(firstNameEl?.value);
  const lastName = normalizeText(lastNameEl?.value);
  const age = normalizeText(ageEl?.value);
  const parentName = normalizeText(parentNameEl?.value);
  const parentPhone = normalizePhone(phoneEl?.value);

  let firstInvalid = null;

  const requireField = (el, condition = true) => {
    if (!condition) return;
    if (normalizeText(el?.value)) return;
    markInvalid(el);
    if (!firstInvalid) firstInvalid = el;
  };

  requireField(packageEl);
  requireField(firstNameEl);
  requireField(lastNameEl);
  requireField(ageEl);
  requireField(parentNameEl);
  requireField(phoneEl);

  if (age && Number(age) < CAMP_MIN_AGE) {
    markInvalid(ageEl);
    if (!firstInvalid) firstInvalid = ageEl;
  }

  if (parentPhone && !validatePhone(parentPhone)) {
    markInvalid(phoneEl);
    if (!firstInvalid) firstInvalid = phoneEl;
  }

  if (needsLanguageChoices(selectedPackage)) {
    const maxAllowed = getAllowedLanguageCount(selectedPackage);
    const langInputs = [...document.querySelectorAll('input[name="campLanguageChoice"]')].filter((x) => !x.disabled);

    if (selectedLanguages.length < 1 || selectedLanguages.length > maxAllowed) {
      markChoiceInvalid(langInputs);
      if (!firstInvalid) firstInvalid = langInputs[0] || packageEl;
    }
  }

  if (isBacPackage(selectedPackage) && bacLangs.length !== 2) {
    const inputs = [...document.querySelectorAll('input[name="bacLang"]')];
    markChoiceInvalid(inputs);
    if (!firstInvalid) firstInvalid = inputs[0] || packageEl;
  }

  if (isITAdvancedPackage(selectedPackage) && !itTrack) {
    const inputs = [...document.querySelectorAll('input[name="itTrack"]')];
    markChoiceInvalid(inputs);
    if (!firstInvalid) firstInvalid = inputs[0] || packageEl;
  }

  if ((isAdultPackage(selectedPackage) || isEnglishCommunicationPackage(selectedPackage)) && !adultLevel) {
    markInvalid(adultLevelEl);
    if (!firstInvalid) firstInvalid = adultLevelEl;
  }

  if ((isAdultPackage(selectedPackage) || isEnglishCommunicationPackage(selectedPackage)) && !adultTest) {
    const inputs = [...document.querySelectorAll('input[name="adultTest"]')];
    markChoiceInvalid(inputs);
    if (!firstInvalid) firstInvalid = inputs[0] || adultLevelEl || packageEl;
  }

  if (firstInvalid) {
    if (firstInvalid instanceof HTMLElement) {
      focusElement(firstInvalid);
      scrollToElement(firstInvalid.closest(".form-group") || firstInvalid);
    }
    return null;
  }

  let detailsText = "";
  if (isBacPackage(selectedPackage)) {
    detailsText = bacLangs.join(" + ");
  } else if (isITAdvancedPackage(selectedPackage)) {
    detailsText = itTrack;
  } else if (isAdultPackage(selectedPackage) || isEnglishCommunicationPackage(selectedPackage)) {
    detailsText = [adultLevel, adultTest, ...selectedLanguages].filter(Boolean).join(" | ");
  } else if (selectedLanguages.length) {
    detailsText = selectedLanguages.join(" + ");
  }

  return {
    selectedPackage,
    selectedLanguages,
    adultLevel,
    adultTest,
    bacLangs,
    itTrack,
    firstName,
    lastName,
    age,
    parentName,
    parentPhone,
    detailsText
  };
}

function resetMainFormUI() {
  const form = getField("camp-form");
  form?.reset();

  clearChoiceErrorByName("bacLang");
  clearChoiceErrorByName("itTrack");
  clearChoiceErrorByName("adultTest");
  clearChoiceErrorByName("campLanguageChoice");

  [
    "campSelectedPackage",
    "campAdultLevel",
    "campFirstName",
    "campLastName",
    "campAge",
    "campParentName",
    "campParentPhone"
  ].forEach((id) => clearErrorState(getField(id)));

  getField("campSelectedPackage")?.dispatchEvent(new Event("change", { bubbles: true }));
}

function initMainRegistrationForm() {
  const form = getField("camp-form");
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (isSubmitting || successOverlayShown) return;

    const validated = validateMainForm();
    if (!validated) return;

    isSubmitting = true;
    setSubmitButtonLoading("camp-submit-btn", "جاري الإرسال...");

    const payload = {
      timestamp: buildTimestamp(),
      page: "summer-camp",
      formType: "camp-package",
      package: validated.selectedPackage,
      bacLanguages: validated.bacLangs.join(" + "),
      itTrack: validated.itTrack,
      languages: validated.selectedLanguages.join(" + "),
      adultLanguageLevel: validated.adultLevel,
      adultTestPreference: validated.adultTest,
      firstName: validated.firstName,
      lastName: validated.lastName,
      age: validated.age,
      parentName: validated.parentName,
      parentPhone: validated.parentPhone,
      userAgent: navigator.userAgent.slice(0, 180),
      lang: navigator.language || "unknown"
    };

    try {
      await submitWithFallback(payload, APPS_SCRIPT_URL);
      successOverlayShown = true;
      registerModalApi?.closeModal?.();
      resetMainFormUI();
      document.body.appendChild(
        buildSuccessModal(
          validated.firstName,
          validated.lastName,
          validated.selectedPackage,
          validated.detailsText
        )
      );
    } catch (error) {
      console.error("Camp form submit error", error);
      isSubmitting = false;
      setSubmitButtonError("camp-submit-btn", "حدث خطأ", "إرسال التسجيل");
      syncBodyModalState();
    }
  });
}

/* =========================
   SPECIAL FORM
========================= */
function validateSpecialForm() {
  const selectedPrograms = collectCheckedValues("specialProgramType");
  const firstNameEl = getField("specialFirstName");
  const lastNameEl = getField("specialLastName");
  const ageEl = getField("specialAge");
  const parentNameEl = getField("specialParentName");
  const phoneEl = getField("specialParentPhone");

  const firstName = normalizeText(firstNameEl?.value);
  const lastName = normalizeText(lastNameEl?.value);
  const age = normalizeText(ageEl?.value);
  const parentName = normalizeText(parentNameEl?.value);
  const parentPhone = normalizePhone(phoneEl?.value);

  let firstInvalid = null;

  if (!selectedPrograms.length) {
    const inputs = [...document.querySelectorAll('input[name="specialProgramType"]')];
    markChoiceInvalid(inputs);
    firstInvalid = inputs[0] || null;
  }

  const requireField = (el) => {
    if (normalizeText(el?.value)) return;
    markInvalid(el);
    if (!firstInvalid) firstInvalid = el;
  };

  requireField(firstNameEl);
  requireField(lastNameEl);
  requireField(ageEl);
  requireField(parentNameEl);
  requireField(phoneEl);

  if (age && Number(age) < CAMP_MIN_AGE) {
    markInvalid(ageEl);
    if (!firstInvalid) firstInvalid = ageEl;
  }

  if (parentPhone && !validatePhone(parentPhone)) {
    markInvalid(phoneEl);
    if (!firstInvalid) firstInvalid = phoneEl;
  }

  if (firstInvalid) {
    focusElement(firstInvalid);
    scrollToElement(firstInvalid.closest(".form-group") || firstInvalid);
    return null;
  }

  return {
    programType: selectedPrograms.join(" + "),
    firstName,
    lastName,
    age,
    parentName,
    parentPhone
  };
}

function resetSpecialFormUI() {
  const form = getField("special-program-form");
  form?.reset();

  clearChoiceErrorByName("specialProgramType");

  [
    "specialFirstName",
    "specialLastName",
    "specialAge",
    "specialParentName",
    "specialParentPhone"
  ].forEach((id) => clearErrorState(getField(id)));
}

function initSpecialRegistrationForm() {
  const form = getField("special-program-form");
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (isSubmitting || successOverlayShown) return;

    const validated = validateSpecialForm();
    if (!validated) return;

    isSubmitting = true;
    setSubmitButtonLoading("special-submit-btn", "جاري الإرسال...");

    const payload = {
      timestamp: buildTimestamp(),
      page: "summer-camp",
      formType: "special-program",
      specialProgram: validated.programType,
      firstName: validated.firstName,
      lastName: validated.lastName,
      age: validated.age,
      parentName: validated.parentName,
      parentPhone: validated.parentPhone,
      userAgent: navigator.userAgent.slice(0, 180),
      lang: navigator.language || "unknown"
    };

    try {
      await submitWithFallback(payload, SPECIAL_APPS_SCRIPT_URL);
      successOverlayShown = true;
      specialRegisterModalApi?.closeModal?.();
      resetSpecialFormUI();
      document.body.appendChild(
        buildSuccessModal(
          validated.firstName,
          validated.lastName,
          validated.programType,
          ""
        )
      );
    } catch (error) {
      console.error("Special form submit error", error);
      isSubmitting = false;
      setSubmitButtonError("special-submit-btn", "حدث خطأ", "إرسال الطلب");
      syncBodyModalState();
    }
  });
}

/* =========================
   INPUT SANITIZERS
========================= */
function initInputSanitizers() {
  const phoneInputs = ["campParentPhone", "specialParentPhone"]
    .map(getField)
    .filter(Boolean);

  phoneInputs.forEach((input) => {
    if (input.dataset.phoneBound === "true") return;
    input.dataset.phoneBound = "true";

    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^\d+]/g, "");
      input.classList.remove("camp-input-error");
    });
  });

  const numericInputs = ["campAge", "specialAge"]
    .map(getField)
    .filter(Boolean);

  numericInputs.forEach((input) => {
    if (input.dataset.ageBound === "true") return;
    input.dataset.ageBound = "true";

    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^\d]/g, "");
      input.classList.remove("camp-input-error");
    });
  });
}

/* =========================
   BOOT
========================= */
function initSummerCampPage() {
  initRegisterModals();
  initDynamicFields();
  initPricingTabs();
  initPackageButtons();
  initSquaresBackground();
  initCampVideo();
  initRevealOnScroll();
  initTiltEffect();
  loadCampGallery();
  initMainRegistrationForm();
  initSpecialRegistrationForm();
  initInputSanitizers();
  syncBodyModalState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSummerCampPage, { once: true });
} else {
  initSummerCampPage();
}
