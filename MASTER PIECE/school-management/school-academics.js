(() => {
  "use strict";
  const S = window.OrbitSchoolAcademics;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function mount(host, kind, t) {
    let query = "", status = "", classFilter = "", db;
    const labels = {
      students: t("Students", "الطلاب"), teachers: t("Teachers", "المعلمون"),
      classes: t("Classes & Sections", "الصفوف والشعب"), subjects: t("Subjects", "المواد"),
      allocations: t("Teaching assignments", "توزيع التدريس"),
    };
    const actions = {
      students: t("Add student", "إضافة طالب"), teachers: t("Add teacher", "إضافة معلم"),
      classes: t("Create class", "إنشاء صف"), subjects: t("Create subject", "إنشاء مادة"),
      allocations: t("Assign teaching", "توزيع التدريس"),
    };
    const statuses = {
      enrolled: t("Enrolled", "مسجل"), inactive: t("Inactive", "غير نشط"), graduated: t("Graduated", "متخرج"),
      active: t("Active", "نشط"), archived: t("Archived", "مؤرشف"),
    };
    const messages = {
      DUPLICATE_STUDENT: t("This student ID is already used in this school.", "رقم الطالب مستخدم بالفعل في هذه المدرسة."),
      DUPLICATE_TEACHER: t("This teacher ID is already used in this school.", "رقم المعلم مستخدم بالفعل في هذه المدرسة."),
      DUPLICATE_CLASS: t("This grade and section already exist in this academic year.", "هذا الصف وهذه الشعبة موجودان بالفعل في السنة الدراسية نفسها."),
      DUPLICATE_ALLOCATION: t("This subject is already assigned in this class. Edit the existing assignment to change its teacher.", "هذه المادة موزعة بالفعل في هذا الصف. عدّل التوزيع الحالي لتغيير المعلم."),
      LINKED_RECORD: t("Clear this student's class or this teacher's teaching assignments before removal.", "ألغِ ارتباط الطالب بالصف أو توزيع تدريس المعلم قبل الإزالة."),
      ARCHIVED_RECORD: t("Choose an active class and subject. Archived records cannot receive new assignments.", "اختر صفًا ومادة نشطين. لا يمكن إنشاء ارتباطات جديدة بسجلات مؤرشفة."),
      INVALID_YEAR: t("Use consecutive years, for example 2026-2027.", "استخدم سنتين متتاليتين، مثل 2026-2027."),
      INVALID_FIELDS: t("Complete the required fields within the stated limits.", "أكمل الحقول المطلوبة ضمن الحدود المحددة."),
      NOT_FOUND: t("A linked record is no longer available. Close this dialog and refresh the list.", "أحد السجلات المرتبطة لم يعد متاحًا. أغلق النافذة وحدّث القائمة."),
      STALE_DATA: t("The records changed in another view. Close this dialog and refresh before saving again.", "تغيرت السجلات في عرض آخر. أغلق النافذة وحدّث القائمة قبل الحفظ مجددًا."),
      SCHOOL_CHANGED: t("The school account changed. Reload this page before continuing.", "تغير حساب المدرسة. أعد تحميل الصفحة قبل المتابعة."),
      ROLE_DENIED: t("A school account is required. Sign in again.", "يلزم حساب مدرسة. سجّل الدخول مجددًا."),
      INVALID_DATA: t("Saved academic demo data could not be read. It has not been replaced. Check this browser's saved data before continuing.", "تعذر قراءة البيانات الأكاديمية التجريبية المحفوظة. لم تُستبدل. تحقق من بيانات هذا المتصفح قبل المتابعة."),
      STORAGE_FAILED: t("Browser storage is unavailable or full. No changes were saved. Check storage and try again.", "تخزين المتصفح غير متاح أو ممتلئ. لم تُحفظ التغييرات. تحقق من التخزين وحاول مجددًا."),
    };
    const errorText = (error) => messages[error.message] || t("Could not save. Refresh the page and try again.", "تعذر الحفظ. حدّث الصفحة وحاول مجددًا.");
    const className = (id) => {
      const c = db.classes.find((r) => r.id === id);
      return c ? `${t("Grade", "الصف")} ${c.grade} · ${c.section} · ${c.academicYear}${c.status === "archived" ? ` (${statuses.archived})` : ""}` : t("Unassigned", "غير موزع");
    };
    const subjectName = (id) => {
      const s = db.subjects.find((r) => r.id === id);
      return `${s?.name || ""}${s?.status === "archived" ? ` (${statuses.archived})` : ""}`;
    };
    const teacherName = (id) => db.teachers.find((r) => r.id === id)?.name || "";
    const relationText = (teacherId) => db.allocations.filter((r) => r.teacherId === teacherId).map((r) => `${subjectName(r.subjectId)} / ${className(r.classId)}`).join("; ") || t("No teaching assignments", "لا يوجد توزيع تدريس");
    const option = (value, label, selected) => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`;
    const classOptions = (selected = "", allowEmpty = true) => `${allowEmpty ? option("", t("Unassigned", "غير موزع"), selected) : '<option value="">' + t("Choose a class", "اختر صفًا") + '</option>'}${db.classes.filter((c) => c.status === "active" || c.id === selected).map((c) => option(c.id, className(c.id), selected)).join("")}`;
    function notify(message, error = false) {
      const feedback = host.querySelector("[data-academic-feedback]");
      if (!feedback) return;
      feedback.textContent = message;
      feedback.classList.toggle("sm-error", error);
    }
    function table(headers, rows, caption) {
      return `<div class="sm-table-scroll" tabindex="0" role="region" aria-label="${esc(caption)}"><table class="sm-academic-table"><caption>${esc(caption)}</caption><thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.join("") : `<tr><td colspan="${headers.length}" class="sm-empty">${t("No matching records. Add a record or change your filters.", "لا توجد سجلات مطابقة. أضف سجلًا أو غيّر الفلاتر.")}</td></tr>`}</tbody></table></div>`;
    }
    function buttons(type, row) {
      return `<div class="sm-row-actions"><button class="btn soft" data-edit-kind="${type}" data-id="${esc(row.id)}">${t("Edit", "تعديل")}</button>${["classes", "subjects"].includes(type) ? row.status === "archived" ? "" : `<button class="btn soft" data-archive-kind="${type}" data-id="${esc(row.id)}">${t("Archive", "أرشفة")}</button>` : `<button class="btn soft" data-remove-kind="${type}" data-id="${esc(row.id)}">${t("Remove", "إزالة")}</button>`}</div>`;
    }
    function renderTables() {
      const q = query.normalize("NFKC").trim().toLocaleLowerCase();
      const items = db[kind].filter((r) => (!status || r.status === status) && (!classFilter || r.classId === classFilter) && JSON.stringify(kind === "teachers" ? [r.name, r.teacherCode, relationText(r.id)] : kind === "students" ? [r.name, r.studentCode, className(r.classId)] : r).normalize("NFKC").toLocaleLowerCase().includes(q));
      let headers, rows;
      if (kind === "students") {
        headers = [t("Student ID", "رقم الطالب"), t("Name", "الاسم"), t("Class / section", "الصف / الشعبة"), t("Enrollment status", "حالة التسجيل"), t("Actions", "الإجراءات")];
        rows = items.map((r) => `<tr data-record-id="${esc(r.id)}"><th scope="row"><bdi>${esc(r.studentCode)}</bdi></th><td>${esc(r.name)}</td><td>${esc(className(r.classId))}</td><td>${statuses[r.status]}</td><td>${buttons(kind, r)}</td></tr>`);
      } else if (kind === "teachers") {
        headers = [t("Teacher ID", "رقم المعلم"), t("Name", "الاسم"), t("Subjects / classes", "المواد / الصفوف"), t("Actions", "الإجراءات")];
        rows = items.map((r) => `<tr data-record-id="${esc(r.id)}"><th scope="row"><bdi>${esc(r.teacherCode)}</bdi></th><td>${esc(r.name)}</td><td>${esc(relationText(r.id))}</td><td>${buttons(kind, r)}<button class="btn soft" data-teacher-allocate="${esc(r.id)}">${actions.allocations}</button></td></tr>`);
      } else if (kind === "classes") {
        headers = [t("Grade / section", "الصف / الشعبة"), t("Academic year", "السنة الدراسية"), t("Status", "الحالة"), t("Students", "الطلاب"), t("Assigned teachers", "المعلمون الموزعون"), t("Actions", "الإجراءات")];
        rows = items.map((r) => `<tr data-record-id="${esc(r.id)}"><th scope="row">${esc(r.grade)} / ${esc(r.section)}</th><td><bdi>${esc(r.academicYear)}</bdi></td><td>${statuses[r.status]}</td><td>${db.students.filter((s) => s.classId === r.id).length}</td><td>${esc([...new Set(db.allocations.filter((a) => a.classId === r.id).map((a) => a.teacherId))].map(teacherName).join("; ") || t("Unassigned", "غير موزع"))}</td><td>${buttons(kind, r)}</td></tr>`);
      } else {
        headers = [t("Subject", "المادة"), t("Status", "الحالة"), t("Actions", "الإجراءات")];
        rows = items.map((r) => `<tr data-record-id="${esc(r.id)}"><th scope="row">${esc(r.name)}</th><td>${statuses[r.status]}</td><td>${buttons(kind, r)}</td></tr>`);
      }
      host.querySelector("[data-academic-table]").innerHTML = table(headers, rows, `${labels[kind]} · ${t("local demo records", "سجلات تجريبية محلية")}`);
      if (["teachers", "subjects"].includes(kind)) {
        const allocations = db.allocations.filter((r) => !q || `${teacherName(r.teacherId)} ${subjectName(r.subjectId)} ${className(r.classId)}`.normalize("NFKC").toLocaleLowerCase().includes(q));
        host.querySelector("[data-allocations-table]").innerHTML = table([t("Teacher", "المعلم"), t("Subject", "المادة"), t("Class / section", "الصف / الشعبة"), t("Actions", "الإجراءات")], allocations.map((r) => `<tr data-allocation-id="${esc(r.id)}"><th scope="row">${esc(teacherName(r.teacherId))}</th><td>${esc(subjectName(r.subjectId))}</td><td>${esc(className(r.classId))}</td><td>${buttons("allocations", r)}</td></tr>`), labels.allocations);
      }
    }
    function draw() {
      try { db = S.read(); }
      catch (error) {
        host.innerHTML = `<h2 id="sm-section-title" tabindex="-1">${labels[kind]}</h2><p role="alert" class="sm-error">${esc(errorText(error))}</p>`;
        return;
      }
      host.innerHTML = `<div class="sm-section-heading"><h2 id="sm-section-title" tabindex="-1">${labels[kind]}</h2><button class="btn" data-add-kind="${kind}">${actions[kind]}</button></div><p class="sm-academic-note">${t("Demo records saved only in this browser for this school. These are not ORBIT accounts or channel memberships.", "سجلات تجريبية تُحفظ في هذا المتصفح لهذه المدرسة فقط. ليست حسابات ORBIT أو عضويات قنوات.")}</p><div class="sm-academic-tools"><label>${t("Search", "بحث")}<input type="search" data-academic-search maxlength="100" value="${esc(query)}" placeholder="${t("Name, ID or class", "الاسم أو الرقم أو الصف")}"></label>${kind !== "teachers" ? `<label>${t("Status", "الحالة")}<select data-academic-status>${option("", t("All statuses", "كل الحالات"), status)}${(kind === "students" ? ["enrolled", "inactive", "graduated"] : ["active", "archived"]).map((s) => option(s, statuses[s], status)).join("")}</select></label>` : ""}${kind === "students" ? `<label>${t("Class / section", "الصف / الشعبة")}<select data-academic-class>${option("", t("All classes", "كل الصفوف"), classFilter)}${db.classes.map((c) => option(c.id, className(c.id), classFilter)).join("")}</select></label>` : ""}<button class="btn soft" data-academic-refresh>${t("Refresh list", "تحديث القائمة")}</button></div><p role="status" aria-live="polite" data-academic-feedback></p><div data-academic-table></div>${["teachers", "subjects"].includes(kind) ? `<section id="teaching-assignments" class="sm-allocation-section"><header class="sm-section-heading"><h3>${labels.allocations}</h3><button class="btn" data-add-kind="allocations">${actions.allocations}</button></header><p class="sm-academic-note">${t("Each assignment links a teacher, subject and class. Archived class and subject links are retained; new links require active records.", "يربط كل توزيع معلمًا ومادة وصفًا. تُحفظ الروابط مع الصفوف والمواد المؤرشفة؛ وتتطلب الروابط الجديدة سجلات نشطة.")}</p><div data-allocations-table></div></section>` : ""}`;
      renderTables();
      host.querySelector("[data-academic-search]").oninput = (event) => { query = event.target.value; renderTables(); };
      host.querySelector("[data-academic-status]")?.addEventListener("change", (event) => { status = event.target.value; renderTables(); });
      host.querySelector("[data-academic-class]")?.addEventListener("change", (event) => { classFilter = event.target.value; renderTables(); });
    }
    function openDialog(type, id = "", operation = "edit", teacherId = "", trigger) {
      try { db = S.read(); } catch (error) { notify(errorText(error), true); return; }
      const row = db[type].find((r) => r.id === id) || {};
      const context = { schoolId: db.schoolId, revision: db.revision };
      const dialog = document.createElement("dialog");
      dialog.className = "sm-academic-dialog";
      dialog.setAttribute("aria-labelledby", "sm-dialog-title");
      const input = (name, title, value = "", max = 100, extra = "") => `<label>${title}<input name="${name}" value="${esc(value)}" required maxlength="${max}" ${extra}></label>`;
      const select = (name, title, options) => `<label>${title}<select name="${name}" required>${options}</select></label>`;
      const destructive = operation !== "edit";
      let fields = "";
      if (!destructive) {
        if (["students", "teachers", "subjects"].includes(type)) fields += input("name", t("Name", "الاسم"), row.name);
        if (["students", "teachers"].includes(type)) fields += input(type === "students" ? "studentCode" : "teacherCode", type === "students" ? t("Student ID", "رقم الطالب") : t("Teacher ID", "رقم المعلم"), row[type === "students" ? "studentCode" : "teacherCode"], 50);
        if (type === "students") fields += select("status", t("Enrollment status", "حالة التسجيل"), ["enrolled", "inactive", "graduated"].map((s) => option(s, statuses[s], row.status || "enrolled")).join("")) + `<label>${t("Class / section", "الصف / الشعبة")}<select name="classId">${classOptions(row.classId)}</select></label>`;
        if (type === "classes") fields += input("grade", t("Grade", "الصف"), row.grade, 40) + input("section", t("Section", "الشعبة"), row.section, 40) + input("academicYear", t("Academic year · e.g. 2026-2027", "السنة الدراسية · مثل 2026-2027"), row.academicYear, 9, 'pattern="[0-9]{4}-[0-9]{4}" dir="ltr"');
        if (type === "allocations") fields += select("teacherId", t("Teacher", "المعلم"), option("", t("Choose a teacher", "اختر معلمًا"), "") + db.teachers.map((r) => option(r.id, `${r.name} · ${r.teacherCode}`, row.teacherId || teacherId)).join("")) + select("subjectId", t("Subject", "المادة"), option("", t("Choose a subject", "اختر مادة"), "") + db.subjects.filter((s) => s.status === "active").map((s) => option(s.id, s.name, row.subjectId)).join("")) + select("classId", t("Class / section", "الصف / الشعبة"), classOptions(row.classId, false));
      }
      const title = operation === "remove" ? t("Remove record", "إزالة السجل") : operation === "archive" ? t("Archive record", "أرشفة السجل") : id ? t("Edit record", "تعديل السجل") : actions[type];
      dialog.innerHTML = `<form><h2 id="sm-dialog-title">${title}</h2><p>${esc(labels[type])}${row.name ? ` · ${esc(row.name)}` : ""}</p>${destructive ? `<p>${operation === "archive" ? t("Existing links will be retained. This record will no longer be available for new assignments.", "ستُحفظ الروابط الحالية. لن يتوفر هذا السجل لارتباطات جديدة.") : t("This removes the local demo record. Clear its academic links first; linked records cannot be removed.", "سيُزال السجل التجريبي المحلي. ألغِ روابطه الأكاديمية أولًا؛ لا يمكن إزالة السجلات المرتبطة.")}</p>` : `<div class="sm-dialog-fields">${fields}</div>`}<p class="sm-error" role="alert" id="sm-dialog-error"></p><div class="sm-dialog-actions"><button type="submit" class="btn">${operation === "remove" ? t("Remove", "إزالة") : operation === "archive" ? t("Archive", "أرشفة") : t("Save", "حفظ")}</button><button type="button" class="btn soft" data-dialog-cancel>${t("Cancel", "إلغاء")}</button></div></form>`;
      document.getElementById("orbit-page").append(dialog);
      dialog.querySelector("[data-dialog-cancel]").onclick = () => dialog.close();
      dialog.addEventListener("close", () => { dialog.remove(); if (trigger?.isConnected) trigger.focus(); }, { once: true });
      dialog.querySelector("form").onsubmit = (event) => {
        event.preventDefault();
        try {
          if (operation === "remove") S.remove(type, id, context);
          else if (operation === "archive") S.archive(type, id, context);
          else S.save(type, id, Object.fromEntries(new FormData(event.target)), context);
          dialog.close();
          draw();
          notify(t("Changes saved in this browser.", "حُفظت التغييرات في هذا المتصفح."));
          host.querySelector("[data-add-kind]")?.focus({ preventScroll: true });
        } catch (error) {
          const feedback = dialog.querySelector("#sm-dialog-error");
          feedback.textContent = errorText(error);
          feedback.tabIndex = -1;
          feedback.focus();
        }
      };
      dialog.showModal();
      if (destructive) dialog.querySelector("[data-dialog-cancel]").focus();
    }
    host.onclick = (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.hasAttribute("data-academic-refresh")) { draw(); notify(t("List refreshed.", "حُدّثت القائمة.")); return; }
      if (button.dataset.addKind) openDialog(button.dataset.addKind, "", "edit", "", button);
      if (button.dataset.editKind) openDialog(button.dataset.editKind, button.dataset.id, "edit", "", button);
      if (button.dataset.removeKind) openDialog(button.dataset.removeKind, button.dataset.id, "remove", "", button);
      if (button.dataset.archiveKind) openDialog(button.dataset.archiveKind, button.dataset.id, "archive", "", button);
      if (button.dataset.teacherAllocate) openDialog("allocations", "", "edit", button.dataset.teacherAllocate, button);
    };
    draw();
  }
  window.OrbitSchoolAcademicUI = { mount };
})();
