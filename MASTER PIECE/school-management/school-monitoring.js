(() => {
  "use strict";
  const S = window.OrbitSchoolMonitoring;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  let refreshView;
  for (const name of ["storage", "orbit:assignments-change", "orbit:school-academics-change", "orbit:school-monitoring-change"]) window.addEventListener(name, () => refreshView?.());
  function mount(host, t) {
    let view, filters = { classId: "", subjectId: "", teacherId: "", channelId: "" }, root;
    const ar = document.documentElement.lang === "ar";
    const name = (r) => ar ? r.nameAr || r.name : r.name;
    const num = (n) => n === null ? t("Unavailable", "غير متاح") : n.toLocaleString(ar ? "ar-JO" : "en-GB");
    const className = (c) => c ? `${t("Grade", "الصف")} ${c.grade} / ${c.section} · ${c.academicYear}${c.status === "archived" ? ` · ${t("Archived", "مؤرشف")}` : ""}` : t("Not linked", "غير مرتبط");
    const state = (s) => ({ linked: t("Linked", "مرتبط"), unlinked: t("Not linked", "غير مرتبط"), archived: t("Archived academic record", "سجل أكاديمي مؤرشف"), "missing-record": t("Academic link needs repair", "الرابط الأكاديمي يحتاج تصحيحًا"), "owner-mismatch": t("Teacher mapping needs repair", "ربط المعلم يحتاج تصحيحًا") })[s];
    const errors = {
      INVALID_DATA: t("Saved data is invalid or unreadable. It has not been replaced. Check browser storage before refreshing.", "البيانات المحفوظة غير صالحة أو غير مقروءة. لم تُستبدل. تحقق من تخزين المتصفح قبل التحديث."),
      STORAGE_FAILED: t("Browser storage is unavailable or full. No changes were saved.", "تخزين المتصفح غير متاح أو ممتلئ. لم تُحفظ التغييرات."),
      CHANNEL_SCOPE: t("Only unambiguous channels explicitly owned by this school can be linked.", "يمكن ربط القنوات المرتبطة صراحة بهذه المدرسة وذات المعرّفات غير الملتبسة فقط."),
      INVALID_ALLOCATION: t("Choose an active class and subject with an existing teaching assignment in Subjects.", "اختر صفًا ومادة نشطين لهما توزيع تدريس موجود في قسم المواد."),
      OWNER_MISMATCH: t("Explicitly map the allocated academic teacher to this channel owner's account ID first.", "اربط المعلم الأكاديمي الموزع بمعرّف حساب مالك هذه القناة صراحة أولًا."),
      INVALID_MAPPING: t("Choose a current academic record and an account ID observed in this school's channels.", "اختر سجلًا أكاديميًا حاليًا ومعرّف حساب موجودًا ضمن قنوات هذه المدرسة."),
      DUPLICATE_MAPPING: t("This account ID is already mapped to another academic record.", "معرّف الحساب مرتبط بالفعل بسجل أكاديمي آخر."),
      STALE_DATA: t("Records changed. Close this dialog, refresh, and try again.", "تغيرت السجلات. أغلق النافذة وحدّث القائمة وحاول مجددًا."),
      SCHOOL_CHANGED: t("The school account changed. Reload before continuing.", "تغير حساب المدرسة. أعد التحميل قبل المتابعة."),
      NOT_FOUND: t("The link no longer exists. Refresh the dashboard.", "لم يعد الرابط موجودًا. حدّث لوحة المتابعة."),
      ROLE_DENIED: t("A school account is required.", "يلزم حساب مدرسة."),
    };
    const errorText = (e) => errors[e.message] || t("Data is unavailable. Refresh and try again.", "البيانات غير متاحة. حدّث الصفحة وحاول مجددًا.");
    const option = (id, text, selected = "") => `<option value="${esc(id)}" ${id === selected ? "selected" : ""}>${esc(text)}</option>`;
    function table(headers, rows, caption) {
      return `<div class="sm-table-scroll" tabindex="0" role="region" aria-label="${caption}"><table class="sm-academic-table"><caption>${caption}</caption><thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
    }
    function draw(message = "") {
      try { view = S.report(filters); }
      catch (e) { host.innerHTML = `<h2 id="sm-section-title" tabindex="-1">${t("Academic Monitoring", "المتابعة الأكاديمية")}</h2><p role="alert" class="sm-error">${errorText(e)}</p>`; return; }
      host.innerHTML = `<div data-monitoring-root><div class="sm-section-heading"><h2 id="sm-section-title" tabindex="-1">${t("Academic Monitoring", "المتابعة الأكاديمية")}</h2><button class="btn soft" data-monitor-refresh>${t("Refresh activity", "تحديث النشاط")}</button></div><p class="sm-academic-note">${t("Educational counts below come from saved school-owned channels, excluding sample posts. Class and subject links use academic demo records. No assignment answers, attachments, grades or history are shown.", "تأتي الأعداد التعليمية أدناه من قنوات المدرسة المحفوظة مع استبعاد المنشورات التجريبية. تستخدم روابط الصفوف والمواد السجلات الأكاديمية التجريبية. لا تُعرض إجابات الواجبات أو المرفقات أو الدرجات أو السجل السابق.")}</p><p class="sm-academic-note">${t("Progress is a current-roster snapshot, not historical enrollment or attendance. It requires every enrolled class student to be explicitly mapped and currently in the channel. Membership never adds school students automatically. Overdue means currently missing after a known deadline, using this device's time zone. Unavailable totals are never treated as zero.", "التقدم ملخص للتسجيل الحالي وليس سجلًا تاريخيًا للتسجيل أو الحضور. يتطلب ربط كل طالب مسجل في الصف صراحة ووجوده حاليًا في القناة. لا تضيف عضوية القناة طلابًا للمدرسة تلقائيًا. المتأخر هو التسليم المفقود بعد موعد معروف حسب المنطقة الزمنية لهذا الجهاز. لا تُعامل الأعداد غير المتاحة كصفر.")}</p><div class="sm-academic-tools">${[
        ["classId", t("Class", "الصف"), view.options.classes.map((c) => ({ id: c.id, name: className(c) }))],
        ["subjectId", t("Subject", "المادة"), view.options.subjects],
        ["teacherId", t("Teacher", "المعلم"), view.options.teachers],
        ["channelId", t("Channel", "القناة"), view.options.channels],
      ].map(([key, title, items]) => `<label>${title}<select data-monitor-filter="${key}">${option("", t("All", "الكل"))}${items.map((r) => option(r.id, name(r), filters[key])).join("")}</select></label>`).join("")}</div><p role="status" data-monitor-feedback>${esc(message)}</p><dl class="sm-totals sm-monitor-totals">${[
        ["channels", "School channels", "قنوات المدرسة"], ["lessons", "Lessons & videos", "الدروس والفيديوهات"], ["assignments", "Assignments", "الواجبات"], ["submitted", "Submitted", "المسلّم"], ["reviewed", "Reviewed", "المراجع"], ["missing", "Missing now", "المفقود حاليًا"], ["overdue", "Overdue now", "المتأخر حاليًا"],
      ].map(([key, en, arabic]) => `<div><dt>${t(en, arabic)}</dt><dd data-monitor-total="${key}">${num(view.totals[key])}</dd></div>`).join("")}</dl>${view.rows.length ? table([
        t("Channel / owner account ID", "القناة / معرّف حساب المالك"), t("Class / subject", "الصف / المادة"), t("Responsible academic teacher", "المعلم الأكاديمي المسؤول"), t("Link / progress status", "حالة الرابط / التقدم"), t("Lessons / assignments", "الدروس / الواجبات"), t("Submitted / reviewed", "المسلّم / المراجع"), t("Missing / overdue", "المفقود / المتأخر"), t("Actions", "الإجراءات"),
      ], view.rows.map((r) => `<tr data-monitor-channel="${esc(r.channelId)}"><th scope="row">${esc(name(r))}<small class="sm-monitor-owner"><bdi>${esc(r.ownerId)}</bdi></small></th><td>${esc(className(r.classroom))}<br>${esc(r.subject?.name || t("Not linked", "غير مرتبط"))}</td><td>${esc(r.teacherName || t("Not linked", "غير مرتبط"))}</td><td>${state(r.status)}<br><small>${r.progress === "current-roster" ? t("Current mapped roster", "التسجيل الحالي المرتبط") : r.progress === "incomplete-roster" ? t("Roster mappings / channel enrollment incomplete", "ربط التسجيل أو عضوية القناة غير مكتمل") : t("Progress unavailable", "التقدم غير متاح")}</small></td><td>${num(r.lessons)} / ${num(r.assignments)}</td><td>${num(r.submitted)} / ${num(r.reviewed)}</td><td>${num(r.missing)} / ${num(r.overdue)}</td><td><div class="sm-row-actions"><button class="btn soft" data-monitor-link="${esc(r.channelId)}">${t("Link class & subject", "ربط الصف والمادة")}</button>${r.linkId ? `<button class="btn soft" data-monitor-remove="links" data-id="${esc(r.linkId)}">${t("Unlink", "إلغاء الربط")}</button>` : ""}</div></td></tr>`), t("School educational activity", "النشاط التعليمي للمدرسة")) : `<p class="sm-empty">${t("No school-owned channels match. Channels need an explicit schoolId; personal channels are never included.", "لا توجد قنوات مدرسية مطابقة. تحتاج القنوات إلى schoolId صريح؛ ولا تُدرج القنوات الشخصية أبدًا.")}</p>`}${view.rows.length && !view.totals.assignments ? `<p class="sm-academic-note">${t("No saved assignments in these channels. No assignments are generated by monitoring.", "لا توجد واجبات محفوظة في هذه القنوات. لا تُنشئ المتابعة أي واجبات.")}</p>` : ""}<details class="sm-mapping-panel"><summary>${t("Explicit account-ID mappings", "ربط معرّفات الحسابات صراحة")}</summary><p class="sm-academic-note">${t("Choose an academic demo record and an exact existing account ID. Candidate IDs come only from this school's channels; selecting one is an explicit reporting association, not enrollment or identity verification. Nothing is matched by name or email.", "اختر سجلًا أكاديميًا تجريبيًا ومعرّف حساب موجودًا بعينه. تأتي المعرّفات المرشحة من قنوات هذه المدرسة فقط؛ واختيار أحدها ربط صريح للتقارير، وليس تسجيلًا أو تحققًا من الهوية. لا تُطابق الأسماء أو عناوين البريد تلقائيًا.")}</p><button class="btn" data-monitor-map>${t("Map an account ID", "ربط معرّف حساب")}</button>${view.mappings.length ? table([t("Academic record", "السجل الأكاديمي"), t("Role", "الدور"), t("Account ID", "معرّف الحساب"), t("Actions", "الإجراءات")], view.mappings.map((m) => `<tr><th scope="row">${esc(m.recordName || t("Missing academic record", "سجل أكاديمي مفقود"))}</th><td>${m.role === "teachers" ? t("Teacher", "معلم") : t("Student", "طالب")}</td><td><bdi>${esc(m.accountId)}</bdi></td><td><button class="btn soft" data-monitor-remove="mappings" data-id="${esc(m.id)}">${t("Remove mapping", "إزالة الربط")}</button></td></tr>`), t("Local reporting mappings", "روابط التقارير المحلية")) : `<p>${t("No account mappings. No identities are inferred.", "لا توجد روابط حسابات. لا تُستنتج أي هويات.")}</p>`}</details></div>`;
      root = host.querySelector("[data-monitoring-root]");
      host.querySelectorAll("[data-monitor-filter]").forEach((el) => el.onchange = () => { filters[el.dataset.monitorFilter] = el.value; draw(); });
    }
    function modal(type, channelId = "", removeId = "", trigger) {
      let snapshot;
      try { snapshot = S.report(); } catch (e) { draw(errorText(e)); return; }
      const dialog = document.createElement("dialog");
      dialog.className = "sm-academic-dialog";
      dialog.setAttribute("aria-labelledby", "sm-monitor-dialog-title");
      const removal = type === "links" || type === "mappings";
      const title = removal ? t("Remove reporting link", "إزالة رابط التقرير") : type === "map" ? t("Map an account ID", "ربط معرّف حساب") : t("Link channel to academics", "ربط القناة بالسجلات الأكاديمية");
      const current = snapshot.rows.find((r) => r.channelId === channelId);
      dialog.innerHTML = `<form><h2 id="sm-monitor-dialog-title">${title}</h2>${removal ? `<p>${t("Only this reporting association will be removed. Academic, channel and assignment records stay unchanged.", "سيُزال ارتباط التقرير هذا فقط. تبقى سجلات الأكاديميات والقنوات والواجبات دون تغيير.")}</p>` : type === "map" ? `<label>${t("Role", "الدور")}<select name="role">${option("teachers", t("Teacher", "معلم"))}${option("students", t("Student", "طالب"))}</select></label><label>${t("Academic demo record", "السجل الأكاديمي التجريبي")}<select name="academicId" required></select></label><label>${t("Existing account ID", "معرّف الحساب الموجود")}<select name="accountId" required></select></label><p>${t("Select explicitly; no automatic identity matching.", "اختر صراحة؛ لا توجد مطابقة تلقائية للهوية.")}</p>` : `<p>${esc(current ? name(current) : channelId)}</p><label>${t("Active class", "الصف النشط")}<select name="classId" required>${option("", t("Choose", "اختر"))}${snapshot.options.classes.filter((c) => c.status === "active").map((c) => option(c.id, className(c), current?.classId)).join("")}</select></label><label>${t("Active subject", "المادة النشطة")}<select name="subjectId" required>${option("", t("Choose", "اختر"))}${snapshot.options.subjects.filter((s) => s.status === "active").map((s) => option(s.id, s.name, current?.subjectId)).join("")}</select></label><p>${t("The class/subject must already have a teacher assigned in Subjects. Map that teacher explicitly to the channel owner before linking.", "يجب أن يكون للصف والمادة معلم موزع مسبقًا في قسم المواد. اربط ذلك المعلم صراحة بمالك القناة قبل الربط.")}</p>`}<p class="sm-error" role="alert" data-monitor-error tabindex="-1"></p><div class="sm-dialog-actions"><button type="submit" class="btn">${removal ? t("Remove", "إزالة") : t("Save link", "حفظ الرابط")}</button><button type="button" class="btn soft" data-monitor-cancel>${t("Cancel", "إلغاء")}</button></div></form>`;
      document.getElementById("orbit-page").append(dialog);
      if (type === "map") {
        const update = () => {
          const role = dialog.querySelector('[name="role"]').value;
          dialog.querySelector('[name="academicId"]').innerHTML = option("", t("Choose", "اختر")) + snapshot.options[role].map((r) => option(r.id, `${r.name} · ${r.studentCode || r.teacherCode}`)).join("");
          dialog.querySelector('[name="accountId"]').innerHTML = option("", t("Choose", "اختر")) + snapshot.options.candidates[role].map((id) => option(id, id)).join("");
        };
        dialog.querySelector('[name="role"]').onchange = update;
        update();
      }
      dialog.querySelector("[data-monitor-cancel]").onclick = () => dialog.close();
      dialog.onclose = () => { dialog.remove(); if (trigger?.isConnected) trigger.focus(); };
      dialog.querySelector("form").onsubmit = (event) => {
        event.preventDefault();
        const fields = Object.fromEntries(new FormData(event.target));
        try {
          if (removal) S.remove(type, removeId, snapshot.context);
          else if (type === "map") S.saveMapping(fields.role, fields.academicId, fields.accountId, snapshot.context);
          else S.saveLink(channelId, fields.classId, fields.subjectId, snapshot.context);
          dialog.close(); draw(t("Reporting link saved in this browser.", "حُفظ رابط التقرير في هذا المتصفح."));
          host.querySelector("[data-monitor-refresh]")?.focus({ preventScroll: true });
        } catch (e) { const box = dialog.querySelector("[data-monitor-error]"); box.textContent = errorText(e); box.focus(); }
      };
      dialog.showModal();
      if (removal) dialog.querySelector("[data-monitor-cancel]").focus();
    }
    host.onclick = (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.hasAttribute("data-monitor-refresh")) draw(t("Activity refreshed.", "حُدّث النشاط."));
      if (button.hasAttribute("data-monitor-map")) modal("map", "", "", button);
      if (button.dataset.monitorLink) modal("link", button.dataset.monitorLink, "", button);
      if (button.dataset.monitorRemove) modal(button.dataset.monitorRemove, "", button.dataset.id, button);
    };
    draw();
    refreshView = () => { if (root?.isConnected && !document.querySelector(".sm-academic-dialog[open]")) draw(); };
  }
  window.OrbitSchoolMonitoringUI = { mount };
})();
