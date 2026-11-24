let scrollHoldStart = Date.now();
let isScrolling = false;
let scrollEndTimer = null;
let lastLoggedSearch = "";

let hoverTarget = null;
let hoverStartTime = 0;

function sendLog(action, details, duration = "-") {
  try {
    chrome.runtime.sendMessage({
      type: "LOG_ACTIVITY",
      payload: {
        url: window.location.href,
        action: action,
        details: details,
        duration: duration
      }
    });
  } catch (err) {}
}

// Auto-Detect Website Profile Name or Email from DOM
function scanWebsiteForProfile() {
  try {
    // 1. Check aria-labels like "Google Account: Name (email@gmail.com)" or profile buttons
    const profileEls = document.querySelectorAll(
      "[aria-label*='Account'], [aria-label*='Profile'], [class*='profile'], [class*='user-name'], [class*='username'], [data-user-email]"
    );
    for (const el of profileEls) {
      const dataEmail = el.getAttribute("data-user-email");
      if (dataEmail && dataEmail.includes("@")) {
        chrome.runtime.sendMessage({ type: "DETECTED_PROFILE", profileName: dataEmail });
        return;
      }
      const aria = el.getAttribute("aria-label") || "";
      const emailMatch = aria.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        chrome.runtime.sendMessage({ type: "DETECTED_PROFILE", profileName: aria.replace(/^.*?:\s*/, "").trim() });
        return;
      }
      const txt = (el.innerText || "").trim();
      if (txt && txt.length > 2 && txt.length < 40 && !/login|sign in|register|menu/i.test(txt)) {
        chrome.runtime.sendMessage({ type: "DETECTED_PROFILE", profileName: txt });
        return;
      }
    }

    // 2. Fallback: Scan visible page header/nav for an email address
    const header = document.querySelector("header, nav");
    if (header) {
      const headerEmail = header.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (headerEmail) {
        chrome.runtime.sendMessage({ type: "DETECTED_PROFILE", profileName: headerEmail[0] });
      }
    }
  } catch (e) {}
}

setTimeout(scanWebsiteForProfile, 1500);

function getReadableLabel(el) {
  if (!el) return "Unknown Area";
  const text =
    el.getAttribute("aria-label") ||
    el.getAttribute("alt") ||
    el.getAttribute("title") ||
    el.innerText ||
    el.value ||
    "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, 75) : el.tagName.toLowerCase();
}

function getCurrentVisibleSection() {
  const centerX = Math.floor(window.innerWidth / 2);
  const centerY = Math.floor(window.innerHeight / 2);
  const el = document.elementFromPoint(centerX, centerY);
  if (!el) return `Scroll Y: ${Math.round(window.scrollY)}px`;

  const container =
    el.closest("article, section, [class*='card'], [class*='product'], [class*='item'], main, div") || el;

  const heading = container.querySelector("h1, h2, h3, h4, [class*='title'], [class*='name']");
  if (heading && heading.innerText.trim()) {
    return `Section: "${heading.innerText.replace(/\s+/g, " ").trim().slice(0, 65)}"`;
  }

  const label = getReadableLabel(el);
  return `Area: "${label}" (Scroll Y: ${Math.round(window.scrollY)}px)`;
}

sendLog("Page Visit", document.title || window.location.hostname);

function handleInputCapture(target) {
  if (!target || (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA")) return;
  if (target.type === "password" || target.type === "hidden") return;

  const val = target.value.trim();
  if (!val) return;

  // Capture Email or Username when typed into login/profile inputs
  const fieldHint = `${target.type} ${target.name} ${target.id} ${target.placeholder}`.toLowerCase();
  if (
    target.type === "email" ||
    /email|user|login|account/.test(fieldHint) ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  ) {
    try {
      chrome.runtime.sendMessage({ type: "DETECTED_PROFILE", profileName: val });
    } catch (e) {}
  }

  if (val === lastLoggedSearch) return;
  lastLoggedSearch = val;
  const fieldName = target.placeholder || target.name || target.id || "Search Box";
  sendLog("Search / Input", `[${fieldName}]: "${val}"`);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleInputCapture(e.target);
  }
});

document.addEventListener("change", (e) => {
  handleInputCapture(e.target);
});

document.addEventListener("click", (e) => {
  const el =
    e.target.closest("button, a, input[type='submit'], [role='button'], [class*='card']") || e.target;
  const label = getReadableLabel(el);
  sendLog("Click", `Clicked: "${label}"`);
});

window.addEventListener(
  "scroll",
  () => {
    if (!isScrolling) {
      const holdSeconds = ((Date.now() - scrollHoldStart) / 1000).toFixed(1);
      if (parseFloat(holdSeconds) >= 3.0) {
        const sectionInfo = getCurrentVisibleSection();
        sendLog("Section Hold", sectionInfo, `${holdSeconds} sec`);
      }
      isScrolling = true;
    }

    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      isScrolling = false;
      scrollHoldStart = Date.now();
    }, 350);
  },
  { passive: true }
);

document.addEventListener("mouseover", (e) => {
  const candidate = e.target.closest("a, button, img, article, [class*='card'], [class*='product']");
  if (!candidate || candidate === hoverTarget) return;

  if (hoverTarget && hoverStartTime > 0) {
    const hoverSec = ((Date.now() - hoverStartTime) / 1000).toFixed(1);
    if (parseFloat(hoverSec) >= 2.5) {
      sendLog("Hover Hold", `Hovered on: "${getReadableLabel(hoverTarget)}"`, `${hoverSec} sec`);
    }
  }

  hoverTarget = candidate;
  hoverStartTime = Date.now();
});

document.addEventListener("mouseout", (e) => {
  if (!hoverTarget) return;
  if (!hoverTarget.contains(e.relatedTarget)) {
    const hoverSec = ((Date.now() - hoverStartTime) / 1000).toFixed(1);
    if (parseFloat(hoverSec) >= 2.5) {
      sendLog("Hover Hold", `Hovered on: "${getReadableLabel(hoverTarget)}"`, `${hoverSec} sec`);
    }
    hoverTarget = null;
    hoverStartTime = 0;
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    const holdSeconds = ((Date.now() - scrollHoldStart) / 1000).toFixed(1);
    if (parseFloat(holdSeconds) >= 3.0) {
      sendLog("Section Hold (Tab Exit)", getCurrentVisibleSection(), `${holdSeconds} sec`);
    }
  } else {
    scrollHoldStart = Date.now();
  }
});
