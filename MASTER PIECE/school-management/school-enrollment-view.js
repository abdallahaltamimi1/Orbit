/* Read-only annual student view. No calls to enrollment or legacy mutation methods. */
(() => {
  "use strict";
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function mount(host, t, sharedContext = null) {
    if (sharedContext && !document.querySelector("[data-school-year]")) sharedContext = null;
    const R = window.OrbitSchoolAcademicReadModel;
    const years = { active: t("Active", "نشطة"), upcoming: t("Upcoming", "قادمة"), archived: t("Archived", "مؤرشفة") };
    const states = { verified: t("Verified", "متحقق"), unresolved: t("Unresolved", "غير محسوم"), "not-enrolled": t("Not enrolled", "غير مسجل") };
    const identities = { confirmed: t("Confirmed", "مؤكدة"), pending: t("Pending", "قيد المراجعة"), unresolved: t("Unresolved", "غير محسومة") };
    const messages = {
      ROSTER_STUDENT_MISSING: t("The linked roster student is missing. The saved annual record is retained.", "سجل الطالب المرتبط مفقود من القائمة. يبقى السجل السنوي محفوظًا."),
      CLASS_RECORD_MISSING: t("The linked class is missing. The saved placement is shown without reconstruction.", "سجل الصف المرتبط مفقود. يُعرض التوزيع المحفوظ دون إعادة بنائه."),
      IDENTITY_MAPPING_MISMATCH: t("The annual account reference does not match the reviewed identity mapping.", "مرجع الحساب السنوي لا يطابق ربط الهوية الذي تمت مراجعته."),
      LEGACY_CLASS_LABELS_CHANGED: t("Current class labels differ from the saved snapshot. The original grade and section are shown.", "تختلف بيانات الصف الحالية عن اللقطة المحفوظة. يُعرض الصف والشعبة الأصليان."),
      ENROLLMENT_YEAR_MISSING: t("A saved enrollment refers to a year that is unavailable. No record was reassigned.", "يشير تسجيل محفوظ إلى سنة غير متاحة. لم يُنقل أي سجل إلى سنة أخرى."),
      CLASS_LINK_YEAR_MISSING: t("A reviewed class link refers to an unavailable year.", "يشير ربط صف تمت مراجعته إلى سنة غير متاحة."),
      MAPPING_ROSTER_MISSING: t("A reviewed identity references a missing roster record.", "تشير هوية تمت مراجعتها إلى سجل طالب مفقود من القائمة."),
    };
    const errorText = (e) => ({
      YEAR_NOT_FOUND: t("This academic year is no longer available. Choose another year.", "هذه السنة الدراسية لم تعد متاحة. اختر سنة أخرى."),
      YEAR_ID_REQUIRED: t("Choose an academic year to view its records.", "اختر سنة دراسية لعرض سجلاتها."),
      ACADEMIC_DATA_REQUIRED: t("No saved academic roster is available in this browser. Viewing this page will not create one.", "لا توجد قائمة طلاب أكاديمية محفوظة في هذا المتصفح. لن يؤدي عرض الصفحة إلى إنشائها."),
      ROLE_DENIED: t("A School account is required. Sign in again to continue.", "يلزم حساب مدرسة. سجّل الدخول مجددًا للمتابعة."),
      SNAPSHOT_CHANGED: t("Records changed while loading. Refresh to view the latest saved data.", "تغيرت السجلات أثناء التحميل. حدّث لعرض أحدث البيانات المحفوظة."),
      STORAGE_FAILED: t("Browser storage is unavailable. Check storage and try Refresh.", "تخزين المتصفح غير متاح. تحقق منه ثم جرّب التحديث."),
    })[e?.message] || t("Saved annual records could not be read safely. They have not been replaced. Check saved data, then try Refresh. The other workspace sections remain available.", "تعذر قراءة السجلات السنوية بأمان. لم تُستبدل. تحقق من البيانات المحفوظة ثم جرّب التحديث. تبقى أقسام مساحة العمل الأخرى متاحة.");
    const badge = (label, state) => `<span class="sm-status sm-enrollment-status" data-enrollment-state="${esc(state)}">${esc(label)}</span>`;
    host.innerHTML = `<header class="sm-academic-view-header sm-annual-header"><div><h2 id="sm-section-title" tabindex="-1">${t("Annual Records", "السجلات السنوية")}</h2><p>${t("View saved enrollments and historical placements by academic year.", "استعرض التسجيلات المحفوظة والتوزيعات التاريخية حسب السنة الدراسية.")}</p></div><span class="sm-readonly-indicator">${t("Read-only", "للقراءة فقط")}</span></header><div class="sm-annual-controls">${sharedContext ? "" : `<label for="sm-annual-year">${t("Academic year", "السنة الدراسية")}<select id="sm-annual-year" data-annual-year></select></label><span data-annual-year-status></span>`}<button type="button" class="btn soft" data-annual-refresh>${t("Refresh", "تحديث")}</button></div><p class="sm-annual-explainer">${t("Review identity and placement status before planning next year.", "راجع حالة الهوية والتوزيع قبل التخطيط للسنة القادمة.")}</p><p role="status" aria-live="polite" data-annual-feedback></p><div data-annual-content></div>`;
    const select = (sharedContext ? document : host).querySelector("[data-annual-year]"), content = host.querySelector("[data-annual-content]"), status = (sharedContext ? document : host).querySelector("[data-annual-year-status]"), feedback = host.querySelector("[data-annual-feedback]");
    function render(refresh = false) {
      content.innerHTML = ""; if (!sharedContext) status.innerHTML = ""; feedback.textContent = "";
      let listed = false;
      try {
        if (!R) throw Error("UNAVAILABLE");
        const list = R.availableYears(), url = new URL(location.href);
        listed = true;
        let selected = sharedContext ? sharedContext.read().selectedYear?.id || "" : url.searchParams.get("academicYear");
        if (!sharedContext && !url.searchParams.has("academicYear") && list.activeYearId) {
          selected = list.activeYearId; url.searchParams.set("academicYear", selected); history.replaceState(null, "", url);
        }
        select.disabled = !list.years.length;
        select.innerHTML = `<option value="">${t("Choose an academic year", "اختر سنة دراسية")}</option>` + list.years.map((y) => `<option value="${esc(y.id)}">${esc(y.name)}</option>`).join("");
        select.value = list.years.some((y) => y.id === selected) ? selected : "";
        if (!list.years.length) {
          content.innerHTML = `<p class="sm-empty sm-compact-empty">${t("No academic years are saved yet. Create years in Academic Years when you are ready; this view creates no records.", "لا توجد سنوات دراسية محفوظة بعد. يمكنك إنشاؤها من قسم السنوات الدراسية عندما تكون جاهزًا؛ لا ينشئ هذا العرض سجلات.")}</p>`; return;
        }
        if (selected === null || selected === "") { content.innerHTML = `<p class="sm-empty sm-compact-empty">${t("Choose an academic year to view its records.", "اختر سنة دراسية لعرض سجلاتها.")}</p>`; return; }
        const model = R.read(selected);
        status.innerHTML = sharedContext ? esc(years[model.selectedYear.status]) : badge(years[model.selectedYear.status], model.selectedYear.status);
        feedback.textContent = refresh ? t("Showing the latest saved records for the selected year.", "تُعرض أحدث السجلات المحفوظة للسنة المختارة.") : "";
        const note = model.selectedYear.status === "archived" ? t("Historical grade and section snapshots are preserved and cannot be edited here.", "تُحفظ لقطات الصف والشعبة التاريخية ولا يمكن تعديلها هنا.") : model.selectedYear.status === "upcoming" ? t("These are saved enrollment records only. They activate no educational access.", "هذه سجلات تسجيل محفوظة فقط، ولا تفعّل أي وصول تعليمي.") : t("Reviewed annual enrollments.", "التسجيلات السنوية بعد المراجعة.");
        const diagnostic = (code) => messages[code] || t("A saved relationship needs review. No records were changed.", "يحتاج ارتباط محفوظ إلى مراجعة. لم تتغير السجلات.");
        content.innerHTML = `<p class="sm-annual-notice">${note}</p>${!model.enrollments.length ? `<p class="sm-empty sm-compact-empty" data-annual-empty>${t("No annual enrollments are saved for this year. Roster-only students below are not enrolled automatically.", "لا توجد تسجيلات سنوية محفوظة لهذه السنة. لا يُسجل الطلاب من القائمة أدناه تلقائيًا.")}</p>` : ""}${model.diagnostics.length ? `<aside class="sm-annual-diagnostics" aria-label="${t("Saved data notes", "ملاحظات البيانات المحفوظة")}"><h3>${t("Data review notes", "ملاحظات مراجعة البيانات")}</h3><ul>${[...new Set(model.diagnostics.map((d) => d.code))].map((code) => `<li>${esc(diagnostic(code))}</li>`).join("")}</ul></aside>` : ""}${model.students.length ? `<div class="sm-table-scroll" tabindex="0" role="region" aria-label="${t("Annual student records", "سجلات الطلاب السنوية")}"><table class="sm-academic-table sm-annual-table"><caption>${t("Annual enrollment and identity review status · Read-only", "حالة التسجيل السنوي ومراجعة الهوية · للقراءة فقط")}<span class="sm-table-scroll-hint">${t("Scroll for placements and notes", "مرّر لعرض التوزيعات والملاحظات")}</span></caption><thead><tr>${[t("Student", "الطالب"), t("Enrollment", "التسجيل"), t("Identity", "الهوية"), t("Grade / section", "الصف / الشعبة"), t("Notes", "ملاحظات")].map((label) => `<th scope="col">${label}</th>`).join("")}</tr></thead><tbody>${model.students.map((s) => {
          const identityState = s.identity.enrollmentMatch === false ? "unresolved" : s.identity.status;
          const notes = [...s.issues, ...s.warnings].map(diagnostic);
          if (!s.hasAnnualEnrollment) notes.push(t("Roster record only; no annual placement is inferred.", "سجل من قائمة الطلاب فقط؛ لا يُستنتج توزيع سنوي."));
          if (identityState === "pending") notes.push(t("Account mapping awaits explicit review.", "ربط الحساب بانتظار مراجعة صريحة."));
          if (identityState === "unresolved") notes.push(t("The reviewed account relationship is unavailable or inconsistent.", "ارتباط الحساب الذي تمت مراجعته غير متاح أو غير متوافق."));
          return `<tr data-annual-student="${esc(s.academicStudentId)}"><th scope="row">${esc(s.name || t("Roster record unavailable", "سجل الطالب غير متاح"))}<small class="sm-annual-id"><bdi>${esc(s.legacyStudent?.studentCode || s.academicStudentId)}</bdi></small></th><td>${badge(states[s.verification] || states.unresolved, s.verification)}</td><td>${badge(identities[identityState] || identities.unresolved, identityState)}</td><td>${s.currentPlacement ? `<bdi>${esc(s.currentPlacement.gradeSnapshot)} / ${esc(window.OrbitSchoolSections?.sectionLabel(s.currentPlacement.sectionSnapshot,document.documentElement.lang)??s.currentPlacement.sectionSnapshot)}</bdi>` : t("No annual placement", "لا يوجد توزيع سنوي")}</td><td>${s.placementHistory?.length ? `<details class="sm-annual-history"><summary>${t("Academic-year enrollment history", "تاريخ التسجيل في السنة الدراسية")}</summary><ol>${s.placementHistory.map(p=>`<li><bdi>${esc(p.gradeSnapshot)} / ${esc(window.OrbitSchoolSections?.sectionLabel(p.sectionSnapshot,document.documentElement.lang)??p.sectionSnapshot)}</bdi> · <time datetime="${esc(p.createdAt)}" dir="ltr">${esc(p.createdAt)}</time>${p.reason?`<p>${esc(p.reason)}</p>`:""}</li>`).join("")}</ol></details>` : ""}${notes.length ? `<ul>${[...new Set(notes)].map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : t("Saved references agree.", "المراجع المحفوظة متوافقة.")}</td></tr>`;
        }).join("")}</tbody></table></div>` : `<p class="sm-empty sm-compact-empty">${t("No student or annual enrollment records are available for this view.", "لا توجد سجلات طلاب أو تسجيلات سنوية متاحة لهذا العرض.")}</p>`}`;
      } catch (e) {
        content.innerHTML = `<p class="sm-error sm-annual-notice" role="alert">${esc(errorText(e))}</p>`;
        if (!listed) { select.innerHTML = `<option value="">${t("Academic years unavailable", "السنوات الدراسية غير متاحة")}</option>`; select.disabled = true; }
      }
    }
    if (!sharedContext) select.onchange = () => {
      const url = new URL(location.href); url.searchParams.set("academicYear", select.value); history.replaceState(null, "", url); render();
    };
    host.querySelector("[data-annual-refresh]").onclick = () => sharedContext?.refresh ? sharedContext.refresh() : render(true);
    render();
  }
  window.OrbitSchoolEnrollmentView = { mount };
})();
