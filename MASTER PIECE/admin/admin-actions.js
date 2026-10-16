(() => {
  "use strict";
  const U = AdminUI,
    { S, A, app, state, t, esc, icon, role, badge, date, person, button, toast, failure } = U;
  let returnFocus;
  function dialog(title, body, submitLabel, onSubmit) {
    returnFocus = document.activeElement;
    const modal = document.createElement("dialog");
    modal.className = "admin-dialog";
    modal.innerHTML = `<form><header><h2>${title}</h2><button type="button" class="dialog-close" aria-label="${t("Close", "إغلاق")}">${icon("close")}</button></header><div class="dialog-body">${body}</div><p class="form-error" role="alert"></p><footer><button type="button" class="button secondary dialog-cancel">${t("Cancel", "إلغاء")}</button>${submitLabel ? `<button class="button primary" type="submit">${submitLabel}</button>` : ""}</footer></form>`;
    document.body.append(modal);
    modal.querySelector(".dialog-close").onclick = modal.querySelector(".dialog-cancel").onclick =
      () => modal.close();
    modal.addEventListener("close", () => {
      modal.remove();
      returnFocus?.isConnected
        ? returnFocus.focus()
        : document.querySelector(".page-heading h1")?.focus();
    });
    modal.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const submit = modal.querySelector("[type=submit]");
      if (submit) {
        submit.disabled = true;
        submit.setAttribute("aria-busy", "true");
      }
      try {
        S.guard();
        await onSubmit(new FormData(e.target));
        modal.close();
        U.layout();
        toast(t("Changes saved.", "تم حفظ التغييرات."));
      } catch (error) {
        modal.querySelector(".form-error").textContent = failure(error);
        if (error.message === "ADMIN_REQUIRED") {
          modal.close();
          gate();
        }
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.removeAttribute("aria-busy");
        }
      }
    };
    modal.showModal();
    hydratePhotos();
    return modal;
  }
  function profileDialog(id) {
    const u = S.userRows().find((u) => u.email === id);
    if (!u) throw Error("ACCOUNT_NOT_FOUND");
    const jobs = u.role === "school" ? S.jobs().filter((j) => j.schoolId === u.email) : [];
    dialog(
      t("Account details", "تفاصيل الحساب"),
      `<div class="profile-summary">${person(u)}${badge(u.status)}</div><dl class="profile-facts"><div><dt>${t("Role", "الدور")}</dt><dd>${role(u.role)}</dd></div><div><dt>${t("Registered", "التسجيل")}</dt><dd>${date(u.createdAt)}</dd></div><div><dt>${t("Last profile update", "آخر تعديل للملف")}</dt><dd>${date(u.updatedAt)}</dd></div>${u.role === "school" ? `<div><dt>${t("School type", "نوع المدرسة")}</dt><dd>${esc(u.schoolType || t("Not recorded", "غير مسجل"))}</dd></div><div><dt>${t("Educational levels", "المراحل التعليمية")}</dt><dd>${esc(u.levels.join(" · ") || t("Not recorded", "غير مسجل"))}</dd></div><div><dt>${t("Subjects", "المواد")}</dt><dd>${esc(u.subjects.join(" · ") || t("Not recorded", "غير مسجل"))}</dd></div>${/^https:\/\//i.test(u.website) ? `<div><dt>${t("Website", "الموقع الإلكتروني")}</dt><dd><a href="${esc(u.website)}" target="_blank" rel="noopener noreferrer">${esc(u.website)} ↗</a></dd></div>` : ""}` : ""}${u.role === "teacher" ? `<div><dt>${t("Qualification", "المؤهل")}</dt><dd>${esc(u.qualification || t("Not recorded", "غير مسجل"))}</dd></div><div><dt>${t("Experience in years", "سنوات الخبرة")}</dt><dd>${esc(u.experience ?? t("Not recorded", "غير مسجل"))}</dd></div>` : ""}${u.subject ? `<div><dt>${t("Subject", "التخصص")}</dt><dd>${esc(u.subject)}</dd></div>` : ""}</dl><div class="admin-form"><label>${t("Full name", "الاسم الكامل")}<input name="name" required maxlength="100" value="${esc(u.name)}" ${u.status === "deleted" ? "disabled" : ""}></label>${u.role !== "admin" ? `<label>${t("Location / address", "الموقع / العنوان")}<input name="location" maxlength="200" value="${esc(u.location)}" ${u.role === "school" ? "required" : ""} ${u.status === "deleted" ? "disabled" : ""}></label><label>${t("Contact", "التواصل")}<input name="contact" maxlength="200" value="${esc(u.contact)}" ${u.role === "school" ? "required" : ""} ${u.status === "deleted" ? "disabled" : ""}></label>` : ""}</div>${u.bio ? `<p class="muted">${esc(u.bio)}</p>` : ""}${u.role === "school" ? `<h3>${t("School job postings", "وظائف المدرسة")}</h3>${jobs.length ? `<ul>${jobs.map((j) => `<li>${esc(j.title)} · ${badge(j.status)}</li>`).join("")}</ul>` : `<p class="muted">${t("No jobs posted.", "لا توجد وظائف.")}</p>`}` : ""}${u.status !== "deleted" && u.email !== A.current().email ? `<div class="danger-zone"><strong>${t("Remove account access", "حذف أهلية الحساب")}</strong><p>${t("Linked records are retained. Type the exact email to confirm.", "تُحفظ السجلات المرتبطة. اكتب البريد نفسه للتأكيد.")}</p>${button(t("Archive account", "حذف أهلية الحساب"), "archive", u.email, "danger-outline")}</div>` : ""}`,
      u.status === "deleted" ? null : t("Save profile", "حفظ الملف"),
      (data) => S.updateProfile(id, Object.fromEntries(data), u.revision),
    );
  }
  async function hydratePhotos() {
    for (const el of document.querySelectorAll("[data-photo]")) {
      if (el.dataset.loaded) continue;
      el.dataset.loaded = "true";
      try {
        const key = el.dataset.photo;
        let url = "";
        if (/^https:\/\//.test(key)) url = key;
        else {
          const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open("orbit-media-v1", 1);
            req.onupgradeneeded = () => {
              if (!req.result.objectStoreNames.contains("videos"))
                req.result.createObjectStore("videos");
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
          const blob = await new Promise((resolve, reject) => {
            const r = db.transaction("videos").objectStore("videos").get(key);
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
          });
          db.close();
          if (blob instanceof Blob) url = URL.createObjectURL(blob);
        }
        if (url && el.isConnected) {
          const image = document.createElement("img");
          image.alt = t("Profile photo", "الصورة الشخصية");
          image.src = url;
          image.onload = () => {
            if (url.startsWith("blob:")) URL.revokeObjectURL(url);
          };
          image.onerror = () => {
            if (url.startsWith("blob:")) URL.revokeObjectURL(url);
            image.remove();
          };
          el.prepend(image);
        } else if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      } catch {}
    }
  }
  function exportReport() {
    S.guard();
    const rows = [
        ["name", "email", "role", "status", "registered_at"],
        ...S.userRows().map((u) => [u.name, u.email, u.role, u.status, u.createdAt || ""]),
      ],
      clean = (value) =>
        '"' +
        String(value)
          .replace(/^[=+@-]/, "'$&")
          .replace(/"/g, '""') +
        '"',
      csv = "\ufeff" + rows.map((row) => row.map(clean).join(",")).join("\r\n"),
      url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "orbit-account-report.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(t("Report exported.", "تم تصدير التقرير."));
  }
  function gate() {
    document.querySelectorAll(".admin-dialog").forEach((d) => d.remove());
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === "ar" ? "rtl" : "ltr";
    const exists = (A.get("orbit.recruitment.v1", {}).accounts || []).some(
        (a) => a.role === "admin",
      ),
      local = isSecureContext && ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
    app.innerHTML = `<main class="access-page"><div class="access-orbit" aria-hidden="true">${icon("orbit")}</div><section class="access-card"><span class="eyebrow">ORBIT CONTROL</span><h1>${exists ? t("Administrator access", "دخول الإدارة") : t("Set up local administration", "إعداد الإدارة المحلية")}</h1><p>${t("A browser-local prototype. It is not production-secure and grants no server permissions.", "نموذج محلي داخل المتصفح؛ لا يمثل أمانًا للإنتاج ولا يمنح صلاحيات خادم.")}</p>${!exists && local ? `<form id="admin-setup" class="admin-form"><label>${t("Administrator name", "اسم المدير")}<input name="name" required maxlength="100" autocomplete="name"></label><label>${t("Email", "البريد")}<input name="email" type="email" required autocomplete="username"></label><label>${t("Password · 12+ characters, letters and digits", "كلمة مرور · 12 حرفًا على الأقل، بحروف وأرقام")}<input name="password" type="password" required minlength="12" autocomplete="new-password"></label><label>${t("Confirm password", "تأكيد كلمة المرور")}<input name="confirm" type="password" required minlength="12" autocomplete="new-password"></label><label class="checkbox-label"><input type="checkbox" required>${t("I understand that device owners can modify local data.", "أفهم أن مالك الجهاز يستطيع تعديل البيانات المحلية.")}</label><button class="button primary">${t("Create local administrator", "إنشاء المدير المحلي")}</button><p class="form-error" role="alert"></p></form>` : `<p>${exists ? t("Use administrator credentials created on this browser. Ordinary accounts cannot access this dashboard.", "استخدم بيانات المدير المنشأ في هذا المتصفح. الحسابات العادية لا تملك دخول اللوحة.") : t("Setup is available on localhost only. Hosted administration needs a backend-provisioned administrator.", "الإعداد متاح على localhost فقط. الإدارة المنشورة تحتاج مديرًا يُنشأ عبر الخادم.")}</p><a class="button primary" href="../login/login.html?next=${encodeURIComponent("/admin/admin.html")}">${t("Open sign in", "فتح تسجيل الدخول")}</a>`}${A.current()?.email ? `<button class="button secondary" id="access-signout" type="button">${t("Sign out of current account", "الخروج من الحساب الحالي")}</button>` : ""}<a class="access-home" href="../hompage/hompage.html">← ${t("Return to The Learning Orbit", "العودة إلى The Learning Orbit")}</a></section></main>`;
    document.getElementById("access-signout")?.addEventListener("click", () => A.logout());
    document.getElementById("admin-setup")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target,
        data = Object.fromEntries(new FormData(form)),
        submit = form.querySelector("button");
      form.querySelector(".form-error").textContent = "";
      if (data.password !== data.confirm) {
        form.querySelector(".form-error").textContent = t(
          "Passwords do not match.",
          "كلمتا المرور غير متطابقتين.",
        );
        return;
      }
      submit.disabled = true;
      try {
        await OrbitRecruitment.provisionLocalAdmin(data, data.password);
        const user = await OrbitRecruitment.authenticate(data.email, data.password);
        A.startSession(user);
        form.reset();
        S.recordSession();
        location.hash = "overview";
        U.route();
      } catch (error) {
        form.querySelector(".form-error").textContent = failure(error);
      } finally {
        submit.disabled = false;
      }
    });
  }
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target || target.disabled) return;
    const action = target.dataset.action,
      id = target.dataset.id,
      next = target.dataset.next;
    try {
      S.guard();
      if (action === "refresh") {
        U.route();
        return;
      }
      if (action === "menu") {
        document.body.classList.add("menu-open");
        target.setAttribute("aria-expanded", "true");
        document.querySelector(".admin-sidebar a").focus();
        return;
      }
      if (action === "close-menu") {
        document.body.classList.remove("menu-open");
        document.querySelector(".menu-toggle")?.setAttribute("aria-expanded", "false");
        return;
      }
      if (action === "language") {
        state.language = state.language === "ar" ? "en" : "ar";
        A.set("orbit.admin.preferences", { lang: state.language });
        U.layout();
        return;
      }
      if (action === "logout") {
        dialog(
          t("Sign out of administration?", "تسجيل الخروج من الإدارة؟"),
          `<p>${t("Your administrative session will end.", "ستنتهي جلسة الإدارة.")}</p>`,
          t("Sign out", "تسجيل الخروج"),
          () => A.logout(),
        );
        return;
      }
      if (action === "profile") {
        profileDialog(id);
        return;
      }
      if (action === "account-status") {
        dialog(
          t("Confirm account status change", "تأكيد تغيير حالة الحساب"),
          `<p>${esc(id)}</p><p>${next === "suspended" ? t("Sign-in will be blocked. Existing sessions are revoked on their next access check.", "سيُمنع الدخول وتُنهى الجلسات الحالية عند فحص الصلاحية التالي.") : t("Account access will be restored.", "ستعود صلاحية دخول الحساب.")}</p><label class="checkbox-label"><input type="checkbox" required>${t("I confirm this change.", "أؤكد هذا التغيير.")}</label>`,
          next === "suspended"
            ? t("Suspend account", "تعليق الحساب")
            : t("Activate account", "تفعيل الحساب"),
          () => S.setAccountStatus(id, next),
        );
        return;
      }
      if (action === "archive") {
        document.querySelector(".admin-dialog")?.close();
        dialog(
          t("Archive this account?", "حذف أهلية هذا الحساب؟"),
          `<p>${t("Sign-in is removed. Linked records are retained. This is not permanent erasure.", "يُمنع الدخول وتُحفظ السجلات المرتبطة. هذا ليس محوًا نهائيًا.")}</p><label>${t("Type the exact email", "اكتب البريد نفسه")}<input name="confirmation" required autocomplete="off" placeholder="${esc(id)}"></label>`,
          t("Archive account", "حذف أهلية الحساب"),
          (data) => S.deleteAccount(id, data.get("confirmation")),
        );
        return;
      }
      if (action === "school-review") {
        dialog(
          next === "approved"
            ? t("Approve school request", "قبول طلب المدرسة")
            : t("Reject school request", "رفض طلب المدرسة"),
          `<p>${next === "approved" ? t("Approval enables school access.", "القبول يفعّل دخول المدرسة.") : t("Rejection suspends school access.", "الرفض يعلّق دخول المدرسة.")}</p><label>${t("Review reason", "سبب القرار")}<textarea name="reason" required maxlength="500"></textarea></label>`,
          t("Confirm decision", "تأكيد القرار"),
          (data) => S.reviewSchool(id, next, data.get("reason")),
        );
        return;
      }
      if (action === "job-details") {
        const job = S.jobs().find((j) => j.id === id);
        if (!job) throw Error("JOB_NOT_FOUND");
        dialog(
          esc(job.title),
          `<div class="profile-summary">${badge(job.status)}<span>${esc(job.schoolName)}</span></div><dl><div><dt>${t("Subject", "المادة")}</dt><dd>${esc(job.subject)}</dd></div><div><dt>${t("Location", "الموقع")}</dt><dd>${esc(job.location)}</dd></div><div><dt>${t("Employment", "نوع الدوام")}</dt><dd>${esc(job.employment)}</dd></div><div><dt>${t("Experience", "الخبرة")}</dt><dd>${esc(job.experience)}</dd></div></dl><h3>${t("Qualifications", "المؤهلات")}</h3><p>${esc(job.qualifications || t("Not recorded", "غير مسجل"))}</p><h3>${t("Description", "الوصف")}</h3><p class="preserve-lines">${esc(job.description || t("Not recorded", "غير مسجل"))}</p>`,
          null,
        );
        return;
      }
      if (action === "application-details") {
        const application = S.applications().find((a) => a.id === id);
        if (!application) throw Error("NOT_FOUND");
        dialog(
          t("Submitted application", "طلب التوظيف المرسل"),
          `<div class="profile-summary">${esc(application.profile?.name || application.teacherId)}${badge(application.status)}</div><dl><div><dt>${t("Teacher email", "بريد المعلم")}</dt><dd>${esc(application.teacherId)}</dd></div><div><dt>${t("Submitted", "تاريخ الإرسال")}</dt><dd>${date(application.createdAt)}</dd></div><div><dt>${t("Qualification at submission", "المؤهل عند الإرسال")}</dt><dd>${esc(application.profile?.qualification || t("Not recorded", "غير مسجل"))}</dd></div></dl><h3>${t("Message", "الرسالة")}</h3><p class="preserve-lines">${esc(application.message || t("No message", "دون رسالة"))}</p><p>${t("Hiring decisions remain with the school.", "قرارات التوظيف تبقى لدى المدرسة.")}</p>`,
          null,
        );
        return;
      }
      if (action === "job-status") {
        const job = S.jobs().find((j) => j.id === id);
        dialog(
          t("Change job status", "تغيير حالة الوظيفة"),
          `<p>${esc(job.title)}</p><label>${t("Status", "الحالة")}<select name="status">${["draft", "published", "closed"].map((value) => `<option value="${value}" ${job.status === value ? "selected" : ""}>${U.status(value)}</option>`).join("")}</select></label>`,
          t("Save status", "حفظ الحالة"),
          (data) => S.setJobStatus(id, data.get("status")),
        );
        return;
      }
      if (action === "post-status") {
        dialog(
          t("Confirm content visibility", "تأكيد ظهور المحتوى"),
          `<p>${next === "hidden" ? t("The publication will be hidden from channel feeds; content is retained.", "سيُحجب المنشور عن القنوات مع الاحتفاظ بمحتواه.") : t("The publication will be visible again.", "سيظهر المنشور مجددًا.")}</p>`,
          t("Confirm", "تأكيد"),
          () => S.setPostStatus(id, next),
        );
        return;
      }
      if (action === "resolve-report") {
        dialog(
          t("Resolve report", "معالجة البلاغ"),
          `<label>${t("Result", "النتيجة")}<select name="status"><option value="resolved">${t("Resolved", "عولج")}</option><option value="dismissed">${t("Dismissed", "أُغلق")}</option></select></label>`,
          t("Save", "حفظ"),
          (data) => S.resolveReport(id, data.get("status")),
        );
        return;
      }
      if (action === "mark-read") {
        S.markRead(id);
        U.layout();
        return;
      }
      if (action === "previous-page" || action === "next-page") {
        U.getFilter().page += action === "next-page" ? 1 : -1;
        U.renderUsersTable();
        return;
      }
      if (action === "export") exportReport();
    } catch (error) {
      toast(failure(error), true);
      if (error.message === "ADMIN_REQUIRED") gate();
    }
  });
  document.addEventListener("input", (e) => {
    try {
      if (e.target.dataset.filter) {
        const f = U.getFilter();
        f[e.target.dataset.filter] = e.target.value;
        f.page = 1;
        U.renderUsersTable();
      }
      if (e.target.dataset.logFilter) {
        const query = document.querySelector("[data-log-filter=query]").value.toLowerCase(),
          action = document.querySelector("[data-log-filter=action]").value,
          from = document.querySelector("[data-log-filter=from]").value;
        document.getElementById("log-results").innerHTML = U.logList(
          S.logs().filter(
            (row) =>
              (!action || row.action === action) &&
              (!from || row.at.slice(0, 10) >= from) &&
              [row.target, row.actor, row.action, U.actionLabel(row.action)].some((s) =>
                String(s).toLowerCase().includes(query),
              ),
          ),
        );
      }
    } catch (error) {
      toast(failure(error), true);
    }
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "settings-form") return;
    e.preventDefault();
    try {
      S.saveSettings(Object.fromEntries(new FormData(e.target)));
      toast(t("Preferences saved.", "تم حفظ التفضيلات."));
    } catch (error) {
      e.target.querySelector(".form-error").textContent = failure(error);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (!document.body.classList.contains("menu-open")) return;
    if (e.key === "Escape") {
      document.body.classList.remove("menu-open");
      document.querySelector(".menu-toggle")?.focus();
    }
    if (e.key === "Tab") {
      const nodes = [...document.querySelectorAll(".admin-sidebar a,.admin-sidebar button")];
      if (e.shiftKey && document.activeElement === nodes[0]) {
        e.preventDefault();
        nodes.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
        e.preventDefault();
        nodes[0]?.focus();
      }
    }
  });
  Object.assign(U, { gate, dialog, hydratePhotos });
  window.addEventListener("hashchange", () => {
    document.body.classList.remove("menu-open");
    U.route();
  });
  window.addEventListener("storage", (e) => {
    if (e.key?.startsWith("orbit.")) U.route();
  });
  window.addEventListener("pageshow", () => {
    try {
      S.guard();
    } catch {
      gate();
    }
  });
  window.addEventListener("pagehide", () =>
    document.querySelectorAll(".admin-dialog").forEach((d) => d.remove()),
  );
  setInterval(() => {
    if (!document.querySelector(".admin-main")) return;
    try {
      S.guard();
    } catch {
      gate();
    }
  }, 60000);
  U.route();
})();
