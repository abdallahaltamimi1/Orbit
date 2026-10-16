(() => {
  "use strict";
  const key = "orbit.student.v1";
  let prefs;
  try {
    prefs = JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    prefs = {};
  }
  const lang = prefs.lang === "en" ? "en" : "ar";
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  function mount() {
    window.OrbitHomeLocale?.apply();
    let button = document.getElementById("orbit-language-button");
    if (!button) {
      button = document.createElement("button");
      button.id = "orbit-language-button";
      button.type = "button";
      button.textContent = lang === "ar" ? "English" : "العربية";
      button.setAttribute(
        "aria-label",
        lang === "ar" ? "التبديل إلى الإنجليزية" : "Switch to Arabic",
      );
      button.onclick = () => {
        try {
          const current = JSON.parse(localStorage.getItem(key) || "{}");
          current.lang = lang === "ar" ? "en" : "ar";
          localStorage.setItem(key, JSON.stringify(current));
          localStorage.setItem("orbitLanguage", current.lang);
          localStorage.setItem("language", current.lang);
          location.reload();
        } catch {
          button.textContent = lang === "ar" ? "تعذر حفظ اللغة" : "Could not save language";
        }
      };
      document.body.append(button);
    }
    for (const old of document.querySelectorAll("button,a[role=button]")) {
      if (old === button) continue;
      const id = old.id || "",
        action = old.dataset.action || "",
        label = old.getAttribute("aria-label") || "",
        text = old.textContent.trim();
      if (
        ["language", "toggle-language"].includes(action) ||
        /^(lesson|catalog|practice|profile|planner|jobs|applications|notifications|pricing|lab)-language$/.test(
          id,
        ) ||
        /language|lang[-_]?toggle/i.test(id) ||
        /Switch to Arabic|التبديل.*إنجل|تبديل اللغة|Switch language/i.test(label) ||
        /^(EN|English|عربي|العربية)$/.test(text)
      ) {
        old.hidden = true;
        old.dataset.obsoleteLanguage = "true";
      }
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    mount();
    let scheduled = false;
    new MutationObserver((records) => {
      if (records.every((r) => r.target.id === "orbit-language-button")) return;
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(() => {
          scheduled = false;
          mount();
        });
      }
    }).observe(document.getElementById("orbit-page") || document.body, {
      childList: true,
      subtree: true,
    });
  });
})();
