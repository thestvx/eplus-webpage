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
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
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
    .replace(/د\.?\s*ج/gi, "")
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

function markInvalid(el) {
  if (!el) return;
  el.classList.add("camp-input-error");
}

function markChoiceInvalid(inputs) {
  inputs.forEach((input) => {
    input.classList.add("camp-input-error");
    input.closest(".choice-checkbox-label")?.classList.add("camp-choice-error");
  });
}

function getCheckedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function collectCheckedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => normalizeText(input.value)).filter(Boolean);
}

function validatePhone(phone) {
  const normalized = normalizePhone(phone);
  return /^(\+?\d{8,15})$/.test(normalized);
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
  return value.includes("bac prep") || value.includes("باقة تحضير البكالوريا") || value.includes("باكالوريا");
}

function isITAdvancedPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return (
    value.includes("adults advanced") ||
    value.includes("باقة البالغين المتقدمة") ||
    value.includes("office") ||
    value.includes("powerpoint") ||
    value.includes("excel") ||
    value.includes("word") ||
    value.includes("html css") ||
    value.includes("html & css") ||
    value.includes("برمجة")
  );
}

function isAdultPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return value.includes("adults") || value.includes("adult") || value.includes("البالغين");
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
  return value.includes("5-10") || value.includes("5 10") || value.includes("(5-10)") || value.includes("5–10");
}

function isElevenToFourteenPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return value.includes("11-14") || value.includes("11 14") || value.includes("(11-14)") || value.includes("11–14");
}

function isFifteenToEighteenPackage(packageValue) {
  const value = getPackageSearchText(packageValue);
  return value.includes("15-18") || value.includes("15 18") || value.includes("(15-18)") || value.includes("15–18");
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
  if (isFiveToTenPackage(packageValue)) return 2;
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
        langLimitNote.textContent = "لفئة 5-10 سنوات اختر الإنجليزية أو الفرنسية فقط، ويمكن اختيار لغة أو لغتين حسب الباقة.";
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

function buildSquares() {
  if (!canvas || !ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  cols = Math.ceil(canvas.width / (SQ_SIZE + SQ_GAP));
  rows = Math.ceil(canvas.height / (SQ_SIZE + SQ_GAP));
  squares = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      squares.push({
        x: x * (SQ_SIZE + SQ_GAP),
        y: y * (SQ_SIZE + SQ_GAP),
        offset: Math.random() * Math.PI * 2
      });
    }
  }
}

function drawSquares(time = 0) {
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  squares.forEach((sq, index) => {
    const pulse = (Math.sin(time * 0.0012 + sq.offset + index * 0.01) + 1) / 2;
    const alpha = 0.05 + pulse * 0.07;

    ctx.fillStyle = `rgba(200,168,75,${alpha})`;
    ctx.fillRect(sq.x, sq.y, SQ_SIZE, SQ_SIZE);
  });

  squareAnimationId = requestAnimationFrame(drawSquares);
}

function initAnimatedSquares() {
  setupCanvasRefs();
  if (!canvas || !ctx || prefersReducedMotion) return;

  buildSquares();

  if (!squaresResizeBound) {
    squaresResizeBound = true;
    window.addEventListener("resize", () => {
      buildSquares();
    });
  }

  if (squareAnimationId) cancelAnimationFrame(squareAnimationId);
  squareAnimationId = requestAnimationFrame(drawSquares);
}

/* =========================
   VIDEO
========================= */
function initCampVideo() {
  const videoEl = getField("camp-video");
  if (!videoEl) return;

  if (window.cloudinary && typeof window.cloudinary.videoPlayer === "function") {
    try {
      const player = window.cloudinary.videoPlayer(videoEl, {
        cloud_name: VIDEO_CLOUD_NAME,
        controls: true,
        fluid: true,
        muted: false,
        autoplayMode: "never"
      });

      player.source(VIDEO_PUBLIC_ID, {
        sourceTypes: ["mp4"]
      });
      return;
    } catch (error) {
      console.warn("Cloudinary player failed, using fallback src.", error);
    }
  }

  if (!videoEl.querySelector("source")) {
    const source = document.createElement("source");
    source.src = VIDEO_FALLBACK_SRC;
    source.type = "video/mp4";
    videoEl.appendChild(source);
  }
}

/* =========================
   GALLERY / LIGHTBOX
========================= */
function openLightbox(src, alt = "") {
  const overlay = document.createElement("div");
  overlay.className = "summer-lightbox";
  overlay.innerHTML = `
    <div class="summer-lightbox-box" role="dialog" aria-modal="true" aria-label="عرض الصورة">
      <button type="button" class="summer-lightbox-close" aria-label="إغلاق">✕</button>
      <img class="summer-lightbox-img" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />
    </div>
  `;

  const closeBtn = overlay.querySelector(".summer-lightbox-close");
  const box = overlay.querySelector(".summer-lightbox-box");

  const close = () => {
    document.removeEventListener("keydown", escHandler);
    safelyRemoveNode(overlay);
    syncBodyModalState();
  };

  const escHandler = (e) => {
    if (e.key === "Escape") close();
  };

  overlay.addEventListener("click", close);
  box?.addEventListener("click", (e) => e.stopPropagation());
  closeBtn?.addEventListener("click", close);
  document.addEventListener("keydown", escHandler);

  document.body.appendChild(overlay);
  syncBodyModalState();
  setTimeout(() => focusElement(closeBtn), 50);
}

function initGalleryLightbox() {
  document.querySelectorAll(".camp-gallery-item img, .camp-gallery-item").forEach((item) => {
    if (item.dataset.lightboxBound === "true") return;
    item.dataset.lightboxBound = "true";

    item.addEventListener("click", () => {
      const img = item.matches("img") ? item : item.querySelector("img");
      if (!img) return;
      openLightbox(img.currentSrc || img.src, img.alt || "");
    });
  });
}

/* =========================
   REVEAL / TILT
========================= */
function injectRevealStyles() {
  if (getField("summer-reveal-style")) return;

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
   SUCCESS OVERLAY
========================= */
function resetSubmitButton(buttonId, label) {
  const btn = getField(buttonId);
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = label;
}

function setSubmitButtonLoading(buttonId, label) {
  const btn = getField(buttonId);
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = label;
}

function showSuccessOverlay({
  title = "تم الإرسال بنجاح",
  message = "وصلنا طلبك وسنتواصل معك قريبًا.",
  buttonText = "إغلاق"
} = {}) {
  if (successOverlayShown) return null;
  successOverlayShown = true;

  const overlay = document.createElement("div");
  overlay.className = "success-overlay";
  overlay.innerHTML = `
    <div class="success-card">
      <div class="so-icon" style="font-size:58px;margin-bottom:16px;">✅</div>
      <h3 style="color:#fff;font-size:1.7rem;font-weight:900;margin-bottom:12px;">${escapeHtml(title)}</h3>
      <p style="color:rgba(220,232,248,.82);line-height:1.9;font-size:1rem;margin-bottom:22px;">${escapeHtml(message)}</p>
      <button type="button" style="border:none;cursor:pointer;padding:14px 24px;border-radius:16px;background:linear-gradient(135deg,#f0cd68,#c8921a);color:#0a0800;font-weight:900;font-size:1rem;box-shadow:0 15px 30px rgba(255,159,29,.35);">
        ${escapeHtml(buttonText)}
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  const button = overlay.querySelector("button");
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
      details: validated.detailsText,
      userAgent: navigator.userAgent.slice(0, 180),
      lang: navigator.language || "unknown"
    };

    try {
      await submitWithFallback(payload, APPS_SCRIPT_URL);
      resetMainFormUI();
      registerModalApi?.closeModal?.();

      showSuccessOverlay({
        title: "تم تسجيل طلبك بنجاح",
        message: "وصلنا طلب التسجيل في المخيم الصيفي، وسيتم التواصل معك قريبًا لتأكيد التفاصيل.",
        buttonText: "ممتاز"
      });
    } catch (error) {
      console.error(error);
      isSubmitting = false;
      resetSubmitButton("camp-submit-btn", "إرسال التسجيل");
      alert("تعذر إرسال التسجيل الآن، حاول مرة أخرى بعد قليل.");
    }
  });

  form.querySelectorAll("input, select, textarea").forEach((field) => {
    if (field.dataset.clearBound === "true") return;
    field.dataset.clearBound = "true";

    field.addEventListener("input", () => clearErrorState(field));
    field.addEventListener("change", () => clearErrorState(field));
  });
}

/* =========================
   SPECIAL FORM
========================= */
function validateSpecialForm() {
  const programEl = getField("specialProgram");
  const firstNameEl = getField("specialFirstName");
  const lastNameEl = getField("specialLastName");
  const ageEl = getField("specialAge");
  const phoneEl = getField("specialPhone");
  const notesEl = getField("specialNotes");

  const program = normalizeText(programEl?.value);
  const firstName = normalizeText(firstNameEl?.value);
  const lastName = normalizeText(lastNameEl?.value);
  const age = normalizeText(ageEl?.value);
  const phone = normalizePhone(phoneEl?.value);
  const notes = normalizeText(notesEl?.value);

  let firstInvalid = null;

  const requireField = (el) => {
    if (normalizeText(el?.value)) return;
    markInvalid(el);
    if (!firstInvalid) firstInvalid = el;
  };

  requireField(programEl);
  requireField(firstNameEl);
  requireField(lastNameEl);
  requireField(ageEl);
  requireField(phoneEl);

  if (age && Number(age) < CAMP_MIN_AGE) {
    markInvalid(ageEl);
    if (!firstInvalid) firstInvalid = ageEl;
  }

  if (phone && !validatePhone(phone)) {
    markInvalid(phoneEl);
    if (!firstInvalid) firstInvalid = phoneEl;
  }

  if (firstInvalid) {
    focusElement(firstInvalid);
    scrollToElement(firstInvalid.closest(".form-group") || firstInvalid);
    return null;
  }

  return { program, firstName, lastName, age, phone, notes };
}

function resetSpecialFormUI() {
  const form = getField("special-form");
  form?.reset();

  [
    "specialProgram",
    "specialFirstName",
    "specialLastName",
    "specialAge",
    "specialPhone",
    "specialNotes"
  ].forEach((id) => clearErrorState(getField(id)));
}

function initSpecialRegistrationForm() {
  const form = getField("special-form");
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
      specialProgram: validated.program,
      firstName: validated.firstName,
      lastName: validated.lastName,
      age: validated.age,
      phone: validated.phone,
      notes: validated.notes,
      userAgent: navigator.userAgent.slice(0, 180),
      lang: navigator.language || "unknown"
    };

    try {
      await submitWithFallback(payload, SPECIAL_APPS_SCRIPT_URL);
      resetSpecialFormUI();
      specialRegisterModalApi?.closeModal?.();

      showSuccessOverlay({
        title: "تم إرسال الطلب",
        message: "وصلنا طلب البرنامج الخاص، وسيتم التواصل معك قريبًا لتحديد التفاصيل المناسبة.",
        buttonText: "إغلاق"
      });
    } catch (error) {
      console.error(error);
      isSubmitting = false;
      resetSubmitButton("special-submit-btn", "إرسال الطلب");
      alert("تعذر إرسال الطلب الآن، حاول مرة أخرى بعد قليل.");
    }
  });

  form.querySelectorAll("input, select, textarea").forEach((field) => {
    if (field.dataset.clearBound === "true") return;
    field.dataset.clearBound = "true";

    field.addEventListener("input", () => clearErrorState(field));
    field.addEventListener("change", () => clearErrorState(field));
  });
}

/* =========================
   AUTO SPECIAL PROGRAM PICK
========================= */
function initSpecialProgramAutoFill() {
  const specialSelect = getField("specialProgram");
  if (!specialSelect) return;

  document.querySelectorAll("#age-special .pc-btn").forEach((btn) => {
    if (btn.dataset.specialBound === "true") return;
    btn.dataset.specialBound = "true";

    btn.addEventListener("click", () => {
      const packageName =
        normalizeText(btn.dataset.packageName) ||
        inferPackageNameFromCard(btn);

      const option = findMatchingPackageOption(specialSelect, packageName);
      if (option) specialSelect.value = option.value;
      else if (packageName) specialSelect.value = packageName;

      setTimeout(() => {
        focusElement(specialSelect);
        scrollToElement(specialSelect);
      }, 120);
    });
  });
}

/* =========================
   READY
========================= */
function initCampPage() {
  initAnimatedSquares();
  initCampVideo();
  initPricingTabs();
  initRegisterModals();
  initPackageButtons();
  initDynamicFields();
  initMainRegistrationForm();
  initSpecialRegistrationForm();
  initSpecialProgramAutoFill();
  initGalleryLightbox();
  initRevealOnScroll();
  initTiltEffect();
  syncBodyModalState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCampPage);
} else {
  initCampPage();
}
