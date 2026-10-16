"use strict";
const O = ORBIT,
  R = OrbitRecruitment,
  { t, esc } = O,
  params = new URLSearchParams(location.search);
let tab = params.get("tab") || "jobs",
  selectedJob = params.get("job") || "",
  search = "",
  subjectFilter = "",
  locationFilter = "",
  experienceFilter = "",
  gradeFilter = "",
  qualificationFilter = "",
  statusFilter = "",
  matchesOnly = false;
const subjectNames = {
    physics: ["Physics", "الفيزياء"],
    math: ["Mathematics", "الرياضيات"],
    arabic: ["Arabic", "العربية"],
    english: ["English", "الإنجليزية"],
    chemistry: ["Chemistry", "الكيمياء"],
    biology: ["Biology", "الأحياء"],
  },
  subject = (s) => (subjectNames[s] ? t(...subjectNames[s]) : s),
  states = {
    pending: ["Pending", "قيد الانتظار"],
    review: ["Under review", "قيد المراجعة"],
    shortlisted: ["Shortlisted", "القائمة المختصرة"],
    accepted: ["Accepted", "مقبول"],
    rejected: ["Rejected", "مرفوض"],
    withdrawn: ["Withdrawn", "منسحب"],
    draft: ["Draft", "مسودة"],
    published: ["Published", "منشور"],
    closed: ["Closed", "مغلق"],
  },
  state = (s) => (states[s] ? t(...states[s]) : s);
const field = (name, label, value = "", type = "text", extra = "") =>
    `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`,
  text = (name, label, value = "") =>
    `<label>${label}<textarea name="${name}">${esc(value)}</textarea></label>`,
  options = (selected = "", all = false) =>
    `${all ? `<option value="">${t("All subjects", "كل التخصصات")}</option>` : ""}${Object.keys(
      subjectNames,
    )
      .map((s) => `<option value="${s}" ${selected === s ? "selected" : ""}>${subject(s)}</option>`)
      .join("")}`,
  statusOptions = (selected = "", all = true) =>
    `${all ? `<option value="">${t("All statuses", "كل الحالات")}</option>` : ""}${R.statuses.map((s) => `<option value="${s}" ${selected === s ? "selected" : ""}>${state(s)}</option>`).join("")}`;
const errorText = (e) =>
  ({
    IMAGE_INVALID: t(
      "Choose a PNG, JPEG or WebP image under 5 MB.",
      "اختر صورة PNG أو JPEG أو WebP أقل من 5 MB.",
    ),
    ROLE_DENIED: t("You do not have permission for this action.", "لا تملك صلاحية هذا الإجراء."),
    NOT_OWNER: t("This job belongs to another school.", "هذه الوظيفة لمدرسة أخرى."),
    REQUIRED_FIELDS: t("Complete the required fields.", "أكمل الحقول المطلوبة."),
    INVALID_EXPERIENCE: t("Experience must be 0–60 years.", "الخبرة من 0 إلى 60 سنة."),
    HTTPS_REQUIRED: t("Use an HTTPS website link.", "استخدم رابط موقع HTTPS."),
    ALREADY_APPLIED: t("You already applied for this job.", "قدمت لهذه الوظيفة مسبقًا."),
    JOB_CLOSED: t("This job is no longer open.", "هذه الوظيفة لا تستقبل طلبات الآن."),
    PROFILE_INCOMPLETE: t(
      "Complete your name and qualifications in your professional profile first.",
      "أكمل الاسم والمؤهلات في ملفك المهني أولًا.",
    ),
    CONSENT_REQUIRED: t("Consent to share the profile is required.", "موافقة مشاركة الملف مطلوبة."),
    EMAIL_EXISTS: t(
      "This email is already registered or reserved.",
      "البريد مسجل مسبقًا أو محجوز لحساب تجريبي.",
    ),
    INVALID_CREDENTIALS: t(
      "Enter a valid email and a password of at least 10 characters.",
      "أدخل بريدًا صحيحًا وكلمة مرور لا تقل عن 10 أحرف.",
    ),
    SECURE_CONTEXT_REQUIRED: t(
      "Open on localhost or HTTPS to use local registration.",
      "شغّل عبر localhost أو HTTPS للتسجيل المحلي.",
    ),
  })[e.message] ||
  t(
    "Could not complete the action. Check browser storage and retry.",
    "تعذّر إكمال الإجراء. تحقق من تخزين المتصفح وحاول مجددًا.",
  );
function report(e, element) {
  (element || document.getElementById("recruit-errors")).textContent = errorText(e);
}
function hint() {
  return `<p class="role-banner">${t("Local browser prototype · profile credentials are self-reported. Notifications and matching are local; there is no server or identity verification.", "نموذج محلي في المتصفح · المؤهلات معلنة ذاتيًا. الإشعارات والمطابقة محلية؛ لا يوجد خادم أو توثيق هوية.")}</p><p id="recruit-errors" role="status"></p>`;
}
function confirmAction(title, callback) {
  const d = O.dialog(
    `<h2>${title}</h2><p>${t("Confirm this change. The affected account receives a local notification when applicable.", "أكد التغيير. الحساب المعني يستقبل إشعارًا محليًا عند الحاجة.")}</p><p class="error" role="status"></p><button class="btn" id="confirm-action">${t("Confirm", "تأكيد")}</button>`,
  );
  d.querySelector("#confirm-action").onclick = () => {
    try {
      callback();
      d.close();
    } catch (e) {
      report(e, d.querySelector(".error"));
    }
  };
}
function profileURL(applicationId = "", teacherId = "teacher@orbit.com") {
  return (
    "../teacher-profile/teacher-profile.html?id=" +
    encodeURIComponent(teacherId) +
    "&recruit=1" +
    (applicationId ? "&application=" + encodeURIComponent(applicationId) : "")
  );
}
function photo(p) {
  return p.photo
    ? `<img data-asset="${esc(p.photo)}" alt="${t("Teacher profile picture", "صورة المعلم")}">`
    : `<span class="avatar-fallback">${esc(
        (p.name || "T")
          .split(/\s+/)
          .map((x) => x[0])
          .slice(0, 2)
          .join(""),
      )}</span>`;
}
function reasons(m) {
  return `<div class="match-score">${m.score}%</div><ul class="match-reasons">${m.checks.map((c) => `<li>${c.ok ? "✓" : c.known ? "–" : "?"} ${t(c.en, c.ar)}${!c.known ? " · " + t("Information missing", "معلومات ناقصة") : !c.ok ? " · " + t("Not matched", "غير مطابق") : ""}</li>`).join("")}</ul><p class="recruit-hint">${t("Comparison of self-reported information. Documentary verification and school review are required. This score is not a hiring decision.", "مقارنة معلومات معلنة ذاتيًا. يلزم التحقق من المستندات ومراجعة المدرسة. النسبة ليست قرار توظيف.")}</p>`;
}
function employment(value) {
  const labels = {
    "full-time": ["Full-time", "دوام كامل"],
    "part-time": ["Part-time", "دوام جزئي"],
    contract: ["Contract", "عقد"],
  };
  return labels[value] ? t(...labels[value]) : value;
}
function jobCard(j, admin = false) {
  const school = R.publicSchool(j.schoolId),
    m = O.user.role === "teacher" ? R.match(j, R.teacher()) : null;
  return `<article class="card job-card"><span class="pill ${j.status}">${state(j.status)}</span><h2>${esc(j.title)}</h2><p>${esc(school?.name || "")} · ${esc(j.location)}</p><div class="job-meta"><span>${subject(j.subject)}</span><span>${j.experience} ${t("years required", "سنوات مطلوبة")}</span><span>${esc(employment(j.employment))}</span><span>${esc(j.grades.join("، "))}</span></div>${m ? `<p class="match-score">${m.score}% <small>${t("profile match", "مطابقة البيانات")}</small></p>` : ""}<p>${esc(j.description.slice(0, 150))}</p><a class="btn soft" href="../jobs/jobs.html?id=${j.id}">${t("View full job", "تفاصيل الوظيفة")}</a>${admin ? `<div class="actions"><button class="btn soft" data-edit-job="${j.id}">${t("Edit", "تعديل")}</button><button class="btn soft" data-job-status="${j.id}" data-next="${j.status === "published" ? "closed" : "published"}">${j.status === "published" ? t("Close", "إغلاق") : t("Publish / reopen", "نشر / إعادة فتح")}</button><button class="btn soft" data-applicants="${j.id}">${t("Applicants", "المتقدمون")} (${R.applications(j.id).length})</button></div>` : ""}</article>`;
}
function filterJobs(j) {
  return (
    (!subjectFilter || j.subject === subjectFilter) &&
    (!locationFilter || R.norm(j.location).includes(R.norm(locationFilter))) &&
    (!gradeFilter || R.norm(j.grades.join(" ")).includes(R.norm(gradeFilter))) &&
    (experienceFilter === "" || j.experience <= +experienceFilter) &&
    R.norm(j.title + " " + R.publicSchool(j.schoolId)?.name + " " + j.description).includes(
      R.norm(search),
    ) &&
    (!matchesOnly || (R.match(j, R.teacher()).subjectMatch && R.match(j, R.teacher()).score >= 60))
  );
}
function jobFilters() {
  return `<div class="filters"><label>${t("Job / school search", "بحث بالوظيفة / المدرسة")}<input id="search-jobs" type="search" value="${esc(search)}"></label><label>${t("Subject", "التخصص")}<select id="subject-filter">${options(subjectFilter, true)}</select></label><label>${t("Location", "الموقع")}<input id="location-filter" value="${esc(locationFilter)}"></label><label>${t("Grade", "الصف")}<input id="grade-filter" value="${esc(gradeFilter)}"></label><label>${t("Max. required experience", "أقصى خبرة مطلوبة")}<input id="experience-filter" type="number" min="0" max="60" value="${esc(experienceFilter)}"></label></div>`;
}
function bindJobFilters(renderResults) {
  for (const [id, key] of [
    ["search-jobs", "search"],
    ["subject-filter", "subject"],
    ["location-filter", "location"],
    ["grade-filter", "grade"],
    ["experience-filter", "experience"],
  ])
    document.getElementById(id)?.addEventListener("input", (e) => {
      if (key === "search") search = e.target.value;
      if (key === "subject") subjectFilter = e.target.value;
      if (key === "location") locationFilter = e.target.value;
      if (key === "grade") gradeFilter = e.target.value;
      if (key === "experience") experienceFilter = e.target.value;
      renderResults();
    });
}
function jobDialog(existing) {
  const j = existing || {
    experience: 0,
    subject: "physics",
    status: "draft",
    grades: [],
    skills: [],
  };
  const d = O.dialog(
    `<h2>${existing ? t("Edit job", "تعديل وظيفة") : t("Create a teaching opportunity", "أنشئ فرصة تدريس")}</h2><form id="job-form"><div class="form-grid">${field("title", t("Job title", "عنوان الوظيفة"), j.title, "text", 'required maxlength="150"')}<label>${t("Specialization", "التخصص")}<select name="subject">${options(j.subject)}</select></label>${field("location", t("Location", "الموقع"), j.location || R.school().location, "text", "required")}${field("experience", t("Minimum years of experience", "أقل سنوات خبرة"), j.experience, "number", 'required min="0" max="60" step="1"')}${field("grades", t("Grade levels · comma-separated", "الصفوف · افصل بفواصل"), j.grades.join(", "))}${field("skills", t("Required skills · comma-separated", "المهارات المطلوبة · افصل بفواصل"), j.skills.join(", "))}<label>${t("Employment", "نوع التوظيف")}<select name="employment">${["full-time", "part-time", "contract"].map((x) => `<option value="${x}" ${j.employment === x ? "selected" : ""}>${employment(x)}</option>`).join("")}</select></label><label>${t("Status", "الحالة")}<select name="status">${["draft", "published", "closed"].map((x) => `<option value="${x}" ${j.status === x ? "selected" : ""}>${state(x)}</option>`).join("")}</select></label></div>${text("qualifications", t("Required qualifications · keywords separated by commas", "المؤهلات المطلوبة · كلمات واضحة مفصولة بفواصل"), j.qualifications)}${text("description", t("Responsibilities and other requirements", "المهام والمتطلبات الإضافية"), j.description)}<label><input name="remote" type="checkbox" ${j.remote ? "checked" : ""}> ${t("Remote work · do not score location", "عمل عن بعد · الموقع لا يدخل في المطابقة")}</label><p class="recruit-hint">${t("Qualification comparison is textual, not certificate verification. Publishing notifies visible, available teachers who match.", "مقارنة المؤهل نصية وليست توثيق شهادة. النشر يُشعر المعلمين المتاحين الذين شاركوا ملفاتهم ووجدت مطابقة.")}</p><p class="error" role="status"></p><button class="btn">${t("Save job", "حفظ الوظيفة")}</button></form>`,
  );
  d.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    try {
      const f = Object.fromEntries(new FormData(e.target));
      f.remote = !!f.remote;
      R.putJob(f, j.id);
      d.close();
      schoolDashboard();
    } catch (ex) {
      report(ex, d.querySelector(".error"));
    }
  };
}
function schoolProfileDialog() {
  location.href = "../account-profile/account-profile.html";
}
async function imageAsset(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw Error("IMAGE_INVALID");
  const key = "profile-" + crypto.randomUUID();
  await O.media(key, file);
  return key;
}
function schoolDashboard() {
  const s = R.school(),
    jobs = R.ownJobs(),
    apps = R.applications(),
    notes = R.notifications().filter((n) => !n.read);
  if (!s) {
    O.shell(t("School account not found", "حساب المدرسة غير موجود"), hint());
    return;
  }
  let content = "";
  if (tab === "jobs") {
    content = `<div class="toolbar"><button class="btn" id="new-job">＋ ${t("Create job", "إنشاء وظيفة")}</button><select id="school-job-filter" aria-label="${t("Job status", "حالة الوظيفة")}"><option value="">${t("All job statuses", "كل حالات الوظائف")}</option>${["draft", "published", "closed"].map((x) => `<option value="${x}" ${statusFilter === x ? "selected" : ""}>${state(x)}</option>`).join("")}</select></div><div class="grid">${
      jobs
        .filter((j) => !statusFilter || j.status === statusFilter)
        .map((j) => jobCard(j, true))
        .join("") ||
      `<p class="empty">${t("No jobs yet. Create your first opportunity.", "لا توجد وظائف بعد. أنشئ أول فرصة.")}</p>`
    }</div>`;
  }
  if (tab === "applications") {
    const filtered = apps.filter(
      (a) =>
        (!selectedJob || a.jobId === selectedJob) && (!statusFilter || a.status === statusFilter),
    );
    content = `<div class="filters"><label>${t("Job", "الوظيفة")}<select id="application-job"><option value="">${t("All jobs", "كل الوظائف")}</option>${jobs.map((j) => `<option value="${j.id}" ${selectedJob === j.id ? "selected" : ""}>${esc(j.title)}</option>`).join("")}</select></label><label>${t("Application status", "حالة الطلب")}<select id="application-status">${statusOptions(statusFilter)}</select></label></div><div class="grid">${
      filtered
        .map((a) => {
          const p = a.profile,
            j = jobs.find((j) => j.id === a.jobId);
          return `<article class="card"><div class="teacher-mini">${photo(p)}<div><h2>${esc(p.name)}</h2><span>${subject(p.subject)} · ${p.experience ?? t("Not stated", "غير مذكورة")} ${t("years", "سنوات")}</span></div></div><p>${esc(p.qualification)}</p><p>${esc(j?.title || "")}</p><span class="pill ${a.status}">${state(a.status)}</span><p>${esc(a.message)}</p><a class="btn soft" href="${profileURL(a.id, a.teacherId)}">${t("Open professional profile", "فتح الملف المهني")}</a><div class="actions">${["review", "shortlisted", "accepted", "rejected"].map((st) => `<button class="btn soft" data-app-status="${a.id}" data-next="${st}" ${a.status === "withdrawn" || a.status === st ? "disabled" : ""}>${state(st)}</button>`).join("")}</div></article>`;
        })
        .join("") ||
      `<p class="empty">${t("No matching applications.", "لا توجد طلبات مطابقة.")}</p>`
    }</div>`;
  }
  if (tab === "discover") {
    const teachers = R.discover(selectedJob).filter(
      (p) =>
        (!subjectFilter || (p.subjects || []).includes(subjectFilter)) &&
        (!locationFilter || R.norm(p.location).includes(R.norm(locationFilter))) &&
        (!qualificationFilter || R.norm(p.qualification).includes(R.norm(qualificationFilter))) &&
        (experienceFilter === "" || (p.experience != null && p.experience >= +experienceFilter)) &&
        R.norm(p.name + " " + p.skills.join(" ")).includes(R.norm(search)),
    );
    content = `<div class="filters"><label>${t("Match to job", "طابق مع وظيفة")}<select id="match-job"><option value="">${t("All visible teachers", "كل المعلمين المشاركين")}</option>${jobs.map((j) => `<option value="${j.id}" ${selectedJob === j.id ? "selected" : ""}>${esc(j.title)}</option>`).join("")}</select></label><label>${t("Teacher / skill", "المعلم / المهارة")}<input id="teacher-search" value="${esc(search)}"></label><label>${t("Subject", "التخصص")}<select id="teacher-subject">${options(subjectFilter, true)}</select></label><label>${t("Min. years", "أقل سنوات خبرة")}<input id="teacher-experience" type="number" min="0" max="60" value="${esc(experienceFilter)}"></label><label>${t("Qualifications", "المؤهلات")}<input id="teacher-qualification" value="${esc(qualificationFilter)}"></label><label>${t("Location", "الموقع")}<input id="teacher-location" value="${esc(locationFilter)}"></label><button class="btn soft" id="filter-teachers">${t("Apply filters", "تطبيق الفلاتر")}</button></div><div class="grid">${teachers.map((p) => `<article class="card"><div class="teacher-mini">${photo(p)}<h2>${esc(p.name)}</h2></div><p>${subject(p.subject)} · ${p.experience ?? t("Not stated", "غير مذكورة")} ${t("years", "سنوات")}</p><p>${esc(p.qualification || t("Qualifications not supplied", "المؤهلات غير مكتملة"))}</p>${p.match ? reasons(p.match) : ""}<a href="${profileURL("", p.id)}" class="btn soft">${t("Explore profile and teaching work", "استكشف الملف وأعمال التدريس")}</a>${p.notifyInterest ? `<button class="btn soft" data-interest="${esc(p.id)}">${t("Show interest", "أبدِ اهتمامًا")}</button>` : ""}</article>`).join("") || `<p class="empty">${t("No available shared profiles match. Teachers must opt in to school discovery.", "لا توجد ملفات متاحة مطابقة. يجب أن يوافق المعلم على مشاركة ملفه مع المدارس.")}</p>`}</div>`;
  }
  O.shell(
    t("School recruitment", "توظيف المدرسة"),
    `<section class="hero recruit-hero"><div><span>${t("TEACHING OPPORTUNITIES", "فرص التعليم")}</span><h2>${esc(s.name)}</h2><p>${esc(s.location)} · ${esc(s.description)}</p><button id="edit-school" class="btn soft">${t("Edit school profile", "تعديل ملف المدرسة")}</button></div>${s.logo ? `<img data-asset="${esc(s.logo)}" alt="${t("School logo", "شعار المدرسة")}">` : ""}</section><div class="recruit-stats"><article><strong>${jobs.filter((j) => j.status === "published").length}</strong><span>${t("Open jobs", "وظائف مفتوحة")}</span></article><article><strong>${apps.filter((a) => a.status === "pending").length}</strong><span>${t("Awaiting review", "بانتظار المراجعة")}</span></article><article><strong>${notes.length}</strong><a href="../notifications/notifications.html">${t("Unread notifications", "إشعارات غير مقروءة")}</a></article></div><div class="recruit-tabs">${[
      ["jobs", t("Manage jobs", "إدارة الوظائف")],
      ["applications", t("Applicants", "المتقدمون")],
      ["discover", t("Discover teachers", "اكتشاف المعلمين")],
    ]
      .map(
        (x) =>
          `<button class="btn ${tab === x[0] ? "" : "soft"}" data-tab="${x[0]}">${x[1]}</button>`,
      )
      .join("")}</div>${hint()}${content}`,
  );
  document.getElementById("edit-school").onclick = schoolProfileDialog;
  document.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab;
        statusFilter = "";
        schoolDashboard();
      }),
  );
  document.getElementById("new-job")?.addEventListener("click", () => jobDialog());
  document.getElementById("school-job-filter")?.addEventListener("change", (e) => {
    statusFilter = e.target.value;
    schoolDashboard();
  });
  document
    .querySelectorAll("[data-edit-job]")
    .forEach((b) => (b.onclick = () => jobDialog(jobs.find((j) => j.id === b.dataset.editJob))));
  document.querySelectorAll("[data-job-status]").forEach(
    (b) =>
      (b.onclick = () =>
        confirmAction(
          t("Change job status to ", "تغيير حالة الوظيفة إلى ") + state(b.dataset.next),
          () => {
            R.setJobStatus(b.dataset.jobStatus, b.dataset.next);
            schoolDashboard();
          },
        )),
  );
  document.querySelectorAll("[data-applicants]").forEach(
    (b) =>
      (b.onclick = () => {
        tab = "applications";
        selectedJob = b.dataset.applicants;
        statusFilter = "";
        schoolDashboard();
      }),
  );
  document.getElementById("application-job")?.addEventListener("change", (e) => {
    selectedJob = e.target.value;
    schoolDashboard();
  });
  document.getElementById("application-status")?.addEventListener("change", (e) => {
    statusFilter = e.target.value;
    schoolDashboard();
  });
  document.querySelectorAll("[data-app-status]").forEach(
    (b) =>
      (b.onclick = () =>
        confirmAction(t("Set application to ", "تغيير الطلب إلى ") + state(b.dataset.next), () => {
          R.updateApplication(b.dataset.appStatus, b.dataset.next);
          schoolDashboard();
        })),
  );
  document.getElementById("match-job")?.addEventListener("change", (e) => {
    selectedJob = e.target.value;
    schoolDashboard();
  });
  document.getElementById("filter-teachers")?.addEventListener("click", () => {
    search = document.getElementById("teacher-search").value;
    subjectFilter = document.getElementById("teacher-subject").value;
    experienceFilter = document.getElementById("teacher-experience").value;
    qualificationFilter = document.getElementById("teacher-qualification").value;
    locationFilter = document.getElementById("teacher-location").value;
    schoolDashboard();
  });
  document.querySelectorAll("[data-interest]").forEach((button) =>
    button.addEventListener("click", () => {
      try {
        R.interest(button.dataset.interest);
        document.getElementById("recruit-errors").style.color = "var(--purple)";
        document.getElementById("recruit-errors").textContent = t(
          "Interest notification recorded locally.",
          "تم تسجيل إشعار الاهتمام محليًا.",
        );
      } catch (e) {
        report(e);
      }
    }),
  );
  O.hydrate();
}
function browseJobs() {
  const id = params.get("id");
  if (id) {
    jobDetail(id);
    return;
  }
  O.shell(
    t("Teaching opportunities", "فرص التدريس"),
    `<section class="hero"><h2>${t("Let your teaching open a new opportunity.", "خلّي تعليمك يفتح فرصة جديدة.")}</h2><p>${t("Discover schools looking for your skills.", "اكتشف المدارس التي تبحث عن مهاراتك.")}</p></section>${hint()}${jobFilters()}<div class="toolbar"><button class="btn soft" id="matching-only">${matchesOnly ? t("Show all jobs", "عرض كل الوظائف") : t("Show matching opportunities", "عرض الفرص المطابقة")}</button><a class="btn soft" href="../applications/applications.html">${t("My applications", "طلباتي")}</a></div><div class="grid" id="job-results"></div>`,
  );
  const results = () => {
    document.getElementById("job-results").innerHTML =
      R.listJobs()
        .filter(filterJobs)
        .map((j) => jobCard(j))
        .join("") ||
      `<p class="empty">${t("No open jobs match your search.", "لا توجد وظائف مفتوحة مطابقة للبحث.")}</p>`;
  };
  results();
  bindJobFilters(results);
  document.getElementById("matching-only").onclick = () => {
    matchesOnly = !matchesOnly;
    browseJobs();
  };
}
function jobDetail(id) {
  const j = R.getJob(id);
  if (!j) {
    O.shell(
      t("Job unavailable", "الوظيفة غير متاحة"),
      `<a class="btn" href="./jobs.html">${t("Browse opportunities", "تصفّح الفرص")}</a>`,
    );
    return;
  }
  const m = R.match(j, R.teacher()),
    existing = O.user.role === "teacher" ? R.applications(id)[0] : null;
  O.shell(
    esc(j.title),
    `<a class="btn soft" href="./jobs.html">← ${t("All opportunities", "كل الفرص")}</a><section class="hero recruit-hero"><div><h2>${esc(j.title)}</h2><p>${esc(j.school?.name || "")} · ${esc(j.location)}</p><span class="pill ${j.status}">${state(j.status)}</span></div>${j.school?.logo ? `<img data-asset="${esc(j.school.logo)}" alt="${t("School logo", "شعار المدرسة")}">` : ""}</section>${hint()}<div class="review-grid"><section class="card"><h2>${t("Responsibilities and requirements", "المهام والمتطلبات")}</h2><p class="job-description">${esc(j.description)}</p><p>${t("Subject", "التخصص")}: ${subject(j.subject)}</p><p>${t("Grade levels", "الصفوف")}: ${esc(j.grades.join("، ") || t("Not specified", "غير محددة"))}</p><p>${t("Experience", "الخبرة")}: ${j.experience} ${t("years minimum", "سنوات على الأقل")}</p><p>${t("Qualifications", "المؤهلات")}: ${esc(j.qualifications || t("Not specified", "غير محددة"))}</p><p>${t("Skills", "المهارات")}: ${esc(j.skills.join("، ") || t("Not specified", "غير محددة"))}</p><p>${t("Employment", "التوظيف")}: ${esc(employment(j.employment))} · ${j.remote ? t("Remote", "عن بعد") : t("On site", "في المدرسة")}</p><h2>${t("About the school", "عن المدرسة")}</h2><p>${esc(j.school?.description || "")}</p><p>${esc(j.school?.contact || "")}</p>${j.school?.website && /^https:\/\//.test(j.school.website) ? `<a href="${esc(j.school.website)}" target="_blank" rel="noopener noreferrer">${t("School website", "موقع المدرسة")} ↗</a>` : ""}${O.user.role === "teacher" ? (existing ? `<p class="pill ${existing.status}">${t("Your application", "طلبك")}: ${state(existing.status)}</p><a href="../applications/applications.html" class="btn soft">${t("Track application", "تابع الطلب")}</a>` : `<button class="btn" id="apply" ${j.status !== "published" ? "disabled" : ""}>${t("Apply using my Orbit profile", "قدّم بملفي المهني في ORBIT")}</button>`) : ""}</section><section class="card">${O.user.role === "teacher" ? `<h2>${t("Why this opportunity may match", "لماذا قد تناسبك الفرصة")}</h2>${reasons(m)}` : `<h2>${t("School opportunity", "فرصة المدرسة")}</h2><p>${t("Teacher applicants use their Orbit professional profile.", "المعلم يقدم باستخدام ملفه المهني في ORBIT.")}</p>`}</section></div>`,
  );
  document.getElementById("apply")?.addEventListener("click", () => {
    const p = R.teacher(),
      d = O.dialog(
        `<h2>${t("Apply to ", "التقديم إلى ")}${esc(j.school.name)}</h2><p>${esc(p.name)} · ${subject(p.subject)}</p><p>${esc(p.qualification || t("Complete your qualifications first", "أكمل مؤهلاتك أولًا"))}</p><form id="apply-form">${text("message", t("Optional cover letter", "رسالة تقديم اختيارية"))}<label><input name="consent" type="checkbox" required> ${t("I consent to share my teaching profile, selected CV and public teaching work with this school for this application.", "أوافق على مشاركة ملفي التعليمي والسيرة المختارة وأعمالي العامة مع هذه المدرسة لهذا الطلب.")}</label><p class="recruit-hint">${t("Account passwords and private classroom content are not shared. Your profile is captured at application time.", "لا تُشارك كلمات المرور أو محتويات الصفوف الخاصة. يُحفظ الملف كما كان وقت التقديم.")}</p><p class="error" role="status"></p><button class="btn">${t("Submit application", "إرسال الطلب")}</button></form>`,
      );
    d.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      try {
        const f = new FormData(e.target);
        R.apply(id, f.get("message"), f.has("consent"));
        d.close();
        jobDetail(id);
      } catch (ex) {
        report(ex, d.querySelector(".error"));
      }
    };
  });
}
function teacherApplications() {
  const apps = R.applications().filter((a) => !statusFilter || a.status === statusFilter);
  O.shell(
    t("My applications", "طلبات التوظيف"),
    `${hint()}<div class="toolbar"><a class="btn soft" href="../jobs/jobs.html">${t("Find opportunities", "ابحث عن فرص")}</a><select id="my-status-filter" aria-label="${t("Application status", "حالة الطلب")}">${statusOptions(statusFilter)}</select></div><div class="grid">${
      apps
        .map((a) => {
          const j = R.getJob(a.jobId),
            s = R.publicSchool(a.schoolId);
          return `<article class="card"><h2>${esc(j?.title || t("Job", "وظيفة"))}</h2><p>${esc(s?.name || "")}</p><span class="pill ${a.status}">${state(a.status)}</span><p>${esc(a.message)}</p><small>${new Date(a.createdAt).toLocaleDateString(O.prefs.lang === "en" ? "en-GB" : "ar-JO", { timeZone: "Asia/Amman" })}</small><p><a class="btn soft" href="../jobs/jobs.html?id=${a.jobId}">${t("View job", "شاهد الوظيفة")}</a></p>${!["withdrawn", "accepted", "rejected"].includes(a.status) ? `<button class="btn soft" data-withdraw="${a.id}">${t("Withdraw application", "سحب الطلب")}</button>` : ""}</article>`;
        })
        .join("") || `<p class="empty">${t("No applications match.", "لا توجد طلبات مطابقة.")}</p>`
    }</div>`,
  );
  document.getElementById("my-status-filter").onchange = (e) => {
    statusFilter = e.target.value;
    teacherApplications();
  };
  document.querySelectorAll("[data-withdraw]").forEach(
    (b) =>
      (b.onclick = () =>
        confirmAction(t("Withdraw this application?", "سحب هذا الطلب؟"), () => {
          R.updateApplication(b.dataset.withdraw, "withdrawn");
          teacherApplications();
        })),
  );
}
function notificationPage() {
  const notes = R.notifications();
  O.shell(
    t("Notifications", "الإشعارات"),
    `${hint()}<div class="toolbar"><button class="btn soft" id="read-all">${t("Mark all read", "تعليم الكل كمقروء")}</button><span>${notes.filter((n) => !n.read).length} ${t("unread", "غير مقروء")}</span></div>${notes.map((n) => `<article class="card notification ${n.read ? "" : "unread"}"><div><h2>${esc(t(n.en, n.ar))}</h2><time>${new Date(n.createdAt).toLocaleString(O.prefs.lang === "en" ? "en-GB" : "ar-JO", { timeZone: "Asia/Amman" })}</time></div><div><a class="btn soft" data-note-open="${n.id}" href="${esc(n.url)}">${t("Open", "فتح")}</a>${!n.read ? `<button class="btn soft" data-read="${n.id}">${t("Mark read", "تعليم كمقروء")}</button>` : ""}</div></article>`).join("") || `<p class="empty">${t("No notifications yet.", "لا توجد إشعارات بعد.")}</p>`}`,
  );
  document.getElementById("read-all").onclick = () => {
    R.readNotification();
    notificationPage();
  };
  document.querySelectorAll("[data-read]").forEach(
    (b) =>
      (b.onclick = () => {
        R.readNotification(b.dataset.read);
        notificationPage();
      }),
  );
  document
    .querySelectorAll("[data-note-open]")
    .forEach((a) => (a.onclick = () => R.readNotification(a.dataset.noteOpen)));
}
function registration() {
  O.shell(
    t("Register your school", "تسجيل مدرستك"),
    `<div class="register-wrap"><section class="hero"><h2>${t("Find your next inspiring teacher.", "ابحث عن معلمك الملهم القادم.")}</h2><p>${t("Create a dedicated school account and recruitment workspace.", "أنشئ حساب مدرسة ومساحة خاصة للتوظيف.")}</p></section>${hint()}<section class="card"><form id="school-register-form"><div class="form-grid">${field("name", t("School name", "اسم المدرسة"), "", "text", 'required maxlength="100"')}${field("email", t("School account email", "بريد حساب المدرسة"), "", "email", 'required autocomplete="username"')}${field("password", t("Password · at least 10 characters", "كلمة المرور · 10 أحرف على الأقل"), "", "password", 'required minlength="10" autocomplete="new-password"')}${field("confirmPassword", t("Confirm password", "تأكيد كلمة المرور"), "", "password", 'required minlength="10" autocomplete="new-password"')}${field("location", t("Location", "الموقع"), "", "text", "required")}${field("contact", t("Public contact information", "معلومات التواصل العامة"), "", "text", "required")}<label>${t("Type", "نوع المدرسة")}<select name="type"><option value="private">${t("Private", "خاصة")}</option><option value="public">${t("Public", "حكومية")}</option><option value="international">${t("International", "دولية")}</option></select></label>${field("levels", t("Education levels · comma-separated", "المراحل التعليمية · افصل بفواصل"), "", "text", "required")}${field("subjects", t("Subjects / specializations", "المواد / التخصصات"), "", "text", "required")}${field("website", t("Website · optional HTTPS", "الموقع الإلكتروني · HTTPS اختياري"), "", "url")}</div>${text("description", t("About your school", "نبذة عن المدرسة"))}<label>${t("Logo · optional, under 5 MB", "الشعار · اختياري، أقل من 5 MB")}<input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="error" role="status"></p><button class="btn">${t("Create school account", "إنشاء حساب المدرسة")}</button></form><p>${t("Already registered?", "مسجلة مسبقًا؟")} <a class="btn soft" href="../school-login/school-login.html">${t("School login", "دخول المدرسة")}</a></p></section></div>`,
  );
  document.querySelector(".bar .logo").href = "../hompage/hompage.html";
  document.querySelector(".bar nav").innerHTML =
    '<a href="../hompage/hompage.html">' +
    t("Home", "الرئيسية") +
    '</a><a href="../school-login/school-login.html">' +
    t("School login", "دخول المدرسة") +
    "</a>";
  document.getElementById("school-register-form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("button[type=submit],button:not([type])"),
      error = e.target.querySelector(".error"),
      v = Object.fromEntries(new FormData(e.target));
    if (v.password !== v.confirmPassword) {
      error.textContent = t("Passwords do not match.", "كلمتا المرور غير متطابقتين.");
      return;
    }
    button.disabled = true;
    button.textContent = t("Creating account…", "جاري إنشاء الحساب…");
    try {
      const file = e.target.logoFile.files[0];
      if (file) v.logo = await imageAsset(file);
      await R.registerSchool(v, v.password);
      location.href = "../school-login/school-login.html?registered=1";
    } catch (ex) {
      report(ex, error);
    } finally {
      button.disabled = false;
      button.textContent = t("Create school account", "إنشاء حساب المدرسة");
    }
  };
}
const page = location.pathname;
try {
  if (page.includes("/school-dashboard/")) schoolDashboard();
  else if (page.includes("/school-registration/")) registration();
  else if (page.includes("/notifications/")) notificationPage();
  else if (page.includes("/applications/")) teacherApplications();
  else browseJobs();
} catch (e) {
  O.shell(t("Unable to open this page", "تعذّر فتح الصفحة"), hint());
  report(e);
}
