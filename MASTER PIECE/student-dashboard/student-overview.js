/* Actual-data overview; no synthetic progress, attendance or historical backfill. */
(() => {
  const A = window.OrbitAuth;
  if (A?.current()?.role !== "student") return;
  const t = (en, ar) => (document.documentElement.lang === "ar" ? ar : en),
    $ = (id) => document.getElementById(id),
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
      );
  const svg = (n) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${OrbitDashboardIcons[n] || OrbitDashboardIcons["book-open"]}</svg>`;
  const dateKey = (v) => {
    const p = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Amman",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(v));
    return ["year", "month", "day"].map((k) => p.find((x) => x.type === k).value).join("-");
  };
  let observer,
    previousCount = null,
    emptyBefore = false,
    lastReaction = 0;
  function react(message) {
    const image = $("orbit-mascot")?.querySelector("img");
    if ($("orbit-encouragement-copy")) $("orbit-encouragement-copy").textContent = message;
    if (
      !image ||
      document.hidden ||
      document.body.dataset.mood === "calm" ||
      matchMedia("(prefers-reduced-motion:reduce)").matches ||
      Date.now() - lastReaction < 8000
    )
      return;
    lastReaction = Date.now();
    image.getAnimations().forEach((a) => a.cancel());
    image.animate(
      [
        { transform: "translateY(0) rotate(0)" },
        { transform: "translateY(-7px) rotate(-3deg)", offset: 0.45 },
        { transform: "translateY(0) rotate(0)" },
      ],
      { duration: 700, easing: "cubic-bezier(.23,1,.32,1)" },
    );
  }
  function data() {
    const prefs = A.get("orbit.student.v1", {}),
      records = A.get("orbit.learning." + A.current().email, {}),
      entries = Object.values(records).filter((r) => r && r.type !== "bookmark"),
      done = Array.isArray(prefs.done) ? prefs.done : [],
      now = Date.now();
    return { prefs, records, entries, done, now };
  }
  function stats(d) {
    const timed = d.entries.filter(
        (r) => r.completedAt && Number.isFinite(Date.parse(r.completedAt)),
      ),
      days = new Set(timed.map((r) => dateKey(r.completedAt)));
    let streak = null;
    if (days.size) {
      streak = 0;
      let offset = days.has(dateKey(d.now)) ? 0 : 1;
      for (; offset < 3660 && days.has(dateKey(d.now - offset * 86400000)); offset++) streak++;
    }
    const today = new Date(dateKey(d.now) + "T00:00:00Z"),
      day = (today.getUTCDay() + 6) % 7,
      start = new Date(today.getTime() - day * 86400000).toISOString().slice(0, 10),
      end = new Date(today.getTime() + (7 - day) * 86400000).toISOString().slice(0, 10);
    const meetings = (window.OrbitMeetings?.visible() || []).filter(
      (m) => m.status !== "cancelled" && dateKey(m.startAt) >= start && dateKey(m.startAt) < end,
    );
    const unfinished = d.entries.filter(
      (r) =>
        r.type !== "experiment" &&
        !r.completedAt &&
        (r.understood !== undefined || Array.isArray(r.correct)),
    ).length;
    const completedIds = new Set(d.done.includes("lesson") ? ["forces"] : []);
    for (const [key, r] of Object.entries(d.records)) {
      if (r?.type === "lesson" && (r.completedAt || r.completed === true))
        completedIds.add(r.topic || key);
    }
    const completed = completedIds.size;
    const rows = [
      ["book-open", completed, t("Completed Lessons", "دروس مكتملة"), "#progress-section"],
      [
        "play",
        unfinished,
        t("Learning in Progress", "التعلّم قيد التقدم"),
        "#student-saved-learning",
      ],
      [
        "calendar-days",
        meetings.length,
        t("Meetings This Week", "اجتماعات هذا الأسبوع"),
        "#student-plan",
      ],
      [
        "activity",
        streak === null ? "—" : streak,
        t("Recorded learning streak", "سلسلة أيام النشاط المسجّل"),
        "#recent-activity",
      ],
    ];
    $("orbit-real-stats").innerHTML = rows
      .slice(0, 3)
      .map(
        ([icon, value, label, url]) =>
          `<a class="orbit-stat" href="${url}">${svg(icon)}<span><strong>${value}</strong><small>${label}</small></span>${svg("arrow-right")}</a>`,
      )
      .join("");

  }
  function continueLearning(d) {
    const level = ["primary", "secondary", "university"].includes(OrbitProfiles.current()?.level)
      ? OrbitProfiles.current().level
      : "secondary";
    const topic = d.done.includes("lesson") ? "energy" : "forces",
      record = d.records[topic + "-" + level],
      finished = Boolean(record?.completedAt),
      percent = finished ? 100 : null;
    const title =
      topic === "forces"
        ? t("Forces and Newton’s laws", "القوى وقوانين نيوتن")
        : t("Energy and its transformations", "الطاقة وتحولاتها");
    $("current-learning").innerHTML =
      `<header class="premium-section-head"><h2>${t("Continue learning", "متابعة التعلّم")}</h2><a href="../lessons/lessons.html?level=${level}">${t("View all", "عرض الكل")}</a></header><div class="orbit-continue-body"><a class="orbit-lesson-thumbnail" href="../lesson/lesson.html?topic=${topic}&subject=physics&level=${level}"><img src="./assets/experiment-newton.png" width="640" height="360" alt="${t("Physics experiment preview", "معاينة تجربة فيزيائية")}">${svg("play")}</a><div><h3>${title}</h3><p>${t("Physics", "الفيزياء")} · ${esc({ primary: t("Primary", "أساسي"), secondary: t("Secondary", "ثانوي"), university: t("University", "جامعي") }[level])}</p><p class="orbit-progress-note">${record && !finished ? t("Saved learning available · no exact partial percentage recorded", "عندك تعلّم محفوظ · نسبة التقدم الجزئي غير مسجّلة") : t("Your next available lesson", "درسك التالي المتاح")}</p>${percent !== null ? `<div class="orbit-progress-track" role="progressbar" aria-label="${t("Recorded lesson completion", "إكمال الدرس المسجّل")}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>` : ""}<a class="button primary" href="../lesson/lesson.html?topic=${topic}&subject=physics&level=${level}">${t("Continue lesson", "متابعة الدرس")}${svg("play")}</a></div></div>`;
  }
  function goals(d) {
    const course = [
      ["lesson", "Learn Newton’s laws", "تعلّم قوانين نيوتن", "../lesson/lesson.html"],
      ["practice", "Solve a force problem", "حلّ مسألة قوى", "../practice/practice.html"],
      [
        "lab",
        "Run a physics experiment",
        "شغّل تجربة فيزيائية",
        "../school-tour/school-tour.html#science-lab",
      ],
      ["quiz", "Check your understanding", "اختبر فهمك", "../quiz/quiz.html"],
    ];
    const rows = course.map(([id, en, ar, url]) => ({
      name: t(en, ar),
      done: d.done.includes(id),
      url,
    }));
    const count = rows.filter((r) => r.done).length;
    $("student-weekly-goals").innerHTML =
      `<header class="premium-section-head"><h2>${t("Your learning goals", "أهدافك التعليمية")}</h2><b dir="ltr">${count}/${rows.length}</b></header><div class="orbit-progress-track"><span style="width:${(count / rows.length) * 100}%"></span></div><ul class="orbit-goal-list">${rows.map((r) => `<li><a href="${r.url}"><span class="orbit-goal-check ${r.done ? "is-done" : ""}" aria-label="${r.done ? t("Completed", "مكتمل") : t("Pending", "بانتظارك")}">${r.done ? svg("circle-check") : ""}</span>${esc(r.name)}</a></li>`).join("")}</ul>`;
  }
  function subjects(d) {
    const db = A.get("orbit.channels.v2", {}),
      joined = A.get("orbit.memberships.v3", {})[A.current().email] || [],
      channels = (db.channels || []).filter(
        (c) => !c.deleted && (A.managedChannel(c) ? A.schoolChannelStudent(c, A.current().email, null, true) : (!c.private || joined.includes(c.id))),
      );
    const subjects = new Map([
      [
        "physics",
        {
          en: "Physics",
          ar: "الفيزياء",
          url: "../lessons/lessons.html?subject=physics",
          percent: Math.round(
            (["lesson", "practice", "lab", "quiz"].filter((x) => d.done.includes(x)).length / 4) *
              100,
          ),
        },
      ],
    ]);
    const names = {
      math: ["Mathematics", "الرياضيات"],
      chemistry: ["Chemistry", "الكيمياء"],
      biology: ["Biology", "الأحياء"],
      english: ["English", "الإنجليزية"],
    };
    for (const c of channels) {
      if (
        !c.subject ||
        subjects.has(c.subject) ||
        !(db.posts || []).some((p) => p.channel === c.id && p.type === "lesson" && !p.deleted && p.moderationStatus !== "hidden" && (!A.managedChannel(c) || A.schoolChannelStudent(c, A.current().email, p)))
      )
        continue;
      const n = names[c.subject] || [c.subject, c.subject];
      subjects.set(c.subject, {
        en: n[0],
        ar: n[1],
        url: "../channel/channel.html?id=" + encodeURIComponent(c.id),
        percent: null,
      });
    }
    $("student-subjects").innerHTML =
      `<header class="premium-section-head"><h2>${t("Learning subjects", "المواد الدراسية")}</h2><a href="../lessons/lessons.html">${t("View all", "عرض الكل")}</a></header><div class="orbit-subject-grid">${[
        ...subjects.values(),
      ]
        .slice(0, 4)
        .map(
          (s) =>
            `<a href="${s.url}">${svg("book-open")}<strong>${esc(t(s.en, s.ar))}</strong><small>${s.percent === null ? t("Available lessons", "دروس متاحة") : s.percent + "%"}</small>${s.percent !== null ? `<span class="orbit-progress-track"><span style="width:${s.percent}%"></span></span>` : ""}</a>`,
        )
        .join("")}</div>`;
  }
  function refresh() {
    if (!$("orbit-real-stats")) return;
    const d = data();
    stats(d);
    continueLearning(d);
    goals(d);
    subjects(d);
    const n = d.done.length + d.entries.filter((r) => r.completedAt).length;
    if (previousCount !== null && n > previousCount)
      react(t("A real step forward. Keep going!", "خطوة حقيقية لقدّام. كمّل!"));
    previousCount = n;
  }
  window.OrbitStudentOverview = { refresh };
  window.addEventListener("orbit:search-feedback", (event) => {
    if (event.detail.empty && !emptyBefore)
      react(
        t(
          "Try a topic or a shorter search. I’m here to help.",
          "جرّب اسم موضوع أو كلمة أقصر. بنلاقيها مع بعض.",
        ),
      );
    emptyBefore = event.detail.empty;
  });
  window.addEventListener("orbit:meetings-change", refresh);
  window.addEventListener("storage", refresh);
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      refresh();
      const hero = document.querySelector(".futuristic-welcome");
      if (hero) {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              react(t("Your next discovery starts here.", "اكتشافك الجاي بيبدأ هون."));
              observer.disconnect();
            }
          },
          { threshold: 0.4 },
        );
        observer.observe(hero);
      }
    },
    { once: true },
  );
  window.addEventListener("pagehide", () => {
    observer?.disconnect();
    $("orbit-mascot")
      ?.querySelector("img")
      ?.getAnimations()
      .forEach((a) => a.cancel());
  });
})();
