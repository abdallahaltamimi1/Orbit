(() => {
  "use strict";
  const KEY = "orbit.subscriptions.v1",
    ORGS = "orbit.school.members.v1";
  const config = window.OrbitPlanConfig;
  const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const current = () => window.OrbitAuth?.current() || {};
  const canonical = (id) =>
    id === "khaled"
      ? "teacher@orbit.com"
      : String(id || "")
          .trim()
          .toLowerCase();
  const t = (en, ar) => (document.documentElement.lang === "en" ? en : ar);
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const db = () => read(KEY, { schema: 1, records: {}, personal: {} });
  const organizations = () => read(ORGS, { schema: 1, schools: {} });
  function period(now = new Date()) {
    // UTC calendar months; login never moves the usage boundary.
    return {
      start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
      end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
    };
  }
  function ensure(user = current(), now = new Date()) {
    if (!user.email || !["teacher", "school"].includes(user.role)) return null;
    const data = db(),
      id = canonical(user.email),
      p = period(now);
    let record = data.records[id];
    if (!record) {
      const school = user.role === "school",
        planId = school ? "school-starter" : "teacher-free",
        plan = config.plans[planId];
      record = {
        id,
        accountType: user.role,
        planId,
        status: school ? "trialing" : "active",
        startDate: now.toISOString(),
        endDate: null,
        trialExpiration: school ? new Date(+now + plan.trialDays * 86400000).toISOString() : null,
        usage: {},
        usagePeriodStart: p.start,
        usagePeriodEnd: p.end,
        events: [],
        limits: { ...plan.limits },
        source: "local-prototype",
      };
      data.records[id] = record;
    }
    if (
      !Number.isFinite(Date.parse(record.usagePeriodEnd)) ||
      +now >= Date.parse(record.usagePeriodEnd)
    ) {
      record.usage = {};
      record.events = [];
      record.usagePeriodStart = p.start;
      record.usagePeriodEnd = p.end;
    }
    if (
      record.status === "trialing" &&
      (!record.trialExpiration || +now >= Date.parse(record.trialExpiration))
    )
      record.status = "expired";
    if (
      record.planId !== "teacher-free" &&
      record.status === "active" &&
      (!record.endDate || +now >= Date.parse(record.endDate))
    )
      record.status = "expired";
    record.limits = { ...config.plans[record.planId]?.limits };
    write(KEY, data);
    return record;
  }
  function effective(user = current(), now = new Date()) {
    if (!user.email) return { user, visitor: true, allowed: false };
    if (!["teacher", "school"].includes(user.role))
      return { user, student: user.role === "student", allowed: user.role === "student" };
    const orgs = organizations(),
      personal = db().personal || {};
    let schoolId = user.role === "school" ? canonical(user.email) : null,
      member = null;
    if (user.role === "teacher" && !personal[canonical(user.email)]) {
      for (const [id, org] of Object.entries(orgs.schools)) {
        const found = (org.teachers || []).find(
          (m) => m.id === canonical(user.email) && m.status === "active",
        );
        if (found) {
          schoolId = id;
          member = found;
          break;
        }
      }
    }
    const record = ensure(schoolId ? { email: schoolId, role: "school" } : user, now),
      plan = config.plans[record?.planId];
    return {
      user,
      schoolId,
      member,
      record,
      plan,
      allowed: !!plan && ["active", "trialing"].includes(record.status),
      scopeId: record?.id,
      permissions: member?.permissions || ["publish", "classes", "labs", "reports", "planning"],
    };
  }
  function scopedChannels(context) {
    const channels =
      window.ORBIT?.channels?.() || read("orbit.channels.v2", { channels: [] }).channels || [];
    const teachers = new Set(
      (organizations().schools[context.schoolId]?.teachers || [])
        .filter((m) => m.status === "active")
        .map((m) => m.id),
    );
    return channels.filter((c) =>
      context.schoolId
        ? c.schoolId === context.schoolId || (!c.schoolId && teachers.has(canonical(c.teacher)))
        : !c.schoolId && canonical(c.teacher) === canonical(context.user.email),
    );
  }
  function usage(resource, context = effective(), channelId = "") {
    const memberships = read("orbit.memberships.v3", {}),
      org = organizations().schools[context.schoolId] || { teachers: [], students: [] };
    if (resource === "classes") return scopedChannels(context).filter((c) => c.private).length;
    if (resource === "teachers")
      return (org.teachers || []).filter((m) => m.status === "active").length;
    if (resource === "studentsPerClass") {
      const count = (id) =>
        Object.entries(memberships).filter(
          ([email, list]) => email !== "guest" && list.includes(id),
        ).length;
      return channelId
        ? count(channelId)
        : Math.max(
            0,
            ...scopedChannels(context)
              .filter((c) => c.private)
              .map((c) => count(c.id)),
          );
    }
    if (resource === "students") {
      const classIds = new Set(
        scopedChannels(context)
          .filter((c) => c.private)
          .map((c) => c.id),
      );
      return new Set([
        ...(org.students || []),
        ...Object.entries(memberships)
          .filter(([id, list]) => id !== "guest" && list.some((c) => classIds.has(c)))
          .map(([id]) => id),
      ]).size;
    }
    const record = context.record;
    if (!record) return 0;
    const events = new Set(
      (record.events || []).filter((e) => e.resource === resource).map((e) => e.id),
    );
    const since = Date.parse(record.usagePeriodStart),
      until = Date.parse(record.usagePeriodEnd),
      classIds = new Set(scopedChannels(context).map((c) => c.id));
    const posts = read("orbit.channels.v2", { posts: [] }).posts || [];
    if (resource === "lessons" || resource === "assignments")
      for (const post of posts) {
        if (
          post.type !== (resource === "lessons" ? "lesson" : "assignment") ||
          !classIds.has(post.channel) ||
          Date.parse(post.createdAt) < since ||
          Date.parse(post.createdAt) >= until ||
          !Number.isFinite(Date.parse(post.createdAt))
        )
          continue;
        if (post.schoolId && post.schoolId !== context.schoolId) continue;
        events.add("post:" + post.id + ":" + resource);
      }
    return Math.max(events.size, Number(record.usage?.[resource]) || 0);
  }
  const permissionFor = (resource) =>
    ({
      lessons: "publish",
      assignments: "publish",
      classes: "classes",
      studentsPerClass: "classes",
      labs: "labs",
      advancedReports: "reports",
      basicReports: "reports",
      publishing: "publish",
      planning: "planning",
      productivity: "planning",
    })[resource];
  function check(resource, options = {}) {
    const context = options.context || effective(),
      used = usage(resource, context, options.channelId),
      limit = context.plan?.limits[resource];
    let reason = "";
    if (context.visitor) reason = "login";
    else if (
      !["teacher", "school"].includes(current().role) ||
      context.user.role !== current().role ||
      context.user.email !== current().email
    )
      reason = "role";
    else if (!context.allowed) reason = "expired";
    else if (permissionFor(resource) && !context.permissions.includes(permissionFor(resource)))
      reason = "permission";
    else if (resource in (context.plan?.features || {}) && !context.plan.features[resource])
      reason = "feature";
    else if (limit !== undefined && limit !== null && used + (options.delta ?? 1) > limit)
      reason = "limit";
    return {
      allowed: !reason,
      reason,
      resource,
      used,
      limit,
      context,
      resetDate: config.monthlyResources.includes(resource) ? context.record?.usagePeriodEnd : null,
    };
  }
  function canJoinClass(channelId) {
    const user = current();
    if (user.role !== "student" || !user.email) return false;
    const channel = (
      window.ORBIT?.channels?.() || read("orbit.channels.v2", { channels: [] }).channels
    ).find((c) => c.id === channelId);
    if (!channel || !channel.private) return !!channel;
    const context = effective({
      email: channel.teacher === "khaled" ? "teacher@orbit.com" : channel.teacher,
      role: "teacher",
    });
    let allowed = context.allowed && context.permissions.includes("classes");
    const classLimit = context.plan?.limits.studentsPerClass;
    if (classLimit != null && usage("studentsPerClass", context, channelId) + 1 > classLimit)
      allowed = false;
    const already =
      context.schoolId &&
      (organizations().schools[context.schoolId]?.students?.includes(user.email) ||
        Object.entries(read("orbit.memberships.v3", {})).some(
          ([email, list]) =>
            email === user.email &&
            list.some((cid) => scopedChannels(context).some((c) => c.private && c.id === cid)),
        ));
    const schoolLimit = context.plan?.limits.students;
    if (
      context.schoolId &&
      schoolLimit != null &&
      usage("students", context) + (already ? 0 : 1) > schoolLimit
    )
      allowed = false;
    if (!allowed)
      modal(
        t("Class unavailable", "الشعبة غير متاحة"),
        `<p>${t("Contact the teacher. Class capacity or access must be reviewed.", "تواصل مع المعلم لمراجعة سعة الشعبة وصلاحيتها.")}</p>`,
      );
    return allowed;
  }
  function modal(title, body) {
    document.getElementById("orbit-access-dialog")?.remove();
    const dialog = document.createElement("dialog");
    dialog.id = "orbit-access-dialog";
    dialog.className = "orbit-access-dialog";
    dialog.innerHTML = `<button type="button" class="orbit-dialog-close" aria-label="${t("Close", "إغلاق")}">×</button><span class="orbit-access-mark" aria-hidden="true">✧</span><h2>${escape(title)}</h2>${body}`;
    (document.getElementById("orbit-page") || document.body).append(dialog);
    dialog.querySelector(".orbit-dialog-close").onclick = () => dialog.close();
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.showModal();
    return dialog;
  }
  const knownRoutes = new Set([
    "admin",
    "hompage",
    "lessons",
    "lesson",
    "lab",
    "car-lab",
    "channels",
    "channel",
    "teacher-directory",
    "teacher-profile",
    "lesson-planner",
    "exchange",
    "pricing",
    "school-dashboard",
    "teacher-dashboard",
    "student-dashboard",
    "applications",
    "jobs",
    "practice",
    "quiz",
    "account-profile",
    "notifications",
    "settings",
    "achievements",
  ]);
  function safeNext(value) {
    try {
      const url = new URL(value, location.href),
        parts = url.pathname.split("/").filter(Boolean);
      return url.origin === location.origin &&
        knownRoutes.has(parts[0]) &&
        parts[1] === parts[0] + ".html"
        ? url.pathname + url.search + url.hash
        : null;
    } catch {
      return null;
    }
  }
  function remember(value = location.pathname + location.search + location.hash) {
    const next = safeNext(value);
    if (next) sessionStorage.setItem("orbit.auth.next", next);
    return next;
  }
  function requireAccount(role) {
    const user = current();
    if (user.email && (!role || user.role === role)) return true;
    if (user.email) {
      modal(
        t("Choose the appropriate workspace", "اختر مساحة العمل المناسبة"),
        `<p>${t("This action needs a " + role + " account. Public previews remain available.", "هذا الإجراء يحتاج حساب " + ({ teacher: "معلم", student: "طالب", school: "مدرسة" }[role] || "مناسب") + ". المعاينة العامة متاحة.")}</p><a class="orbit-access-button" href="../hompage/hompage.html">${t("Return home", "العودة للرئيسية")}</a>`,
      );
      return false;
    }
    const next = remember(),
      query = next ? "?next=" + encodeURIComponent(next) : "";
    modal(
      t("Continue your learning orbit", "كمل مدارك التعليمي"),
      `<p>${t("You can keep exploring. Sign in to save, join or publish.", "يمكنك متابعة الاستكشاف. سجّل الدخول للحفظ أو الانضمام أو النشر.")}</p><div class="orbit-access-actions"><a class="orbit-access-button" href="../login/login.html${query}">${t("Log in", "تسجيل الدخول")}</a><a class="orbit-access-button secondary" href="../registration/registration.html${query}${role ? (query ? "&" : "?") + "role=" + role : ""}">${t("Sign up", "إنشاء حساب")}</a><button class="orbit-access-button secondary" data-access-back type="button">${t("Keep exploring", "متابعة الاستكشاف")}</button></div>`,
    ).querySelector("[data-access-back]").onclick = () =>
      document.getElementById("orbit-access-dialog")?.close();
    return false;
  }
  function showUpgrade(result) {
    if (current().role === "student") {
      const dialog = modal(
        t("Teacher or school feature", "ميزة للمعلم أو المدرسة"),
        `<p>${t("This operation is available to teachers and schools.", "هذا الإجراء متاح للمعلمين والمدارس.")}</p><button type="button" class="orbit-access-button" data-access-back>${t("Return", "العودة")}</button>`,
      );
      dialog.querySelector("[data-access-back]").onclick = () => dialog.close();
      return;
    }
    if (result.reason === "login") {
      requireAccount();
      return;
    }
    const names = {
      lessons: t("Published lessons", "الدروس المنشورة"),
      labs: t("Lab sessions", "جلسات المختبر"),
      assignments: t("Assignments", "الواجبات"),
      classes: t("Classes", "الصفوف"),
      students: t("School students", "طلاب المدرسة"),
      teachers: t("School teachers", "معلمو المدرسة"),
      studentsPerClass: t("Students in this class", "طلاب هذا الصف"),
      advancedReports: t("Advanced reports", "التقارير المتقدمة"),
      productivity: t("Planning tools", "أدوات التحضير"),
      recruitment: t("School recruitment", "توظيف المدرسة"),
    };
    const message =
      result.reason === "expired"
        ? t(
            "Your school trial or subscription has expired. Public previews are still available.",
            "انتهت الفترة التجريبية أو الاشتراك. المعاينات العامة ما زالت متاحة.",
          )
        : result.reason === "permission"
          ? t(
              "Your school administrator has not enabled this action for your account.",
              "مسؤول المدرسة لم يمنح حسابك صلاحية هذا الإجراء.",
            )
          : result.reason === "role"
            ? t(
                "This operation requires the appropriate account role.",
                "هذا الإجراء يحتاج نوع حساب مناسب.",
              )
            : t(
                "Your current plan does not include more of this feature.",
                "خطتك الحالية لا تتيح استخدامًا إضافيًا لهذه الميزة.",
              );
    const date = result.resetDate
      ? new Date(result.resetDate).toLocaleDateString(
          document.documentElement.lang === "en" ? "en-GB" : "ar-JO",
          { timeZone: "Asia/Amman" },
        )
      : "";
    const dialog = modal(
      names[result.resource] || t("Subscription plans", "خطط الاشتراك"),
      `<p>${message}</p>${result.limit !== undefined && result.limit !== null ? `<p class="orbit-usage-number">${result.used} / ${result.limit} ${t("used", "مستخدم")}</p>` : ""}${date ? `<p>${t("Next monthly reset: ", "موعد تجديد الاستخدام: ")}${escape(date)}</p>` : ""}<div class="orbit-access-actions"><a class="orbit-access-button" href="../pricing/pricing.html">${t("Explore plans", "استكشف الخطط")}</a><button type="button" class="orbit-access-button secondary" data-access-back>${t("Return", "العودة")}</button></div>`,
    );
    dialog.querySelector("[data-access-back]").onclick = () => dialog.close();
  }
  function allow(resource, options = {}) {
    const result = check(resource, options);
    if (!result.allowed) showUpgrade(result);
    return result.allowed;
  }
  function perform(resource, callback, eventId, options = {}) {
    const prior = eventId && effective().record?.events?.some((e) => e.id === eventId);
    const result = resource
      ? check(resource, { ...options, delta: prior ? 0 : options.delta })
      : { allowed: requireAccount("teacher"), context: effective() };
    if (!result.allowed) {
      if (resource) showUpgrade(result);
      const error = Error("SUBSCRIPTION_BLOCKED");
      error.detail = result;
      throw error;
    }
    const value = callback();
    if (value && typeof value.then === "function") throw Error("SYNC_COMMIT_REQUIRED");
    if (resource && config.monthlyResources.includes(resource)) {
      const data = db(),
        record = data.records[result.context.scopeId],
        id = eventId || crypto.randomUUID();
      if (!record.events.some((event) => event.id === id)) {
        record.events.push({ id, resource, at: new Date().toISOString() });
        record.usage[resource] = (record.usage[resource] || 0) + 1;
        write(KEY, data);
      }
    }
    window.dispatchEvent(new Event("orbit:subscription-change"));
    return value;
  }
  function labStart(callback) {
    const user = current();
    if (!user.email || user.role === "student" || user.role === "admin") {
      callback();
      return true;
    }
    const context = effective(),
      sessionKey = "orbit.lab.session." + context.scopeId,
      session = readSession(sessionKey);
    if (
      session &&
      session.expires > Date.now() &&
      session.period === context.record.usagePeriodStart
    ) {
      const permission = check("labs", { delta: 0 });
      if (!permission.allowed) {
        showUpgrade(permission);
        return false;
      }
      callback();
      return true;
    }
    if (!allow("labs")) return false;
    try {
      const id = crypto.randomUUID();
      perform("labs", callback, "lab:" + id);
      sessionStorage.setItem(
        sessionKey,
        JSON.stringify({
          id,
          expires: Date.now() + config.labSessionMinutes * 60000,
          period: context.record.usagePeriodStart,
        }),
      );
      return true;
    } catch (error) {
      if (error.message !== "SUBSCRIPTION_BLOCKED")
        modal(
          t("Could not start", "تعذر بدء التجربة"),
          `<p>${t("Check browser storage and try again.", "تحقق من التخزين وحاول مجددًا.")}</p>`,
        );
      return false;
    }
  }
  function readSession(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key));
    } catch {
      return null;
    }
  }
  function knownUser(id, role) {
    return (
      id === role + "@orbit.com" ||
      (window.OrbitRecruitment?.data().accounts || []).some(
        (a) => a.email === id && a.role === role,
      )
    );
  }
  function addMember(
    role,
    email,
    permissions = ["publish", "classes", "labs", "reports", "planning"],
  ) {
    const user = current();
    if (user.role !== "school") throw Error("ROLE_DENIED");
    const id = canonical(email);
    if (!knownUser(id, role)) throw Error("ACCOUNT_NOT_FOUND");
    const data = organizations(),
      schoolId = canonical(user.email),
      org = data.schools[schoolId] || { teachers: [], students: [] };
    const exists =
      role === "teacher"
        ? org.teachers.some((m) => m.id === id && m.status === "active")
        : org.students.includes(id);
    if (exists) throw Error("MEMBER_EXISTS");
    if (
      role === "teacher" &&
      Object.entries(data.schools).some(
        ([sid, o]) =>
          sid !== schoolId && o.teachers.some((m) => m.id === id && m.status === "active"),
      )
    )
      throw Error("ALREADY_IN_SCHOOL");
    return perform(
      role === "teacher" ? "teachers" : "students",
      () => {
        if (role === "teacher")
          org.teachers = [
            ...org.teachers.filter((m) => m.id !== id),
            {
              id,
              status: "active",
              permissions: permissions.filter((p) =>
                ["publish", "classes", "labs", "reports", "planning"].includes(p),
              ),
              joinedAt: new Date().toISOString(),
            },
          ];
        else org.students.push(id);
        data.schools[schoolId] = org;
        write(ORGS, data);
        return id;
      },
      "member:" + id,
    );
  }
  function removeMember(role, email) {
    const user = current();
    if (user.role !== "school") throw Error("ROLE_DENIED");
    const data = organizations(),
      org = data.schools[canonical(user.email)];
    if (!org) return;
    const id = canonical(email);
    if (role === "teacher") {
      const member = org.teachers.find((m) => m.id === id);
      if (member) member.status = "removed";
    } else org.students = org.students.filter((s) => s !== id);
    write(ORGS, data);
    window.dispatchEvent(new Event("orbit:subscription-change"));
  }
  function personalPlan(enabled) {
    if (current().role !== "teacher") throw Error("ROLE_DENIED");
    const data = db();
    data.personal[canonical(current().email)] = enabled === true;
    write(KEY, data);
    window.dispatchEvent(new Event("orbit:subscription-change"));
  }
  function nextDestination(user = current()) {
    const value =
        new URLSearchParams(location.search).get("next") ||
        sessionStorage.getItem("orbit.auth.next"),
      next = safeNext(value);
    if (!next) return null;
    const folder = next.split("/")[1];
    const restricted = {
      "admin": "admin",
      "school-dashboard": "school",
      "teacher-dashboard": "teacher",
      applications: "teacher",
      "student-dashboard": "student",
      "account-profile": user.role,
    };
    if (restricted[folder] && restricted[folder] !== user.role) return null;
    sessionStorage.removeItem("orbit.auth.next");
    return next;
  }
  async function refreshEntitlements() {
    const endpoint = window.OrbitConfig?.subscriptionEndpoint;
    if (!endpoint || !current().email) return false;
    const response = await fetch(endpoint, {
      credentials: "include",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error("ENTITLEMENTS_UNAVAILABLE");
    const record = await response.json();
    if (
      !record ||
      !config.plans[record.planId] ||
      record.id !== effective().scopeId ||
      record.accountType !== config.plans[record.planId].accountType ||
      !["active", "expired", "cancelled", "trialing"].includes(record.status)
    )
      throw Error("INVALID_ENTITLEMENTS");
    const data = db(),
      previous = data.records[record.id];
    data.records[record.id] = {
      ...previous,
      ...record,
      events: record.events || previous?.events || [],
      source: "server",
    };
    write(KEY, data);
    window.dispatchEvent(new Event("orbit:subscription-change"));
    return true;
  }
  const intent = new URLSearchParams(location.search).get("next");
  if (intent) remember(intent);
  document.addEventListener("DOMContentLoaded", () => {
    if (!/\/(login|school-login|registration|school-registration)\//.test(location.pathname))
      return;
    const next = safeNext(sessionStorage.getItem("orbit.auth.next"));
    if (next)
      document.querySelectorAll("a[href]").forEach((a) => {
        if (
          /\/(login|school-login|registration|school-registration)\//.test(a.getAttribute("href"))
        ) {
          const url = new URL(a.href);
          url.searchParams.set("next", next);
          a.href = url.href;
        }
      });
  });
  const api = {
    canJoinClass,
    config,
    period,
    ensure,
    effective,
    usage,
    check,
    allow,
    perform,
    labStart,
    organizations,
    scopedChannels,
    addMember,
    removeMember,
    personalPlan,
    requireAccount,
    showUpgrade,
    modal,
    remember,
    safeNext,
    nextDestination,
    refreshEntitlements,
    t,
    escape,
  };
  window.OrbitSubscriptions = api;
  for (const name of ["registerAccount", "registerSchool"]) {
    const original = OrbitRecruitment[name];
    OrbitRecruitment[name] = async (...args) => {
      const result = await original(...args);
      ensure(result);
      return result;
    };
  }
  const start = OrbitAuth.startSession;
  OrbitAuth.startSession = (user) => {
    start(user);
    ensure(user);
  };
  for (const [method, feature] of [
    ["putJob", "recruitment"],
    ["setJobStatus", "recruitment"],
    ["updateApplication", "recruitment"],
    ["interest", "recruitment"],
  ]) {
    const original = OrbitRecruitment[method];
    OrbitRecruitment[method] = (...args) => {
      if (current().role === "school" && !allow(feature)) throw Error("SUBSCRIPTION_BLOCKED");
      if (method === "putJob" && !args[1])
        return perform("jobs", () => original(...args), "job:" + crypto.randomUUID());
      return original(...args);
    };
  }
})();
