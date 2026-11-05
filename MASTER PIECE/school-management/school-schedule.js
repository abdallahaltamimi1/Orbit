(() => {
  "use strict";
  const S = window.OrbitSchoolSchedule;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  let refresh;
  for (const event of ["storage", "orbit:school-academics-change", "orbit:school-schedule-change"]) window.addEventListener(event, () => refresh?.());
  const days = (t) => [t("Sunday", "الأحد"), t("Monday", "الاثنين"), t("Tuesday", "الثلاثاء"), t("Wednesday", "الأربعاء"), t("Thursday", "الخميس"), t("Friday", "الجمعة"), t("Saturday", "السبت")];
  function helpers(t, academic) {
    const classroom = (id) => { const c = academic.classes.find((r) => r.id === id); return c ? `${t("Grade", "الصف")} ${c.grade} / ${c.section} · ${c.academicYear}` : t("Missing class", "صف غير موجود"); };
    const subject = (id) => academic.subjects.find((r) => r.id === id)?.name || t("Missing subject", "مادة غير موجودة");
    const teacher = (id) => academic.teachers.find((r) => r.id === id)?.name || t("Removed teacher", "معلم تمت إزالته");
    const audience = (r) => ({ school: t("Entire school", "المدرسة كاملة"), teachers: t("Teachers", "المعلمون"), students: t("Students", "الطلاب"), classes: r.classIds.map(classroom).join("; ") })[r.audience];
    const date = (value) => new Intl.DateTimeFormat(document.documentElement.lang === "ar" ? "ar-JO" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(S.localDate(value));
    return { classroom, subject, teacher, audience, date };
  }
  function mount(host, kind, t, readOnly = () => false) {
    if(kind==='timetable'&&window.OrbitSchoolPeriodBuilder){OrbitSchoolPeriodBuilder.mount(host,t);return;}
    let view, root, filters = { classId: "", teacherId: "", day: "" };
    const timetable = kind === "timetable", dayNames = days(t);
    const title = timetable ? t("Weekly Timetable", "الجدول الأسبوعي") : t("Events & Announcements", "الفعاليات والإعلانات");
    const add = timetable ? t("Add lesson", "إضافة حصة") : t("Add event or announcement", "إضافة فعالية أو إعلان");
    const messages = {
      ARCHIVED_CONTEXT: t("Archived context is read-only. Select an Active or Upcoming year to edit school-wide records.", "السياق المؤرشف للقراءة فقط. اختر سنة نشطة أو قادمة لتعديل سجلات المدرسة العامة."),
      CLASS_CONFLICT: t("This class already has a lesson during that time. Choose another time.", "لهذا الصف حصة في هذا الوقت. اختر وقتًا آخر."),
      TEACHER_CONFLICT: t("This teacher already has a lesson during that time. Choose another teacher or time.", "لهذا المعلم حصة في هذا الوقت. اختر معلمًا أو وقتًا آخر."),
      ROOM_CONFLICT: t("This room is already booked during that time. Choose another room or time.", "هذه الغرفة محجوزة في هذا الوقت. اختر غرفة أو وقتًا آخر."),
      INVALID_TIME: t("End time must be after start time on the same day.", "يجب أن يكون وقت النهاية بعد البداية في اليوم نفسه."),
      INVALID_DAY: t("Choose a day of the week.", "اختر يومًا من الأسبوع."),
      INVALID_ALLOCATION: t("Choose an existing class, subject and teacher allocation. Set it up in Subjects first.", "اختر توزيعًا موجودًا للصف والمادة والمعلم. أنشئه أولًا في قسم المواد."),
      INACTIVE_REFERENCE: t("Choose an active class and subject with a current teacher.", "اختر صفًا ومادة نشطين ومعلمًا حاليًا."),
      INVALID_AUDIENCE: t("Select at least one active class from this school.", "اختر صفًا نشطًا واحدًا على الأقل من هذه المدرسة."),
      INVALID_DATE: t("Enter a valid local date and time.", "أدخل تاريخًا ووقتًا محليين صالحين."),
      INVALID_FIELDS: t("Complete the required fields within the displayed limits.", "أكمل الحقول المطلوبة ضمن الحدود المعروضة."),
      INVALID_DATA: t("Saved data could not be read. It has not been replaced. Check browser storage before continuing.", "تعذرت قراءة البيانات المحفوظة. لم تُستبدل. تحقق من تخزين المتصفح قبل المتابعة."),
      STORAGE_FAILED: t("Browser storage is unavailable or full. No changes were saved.", "تخزين المتصفح غير متاح أو ممتلئ. لم تُحفظ التغييرات."),
      STALE_DATA: t("Records changed. Close this form, refresh, and try again.", "تغيرت السجلات. أغلق النموذج وحدّث القائمة وحاول مجددًا."),
      SCHOOL_CHANGED: t("The school account changed. Reload before continuing.", "تغير حساب المدرسة. أعد التحميل قبل المتابعة."),
      NOT_FOUND: t("This record no longer exists. Refresh the list.", "لم يعد هذا السجل موجودًا. حدّث القائمة."),
      ROLE_DENIED: t("A school account is required.", "يلزم حساب مدرسة."),
    };
    const errorText = (e) => messages[e.message] || messages.INVALID_FIELDS;
    const option = (value, label, selected = "") => `<option value="${esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(label)}</option>`;
    const status = (r) => r.status === "active" ? "" : `<p class="sm-reference-warning">${t("Needs repair: archived, missing or reassigned academic reference. Record retained; excluded from overview.", "يحتاج تصحيحًا: مرجع أكاديمي مؤرشف أو مفقود أو أعيد توزيعه. السجل محفوظ ومستبعد من النظرة العامة.")}</p>`;
    const actions = (r) => `<div class="sm-row-actions"><button class="btn soft" data-schedule-edit="${esc(r.id)}">${t("Edit", "تعديل")}</button><button class="btn soft" data-schedule-delete="${esc(r.id)}">${t("Delete", "حذف")}</button></div>`;
    function draw(message = "") {
      try { view = S.snapshot(kind); }
      catch (e) { host.innerHTML = `<h2 id="sm-section-title" tabindex="-1">${title}</h2><p role="alert" class="sm-error">${errorText(e)}</p>`; return; }
      const scoped = window.OrbitSchoolYearScope?.read();
      if (timetable && scoped) view.records = view.records.filter(r => scoped.matches(r.classId));
      if (!timetable && scoped) view.records = scoped.year.status === "archived" ? (window.OrbitSchoolWorkflow?.read(view.context.schoolId).events.filter(r=>r.academicYearId===scoped.year.id) || []) : view.records.filter(r=>!r.academicYearId||r.academicYearId===scoped.year.id);
      const h = helpers(t, view.academic);
      let content;
      if (timetable) {
        const records = view.records.filter((r) => (!filters.classId || r.classId === filters.classId) && (!filters.teacherId || r.teacherId === filters.teacherId) && (filters.day === "" || r.day === Number(filters.day))).sort((a, b) => a.startTime.localeCompare(b.startTime));
        content = `<div class="sm-academic-tools">${[
          ["classId", t("Class", "الصف"), view.academic.classes.map((c) => [c.id, h.classroom(c.id)])],
          ["teacherId", t("Teacher", "المعلم"), view.academic.teachers.map((r) => [r.id, r.name])],
          ["day", t("Day", "اليوم"), dayNames.map((name, i) => [i, name])],
        ].map(([key, label, rows]) => `<label>${label}<select data-schedule-filter="${key}">${option("", t("All", "الكل"))}${rows.map(([id, label]) => option(id, label, filters[key])).join("")}</select></label>`).join("")}</div>${!records.length ? `<p class="sm-empty">${t("No lessons match. Add a lesson or adjust your filters.", "لا توجد حصص مطابقة. أضف حصة أو غيّر الفلاتر.")}</p>` : ""}<div class="sm-week" data-week>${dayNames.map((name, day) => filters.day !== "" && day !== Number(filters.day) ? "" : `<section class="sm-week-day"><h3>${name}</h3><ol>${records.filter((r) => r.day === day).map((r) => `<li data-schedule-record="${esc(r.id)}"><time dir="ltr">${r.startTime}–${r.endTime}</time><strong>${esc(h.subject(r.subjectId))}</strong><p>${esc(h.classroom(r.classId))}</p><p>${esc(h.teacher(r.teacherId))}${r.room ? ` · ${esc(r.room)}` : ""}</p>${status(r)}${actions(r)}</li>`).join("") || `<li class="sm-day-empty">${t("No lessons", "لا توجد حصص")}</li>`}</ol></section>`).join("")}</div>`;
      } else {
        const now = Date.now();
        const records = [...view.records].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
        content = `<div class="sm-event-groups">${[false, true].map((past) => {
          const group = records.filter((r) => (+S.localDate(r.dateTime) < now) === past);
          if (past) group.reverse();
          return `<section><h3>${past ? t("Past events & announcements", "الفعاليات والإعلانات السابقة") : t("Upcoming events & announcements", "الفعاليات والإعلانات القادمة")}</h3>${group.length ? `<ul class="sm-event-list">${group.map((r) => `<li data-schedule-record="${esc(r.id)}"><header><div><span class="sm-caption">${r.type === "event" ? t("Event", "فعالية") : t("Announcement", "إعلان")}</span><h4>${esc(r.title)}</h4></div><time datetime="${esc(r.dateTime)}">${esc(h.date(r.dateTime))}</time></header><p class="sm-event-description">${esc(r.description)}</p><p>${esc(h.audience(r))}${r.location ? ` · ${esc(r.location)}` : ""}</p>${status(r)}${actions(r)}</li>`).join("")}</ul>` : `<p class="sm-empty">${past ? t("No past records.", "لا توجد سجلات سابقة.") : t("No upcoming records. Add an event or announcement.", "لا توجد سجلات قادمة. أضف فعالية أو إعلانًا.")}</p>`}</section>`;
        }).join("")}</div>`;
      }
      host.innerHTML = `<div data-schedule-root="${kind}"><div class="sm-section-heading"><h2 id="sm-section-title" tabindex="-1">${title}</h2><div class="sm-row-actions"><button class="btn" data-schedule-add>${add}</button><button class="btn soft" data-schedule-refresh>${t("Refresh", "تحديث")}</button></div></div><p class="sm-academic-note">${t("Manage your school schedule. Times follow your device’s time zone.", "أدر جدول المدرسة. تتبع الأوقات المنطقة الزمنية لجهازك.")} ${timetable ? t("Weekly periods · Conflicts are checked before saving.", "حصص أسبوعية · تُفحص التعارضات قبل الحفظ.") : t("Publish an announcement when it is ready to share.", "انشر الإعلان عندما يصبح جاهزًا للمشاركة.")}</p><p role="status" data-schedule-feedback>${esc(message)}</p>${content}</div>`;
      root = host.querySelector("[data-schedule-root]");
      host.querySelectorAll('[data-schedule-add],[data-schedule-edit],[data-schedule-delete]').forEach(b => b.disabled = readOnly());
      host.querySelectorAll("[data-schedule-filter]").forEach((el) => el.onchange = () => { filters[el.dataset.scheduleFilter] = el.value; draw(); });
    }
    function open(id = "", deleting = false, trigger) {
      if (readOnly()) return;
      let current;
      try { current = S.snapshot(kind); } catch (e) { draw(errorText(e)); return; }
      const r = current.records.find((r) => r.id === id);
      if (id && !r) { draw(messages.NOT_FOUND); return; }
      const h = helpers(t, current.academic), dialog = document.createElement("dialog");
      dialog.className = "sm-academic-dialog sm-schedule-dialog";
      dialog.setAttribute("aria-labelledby", "sm-schedule-form-title");
      let fields;
      if (timetable) {
        const allocations = current.academic.allocations.filter((a) => (window.OrbitSchoolYearScope?.read()?.matches(a.classId) ?? true) && current.academic.classes.some((c) => c.id === a.classId && c.status === "active") && current.academic.subjects.some((s) => s.id === a.subjectId && s.status === "active") && current.academic.teachers.some((t) => t.id === a.teacherId));
        fields = `<label>${t("Teaching allocation", "توزيع التدريس")}<select name="allocationId" required>${option("", t("Choose class / subject / teacher", "اختر الصف / المادة / المعلم"))}${allocations.map((a) => option(a.id, `${h.classroom(a.classId)} / ${h.subject(a.subjectId)} / ${h.teacher(a.teacherId)}`, r?.allocationId)).join("")}</select></label>${!allocations.length ? `<p>${messages.INVALID_ALLOCATION}</p>` : ""}<label>${t("Day", "اليوم")}<select name="day" required>${dayNames.map((name, i) => option(i, name, r?.day ?? 0)).join("")}</select></label><div class="sm-time-fields"><label>${t("Start time", "وقت البداية")}<input name="startTime" type="time" required value="${esc(r?.startTime || "")}"></label><label>${t("End time", "وقت النهاية")}<input name="endTime" type="time" required value="${esc(r?.endTime || "")}"></label></div><label>${t("Room (optional)", "الغرفة (اختياري)")}<input name="room" maxlength="100" value="${esc(r?.room || "")}"></label>`;
      } else {
        fields = `<label>${t("Record type", "نوع السجل")}<select name="type">${option("event", t("Event", "فعالية"), r?.type || "event")}${option("announcement", t("Announcement", "إعلان"), r?.type)}</select></label><label>${t("Title", "العنوان")}<input name="title" required maxlength="160" value="${esc(r?.title || "")}"></label><label>${t("Description", "الوصف")}<textarea name="description" required maxlength="4000" rows="4">${esc(r?.description || "")}</textarea></label><label>${t("Local date and time", "التاريخ والوقت المحليان")}<input name="dateTime" type="datetime-local" required value="${esc(r?.dateTime || "")}"></label><label>${t("Audience", "الجمهور")}<select name="audience">${[ ["school", t("Entire school", "المدرسة كاملة")], ["teachers", t("Teachers", "المعلمون")], ["students", t("Students", "الطلاب")], ["classes", t("Selected classes", "صفوف محددة")] ].map(([value, label]) => option(value, label, r?.audience || "school")).join("")}</select></label><fieldset data-event-classes><legend>${t("Select active classes", "اختر الصفوف النشطة")}</legend>${current.academic.classes.filter((c) => c.status === "active").map((c) => `<label class="sm-class-choice"><input type="checkbox" name="classIds" value="${esc(c.id)}" ${r?.classIds.includes(c.id) ? "checked" : ""}> ${esc(h.classroom(c.id))}</label>`).join("") || `<p>${messages.INVALID_AUDIENCE}</p>`}</fieldset><label>${t("Location (optional)", "الموقع (اختياري)")}<input name="location" maxlength="160" value="${esc(r?.location || "")}"></label>`;
      }
      const eventYear = !timetable && !id ? window.OrbitSchoolYearContext?.read().selectedYear : null;
      if (eventYear) fields += `<input type="hidden" name="academicYearId" value="${esc(eventYear.id)}">`;
      dialog.innerHTML = `<form><h2 id="sm-schedule-form-title">${deleting ? t("Delete saved record?", "حذف السجل المحفوظ؟") : id ? t("Edit saved record", "تعديل السجل المحفوظ") : add}</h2>${deleting ? `<p>${t("Delete this school's local record? Academic records, meetings and recruitment will stay unchanged.", "هل تريد حذف السجل المحلي لهذه المدرسة؟ تبقى السجلات الأكاديمية والاجتماعات والتوظيف دون تغيير.")}</p><p>${esc(r.title || h.subject(r.subjectId))}</p>` : `<div class="sm-dialog-fields">${fields}</div>`}<p role="alert" class="sm-error" data-schedule-error tabindex="-1"></p><div class="sm-dialog-actions"><button class="btn" type="submit">${deleting ? t("Delete", "حذف") : t("Save", "حفظ")}</button><button type="button" class="btn soft" data-schedule-cancel>${t("Cancel", "إلغاء")}</button></div></form>`;
      document.getElementById("orbit-page").append(dialog);
      if (!timetable && !deleting) {
        const audience = dialog.querySelector('[name="audience"]'), fieldset = dialog.querySelector("[data-event-classes]");
        const update = () => { fieldset.hidden = audience.value !== "classes"; fieldset.disabled = fieldset.hidden; };
        audience.onchange = update; update();
      }
      dialog.querySelector("[data-schedule-cancel]").onclick = () => dialog.close();
      dialog.onclose = () => { dialog.remove(); if (trigger?.isConnected) trigger.focus(); };
      dialog.querySelector("form").onsubmit = (event) => {
        event.preventDefault();
        try {
          if (readOnly()) throw Error("ARCHIVED_CONTEXT");
          if (deleting) S.remove(kind, id, current.context);
          else {
            const data = new FormData(event.target), values = Object.fromEntries(data);
            if (timetable) {
              const a = current.academic.allocations.find((a) => a.id === values.allocationId);
              if (!a) throw Error("INVALID_ALLOCATION");
              Object.assign(values, { classId: a.classId, subjectId: a.subjectId, teacherId: a.teacherId });
            } else values.classIds = data.getAll("classIds");
            S.save(kind, id, values, current.context);
          }
          dialog.close(); draw(deleting ? t("Record deleted.", "حُذف السجل.") : t("Changes saved in this browser.", "حُفظت التغييرات في هذا المتصفح."));
          host.querySelector("[data-schedule-add]")?.focus({ preventScroll: true });
        } catch (e) { const error = dialog.querySelector("[data-schedule-error]"); error.textContent = errorText(e); error.focus(); }
      };
      dialog.showModal();
      if (deleting) dialog.querySelector("[data-schedule-cancel]").focus();
    }
    host.onclick = (event) => {
      const b = event.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-schedule-add")) open("", false, b);
      if (b.hasAttribute("data-schedule-refresh")) draw(t("List refreshed.", "حُدّثت القائمة."));
      if (b.dataset.scheduleEdit) open(b.dataset.scheduleEdit, false, b);
      if (b.dataset.scheduleDelete) open(b.dataset.scheduleDelete, true, b);
    };
    draw();
    refresh = () => { if (root?.isConnected && !document.querySelector(".sm-academic-dialog[open]")) draw(); };
  }
  function overview(t) {
    const data = S.dashboard(), h = helpers(t, data.academic);
    const selected = window.OrbitSchoolYearScope?.read();
    if (selected) data.today = data.today.filter(r=>selected.matches(r.classId));
    if (selected) data.upcoming = data.upcoming.filter(r=>!r.academicYearId||r.academicYearId===selected.year.id);
    let modern = null;
    try {
      const year = window.OrbitSchoolYearContext?.read().selectedYear;
      if (year) {
        const view = OrbitSchoolPeriods.read(year.id);
        const published = view.sections.filter(s=>s.table?.publishedVersionId);
        if (published.length) modern = published.flatMap(section=>{
          const version=section.table.versions.find(v=>v.id===section.table.publishedVersionId);
          return (version?.periods || []).filter(p=>p.day===new Date().getDay()).map(p=>({...p,gradeName:view.grades.find(g=>g.id===section.gradeId)?.name||'',sectionName:section.name}));
        }).sort((a,b)=>a.period-b.period||a.gradeName.localeCompare(b.gradeName)||a.sectionName.localeCompare(b.sectionName));
      }
    } catch { /* Existing legacy schedules remain visible if annual data is unavailable. */ }
    const today = modern === null ? null : modern.length ? `<ul class="sm-list sm-schedule">${modern.slice(0,6).map(p=>`<li><div class="sm-period">${t('Period','الحصة')} ${p.period}</div><div><strong>${esc(p.subjectName)}</strong><p>${esc(p.gradeName)} / ${esc(p.sectionName)} · ${esc(p.teacherName)}</p></div></li>`).join('')}</ul>${modern.length>6?`<p class="sm-caption ad-schedule-more">${t(`${modern.length} lessons today · Open the timetable for all periods.`,`${modern.length} حصة اليوم · افتح الجدول لعرض جميع الحصص.`)}</p>`:''}` : `<p class="sm-empty">${t('No lessons scheduled today.','لا توجد حصص مجدولة اليوم.')}</p>`;
    return `<section class="sm-panel" data-overview-schedule><header><h3>${t("Today's Schedule", "جدول اليوم")}</h3><a href="?section=timetable">${t("Manage timetable", "إدارة الجدول")}</a></header><p class="sm-caption">${modern === null ? t("Existing weekly lessons · Review required", "حصص أسبوعية موجودة · بحاجة إلى مراجعة") : t("Published periods for the selected academic year", "الحصص المنشورة للسنة الدراسية المختارة")}</p>${today !== null ? today : data.today.length ? `<ul class="sm-list sm-schedule">${data.today.map((r) => `<li><div class="sm-period">${t("Legacy · Review","قديم · مراجعة")}</div><div><strong>${esc(h.subject(r.subjectId))}</strong><p>${esc(h.classroom(r.classId))} · ${esc(h.teacher(r.teacherId))}${r.room ? ` · ${esc(r.room)}` : ""}</p></div></li>`).join("")}</ul>` : `<p class="sm-empty">${t("No lessons scheduled today.", "لا توجد حصص مجدولة اليوم.")}</p>`}</section><section class="sm-panel" data-overview-events><header><h3>${t("Upcoming Events", "الفعاليات القادمة")}</h3><a href="?section=events">${t("Manage events", "إدارة الفعاليات")}</a></header>${data.upcoming.length ? `<ul class="sm-list">${data.upcoming.slice(0, 5).map((r) => `<li><div><strong>${esc(r.title)}</strong><p>${esc(h.audience(r))}${r.location ? ` · ${esc(r.location)}` : ""}</p><time datetime="${esc(r.dateTime)}">${esc(h.date(r.dateTime))}</time></div></li>`).join("")}</ul>` : `<p class="sm-empty">${t("No upcoming events or announcements.", "لا توجد فعاليات أو إعلانات قادمة.")}</p>`}</section>${data.needsRepair ? `<p class="sm-reference-warning">${t("Some saved records need academic reference repair. Open Timetable or Events to review them.", "تحتاج بعض السجلات المحفوظة إلى تصحيح المراجع الأكاديمية. افتح الجدول أو الفعاليات لمراجعتها.")}</p>` : ""}`;
  }
  window.OrbitSchoolScheduleUI = { mount, overview };
})();
