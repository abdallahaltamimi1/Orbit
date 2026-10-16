/* School-scoped local overview. Does not expose private answers or attachments. */
(() => {
  "use strict";
  const A = OrbitAuth,
    S = OrbitSubscriptions,
    esc = (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
      );
  const t = (en, ar) => (document.documentElement.lang === "en" ? en : ar);
  let view = "teachers",
    search = "",
    channelFilter = "",
    observer,
    localeObserver,
    queued = false;
  const canonical = (id) => (id === "khaled" ? "teacher@orbit.com" : id);
  const channelName = (c) => (document.documentElement.lang === "en" ? c.en || c.ar : c.ar || c.en);
  function model() {
    if (A.current()?.role !== "school") return null;
    const context = S.effective();
    if (context.user.email !== A.current().email || context.schoolId !== A.current().email)
      return null;
    if (!S.check("basicReports", { context }).allowed) return { blocked: true };
    const org = S.organizations().schools[context.schoolId] || { teachers: [], students: [] },
      channels = S.scopedChannels(context),
      ids = new Set(channels.map((c) => c.id)),
      memberships = A.get("orbit.memberships.v3", {});
    const teacherIds = [
      ...new Set((org.teachers || []).filter((m) => m.status === "active").map((m) => m.id)),
    ];
    const studentIds = [
      ...new Set([
        ...(org.students || []).filter((id) => typeof id === "string"),
        ...Object.entries(memberships)
          .filter(
            ([id, list]) =>
              id !== "guest" && Array.isArray(list) && list.some((cid) => ids.has(cid)),
          )
          .map(([id]) => id),
      ]),
    ];
    const posts = (A.get("orbit.channels.v2", {}).posts || []).filter(
        (p) => ids.has(p.channel) && !p.sample,
      ),
      assignments = posts.filter((p) => p.type === "assignment"),
      assignmentIds = new Set(assignments.map((p) => p.id));
    const records = (A.get("orbit.assignments.v1", {}).submissions || []).filter((r) =>
      assignmentIds.has(r.assignmentId),
    );
    const roster = studentIds.map((id) => {
      const enrolled = channels.filter((c) => (memberships[id] || []).includes(c.id)),
        eligible = assignments.filter((p) => enrolled.some((c) => c.id === p.channel)),
        eligibleIds = new Set(eligible.map((p) => p.id)),
        responses = records.filter((r) => r.studentId === id && eligibleIds.has(r.assignmentId));
      return {
        id,
        name: OrbitProfiles.read(id, "student").name || id,
        channels: enrolled,
        expected: eligible.length,
        submitted: new Set(responses.map((r) => r.assignmentId)).size,
        reviewed: responses.filter((r) => r.review).length,
        late: responses.filter((r) => r.late).length,
      };
    });
    return {
      channels,
      posts,
      assignments,
      records,
      roster,
      teachers: teacherIds.map((id) => ({
        id,
        name: OrbitProfiles.read(id, "teacher").name || id,
        subject: OrbitProfiles.read(id, "teacher").subject || "",
        channels: channels.filter((c) => canonical(c.teacher) === id),
      })),
    };
  }
  const totals = (data, channels) => {
    const ids = new Set(channels.map((c) => c.id)),
      assignments = data.assignments.filter((p) => ids.has(p.channel)),
      postIds = new Set(assignments.map((p) => p.id));
    return {
      students: new Set(
        data.roster.filter((r) => r.channels.some((c) => ids.has(c.id))).map((r) => r.id),
      ).size,
      lessons: data.posts.filter((p) => ids.has(p.channel) && ["lesson", "video"].includes(p.type))
        .length,
      assignments: assignments.length,
      submitted: data.records.filter((r) => postIds.has(r.assignmentId)).length,
      waiting: data.records.filter((r) => postIds.has(r.assignmentId) && !r.review).length,
    };
  };
  function studentScope(data, student) {
    if (!channelFilter) return student;
    const assignments = data.assignments.filter((p) => p.channel === channelFilter),
      ids = new Set(assignments.map((p) => p.id)),
      records = data.records.filter((r) => r.studentId === student.id && ids.has(r.assignmentId));
    return {
      ...student,
      channels: student.channels.filter((c) => c.id === channelFilter),
      expected: assignments.length,
      submitted: new Set(records.map((r) => r.assignmentId)).size,
      reviewed: records.filter((r) => r.review).length,
      late: records.filter((r) => r.late).length,
    };
  }
  function rows(data) {
    const q = search.trim().toLocaleLowerCase(),
      matches = (item) => (item.name + " " + item.id).toLocaleLowerCase().includes(q);
    if (view === "teachers")
      return data.teachers
        .filter(matches)
        .filter((r) => !channelFilter || r.channels.some((c) => c.id === channelFilter))
        .map((r) => {
          const scoped = channelFilter
              ? r.channels.filter((c) => c.id === channelFilter)
              : r.channels,
            counts = totals(data, scoped);
          return `<tr><th scope="row">${esc(r.name)}<small><bdi>${esc(r.id)}</bdi></small></th><td>${scoped.length}</td><td>${counts.students}</td><td>${counts.lessons}</td><td>${counts.assignments}</td><td>${counts.waiting}</td><td><a href="../teacher-profile/teacher-profile.html?id=${encodeURIComponent(r.id)}&recruit=1">${t("Professional profile", "الملف المهني")}</a></td></tr>`;
        });
    if (view === "students")
      return data.roster
        .filter(matches)
        .filter((r) => !channelFilter || r.channels.some((c) => c.id === channelFilter))
        .map((r) => studentScope(data, r))
        .map(
          (r) =>
            `<tr><th scope="row">${esc(r.name)}<small><bdi>${esc(r.id)}</bdi></small></th><td>${r.channels.map((c) => esc(channelName(c))).join("<br>") || t("Not enrolled in a class", "غير مسجل في صف")}</td><td><bdi dir="ltr">${r.submitted} / ${r.expected}</bdi></td><td>${Math.max(0, r.expected - r.submitted)}</td><td>${r.reviewed}</td><td>${r.late}</td></tr>`,
        );
    return data.channels
      .filter((c) => (channelName(c) || "").toLocaleLowerCase().includes(q))
      .filter((c) => !channelFilter || c.id === channelFilter)
      .map((c) => {
        const counts = totals(data, [c]);
        return `<tr><th scope="row">${esc(channelName(c))}<small>${c.private ? t("Private class", "صف خاص") : t("Public channel", "قناة عامة")}</small></th><td>${esc(OrbitProfiles.read(canonical(c.teacher), "teacher").name || c.teacher)}</td><td>${counts.students}</td><td>${counts.lessons}</td><td>${counts.assignments}</td><td>${counts.waiting}</td></tr>`;
      });
  }
  function renderRows(section, data) {
    const headings =
      view === "teachers"
        ? [
            t("Teacher", "المعلم"),
            t("Channels", "القنوات"),
            t("Students", "الطلاب"),
            t("Lessons / videos", "الدروس / الفيديوهات"),
            t("Assignments", "الواجبات"),
            t("Awaiting review", "بانتظار المراجعة"),
            t("Profile", "الملف"),
          ]
        : view === "students"
          ? [
              t("Student", "الطالب"),
              t("Enrolled channels", "القنوات المسجل بها"),
              t("Submitted / assigned", "المُسلَّم / المطلوب"),
              t("Not submitted", "لم يُسلَّم"),
              t("Reviewed", "تمت المراجعة"),
              t("Late submissions", "تسليمات متأخرة"),
            ]
          : [
              t("Channel", "القناة"),
              t("Teacher", "المعلم"),
              t("Students", "الطلاب"),
              t("Lessons / videos", "الدروس / الفيديوهات"),
              t("Assignments", "الواجبات"),
              t("Awaiting review", "بانتظار المراجعة"),
            ];
    const items = rows(data);
    section.querySelector("[data-follow-results]").innerHTML =
      `<table><caption>${t("School monitoring", "متابعة المدرسة")} · ${t(view === "teachers" ? "Teachers" : view === "students" ? "Students" : "Classes", view === "teachers" ? "المعلمون" : view === "students" ? "الطلاب" : "الصفوف")}</caption><thead><tr>${headings.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${items.join("") || `<tr><td colspan="${headings.length}" class="school-follow-empty">${t("No matching linked records. Associate accounts using Your school team below.", "لا توجد سجلات مرتبطة مطابقة. اربط الحسابات من فريق مدرستك أسفل الصفحة.")}</td></tr>`}</tbody></table>`;
  }
  function mount() {
    if (document.body.classList.contains("recruitment-hub")) return;
    const host = document.querySelector("#app main");
    if (!host) return;
    const data = model();
    if (!data) {
      document.getElementById("school-follow")?.remove();
      return;
    }
    let section = document.getElementById("school-follow");
    if (!section) {
      section = document.createElement("section");
      section.id = "school-follow";
      section.className = "school-follow";
      section.setAttribute("aria-labelledby", "school-follow-title");
      const hero = host.querySelector(".recruit-hero");
      if (hero) hero.after(section);
      else host.prepend(section);
    }
    if (data.blocked) {
      section.innerHTML = `<h2 id="school-follow-title">${t("Teachers and students", "متابعة المعلمين والطلاب")}</h2><p>${t("School reports are unavailable under the current plan or subscription status.", "تقارير المدرسة غير متاحة وفق الخطة أو حالة الاشتراك الحالية.")}</p><a href="../pricing/pricing.html">${t("Review plan", "مراجعة الخطة")}</a>`;
      return;
    }
    section.innerHTML = `<header><h2 id="school-follow-title">${t("Teachers, students and classrooms", "المعلمون والطلاب والصفوف")}</h2><p>${data.teachers.length} ${t("linked teachers", "معلمين مرتبطين")} · ${data.roster.length} ${t("students", "طلاب")} · ${data.channels.length} ${t("channels", "قنوات")}</p></header><p class="school-follow-note">${t("Current school associations and saved submissions in this browser. Counts are not attendance records. Private answers and attachments are not displayed.", "المتابعة حسب ارتباطات المدرسة والتسليمات المحفوظة في هذا المتصفح. الأعداد لا تمثل سجل حضور. لا تُعرض إجابات الطلاب أو مرفقاتهم الخاصة.")}</p><div class="school-follow-tools"><div role="group" aria-label="${t("Monitoring view", "نوع المتابعة")}">${[
      ["teachers", "Teachers", "المعلمون"],
      ["students", "Students", "الطلاب"],
      ["classes", "Classes", "الصفوف"],
    ]
      .map(
        ([id, en, ar]) =>
          `<button type="button" data-follow-view="${id}" aria-pressed="${view === id}">${t(en, ar)}</button>`,
      )
      .join(
        "",
      )}</div><label>${t("Search", "بحث")}<input type="search" data-follow-search value="${esc(search)}" placeholder="${t("Name or email", "الاسم أو البريد")}"></label><label>${t("Channel", "القناة")}<select data-follow-channel><option value="">${t("All channels", "كل القنوات")}</option>${data.channels.map((c) => `<option value="${esc(c.id)}" ${channelFilter === c.id ? "selected" : ""}>${esc(channelName(c))}</option>`).join("")}</select></label></div><div class="school-follow-table" data-follow-results tabindex="0" role="region" aria-label="${t("Monitoring table", "جدول المتابعة")}"></div>`;
    section.querySelectorAll("[data-follow-view]").forEach(
      (button) =>
        (button.onclick = () => {
          view = button.dataset.followView;
          section.querySelector("[data-follow-search]").placeholder =
            view === "classes"
              ? t("Channel name", "اسم القناة")
              : t("Name or email", "الاسم أو البريد");
          section
            .querySelectorAll("[data-follow-view]")
            .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.followView === view)));
          renderRows(section, data);
        }),
    );
    section.querySelector("[data-follow-search]").oninput = (e) => {
      search = e.target.value;
      renderRows(section, data);
    };
    section.querySelector("[data-follow-channel]").onchange = (e) => {
      channelFilter = e.target.value;
      renderRows(section, data);
    };
    renderRows(section, data);
  }
  mount();
  observer = new MutationObserver((records) => {
    if (records.every((r) => r.target.closest?.("#school-follow"))) return;
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (!document.getElementById("school-follow")) mount();
    });
  });
  observer.observe(document.getElementById("app"), { childList: true, subtree: true });
  localeObserver = new MutationObserver(mount);
  localeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  window.addEventListener("orbit:subscription-change", mount);
  window.addEventListener("orbit:assignments-change", mount);
  window.addEventListener("storage", (e) => {
    if (
      [
        "orbit.school.members.v1",
        "orbit.memberships.v3",
        "orbit.channels.v2",
        "orbit.assignments.v1",
        "orbit.subscriptions.v1",
      ].includes(e.key)
    )
      mount();
  });
  window.addEventListener("pagehide", (e) => {
    if (!e.persisted) {
      observer.disconnect();
      localeObserver.disconnect();
    }
  });
})();
