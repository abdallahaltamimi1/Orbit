(() => {
  "use strict";
  const U = AdminUI,
    {
      S,
      A,
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
      person,
      button,
      table,
    } = U;
  function growthChart(users) {
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - 6 + i);
        return d.toISOString().slice(0, 10);
      }),
      numbers = days.map((d) => users.filter((u) => u.createdAt?.slice(0, 10) === d).length),
      max = Math.max(1, ...numbers),
      points = numbers.map((n, i) => [35 + i * 48, 145 - (n / max) * 95]),
      path = points.map(([x, y], i) => (i ? "L" : "M") + x + " " + y).join(" ");
    return `<div class="growth-chart" role="img" aria-label="${t("Recorded registrations by UTC day", "التسجيلات بحسب اليوم بتوقيت UTC")}: ${numbers.join(", ")}"><svg viewBox="0 0 370 190"><defs><linearGradient id="growth-fill" x2="0" y2="1"><stop stop-color="#4c86ff" stop-opacity=".25"/><stop offset="1" stop-color="#4c86ff" stop-opacity="0"/></linearGradient></defs>${[50, 95, 145].map((y) => `<path d="M25 ${y}H350" stroke="#e9edf5"/>`).join("")}<path d="${path} L323 145 L35 145Z" fill="url(#growth-fill)"/><path d="${path}" fill="none" stroke="#4c86ff" stroke-width="2.5"/>${points.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4" fill="#4c86ff"><title>${days[i]}: ${numbers[i]}</title></circle><text x="${x}" y="174" text-anchor="middle" fill="#8190a8" font-size="8">${days[i].slice(5)}</text>`).join("")}</svg></div>`;
  }
  function engagementChart(values) {
    const labels = [
        t("Completed activities", "أنشطة مكتملة"),
        t("Explanations understood", "شروحات مفهومة"),
        t("Correct practice answers", "إجابات تدريب صحيحة"),
      ],
      max = Math.max(1, ...values);
    return `<div class="engagement-chart">${values.map((n, i) => `<div><span>${labels[i]}</span><strong>${n}</strong><div class="bar-track"><i style="width:${(n / max) * 100}%"></i></div></div>`).join("")}</div><p class="chart-note">${t("Only saved student activity is counted. No live traffic analytics are connected.", "نحسب نشاط الطلاب المحفوظ فقط؛ لا يوجد ربط بتحليلات الزيارات.")}</p>`;
  }
  function logList(events) {
    return events.length
      ? `<ol class="activity-list">${events.map((e) => `<li><span class="activity-dot"></span><div><strong>${esc(actionLabel(e.action))}</strong><small>${esc(e.target)} · ${esc(e.actor || "")}</small></div><time datetime="${esc(e.at)}">${date(e.at)}</time></li>`).join("")}</ol>`
      : empty(
          t("No administrative activity", "لا توجد إجراءات إدارية"),
          t(
            "Actions are recorded when they actually occur.",
            "تُسجّل الإجراءات عند حدوثها الفعلي.",
          ),
        );
  }
  function overview() {
    const s = S.snapshot(),
      recent = [...s.users]
        .filter((u) => u.createdAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
      kpis = [
        [
          s.total,
          t("Registered accounts", "الحسابات المسجلة"),
          "users",
          t("Includes administrators", "يشمل المديرين"),
        ],
        [
          s.active,
          t("Active accounts", "الحسابات النشطة"),
          "students",
          t("Access enabled", "الدخول متاح"),
        ],
        [
          s.pending,
          t("Pending school reviews", "طلبات المدارس المعلقة"),
          "requests",
          t("Review queue", "قائمة المراجعة"),
        ],
        [
          s.jobs,
          t("Published jobs", "الوظائف المنشورة"),
          "jobs",
          t("From registered schools", "من المدارس المسجلة"),
        ],
      ];
    return `<section class="overview-welcome"><div><span class="eyebrow">MISSION CONTROL</span><h2>${t("Every orbit, in one place.", "كل مدار، في مكان واحد.")}</h2><p>${t("Manage your community. Keep learning moving.", "أدر مجتمعك، وحافظ على استمرار التعلم.")}</p></div><div class="welcome-orbit" aria-hidden="true">${icon("orbit")}</div><div class="live-indicator"><i></i>${t("Actual local records", "سجلات محلية فعلية")}</div></section><div class="kpi-grid">${kpis.map(([value, label, name, sub]) => `<article class="kpi"><div><span>${label}</span>${icon(name)}</div><strong>${value.toLocaleString(state.language === "ar" ? "ar-JO" : "en")}</strong><small>${sub}</small></article>`).join("")}</div><div class="role-summary">${[
      ["students", s.students],
      ["teachers", s.teachers],
      ["schools", s.schools],
    ]
      .map(
        ([name, count]) =>
          `<a href="#${name}">${icon(name)}<span>${t(nav.find((n) => n[0] === name)[1], nav.find((n) => n[0] === name)[2])}</span><strong>${count}</strong>${icon("arrow")}</a>`,
      )
      .join(
        "",
      )}<span class="suspension-count">${badge("suspended")} <strong>${s.suspended}</strong></span></div><div class="chart-grid">${section(t("Registration growth", "نمو التسجيل"), t("Last 7 days · recorded dates only", "آخر 7 أيام · التواريخ المسجلة فقط"), growthChart(s.users) + `<p class="chart-note">${t("Legacy accounts without dates", "حسابات قديمة دون تاريخ")}: ${s.unknownDates}</p>`)}${section(t("Learning engagement", "التفاعل التعليمي"), t("Saved progress totals", "إجمالي التقدم المحفوظ"), engagementChart(s.engagement))}</div><div class="overview-columns">${section(t("Recent registrations", "أحدث التسجيلات"), "", recent.length ? table([t("Account", "الحساب"), t("Role", "الدور"), t("Date", "التاريخ")], recent.map((u) => `<tr><td><button class="person-link" data-action="profile" data-id="${esc(u.email)}">${person(u)}</button></td><td>${role(u.role)}</td><td>${date(u.createdAt)}</td></tr>`).join("")) : empty(t("No dated registrations", "لا توجد تسجيلات مؤرخة"), t("Undated accounts remain in the directory.", "الحسابات دون تاريخ متاحة في الدليل.")), `<a class="text-link" href="#users">${t("View all", "عرض الكل")} ↗</a>`)}${section(t("Requires attention", "يحتاج انتباهك"), "", `<a href="#requests" class="attention-row">${icon("requests")}<span>${t("Pending school requests", "طلبات المدارس المعلقة")}</span><b>${s.pending}</b></a><a href="#reports" class="attention-row">${icon("reports")}<span>${t("Open moderation reports", "بلاغات الإشراف المفتوحة")}</span><b>${S.reports().filter((r) => !["resolved", "dismissed"].includes(r.status)).length}</b></a><a href="#users" class="attention-row">${icon("users")}<span>${t("Suspended accounts", "الحسابات المعلقة")}</span><b>${s.suspended}</b></a><p class="chart-note">${t("New schools remain active pending local review. Rejection suspends access.", "تبقى المدرسة الجديدة نشطة أثناء المراجعة المحلية؛ الرفض يعلّق الدخول.")}</p>`)} </div>${section(t("Recent administrative activity", "أحدث إجراءات الإدارة"), "", logList(S.logs().slice(0, 5)), `<a class="text-link" href="#logs">${t("Open audit log", "فتح سجل الإجراءات")} ↗</a>`)}`;
  }
  function getFilter() {
    return (state.filters[state.view] ??= {
      query: "",
      status: "",
      role: { students: "student", teachers: "teacher", schools: "school" }[state.view] || "",
      from: "",
      sort: "newest",
      page: 1,
    });
  }
  function usersView() {
    const f = getFilter();
    return `<section class="panel"><div class="filter-bar"><label class="search-field">${icon("search")}<input data-filter="query" value="${esc(f.query)}" placeholder="${t("Search name or email", "ابحث بالاسم أو البريد")}" aria-label="${t("Search users", "بحث المستخدمين")}"></label>${state.view === "users" ? `<label>${t("Role", "الدور")}<select data-filter="role"><option value="">${t("All roles", "كل الأدوار")}</option>${["student", "teacher", "school", "admin"].map((r) => `<option value="${r}" ${f.role === r ? "selected" : ""}>${role(r)}</option>`).join("")}</select></label>` : ""}<label>${t("Status", "الحالة")}<select data-filter="status"><option value="">${t("All statuses", "كل الحالات")}</option>${["active", "suspended", "deleted"].map((s) => `<option value="${s}" ${f.status === s ? "selected" : ""}>${status(s)}</option>`).join("")}</select></label><label>${t("Registered since", "مسجل منذ")}<input type="date" data-filter="from" value="${esc(f.from)}"></label><label>${t("Sort", "الترتيب")}<select data-filter="sort">${[
      ["newest", t("Newest first", "الأحدث أولًا")],
      ["oldest", t("Oldest first", "الأقدم أولًا")],
      ["name", t("Name A–Z", "الاسم أبجديًا")],
    ]
      .map(
        ([value, label]) =>
          `<option value="${value}" ${f.sort === value ? "selected" : ""}>${label}</option>`,
      )
      .join("")}</select></label></div><div id="user-results"></div></section>`;
  }
  function renderUsersTable() {
    const f = getFilter(),
      rows = S.userRows().filter(
        (u) =>
          (!f.role || u.role === f.role) &&
          (!f.status || u.status === f.status) &&
          (!f.from || (u.createdAt && u.createdAt.slice(0, 10) >= f.from)) &&
          [u.name, u.email].some((s) =>
            s.toLocaleLowerCase().includes(f.query.toLocaleLowerCase()),
          ),
      );
    rows.sort((a, b) =>
      f.sort === "name"
        ? a.name.localeCompare(b.name, state.language)
        : f.sort === "oldest"
          ? (a.createdAt || "9999").localeCompare(b.createdAt || "9999")
          : (b.createdAt || "").localeCompare(a.createdAt || ""),
    );
    const size = S.settings().pageSize || 10,
      pages = Math.max(1, Math.ceil(rows.length / size));
    f.page = Math.min(f.page, pages);
    const shown = rows.slice((f.page - 1) * size, f.page * size);
    document.getElementById("user-results").innerHTML = shown.length
      ? table(
          [
            t("Name & email", "الاسم والبريد"),
            t("Role", "الدور"),
            t("Registered", "تاريخ التسجيل"),
            t("Status", "الحالة"),
            t("Actions", "الإجراءات"),
          ],
          shown
            .map(
              (u) =>
                `<tr><td>${person(u)}</td><td>${role(u.role)}</td><td>${date(u.createdAt)}</td><td>${badge(u.status)}</td><td><div class="row-actions">${button(t("Details", "التفاصيل"), "profile", u.email)}${u.status !== "deleted" ? button(u.status === "active" ? t("Suspend", "تعليق") : t("Activate", "تفعيل"), "account-status", u.email, "text-button", `data-next="${u.status === "active" ? "suspended" : "active"}" ${u.email === A.current().email ? "disabled" : ""}`) : ""}</div></td></tr>`,
            )
            .join(""),
        ) +
        `<div class="pagination"><span>${rows.length} ${t("accounts", "حساب")} · ${f.page} / ${pages}</span><div>${button(t("Previous", "السابق"), "previous-page", "", "secondary", f.page <= 1 ? "disabled" : "")}${button(t("Next", "التالي"), "next-page", "", "secondary", f.page >= pages ? "disabled" : "")}</div></div>`
      : empty(
          t("No matching accounts", "لا توجد حسابات مطابقة"),
          t(
            "Change filters. Old accounts may not have a registration date.",
            "غيّر المرشحات؛ قد لا تحمل الحسابات القديمة تاريخ تسجيل.",
          ),
        );
    U.hydratePhotos?.();
  }
  function requestsView() {
    const records = S.schoolRequests();
    return section(
      t("School registration review", "مراجعة تسجيل المدارس"),
      t(
        "New registrations create local requests. Legacy schools are not marked pending.",
        "تُنشئ التسجيلات الجديدة طلبات محلية؛ المدارس القديمة لا تصبح معلقة تلقائيًا.",
      ),
      records.length
        ? table(
            [
              t("School", "المدرسة"),
              t("Submitted", "تاريخ الطلب"),
              t("Status", "الحالة"),
              t("Actions", "الإجراءات"),
            ],
            records
              .map(
                (r) =>
                  `<tr><td>${esc(r.school?.name || r.schoolId)}<small class="cell-sub">${esc(r.schoolId)}</small></td><td>${date(r.submittedAt)}</td><td>${badge(r.status)}</td><td>${r.status === "pending" ? `<div class="row-actions">${button(t("Approve", "قبول"), "school-review", r.id, "secondary", 'data-next="approved"')}${button(t("Reject", "رفض"), "school-review", r.id, "danger-outline", 'data-next="rejected"')}</div>` : esc(r.reason || "")}</td></tr>`,
              )
              .join(""),
          )
        : empty(
            t("The review queue is clear", "قائمة المراجعة فارغة"),
            t(
              "No school requests have been recorded in this browser.",
              "لم تُسجّل طلبات مدرسية في هذا المتصفح.",
            ),
          ),
    );
  }
  function jobsView() {
    const jobs = S.jobs(),
      applications = S.applications();
    return (
      section(
        t("School job postings", "وظائف المدارس"),
        t(
          "Statuses update the existing recruitment store.",
          "تُحدّث الحالات في مخزن التوظيف الموجود.",
        ),
        jobs.length
          ? table(
              [
                t("Position", "الوظيفة"),
                t("School", "المدرسة"),
                t("Status", "الحالة"),
                t("Applications", "الطلبات"),
                t("Manage", "إدارة"),
              ],
              jobs
                .map(
                  (j) =>
                    `<tr><td><button class="text-link" data-action="job-details" data-id="${esc(j.id)}">${esc(j.title)}</button><small class="cell-sub">${esc(j.subject)} · ${esc(j.location)}</small></td><td>${esc(j.schoolName)}</td><td>${badge(j.status)}</td><td>${j.applications}</td><td>${button(t("Change status", "تغيير الحالة"), "job-status", j.id)}</td></tr>`,
                )
                .join(""),
            )
          : empty(
              t("No job postings", "لا توجد وظائف"),
              t(
                "Jobs created by registered schools appear here.",
                "تظهر وظائف المدارس المسجلة هنا.",
              ),
            ),
      ) +
      section(
        t("Teacher applications", "طلبات المعلمين"),
        t(
          "Review only. Hiring decisions remain with schools.",
          "للاطلاع؛ قرارات التوظيف تبقى لدى المدارس.",
        ),
        applications.length
          ? table(
              [
                t("Teacher", "المعلم"),
                t("Job", "الوظيفة"),
                t("Status", "الحالة"),
                t("Submitted", "التاريخ"),
              ],
              applications
                .map(
                  (a) =>
                    `<tr><td><button class="text-link" data-action="application-details" data-id="${esc(a.id)}">${esc(a.profile?.name || a.teacherId)}</button></td><td>${esc(jobs.find((j) => j.id === a.jobId)?.title || a.jobId)}</td><td>${badge(a.status)}</td><td>${date(a.createdAt)}</td></tr>`,
                )
                .join(""),
            )
          : empty(
              t("No saved applications", "لا توجد طلبات محفوظة"),
              t(
                "Actual teacher applications will appear here.",
                "ستظهر طلبات المعلمين الفعلية هنا.",
              ),
            ),
      )
    );
  }
  function contentView() {
    const posts = S.posts();
    return (
      section(
        t("Saved channel publications", "منشورات القنوات المحفوظة"),
        t(
          "Hide or restore a post while retaining its content and assignment data.",
          "احجب المنشور أو أعد إظهاره مع الاحتفاظ بمحتواه وبيانات الواجب.",
        ),
        posts.length
          ? table(
              [
                t("Title", "العنوان"),
                t("Type", "النوع"),
                t("Channel", "القناة"),
                t("Visibility", "الظهور"),
                t("Action", "الإجراء"),
              ],
              posts
                .map(
                  (p) =>
                    `<tr><td>${esc(p.title || p.titleAr || p.titleEn)}<small class="cell-sub">${date(p.createdAt)}</small></td><td>${esc(p.type)}</td><td>${esc(p.channel)}</td><td>${badge(p.moderationStatus || "visible")}</td><td>${button(p.moderationStatus === "hidden" ? t("Restore", "إظهار") : t("Hide", "حجب"), "post-status", p.id, "secondary", `data-next="${p.moderationStatus === "hidden" ? "visible" : "hidden"}"`)}</td></tr>`,
                )
                .join(""),
            )
          : empty(
              t("No saved publications", "لا توجد منشورات محفوظة"),
              t(
                "Built-in previews are source content, not user publications.",
                "المعاينات المدمجة محتوى من ملفات المشروع، وليست منشورات مستخدمين.",
              ),
            ),
      ) +
      section(
        t("Built-in learning catalog", "فهرس التعلم المدمج"),
        t(
          "Read-only here. Scientific lesson models are maintained in their source files.",
          "للقراءة هنا؛ تُدار نماذج الدروس العلمية من ملفاتها.",
        ),
        `<div class="catalog-grid">${[
          ["forces", "Forces & motion", "القوى والحركة"],
          ["energy", "Kinetic energy", "الطاقة الحركية"],
          ["waves", "Waves", "الموجات"],
          ["circuits", "Simple circuits", "الدوائر الكهربائية"],
        ]
          .map(
            ([id, en, ar]) =>
              `<a class="catalog-card" href="../lessons/lessons.html?topic=${id}" target="_blank" rel="noopener">${icon("content")}<strong>${t(en, ar)}</strong><small>${t("Open lesson", "فتح الدرس")} ↗</small></a>`,
          )
          .join("")}</div>`,
      )
    );
  }
  function labsView() {
    return (
      section(
        t("Interactive experiment registry", "فهرس التجارب التفاعلية"),
        t(
          "Existing live simulations, maintained in the project source.",
          "محاكاة فعلية تُدار من ملفات المشروع.",
        ),
        `<div class="catalog-grid">${[
          ["../car-lab/car-lab.html", "Car motion dynamics", "ديناميكا حركة السيارة", "ΣF = ma"],
          ["../lab/lab.html?experiment=pendulum", "Pendulum", "البندول", "T ≈ 2π√(L/g)"],
          ["../lab/lab.html?experiment=spring", "Mass on a spring", "كتلة على نابض", "F = −kx"],
          [
            "../lab/lab.html?experiment=projectile",
            "Projectile motion",
            "حركة المقذوف",
            "y = v₀ sinθt − ½gt²",
          ],
        ]
          .map(
            ([href, en, ar, formula]) =>
              `<a class="catalog-card lab-catalog" href="${href}" target="_blank" rel="noopener">${icon("labs")}<span class="badge active">${t("Interactive", "تفاعلي")}</span><strong>${t(en, ar)}</strong><code dir="ltr">${formula}</code><small>${t("Open experiment", "فتح التجربة")} ↗</small></a>`,
          )
          .join("")}</div>`,
      ) +
      section(
        t("Administrative editing", "تعديل التجارب"),
        "",
        `<p class="muted">${t("No stored lab-authoring model exists. Change scientific models in source; a publishing backend is needed for remote authoring.", "لا يوجد نموذج تأليف تجارب مخزّن؛ تُعدَّل النماذج العلمية من ملفاتها. يحتاج التأليف عن بعد خادم نشر.")}</p>`,
      )
    );
  }
  function reportsView() {
    const s = S.snapshot(),
      reports = S.reports();
    return (
      `<div class="chart-grid">${section(t("Registration growth", "نمو التسجيل"), t("Known dates only", "التواريخ المسجلة فقط"), growthChart(s.users))}${section(t("Saved learning activity", "النشاط التعليمي المحفوظ"), "", engagementChart(s.engagement))}</div>` +
      section(
        t("Moderation reports", "بلاغات الإشراف"),
        t(
          "No reporting intake is connected. Only actual stored records are shown.",
          "لا يوجد ربط لاستقبال البلاغات؛ تُعرض السجلات الفعلية فقط.",
        ),
        reports.length
          ? table(
              [
                t("Report", "البلاغ"),
                t("Target", "المحتوى"),
                t("Status", "الحالة"),
                t("Action", "الإجراء"),
              ],
              reports
                .map(
                  (r) =>
                    `<tr><td>${esc(r.reason || r.title)}</td><td>${esc(r.target)}</td><td>${badge(r.status || "pending")}</td><td>${!["resolved", "dismissed"].includes(r.status) ? button(t("Resolve", "معالجة"), "resolve-report", r.id) : ""}</td></tr>`,
                )
                .join(""),
            )
          : empty(
              t("No reports received", "لم تصل بلاغات"),
              t(
                "Production needs a reporting intake and server moderation workflow.",
                "يحتاج الإنتاج مسار استقبال بلاغات وسير إشراف على الخادم.",
              ),
            ),
      )
    );
  }
  function logsView() {
    return section(
      t("Audit trail", "سجل التدقيق"),
      t(
        "Local logs can be modified outside the app. Production needs a protected server log.",
        "يمكن تعديل السجلات المحلية خارج التطبيق؛ يحتاج الإنتاج سجلًا محميًا على الخادم.",
      ),
      `<div class="filter-bar"><label class="search-field">${icon("search")}<input data-log-filter="query" placeholder="${t("Account, administrator or action", "الحساب أو المدير أو الإجراء")}" aria-label="${t("Search logs", "بحث السجل")}"></label><label>${t("Action", "الإجراء")}<select data-log-filter="action"><option value="">${t("All actions", "كل الإجراءات")}</option>${[...new Set(S.logs().map((e) => e.action))].map((action) => `<option value="${esc(action)}">${esc(actionLabel(action))}</option>`).join("")}</select></label><label>${t("Since", "منذ")}<input type="date" data-log-filter="from"></label></div><div id="log-results">${logList(S.logs())}</div>`,
    );
  }
  function notificationsView() {
    const notifications = S.notifications();
    return section(
      t("Administrative events", "الأحداث الإدارية"),
      t(
        "Internal events only. No email, SMS or push message was sent.",
        "أحداث داخلية فقط؛ لم تُرسل رسائل بريد أو SMS أو إشعارات خارجية.",
      ),
      notifications.length
        ? `<div class="notification-list">${notifications.map((n) => `<article class="notification-row ${n.read ? "read" : ""}">${icon("notifications")}<div><strong>${esc(actionLabel(n.action))}</strong><p>${esc(n.target)}</p><small>${date(n.at)}</small></div>${!n.read ? button(t("Mark read", "تعليم كمقروء"), "mark-read", n.id) : badge("resolved")}</article>`).join("")}</div>`
        : empty(
            t("All quiet in this orbit", "لا توجد أحداث في هذا المدار"),
            t(
              "Actual administrative events will appear here.",
              "ستظهر الأحداث الإدارية الفعلية هنا.",
            ),
          ),
    );
  }
  function settingsView() {
    const values = S.settings();
    return (
      section(
        t("Workspace preferences", "تفضيلات مساحة الإدارة"),
        t("Applies to this administrative workspace only.", "تُطبّق على مساحة الإدارة هذه فقط."),
        `<form id="settings-form" class="admin-form"><label>${t("Workspace name", "اسم مساحة الإدارة")}<input name="name" required maxlength="80" value="${esc(values.name)}"></label><label>${t("Accounts per page", "حسابات لكل صفحة")}<select name="pageSize">${[10, 20, 50].map((n) => `<option ${values.pageSize === n ? "selected" : ""}>${n}</option>`).join("")}</select></label><button class="button primary">${t("Save preferences", "حفظ التفضيلات")}</button><p class="form-error" role="alert"></p></form>`,
      ) +
      section(
        t("Security & integration requirements", "متطلبات الأمان والربط"),
        "",
        `<ul class="integration-list"><li><strong>${t("Authentication", "المصادقة")}</strong><p>${t("Admin credentials use the existing PBKDF2 store. Sessions expire after eight hours. Device owners can modify browser storage and session markers.", "تستخدم بيانات المدير مخزن PBKDF2 الموجود. تنتهي الجلسة بعد ثماني ساعات؛ يستطيع مالك الجهاز تعديل التخزين وعلامات الجلسة.")}</p></li><li><strong>${t("Before production", "قبل الإنتاج")}</strong><p>${t("Add server authentication, HttpOnly sessions, RBAC on every operation, a shared database, transactional erasure, protected audit logs and request intake endpoints.", "أضف مصادقة خادم وجلسات HttpOnly وصلاحيات RBAC لكل عملية وقاعدة بيانات مشتركة وحذفًا بمعاملات وسجل تدقيق محميًا ومسارات استقبال الطلبات.")}</p></li><li><strong>${t("Deletion policy", "سياسة الحذف")}</strong><p>${t("Archiving blocks sign-in and retains linked learning and recruitment records. Permanent erasure and attachment cleanup need a backend retention workflow.", "حذف الأهلية يمنع الدخول ويحفظ سجلات التعلم والتوظيف المرتبطة. المحو النهائي وتنظيف المرفقات يحتاجان سياسة احتفاظ على الخادم.")}</p></li><li><strong>${t("Analytics & delivery", "التحليلات والإرسال")}</strong><p>${t("Reports cover this browser only. No live analytics, email, billing or external notification provider is connected.", "التقارير تخص هذا المتصفح فقط. لا يوجد ربط بتحليلات مباشرة أو بريد أو فوترة أو مزود إشعارات خارجي.")}</p></li></ul>`,
      )
    );
  }
  Object.assign(U, { growthChart, engagementChart, logList, getFilter, renderUsersTable });
  Object.assign(U.views, {
    overview,
    users: usersView,
    students: usersView,
    teachers: usersView,
    schools: usersView,
    requests: requestsView,
    jobs: jobsView,
    content: contentView,
    labs: labsView,
    reports: reportsView,
    notifications: notificationsView,
    logs: logsView,
    settings: settingsView,
  });
})();
