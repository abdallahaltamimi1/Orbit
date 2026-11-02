/* Public pages share the portal's appearance preference precedence without loading portal data. */
(() => {
  "use strict";
  const keys = ["orbit.settings.appearance", "orbit.student.v1", "orbitTheme", "theme"];
  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  function apply() {
    let legacy = "light";
    try { legacy = localStorage.getItem("orbitTheme") || localStorage.getItem("theme"); } catch {}
    const candidates = [readJSON(keys[0], null), readJSON(keys[1], {}).theme, legacy];
    const preference = candidates.find(value => ["light", "dark", "auto"].includes(value)) || "light";
    const theme = preference === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
    document.documentElement.dataset.orbitAppearance = preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    if (document.body) document.body.dataset.theme = theme;
  }
  apply(); // Render blocking in the head: select the surface before styles paint.
  document.addEventListener("DOMContentLoaded", apply);
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", apply);
  window.addEventListener("storage", event => { if (event.key === null || keys.includes(event.key)) apply(); });
})();
