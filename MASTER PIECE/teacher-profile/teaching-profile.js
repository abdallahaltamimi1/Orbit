(() => {
  "use strict";
  if (OrbitAuth.current()?.role !== "student") return;
  const english = OrbitAuth.get("orbit.student.v1", {}).lang === "en";
  const t = (en, ar) => english ? en : ar;
  const esc = ORBIT.esc;
  const subjects = {
    physics: ["Physics", "الفيزياء"], math: ["Mathematics", "الرياضيات"],
    chemistry: ["Chemistry", "الكيمياء"], biology: ["Biology", "الأحياء"],
    english: ["English", "الإنجليزية"], arabic: ["Arabic", "العربية"],
  };
  document.documentElement.lang = english ? "en" : "ar";
  document.documentElement.dir = english ? "ltr" : "rtl";
  document.title = `ORBIT · ${t("Teaching profile", "الملف التعليمي")}`;
  function render() {
    let profile;
    try { profile = OrbitTeachingProfiles.read(new URLSearchParams(location.search).get("id")); }
    catch { profile = null; }
    const label = (c) => english ? c.en || c.ar : c.ar || c.en;
    document.getElementById("app").innerHTML = `<header class="bar"><a class="logo" href="../student-dashboard/student-dashboard.html">ORBIT</a><button class="btn soft" type="button" data-action="theme">${t("Switch appearance", "تبديل المظهر")}</button></header><main class="wrap teaching-profile"><a href="../channels/channels.html">${t("Back to my channels", "العودة إلى قنواتي")}</a><header class="teaching-profile-heading"><h1>${t("Teaching profile", "الملف التعليمي")}</h1>${profile ? `<h2>${esc(profile.name)}</h2><p>${profile.subjects.map((s) => esc(subjects[s] ? t(...subjects[s]) : s)).join(" · ")}</p>` : ""}</header>${profile ? `<section aria-labelledby="teaching-channels-title"><h2 id="teaching-channels-title">${t("Teaching channels", "القنوات التعليمية")}</h2><p>${t("Public channels and private classrooms you have already joined.", "القنوات العامة والصفوف الخاصة التي انضممت إليها بالفعل.")}</p><ul class="teaching-channel-list">${profile.channels.map((c) => `<li><div><h3>${esc(label(c))}</h3><p>${esc(english ? c.descEn || c.descAr : c.descAr || c.descEn)}</p><small>${c.private ? t("Joined private classroom", "صف خاص انضممت إليه") : t("Public channel", "قناة عامة")}</small></div><a class="btn soft" href="../channel/channel.html?id=${encodeURIComponent(c.id)}">${t("Open channel", "فتح القناة")}</a></li>`).join("")}</ul></section>` : `<section class="teaching-profile-empty" role="status"><h2>${t("Teaching profile unavailable", "الملف التعليمي غير متاح")}</h2><p>${t("No teaching channels are available for you to view for this teacher.", "لا توجد قنوات تعليمية لهذا المعلم متاحة لك للعرض.")}</p></section>`}</main>`;
  }
  render();
  window.addEventListener("storage", (e) => {
    if (["orbit.channels.v2", "orbit.memberships.v3", "orbit.profiles.v1"].includes(e.key)) render();
  });
})();
