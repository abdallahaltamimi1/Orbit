/* Presentation only: keep existing service elements, routes, events and data contracts. */
(() => {
  "use strict";
  if (window.OrbitAuth?.current()?.role !== "student") return;
  if (location.hash === "#student-community")
    history.replaceState(history.state, "", location.pathname + location.search);
  const $ = (id) => document.getElementById(id),
    t = (en, ar) => (document.documentElement.lang === "ar" ? ar : en),
    escape = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
      );
  document.body.classList.add("student-workspace");
  function taskView(event) {
    const main = $("main-content");
    if (!main?.dataset.studentOrganized) return;
    const id = location.hash.slice(1),
      names = {
        "meetings-section": ["Meetings", "الاجتماعات"],
      };
    main
      .querySelectorAll(":scope > .student-task-active")
      .forEach((n) => {
        n.classList.remove("student-task-active");
        n.querySelectorAll(".student-task-detail-active").forEach((detail) =>
          detail.classList.remove("student-task-detail-active"),
        );
      });
    let heading = $("student-task-heading");
    if (!names[id]) {
      delete document.body.dataset.studentTask;
      heading?.remove();
      return;
    }
    document.body.dataset.studentTask = id;
    const target = $(id),
      detail = target?.closest("details"),
      container = target?.closest("#main-content > *") || target;
    if (container) {
      container.classList.add("student-task-active");
      if (detail && container.contains(detail)) {
        detail.classList.add("student-task-detail-active");
        detail.open = true;
      } else if (container.tagName === "DETAILS") container.open = true;
    }
    if (!heading) {
      heading = document.createElement("header");
      heading.id = "student-task-heading";
      main.prepend(heading);
    }
    heading.innerHTML = `<a href="./student-dashboard.html">${t("Back to home", "ارجع للرئيسية")}</a><h1>${t(...names[id])}</h1>`;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      if (event?.type === "hashchange") {
        const title = heading.querySelector("h1");
        title.tabIndex = -1;
        title.focus({ preventScroll: true });
      }
    });
  }
  function mount() {
    const main = $("main-content");
    if (!main || main.dataset.studentOrganized) return;
    main.dataset.studentOrganized = "true";
    const welcome = main.querySelector(".futuristic-welcome"),
      current = $("current-learning"),
      stats = $("orbit-real-stats"),
      recent = $("recent-activity"),
      learning = $("learning-details");
    if (!welcome || !current || !learning) return;
    const upcoming = document.createElement("section");
    upcoming.className = "student-upcoming";
    upcoming.setAttribute(
      "aria-label",
      t("Upcoming meetings", "الاجتماعات القادمة"),
    );
    if ($("premium-next-meeting")) upcoming.append($("premium-next-meeting"));
    const primaryGrid = document.createElement("div");
    primaryGrid.className = "student-primary-grid";
    primaryGrid.append(current, upcoming);
    const expanded = learning.querySelector(".premium-expanded");
    for (const id of ["student-weekly-goals", "student-plan"]) if ($(id)) expanded?.append($(id));
    const explore = document.createElement("section");
    explore.id = "student-explore";
    explore.className = "student-explore";
    explore.innerHTML = `<h2>${t("Explore ORBIT", "استكشف ORBIT")}</h2><nav class="student-destination-list" aria-label="${t("Learning destinations", "وجهات التعلّم")}">${[
      [
        "lessons",
        "Lessons",
        "الدروس",
        "Find your next topic and continue learning.",
        "اختَر موضوعك وكمّل تعلّمك.",
        "book-open",
      ],
      [
        "lab",
        "Laboratories",
        "المختبرات",
        "Change a variable. Discover what happens.",
        "غيّر متغيّر، واكتشف النتيجة.",
        "flask-conical",
      ],
      [
        "school-tour",
        "Virtual school",
        "المدرسة الافتراضية",
        "Explore classrooms, the library and the lab.",
        "تجوّل بين الصفوف والمكتبة والمختبر.",
        "school",
      ],
      [
        "teacher-directory",
        "Teachers",
        "المعلمون",
        "Discover teachers and their teaching content.",
        "تعرّف على المعلمين ومحتواهم التعليمي.",
        "users",
      ],
      [
        "channels",
        "My channels",
        "قنواتي",
        "Follow lessons, updates and discussions in your channels.",
        "تابع الدروس والتحديثات والنقاشات في قنواتك.",
        "radio",
      ],
      [
        "exchange",
        "Book exchange",
        "تبادل الكتب",
        "Give books and learning tools a new journey.",
        "خلّي كتبك وأدواتك تفيد غيرك.",
        "book-open",
      ],
    ]
      .map(
        ([route, en, ar, description, descriptionAr, icon], i) =>
          `<a class="student-discovery-tile ${i > 3 ? "student-discovery-shortcut" : ""} discovery-${route}" href="../${route}/${route}.html"><span class="student-tile-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${window.OrbitDashboardIcons?.[icon] || { "school": '<path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6M7 10h2m6 0h2"/>', "radio": '<circle cx="12" cy="12" r="3"/><path d="M5 6a9 9 0 0 0 0 12M19 6a9 9 0 0 1 0 12"/>' }[icon] || '<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3ZM12 6v16"/>'}</svg></span><span class="student-tile-copy"><strong>${t(en, ar)}</strong><small>${t(description, descriptionAr)}</small></span><svg class="student-tile-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></a>`,
      )
      .join(
        "",
      )}</nav><details class="student-explore-details"><summary>${t("Browse subjects, experiments and the campus", "تصفّح المواد والتجارب والحرم المدرسي")}</summary><div class="student-explore-grid"></div></details>`;
    const grid = explore.querySelector(".student-explore-grid");
    for (const id of ["student-subjects", "school-tour-entry"]) if ($(id)) grid.append($(id));
    const experiments = main.querySelector(".orbit-experiments");
    if (experiments) grid.append(experiments);
    const meetingDetails = $("meetings-section")?.closest("details");
    const detailsStack = document.createElement("section");
    detailsStack.className = "student-detail-stack";
    const browseDetails = explore.querySelector(".student-explore-details");
    if (browseDetails) detailsStack.append(browseDetails);
    for (const details of [learning, meetingDetails]) if (details) detailsStack.append(details);
    const nodes = [
      welcome,
      stats,
      primaryGrid,
      recent,
      explore,
      detailsStack,
    ].filter(Boolean);
    main.append(...nodes);
    main
      .querySelectorAll(":scope > .orbit-learning-grid,:scope > .orbit-support-grid,:scope > .orbit-content-grid")
      .forEach((n) => {
        if (!n.children.length) n.remove();
        else n.classList.add("student-secondary-content");
      });
    taskView();
  }
  let queued = false;
  const observer = new MutationObserver(() => {
    if (!$("main-content") || $("main-content").dataset.studentOrganized) return;
    if (!queued) {
      queued = true;
      queueMicrotask(() => {
        queued = false;
        mount();
      });
    }
  });
  observer.observe($("app") || document.body, { childList: true, subtree: true });
  const languageObserver = new MutationObserver(() => taskView());
  languageObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });
  window.addEventListener("hashchange", taskView);
  window.addEventListener("pagehide", (e) => {
    if (!e.persisted) {
      observer.disconnect();
      languageObserver.disconnect();
    }
  });
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  mount();
})();
