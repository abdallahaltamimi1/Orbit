/* Existing HTML route, shared ORBIT shell and teacher permissions. */
(() => {
  "use strict";
  if (new URLSearchParams(location.search).has("legacy") || OrbitAuth.current()?.role !== "teacher")
    return;
  const O = ORBIT,
    S = OrbitLessonStudio,
    P = S.lessonProjectService,
    t = O.t,
    e = O.esc,
    $ = (s) => document.querySelector(s),
    clone = (v) => JSON.parse(JSON.stringify(v));
  document.body.classList.add("lesson-studio");
  const account = OrbitAuth.current().email,
    draftKey = "orbit.studio.drafts." + account;
  let drafts;
  try {
    drafts = JSON.parse(sessionStorage.getItem(draftKey) || "{}");
  } catch {
    drafts = {};
  }
  drafts = {
    create: { duration: 45, format: "pptx", strategy: "auto", activities: [], ...drafts.create },
    plan: { duration: 45, format: "plan", strategy: "auto", activities: [], ...drafts.plan },
  };
  let tool = "create",
    step = 1,
    project = null,
    index = 0,
    selected = new Set(),
    undo = [],
    redo = [],
    dirty = false,
    baseline = false,
    busy = false,
    controller = null,
    lastRoute = location.hash,
    projectQuery = "",
    projectType = "all",
    message = "",
    generationVersion = 0;
  const strategies = [
    ["auto", "Let ORBIT choose", "خلّي ORBIT تختار"],
    ["cooperative", "Cooperative learning", "التعلم التعاوني"],
    ["inquiry", "Inquiry-based learning", "التعلم بالاستقصاء"],
    ["problems", "Problem-based learning", "التعلم القائم على المشكلات"],
    ["project", "Project-based learning", "التعلم القائم على المشاريع"],
    ["direct", "Direct instruction", "الشرح المباشر"],
    ["flipped", "Flipped classroom", "الصف المقلوب"],
  ];
  const subjects = [
    ["", "Optional", "اختياري"],
    ["physics", "Physics", "الفيزياء"],
    ["math", "Mathematics", "الرياضيات"],
    ["arabic", "Arabic", "العربية"],
    ["english", "English", "الإنجليزية"],
    ["biology", "Biology", "الأحياء"],
    ["chemistry", "Chemistry", "الكيمياء"],
  ];
  const activityNames = [
    ["discussion", "Discussion", "مناقشة"],
    ["group", "Group activity", "نشاط جماعي"],
    ["practice", "Practice questions", "أسئلة تدريبية"],
    ["experiment", "Observation / experiment", "ملاحظة / تجربة"],
    ["interactive", "Interactive activity", "نشاط تفاعلي"],
  ];
  const field = (name, label, value = "", attrs = "") =>
    `<label>${label}<input name="${name}" value="${e(value)}" ${attrs}></label>`;
  const select = (name, label, options, value) =>
    `<label>${label}<select name="${name}">${options.map(([id, en, ar]) => `<option value="${id}" ${id === value ? "selected" : ""}>${t(en, ar)}</option>`).join("")}</select></label>`;
  const note = () =>
    `<p class="studio-demo">${t("Demo adapter · Sample content, not live AI. Review all teaching material. No official curriculum connection.", "وضع تجريبي · محتوى نموذجي، وليس AI فعليًا. راجع المواد قبل التدريس. المنهاج الرسمي غير مربوط.")}</p>`;
  const kindLabel = (p) =>
    p.kind === "plan"
      ? t("Lesson plan", "تحضير درس")
      : p.format === "docx"
        ? t("Word lesson", "درس Word")
        : t("PowerPoint lesson", "درس PowerPoint");
  function notify(text, type = "success") {
    message = text;
    window.OrbitMotion?.feedback(text, { type });
    const status = $("#studio-status");
    if (status) status.textContent = text;
  }
  function shell(title, html) {
    O.shell(
      e(title),
      `<div class="studio-top"><a href="lesson-planner.html">${t("Studio home", "رئيسية الاستوديو")}</a><nav aria-label="${t("Studio navigation", "تنقّل الاستوديو")}"><a href="#projects">${t("Saved projects", "المشاريع المحفوظة")}</a><a href="?legacy=1">${t("Existing manual planner", "التحضير اليدوي الحالي")}</a></nav></div>${note()}<div id="studio-view">${html}</div><p id="studio-status" role="status" aria-live="polite">${e(message)}</p>`,
    );
  }
  function projectRows(all, full = false) {
    return all.length
      ? `<ul class="studio-project-list">${all.map((p) => `<li><div><a href="#project=${p.id}"><strong>${e(p.title)}</strong></a><small>${kindLabel(p)} · ${e(new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(p.updatedAt)))}</small></div>${full ? `<div class="studio-row-actions"><button data-rename="${p.id}">${t("Rename", "تسمية")}</button><button data-duplicate="${p.id}">${t("Duplicate", "نسخ")}</button><button data-delete="${p.id}">${t("Delete", "حذف")}</button></div>` : ""}</li>`).join("")}</ul>`
      : `<p class="studio-empty">${t("No projects here yet. Create a lesson or prepare a plan to get started.", "لسّه ما في مشاريع هون. ابدأ بإنشاء درس أو تحضير خطة.")}</p>`;
  }
  function home() {
    const all = P.listProjects();
    shell(
      "ORBIT AI Studio",
      `<header class="studio-heading"><span class="studio-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/></svg></span><div><h2>${t("Your ideas. Ready to teach.", "فكرتك، جاهزة للتدريس.")}</h2><p>${t("Create teaching materials or prepare a lesson plan. Two independent tools, one focused workspace.", "أنشئ مواد تعليمية أو حضّر خطة درس. أداتان مستقلتان في مساحة عمل واضحة.")}</p></div></header><div class="studio-tools"><a href="#create"><span class="studio-tool-mark">P / W</span><h2>${t("Create lesson", "إنشاء درس")}</h2><p>${t("Build a sample PowerPoint or Word teaching resource, then review and edit its content.", "جهّز نموذج مادة تعليمية لـPowerPoint أو Word، وراجع المحتوى وعدّله.")}</p><b>${t("Start creating →", "ابدأ الإنشاء ←")}</b></a><a href="#plan"><span class="studio-tool-mark">≡</span><h2>${t("Prepare lesson", "تحضير درس")}</h2><p>${t("Prepare objectives, activities and realistic timings using a provisional lesson-plan template.", "حضّر أهدافًا وأنشطة وتوزيع وقت باستخدام قالب تحضير مبدئي.")}</p><b>${t("Start planning →", "ابدأ التحضير ←")}</b></a></div>${all.length ? `<section class="studio-recent"><header><h2>${t("Recent projects", "آخر المشاريع")}</h2><a href="#projects">${t("View all", "عرض الكل")}</a></header>${projectRows(all.slice(0, 4))}</section>` : ""}`,
    );
  }
  function saveDraft(form) {
    const d = drafts[tool],
      fd = new FormData(form);
    for (const [name, value] of fd) if (name !== "activities") d[name] = value;
    if (step === 2) d.activities = fd.getAll("activities");
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(drafts));
    } catch {
      message = t(
        "Draft recovery is unavailable. Keep this tab open.",
        "استعادة المدخلات غير متاحة. خليك بنفس التبويب.",
      );
    }
  }
  function wizard() {
    const d = drafts[tool],
      plan = tool === "plan";
    shell(
      plan ? t("Prepare lesson", "تحضير درس") : t("Create lesson", "إنشاء درس"),
      `<ol class="studio-steps" aria-label="${t("Creation steps", "خطوات الإنشاء")}">${[t("Lesson basics", "أساسيات الدرس"), t("Teaching preferences", "تفضيلات التدريس"), t("Review & generate", "المراجعة والتوليد")].map((x, i) => `<li ${step === i + 1 ? 'aria-current="step"' : ""}><span>${i + 1}</span>${x}</li>`).join("")}</ol><section class="studio-form-panel"><form id="studio-form" data-orbit-wizard="true">${
        step === 1
          ? `<div class="studio-fields">${field("topic", t("Lesson topic *", "عنوان الدرس *"), d.topic || "", 'required maxlength="150" autocomplete="off"')}${field("grade", t("Grade / level *", "الصف / المستوى *"), d.grade || "", 'required maxlength="60" list="studio-grades"')}<datalist id="studio-grades"><option value="${t("Primary", "أساسي")}"><option value="${t("Secondary", "ثانوي")}"><option value="${t("University", "جامعي")}"></datalist>${field("duration", t("Duration in minutes *", "المدة بالدقائق *"), d.duration, 'type="number" required min="10" max="120" step="1"')}${
              !plan
                ? select(
                    "format",
                    t("Output format *", "صيغة المادة *"),
                    [
                      ["pptx", "PowerPoint preview", "معاينة PowerPoint"],
                      ["docx", "Word preview", "معاينة Word"],
                    ],
                    d.format,
                  )
                : ""
            }</div><details class="studio-options"><summary>${t("Optional context", "تفاصيل اختيارية")}</summary><div class="studio-fields">${select("subject", t("Subject", "المادة"), subjects, d.subject || "")}${field("unit", t("Unit / chapter", "الوحدة / الفصل"), d.unit || "", 'maxlength="100"')}<label class="studio-wide">${t("Teacher instructions", "تعليمات المعلم")}<textarea name="instructions" maxlength="2000">${e(d.instructions || "")}</textarea></label></div></details><p class="studio-muted">${t("Fields marked * are required. Use your own grade label; no curriculum catalogue is connected.", "الحقول بعلامة * مطلوبة. اكتب الصف المناسب؛ دليل المنهاج غير مربوط.")}</p>`
          : step === 2
            ? `${select("strategy", t("Teaching strategy · optional", "استراتيجية التدريس · اختيارية"), strategies, d.strategy)}<fieldset class="studio-activities"><legend>${t("Activity preferences · optional", "تفضيلات الأنشطة · اختيارية")}</legend>${activityNames.map(([id, en, ar]) => `<label><input type="checkbox" name="activities" value="${id}" ${(d.activities || []).includes(id) ? "checked" : ""}>${t(en, ar)}</label>`).join("")}</fieldset><p class="studio-muted">${t("Leave these choices open if you want the future AI service to recommend them. This demo uses generic prompts that need teacher adaptation.", "ممكن تترك الخيارات مفتوحة ليقترحها AI مستقبلًا. النموذج الحالي يستخدم إرشادات عامة تحتاج تكييف المعلم.")}</p>`
            : `<dl class="studio-review">${[
                [t("Topic", "الموضوع"), d.topic],
                [t("Grade", "الصف"), d.grade],
                [t("Duration", "المدة"), d.duration + " " + t("minutes", "دقيقة")],
                [
                  t("Output", "المخرجات"),
                  plan
                    ? t("Provisional lesson plan", "تحضير بقالب مبدئي")
                    : d.format === "pptx"
                      ? "PowerPoint"
                      : "Word",
                ],
                [
                  t("Strategy", "الاستراتيجية"),
                  t(...(strategies.find((x) => x[0] === d.strategy) || strategies[0]).slice(1)),
                ],
                [t("Instructions", "التعليمات"), d.instructions || t("None", "بدون")],
              ]
                .map(([label, value]) => `<div><dt>${label}</dt><dd>${e(value || "—")}</dd></div>`)
                .join(
                  "",
                )}</dl>${plan ? `<p class="studio-demo">${t("Provisional template, not an official Jordanian form. Objectives and outcomes below are sample suggestions. A teacher-provided template can be integrated through the template contract later.", "قالب مبدئي، وليس نموذجًا أردنيًا رسميًا. الأهداف والنتاجات المقترحة تجريبية. يمكن ربط قالب المعلم عبر عقد القوالب لاحقًا.")}</p>` : ""}`
      }<p id="studio-error" role="alert"></p><footer class="studio-form-actions">${step > 1 ? `<button type="button" data-prev>${t("Back", "السابق")}</button>` : `<a href="lesson-planner.html">${t("Cancel", "إلغاء")}</a>`}<button type="submit" class="studio-primary">${step === 3 ? t("Generate sample", "ولّد نموذجًا تجريبيًا") : t("Continue", "التالي")}</button></footer></form></section>`,
    );
    const form = $("#studio-form");
    form.oninput = (event) => {
      event.target.setCustomValidity?.("");
      saveDraft(form);
    };
    form.onchange = () => saveDraft(form);
    $("[data-prev]")?.addEventListener("click", () => {
      saveDraft(form);
      step--;
      wizard();
    });
    form.onsubmit = (event) => {
      event.preventDefault();
      saveDraft(form);
      if (step === 1) {
        for (const name of ["topic", "grade"]) {
          const input = form.elements[name];
          if (!input.value.trim()) {
            input.setCustomValidity(
              t("Enter a value, not only spaces.", "اكتب قيمة، مش فراغات بس."),
            );
            input.reportValidity();
            return;
          }
        }
      }
      if (step < 3) {
        step++;
        wizard();
      } else generate();
    };
  }
  async function generate() {
    if (!OrbitSubscriptions.allow("planning")) return;
    busy = true;
    const generation = ++generationVersion;
    controller = new AbortController();
    shell(
      t("Preparing your sample", "تجهيز النموذج التجريبي"),
      `<section class="studio-generating" aria-busy="true"><h2>${t("Building a demonstration preview", "بنجهّز معاينة تجريبية")}</h2><p>${t("This sequence simulates generation; no AI request is sent.", "هذا التسلسل يحاكي التوليد؛ لا يتم إرسال طلب AI.")}</p><ol id="generation-stages">${[t("Preparing lesson structure", "تجهيز بنية الدرس"), t("Organizing educational activities", "تنظيم الأنشطة التعليمية"), t("Building sample content", "بناء المحتوى النموذجي"), t("Preparing preview", "تجهيز المعاينة")].map((x) => `<li>${x}</li>`).join("")}</ol><div class="studio-skeleton" aria-hidden="true"><i></i><i></i><i></i></div><p id="generation-status" role="status" aria-live="polite"></p><button id="cancel-generation">${t("Cancel", "إلغاء")}</button></section>`,
    );
    $("#cancel-generation").onclick = () => controller.abort();
    try {
      const r = {
        ...clone(drafts[tool]),
        duration: +drafts[tool].duration,
        format: tool === "plan" ? "plan" : drafts[tool].format,
        language: document.documentElement.lang,
        curriculum: { version: null, sources: [] },
      };
      const fn =
        tool === "plan"
          ? S.lessonPlanService.createLessonPlan
          : S.lessonGenerationService.createLesson;
      const result = await fn(r, {
        signal: controller.signal,
        onProgress: ({ stage }) => {
          const rows = [...document.querySelectorAll("#generation-stages li")];
          rows.forEach((li, i) => {
            if (i === stage) li.setAttribute("aria-current", "step");
            else li.removeAttribute("aria-current");
          });
          $("#generation-status").textContent = rows[stage]?.textContent || "";
        },
      });
      if (generation !== generationVersion) return;
      project = P.saveProject(result);
      busy = false;
      dirty = false;
      message = t(
        "Sample created and saved in this browser.",
        "تم إنشاء النموذج وحفظه في هذا المتصفح.",
      );
      location.hash = "project=" + project.id;
    } catch (error) {
      if (generation !== generationVersion) return;
      busy = false;
      if (error.name === "AbortError") {
        wizard();
        notify(
          t("Generation cancelled. Your inputs are preserved.", "أُلغي التوليد. مدخلاتك محفوظة."),
          "error",
        );
        return;
      }
      shell(
        t("Could not prepare the sample", "تعذّر تجهيز النموذج"),
        `<section class="studio-form-panel"><h2>${t("Your inputs are still here.", "مدخلاتك لسه موجودة.")}</h2><p role="alert">${t("The demo or local storage failed. Check storage, then retry.", "تعذّر تشغيل النموذج أو حفظه محليًا. افحص التخزين وحاول ثانية.")}</p><button class="studio-primary" id="retry-generation">${t("Retry", "حاول ثانية")}</button> <button id="back-to-inputs">${t("Edit inputs", "عدّل المدخلات")}</button></section>`,
      );
      $("#retry-generation").onclick = generate;
      $("#back-to-inputs").onclick = wizard;
    }
  }
  function remember() {
    undo.push(clone(project));
    undo = undo.slice(-20);
    redo = [];
  }
  function manual() {
    if (!baseline) {
      remember();
      baseline = true;
    }
    dirty = true;
    $("#studio-save-state").textContent = t("Unsaved changes", "تغييرات غير محفوظة");
  }
  function save() {
    try {
      project = P.saveProject(project);
      dirty = false;
      baseline = false;
      $("#studio-save-state").textContent = t("Saved in this browser", "محفوظ بهذا المتصفح");
      notify(t("Project saved.", "تم حفظ المشروع."));
      return true;
    } catch (err) {
      notify(
        err.message === "PROJECT_CONFLICT"
          ? t(
              "This project changed in another tab. Open its latest version before saving.",
              "تغيّر المشروع بتبويب ثاني. افتح أحدث نسخة قبل الحفظ.",
            )
          : t("Could not save. Check browser storage.", "تعذّر الحفظ. افحص تخزين المتصفح."),
        "error",
      );
      return false;
    }
  }
  function slideHtml(s) {
    const lines = s.body.split("\n").filter(Boolean);
    return `<article class="studio-slide layout-${e(s.layout)}" lang="${project.language}" dir="${project.language === "ar" ? "rtl" : "ltr"}"><span class="studio-slide-label">ORBIT · ${t("Sample", "نموذج تجريبي")}</span><h2>${e(s.title)}</h2>${["process", "timeline", "assessment", "exit"].includes(s.layout) ? `<ol class="studio-process">${lines.map((x) => `<li>${e(x)}</li>`).join("")}</ol>` : s.layout === "comparison" ? `<div class="studio-comparison">${lines.map((x) => `<p>${e(x)}</p>`).join("")}</div>` : `<p>${e(s.body)}</p>`}<small>${index + 1} / ${project.slides.length}</small></article>`;
  }
  function preview() {
    baseline = false;
    index = Math.min(index, project.slides.length - 1);
    const slide = project.slides[index],
      ppt = project.format === "pptx",
      plan = project.kind === "plan";
    shell(
      project.title,
      `<header class="studio-preview-toolbar"><div><strong>${kindLabel(project)}</strong><span id="studio-save-state" role="status">${dirty ? t("Unsaved changes", "تغييرات غير محفوظة") : t("Saved in this browser", "محفوظ بهذا المتصفح")}</span></div><div class="studio-toolbar-actions"><button id="undo-edit" ${undo.length ? "" : "disabled"}>${t("Undo", "تراجع")}</button><button id="redo-edit" ${redo.length ? "" : "disabled"}>${t("Redo", "إعادة")}</button><button class="studio-primary" id="save-project">${t("Save changes", "احفظ التغييرات")}</button><button id="export-json">${t("Download project JSON", "تنزيل بيانات المشروع JSON")}</button></div></header><p class="studio-muted">${t("Editable Office export is not connected. JSON contains editable project data; it is not a PPTX or DOCX file. Projects stay in this browser and do not sync across devices.", "تصدير Office القابل للتعديل غير مربوط. JSON يحتوي بيانات المشروع وليس ملف PPTX أو DOCX. المشاريع تبقى بهذا المتصفح ولا تتزامن بين الأجهزة.")}</p>${plan ? `<p class="studio-demo">${t("Provisional plan template · not an official curriculum form. Review objectives and timing.", "قالب تحضير مبدئي · ليس نموذج منهاج رسميًا. راجع الأهداف وتوزيع الوقت.")}</p>` : ""}<div class="${ppt ? "studio-preview-grid" : "studio-document-grid"}">${ppt ? `<aside class="studio-thumbnails" aria-label="${t("Slides", "الشرائح")}">${project.slides.map((s, i) => `<div><button data-slide="${i}" ${i === index ? 'aria-current="true"' : ""}><small>${i + 1} · ${e(s.layout)}</small><strong>${e(s.title)}</strong></button><label><input type="checkbox" data-select-slide="${s.id}" ${selected.has(s.id) ? "checked" : ""}>${t("Select", "تحديد")}</label></div>`).join("")}</aside>` : ""}<section class="studio-preview-center">${ppt ? `${slideHtml(slide)}<nav class="studio-slide-controls" aria-label="${t("Slide navigation", "تنقّل الشرائح")}"><button data-slide="${index - 1}" ${index === 0 ? "disabled" : ""}>${t("Previous", "السابقة")}</button><span>${index + 1} / ${project.slides.length}</span><button data-slide="${index + 1}" ${index === project.slides.length - 1 ? "disabled" : ""}>${t("Next", "التالية")}</button><button id="present-slide">${t("Present", "عرض")}</button></nav><details class="studio-manual-edit" open><summary>${t("Edit current slide manually", "عدّل الشريحة الحالية يدويًا")}</summary><label>${t("Title", "العنوان")}<input data-edit-title value="${e(slide.title)}" maxlength="200"></label><label>${t("Content", "المحتوى")}<textarea data-edit-body maxlength="10000">${e(slide.body)}</textarea></label><label>${t("Teacher notes · private project", "ملاحظات المعلم · خاصة بالمشروع")}<textarea data-edit-notes maxlength="4000">${e(slide.notes || "")}</textarea></label></details>` : `<article class="studio-document" lang="${project.language}" dir="${project.language === "ar" ? "rtl" : "ltr"}"><h2>${e(project.title)}</h2><p>${e(project.request.grade)} · ${project.request.duration} ${t("minutes", "دقيقة")}</p>${project.slides.map((s, i) => `<section><label>${t("Section title", "عنوان القسم")}<input data-document-title="${i}" value="${e(s.title)}" maxlength="200"></label>${s.minutes !== undefined ? field("minutes-" + i, t("Minutes", "الدقائق"), s.minutes, `type="number" min="0" max="120" data-document-minutes="${i}"`) : ""}<label>${t("Content", "المحتوى")}<textarea data-document-body="${i}" maxlength="10000">${e(s.body)}</textarea></label></section>`).join("")}${plan ? `<p id="plan-time-status" role="status"></p>` : ""}</article>`}</section><aside class="studio-assistant"><h2>${t("Revision assistant", "مساعد التعديل")}</h2><p class="studio-muted">${t("Demo edits only. Suggestions are appended to the targeted content for your review.", "تعديلات تجريبية فقط. تُضاف الاقتراحات للمحتوى المحدد لتراجعها.")}</p><form id="studio-edit-form" data-orbit-wizard="true">${select(
        "scope",
        t("Target", "نطاق التعديل"),
        ppt
          ? [
              ["current", "Current slide", "الشريحة الحالية"],
              ["selected", "Selected slides", "الشرائح المحددة"],
              ["all", "Entire lesson", "كل الدرس"],
            ]
          : [["all", "Entire document", "كل المستند"]],
        "current",
      )}<label>${t("Your instruction", "تعليماتك")}<textarea name="instruction" required maxlength="1000"></textarea></label><div class="studio-edit-suggestions">${[
        ["Simplify this slide", "بسّط الشريحة"],
        ["Add an example", "أضف مثالًا"],
        ["Add a classroom activity", "أضف نشاطًا صفّيًا"],
        ["Add a question", "أضف سؤالًا"],
        ["Make the explanation shorter", "اختصر الشرح"],
        ["Suggest a safe observation activity", "اقترح نشاط ملاحظة آمن"],
      ]
        .map(
          ([en, ar]) =>
            `<button type="button" data-instruction="${e(t(en, ar))}">${t(en, ar)}</button>`,
        )
        .join(
          "",
        )}</div><p id="edit-error" role="alert"></p><button class="studio-primary" type="submit">${t("Apply demo suggestion", "طبّق الاقتراح التجريبي")}</button></form><h3>${t("Office export", "تصدير Office")}</h3><button disabled>${plan ? "DOCX / PDF" : ppt ? "PPTX" : "DOCX"} · ${t("Backend required", "بانتظار الخادم")}</button></aside></div><dialog id="studio-presentation"><button id="close-presentation">${t("Close", "إغلاق")}</button><div id="presentation-stage"></div></dialog>`,
    );
    $("#save-project").onclick = () => {
      if (plan && !checkTime()) return;
      save();
    };
    $("#export-json").onclick = () => {
      if (plan && !checkTime()) return;
      if (!save()) return;
      try {
        const blob = S.lessonExportService.exportLesson(project.id, "json"),
          url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = "ORBIT-" + project.id + ".json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch {
        notify(t("Export unavailable.", "التصدير غير متاح."), "error");
      }
    };
    $("#undo-edit").onclick = () => {
      redo.push(clone(project));
      const revision = project.revision;
      project = undo.pop();
      project.revision = revision;
      dirty = true;
      preview();
    };
    $("#redo-edit").onclick = () => {
      undo.push(clone(project));
      const revision = project.revision;
      project = redo.pop();
      project.revision = revision;
      dirty = true;
      preview();
    };
    document.querySelectorAll("[data-slide]").forEach(
      (b) =>
        (b.onclick = () => {
          index = +b.dataset.slide;
          preview();
        }),
    );
    document.querySelectorAll("[data-select-slide]").forEach(
      (c) =>
        (c.onchange = () => {
          if (c.checked) selected.add(c.dataset.selectSlide);
          else selected.delete(c.dataset.selectSlide);
        }),
    );
    for (const [key, prop] of [
      ["title", "title"],
      ["body", "body"],
      ["notes", "notes"],
    ]) {
      const input = $("[data-edit-" + key + "]");
      if (input)
        input.oninput = () => {
          manual();
          project.slides[index][prop] = input.value;
          const old = $(".studio-slide");
          if (old) old.outerHTML = slideHtml(project.slides[index]);
        };
    }
    for (const [prop, attr] of [
      ["title", "title"],
      ["body", "body"],
      ["minutes", "minutes"],
    ])
      document.querySelectorAll("[data-document-" + attr + "]").forEach(
        (input) =>
          (input.oninput = () => {
            manual();
            project.slides[+input.dataset["document" + attr[0].toUpperCase() + attr.slice(1)]][
              prop
            ] = prop === "minutes" ? +input.value : input.value;
            if (plan) checkTime();
          }),
      );
    if (ppt) {
      $("#present-slide").onclick = () => {
        $("#presentation-stage").innerHTML = slideHtml(project.slides[index]);
        $("#studio-presentation").showModal();
      };
      $("#close-presentation").onclick = () => $("#studio-presentation").close();
    }
    document.querySelectorAll("[data-instruction]").forEach(
      (b) =>
        (b.onclick = () => {
          $("#studio-edit-form textarea").value = b.dataset.instruction;
          $("#studio-edit-form textarea").focus();
        }),
    );
    $("#studio-edit-form").onsubmit = async (event) => {
      event.preventDefault();
      const form = event.target,
        scope = form.elements.scope.value,
        ids = scope === "current" ? [project.slides[index].id] : [...selected],
        button = form.querySelector("[type=submit]");
      if (scope === "selected" && !ids.length) {
        $("#edit-error").textContent = t(
          "Select one or more slides first.",
          "حدّد شريحة أو أكثر أولًا.",
        );
        return;
      }
      button.disabled = true;
      form.setAttribute("aria-busy", "true");
      try {
        const snapshot = JSON.stringify(project),
          routeAtStart = location.hash;
        const revised = await S.lessonEditingService.editLesson({
          project: clone(project),
          instruction: form.elements.instruction.value,
          scope,
          slideIds: ids,
        });
        if (routeAtStart !== location.hash) return;
        if (snapshot !== JSON.stringify(project)) {
          $("#edit-error").textContent = t(
            "You edited the content while the suggestion was prepared. Retry to keep your changes.",
            "عدّلت المحتوى أثناء تجهيز الاقتراح. جرّب ثانية للحفاظ على تعديلاتك.",
          );
          return;
        }
        remember();
        project = revised;
        dirty = true;
        preview();
        notify(
          t(
            "Demo suggestion added. Review and save your changes.",
            "أُضيف الاقتراح التجريبي. راجع التعديلات واحفظها.",
          ),
        );
      } catch {
        $("#edit-error").textContent = t(
          "Could not apply the suggestion. Your edits are preserved.",
          "تعذّر تطبيق الاقتراح. تعديلاتك محفوظة بالمعاينة.",
        );
      } finally {
        button.disabled = false;
        form.removeAttribute("aria-busy");
      }
    };
    if (plan) checkTime();
  }
  function checkTime() {
    const total = project.slides.reduce((n, s) => n + (s.minutes || 0), 0),
      node = $("#plan-time-status"),
      ok =
        project.slides
          .filter((s) => s.minutes !== undefined)
          .every((s) => Number.isInteger(s.minutes) && s.minutes >= 0) &&
        total === +project.request.duration;
    if (node)
      node.textContent =
        t("Allocated time: ", "الوقت الموزّع: ") +
        total +
        " / " +
        project.request.duration +
        " " +
        t("minutes", "دقيقة") +
        (ok ? "" : " · " + t("Adjust the times before saving.", "اضبط الوقت قبل الحفظ."));
    return ok;
  }
  function projects() {
    shell(
      t("Saved projects", "المشاريع المحفوظة"),
      `<p class="studio-muted">${t("Saved locally for this teacher account in this browser. Clearing browser data removes these projects. Export JSON for a backup.", "محفوظة محليًا لحساب المعلم بهذا المتصفح. حذف بيانات المتصفح يحذفها. نزّل JSON كنسخة احتياطية.")}</p><div class="studio-project-filters">${field("project-search", t("Search projects", "ابحث بالمشاريع"), projectQuery, 'type="search"')}${select(
        "project-type",
        t("Project type", "نوع المشروع"),
        [
          ["all", "All types", "كل الأنواع"],
          ["pptx", "PowerPoint", "PowerPoint"],
          ["docx", "Word", "Word"],
          ["plan", "Lesson plans", "تحضير الدروس"],
        ],
        projectType,
      )}</div><div id="studio-project-results"></div>`,
    );
    const update = () => {
      const query = projectQuery.toLocaleLowerCase();
      $("#studio-project-results").innerHTML = projectRows(
        P.listProjects().filter(
          (p) =>
            (projectType === "all" || p.format === projectType) &&
            p.title.toLocaleLowerCase().includes(query),
        ),
        true,
      );
    };
    update();
    $("[name=project-search]").oninput = (event) => {
      projectQuery = event.target.value;
      update();
    };
    $("[name=project-type]").onchange = (event) => {
      projectType = event.target.value;
      update();
    };
  }
  function route() {
    const hash = location.hash;
    if (busy) {
      generationVersion++;
      controller?.abort();
      busy = false;
    }
    if (
      dirty &&
      hash !== lastRoute &&
      !confirm(t("Leave without saving these changes?", "تغادر بدون حفظ التغييرات؟"))
    ) {
      history.replaceState(null, "", lastRoute || "lesson-planner.html");
      return;
    }
    dirty = false;
    lastRoute = hash;
    message = "";
    if (hash === "#create" || hash === "#plan") {
      tool = hash === "#plan" ? "plan" : "create";
      step = 1;
      wizard();
    } else if (hash === "#projects") projects();
    else if (hash.startsWith("#project=")) {
      try {
        project = P.getLessonPreview(hash.slice(9));
        index = 0;
        selected.clear();
        undo = [];
        redo = [];
        preview();
      } catch {
        home();
        notify(t("Project not found for this account.", "المشروع غير موجود لهذا الحساب."), "error");
      }
    } else home();
  }
  document.addEventListener("click", (event) => {
    const rename = event.target.closest("[data-rename]"),
      duplicate = event.target.closest("[data-duplicate]"),
      del = event.target.closest("[data-delete]");
    try {
      if (rename) {
        const p = P.getLessonPreview(rename.dataset.rename),
          name = prompt(t("Project name", "اسم المشروع"), p.title);
        if (name?.trim()) {
          p.title = name.trim().slice(0, 150);
          P.saveProject(p);
          projects();
          notify(t("Project renamed.", "تمت إعادة التسمية."));
        }
      }
      if (duplicate) {
        if (!OrbitSubscriptions.allow("planning")) return;
        const p = P.getLessonPreview(duplicate.dataset.duplicate);
        p.id = crypto.randomUUID();
        p.revision = 0;
        p.createdAt = new Date().toISOString();
        p.title += " · " + t("Copy", "نسخة");
        P.saveProject(p);
        projects();
        notify(t("Project duplicated.", "تم نسخ المشروع."));
      }
      if (
        del &&
        confirm(t("Delete this project from this browser?", "تحذف هذا المشروع من المتصفح؟"))
      ) {
        P.deleteProject(del.dataset.delete);
        projects();
        notify(t("Project deleted.", "تم حذف المشروع."));
      }
    } catch {
      notify(
        t(
          "Could not update projects. Check browser storage.",
          "تعذّر تحديث المشاريع. افحص تخزين المتصفح.",
        ),
        "error",
      );
    }
  });
  window.addEventListener("hashchange", route);
  window.addEventListener("beforeunload", (event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.addEventListener("pagehide", () => controller?.abort());
  route();
})();
