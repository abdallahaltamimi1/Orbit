"use strict";
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
  },
  read = (k) => {
    try {
      return JSON.parse(store.get(k));
    } catch {
      return null;
    }
  };
let prefs = Object.assign(
  {
    lang: store.get("orbitLanguage") || "ar",
    theme: store.get("orbitTheme") || "light",
    mood: store.get("orbitMood") || "fun",
  },
  read("orbit.student.v1") || {},
);
let teacher = Object.assign(
    { subject: "physics", experience: 8, qualification: "", bio: "", cv: "", location: "" },
    OrbitProfiles.current() || {},
  ),
  db = Object.assign(
    {
      joined: ["physics", "9b"],
      likes: [],
      saved: [],
      comments: {},
      role: "teacher",
      channels: [],
      posts: [],
    },
    read("orbit.channels.v2") || {},
  );
db.role = "teacher";
const t = (en, ar) => (prefs.lang === "ar" ? ar : en),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    ),
  route = (name, q = "") => `../${name}/${name}.html${q}`;
const name = () => teacher.name || read("orbitUser")?.name || t("Teacher", "معلم"),
  bio = () =>
    teacher.bio ||
    t(
      "Turning everyday questions into scientific discoveries.",
      "أحوّل الأسئلة اليومية إلى اكتشافات علمية.",
    ),
  qualification = () => teacher.qualification || t("Add your qualifications", "أضف مؤهلاتك");
const subjects = {
    physics: ["Physics", "الفيزياء"],
    math: ["Mathematics", "الرياضيات"],
    arabic: ["Arabic", "اللغة العربية"],
    english: ["English", "اللغة الإنجليزية"],
    chemistry: ["Chemistry", "الكيمياء"],
    biology: ["Biology", "الأحياء"],
  },
  subject = (s) => (subjects[s] ? t(...subjects[s]) : t("Education", "التعليم"));
const catalog = [
  {
    id: "physics",
    en: "Physics, in motion",
    ar: "الفيزياء بحركة",
    teacher: "khaled",
    subject: "physics",
    private: false,
    code: "",
    symbol: "⚛",
    color: "purple",
    descEn: "Understand the world. One experiment at a time.",
    descAr: "افهم العالم، تجربة بعد تجربة.",
  },
  {
    id: "9b",
    en: "Grade 9B · Physics",
    ar: "تاسع باء · فيزياء",
    teacher: "khaled",
    subject: "physics",
    private: true,
    code: "ORBIT9B",
    symbol: "↗",
    color: "blue",
    descEn: "Our classroom, beyond the classroom.",
    descAr: "صفنا الدراسي، خارج حدود الصف.",
  },
];
const owned = () => ORBIT.channels().filter(ORBIT.own),
  channel = (id) => owned().find((c) => c.id === id),
  label = (c) => esc(t(c.en || c.ar, c.ar || c.en));
const samplePosts = [
  {
    id: "p1",
    channel: "physics",
    type: "lesson",
    titleEn: "Why do we lean forward when a bus stops?",
    titleAr: "لماذا نميل للأمام عندما تتوقف الحافلة؟",
    bodyEn: "Newton’s first law, through an everyday moment.",
    bodyAr: "قانون نيوتن الأول، من خلال موقف يومي.",
    likes: 42,
    sample: true,
  },
  {
    id: "p2",
    channel: "9b",
    type: "assignment",
    titleEn: "Your next mission: forces around you",
    titleAr: "مهمتك القادمة: القوى من حولك",
    bodyEn: "Find three examples of forces at home.",
    bodyAr: "ابحث عن ثلاثة أمثلة للقوى في منزلك.",
    likes: 18,
    sample: true,
  },
];
const posts = () =>
    [...db.posts, ...samplePosts.filter((p) => !db.posts.some((x) => x.id === p.id))].filter(
      (p) => channel(p.channel) && !read("orbit.deleted.posts")?.includes(p.id),
    ),
  postTitle = (p) => esc(p.title || t(p.titleEn, p.titleAr)),
  postBody = (p) => esc(p.body || t(p.bodyEn, p.bodyAr)),
  kind = (k) =>
    ({
      lesson: t("Lesson", "شرح"),
      video: t("Video", "فيديو"),
      assignment: t("Assignment", "واجب"),
      discussion: t("Discussion", "نقاش"),
      announcement: t("Announcement", "إعلان"),
    })[k];
let libraryFilter = "all",
  channelFilter = "all",
  search = "",
  toastTimer;
const $ = (id) => document.getElementById(id);
const paths = {
  orbit:
    '<ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="3"/>',
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  channel: '<circle cx="12" cy="12" r="3"/><path d="M5 6a9 9 0 0 0 0 12M19 6a9 9 0 0 1 0 12"/>',
  video: '<rect x="2" y="5" width="15" height="14" rx="3"/><path d="m17 10 5-3v10l-5-3"/>',
  assignment:
    '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 15h6"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a20 20 0 0 1 0 18 20 20 0 0 1 0-18Z"/>',
  copy: '<rect x="8" y="7" width="12" height="14" rx="2"/><path d="M5 17H3V3h12v2"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  edit: '<path d="m4 16 12-12 4 4L8 20H4ZM14 6l4 4"/>',
  message: '<path d="M3 4h18v13H8l-5 4Z"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
};
const icon = (n) =>
    `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[n] || paths.orbit}</svg>`,
  initials = () =>
    esc(
      name()
        .split(/\s+/)
        .map((x) => x[0])
        .slice(0, 2)
        .join(""),
    );
function persist() {
  localStorage.setItem("orbit.channels.v2", JSON.stringify(db));
}
function notify(msg) {
  $("toast").textContent = msg;
  $("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 2500);
}
const profileCompletion = () =>
  Math.round(
    ([
      !!teacher.name,
      !!teacher.bio,
      !!teacher.qualification,
      !!teacher.location,
      !!teacher.cv,
      Number.isFinite(+teacher.experience),
    ].filter(Boolean).length /
      6) *
      100,
  );

const actualPosts = () => posts().filter((p) => !p.sample && p.moderationStatus !== "hidden");
function channelMembers(id) {
  return Object.entries(read("orbit.memberships.v3") || {})
    .filter(([email, list]) => Array.isArray(list) && list.includes(id))
    .map(([email]) => email);
}
function workspaceHero() {
  return (
    '<section class="studio-banner"><div><span>' +
    t("YOUR TEACHING WORKSPACE", "مساحة عملك التعليمية") +
    "</span><h2>" +
    t("One space for your classrooms and ideas.", "صفوفك وأفكارك، في مساحة واحدة.") +
    "</h2><p>" +
    t(
      "Manage your channels, publish a lesson and stay connected to your students.",
      "أدر قنواتك، انشر درسًا، وتابع تواصلك مع طلابك.",
    ) +
    '</p></div><div class="studio-banner-actions"><button class="button primary" data-action="compose">' +
    icon("plus") +
    t("Publish content", "نشر محتوى") +
    '</button><button class="button subtle" data-action="create">' +
    icon("channel") +
    t("Create channel", "إنشاء قناة") +
    "</button></div></section>"
  );
}
function channelCard(c) {
  const count = actualPosts().filter((p) => p.channel === c.id).length;
  return (
    '<article class="channel-card" data-channel data-privacy="' +
    (c.private ? "private" : "public") +
    '"><div class="channel-top"><span class="channel-emblem">' +
    icon(c.private ? "lock" : "globe") +
    '</span><span class="visibility">' +
    (c.private ? t("Private classroom", "صف خاص") : t("Public channel", "قناة عامة")) +
    '</span><button class="small-icon" data-action="compose" data-channel="' +
    esc(c.id) +
    '" aria-label="' +
    t("Publish in this channel", "النشر في هذه القناة") +
    '">' +
    icon("plus") +
    '</button></div><a href="' +
    route("channel", "?id=" + encodeURIComponent(c.id)) +
    '" class="channel-title">' +
    label(c) +
    icon("arrow") +
    "</a><p>" +
    esc(t(c.descEn || c.descAr || "", c.descAr || c.descEn || "")) +
    '</p><div class="channel-stats"><span>' +
    subject(c.subject) +
    "</span><span>" +
    channelMembers(c.id).length +
    " " +
    t("members", "أعضاء") +
    " · " +
    count +
    " " +
    t("posts", "منشورات") +
    '</span></div><div class="channel-bottom"><a href="' +
    route("channel", "?id=" + encodeURIComponent(c.id)) +
    '">' +
    t("Manage channel", "إدارة القناة") +
    " ↗</a>" +
    (c.private
      ? '<button class="code-copy" data-action="copy" data-channel="' +
        esc(c.id) +
        '"><span dir="ltr">' +
        esc(c.code) +
        "</span>" +
        icon("copy") +
        "</button>"
      : '<span class="public-note">' + t("Public teaching", "تعليم عام") + "</span>") +
    "</div></article>"
  );
}
function postRow(p) {
  const c = channel(p.channel),
    date =
      p.createdAt && !isNaN(Date.parse(p.createdAt))
        ? new Intl.DateTimeFormat(t("en", "ar"), { dateStyle: "medium" }).format(
            new Date(p.createdAt),
          )
        : "";
  return (
    '<article class="post-row" data-post data-post-id="' +
    esc(p.id) +
    '" data-kind="' +
    esc(p.type) +
    '"><div class="post-type ' +
    esc(p.type) +
    '">' +
    icon(p.type === "video" ? "video" : p.type === "assignment" ? "assignment" : "orbit") +
    '</div><div class="post-info"><a href="' +
    route("channel", "?id=" + encodeURIComponent(p.channel) + "&post=" + encodeURIComponent(p.id)) +
    '"><h3>' +
    postTitle(p) +
    "</h3></a><span>" +
    label(c) +
    " · " +
    kind(p.type) +
    (p.sample ? " · " + t("Demo sample", "مثال تجريبي") : "") +
    "</span>" +
    (p.type === "video"
      ? '<button class="inline-link" data-action="preview-video" data-post="' +
        esc(p.id) +
        '">' +
        t("Preview video", "معاينة الفيديو") +
        " ▷</button>"
      : "") +
    '</div><div class="post-meta"><span class="content-access">' +
    (p.sample ? t("Sample", "تجريبي") : c.private ? t("Private", "خاص") : t("Public", "عام")) +
    "</span><time>" +
    esc(date) +
    '</time></div><div class="content-actions"><button class="small-icon" data-edit-content="' +
    esc(p.id) +
    '" aria-label="' +
    t("Edit content", "تعديل المحتوى") +
    '">' +
    icon("edit") +
    '</button><a class="row-arrow" href="' +
    route("channel", "?id=" + encodeURIComponent(p.channel) + "&post=" + encodeURIComponent(p.id)) +
    '" aria-label="' +
    t("Open content", "فتح المحتوى") +
    '">' +
    icon("arrow") +
    "</a></div></article>"
  );
}
function render() {
  db = Object.assign(
    { channels: [], posts: [], comments: {}, likes: [], saved: [] },
    read("orbit.channels.v2") || {},
  );
  document.documentElement.lang = prefs.lang;
  document.documentElement.dir = prefs.lang === "ar" ? "rtl" : "ltr";
  document.body.dataset.theme = prefs.theme;
  document.body.dataset.mood = prefs.mood;
  document.title = t("ORBIT · Teacher Studio", "ORBIT · استوديو المعلم");
  const pc = profileCompletion(),
    own = owned(),
    all = posts(),
    replies = all.reduce((n, p) => n + (db.comments[p.id] || []).length, 0);
  $("teacher-app").innerHTML =
    `<div class="shell"><aside class="sidebar"><a class="brand" href="./teacher-dashboard.html"><span>${icon("orbit")}</span><b>ORBIT<small>${t("TEACHER STUDIO", "استوديو المعلم")}</small></b></a><div class="teacher-id"><span class="avatar">${initials()}</span><div><strong>${esc(name())}</strong><small>${subject(teacher.subject)} · ${t("Teacher", "معلم")}</small></div></div><span class="nav-label">${t("YOUR WORKSPACE", "مساحة عملك")}</span><nav>${[
      ["#overview", "home", t("Overview", "نظرة عامة"), "active"],
      ["#my-channels", "channel", t("My channels", "قنواتي"), ""],
      ["#content-library", "video", t("Content library", "مكتبة المحتوى"), ""],
      ["#content-library", "assignment", t("Assignments", "الواجبات"), "assignment-nav"],
      [
        route("teacher-profile", "?id=" + encodeURIComponent(read("orbitUser")?.email || "")),
        "profile",
        t("Public portfolio", "ملفي المهني"),
        "",
      ],
      [route("teacher-directory"), "globe", t("Teacher directory", "دليل المعلمين"), ""],
    ]
      .map((n) => `<a href="${n[0]}" class="nav-item ${n[3]}">${icon(n[1])}${n[2]}</a>`)
      .join(
        "",
      )}</nav><button class="sidebar-create" data-action="create">${icon("plus")}${t("Create a channel", "أنشئ قناة")}</button><div class="sidebar-foot"><span class="plus-emblem">✧</span><b>ORBIT PLUS</b><small>${t("More room for your teaching.", "مساحة أكبر لتعليمك.")}</small><button data-action="premium">${t("Explore Plus", "اكتشف Plus")} ↗</button></div></aside><div class="main"><header class="topbar"><span>ORBIT <small>/ ${t("Teacher workspace", "مساحة المعلم")}</small></span><div class="preferences"><button data-action="language" aria-label="${t("Switch language", "تبديل اللغة")}">${prefs.lang === "ar" ? "EN" : "عربي"}</button><button data-action="theme" aria-label="${t("Switch theme", "تبديل المظهر")}">${icon(prefs.theme === "dark" ? "sun" : "moon")}</button><button data-action="mood" aria-label="${t("Toggle motion", "تبديل الحركة")}">${prefs.mood === "calm" ? t("Calm", "هادئ") : t("Orbit", "مدار")}</button><button class="top-avatar" data-action="edit-profile" aria-label="${t("Edit teacher profile", "تعديل ملف المعلم")}">${initials()}</button></div></header><main id="overview"><div class="welcome"><div><span class="eyebrow">${t("A SPACE TO INSPIRE", "مساحة لتلهم")}</span><h1>${t("Welcome back", "أهلًا بعودتك")}, ${esc(name())}</h1><p>${t("Your channels and content, ready for the next teaching moment.", "قنواتك ومحتواك جاهزين للحظة التعليم القادمة.")}</p></div><a class="text-link" href="${route("teacher-profile", "?id=" + encodeURIComponent(read("orbitUser")?.email || ""))}">${t("View my portfolio", "شاهد ملفي المهني")} ↗</a></div>${workspaceHero()}<div class="metrics">${[
      [
        own.length,
        t("Teaching channels", "قنوات تعليمية"),
        t("Public & private", "عامة وخاصة"),
        "channel",
      ],
      [
        actualPosts().length,
        t("Published content", "محتوى منشور"),
        t("Your teaching library", "مكتبتك التعليمية"),
        "video",
      ],
      [
        new Set(own.flatMap((c) => channelMembers(c.id))).size,
        t("Students", "طلاب"),
        t("Across your channels", "في قنواتك"),
        "profile",
      ],
      [
        pc + "%",
        t("Portfolio readiness", "جاهزية الملف"),
        t("Build your professional presence", "ابنِ حضورك المهني"),
        "profile",
      ],
    ]
      .map(
        (m) =>
          `<div><span class="metric-icon">${icon(m[3])}</span><div><strong>${m[0]}</strong><small>${m[1]}</small><span>${m[2]}</span></div></div>`,
      )
      .join(
        "",
      )}</div><div class="workspace-grid"><div><section id="my-channels"><div class="section-head"><div><h2>${t("Your teaching channels", "قنواتك التعليمية")}</h2><p>${t("Your classroom. Your audience. Your voice.", "صفك، جمهورك، وصوتك.")}</p></div><button class="text-link" data-action="create">＋ ${t("Create channel", "إنشاء قناة")}</button></div><div class="tabs" aria-label="${t("Filter channels", "فلترة القنوات")}">${[
      ["all", t("All", "الكل")],
      ["public", t("Public", "عامة")],
      ["private", t("Private", "خاصة")],
    ]
      .map(
        (n) =>
          `<button data-channel-filter="${n[0]}" class="${channelFilter === n[0] ? "selected" : ""}">${n[1]}</button>`,
      )
      .join(
        "",
      )}</div><div class="channel-grid">${own.map(channelCard).join("")}</div><p id="channels-empty" class="studio-empty" hidden>${t("No channels in this view. Create a channel or choose another filter.", "لا توجد قنوات في هذا العرض. أنشئ قناة أو اختر فلترًا آخر.")}</p></section><section class="content-library" id="content-library"><div class="section-head"><div><h2>${t("Your content library", "مكتبة محتواك")}</h2><p>${t("Every lesson becomes part of your story.", "كل درس يصير جزءًا من قصتك.")}</p></div><button class="button primary" data-action="compose">＋ ${t("New post", "منشور جديد")}</button></div><div class="library-tools"><div class="tabs">${[
      ["all", t("All", "الكل")],
      ["video", t("Videos", "فيديوهات")],
      ["lesson", t("Lessons", "شروحات")],
      ["assignment", t("Assignments", "واجبات")],
    ]
      .map(
        (n) =>
          `<button data-post-filter="${n[0]}" class="${libraryFilter === n[0] ? "selected" : ""}">${n[1]}</button>`,
      )
      .join(
        "",
      )}</div><label class="search-field">${icon("search")}<input id="library-search" value="${esc(search)}" placeholder="${t("Search your content", "ابحث في محتواك")}" aria-label="${t("Search your content", "ابحث في محتواك")}"></label></div><div id="post-list">${all.map(postRow).join("")}</div><p id="library-empty" class="empty" hidden>${t("No content matches. Publish your next idea.", "لا يوجد محتوى مطابق. انشر فكرتك القادمة.")}</p></section></div><aside class="rail"><section class="portfolio-panel"><span class="eyebrow">${t("YOUR PROFESSIONAL ORBIT", "مدارك المهني")}</span><div class="profile-top"><span class="profile-avatar">${initials()}</span><button class="small-icon" data-action="edit-profile" aria-label="${t("Edit portfolio", "تعديل الملف المهني")}">${icon("edit")}</button></div><h2>${esc(name())}</h2><span class="subject-label">${subject(teacher.subject)} · ${teacher.experience} ${t("years", "سنوات")}</span><p>${esc(bio())}</p><div class="profile-progress"><strong>${pc}%</strong><div><i style="width:${pc}%"></i></div></div><small class="portfolio-hint">${t("Add your story, qualifications, location and CV link.", "أضف نبذتك ومؤهلاتك وموقعك ورابط سيرتك الذاتية.")}</small><button class="button primary" data-action="edit-profile">${t("Build my portfolio", "ابنِ ملفي المهني")}${icon("arrow")}</button><span class="credential-note">${t("Qualifications are self-reported, not verified.", "المؤهلات معلنة ذاتيًا وغير موثقة.")}</span></section><section class="next-steps"><span class="eyebrow">${t("YOUR NEXT SMALL STEPS", "خطواتك الصغيرة القادمة")}</span><h2>${t("Make your work visible.", "خلّي شغلك يُشاهد.")}</h2><button data-action="create"><span>01</span><div><b>${t("Give your class a home", "امنح صفك مساحة")}</b><small>${t("Create a private channel", "أنشئ قناة خاصة")}</small></div>${icon("arrow")}</button><button data-action="compose"><span>02</span><div><b>${t("Share a teaching moment", "شارك لحظة تعليمية")}</b><small>${t("Post a short video or lesson", "انشر فيديو قصيرًا أو شرحًا")}</small></div>${icon("arrow")}</button><button data-action="edit-profile"><span>03</span><div><b>${t("Tell your professional story", "احكِ قصتك المهنية")}</b><small>${t("Complete your portfolio", "أكمل ملفك المهني")}</small></div>${icon("arrow")}</button></section><section class="plus-panel"><span>✧ ORBIT PLUS</span><h3>${t("Bigger ideas.<br>More room.", "أفكار أكبر.<br>ومساحة أوسع.")}</h3><p>${t("Longer videos and more teaching tools. Preview the proposed plan.", "فيديوهات أطول وأدوات تعليم أكثر. شاهد تصور الاشتراك.")}</p><button class="text-link" data-action="premium">${t("Explore the plan", "استكشف الخطة")} ↗</button></section></aside></div><footer><span>ORBIT · ${t("Teach. Connect. Grow.", "علّم. تواصل. تطوّر.")}</span><span>${t("Local prototype · content and videos stay in this browser.", "نموذج محلي · المحتوى والفيديوهات تُحفظ في هذا المتصفح.")}</span></footer></main></div></div><dialog id="studio-dialog"></dialog>`;
  filterContent();
}
function filterContent() {
  document.querySelectorAll("[data-channel]").forEach((el) => {
    if (el.classList.contains("channel-card"))
      el.hidden = channelFilter !== "all" && el.dataset.privacy !== channelFilter;
  });
  if ($("channels-empty"))
    $("channels-empty").hidden = [...document.querySelectorAll(".channel-card")].some(
      (el) => !el.hidden,
    );
  let count = 0;
  document.querySelectorAll(".post-row").forEach((el) => {
    el.hidden =
      (libraryFilter !== "all" && el.dataset.kind !== libraryFilter) ||
      (search && !el.textContent.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    if (!el.hidden) count++;
  });
  $("library-empty").hidden = count !== 0;
}
function modal(html) {
  $("studio-dialog").innerHTML =
    `<button class="dialog-close" data-action="close" aria-label="${t("Close", "إغلاق")}">×</button>${html}`;
  $("studio-dialog").showModal();
  $("studio-dialog").querySelector("input,textarea,select")?.focus();
}
function field(key, title, value = "", type = "text", required = false) {
  return `<label class="form-field">${title}<input name="${key}" type="${type}" value="${esc(value)}" ${required ? "required" : ""} maxlength="${key === "cv" ? 600 : 150}"></label>`;
}
const subjectOptions = (current) =>
  Object.keys(subjects)
    .map((k) => `<option value="${k}" ${k === current ? "selected" : ""}>${subject(k)}</option>`)
    .join("");
function openMediaDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("orbit-media-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("videos");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
async function saveMedia(id, file) {
  const database = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("videos", "readwrite");
    tx.objectStore("videos").put(file, id);
    tx.oncomplete = () => {
      database.close();
      resolve();
    };
    tx.onerror = () => {
      database.close();
      reject(tx.error);
    };
  });
}
async function getMedia(id) {
  const database = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("videos"),
      req = tx.objectStore("videos").get(id);
    req.onsuccess = () => {
      database.close();
      resolve(req.result);
    };
    req.onerror = () => {
      database.close();
      reject(req.error);
    };
  });
}
function videoDuration(src) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const timer = setTimeout(() => finish(new Error("metadata")), 8000);
    const finish = (error) => {
      clearTimeout(timer);
      const duration = video.duration;
      video.removeAttribute("src");
      video.load();
      if (error || !Number.isFinite(duration)) reject(error || new Error("metadata"));
      else resolve(duration);
    };
    video.onloadedmetadata = () => finish();
    video.onerror = () => finish(new Error("metadata"));
    video.src = src;
  });
}
function profileDialog() {
  location.href = "../account-profile/account-profile.html";
}
function createDialog() {
  modal(
    `<span class="eyebrow">${t("A NEW SPACE TO LEARN", "مساحة جديدة للتعلم")}</span><h2>${t("Create your next channel.", "أنشئ قناتك القادمة.")}</h2><form id="channel-form">${field("name", t("Channel name", "اسم القناة"), "", "text", true)}<label class="form-field">${t("Description", "الوصف")}<textarea name="description" rows="2" maxlength="350" required></textarea></label><div class="form-grid"><label class="form-field">${t("Subject", "المادة")}<select name="subject">${subjectOptions(teacher.subject)}</select></label><label class="form-field">${t("Visibility", "الخصوصية")}<select name="visibility"><option value="public">${t("Public", "عامة")}</option><option value="private">${t("Private classroom", "صف خاص")}</option></select></label></div><p class="form-note">${t("Public channels display your teaching to students and schools. Private channels use an invitation code.", "القنوات العامة تعرض تعليمك للطلاب والمدارس. القنوات الخاصة تستخدم كود دعوة.")}</p><button class="button primary">${t("Create channel", "أنشئ القناة")}${icon("arrow")}</button></form>`,
  );
  $("channel-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData(e.target),
      id =
        "c" + Date.now().toString(36) + crypto.getRandomValues(new Uint16Array(1))[0].toString(36),
      channelName = form.get("name").trim(),
      description = form.get("description").trim();
    if (!channelName || !description) return;
    let code;
    do {
      code =
        "ORB" +
        crypto
          .getRandomValues(new Uint32Array(1))[0]
          .toString(36)
          .toUpperCase()
          .padStart(6, "0")
          .slice(0, 6);
    } while (owned().some((c) => c.code === code));
    const c = {
      id,
      en: channelName,
      ar: channelName,
      descEn: description,
      descAr: description,
      subject: form.get("subject"),
      teacher:
        read("orbitUser")?.email === "teacher@orbit.com" ? "khaled" : read("orbitUser")?.email,
      private: form.get("visibility") === "private",
      code,
      symbol: "✧",
      color: form.get("visibility") === "private" ? "blue" : "purple",
      createdAt: new Date().toISOString(),
    };
    c.schoolId = OrbitSubscriptions.effective().schoolId || null;
    try {
      OrbitSubscriptions.perform(
        c.private ? "classes" : null,
        () => {
          const next = { ...db, channels: [...db.channels, c] };
          localStorage.setItem("orbit.channels.v2", JSON.stringify(next));
          db = next;
        },
        "class:" + c.id,
      );
    } catch (error) {
      if (error.message !== "SUBSCRIPTION_BLOCKED")
        notify(t("Could not save channel.", "تعذر حفظ القناة."));
      return;
    }
    $("studio-dialog").close();
    channelFilter = "all";
    render();
    modal(
      `<span class="success-icon">${icon("check")}</span><h2>${t("Your new orbit is ready.", "مدارك الجديد جاهز.")}</h2><p>${label(c)}</p>${c.private ? `<label class="form-field">${t("Share this classroom code", "شارك كود الصف")}<input id="new-code" value="${esc(c.code)}" readonly dir="ltr"></label><button class="button subtle" data-action="copy" data-channel="${c.id}">${icon("copy")}${t("Copy code", "انسخ الكود")}</button>` : `<p class="form-note">${t("This is a public teaching channel.", "هذه قناة تعليمية عامة.")}</p>`}<a class="button primary" href="${route("channel", "?id=" + c.id)}">${t("Open channel", "افتح القناة")}${icon("arrow")}</a>`,
    );
    notify(t("Channel created.", "تم إنشاء القناة."));
  });
}
function composeDialog(selected) {
  modal(
    `<span class="eyebrow">${t("YOUR NEXT TEACHING MOMENT", "لحظتك التعليمية القادمة")}</span><h2>${t("Share something worth learning.", "شارك شيئًا يستحق التعلم.")}</h2><form id="post-form"><div class="form-grid"><label class="form-field">${t("Channel", "القناة")}<select name="channel">${owned()
      .map(
        (c) =>
          `<option value="${esc(c.id)}" ${selected === c.id ? "selected" : ""}>${label(c)} · ${c.private ? t("Private", "خاصة") : t("Public", "عامة")}</option>`,
      )
      .join(
        "",
      )}</select></label><label class="form-field">${t("Content type", "نوع المحتوى")}<select id="post-type" name="type">${["lesson", "video", "assignment", "discussion", "announcement"].map((k) => `<option value="${k}">${kind(k)}</option>`).join("")}</select></label></div>${field("title", t("Title", "العنوان"), "", "text", true)}<label class="form-field">${t("Your explanation / instructions", "شرحك / التعليمات")}<textarea name="body" rows="4" maxlength="3000" required></textarea></label><div id="video-fields" hidden><label class="upload-zone">${icon("video")}<b>${t("Choose a short video", "اختر فيديو قصيرًا")}</b><small>${t("MP4 / WebM · up to 3 min and 50 MB in this demo", "MP4 / WebM · حتى 3 دقائق و50 MB في النموذج")}</small><input name="videoFile" type="file" accept="video/mp4,video/webm"></label>${field("url", t("Or a direct HTTPS video URL", "أو رابط فيديو HTTPS مباشر"), "", "url")}<p class="form-note">${t("Uploaded files stay in this browser. They are not hosted online.", "الملفات المرفوعة تبقى في هذا المتصفح. لا يتم استضافتها على الإنترنت.")}</p></div><div id="assignment-fields" hidden>${field("dueDate", t("Due date (optional)", "موعد التسليم (اختياري)"), "", "date")}</div><p class="form-error" role="status"></p><div class="form-actions"><span>${t("Publish to your local prototype", "نشر في النموذج المحلي")}</span><button class="button primary">${t("Publish post", "انشر المنشور")}${icon("arrow")}</button></div></form>`,
  );
  $("post-type").addEventListener("change", (e) => {
    $("video-fields").hidden = e.target.value !== "video";
    $("assignment-fields").hidden = e.target.value !== "assignment";
  });
  const form = $("post-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form),
      type = data.get("type"),
      file = data.get("videoFile"),
      url = data.get("url").trim(),
      button =
        form.querySelector('button[type="submit"]') || form.querySelector(".form-actions button"),
      error = form.querySelector(".form-error");
    button.disabled = true;
    error.textContent = "";
    let videoAsset = "",
      duration = 0;
    try {
      if (type === "video") {
        if (file && file.size) {
          if (file.size > 50 * 1024 * 1024)
            throw Error(
              t("Demo videos must be under 50 MB.", "الفيديو التجريبي يجب ألا يتجاوز 50 MB."),
            );
          if (!["video/mp4", "video/webm"].includes(file.type))
            throw Error(t("Choose an MP4 or WebM video.", "اختر فيديو MP4 أو WebM."));
          const objectURL = URL.createObjectURL(file);
          try {
            duration = await videoDuration(objectURL);
          } catch {
            throw Error(
              t(
                "Could not read this video. Try another MP4 or WebM.",
                "تعذّر قراءة الفيديو. جرّب ملف MP4 أو WebM آخر.",
              ),
            );
          } finally {
            URL.revokeObjectURL(objectURL);
          }
        } else {
          if (!/^https:\/\//i.test(url))
            throw Error(
              t(
                "Choose a video file or a direct HTTPS video link.",
                "اختر ملف فيديو أو رابط فيديو HTTPS مباشر.",
              ),
            );
          try {
            duration = await videoDuration(url);
          } catch {
            throw Error(
              t(
                "Cannot read the linked video. Upload a local file instead.",
                "تعذّر قراءة رابط الفيديو. ارفع ملفًا محليًا بدلًا منه.",
              ),
            );
          }
        }
        if (duration > 180)
          throw Error(
            t(
              "This demo allows videos up to 3 minutes. Longer videos belong to the proposed Plus plan; payment is not active.",
              "هذا النموذج يسمح بفيديو حتى 3 دقائق. الفيديو الأطول ضمن تصور Plus؛ الدفع غير مفعّل.",
            ),
          );
        if (file && file.size) {
          videoAsset = "media-" + crypto.randomUUID();
          try {
            await saveMedia(videoAsset, file);
          } catch {
            throw Error(
              t(
                "Video storage failed. Check browser storage and try again.",
                "تعذّر تخزين الفيديو. تحقق من مساحة المتصفح وحاول مجددًا.",
              ),
            );
          }
        }
      }
      const row = {
        id:
          "p" +
          Date.now().toString(36) +
          crypto.getRandomValues(new Uint16Array(1))[0].toString(36),
        channel: data.get("channel"),
        type,
        title: data.get("title").trim(),
        body: data.get("body").trim(),
        url: type === "video" && !videoAsset ? url : "",
        videoAsset,
        duration,
        dueDate: type === "assignment" ? data.get("dueDate") : "",
        createdAt: new Date().toISOString(),
        likes: 0,
      };
      db.posts.unshift(row);
      persist();
      $("studio-dialog").close();
      libraryFilter = "all";
      search = "";
      render();
      notify(t("Your post is now connected to its channel.", "منشورك صار مربوطًا بقناته."));
    } catch (err) {
      error.textContent = err.message;
    } finally {
      button.disabled = false;
    }
  });
}
function premiumDialog() {
  location.href = "../pricing/pricing.html";
}
async function previewVideo(id) {
  const post = posts().find((p) => p.id === id);
  modal(
    `<h2>${postTitle(post)}</h2><video id="video-preview" controls preload="metadata" ${post.url ? `src="${esc(post.url)}"` : ""}></video><p class="form-note" id="video-error"></p>`,
  );
  if (post.videoAsset) {
    try {
      const blob = await getMedia(post.videoAsset);
      if (!blob) throw Error("missing");
      const objectURL = URL.createObjectURL(blob),
        video = $("video-preview");
      video.src = objectURL;
      const clean = () => URL.revokeObjectURL(objectURL);
      $("studio-dialog").addEventListener("close", clean, { once: true });
    } catch {
      $("video-error").textContent = t(
        "This video is not stored in this browser.",
        "الفيديو غير مخزن في هذا المتصفح.",
      );
    }
  }
}
document.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-action]");
  if (button) {
    const action = button.dataset.action;
    if (action === "create") createDialog();
    if (action === "compose") composeDialog(button.dataset.channel);
    if (action === "edit-profile") profileDialog();
    if (action === "premium") premiumDialog();
    if (action === "preview-video") previewVideo(button.dataset.post);
    if (action === "close") {
      $("studio-dialog").querySelector("video")?.pause();
      $("studio-dialog").close();
    }
    if (action === "copy") {
      const c = channel(button.dataset.channel);
      try {
        await navigator.clipboard.writeText(c.code);
        notify(t("Classroom code copied.", "تم نسخ كود الصف."));
      } catch {
        modal(
          `<h2>${t("Your classroom code", "كود صفك")}</h2><label class="form-field">${t("Select and copy", "حدد وانسخ")}<input value="${esc(c.code)}" readonly dir="ltr"></label>`,
        );
        $("studio-dialog").querySelector("input").select();
      }
    }
    if (action === "student-view") {
      db.role = "student";
      persist();
    }
    if (["language", "theme", "mood"].includes(action)) {
      if (action === "language") prefs.lang = prefs.lang === "ar" ? "en" : "ar";
      if (action === "theme") prefs.theme = prefs.theme === "dark" ? "light" : "dark";
      if (action === "mood") prefs.mood = prefs.mood === "calm" ? "fun" : "calm";
      store.set("orbit.student.v1", JSON.stringify(prefs));
      store.set("orbitLanguage", prefs.lang);
      store.set("orbitTheme", prefs.theme);
      store.set("orbitMood", prefs.mood);
      render();
    }
  }
  const cf = e.target.closest("[data-channel-filter]");
  if (cf) {
    channelFilter = cf.dataset.channelFilter;
    document
      .querySelectorAll("[data-channel-filter]")
      .forEach((el) => el.classList.toggle("selected", el === cf));
    filterContent();
  }
  const pf = e.target.closest("[data-post-filter]");
  if (pf) {
    libraryFilter = pf.dataset.postFilter;
    document
      .querySelectorAll("[data-post-filter]")
      .forEach((el) => el.classList.toggle("selected", el === pf));
    filterContent();
  }
  if (e.target.closest(".assignment-nav")) {
    libraryFilter = "assignment";
    document
      .querySelectorAll("[data-post-filter]")
      .forEach((el) => el.classList.toggle("selected", el.dataset.postFilter === "assignment"));
    filterContent();
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "library-search") {
    search = e.target.value;
    filterContent();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $("studio-dialog")?.querySelector("video")?.pause();
});
render();

window.addEventListener("orbit:profile-change", () => {
  teacher = OrbitProfiles.current();
  if (!document.querySelector("dialog[open]")) render();
});

document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-edit-content]");
  if (!button) return;
  const p = posts().find((p) => p.id === button.dataset.editContent);
  if (!p || !ORBIT.own(channel(p.channel))) return;
  try {
    if (p.sample && !db.posts.some((x) => x.id === p.id)) {
      const live = ORBIT.db();
      live.posts.push({
        ...p,
        title: p.title || t(p.titleEn, p.titleAr),
        body: p.body || t(p.bodyEn, p.bodyAr),
      });
      ORBIT.set("orbit.channels.v2", live);
    }
    ORBIT.editor(p.channel, p.id, () => {
      render();
      notify(t("Content updated.", "تم تحديث المحتوى."));
    });
  } catch {
    notify(
      t(
        "Could not open content. Check browser storage.",
        "تعذر فتح المحتوى. تحقق من تخزين المتصفح.",
      ),
    );
  }
});
window.addEventListener("storage", (e) => {
  if (
    ["orbit.channels.v2", "orbit.memberships.v3"].includes(e.key) &&
    !document.querySelector("dialog[open]")
  )
    render();
});
