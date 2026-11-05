/* Replaces only the Classes & Sections view; legacy editing remains inside its existing route. */
(() => {
  "use strict";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  let refreshView;
  window.addEventListener("storage", event => refreshView?.(event));
  window.addEventListener("orbit:school-enrollments-change", () => refreshView?.({}));
  function mount(host, t) {
    const S = OrbitSchoolSections;
    let current, selectedYearId = "", query = "", gradeFilter = "";
    const error = e => ({
      ARCHIVED_YEAR: t("Archived years are read-only.", "السنوات المؤرشفة للقراءة فقط."),
      DUPLICATE_SECTION: t("This section already exists for this grade and year.", "هذه الشعبة موجودة بالفعل لهذا الصف والسنة."),
      DUPLICATE_GRADE: t("This grade already exists. Choose it from the grade list.", "هذا الصف موجود بالفعل. اختره من قائمة الصفوف."),
      GRADE_REQUIRED: t("Choose a grade or enter a new grade name.", "اختر صفًا أو أدخل اسم صف جديد."),
      EXISTING_CLASS_CONFLICT: t("An existing reviewed class has this grade and section. Review it under Existing classes.", "يوجد صف تمت مراجعته بنفس الصف والشعبة. راجعه ضمن الصفوف الموجودة."),
      SECTION_IN_USE: t("This section is used by other records and cannot be renamed or deleted.", "هذه الشعبة مستخدمة في سجلات أخرى ولا يمكن تغيير اسمها أو حذفها."),
      NO_NEW_SECTIONS:t("Select at least one new section.","اختر شعبة جديدة واحدة على الأقل."),
      INVALID_GRADE:t("Choose a supported school grade.","اختر صفًا مدرسيًا معتمدًا."),
      INVALID_SECTION_CODES:t("Choose sections from A to Z.","اختر شعبًا من القائمة المعتمدة."),
      AMBIGUOUS_GRADE:t("Duplicate grade identities need administrative review before creation.","تحتاج هويات الصفوف المكررة إلى مراجعة إدارية قبل الإنشاء."),
      IMMUTABLE_RELATION: t("A section's grade and year cannot be changed. Create a separate section instead.", "لا يمكن تغيير صف الشعبة أو سنتها. أنشئ شعبة مستقلة."),
      YEAR_MISMATCH: t("The section does not belong to the selected year.", "الشعبة لا تنتمي إلى السنة المختارة."),
      YEAR_NOT_FOUND: t("The selected year is unavailable. Refresh and choose a year.", "السنة المختارة غير متاحة. حدّث واختر سنة."),
      STALE_DATA: t("Records changed. Close this dialog and refresh before saving.", "تغيرت السجلات. أغلق النافذة وحدّث قبل الحفظ."),
      SCHOOL_CHANGED: t("The school account changed. Reload before continuing.", "تغير حساب المدرسة. أعد التحميل قبل المتابعة."),
      CONFIRMATION_REQUIRED: t("Review and confirm this action to continue.", "راجع الإجراء وأكده للمتابعة."),
      INVALID_FIELDS: t("Enter a grade and section name of up to 40 characters.", "أدخل اسم صف وشعبة بحد أقصى 40 حرفًا."),
      STORAGE_FAILED: t("Unable to save. Check browser storage and try again.", "تعذر الحفظ. تحقق من تخزين المتصفح وحاول مجددًا."),
      NOT_FOUND: t("This section is no longer available. Refresh the list.", "هذه الشعبة لم تعد متاحة. حدّث القائمة."),
    })[e.message] || t("Saved records could not be checked safely. Nothing was replaced. Refresh and review saved data.", "تعذر التحقق من السجلات بأمان. لم يُستبدل شيء. حدّث وراجع البيانات المحفوظة.");
    let enrollment = { counts: new Map(), students: new Map(), total: 0, unavailable: false, legacy: 0, unresolved: 0 };
    let entered = false;
    const number = value => value.toLocaleString(document.documentElement.lang === "en" ? "en-GB" : "ar-JO");
    function readEnrollments() {
      enrollment = { counts: new Map(), students: new Map(), total: 0, unavailable: false, legacy: 0, unresolved: 0 };
      if (!current.selectedYear) return;
      try {
        const model = OrbitSchoolAcademicReadModel.read(current.selectedYear.id);
        const sectionIds = new Set(current.sections.map(s=>s.id));
        const seen = new Set(), rosterById = new Map(OrbitSchoolAcademics.read().students.map(s=>[s.id,s]));
        for (const record of model.enrollments) {
          if (record.verification !== "verified") { enrollment.unresolved++; continue; }
          if (record.structure !== "section") { enrollment.legacy++; continue; }
          const sectionId = record.currentPlacement?.sectionId;
          if (!sectionIds.has(sectionId) || seen.has(record.academicStudentId)) continue;
          seen.add(record.academicStudentId);
          const student = model.students.find(s=>s.id===record.academicStudentId || s.academicStudentId===record.academicStudentId);
          const roster = rosterById.get(record.academicStudentId);
          const list = enrollment.students.get(sectionId) || [];
          list.push({ name: student?.name || roster?.name || t("Student", "الطالب"), code: roster?.studentCode || "" });
          enrollment.students.set(sectionId, list); enrollment.counts.set(sectionId, list.length); enrollment.total++;
        }
      } catch { enrollment.unavailable = true; }
    }
    function table() {
      const q = query.normalize("NFKC").trim().toLocaleLowerCase();
      const sections = [...current.sections].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).filter(r => (!gradeFilter || r.gradeId === gradeFilter) && `${r.name} ${S.sectionLabel(r.name,document.documentElement.lang)} ${current.grades.find(g=>g.id===r.gradeId).name} ${S.gradeLabel(current.grades.find(g=>g.id===r.gradeId).name,document.documentElement.lang)}`.normalize("NFKC").toLocaleLowerCase().includes(q));
      const readonly = !current.selectedYear || current.selectedYear.status === "archived";
      const list = host.querySelector("[data-year-section-list]");
      const groups = current.grades.filter(g=>sections.some(s=>s.gradeId===g.id)).sort((a,b)=>a.name.localeCompare(b.name,document.documentElement.lang,{numeric:true}));
      list.innerHTML = sections.length ? groups.map(g=>`<section class="ss-grade" data-grade-group="${esc(g.id)}"><header><h3><bdi>${esc(S.gradeLabel(g.name,document.documentElement.lang))}</bdi></h3><span>${number(sections.filter(s=>s.gradeId===g.id).length)} ${t("sections", "شعب")}</span></header><div class="ss-section-grid">${sections.filter(s=>s.gradeId===g.id).map(r=>`<article class="ss-section" data-year-section="${esc(r.id)}"><div class="ss-card-heading"><h4><span>${t("Section", "الشعبة")}</span><bdi data-section-name>${esc(S.sectionLabel(r.name,document.documentElement.lang))}</bdi></h4><div class="ss-student-count"><strong data-section-students>${enrollment.unavailable ? '—' : number(enrollment.counts.get(r.id)||0)}</strong><span>${t("Enrolled students", "الطلاب المسجلون")}</span></div></div><div class="ss-card-actions"><button type="button" class="ss-inspect" data-section-inspect="${esc(r.id)}" aria-label="${esc(t(`View students in section ${r.name}, grade ${g.name}`, `عرض طلاب الشعبة ${r.name}، الصف ${g.name}`))}" aria-expanded="false" aria-controls="ss-roster-${esc(r.id)}">${t("View students", "عرض الطلاب")}</button><div><button type="button" class="btn soft" data-section-edit="${esc(r.id)}" aria-label="${esc(t(`Edit section ${r.name}, grade ${g.name}`, `تعديل الشعبة ${r.name}، الصف ${g.name}`))}" ${readonly?'disabled':''}>${t("Edit", "تعديل")}</button><button type="button" class="btn soft" data-section-delete="${esc(r.id)}" aria-label="${esc(t(`Delete section ${r.name}, grade ${g.name}`, `حذف الشعبة ${r.name}، الصف ${g.name}`))}" ${readonly?'disabled':''}>${t("Delete", "حذف")}</button></div></div><div class="ss-roster" id="ss-roster-${esc(r.id)}" data-section-roster hidden></div></article>`).join('')}</div></section>`).join('') : `<p class="sm-empty sm-compact-empty">${q || gradeFilter ? t("No sections match your filters.", "لا توجد شعب تطابق الفلاتر.") : !current.selectedYear ? t("Choose an academic year to view or create sections.", "اختر سنة دراسية لعرض الشعب أو إنشائها.") : t("No year-specific sections yet. Create a section or review existing classes in Advanced administration.", "لا توجد شعب مخصصة لهذه السنة بعد. أنشئ شعبة أو راجع الصفوف الموجودة في الإدارة المتقدمة.")}</p>`;
      host.querySelector('[data-section-result-count]').textContent = t(`${sections.length} of ${current.sections.length} sections`, `${number(sections.length)} من ${number(current.sections.length)} شعبة`);
      const available = host.querySelector("[data-reusable-grades]");
      available.innerHTML = current.grades.length ? current.grades.map(g=>`<li><bdi>${esc(S.gradeLabel(g.name,document.documentElement.lang))}</bdi><span>${number(current.sections.filter(r=>r.gradeId===g.id).length)} ${t("sections this year", "شعب لهذه السنة")}</span></li>`).join("") : `<li class="sm-caption">${t("Create a reusable grade with your first section.", "أنشئ صفًا قابلًا لإعادة الاستخدام مع أول شعبة.")}</li>`;
      OrbitSchoolWorkspaceUI.decorate(host);
    }
    function draw(message = "") {
      const advancedOpen = host.querySelector('[data-sections-advanced]')?.open;
      const legacyOpen = host.querySelector('[data-existing-classes]')?.open;
      try {
        const year = OrbitSchoolYearContext.read().selectedYear;
        selectedYearId = year?.id || ""; current = S.view(selectedYearId);
        const readonly = !year || year.status === "archived";
        readEnrollments();
        host.innerHTML = `<div class="ss-workspace"><header class="sm-section-heading ss-page-heading"><div><h2 id="sm-section-title" tabindex="-1">${t("Sections by grade", "الشعب حسب الصف")}</h2><p>${year ? esc(year.name) : t("Select an academic year", "اختر سنة دراسية")}</p></div><button class="btn" data-section-create ${readonly?'disabled':''}>${t("Create Grade & Sections", "إنشاء صف وشُعب")}</button></header><dl class="ss-summary">${[[new Set(current.sections.map(s=>s.gradeId)).size,t("Grades", "الصفوف"),'grades'],[current.sections.length,t("Sections", "الشعب"),'sections'],[enrollment.unavailable?null:enrollment.total,t("Enrolled students", "الطلاب المسجلون"),'students']].map(([value,label,id])=>`<div><dt>${label}</dt><dd data-section-summary="${id}">${value===null?t("Unavailable", "غير متاح"):number(value)}</dd></div>`).join('')}</dl><p class="ss-count-note">${t("Student counts reflect verified annual enrollments in these sections.", "تعكس أعداد الطلاب التسجيلات السنوية المتحقق منها في هذه الشعب.")}</p>${enrollment.unavailable?`<p role="alert" class="sm-error">${t("Enrollment counts are unavailable. Saved sections are preserved; refresh to try again.", "أعداد التسجيل غير متاحة. تبقى الشعب محفوظة؛ حدّث للمحاولة مجددًا.")}</p>`:''}${enrollment.legacy||enrollment.unresolved?`<p class="ss-count-note" role="note">${t(`${enrollment.legacy} enrollments use existing class records; ${enrollment.unresolved} need review. These are not assigned to sections automatically.`,`${number(enrollment.legacy)} تسجيلًا يستخدم سجلات الصفوف الموجودة، و${number(enrollment.unresolved)} يحتاج إلى مراجعة. لا تُربط هذه السجلات بالشعب تلقائيًا.`)}</p>`:''}<p role="status" aria-live="polite" data-sections-feedback>${esc(message)}</p><div class="sm-academic-tools ss-tools"><label>${t("Search sections", "بحث في الشعب")}<input type="search" data-section-search maxlength="100" value="${esc(query)}"></label><label>${t("Grade", "الصف")}<select data-section-grade-filter><option value="">${t("All grades", "كل الصفوف")}</option>${current.grades.map(g=>`<option value="${esc(g.id)}" ${g.id===gradeFilter?'selected':''}>${esc(S.gradeLabel(g.name,document.documentElement.lang))}</option>`).join('')}</select></label><button class="btn soft" data-sections-refresh>${t("Refresh list", "تحديث القائمة")}</button></div><p class="ss-result-count" data-section-result-count></p><div data-year-section-list></div>${current.unavailableYearSections.length?`<p class="sm-error" role="note">${t("Some sections refer to an unavailable year. They are preserved; restore or review that year before making changes.", "ترتبط بعض الشعب بسنة غير متاحة. تبقى محفوظة؛ استعد السنة أو راجعها قبل التعديل.")}</p>`:''}<details class="ss-advanced" data-sections-advanced><summary>${t("Advanced administration", "الإدارة المتقدمة")}</summary><p>${t("Review older class records and their academic-year links. New sections and their annual enrollments are managed above.", "راجع سجلات الصفوف القديمة وارتباطها بالسنوات الدراسية. تُدار الشعب الجديدة وتسجيلاتها السنوية أعلاه.")}</p><button class="btn soft" data-section-legacy-create ${readonly?'disabled':''}>${t("Legacy custom section maintenance","صيانة الشعب المخصصة القديمة")}</button><div data-section-advanced-actions></div><details class="sm-existing-classes" data-existing-classes><summary>${t("Existing class records", "سجلات الصفوف الموجودة")}</summary><div data-legacy-classes></div></details><details class="sm-reusable-grades"><summary>${t("Available grades across years", "الصفوف المتاحة عبر السنوات")}</summary><ul data-reusable-grades></ul></details></details></div>`;
        table();
        if (advancedOpen) host.querySelector('[data-sections-advanced]').open = true;
        if (legacyOpen) host.querySelector('[data-existing-classes]').open = true;
        const legacyHost = host.querySelector("[data-legacy-classes]"), existing = localStorage.getItem(OrbitSchoolAcademics.storageKey());
        if (existing !== null) {
          OrbitSchoolAcademicUI.mount(legacyHost, "classes", t, OrbitSchoolYearContext.readOnly, { headingId: "sm-legacy-class-title", headingLabel: t("Existing classes", "الصفوف الموجودة") });

        } else legacyHost.innerHTML = `<p class="sm-empty sm-compact-empty">${t("No existing school-wide classes.", "لا توجد صفوف مدرسية عامة موجودة.")}</p>`;
        const heading = host.closest('.sections-workspace')?.querySelector('.sm-heading');
        if (heading) {
          heading.querySelector('[data-section-create]')?.remove();
          const create = host.querySelector('[data-section-create]');
          create.onclick = e => { e.stopPropagation(); if(!create.disabled) openBatch(create); };
          heading.append(create);
        }
        if (!entered && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
          entered = true;
          host.querySelectorAll('.ss-grade').forEach((group,i)=>group.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,delay:Math.min(i,3)*35,easing:'cubic-bezier(.23,1,.32,1)',fill:'backwards'}));
        } else entered = true;
        host.querySelector("[data-section-search]").oninput = e => { query = e.target.value; table(); };
        host.querySelector("[data-section-grade-filter]").onchange = e => { gradeFilter = e.target.value; table(); };
      } catch(e) { host.closest(".sections-workspace")?.querySelector(".sm-heading [data-section-create]")?.remove(); host.innerHTML = `<h2 id="sm-section-title" tabindex="-1">${t("Classes & Sections", "الصفوف والشعب")}</h2><p role="alert" class="sm-error">${esc(error(e))}</p>`; }
    }
    function openBatch(trigger){
      const year=current?.selectedYear;if(!year||OrbitSchoolYearContext.readOnly())return;
      const expected=current.context,choices=S.gradeChoices(),selected=new Set(),language=document.documentElement.lang;
      const dialog=document.createElement('dialog');dialog.className='sm-academic-dialog sm-section-dialog ss-create-dialog';dialog.setAttribute('aria-labelledby','ss-create-title');
      dialog.innerHTML=`<form><h2 id="ss-create-title" tabindex="-1">${t('Create Grade & Sections','إنشاء صف وشُعب')}</h2><p class="ss-create-year">${t('Academic year','السنة الدراسية')}: <strong>${esc(year.name)}</strong></p><label>${t('Grade','الصف')}<select name="grade" required aria-describedby="ss-grade-help"><option value="">${t('Choose a grade','اختر صفًا')}</option>${choices.map(g=>`<option value="${esc(g.value)}">${esc(S.gradeLabel(g.name,language))}</option>`).join('')}</select></label><p id="ss-grade-help" class="ss-help">${t('Existing grades are reused. Only missing sections are created.','تُستخدم الصفوف الموجودة ويُنشأ فقط ما ينقص من الشعب.')}</p><fieldset><legend>${t('Select sections','اختر الشعب')}</legend><p class="ss-chip-legend">${t('Available · Selected · Already exists (disabled)','متاحة · محددة · موجودة بالفعل (معطلة)')}</p><div class="ss-section-chips" data-section-chips></div></fieldset><section class="ss-create-summary" aria-label="${t('Creation summary','ملخص الإنشاء')}" aria-live="polite" data-batch-summary></section><label class="sm-preview-confirm"><input type="checkbox" name="confirmed" required> ${t('I reviewed the year, grade and new sections.','راجعت السنة والصف والشعب الجديدة.')}</label><p role="alert" tabindex="-1" class="sm-error" data-section-error></p><div class="sm-dialog-actions"><button class="btn" type="submit" disabled>${t('Create','إنشاء')}</button><button class="btn soft" type="button" data-section-cancel>${t('Cancel','إلغاء')}</button></div></form>`;
      const form=dialog.querySelector('form'),grade=form.elements.grade,submit=form.querySelector('[type=submit]');let busy=false;
      const values=()=>{const choice=choices.find(g=>g.value===grade.value);return {academicYearId:year.id,gradeId:choice?.gradeId||'',gradeName:choice?.name||'',sectionCodes:[...selected]};};
      function update(){
        const choice=choices.find(g=>g.value===grade.value);let plan;
        try{if(choice)plan=S.previewBatch(values());}catch(e){dialog.querySelector('[data-section-error]').textContent=error(e);}
        const existing=plan?.existingCodes||[];
        for(const code of existing)selected.delete(code);
        dialog.querySelector('[data-section-chips]').innerHTML=S.sectionCodes.map(code=>{const exists=existing.includes(code),label=S.sectionLabel(code,language);return `<button type="button" data-section-code="${code}" aria-pressed="${selected.has(code)}" ${!plan||exists?'disabled':''} ${exists?'data-section-existing':''} title="${esc(label+' · '+(exists?t('Already exists','موجودة بالفعل'):t('Select section','اختر الشعبة')))}"><bdi>${esc(label)}</bdi>${exists?`<small>${t('Exists','موجودة')}</small>`:''}</button>`;}).join('');
        const names=[...selected].map(c=>S.sectionLabel(c,language)).join(t(', ','، '));
        dialog.querySelector('[data-batch-summary]').innerHTML=`<dl>${[[t('Academic year','السنة الدراسية'),year.name],[t('Grade','الصف'),choice?S.gradeLabel(choice.name,language):t('Choose a grade','اختر صفًا')],[t('Sections to create','الشعب الجديدة'),names||t('None selected','لم تُحدد شعب')],[t('New section count','عدد الشعب الجديدة'),number(selected.size)],[t('Existing sections · unchanged','الشعب الموجودة · دون تغيير'),plan?.existingNames.map(n=>S.sectionLabel(n,language)).join(t(', ','، '))||t('None','لا توجد')]].map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
        submit.disabled=busy||!plan||!selected.size;
      }
      grade.onchange=()=>{selected.clear();form.elements.confirmed.checked=false;dialog.querySelector('[data-section-error]').textContent='';update();};
      dialog.querySelector('[data-section-chips]').onclick=e=>{const b=e.target.closest('[data-section-code]');if(!b||b.disabled)return;const code=b.dataset.sectionCode;if(selected.has(code))selected.delete(code);else selected.add(code);form.elements.confirmed.checked=false;update();dialog.querySelector(`[data-section-code="${code}"]`).focus({preventScroll:true});};
      dialog.onkeydown=e=>{if(e.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button:not(:disabled),select,input')].filter(n=>n.getClientRects().length),first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.querySelector('h2'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
      const overflow=document.body.style.overflow,scroll=[scrollX,scrollY];document.body.style.overflow='hidden';document.getElementById('orbit-page').append(dialog);
      dialog.querySelector('[data-section-cancel]').onclick=()=>dialog.close();
      dialog.onclose=()=>{dialog.remove();document.body.style.overflow=overflow;const anchor=trigger.isConnected?trigger:document.querySelector('.sections-workspace [data-section-create]');anchor?.focus({preventScroll:true});window.scrollTo(...scroll);};
      form.onsubmit=e=>{
        e.preventDefault();if(busy)return;busy=true;submit.disabled=true;
        try{if(OrbitSchoolYearContext.read().selectedYear?.id!==year.id)throw Error('STALE_DATA');if(!form.elements.confirmed.checked)throw Error('CONFIRMATION_REQUIRED');const result=S.createGradeSections(values(),expected,true);dialog.close();draw(t(`Created ${result.created.length} sections. Existing records are unchanged.`,`تم إنشاء ${number(result.created.length)} شعبة. لم تتغير السجلات الموجودة.`));}
        catch(e){busy=false;update();const box=dialog.querySelector('[data-section-error]');box.textContent=error(e);box.focus();}
      };
      update();dialog.showModal();dialog.querySelector('h2').focus({preventScroll:true});
    }

    function open(sectionId, deleting, trigger) {
      if (!current?.selectedYear || OrbitSchoolYearContext.readOnly()) return;
      const row = sectionId ? current.sections.find(r=>r.id===sectionId) : null; if (sectionId && !row) return;
      const expected = current.context, yearId = current.selectedYear.id;
      const dialog = document.createElement("dialog"), title = deleting ? t("Delete section", "حذف الشعبة") : row ? t("Edit section", "تعديل الشعبة") : t("Create section", "إنشاء شعبة");
      dialog.className = "sm-academic-dialog sm-section-dialog"; dialog.setAttribute("aria-label", title);
      dialog.innerHTML = `<form><h2>${title}</h2><p>${esc(current.selectedYear.name)}</p>${deleting ? `<p>${esc(current.grades.find(g=>g.id===row.gradeId).name)} / ${esc(row.name)}</p><p>${t("Delete this section? Used sections cannot be deleted.", "هل تريد حذف هذه الشعبة؟ لا يمكن حذف الشعب المستخدمة.")}</p><label class="sm-preview-confirm"><input type="checkbox" name="confirmed" required> ${t("Confirm deletion", "تأكيد الحذف")}</label>` : `<div class="sm-dialog-fields">${row ? `<p>${t("Grade", "الصف")}: <strong>${esc(current.grades.find(g=>g.id===row.gradeId).name)}</strong></p>` : `<label>${t("Grade", "الصف")}<select name="gradeId" data-section-grade required><option value="">${t("Choose a grade", "اختر صفًا")}</option>${current.grades.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join("")}<option value="__new__">${t("Create reusable grade…", "إنشاء صف قابل لإعادة الاستخدام…")}</option></select></label><label data-new-grade hidden>${t("New grade name", "اسم الصف الجديد")}<input name="gradeName" maxlength="40" required disabled></label>`}<label>${t("Section name", "اسم الشعبة")}<input name="name" maxlength="40" value="${esc(row?.name || "")}" required></label></div>`}<p role="alert" class="sm-error" tabindex="-1" data-section-error></p><div class="sm-dialog-actions"><button class="btn" type="submit">${deleting?t("Delete", "حذف"):t("Save", "حفظ")}</button><button class="btn soft" type="button" data-section-cancel>${t("Cancel", "إلغاء")}</button></div></form>`;
      document.getElementById("orbit-page").append(dialog);
      const grade = dialog.querySelector("[data-section-grade]");
      if (grade) grade.onchange = () => { const adding = grade.value === "__new__", field = dialog.querySelector("[data-new-grade]"); field.hidden = !adding; field.querySelector("input").disabled = !adding; if(adding)field.querySelector("input").focus(); };
      dialog.querySelector("[data-section-cancel]").onclick = () => dialog.close();
      dialog.onclose = () => { dialog.remove(); if(trigger.isConnected)trigger.focus(); };
      dialog.querySelector("form").onsubmit = e => {
        e.preventDefault();
        try {
          const selected = OrbitSchoolYearContext.read().selectedYear;
          if (selected?.id !== yearId) throw Error("STALE_DATA");
          if (selected?.status === "archived") throw Error("ARCHIVED_YEAR");
          const values = Object.fromEntries(new FormData(e.target));
          if (deleting) S.remove(row.id, yearId, expected, e.target.elements.confirmed.checked);
          else S.save(row?.id || "", { academicYearId: yearId, gradeId: row?.gradeId || (values.gradeId === "__new__" ? "" : values.gradeId), gradeName: values.gradeName, name: values.name }, expected);
          dialog.close(); draw(t("Changes saved.", "حُفظت التغييرات.")); document.querySelector(".sections-workspace [data-section-create]")?.focus({preventScroll:true});
        } catch(e) { const box = dialog.querySelector("[data-section-error]"); box.textContent = error(e); box.focus(); }
      };
      dialog.showModal(); if (deleting) dialog.querySelector("[data-section-cancel]").focus();
    }
    host.onclick = event => {
      const button = event.target.closest("button"); if (!button || button.disabled) return;
      if (button.dataset.sectionInspect) {
        const card = button.closest('[data-year-section]'), panel = card.querySelector('[data-section-roster]');
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded)); panel.hidden = expanded;
        if (!expanded) {
          const students = enrollment.students.get(button.dataset.sectionInspect) || [];
          panel.innerHTML = enrollment.unavailable ? `<p>${t('Enrollment counts are unavailable. Refresh and try again.','أعداد التسجيل غير متاحة. حدّث وحاول مجددًا.')}</p>` : students.length ? `<ul aria-label="${t('Enrolled students','الطلاب المسجلون')}">${students.map(s=>`<li><span>${esc(s.name)}</span><bdi>${esc(s.code)}</bdi></li>`).join('')}</ul>` : `<p>${t('No verified students enrolled in this section.','لا يوجد طلاب بتسجيل متحقق منه في هذه الشعبة.')}</p>`;
        }
      }
      if (button.hasAttribute("data-section-create")) openBatch(button);
      if (button.hasAttribute("data-section-legacy-create")) open("",false,button);
      if (button.dataset.sectionEdit) open(button.dataset.sectionEdit, false, button);
      if (button.dataset.sectionDelete) open(button.dataset.sectionDelete, true, button);
      if (button.hasAttribute("data-sections-refresh")) draw(t("List refreshed.", "حُدّثت القائمة."));
    };
    const refresh = () => { if (host.isConnected && host.querySelector("[data-year-section-list]") && !document.querySelector(".sm-section-dialog[open]")) draw(); };
    refreshView = e => { if (!e.key || [S.prefix, OrbitSchoolEnrollments.prefix, OrbitSchoolAcademics.prefix].some(prefix=>e.key.startsWith(prefix))) refresh(); };
    draw();
  }
  window.OrbitSchoolSectionsUI = { mount };
})();
