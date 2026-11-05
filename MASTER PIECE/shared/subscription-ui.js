(() => {
  "use strict";
  const S = OrbitSubscriptions,
    { t, escape: esc } = S;
  const labels = {
    lessons: ["Lessons / month", "دروس / شهر"],
    labs: ["Lab sessions / month", "جلسات مختبر / شهر"],
    assignments: ["Assignments / month", "واجبات / شهر"],
    classes: ["Classes", "صفوف"],
    studentsPerClass: ["Students / class", "طلاب / صف"],
    teachers: ["School teachers", "معلمو المدرسة"],
    students: ["School students", "طلاب المدرسة"],
    jobs: ["Job posts / month", "وظائف / شهر"],
  };
  const label = (id) => (labels[id] ? t(...labels[id]) : id);
  const date = (value) =>
    value
      ? new Date(value).toLocaleDateString(
          document.documentElement.lang === "en" ? "en-GB" : "ar-JO",
          { timeZone: "Asia/Amman" },
        )
      : "—";
  function usageMarkup(context = S.effective()) {
    if (!["teacher", "school"].includes(OrbitAuth.current()?.role) || !context.record) return "";
    const schoolMetrics = new Set(["jobs"]),
      metrics = Object.entries(context.plan.limits).filter(
        ([key]) => context.user.role !== "school" || schoolMetrics.has(key),
      );
    return `<div class="orbit-usage-grid">${metrics
      .map(
        ([key, limit]) =>
          `<div><small>${label(key)}</small><strong dir="ltr">${S.usage(key, context)} / ${limit === null ? t("Unlimited", "غير محدود") : limit}</strong></div>`,
      )
      .join(
        "",
      )}</div><p>${t("Monthly reset: ", "تجديد الاستخدام الشهري: ")}${date(context.record.usagePeriodEnd)}</p>`;
  }
  function report(context) {
    const classes = S.scopedChannels(context).filter((c) => c.private),
      membership = OrbitAuth.get("orbit.memberships.v3", {}),
      students = [
        ...new Set(
          Object.entries(membership)
            .filter(
              ([id, list]) => id !== "guest" && list.some((id) => classes.some((c) => c.id === id)),
            )
            .map(([id]) => id),
        ),
      ];
    const rows = students.map((id) => {
      const state = OrbitAuth.get("orbit.student.state." + id, {}),
        learning = OrbitAuth.get("orbit.learning." + id, {});
      return {
        name: OrbitProfiles.read(id, "student")?.name || id,
        classes: classes
          .filter((c) => (membership[id] || []).includes(c.id))
          .map((c) => c.ar || c.en)
          .join("، "),
        completed: (state.done || []).length,
        understood: Object.values(learning).filter((l) => l.understood).length,
        correct: Object.values(learning).reduce((n, l) => n + (l.correct || []).length, 0),
      };
    });
    const advanced = () => {
      if (!S.allow("advancedReports")) return;
      const dialog = S.modal(
        t("Advanced progress report", "تقرير التقدم المتقدم"),
        `<p>${t("Saved activity in this browser only. Missing data is not a completion claim.", "نشاط محفوظ في هذا المتصفح فقط. عدم توفر البيانات لا يعني إكمال الدروس.")}</p><div class="orbit-table-scroll"><table><thead><tr>${[t("Student", "الطالب"), t("Classes", "الصفوف"), t("Completed activities", "أنشطة مكتملة"), t("Explanations understood", "شروحات مفهومة"), t("Correct answers", "إجابات صحيحة")].map((v) => `<th>${v}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.classes)}</td><td>${r.completed}</td><td>${r.understood}</td><td>${r.correct}</td></tr>`).join("") || `<tr><td colspan="5">${t("No saved student activity yet.", "لا يوجد نشاط طلاب محفوظ بعد.")}</td></tr>`}</tbody></table></div>`,
      );
    };
    return {
      count: students.length,
      completed: rows.reduce((n, r) => n + r.completed, 0),
      understood: rows.reduce((n, r) => n + r.understood, 0),
      advanced,
    };
  }
  function bindPanel(panel) {
    if (!["teacher", "school"].includes(OrbitAuth.current()?.role)) {
      panel.remove();
      return;
    }
    const context = S.effective();
    panel.innerHTML = `<header><div><span class="orbit-plan-pill">${esc(context.plan?.name || "")}</span><h2>${t("Your subscription & usage", "اشتراكك واستخدامك")}</h2></div><a class="orbit-access-button secondary" href="../pricing/pricing.html">${t("View plans", "عرض الخطط")}</a></header><p>${context.allowed ? (context.record.status === "trialing" ? t("School trial ends: ", "تنتهي تجربة المدرسة: ") + date(context.record.trialExpiration) : t("Current plan is available.", "الخطة الحالية متاحة.")) : t("Subscription expired. Public previews remain available.", "انتهى الاشتراك. المعاينات العامة متاحة.")}${context.schoolId && context.user.role === "teacher" ? ` · ${t("Included through your school", "مشمول من خلال مدرستك")}` : ""}</p>${usageMarkup(context)}<div class="orbit-access-actions"><button type="button" class="orbit-access-button secondary" data-progress-report>${t("Advanced progress report", "تقرير تقدم متقدم")}</button>${context.user.role === "teacher" ? `<a class="orbit-access-button secondary" href="../lesson-planner/lesson-planner.html">${t("Lesson planning", "تحضير الدروس")}</a>` : ""}</div><p class="orbit-local-note">${t("Billing is unavailable here, so no payment is taken or paid plan activated. Plan access is stored in this browser.", "الدفع غير متاح هنا، لذلك لن تُخصم رسوم ولن تُفعّل خطة مدفوعة. تُحفظ صلاحيات الخطة في هذا المتصفح.")}</p>`;
    const progress = report(context);
    panel.querySelector("[data-progress-report]").onclick = progress.advanced;
    panel.insertAdjacentHTML(
      "beforeend",
      `<p>${t("Basic overview: ", "نظرة عامة أساسية: ")}${S.check("basicReports").allowed ? progress.count : "—"} ${t("students in your classes", "طالب في صفوفك")}${S.check("basicReports").allowed ? " · " + progress.completed + " " + t("completed activities", "أنشطة مكتملة") + " · " + progress.understood + " " + t("explanations understood", "شروحات مفهومة") : ""}</p>`,
    );
    if (context.user.role === "school") schoolMembers(panel, context);
  }
  function schoolMembers(panel, context) {
    const org = S.organizations().schools[context.schoolId] || { teachers: [], students: [] };
    const members = document.createElement("section");
    members.className = "orbit-school-members";
    members.innerHTML = `<h3>${t("Your school team", "فريق مدرستك")}</h3><p>${t("Add an existing account to this school on this device. This does not send an invitation or verify membership.", "أضف حسابًا مسجلًا إلى المدرسة على هذا الجهاز. لا يرسل ذلك دعوة ولا يتحقق من العضوية.")}</p><form id="orbit-school-member-form"><label>${t("Account type", "نوع الحساب")}<select name="role"><option value="teacher">${t("Teacher", "معلم")}</option><option value="student">${t("Student", "طالب")}</option></select></label><label>${t("Registered account email", "بريد الحساب المسجل")}<input type="email" name="email" required autocomplete="off"></label><fieldset><legend>${t("School teacher permissions", "صلاحيات معلم المدرسة")}</legend>${[
      ["publish", t("Publish", "النشر")],
      ["classes", t("Classes", "الصفوف")],
      ["labs", t("Labs", "المختبر")],
      ["reports", t("Reports", "التقارير")],
      ["planning", t("Planning", "التحضير")],
    ]
      .map(
        ([id, name]) =>
          `<label><input type="checkbox" name="permission" value="${id}" checked> ${name}</label>`,
      )
      .join(
        "",
      )}</fieldset><button class="orbit-access-button">${t("Add to school", "إضافة للمدرسة")}</button><p class="orbit-member-status" role="status"></p></form><ul class="orbit-member-list">${org.teachers
      .filter((m) => m.status === "active")
      .map(
        (m) =>
          `<li><span>${esc(OrbitProfiles.read(m.id, "teacher")?.name || m.id)} · ${t("Teacher", "معلم")}</span><button type="button" class="orbit-access-button secondary" data-remove-teacher="${esc(m.id)}">${t("Remove association", "إزالة الربط")}</button></li>`,
      )
      .join(
        "",
      )}${org.students.map((id) => `<li><span>${esc(OrbitProfiles.read(id, "student")?.name || id)} · ${t("Student", "طالب")}</span><button type="button" class="orbit-access-button secondary" data-remove-student="${esc(id)}">${t("Remove association", "إزالة الربط")}</button></li>`).join("") || (!org.teachers.some((m) => m.status === "active") ? `<li>${t("No associated accounts yet.", "لا توجد حسابات مرتبطة بعد.")}</li>` : "")}</ul>${context.plan.features.schoolStats ? `<details><summary>${t("School-wide usage statistics", "إحصاءات استخدام المدرسة")}</summary>${usageMarkup(context)}</details>` : ""}`;
    panel.append(members);
    const form = members.querySelector("form");
    form.onsubmit = (event) => {
      event.preventDefault();
      const data = new FormData(form),
        status = form.querySelector("[role=status]");
      try {
        S.addMember(data.get("role"), data.get("email"), data.getAll("permission"));
        bindPanel(panel);
      } catch (error) {
        status.textContent =
          {
            ACCOUNT_NOT_FOUND: t(
              "Register this account first, then associate it.",
              "سجّل هذا الحساب أولًا ثم اربطه.",
            ),
            MEMBER_EXISTS: t("This account is already associated.", "هذا الحساب مرتبط بالفعل."),
            ALREADY_IN_SCHOOL: t(
              "This teacher is already associated with another school.",
              "المعلم مرتبط بمدرسة أخرى.",
            ),
            SUBSCRIPTION_BLOCKED: t(
              "The school plan does not allow this operation.",
              "خطة المدرسة لا تسمح بهذا الإجراء.",
            ),
          }[error.message] || t("Could not save. Check storage.", "تعذر الحفظ. تحقق من التخزين.");
      }
    };
    for (const role of ["teacher", "student"])
      members.querySelectorAll("[data-remove-" + role + "]").forEach(
        (button) =>
          (button.onclick = () => {
            try {
              S.removeMember(role, button.getAttribute("data-remove-" + role));
              bindPanel(panel);
            } catch {
              form.querySelector("[role=status]").textContent = t(
                "Could not remove association.",
                "تعذر إزالة الربط.",
              );
            }
          }),
      );
  }
  function mount() {
    const user = OrbitAuth.current();
    if (!user || !["teacher", "school"].includes(user.role)) return;
    if (!/\/(teacher-dashboard|school-dashboard)\//.test(location.pathname)) return;
    const host = document.querySelector("#overview") || document.querySelector("#app main");
    if (!host) return;
    let panel = document.getElementById("orbit-subscription-panel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "orbit-subscription-panel";
      panel.className = "orbit-subscription-panel";
      host.append(panel);
      bindPanel(panel);
    }
  }
  function pricing() {
    const currentUser = OrbitAuth.current();
    if (currentUser?.role === "student") {
      location.replace("../student-dashboard/student-dashboard.html");
      return;
    }
    const planRole = currentUser?.role === "teacher" || currentUser?.role === "school"
        ? currentUser.role
        : "public",
      planEntries = Object.entries(S.config.plans).filter(
        ([, plan]) => planRole === "public" || plan.accountType === planRole,
      );
    const schoolPlanFeatures = (id) =>
      `<li>${t("Receive job applications", "استقبال طلبات التوظيف")}</li><li>${t("Review applicants", "مراجعة المتقدمين")}</li><li>${t("Schedule recruitment interviews", "جدولة مقابلات التوظيف")}</li><li>${t(id === "school-starter" ? "Basic teacher discovery" : "Teacher discovery", id === "school-starter" ? "استكشاف أساسي للمعلمين" : "استكشاف المعلمين")}</li>`,
      schoolPlanLimits = (plan) => Object.entries(plan.limits).filter(([key]) => key === "jobs"),
      planPrice = (id, plan) =>
        id === "teacher-free" || id === "school-starter"
          ? t("Free", "مجاني")
          : plan.trialDays
            ? t(plan.trialDays + "-day trial · pricing coming soon", "تجربة " + plan.trialDays + " يومًا · الأسعار قريبًا")
            : t("Pricing coming soon", "الأسعار قريبًا"),
      planFeatures = (id, plan) =>
        plan.accountType === "school"
          ? schoolPlanFeatures(id)
          : `${plan.features.advancedReports ? `<li>${t("Advanced progress reports", "تقارير تقدم متقدمة")}</li>` : `<li>${t("Basic progress overview", "نظرة عامة على التقدم")}</li>`}${plan.features.productivity ? `<li>${t("Additional planning tools", "أدوات تحضير إضافية")}</li>` : ""}`,
      planLimits = (plan) =>
        (plan.accountType === "school" ? schoolPlanLimits(plan) : Object.entries(plan.limits))
          .map(
            ([key, value]) =>
              `<li><strong>${value === null ? t("Unlimited", "غير محدود") : value}</strong> ${label(key)}</li>`,
          )
          .join("");
    const O = window.ORBIT;
    if (!O) return;
    O.shell(
      t("Plans for your next orbit", "خطط لمدارك القادم"),
      `<section class="hero"><h2>${t("More room to teach. One connected school.", "مساحة أكبر للتعليم. مدرسة مترابطة.")}</h2><p>${t("Browse plans for teachers and schools without an account. Final prices are coming soon.", "استعرض باقات المعلمين والمدارس دون حساب. الأسعار النهائية ستُعلن قريبًا.")}</p></section><div id="orbit-current-plan"></div><div id="orbit-pricing-grid" class="orbit-pricing-grid" data-pricing-role="${planRole}">${planEntries
        .map(
          ([id, plan]) =>
            `<article class="card orbit-plan-card"><span class="orbit-plan-pill">${plan.accountType === "school" ? t("Schools", "المدارس") : t("Teachers", "المعلمون")}</span><h2>${esc(plan.name)}</h2><strong class="orbit-plan-price">${planPrice(id, plan)}</strong><ul>${planLimits(plan)}${planFeatures(id, plan)}</ul><button class="orbit-access-button" data-select-plan="${id}">${id === "teacher-free" ? t("Use Teacher Free", "استخدم Teacher Free") : id === "school-starter" ? t("Use Free School", "استخدم المدرسة المجانية") : plan.trialDays ? t("Explore school trial", "استكشف تجربة المدرسة") : t("View availability", "عرض التوفر")}</button></article>`,
        )
        .join(
          "",
        )}</div><p class="orbit-local-note">${t("Payment is unavailable here. You will not be charged, and this plan will not activate.", "الدفع غير متاح هنا. لن تُخصم رسوم ولن تُفعّل هذه الخطة.")}</p>`,
    );
    const context = S.effective(),
      current = document.getElementById("orbit-current-plan");
    if (context.record) {
      current.className = "orbit-subscription-panel";
      current.innerHTML = `<h2>${t("Current plan: ", "الخطة الحالية: ")}${esc(context.plan.name)}</h2><p>${context.allowed ? (context.record.status === "trialing" ? t("Trial ends: ", "تنتهي التجربة: ") + date(context.record.trialExpiration) : t("Active plan", "خطة نشطة")) : t("Expired · public previews remain available", "منتهية · المعاينات العامة متاحة")}</p>${usageMarkup(context)}`;
      if (context.user.role === "teacher") {
        const org = S.organizations(),
          associated = Object.values(org.schools).some((o) =>
            o.teachers.some((m) => m.id === context.user.email && m.status === "active"),
          );
        if (associated) {
          const separate = !!OrbitAuth.get("orbit.subscriptions.v1", {}).personal?.[
            context.user.email
          ];
          current.insertAdjacentHTML(
            "beforeend",
            `<p>${t("Your school plan is used by default. Choose a separate personal workspace only if you want it.", "تُستخدم خطة مدرستك افتراضيًا. اختر مساحة شخصية منفصلة فقط إن رغبت.")}</p><button class="orbit-access-button secondary" id="personal-plan-choice">${separate ? t("Use my school plan", "استخدام خطة مدرستي") : t("Choose a separate personal plan", "اختيار خطة شخصية منفصلة")}</button>`,
          );
          current.querySelector("button").onclick = () => {
            S.personalPlan(!separate);
            pricing();
          };
        }
      }
    }
    document
      .querySelectorAll("[data-select-plan]")
      .forEach((button) => (button.onclick = () => selectPlan(button.dataset.selectPlan)));
  }
  function selectPlan(id) {
    const plan = S.config.plans[id],
      user = OrbitAuth.current();
    if (!user) {
      S.remember(location.pathname);
      location.href =
        "../registration/registration.html?role=" +
        plan.accountType +
        "&next=" +
        encodeURIComponent(location.pathname);
      return;
    }
    if (user.role !== plan.accountType) {
      S.requireAccount(plan.accountType);
      return;
    }
    if (id === "teacher-free") {
      S.modal(
        t("Teacher Free", "Teacher Free"),
        `<p>${t("Your free workspace is available within its limits. No payment is required. School coverage stays selected unless you explicitly choose a personal plan.", "مساحتك المجانية متاحة ضمن حدودها دون دفع. تبقى تغطية المدرسة مختارة ما لم تختَر خطة شخصية منفصلة.")}</p><a class="orbit-access-button" href="../teacher-dashboard/teacher-dashboard.html">${t("Open teacher workspace", "افتح مساحة المعلم")}</a>`,
      );
      return;
    }
    if (id === "school-starter") {
      S.modal(
        t("Free School", "المدرسة المجانية"),
        `<p>${t("Publish up to 3 job opportunities per month, receive applications, review applicants, schedule interviews, and discover teachers. Drafts can still be saved after reaching the publishing limit.", "انشر حتى 3 فرص تدريس شهريًا، واستقبل الطلبات وراجعها، وجدول المقابلات، واستكشف المعلمين. يمكنك حفظ المسودات بعد بلوغ حد النشر.")}</p><a class="orbit-access-button" href="../school-dashboard/school-dashboard.html">${t("Open school workspace", "افتح مساحة المدرسة")}</a>`,
      );
      return;
    }
    const endpoint = OrbitConfig.subscriptionCheckoutEndpoint;
    const dialog = S.modal(
      t("Pricing coming soon", "الأسعار قريبًا"),
      `<p>${t("This paid plan is not activated yet. You have not been charged.", "هذه الخطة المدفوعة غير مفعّلة بعد. لم تُخصم أي رسوم.")}</p>${endpoint && plan.price ? `<button class="orbit-access-button" data-real-checkout>${t("Continue to payment provider", "المتابعة إلى مزود الدفع")}</button><p role="status"></p>` : ""}<a class="orbit-access-button secondary" href="../pricing/pricing.html">${t("Review plans", "راجع الخطط")}</a>`,
    );
    dialog.querySelector("[data-real-checkout]")?.addEventListener("click", async (event) => {
      event.target.disabled = true;
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: id, scopeId: S.effective().scopeId }),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw Error();
        const data = await response.json(),
          url = new URL(data.checkoutUrl);
        if (url.protocol !== "https:") throw Error();
        location.href = url.href;
      } catch {
        dialog.querySelector("[role=status]").textContent = t(
          "Could not open checkout. No subscription was activated.",
          "تعذر فتح الدفع. لم يُفعّل أي اشتراك.",
        );
        event.target.disabled = false;
      }
    });
  }
  window.OrbitSubscriptionUI = { pricing, mount, usageMarkup };
  document.addEventListener("DOMContentLoaded", () => {
    if (location.pathname.includes("/pricing/")) pricing();
    else mount();
    const root = document.getElementById("app") || document.getElementById("teacher-app");
    if (root) new MutationObserver(mount).observe(root, { childList: true, subtree: true });
    window.addEventListener("orbit:subscription-change", () => {
      const panel = document.getElementById("orbit-subscription-panel");
      if (panel)
        queueMicrotask(() => {
          if (panel.isConnected) bindPanel(panel);
        });
    });
  });
})();
