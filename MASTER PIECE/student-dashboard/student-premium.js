/* Student-only presentation adapter. Data and access checks remain in existing services. */
(() => {
  "use strict";
  const A = window.OrbitAuth;
  if (A?.current()?.role !== "student") return;
  const t = (en, ar) => (document.documentElement.lang === "ar" ? ar : en),
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
      );
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${OrbitDashboardIcons[name] || OrbitDashboardIcons["book-open"]}</svg>`;
  const $ = (id) => document.getElementById(id),
    locale = () => (document.documentElement.lang === "ar" ? "ar-JO" : "en-GB");
  let currentForm,
    railNav,
    dayOffset = 0,
    queued = false,
    observer;
  const modelNames = () => ({
    motion: t("Motion and constant speed", "الحركة والسرعة الثابتة"),
    newton: t("Newton’s second law", "قانون نيوتن الثاني"),
    ohm: t("Ohm’s law", "قانون أوم"),
  });
  const learning = () => A.get("orbit.learning." + A.current().email, {});
  const date = (value, options = { dateStyle: "medium" }) =>
    Number.isFinite(Date.parse(value))
      ? new Intl.DateTimeFormat(locale(), { timeZone: "Asia/Amman", ...options }).format(
          new Date(value),
        )
      : t("Date not recorded", "التاريخ غير مسجّل");
  function dayKey(value) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Amman",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(value));
    return ["year", "month", "day"].map((k) => parts.find((p) => p.type === k).value).join("-");
  }
  function sectionEmpty(en, ar) {
    return `<p class="premium-empty">${t(en, ar)}</p>`;
  }
  function recommendations() {
    const host = $("premium-recommendations-grid");
    if (!host) return;
    const records = learning(),
      names = modelNames();
    const ids = ["newton", "motion", "ohm"].sort(
      (a, b) =>
        Number(Boolean(records["experiment:" + a]?.completedAt)) -
        Number(Boolean(records["experiment:" + b]?.completedAt)),
    );
    host.innerHTML = ids
      .map((id) => {
        const url = "../school-tour/school-tour.html?experiment=" + id + "#science-lab",
          saved = records["bookmark:" + id]?.saved;
        return `<article class="premium-learning-card"><a href="${url}"><div class="premium-thumbnail"><img src="./assets/experiment-${id}.png" width="640" height="360" loading="lazy" alt="${esc(names[id])}" onerror="this.onerror=null;this.src='../school-tour/assets/campus-preview.png'"><span class="premium-open">${icon("arrow-right")}</span></div><h3>${esc(names[id])}</h3><p>${t("Physics · Interactive experiment", "الفيزياء · تجربة تفاعلية")}</p></a><button class="premium-bookmark" data-premium-save="${id}" aria-label="${t(saved ? "Remove bookmark" : "Save experiment", saved ? "إزالة من المحفوظات" : "احفظ التجربة")}" aria-pressed="${Boolean(saved)}">${icon("bookmark")}</button></article>`;
      })
      .join("");
    const saved = Object.entries(records).filter(
      ([key, r]) => key.startsWith("bookmark:") && r?.saved && names[r.experiment],
    );
    if ($("student-bookmarks"))
      $("student-bookmarks").innerHTML =
        `<h3>${t("Saved experiments", "تجاربك المحفوظة")}</h3>${saved.map(([, r]) => `<p><a href="../school-tour/school-tour.html?experiment=${r.experiment}#science-lab">${names[r.experiment]}</a></p>`).join("") || sectionEmpty("Save an experiment to return to it later.", "احفظ تجربة لحتى ترجع إلها بعدين.")}`;
  }
  function plan() {
    const host = $("premium-plan-items");
    if (!host) return;
    const selected = Date.now() + dayOffset * 86400000,
      key = dayKey(selected);
    $("premium-plan-date").textContent = date(new Date(selected).toISOString(), {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    $("student-plan").querySelector("h2").innerHTML =
      icon("calendar-days") +
      t(
        dayOffset === 0 ? "Today’s plan" : "Your schedule",
        dayOffset === 0 ? "خطة اليوم" : "جدولك",
      );
    const meetings = (window.OrbitMeetings?.visible() || [])
      .filter((m) => m.status !== "cancelled" && dayKey(m.startAt) === key)
      .map((m) => ({
        title: m.title,
        when: Date.parse(m.startAt),
        time: date(m.startAt, { hour: "2-digit", minute: "2-digit" }),
        detail:
          {
            live: t("In progress", "جارٍ الآن"),
            upcoming: t("Upcoming", "قادم"),
            completed: t("Ended", "انتهى"),
          }[OrbitMeetings.status(m)] +
          " · " +
          m.teacherName,
        url: "../meetings/meeting.html?id=" + encodeURIComponent(m.id),
        icon: "users",
      }));
    const assignments = (window.OrbitAssignments?.visible() || [])
      .filter((p) => p.dueDate?.slice(0, 10) === key)
      .map((p) => {
        const record = OrbitAssignments.records(p.id).find(
          (r) => r.studentId === A.current().email,
        );
        return {
          title: p.title || p.titleAr || p.titleEn,
          time: t("Due", "التسليم"),
          when: Date.parse(p.dueDate),
          detail: record ? t("Submitted", "تم التسليم") : t("Not submitted", "لم يُسلّم"),
          url: "#assignments-section",
          icon: "clipboard-list",
        };
      });
    const items = [...meetings, ...assignments].sort((a, b) => a.when - b.when);
    host.innerHTML =
      items
        .slice(0, 5)
        .map(
          (item) =>
            `<a class="premium-plan-row" href="${esc(item.url)}"><time>${esc(item.time)}</time>${icon(item.icon)}<span><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span></a>`,
        )
        .join("") ||
      sectionEmpty(
        "No scheduled activities for this day. Explore a lesson at your own pace.",
        "ما في مواعيد مسجّلة لهاليوم. خذ درس على راحتك.",
      );
  }
  function recent() {
    const host = $("premium-recent-items");
    if (!host) return;
    const names = modelNames(),
      records = learning();
    const events = Object.values(records)
      .filter((r) => r?.type === "experiment" && r.completedAt && names[r.experiment])
      .map((r) => ({
        title: names[r.experiment],
        time: r.completedAt,
        detail: t("Experiment completed", "تجربة مكتملة"),
        url: "../school-tour/school-tour.html?experiment=" + r.experiment + "#science-lab",
        icon: "flask-conical",
      }));
    const done = A.get("orbit.student.v1", {}).done || [],
      labels = {
        lesson: t("Newton’s laws lesson", "درس قوانين نيوتن"),
        practice: t("Force calculation practice", "تدريب حساب القوى"),
        quiz: t("Forces quiz", "اختبار القوى"),
        lab: t("Force and acceleration", "القوة والتسارع"),
      },
      routes = { lesson: "lesson", practice: "practice", quiz: "quiz", lab: "car-lab" };
    done
      .filter((id) => labels[id] && !(id === "lab" && records["experiment:newton"]))
      .forEach((id) =>
        events.push({
          title: labels[id],
          detail: t("Completed · saved progress", "مكتمل · تقدم محفوظ"),
          time: null,
          url: "../" + routes[id] + "/" + routes[id] + ".html",
          icon: "circle-check",
        }),
      );
    events.sort((a, b) => (Date.parse(b.time) || 0) - (Date.parse(a.time) || 0));
    host.innerHTML =
      events
        .slice(0, 4)
        .map(
          (item) =>
            `<a class="premium-recent-row" href="${esc(item.url)}">${icon(item.icon)}<span>${esc(item.title)}<small>${esc(item.detail)}</small></span>${item.time ? `<time>${date(item.time, { day: "numeric", month: "short" })}</time>` : ""}</a>`,
        )
        .join("") ||
      sectionEmpty(
        "Your completed lessons, practice and experiments will appear here. Your first step starts today.",
        "دروسك وتدريباتك وتجاربك المكتملة رح تظهر هون. أول خطوة بتبدأ منك.",
      );
  }
  function meeting() {
    const host = $("premium-meeting-card"),
      M = window.OrbitMeetings;
    if (!host || !M) return;
    const meetings = M.visible().filter((m) => M.status(m) !== "cancelled"),
      next = meetings
        .filter((m) => ["upcoming", "live"].includes(M.status(m)))
        .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))[0];
    if (!next) {
      host.innerHTML = sectionEmpty(
        "No meetings assigned to your account yet.",
        "لسّه ما في اجتماعات مخصّصة لحسابك.",
      );
      return;
    }
    const status = M.status(next),
      statusName = {
        upcoming: t("Upcoming", "قادم"),
        live: t("In progress", "جارٍ الآن"),
        completed: t("Ended", "انتهى"),
      };
    $("premium-next-meeting").querySelector("h2").innerHTML =
      icon("video") +
      t(
        status === "completed" ? "Latest meeting" : "Upcoming meetings",
        status === "completed" ? "آخر اجتماع" : "الاجتماعات القادمة",
      );
    const duration = Math.round((Date.parse(next.endAt) - Date.parse(next.startAt)) / 60000);
    host.innerHTML = `<article class="premium-next-card"><span class="premium-meeting-state">${statusName[status]}</span><h3>${esc(next.title)}</h3><p>${icon("user-round")} ${esc(next.teacherName)}</p><p>${esc(date(next.startAt, { dateStyle: "medium", timeStyle: "short" }))} · ${duration} ${t("min", "دقيقة")}</p><p>${esc(next.channelName)}</p><div class="premium-meeting-actions"><button data-meeting-details="${esc(next.id)}">${t("Details", "التفاصيل")}</button>${status === "live" ? `<a href="../meetings/meeting.html?id=${encodeURIComponent(next.id)}">${t("Join meeting", "انضم للاجتماع")}</a>` : ""}</div></article>`;
  }
  function notifications() {
    const host = $("premium-notification-list");
    if (!host) return;
    const items = [
      ...(window.OrbitMeetings?.notifications() || []).map((n) => ({ ...n, service: "meeting" })),
      ...(window.OrbitAssignments?.notifications() || []).map((n) => ({
        ...n,
        service: "assignment",
      })),
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const count = items.filter((n) => !n.read).length,
      badge = $("premium-unread");
    badge.hidden = !count;
    badge.textContent = count > 99 ? "99+" : count;
    host.innerHTML =
      `<strong>${t("Your notifications", "إشعاراتك")}</strong>` +
      (items
        .slice(0, 12)
        .map(
          (n) =>
            `<div class="premium-notification"><p>${esc(n[document.documentElement.lang === "en" ? "en" : "ar"] || n.en || n.ar || "")}</p>${!n.read ? `<button data-premium-read="${esc(n.id)}" data-notification-service="${n.service}">${t("Mark read", "تمت القراءة")}</button>` : ""}</div>`,
        )
        .join("") || sectionEmpty("You’re all caught up.", "ما في إشعارات جديدة."));
  }
  function nav() {
    /* Navigation is owned by the shared portal shell. */
  }
  function mount() {
    nav();
    const form = $("student-search-form");
    if (!form || form === currentForm) return;
    currentForm = form;
    recommendations();
    plan();
    recent();
    meeting();
    notifications();
    window.OrbitStudentOverview?.refresh();
  }
  document.addEventListener("click", (event) => {
    const day = event.target.closest("[data-plan-day]");
    if (day) {
      dayOffset += Number(day.dataset.planDay);
      plan();
    }
    const mood = event.target.closest("[data-premium-mood]");
    if (mood) {
      student.mood = student.mood === "calm" ? "fun" : "calm";
      save();
      render();
    }
    const bookmark = event.target.closest("[data-premium-save]");
    if (bookmark) {
      const id = bookmark.dataset.premiumSave;
      if (!modelNames()[id]) return;
      try {
        const records = learning(),
          key = "bookmark:" + id;
        records[key] = {
          ...(records[key] || {}),
          type: "bookmark",
          experiment: id,
          saved: !records[key]?.saved,
        };
        A.set("orbit.learning." + A.current().email, records);
        recommendations();
      } catch {
        const toast = $("toast");
        toast.textContent = t(
          "Could not save. Check browser storage.",
          "تعذّر الحفظ. افحص مساحة تخزين المتصفح.",
        );
        toast.classList.add("visible");
      }
    }
    const read = event.target.closest("[data-premium-read]");
    if (read) {
      (read.dataset.notificationService === "meeting" ? OrbitMeetings : OrbitAssignments).markRead(
        read.dataset.premiumRead,
      );
      notifications();
    }
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor) {
      if (anchor.closest("#orbit-rail")) {
        document.body.classList.remove("orbit-menu-open");
        $("orbit-page").inert = false;
        $("orbit-mobile-toggle")?.setAttribute("aria-expanded", "false");
      }
      const id = anchor.getAttribute("href").slice(1),
        target = $(id);
      let ancestor = target?.parentElement;
      while (ancestor) {
        if (ancestor.tagName === "DETAILS") ancestor.open = true;
        ancestor = ancestor.parentElement;
      }
    }
    if (!event.target.closest(".student-discovery"))
      $("student-search-results")?.setAttribute("hidden", "");
    const menu = document.querySelector(".premium-notifications[open]");
    if (menu && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("student-search")?.focus();
    }
    if (event.key === "Escape") {
      $("student-search-results")?.setAttribute("hidden", "");
      const menu = document.querySelector(".premium-notifications[open]");
      if (menu) {
        menu.open = false;
        menu.querySelector("summary").focus();
      }
    }
  });
  ["orbit:meetings-change", "orbit:assignments-change"].forEach((name) =>
    window.addEventListener(name, () => {
      plan();
      meeting();
      notifications();
    }),
  );
  window.addEventListener("storage", (event) => {
    if (event.key === "orbit.learning." + A.current()?.email) {
      recommendations();
      recent();
    }
    if (
      [
        "orbit.meetings.v1",
        "orbit.assignments.v1",
        "orbit.channels.v2",
        "orbit.memberships.v3",
      ].includes(event.key)
    ) {
      plan();
      meeting();
      notifications();
    }
  });
  observer = new MutationObserver((records) => {
    if (
      !records.some(
        (r) =>
          r.target.id === "app" ||
          r.target.id === "orbit-rail" ||
          [...r.addedNodes].some((n) => n.id === "orbit-rail"),
      )
    )
      return;
    if (!queued) {
      queued = true;
      queueMicrotask(() => {
        queued = false;
        mount();
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", mount, { once: true });
  mount();
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) observer.disconnect();
  });
})();
