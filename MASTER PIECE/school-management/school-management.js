(() => {
  "use strict";
  if (OrbitAuth.current()?.role !== "school") return;
  const english = OrbitAuth.get("orbit.student.v1", {}).lang === "en";
  const t = (en, ar) => english ? en : ar;
  const sections = [
    ["overview", "Overview", "نظرة عامة", ""],
    ["years", "Academic Years", "السنوات الدراسية"],
    ["students", "Students", "الطلاب"],
    ["teachers", "Teachers", "المعلمون"],
    ["classes", "Classes", "الصفوف"],
    ["subjects", "Subjects", "المواد"],
    ["timetable", "Timetable", "الجدول الدراسي"],
    ["monitoring", "Academic Monitoring", "المتابعة الأكاديمية"],
    ["events", "Events & Announcements", "الفعاليات والإعلانات"],
  ];
  const C = OrbitSchoolYearContext;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const heading = t("School Management", "إدارة المدرسة");
  document.documentElement.lang = english ? "en" : "ar";
  document.documentElement.dir = english ? "ltr" : "rtl";
  document.title = `ORBIT · ${heading}`;
  const notice = t(
    "Manage students, teaching and school life. Select an academic year to get started.",
    "أدر الطلاب والتدريس والحياة المدرسية. اختر السنة الدراسية للبدء.",
  );
  document.getElementById("app").innerHTML = `<header class="bar sm-topbar"><button type="button" class="orbit-appearance-control" data-action="theme" aria-label="${t("Switch appearance", "تبديل المظهر")}"></button></header>
    <main class="wrap school-management"><header class="sm-heading"><div><h1>${heading}</h1><p>${t("Your school's academic workspace.", "مساحة العمل الأكاديمية لمدرستك.")}</p></div><span class="sm-demo-label">${t("School workspace", "مساحة المدرسة")}</span></header>
    <p class="sm-demo-notice">${notice}</p><section class="sm-year-context" data-year-context aria-label="${t("Academic year context", "سياق السنة الدراسية")}"></section><section id="sm-content" aria-labelledby="sm-section-title"></section></main>`;
  OrbitAppearanceControl.mount(document.querySelector(".orbit-appearance-control"));
  const dashboardIcon = kind => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ({students:'<path d="m3 8 9-5 9 5-9 5-9-5Zm4 3v6c3 3 7 3 10 0v-6M21 8v7"/>',teachers:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4h5v12h-3"/>',classes:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2m4 0h2M8 11h2m4 0h2M10 21v-6h4v6"/>'})[kind] + '</svg>';
  function monitoringOverview() {
    let content;
    try {
      if (C.read().selectedYear?.status === "archived") {
        content = '<p class="sm-academic-note">' + t("No historical activity snapshot has been published for this year. Review historical enrollments in Academic Monitoring.", "لم تُنشر لقطة نشاط تاريخية لهذه السنة. راجع التسجيلات التاريخية في المتابعة الأكاديمية.") + '</p>';
      } else {
        const year = C.read().selectedYear;
        const annual = year && window.OrbitAnnualMonitoring ? OrbitAnnualMonitoring.report(year.id) : null;
        const progress = annual?.rows.filter(r=>r.type === "assignment").flatMap(r=>r.progress) || [];
        const totals = annual?.channels.length ? { assignments: annual.rows.filter(r=>r.type === "assignment").length, submitted: progress.filter(p=>p.submittedAt).length, reviewed: progress.filter(p=>p.evaluation).length } : OrbitSchoolMonitoring.report({}).totals;
        content = '<p class="sm-academic-note">' + t("Current learning activity in school-owned channels.", "النشاط التعليمي الحالي في قنوات المدرسة.") + '</p><dl class="ad-monitor-values">' + [[totals.assignments,"Assignments","الواجبات"],[totals.submitted,"Submitted","المسلّمة"],[totals.reviewed,"Reviewed","المراجَعة"]].map(([value,en,ar]) => '<div><dt>'+t(en,ar)+'</dt><dd>'+(value === null ? t("Unavailable","غير متاح") : value.toLocaleString(english ? "en-GB" : "ar-JO"))+'</dd></div>').join('')+'</dl>';
      }
    } catch { content = '<p class="sm-academic-note">'+t("Monitoring data is unavailable. Open monitoring to review saved records.","بيانات المتابعة غير متاحة. افتح المتابعة لمراجعة السجلات المحفوظة.")+'</p>'; }
    return '<section class="sm-panel ad-monitor"><header><h3>'+t("Academic Monitoring","المتابعة الأكاديمية")+'</h3><a href="?section=monitoring">'+t("Open monitoring","فتح المتابعة")+'</a></header>'+content+'</section>';
  }
  const overview = (academic) => '<h2 id="sm-section-title" class="ad-summary-title" tabindex="-1">'+t("School at a glance","المدرسة في لمحة")+'</h2><dl class="sm-totals">'+[
    [academic.students.length,"Students","الطلاب","students"], [academic.teachers.length,"Teachers","المعلمون","teachers"],
    [academic.classes.filter((c) => c.status === "active" && (window.OrbitSchoolYearScope?.read()?.matches(c.id) ?? true)).length,"Active classes / sections","الصفوف / الشعب النشطة","classes"]
  ].map(([value,en,ar,icon])=>'<div><dt><span class="ad-stat-icon">'+dashboardIcon(icon)+'</span>'+t(en,ar)+'</dt><dd aria-label="'+value.toLocaleString(english ? "en-GB":"ar-JO")+'"><span aria-hidden="true" data-count="'+value+'">'+value.toLocaleString(english ? "en-GB":"ar-JO")+'</span></dd></div>').join('')+'</dl><div class="sm-grid">'+OrbitSchoolScheduleUI.overview(t)+'</div>'+monitoringOverview()+'<div class="ad-demo-tools"><div><strong>'+t('Demo workspace','مساحة تجريبية')+'</strong><p>'+t('Explore connected school records in a separate fictional school.','استكشف سجلات مدرسية مترابطة في مدرسة خيالية منفصلة.')+'</p></div><button type="button" class="btn soft" data-load-academic-demo>'+t('Load Demo School Data','تحميل بيانات المدرسة التجريبية')+'</button></div>';
  let initialContext = true;
  const contextHost = document.querySelector("[data-year-context]");
  function renderContext(section, annual, promotion) {
    const labels = { active: t("Active", "نشطة"), upcoming: t("Upcoming", "قادمة"), archived: t("Archived", "مؤرشفة") };
    try {
      const url = new URL(location.href);
      const requested = initialContext && url.searchParams.has("academicYear") ? url.searchParams.get("academicYear") : undefined;
      const ctx = C.read(requested);
      // Normalize explicit deep links and keep the displayed context aligned with its preference.
      if (requested !== undefined && ctx.selectedYear && C.read().selectedYear?.id !== ctx.selectedYear.id) C.select(ctx.selectedYear.id);
      if (requested !== undefined && !ctx.selectedYear && C.read().selectedYear) C.clear();
      initialContext = false;
      if (ctx.selectedYear) url.searchParams.set("academicYear", ctx.selectedYear.id); else url.searchParams.delete("academicYear");
      history.replaceState(null, "", url);
      const selected = ctx.selectedYear;
      const note = section === "years" ? t("Manage academic years. Activation requires confirmation.", "أدر السنوات الدراسية. يتطلب التفعيل تأكيدك.")
        : annual ? t("Annual enrollments below use the selected year's saved records.", "تستخدم التسجيلات السنوية أدناه السجلات المحفوظة للسنة المختارة.")
        : promotion ? t("Choose the source and target years in Promotion Setup.", "اختر سنتي المصدر والهدف في إعداد الترقية.")
        : section === "students" ? t("Enrollments follow the selected academic year.", "التسجيلات حسب السنة الدراسية المختارة.")
        : ["overview", "classes"].includes(section) ? t("Selection changes your view; it does not activate a year.", "يغيّر الاختيار العرض فقط، ولا يفعّل السنة الدراسية.")
        : t("Student and teacher identities are shared across years. Review unlinked classes before annual enrollment.", "هويات الطلاب والمعلمين موحدة عبر السنوات. راجع ارتباط الصفوف قبل التسجيل السنوي.");
      contextHost.innerHTML = `<div class="sm-year-context-controls"><label for="sm-academic-year">${t("Academic year", "السنة الدراسية")}<span class="sm-year-select-shell"><select id="sm-academic-year" data-school-year ${annual ? 'data-annual-year' : ''} ${!ctx.years.length ? "disabled" : ""} aria-describedby="sm-year-context-note sm-year-context-status"><option value="">${t("Choose an academic year", "اختر سنة دراسية")}</option>${ctx.years.map(y => `<option value="${esc(y.id)}" ${y.id === selected?.id ? "selected" : ""}>${esc(y.name)}</option>`).join("")}</select><span class="sm-year-selected" aria-hidden="true"><bdi>${esc(selected?.name || t("Choose an academic year","اختر سنة دراسية"))}</bdi><span id="sm-year-context-status" class="sm-status" data-school-year-status ${annual ? 'data-annual-year-status' : ''}>${selected ? labels[selected.status] : t("No year selected", "لم تُختر سنة")}</span></span></span></label></div><p id="sm-year-context-note" ${selected?'class="sm-year-assistive-note"':''}>${!ctx.years.length ? t("No academic years exist. Create an upcoming year in Academic Years; nothing is created or activated automatically.", "لا توجد سنوات دراسية. أنشئ سنة قادمة في قسم السنوات الدراسية؛ لا يُنشأ شيء ولا يُفعّل تلقائيًا.") : !selected ? t("No Active year is available. Choose an existing year explicitly.", "لا توجد سنة نشطة. اختر سنة موجودة صراحةً.") : ""} ${note}${!ctx.years.length && section !== "years" ? ` <a href="?section=years">${t("Academic Years", "السنوات الدراسية")}</a>` : ""}</p>${selected?.status === "archived" && section !== "years" && !promotion && !annual ? `<p class="sm-year-readonly" role="note">${t("Read-only records", "سجلات للقراءة فقط")}</p>` : ""}<p role="status" data-year-context-feedback>${ctx.recovered ? t("The saved or linked year is unavailable. The Active year is used when available.", "السنة المحفوظة أو المرتبطة غير متاحة. تُستخدم السنة النشطة إن وجدت.") : ""}</p>`;
      contextHost.querySelector("[data-school-year]").onchange = e => {
        try {
          C.select(e.target.value);
          render();
          contextHost.querySelector("select").focus({ preventScroll: true });
        } catch { contextHost.querySelector("[data-year-context-feedback]").textContent = t("The year preference could not be saved. No academic records changed. Refresh and try again.", "تعذر حفظ تفضيل السنة. لم تتغير السجلات الأكاديمية. حدّث وحاول مجددًا."); e.target.value = selected?.id || ""; }
      };
      return ctx;
    } catch {
      contextHost.innerHTML = `<p role="alert">${t("Academic year context is unavailable. Saved years have not been replaced. Check browser storage, then refresh.", "سياق السنة الدراسية غير متاح. لم تُستبدل السنوات المحفوظة. تحقق من تخزين المتصفح ثم حدّث.")}</p>`;
      return null;
    }
  }
  // Keep tab controls outside the mounted view so focus and the indicator survive refreshes.
  const studentTabs=document.createElement('div');
  studentTabs.className='sm-student-tabs';studentTabs.hidden=true;studentTabs.dataset.instant='true';
  studentTabs.setAttribute('role','tablist');studentTabs.setAttribute('aria-label',t('Student views','عروض الطلاب'));
  studentTabs.innerHTML=[['management',t('Students Management','إدارة الطلاب')],['annual',t('Annual Records','السجلات السنوية')]].map(([id,label])=>'<button type="button" role="tab" id="sm-student-tab-'+id+'" data-student-tab="'+id+'" aria-controls="sm-content">'+label+'</button>').join('');
  contextHost.before(studentTabs);
  function selectStudentTab(id,animate=false){
    const url=new URL(location.href),annual=url.searchParams.get('view')==='annual';
    if((id==='annual')===annual)return;
    url.searchParams.set('section','students');if(id==='annual')url.searchParams.set('view','annual');else url.searchParams.delete('view');
    studentTabs.dataset.instant=String(!animate);history.pushState(null,'',url);render();
    studentTabs.querySelector('[data-student-tab="'+id+'"]').focus({preventScroll:true});
    const panel=document.getElementById('sm-content');panel.getAnimations().forEach(a=>a.cancel());
    if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)panel.animate([{opacity:.7,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'cubic-bezier(.23,1,.32,1)'});
  }
  studentTabs.onclick=e=>{const tab=e.target.closest('[data-student-tab]');if(tab)selectStudentTab(tab.dataset.studentTab,e.detail>0);};
  studentTabs.onkeydown=e=>{
    const tabs=[...studentTabs.querySelectorAll('[role=tab]')],index=tabs.indexOf(e.target);if(index<0)return;
    let next;if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else if(['ArrowLeft','ArrowRight'].includes(e.key)){const forward=(e.key==='ArrowRight')===(document.documentElement.dir!=='rtl');next=(index+(forward?1:-1)+tabs.length)%tabs.length;}else return;
    e.preventDefault();selectStudentTab(tabs[next].dataset.studentTab);tabs[next].focus({preventScroll:true});
  };
  function render(focus = false) {
    const navigation=new URL(location.href);
    if(navigation.searchParams.get('section')==='subjects'&&(navigation.searchParams.has('teacher')||navigation.hash==='#teaching-assignments')){navigation.searchParams.set('section','teachers');navigation.hash='';history.replaceState(null,'',navigation);}
    const requested = new URLSearchParams(location.search).get("section");
    const section = sections.find(([id]) => id === requested) || sections[0];
    const host = document.getElementById("sm-content");
    host.onclick = null;host.removeAttribute('data-people-workspace');
    const promotion = section[0] === "students" && new URLSearchParams(location.search).get("view") === "promotions";
    document.querySelector('main').classList.toggle('promotion-workspace',promotion);document.querySelector('main').classList.toggle('timetable-workspace',section[0]==='timetable');
    const annual = section[0] === "students" && new URLSearchParams(location.search).get("view") === "annual";
    host.dataset.workspaceSection = promotion || annual ? "annual" : section[0];
    const studentsPage = section[0] === 'students' && !annual && !promotion;
    document.querySelector('main').classList.toggle('students-workspace', studentsPage || annual || ['teachers','monitoring'].includes(section[0]));
    studentTabs.hidden=!(studentsPage||annual);
    studentTabs.dataset.active=annual?'annual':'management';
    for(const tab of studentTabs.querySelectorAll('[role=tab]')){const active=tab.dataset.studentTab===(annual?'annual':'management');tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
    if(studentsPage||annual){host.setAttribute('role','tabpanel');host.setAttribute('aria-labelledby','sm-student-tab-'+(annual?'annual':'management'));host.tabIndex=0;}else{host.removeAttribute('role');host.setAttribute('aria-labelledby','sm-section-title');host.removeAttribute('tabindex');}
    document.title = 'ORBIT · ' + (section[0]==='monitoring'?t('Academic Monitoring','المتابعة الأكاديمية'):section[0]==='teachers'?t('Teachers','المعلمون'):(studentsPage || annual) ? t('Students','الطلاب') : promotion ? t('Student promotion','ترقية الطلاب') : heading);
    const dashboard = section[0] === "overview";
    const sectionsPage = section[0] === "classes";
    document.querySelector("main").classList.toggle("sections-workspace", sectionsPage);
    document.body.classList.toggle("sections-workspace-page", sectionsPage);
    document.querySelector(".sm-heading [data-section-create]")?.remove();
    document.querySelector("main").classList.toggle("academic-dashboard", dashboard);
    document.body.classList.toggle("academic-dashboard-page", dashboard);
    document.querySelector(".sm-heading h1").textContent = dashboard ? t("Academic dashboard", "لوحة التحكم الأكاديمية") : sectionsPage ? t("Classes & Sections", "الصفوف والشعب") : heading;
    document.querySelector(".sm-heading p").textContent = dashboard ? t("An overview of students, teaching and school activity.", "نظرة شاملة على الطلاب والتدريس والنشاط المدرسي.") : t("Your school's academic workspace.", "مساحة العمل الأكاديمية لمدرستك.");

    renderContext(section[0], annual, promotion);
    if (promotion) {
      OrbitSchoolPromotionPreviewUI.mount(host, t);
    } else if (annual) {
      OrbitSchoolEnrollmentView.mount(host, t, { ...C, refresh: () => render() });
    } else if (section[0] === "years") {
      OrbitSchoolYearUI.mount(host, t);
    } else if (section[0] === "classes") {
      OrbitSchoolSectionsUI.mount(host, t);
    } else if (section[0] === 'students') {
      OrbitSchoolStudentsUI.mount(host,t);
    } else if (["teachers", "subjects"].includes(section[0])) {
      if(section[0]==='teachers')OrbitSchoolTeachersUI.mount(host,t);else OrbitSchoolSubjectsUI.mount(host,t);
    } else if (section[0] === "monitoring") {
      host.innerHTML = '<div data-annual-monitoring data-monitoring-workspace></div>';
      OrbitAnnualMonitoringUI.mount(host.querySelector("[data-annual-monitoring]"), t, C.read().selectedYear?.id);
    } else if (["timetable", "events"].includes(section[0])) {
      OrbitSchoolScheduleUI.mount(host, section[0], t, C.readOnly);
    } else if (section[0] === "overview") {
      try {
        const academic = OrbitSchoolAcademics.read();
        host.innerHTML = overview(academic);
      } catch {
        host.innerHTML = `<h2 id="sm-section-title" tabindex="-1">${t("School Overview", "نظرة عامة على المدرسة")}</h2><p role="alert" class="sm-error">${t("Saved school data is unavailable. It has not been replaced. Check browser storage before reloading.", "بيانات المدرسة المحفوظة غير متاحة. لم تُستبدل. تحقق من تخزين المتصفح قبل إعادة التحميل.")}</p>`;
      }
    }
    OrbitSchoolWorkspaceUI.mount(host, promotion || annual ? "annual" : section[0], t);
    if (dashboard) OrbitAcademicDashboard.mount(host);
    if (focus) document.getElementById("sm-section-title").focus({ preventScroll: true });
  }
  document.querySelector("main").addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="?section="]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    history.pushState(null, "", link.href);
    render(true);
  });
  window.addEventListener("popstate", () => { studentTabs.dataset.instant='true';initialContext = true; render(true); });
  window.addEventListener("orbit:school-years-change", () => queueMicrotask(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("section") === "years") renderContext("years", false, false);
    else if (!document.querySelector(".sm-academic-dialog[open]")) render();
  }));
  window.addEventListener("storage", (event) => { if (!event.key || event.key.startsWith(C.prefix) || event.key.startsWith(OrbitSchoolYears.prefix)) render(); });
  for (const name of ["storage", "orbit:school-schedule-change", "orbit:school-academics-change"]) window.addEventListener(name, () => {
    const section = new URLSearchParams(location.search).get("section");
    if ((!section || section === "overview") && !document.querySelector(".sm-academic-dialog[open]")) render();
  });
  new MutationObserver(() => {
    const host = document.getElementById("sm-content");
    OrbitSchoolWorkspaceUI.decorate(host);
    OrbitSchoolTeachingUI.mount(host,host.dataset.workspaceSection,t);
    if (!host.querySelector("[data-school-admin]")) OrbitSchoolWorkspaceUI.mount(host, host.dataset.workspaceSection, t);
  }).observe(document.getElementById("sm-content"), { childList: true, subtree: true });
  window.addEventListener("orbit:school-workspace-refresh", () => render());
  render();
})();
