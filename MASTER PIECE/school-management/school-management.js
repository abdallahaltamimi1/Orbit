(() => {
  "use strict";
  if (OrbitAuth.current()?.role !== "school") return;
  const english = OrbitAuth.get("orbit.student.v1", {}).lang === "en";
  const t = (en, ar) => english ? en : ar;
  const sections = [
    ["overview", "Overview", "نظرة عامة", ""],
    ["students", "Students", "الطلاب"],
    ["teachers", "Teachers", "المعلمون"],
    ["classes", "Classes", "الصفوف"],
    ["subjects", "Subjects", "المواد"],
    ["timetable", "Timetable", "الجدول الدراسي"],
    ["monitoring", "Academic Monitoring", "المتابعة الأكاديمية"],
    ["events", "Events & Announcements", "الفعاليات والإعلانات"],
  ];
  const heading = t("School Management", "إدارة المدرسة");
  document.documentElement.lang = english ? "en" : "ar";
  document.documentElement.dir = english ? "ltr" : "rtl";
  document.title = `ORBIT · ${heading}`;
  const notice = t(
    "Academic demo records, timetable entries, events and announcements are saved in this browser for this school. Academic Monitoring reads saved school-owned educational activity separately. All schedule times use the device local time zone. Local isolation is not real security.",
    "تُحفظ السجلات الأكاديمية التجريبية والحصص والفعاليات والإعلانات في هذا المتصفح لهذه المدرسة. تقرأ المتابعة الأكاديمية النشاط التعليمي المحلي المرتبط بالمدرسة بشكل منفصل. جميع المواعيد حسب التوقيت المحلي للجهاز. العزل المحلي ليس حماية أمنية حقيقية.",
  );
  document.getElementById("app").innerHTML = `<header class="bar"><a class="logo" href="../school-dashboard/school-dashboard.html">ORBIT</a><button type="button" class="btn soft" data-action="theme">${t("Switch appearance", "تبديل المظهر")}</button></header>
    <main class="wrap school-management"><header class="sm-heading"><div><h1>${heading}</h1><p>${t("Your school's academic workspace.", "مساحة العمل الأكاديمية لمدرستك.")}</p></div><span class="sm-demo-label">${t("Demo workspace", "مساحة تجريبية")}</span></header>
    <p class="sm-demo-notice">${notice}</p><nav class="sm-nav" aria-label="${t("School management sections", "أقسام إدارة المدرسة")}"></nav><section id="sm-content" aria-labelledby="sm-section-title"></section></main>`;
  const overview = (academic) => `<div class="sm-section-heading"><h2 id="sm-section-title" tabindex="-1">${t("School Overview", "نظرة عامة على المدرسة")}</h2><span>${t("Local school records", "سجلات المدرسة المحلية")}</span></div><p class="sm-academic-note">${t("Roster counts are academic demo records. Assignment metrics are available separately in Academic Monitoring when reliable activity exists.", "أعداد التسجيل من السجلات الأكاديمية التجريبية. تتوفر مؤشرات الواجبات بشكل منفصل في المتابعة الأكاديمية عند وجود نشاط موثوق.")}</p><dl class="sm-totals">${[
    [academic.students.length, "Demo students", "الطلاب التجريبيون"], [academic.teachers.length, "Demo teachers", "المعلمون التجريبيون"],
    [academic.classes.filter((c) => c.status === "active").length, "Active demo classes", "الصفوف التجريبية النشطة"], [null, "Assignment metrics", "مؤشرات الواجبات"],
  ].map(([value, en, ar]) => `<div><dt>${t(en, ar)}</dt><dd>${value === null ? t("See monitoring", "راجع المتابعة") : value.toLocaleString(english ? "en-GB" : "ar-JO")}</dd></div>`).join("")}</dl><div class="sm-grid">${OrbitSchoolScheduleUI.overview(t)}</div>`;
  function render(focus = false) {
    const requested = new URLSearchParams(location.search).get("section");
    const section = sections.find(([id]) => id === requested) || sections[0];
    document.querySelector(".sm-nav").innerHTML = sections.map(([id, en, ar]) => `<a class="btn${section[0] === id ? "" : " soft"}" href="?section=${id}" ${section[0] === id ? 'aria-current="page"' : ""}>${t(en, ar)}</a>`).join("");
    const host = document.getElementById("sm-content");
    host.onclick = null;
    if (["students", "teachers", "classes", "subjects"].includes(section[0])) {
      OrbitSchoolAcademicUI.mount(host, section[0], t);
    } else if (section[0] === "monitoring") {
      OrbitSchoolMonitoringUI.mount(host, t);
    } else if (["timetable", "events"].includes(section[0])) {
      OrbitSchoolScheduleUI.mount(host, section[0], t);
    } else if (section[0] === "overview") {
      try {
        const academic = OrbitSchoolAcademics.read();
        host.innerHTML = overview(academic);
      } catch {
        host.innerHTML = `<h2 id="sm-section-title" tabindex="-1">${t("School Overview", "نظرة عامة على المدرسة")}</h2><p role="alert" class="sm-error">${t("Saved school data is unavailable. It has not been replaced. Check browser storage before reloading.", "بيانات المدرسة المحفوظة غير متاحة. لم تُستبدل. تحقق من تخزين المتصفح قبل إعادة التحميل.")}</p>`;
      }
    }
    if (focus) document.getElementById("sm-section-title").focus({ preventScroll: true });
  }
  document.querySelector("main").addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="?section="]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    history.pushState(null, "", link.href);
    render(true);
  });
  window.addEventListener("popstate", () => render(true));
  for (const name of ["storage", "orbit:school-schedule-change", "orbit:school-academics-change"]) window.addEventListener(name, () => {
    const section = new URLSearchParams(location.search).get("section");
    if ((!section || section === "overview") && !document.querySelector(".sm-academic-dialog[open]")) render();
  });
  render();
})();
