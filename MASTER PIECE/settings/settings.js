"use strict";
const O = ORBIT,
  { t, esc } = O;
const icons = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  moon: '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>',
  screen: '<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18"/>',
  gear: '<path d="m9 3 1-2h4l1 2 3 2 2 1v4l-2 2v3l-2 2h-3l-2 2H7l-1-3-3-1v-4l2-2V6l2-2Z"/><circle cx="11" cy="10" r="3"/>',
  motion: '<path d="M3 7h12M3 12h18M3 17h9"/>',
  palette:
    '<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4 2 2 0 0 1 0-4h3a4 4 0 0 0 4-4c0-4-5-6-9-6Z"/><path d="M7 9h.01M10 6h.01M15 7h.01M6 13h.01"/>',
};
const icon = (k) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[k]}</svg>`;
const choice = (name, value, label, visual) =>
  `<label class="setting-choice"><input type="radio" name="${name}" value="${value}"><span class="choice-art">${visual}</span><strong>${label}</strong><span class="choice-indicator" aria-hidden="true"></span></label>`;
document.body.classList.add("unified-settings");
O.shell(
  t("Settings", "الإعدادات"),
  `<section class="settings-world"><header class="settings-welcome"><div class="settings-title"><span class="setting-icon">${icon("gear")}</span><div><h2>${t("Settings", "الإعدادات")}</h2><p>${t("Make ORBIT work the way you like.", "خصص ORBIT بالطريقة اللي بتناسبك.")}</p></div></div><img class="settings-mascot" src="../student-dashboard/assets/orbit-robot.png" width="270" height="270" alt=""></header><form id="settings-form" class="settings-sheet"><fieldset><legend><span class="setting-icon">${icon("palette")}</span>${t("Appearance", "المظهر")}</legend><p>${t("Choose the appearance that suits you across ORBIT.", "اختر المظهر اللي بناسبك في جميع صفحات ORBIT.")}</p><div class="setting-options appearance-options">${choice("appearance", "light", t("Light", "فاتح"), icon("sun"))}${choice("appearance", "dark", t("Dark", "داكن"), icon("moon"))}${choice("appearance", "auto", t("System", "تلقائي"), icon("screen"))}</div></fieldset><fieldset><legend><span class="setting-icon">${icon("globe")}</span>${t("Language", "اللغة")}</legend><p>${t("Choose the language you prefer to use in ORBIT.", "اختر اللغة اللي بتفضل تستخدمها في ORBIT.")}</p><div class="setting-options language-options">${choice("lang", "ar", "العربية", '<span class="language-mark" lang="ar">ع</span>')}${choice("lang", "en", "English", '<span class="language-mark" lang="en">En</span>')}</div></fieldset><input type="hidden" name="mood" value="fun"><div class="settings-save"><button class="btn" type="submit">${t("Save settings", "حفظ الإعدادات")}</button><button class="btn soft" type="button" id="cancel-settings">${t("Cancel changes", "إلغاء التغييرات")}</button><span>${t("Changes apply after saving.", "التغييرات بتتطبق بعد الحفظ.")}</span></div><p id="status" role="status" aria-live="polite"></p></form></section>`,
);
const form = document.getElementById("settings-form"),
  system = matchMedia("(prefers-color-scheme: dark)");
const saved = {
  appearance: O.get("orbit.settings.appearance", null) || O.prefs.theme || "light",
  lang: O.prefs.lang || "ar",
  mood: localStorage.getItem("orbit.motion.preference") || "fun",
};
for (const [key, value] of Object.entries(saved)) form.elements[key].value = value;
function preview() {
  document.querySelector(".settings-world").dataset.preview =
    form.elements.appearance.value === "auto"
      ? system.matches
        ? "dark"
        : "light"
      : form.elements.appearance.value;
}
form.addEventListener("change", preview);
preview();
document.getElementById("cancel-settings").onclick = () => {
  for (const [key, value] of Object.entries(saved)) form.elements[key].value = value;
  preview();
  document.getElementById("status").textContent = t(
    "Unsaved changes discarded.",
    "أُلغيت التغييرات غير المحفوظة.",
  );
};
if (sessionStorage.getItem("orbit.settings.saved") === "1") {
  document.getElementById("status").textContent = t("Settings saved.", "انحفظت الإعدادات.");
  sessionStorage.removeItem("orbit.settings.saved");
}
form.onsubmit = (e) => {
  e.preventDefault();
  try {
    const appearance = form.elements.appearance.value;
    const prefs = {
      ...O.get("orbit.student.v1", {}),
      lang: form.elements.lang.value,
      theme: appearance === "auto" ? (system.matches ? "dark" : "light") : appearance,
      mood: form.elements.mood.value,
    };
    O.set("orbit.student.v1", prefs);
    O.set("orbit.settings.appearance", appearance);
    localStorage.setItem("orbit.motion.preference", prefs.mood);
    localStorage.setItem("orbitMood", prefs.mood);
    localStorage.setItem("orbitLanguage", prefs.lang);
    localStorage.setItem("orbitTheme", prefs.theme);
    sessionStorage.setItem("orbit.settings.saved", "1");
    location.reload();
  } catch {
    document.getElementById("status").textContent = t(
      "Could not save settings. Check browser storage and try again.",
      "تعذر حفظ الإعدادات. تحقق من تخزين المتصفح وجرّب مرة ثانية.",
    );
  }
};
function systemChanged() {
  if (O.get("orbit.settings.appearance", null) !== "auto") return;
  const prefs = { ...O.get("orbit.student.v1", {}), theme: system.matches ? "dark" : "light" };
  O.set("orbit.student.v1", prefs);
  localStorage.setItem("orbitTheme", prefs.theme);
  document.body.dataset.theme = prefs.theme;
  preview();
}
system.addEventListener("change", systemChanged);
addEventListener("pagehide", () => system.removeEventListener("change", systemChanged), {
  once: true,
});
document.title = t("ORBIT · Settings", "ORBIT · الإعدادات");
