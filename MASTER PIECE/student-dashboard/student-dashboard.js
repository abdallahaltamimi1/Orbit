"use strict";
// Student dashboard only. Teacher discovery lives in ../teacher-directory/.
const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};
function read(k) {
  try {
    return JSON.parse(store.get(k));
  } catch {
    return null;
  }
}
const legacy = read("orbitUser") || read("currentUser") || read("user") || read("student") || {};
let student = Object.assign(
  {
    name:
      legacy.name ||
      legacy.fullName ||
      store.get("studentName") ||
      store.get("orbitStudentName") ||
      "Lina",
    lang: store.get("orbitLanguage") || store.get("language") || "ar",
    theme: store.get("orbitTheme") || store.get("theme") || "light",
    mood: store.get("orbitMood") || "fun",
    xp: 0,
    done: [],
    quiz: null,
  },
  read("orbit.student.v1") || {},
  {
    name: OrbitProfiles.current()?.name || legacy.name,
    photo: OrbitProfiles.current()?.photo || "",
  },
);
student.lang = ["en", "ar"].includes(student.lang) ? student.lang : "ar";
student.theme = student.theme === "dark" ? "dark" : "light";
student.mood = student.mood === "calm" ? "calm" : "fun";
student.done = Array.isArray(student.done) ? student.done : [];
const txt = (en, ar) => (student.lang === "ar" ? ar : en),
  escape = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
const route = (name, query = "") => `../${name}/${name}.html${query}`,
  complete = (id) => student.done.includes(id);
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
let observer, resizeObserver, scrollFrame, toastTimeout;
function save() {
  store.set("orbit.student.v1", JSON.stringify(student));
  store.set("orbitLanguage", student.lang);
  store.set("orbitTheme", student.theme);
  store.set("orbitMood", student.mood);
  store.set("studentName", student.name);
}
const icons = {
  orbit:
    '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/>',
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  book: '<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3Z"/><path d="M12 6v16"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  award: '<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/>',
  people:
    '<circle cx="9" cy="8" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 5a3 3 0 0 1 0 6M19 14a5 5 0 0 1 3 4v3"/>',
  channel:
    '<circle cx="12" cy="12" r="3"/><path d="M6 6a8.5 8.5 0 0 0 0 12M18 6a8.5 8.5 0 0 1 0 12M3 3a13 13 0 0 0 0 18M21 3a13 13 0 0 1 0 18"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  lab: '<path d="M9 3h6M10 3v7l-6 10h16l-6-10V3M7 15h10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  exchange: '<path d="M3 7h18l-4-4M21 17H3l4 4"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
};
const ico = (name, cls = "") => {
  const map = {
    home: "house",
    book: "book-open",
    award: "sparkles",
    people: "users",
    channel: "school",
    arrow: "arrow-right",
    profile: "user-round",
    check: "clipboard-check",
    lab: "flask-conical",
    back: "arrow-left",
    exchange: "arrow-left-right",
    bell: "bell",
    settings: "settings",
    clock: "calendar-days",
  };
  const path = window.OrbitDashboardIcons?.[map[name] || name];
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path || icons[name] || icons.orbit}</svg>`;
};
const link = (name, label, kind = "", query = "") =>
  `<a class="button ${kind}" href="${route(name, query)}">${label}${ico("arrow", "arrow")}</a>`;
function studentLevelLabel() {
  return (
    {
      primary: txt("Primary", "الأساسي"),
      secondary: txt("Secondary", "الثانوي"),
      university: txt("University", "الجامعي"),
    }[OrbitProfiles.current()?.level] || txt("Learning path", "مسار التعلم")
  );
}
function stages() {
  return [
    {
      id: "foundation",
      title: txt("Foundation", "الأساس"),
      sub: txt("Forces & motion", "القوى والحركة"),
      value: complete("lesson") ? 100 : 0,
      done: complete("lesson"),
      url: route("lessons"),
      time: txt("Orientation", "تهيئة"),
      icon: "book",
    },
    {
      id: "lesson",
      title: txt("Current lesson", "الدرس الحالي"),
      sub: txt("Newton’s laws", "قوانين نيوتن"),
      value: complete("lesson") ? 100 : 0,
      done: complete("lesson"),
      url: route("lesson"),
      time: txt("5 min · 5 parts", "5 دقائق · 5 أجزاء"),
      icon: "orbit",
    },
    {
      id: "practice",
      title: txt("Apply your learning", "طبّق تعلمك"),
      sub: txt("Force calculations", "حساب القوى"),
      value: complete("practice") ? 100 : 0,
      done: complete("practice"),
      url: route("practice"),
      time: txt("8 min · 1 activity", "8 دقائق · نشاط واحد"),
      icon: "activity",
    },
    {
      id: "lab",
      title: txt("Explore the lab", "استكشف المختبر"),
      sub: txt("Mass & acceleration", "الكتلة والتسارع"),
      value: complete("lab") ? 100 : 0,
      done: complete("lab"),
      url: route("lab"),
      time: txt("4 experiments", "4 تجارب"),
      icon: "lab",
    },
    {
      id: "quiz",
      title: txt("Check your understanding", "اختبر فهمك"),
      sub: txt("Forces quiz", "اختبار القوى"),
      value: complete("quiz") ? 100 : 0,
      done: complete("quiz"),
      url: route("quiz"),
      time: txt("6 min · 3 questions", "6 دقائق · 3 أسئلة"),
      icon: "check",
    },
    {
      id: "milestone",
      title: txt("Your next orbit", "مدارك القادم"),
      sub: txt("Physics Explorer", "مستكشف الفيزياء"),
      value: complete("quiz") ? 100 : 0,
      done: complete("quiz"),
      url: route("achievements"),
      time: txt("Journey milestone", "إنجاز الرحلة"),
      icon: "award",
    },
  ];
}
function milestones() {
  return [
    {
      id: "first",
      en: "First Orbit",
      ar: "المدار الأول",
      icon: "orbit",
      unlocked: complete("lesson"),
      enDesc: "Complete your first lesson in this journey.",
      arDesc: "أكمل أول درس في هذه الرحلة.",
    },
    {
      id: "physics",
      en: "Physics Explorer",
      ar: "مستكشف الفيزياء",
      icon: "book",
      unlocked: complete("quiz"),
      enDesc: "Complete the forces quiz.",
      arDesc: "أكمل اختبار القوى.",
    },
    {
      id: "solver",
      en: "Problem Solver",
      ar: "حلّال المسائل",
      icon: "activity",
      unlocked: complete("practice"),
      enDesc: "Submit the correct practice answer.",
      arDesc: "سلّم الإجابة الصحيحة في التدريب.",
    },
    {
      id: "pioneer",
      en: "Lab Pioneer",
      ar: "رائد المختبر",
      icon: "lab",
      unlocked: complete("lab"),
      enDesc: "Run the force and acceleration experiment.",
      arDesc: "شغّل تجربة القوة والتسارع.",
    },
    {
      id: "consistent",
      en: "Consistent Learner",
      ar: "متعلم مثابر",
      icon: "award",
      unlocked: ["lesson", "practice", "lab", "quiz"].every(complete),
      enDesc: "Complete all four learning activities.",
      arDesc: "أكمل أنشطة التعلم الأربعة.",
    },
  ];
}
function radial(value, label, detail, color) {
  return `<div class="radial-item" data-ring-item><div class="radial" role="img" aria-label="${escape(label + ": " + value + "%")}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="radial-track" cx="60" cy="60" r="49"/><circle class="radial-value" cx="60" cy="60" r="49" style="--offset:${307.88 * (1 - value / 100)};--ring-color:${color}"/></svg><span><b>${value}%</b></span></div><h3>${label}</h3><p>${detail}</p></div>`;
}
function schoolTourEntry() {
  return `<section class="school-tour-entry student-tour-strip" id="school-tour-entry" aria-labelledby="school-tour-title"><div class="school-tour-copy"><h2 id="school-tour-title">${txt("One campus. Many ways to learn.", "مدرسة واحدة، ووجهات كثيرة للتعلّم.")}</h2><p>${txt("Choose a place in the real 3D scene, then continue to its existing learning feature.", "اختَر مكانًا بالمشهد ثلاثي الأبعاد، وبعدها كمل لوجهته التعليمية الموجودة بالمنصة.")}</p></div><div class="student-tour-destinations">${[
    ["classroom", "book", "Classroom", "الصف"],
    ["library", "book", "Library & study", "المكتبة والدراسة"],
    ["science-lab", "lab", "Science lab", "مختبر العلوم"],
    ["sports", "activity", "Playground", "الملعب"],
  ]
    .map(
      ([id, icon, en, ar]) =>
        `<a href="${route("school-tour", "#" + id)}">${ico(icon)}${txt(en, ar)}</a>`,
    )
    .join("")}</div></section>`;
}

function dashboard() {
  const steps = stages(),
    next = steps.find((s) => !s.done) || steps.at(-1),
    progress = Math.round(
      (["lesson", "practice", "lab", "quiz"].filter(complete).length / 4) * 100,
    ),
    lessons = complete("lesson") ? 5 : 0,
    activities = ["practice", "lab", "quiz"].filter(complete).length,
    badges = milestones().filter((m) => m.unlocked).length;
  return `<section class="futuristic-welcome" aria-labelledby="hero-title"><img class="orbit-hero-environment" src="../shared/assets/lunar-observatory.png" alt="" width="1536" height="1024"><div class="orbit-mascot" id="orbit-mascot" aria-hidden="true"><img src="./assets/orbit-robot.png" width="1024" height="1024" alt="" fetchpriority="high"></div><div class="orbit-welcome-copy"><h1 id="hero-title">${txt("Hello,", "مرحبًا،")} <bdi>${escape(student.name)}</bdi></h1><p>${txt("Ready to discover something new today?", "جاهز لاكتشاف إشي جديد اليوم؟")}</p><small>${student.mood === "calm" ? txt("Learn at your own pace. Your next step is here.", "تعلّم على راحتك. خطوتك الجايّة هون.") : txt("A little curiosity opens a world of possibilities.", "شويّة فضول بتفتحلك عالم من الاحتمالات.")}</small><a class="button primary" href="#current-learning">${txt("Continue learning", "ابدأ التعلّم الآن")}${ico("arrow")}</a></div><p class="orbit-hero-quote">${txt("Every new idea opens a new horizon.", "كل مفهوم جديد، خطوة أقرب لأحلامك.")}</p></section>
 <nav class="orbit-statistics" id="orbit-real-stats" aria-label="${txt("Your learning statistics", "إحصاءات تعلّمك")}"></nav>
 <div class="orbit-learning-grid"><section class="panel orbit-continue" id="current-learning"></section><section class="panel orbit-weekly" id="student-weekly-goals"></section><section class="orbit-encouragement"><img src="./assets/orbit-robot.png" width="1024" height="1024" loading="lazy" alt=""><p id="orbit-encouragement-copy">${txt("Your next discovery starts with one small step.", "خطوة صغيرة منك، واكتشاف جديد بانتظارك.")}</p></section>
 <section class="panel orbit-subjects" id="student-subjects"></section><section class="panel orbit-recent" id="recent-activity"><header class="premium-section-head"><h2>${txt("Recent activity", "نشاطك الأخير")}</h2><a href="#student-saved-learning">${txt("View all", "عرض الكل")}</a></header><div id="premium-recent-items"></div></section>
 <section class="orbit-campus-card" id="school-tour-entry"><img src="../school-tour/assets/campus-preview.png" width="1120" height="700" loading="lazy" alt="${txt("Preview of the actual illustrative 3D campus", "معاينة الحرم التوضيحي ثلاثي الأبعاد")}"><div><h2>${txt("My virtual school", "مدرستي الافتراضية")}</h2><p>${txt("Explore your classrooms, library and science lab.", "استكشف صفوفك والمكتبة ومختبر العلوم.")}</p><a class="button primary student-tour-cta" href="${route("school-tour")}">${txt("Enter the school", "ادخل المدرسة")}${ico("arrow")}</a></div></section></div>
 <div class="orbit-support-grid"><section class="panel" id="student-plan"><header class="premium-section-head"><h2>${txt("Today’s tasks", "مهام اليوم")}</h2><div class="premium-plan-controls"><button data-plan-day="-1" aria-label="${txt("Previous day", "اليوم السابق")}">${ico("back")}</button><button data-plan-day="1" aria-label="${txt("Next day", "اليوم التالي")}">${ico("arrow")}</button></div></header><p id="premium-plan-date"></p><div id="premium-plan-items"></div></section><section class="panel" id="premium-next-meeting"><header class="premium-section-head"><h2>${txt("Your meetings", "اجتماعاتك")}</h2><a href="#meetings-section">${txt("View all", "عرض الكل")}</a></header><div id="premium-meeting-card"></div></section><section class="panel orbit-experiments"><header class="premium-section-head"><h2>${txt("Explore experiments", "استكشف التجارب")}</h2><a href="${route("school-tour", "#science-lab")}">${txt("Open lab", "افتح المختبر")}</a></header><div id="premium-recommendations-grid"></div></section></div>
 <details class="panel premium-extra" id="learning-details"><summary>${txt("Your learning journey, progress & saved content", "مسارك التعليمي وتقدّمك ومحتواك المحفوظ")}</summary><div class="premium-expanded"><section class="panel learning-journey section-motion" id="learning-orbit"><header class="section-head"><div><span class="eyebrow">${txt("A CONNECTED PATH", "مسار متصل")}</span><h2>${txt("Your Learning Orbit", "مدارك التعليمي")}</h2><p>${txt("Learn → apply → explore → reflect → advance.", "تعلم ← طبّق ← استكشف ← اختبر ← تقدم.")}</p></div><span class="status-pill">${txt("You are here", "أنت هنا")} · ${next.title}</span></header><div class="trajectory-scroll"><div class="trajectory-map"><svg class="trajectory-lines" aria-hidden="true"><defs><linearGradient id="orbit-path-gradient"><stop stop-color="var(--orbit-turquoise)"/><stop offset="1" stop-color="var(--orbit-blue)"/></linearGradient></defs><path class="path-background"/><path class="path-progress"/></svg><div class="journey-list">${steps.map((s, i) => `<a class="journey-node ${s.done ? "completed" : s.id === next.id ? "current" : "upcoming"}" href="${s.url}" data-stage="${s.id}" data-attract="${s.id === "milestone" ? "milestones" : "current-learning"}"><span class="node-kicker">${String(i + 1).padStart(2, "0")}</span><span class="node-circle">${ico(s.done ? "check" : s.icon)}<span class="node-orbit"></span></span><span class="node-status">${s.done ? txt("COMPLETED", "مكتمل") : s.id === next.id ? txt("YOU ARE HERE", "أنت هنا") : txt("UP NEXT", "قادم")}</span><strong>${s.title}</strong><span class="node-subject">${s.sub}</span><span class="node-meta">${s.time}</span><span class="node-percent">${s.value}%</span></a>`).join("")}</div></div></div></section>


 <section class="panel progress-panel section-motion" id="progress-section"><header class="section-head"><div><span class="eyebrow">${txt("EVERY STEP COUNTS", "كل خطوة تفرق")}</span><h2>${txt("Your orbit, in progress", "مدارك، قيد التقدم")}</h2></div>${ico("activity")}</header><div class="progress-grid">${radial(progress, txt("Overall progress", "التقدم العام"), txt("Physics", "الفيزياء") + " · " + studentLevelLabel(), "var(--orbit-blue)")}${radial(Math.round((lessons / 5) * 100), txt("Lesson parts", "أجزاء الدرس"), `${lessons}/5 ${txt("completed", "مكتملة")}`, "var(--orbit-turquoise)")}${radial(Math.round((activities / 3) * 100), txt("Activities", "الأنشطة"), `${activities}/3 ${txt("completed", "مكتملة")}`, "var(--orbit-coral)")}${radial(badges * 20, txt("Milestones", "الإنجازات"), `${badges}/5 ${txt("unlocked", "مكتسبة")}`, "var(--orbit-yellow)")}</div></section>
<section id="student-saved-learning" aria-labelledby="student-saved-learning-title"></section><div id="student-bookmarks"></div><div class="orbit-additional-links"><a href="${route("practice")}">${txt("Practice", "تدرّب")}</a><a href="${route("quiz")}">${txt("Quiz", "اختبر نفسك")}</a><a href="${route("teacher-directory")}">${txt("Teachers", "المعلمون")}</a></div><section class="panel section-motion milestones-panel" id="milestones"><header class="section-head"><div><span class="eyebrow">${txt("DISCOVERED ALONG THE WAY", "اكتسبتها خلال الرحلة")}</span><h2>${txt("Milestones", "إنجازات الرحلة")}</h2></div><span class="status-pill">${badges}/5 ${txt("unlocked", "مكتسبة")}</span></header><div class="milestone-grid">${milestones()
    .map(
      (m) =>
        `<button class="milestone ${m.unlocked ? "unlocked" : "locked"}" data-milestone="${m.id}" aria-label="${escape((student.lang === "ar" ? m.ar : m.en) + " · " + (m.unlocked ? txt("Unlocked", "مكتسب") : txt("Locked", "لم يُكتسب بعد")))}"><span class="milestone-planet">${ico(m.icon)}<span class="milestone-orbit"></span>${!m.unlocked ? `<span class="lock-dot">${ico("lock")}</span>` : ""}</span><strong>${student.lang === "ar" ? m.ar : m.en}</strong><small>${m.unlocked ? txt("DISCOVERED", "مكتسب") : txt("NEXT POSSIBILITY", "احتمال قادم")}</small></button>`,
    )
    .join("")}</div></section>
</div></details>
 <section class="panel" id="student-community"><header class="premium-section-head"><h2>${txt("Learning community", "مجتمع التعلّم")}</h2></header><div id="orbit-community-content"></div></section>
 <details class="panel premium-extra"><summary>${txt("Assignments & submissions", "الواجبات والتسليمات")}</summary><section id="assignments-section" class="orbit-assignments" tabindex="-1" aria-labelledby="assignment-section-title"></section></details><details class="panel premium-extra"><summary>${txt("All meetings & notifications", "كل الاجتماعات والإشعارات")}</summary><section id="meetings-section" class="orbit-meetings" tabindex="-1" aria-labelledby="meeting-section-title"></section></details>`;
}
function activityName(id) {
  return (
    {
      lesson: txt("Completed Newton’s laws lesson", "أكملت درس قوانين نيوتن"),
      practice: txt("Solved the force calculation", "حللت مسألة القوى"),
      lab: txt("Explored force & acceleration", "استكشفت القوة والتسارع"),
      quiz: txt("Completed the forces quiz", "أكملت اختبار القوى"),
      homework: txt("Submitted the maths worksheet", "سلّمت ورقة الرياضيات"),
    }[id] || txt("Completed a learning activity", "أكملت نشاطًا تعليميًا")
  );
}
function lastAction() {
  return student.done.length
    ? activityName(student.done[student.done.length - 1])
    : txt("No learning activity yet", "ما بدأت نشاطًا بعد؛ يلا نبدأ خطوة خطوة.");
}
function render() {
  observer?.disconnect();
  resizeObserver?.disconnect();
  document.documentElement.lang = student.lang;
  document.documentElement.dir = student.lang === "ar" ? "rtl" : "ltr";
  document.body.dataset.theme = student.theme;
  document.body.dataset.mood = student.mood;
  document.title = txt("ORBIT · Your Learning Journey", "ORBIT · رحلتك التعليمية");
  const initials = escape(
    String(student.name)
      .trim()
      .split(/\s+/)
      .map((x) => x[0])
      .slice(0, 2)
      .join(""),
  );
  document.getElementById("app").innerHTML =
    `<div class="app-shell"><div class="page-shell"><header class="topbar"><section class="student-discovery" aria-labelledby="student-search-title"><h2 id="student-search-title">${txt("What would you like to learn?", "شو حاب تتعلّم اليوم؟")}</h2><form id="student-search-form" role="search"><label class="student-search-field" for="student-search">${ico("search")}<span class="student-sr-only">${txt("Search learning content", "ابحث في المحتوى التعليمي")}</span><input id="student-search" type="search" autocomplete="off" placeholder="${txt("Search lessons, topics or questions…", "ابحث عن دروس، مواضيع أو أسئلة…")}" aria-controls="student-search-results"></label><label class="student-search-category"><span class="student-sr-only">${txt("Search category", "فئة البحث")}</span><select id="student-search-category">${[
      ["all", "Everything", "كل المحتوى"],
      ["lesson", "Lessons", "الدروس"],
      ["teacher", "Teachers", "المعلمون"],
      ["experiment", "Experiments", "التجارب"],
      ["activity", "Activities", "الأنشطة"],
      ["assignment", "Assignments", "الواجبات"],
      ["resource", "Resources", "الموارد"],
      ["video", "Videos", "الفيديوهات"],
      ["subject", "Subjects", "المواد"],
    ]
      .map(([id, en, ar]) => `<option value="${id}">${txt(en, ar)}</option>`)
      .join(
        "",
      )}</select></label><button class="button primary" type="submit">${ico("search")}<span class="student-sr-only">${txt("Search", "بحث")}</span></button></form><p id="student-search-status" role="status">${txt("Search your available lessons and learning destinations.", "ابحث في الدروس ووجهات التعلم المتاحة لك.")}</p><div id="student-search-results" hidden></div></section><div class="header-actions"><button data-action="theme" aria-label="${txt("Switch light or dark appearance", "تغيير المظهر النهاري أو الليلي")}" aria-pressed="${student.theme === "dark"}">${ico(student.theme === "dark" ? "sun" : "moon")}</button><button data-premium-mood aria-label="${txt("Change Orbit Mood", "تغيير مزاج المدار")}" aria-pressed="${student.mood === "calm"}">${ico("orbit")}<span>${student.mood === "calm" ? txt("Calm", "هادئ") : txt("Fun", "مرح")}</span></button><details class="premium-notifications"><summary aria-label="${txt("Notifications", "الإشعارات")}">${ico("bell")}<span id="premium-unread" hidden></span></summary><div id="premium-notification-list"></div></details><details class="student-account-menu"><summary class="top-avatar" aria-label="${txt("Open account menu", "افتح قائمة الحساب")}">${initials}</summary><div><strong><bdi>${escape(student.name)}</bdi></strong><a href="${route("account-profile")}">${txt("My profile and edit details", "ملفي وتعديل بياناتي")}</a><a href="${route("settings")}">${txt("Account settings", "إعدادات الحساب")}</a><button type="button" data-student-logout>${txt("Log out", "تسجيل الخروج")}</button></div></details></div></header><main id="main-content">${dashboard()}</main></div></div><dialog id="milestone-dialog"><button class="dialog-close" data-action="close" aria-label="${txt("Close", "إغلاق")}">×</button><div id="milestone-detail"></div></dialog>`;
  wireMotion();
}
function drawTrajectory() {
  const map = document.querySelector(".trajectory-map"),
    svg = map?.querySelector("svg");
  if (!map || !svg) return;
  const box = map.getBoundingClientRect(),
    points = [...map.querySelectorAll(".node-circle")].map((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left + b.width / 2 - box.left, y: b.top + b.height / 2 - box.top };
    });
  svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
  const vertical = innerWidth <= 640;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    d += vertical
      ? ` C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`
      : ` C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`;
  }
  const bg = svg.querySelector(".path-background"),
    fg = svg.querySelector(".path-progress");
  bg.setAttribute("d", d);
  fg.setAttribute("d", d);
  const length = fg.getTotalLength();
  fg.style.setProperty("--path-length", length);
  fg.style.strokeDasharray = length;
  const doneCount = stages().filter((s) => s.done).length;
  fg.style.setProperty("--path-end", length * (1 - Math.min(1, doneCount / 6)));
}
function wireMotion() {
  drawTrajectory();
  resizeObserver = new ResizeObserver(() => drawTrajectory());
  resizeObserver.observe(document.querySelector(".trajectory-map"));
  observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-orbit");
          observer.unobserve(entry.target);
        }
      }),
    { threshold: 0.12 },
  );
  document
    .querySelectorAll(".section-motion,.radial-item,.timeline-row,.recent-row")
    .forEach((el) => observer.observe(el));
  document.querySelectorAll("[data-attract]").forEach((el) => {
    const on = () => {
        document.getElementById(el.dataset.attract)?.classList.add("attracted");
        el.closest(".solar-system,.journey-list")?.classList.add("has-attraction");
      },
      off = () => {
        document.getElementById(el.dataset.attract)?.classList.remove("attracted");
        el.closest(".solar-system,.journey-list")?.classList.remove("has-attraction");
      };
    el.addEventListener("pointerenter", on);
    el.addEventListener("pointerleave", off);
    el.addEventListener("focus", on);
    el.addEventListener("blur", off);
  });
}
document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-action]");
  if (button) {
    const a = button.dataset.action;
    if (a === "close") {
      document.getElementById("milestone-dialog").close();
      return;
    }
    if (a === "language") student.lang = student.lang === "ar" ? "en" : "ar";
    if (a === "theme") student.theme = student.theme === "light" ? "dark" : "light";
    if (a === "mood") student.mood = student.mood === "fun" ? "calm" : "fun";
    save();
    const y = scrollY;
    render();
    scrollTo(0, y);
    document.querySelector('[data-action="' + a + '"]')?.focus({ preventScroll: true });
    if (a === "mood") {
      const toast = document.getElementById("toast");
      toast.textContent =
        student.mood === "calm"
          ? txt("Calm mode · motion paused", "وضع هادئ · الحركة متوقفة")
          : txt("Orbit mode · motion active", "وضع المدار · الحركة مفعّلة");
      toast.classList.add("visible");
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2200);
    }
  }
  const milestone = e.target.closest("[data-milestone]");
  if (milestone) {
    const m = milestones().find((m) => m.id === milestone.dataset.milestone);
    document.getElementById("milestone-detail").innerHTML =
      `<span class="detail-symbol">${ico(m.icon)}</span><span class="eyebrow">${m.unlocked ? txt("MILESTONE DISCOVERED", "إنجاز مكتسب") : txt("YOUR NEXT POSSIBILITY", "احتمالك القادم")}</span><h2>${student.lang === "ar" ? m.ar : m.en}</h2><p>${student.lang === "ar" ? m.arDesc : m.enDesc}</p>${link({ first: "lesson", physics: "quiz", solver: "practice", pioneer: "lab", consistent: "class-details" }[m.id], m.unlocked ? txt("Revisit activity", "راجع النشاط") : txt("Start this step", "ابدأ هذه الخطوة"), "primary")}`;
    document.getElementById("milestone-dialog").showModal();
  }
});
window.addEventListener(
  "scroll",
  () => {
    if (!document.querySelector(".solar-system") || scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      if (student.mood === "fun" && !motionPreference.matches)
        document.documentElement.style.setProperty(
          "--scroll-phase",
          Math.min(25, scrollY * 0.012) + "deg",
        );
    });
  },
  { passive: true },
);
window.addEventListener("storage", (e) => {
  if (e.key === "orbit.student.v1") {
    student = Object.assign(student, read(e.key) || {});
    render();
  }
});
render();

window.addEventListener("orbit:profile-change", () => {
  const p = OrbitProfiles.current();
  if (p?.role === "student") {
    Object.assign(student, {
      name: p.name,
      photo: p.photo || "",
      address: p.address || "",
      level: p.level || "",
    });
    if (!document.querySelector("dialog[open]")) render();
  }
});
