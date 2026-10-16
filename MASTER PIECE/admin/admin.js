(() => {
  "use strict";
  const S = OrbitAdmin,
    A = OrbitAuth,
    app = document.getElementById("admin-app");
  const state = {
    language: A.get("orbit.student.v1", { lang: "ar" }).lang || "ar",
    view: "overview",
    filters: {},
  };
  const t = (en, ar) => (state.language === "ar" ? ar : en);
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const paths = {
    orbit:
      '<ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="3"/>',
    overview:
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    users:
      '<circle cx="9" cy="8" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 4a4 4 0 0 1 0 8M18 15a5 5 0 0 1 4 5"/>',
    students: '<path d="m2 8 10-5 10 5-10 5ZM6 10v7q6 5 12 0v-7M22 8v8"/>',
    teachers:
      '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M7 21h10M12 17v4M7 8h8M7 12h5"/>',
    schools: '<path d="M3 21h18M5 21V8l7-5 7 5v13M10 21v-5h4v5M9 10h1m4 0h1M9 13h1m4 0h1"/>',
    jobs: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M9 7V3h6v4M3 13h18"/>',
    content: '<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3ZM12 6v16"/>',
    labs: '<path d="M9 3h6M10 3v7l-6 10h16l-6-10V3M7 15h10"/>',
    reports: '<path d="M12 3 3 7v6q0 6 9 9 9-3 9-9V7ZM12 8v5M12 17h.01"/>',
    notifications: '<path d="M5 17h14l-2-4V8a5 5 0 0 0-10 0v5ZM10 21h4"/>',
    logs: '<path d="M5 3h14v18H5ZM8 7h8M8 11h8M8 15h5"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    logout: '<path d="M10 4H3v16h7M9 12h12m-5-5 5 5-5 5"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
  };
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.logs}</svg>`;
  const nav = [
    ["overview", "Overview", "نظرة عامة", "command"],
    ["users", "User management", "إدارة المستخدمين", "people"],
    ["students", "Students", "الطلاب", "people"],
    ["teachers", "Teachers", "المعلمون", "people"],
    ["schools", "Schools", "المدارس", "people"],
    ["requests", "School requests", "طلبات المدارس", "people"],
    ["jobs", "Recruitment", "التوظيف والطلبات", "workspace"],
    ["content", "Learning content", "المحتوى التعليمي", "workspace"],
    ["labs", "Labs & activities", "المختبرات والأنشطة", "workspace"],
    ["reports", "Reports & moderation", "التقارير والإشراف", "operations"],
    ["notifications", "Notifications", "الإشعارات", "operations"],
    ["logs", "Activity logs", "سجل الإجراءات", "operations"],
    ["settings", "Settings", "الإعدادات", "operations"],
  ];
  const role = (r) =>
    ({
      student: t("Student", "طالب"),
      teacher: t("Teacher", "معلم"),
      school: t("School", "مدرسة"),
      admin: t("Administrator", "مدير"),
    })[r] || r;
  const statuses = {
    active: ["Active", "نشط"],
    suspended: ["Suspended", "معلّق"],
    deleted: ["Archived", "محذوف الأهلية"],
    pending: ["Pending", "بانتظار المراجعة"],
    approved: ["Approved", "مقبول"],
    rejected: ["Rejected", "مرفوض"],
    draft: ["Draft", "مسودة"],
    published: ["Published", "منشور"],
    closed: ["Closed", "مغلق"],
    visible: ["Visible", "ظاهر"],
    hidden: ["Hidden", "محجوب"],
    resolved: ["Resolved", "عولج"],
    dismissed: ["Dismissed", "أُغلق"],
  };
  const status = (value) => (statuses[value] ? t(...statuses[value]) : value);
  const badge = (value) => `<span class="badge ${esc(value)}">${esc(status(value))}</span>`;
  const date = (value) =>
    value && Number.isFinite(Date.parse(value))
      ? new Date(value).toLocaleString(state.language === "ar" ? "ar-JO" : "en-GB", {
          timeZone: "Asia/Amman",
          dateStyle: "medium",
          timeStyle: "short",
        })
      : t("Not recorded", "غير مسجّل");
  const actionNames = {
    "admin.login": ["Administrator sign-in", "دخول المدير"],
    "profile.updated": ["Profile updated", "تحديث ملف شخصي"],
    "account.active": ["Account activated", "تفعيل حساب"],
    "account.suspended": ["Account suspended", "تعليق حساب"],
    "account.archived": ["Account archived", "حذف أهلية حساب"],
    "school.approved": ["School approved", "قبول مدرسة"],
    "school.rejected": ["School rejected", "رفض مدرسة"],
    "content.hidden": ["Content hidden", "حجب محتوى"],
    "content.visible": ["Content restored", "إظهار محتوى"],
    "settings.updated": ["Settings updated", "تحديث الإعدادات"],
    "notification.read": ["Notification read", "قراءة إشعار"],
    "job.published": ["Job published", "نشر وظيفة"],
    "job.closed": ["Job closed", "إغلاق وظيفة"],
    "job.draft": ["Job draft", "وظيفة مسودة"],
    "report.resolved": ["Report resolved", "معالجة بلاغ"],
    "report.dismissed": ["Report dismissed", "إغلاق بلاغ"],
  };
  const actionLabel = (action) => (actionNames[action] ? t(...actionNames[action]) : action);
  const empty = (title, description) =>
    `<div class="empty-state">${icon("orbit")}<h3>${title}</h3><p>${description}</p></div>`;
  const section = (title, subtitle, body, action = "") =>
    `<section class="panel"><header class="panel-head"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div>${action}</header>${body}</section>`;
  const initials = (name) =>
    esc(
      String(name)
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0])
        .join(""),
    );
  const person = (user) =>
    `<span class="person"><span class="avatar" ${user.photo ? `data-photo="${esc(user.photo)}"` : ""}>${initials(user.name)}</span><span><strong>${esc(user.name)}</strong><small>${esc(user.email)}</small></span></span>`;
  const button = (text, action, id = "", className = "secondary", extra = "") =>
    `<button type="button" class="button ${className}" data-action="${action}" data-id="${esc(id)}" ${extra}>${text}</button>`;
  const table = (head, rows) =>
    `<div class="table-scroll"><table><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
  function toast(message, error = false) {
    const host = document.getElementById("admin-toast");
    host.textContent = message;
    host.className = "show " + (error ? "error" : "");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (host.className = ""), 4000);
  }
  function failure(error) {
    return (
      {
        ADMIN_REQUIRED: t("Administrator access is required.", "تحتاج صلاحية مدير."),
        SELF_PROTECTION: t(
          "You cannot suspend or archive yourself.",
          "لا يمكنك تعليق حسابك أو حذف أهليته.",
        ),
        LAST_ADMIN: t("Keep at least one active administrator.", "يجب إبقاء مدير نشط واحد."),
        PROFILE_CONFLICT: t(
          "Profile changed. Reopen it before editing.",
          "تغيّر الملف. أعد فتحه قبل التعديل.",
        ),
        REQUEST_CONFLICT: t("This request was already reviewed.", "سبق أن تمت مراجعة الطلب."),
        CONFIRMATION_REQUIRED: t("Type the exact email to confirm.", "اكتب البريد نفسه للتأكيد."),
        LOG_OUT_FIRST: t(
          "Sign out of your current account first.",
          "سجّل الخروج من الحساب الحالي أولًا.",
        ),
        STORAGE_DATA_INVALID: t(
          "Stored data is unreadable. No changes were made.",
          "البيانات المخزنة غير قابلة للقراءة. لم يُجرَ تعديل.",
        ),
        ADMIN_ALREADY_EXISTS: t(
          "An administrator exists. Sign in.",
          "يوجد مدير بالفعل. سجّل الدخول.",
        ),
        EMAIL_EXISTS: t("This email is already registered.", "البريد مسجل مسبقًا."),
        LOCAL_SETUP_ONLY: t(
          "Setup is available on localhost only.",
          "الإعداد متاح على localhost فقط.",
        ),
      }[error.message] ||
      t(
        "Could not save. Check fields and browser storage.",
        "تعذر الحفظ. راجع الحقول والتخزين المحلي.",
      )
    );
  }
  function layout() {
    const u = S.guard(),
      title = nav.find((n) => n[0] === state.view),
      unread = S.notifications().filter((n) => !n.read).length;
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === "ar" ? "rtl" : "ltr";
    const groups = [
      ["command", t("COMMAND CENTER", "مركز القيادة")],
      ["people", t("COMMUNITY", "المجتمع")],
      ["workspace", t("LEARNING & WORK", "التعلم والعمل")],
      ["operations", t("OPERATIONS", "العمليات")],
    ];
    app.innerHTML = `<aside class="admin-sidebar" id="admin-sidebar"><a href="#overview" class="admin-brand">${icon("orbit")}<span>ORBIT<small>CONTROL CENTER</small></span></a><div class="workspace-label"><i></i>${esc(S.settings().name)}</div><nav aria-label="${t("Administration navigation", "قائمة الإدارة")}">${groups
      .map(
        ([group, label]) =>
          `<p class="nav-group">${label}</p>${nav
            .filter((n) => n[3] === group)
            .map(
              (n) =>
                `<a href="#${n[0]}" class="nav-link ${state.view === n[0] ? "active" : ""}" ${state.view === n[0] ? 'aria-current="page"' : ""}>${icon(n[0])}<span>${t(n[1], n[2])}</span>${n[0] === "notifications" && unread ? `<b>${unread}</b>` : ""}</a>`,
            )
            .join("")}`,
      )
      .join(
        "",
      )}</nav><div class="sidebar-foot"><span class="avatar">${initials(u.name)}</span><div><strong>${esc(u.name)}</strong><small>${t("Administrator", "مدير المنصة")}</small></div>${button(icon("logout"), "logout", "", "icon-button", `aria-label="${t("Log out", "تسجيل الخروج")}"`)}</div></aside><button class="menu-shade" data-action="close-menu" aria-label="${t("Close navigation", "إغلاق القائمة")}"></button><main class="admin-main"><header class="admin-topbar"><div class="breadcrumbs"><button class="menu-toggle" data-action="menu" aria-label="${t("Open navigation", "فتح القائمة")}" aria-controls="admin-sidebar" aria-expanded="false">☰</button><span>${t("Platform administration", "إدارة المنصة")}</span><b>/</b><strong>${t(title[1], title[2])}</strong></div><div class="topbar-actions">${button(state.language === "ar" ? "EN" : "عربي", "language", "", "icon-button", `aria-label="${t("Switch language", "تغيير اللغة")}"`)}<a href="#notifications" class="notification-link" aria-label="${t("Notifications", "الإشعارات")}">${icon("notifications")}${unread ? "<i></i>" : ""}</a><span class="admin-role">${t("ADMIN", "مدير")}</span></div></header><div class="admin-content"><div class="local-notice">${icon("reports")}<span>${t("LOCAL PROTOTYPE · Browser data only. Server authorization and a shared database are required before production.", "نموذج محلي · بيانات هذا المتصفح فقط. يلزم تحقق صلاحيات وقاعدة بيانات مشتركة على الخادم قبل الإنتاج.")}</span><a href="#settings">${t("Details", "التفاصيل")}</a></div><div class="page-heading"><div><span class="eyebrow">ORBIT / ${state.view.toUpperCase()}</span><h1 tabindex="-1">${t(title[1], title[2])}</h1><p>${t("Actual records. Clear decisions.", "سجلات فعلية، وقرارات واضحة.")}</p></div>${state.view === "overview" ? button(t("Refresh data", "تحديث البيانات"), "refresh") : state.view === "reports" ? button(t("Export account report", "تصدير تقرير الحسابات"), "export") : ""}</div><div id="admin-view"></div><footer class="admin-footer"><span>THE LEARNING ORBIT · CONTROL CENTER</span><span>${t("Last read", "آخر قراءة")}: ${date(new Date().toISOString())}</span></footer></div></main>`;
    const render = AdminUI.views[state.view];
    document.getElementById("admin-view").innerHTML = render();
    if (["users", "students", "teachers", "schools"].includes(state.view))
      AdminUI.renderUsersTable();
    AdminUI.hydratePhotos?.();
  }
  function route() {
    try {
      S.guard();
      state.view = nav.some((n) => n[0] === location.hash.slice(1))
        ? location.hash.slice(1)
        : "overview";
      S.recordSession();
      layout();
    } catch (error) {
      if (error.message === "ADMIN_REQUIRED") AdminUI.gate();
      else
        app.innerHTML = `<main class="access-page"><section class="access-card"><h1>${t("Unable to read stored data", "تعذر قراءة البيانات المخزنة")}</h1><p>${failure(error)}</p><button class="button primary" onclick="location.reload()">${t("Retry", "إعادة المحاولة")}</button></section></main>`;
    }
  }
  window.AdminUI = {
    S,
    A,
    app,
    state,
    t,
    esc,
    icon,
    nav,
    role,
    status,
    badge,
    date,
    actionLabel,
    empty,
    section,
    initials,
    person,
    button,
    table,
    toast,
    failure,
    layout,
    route,
    views: {},
  };
})();
