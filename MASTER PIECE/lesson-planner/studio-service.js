/* Frontend-only adapters. No AI endpoint, curriculum database or Office exporter is configured. */
(() => {
  "use strict";
  const A = OrbitAuth,
    copy = (v) => JSON.parse(JSON.stringify(v)),
    jobs = new Map();
  const t = (en, ar, lang) => (lang === "ar" ? ar : en);
  function teacher() {
    const u = A.current();
    if (u?.role !== "teacher") throw Error("ROLE_DENIED");
    return u;
  }
  const key = () => "orbit.ai.studio.projects.v1." + teacher().email;
  function listProjects() {
    const data = A.get(key(), []);
    return Array.isArray(data) ? copy(data) : [];
  }
  function getLessonPreview(id) {
    const p = listProjects().find((x) => x.id === id);
    if (!p) throw Error("PROJECT_NOT_FOUND");
    return p;
  }
  function saveProject(project) {
    teacher();
    if (!project?.id || !project.request || !Array.isArray(project.slides))
      throw Error("INVALID_PROJECT");
    validate(project.request);
    if (
      project.kind === "plan" &&
      (project.slides.some(
        (s) => s.minutes !== undefined && (!Number.isInteger(s.minutes) || s.minutes < 0),
      ) ||
        project.slides.reduce((n, s) => n + (s.minutes || 0), 0) !== +project.request.duration)
    )
      throw Error("INVALID_TIMING");
    const all = listProjects(),
      i = all.findIndex((x) => x.id === project.id);
    if (i >= 0 && project.revision !== all[i].revision) throw Error("PROJECT_CONFLICT");
    const saved = {
      ...copy(project),
      owner: teacher().email,
      updatedAt: new Date().toISOString(),
      revision: (project.revision || 0) + 1,
    };
    if (i >= 0) all[i] = saved;
    else all.unshift(saved);
    A.set(key(), all);
    return copy(saved);
  }
  function deleteProject(id) {
    A.set(
      key(),
      listProjects().filter((p) => p.id !== id),
    );
  }
  function validate(r) {
    teacher();
    if (
      !r ||
      !String(r.topic || "").trim() ||
      String(r.topic).length > 150 ||
      !String(r.grade || "").trim() ||
      !Number.isInteger(+r.duration) ||
      +r.duration < 10 ||
      +r.duration > 120 ||
      !["ar", "en"].includes(r.language)
    )
      throw Error("INVALID_REQUEST");
    if (!["pptx", "docx", "plan"].includes(r.format)) throw Error("INVALID_FORMAT");
  }
  function wait(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException("Cancelled", "AbortError"));
      const abort = () => {
          clearTimeout(timer);
          reject(new DOMException("Cancelled", "AbortError"));
        },
        timer = setTimeout(() => {
          signal?.removeEventListener("abort", abort);
          resolve();
        }, ms);
      signal?.addEventListener("abort", abort, { once: true });
    });
  }
  function sample(r, kind) {
    const L = (en, ar) => t(en, ar, r.language),
      topic = r.topic.trim(),
      layouts =
        r.format === "docx"
          ? ["cover", "concept", "comparison", "activity", "assessment", "summary"]
          : [
              "cover",
              "section",
              "concept",
              "comparison",
              "process",
              "activity",
              ...(r.activities?.includes("experiment") ? ["experiment"] : []),
              "assessment",
              ...(r.duration >= 45 ? ["timeline"] : []),
              "summary",
              "exit",
            ];
    const titles = {
      cover: topic,
      section: L("Start with a question", "نبدأ بسؤال"),
      concept: L("The central idea", "الفكرة الأساسية"),
      comparison: L("Compare and explain", "قارن وفسّر"),
      process: L("From idea to application", "من الفكرة إلى التطبيق"),
      activity: L("Classroom activity", "نشاط صفّي"),
      experiment: L(
        "Observation activity · teacher review required",
        "نشاط ملاحظة · يلزم مراجعة المعلم",
      ),
      assessment: L("Check understanding", "نتحقق من الفهم"),
      timeline: L("Our learning sequence", "تسلسل تعلّمنا"),
      summary: L("What we learned", "شو تعلّمنا؟"),
      exit: L("Exit ticket", "بطاقة الخروج"),
    };
    const bodies = {
      cover: L(
        `A sample teaching resource about ${topic}. Adapt the following prompts to your students before teaching.`,
        `مادة تعليمية نموذجية حول ${topic}. عدّل الإرشادات التالية بما يناسب طلابك قبل التدريس.`,
      ),
      section: L(
        `Where do you encounter ${topic}? Ask learners to share one observation, then record their questions.`,
        `وين بنشوف ${topic}؟ اطلب من الطلاب مشاركة ملاحظة، ثم دوّن أسئلتهم.`,
      ),
      concept: L(
        `Introduce the key terms of ${topic}. Add a verified explanation from your chosen reference, then check understanding in students’ own words.`,
        `قدّم المصطلحات الأساسية في ${topic}. أضف شرحًا موثوقًا من مرجعك، ثم اطلب من الطلاب تفسيره بكلماتهم.`,
      ),
      comparison: L(
        "Example: add a verified situation where the idea applies.\nNon-example: add a contrasting situation and explain the difference.",
        "مثال: أضف موقفًا موثوقًا تنطبق عليه الفكرة.\nمثال مضاد: أضف موقفًا مختلفًا وفسّر الفرق.",
      ),
      process: L(
        "Observe the situation\nIdentify the important information\nApply the idea\nExplain and check the result",
        "لاحظ الموقف\nحدد المعلومات المهمة\nطبّق الفكرة\nفسّر النتيجة وتحقق منها",
      ),
      activity: L(
        `Work in pairs: choose a situation related to ${topic}, explain it, and share your reasoning. Adjust grouping to your selected strategy.`,
        `اشتغلوا بأزواج: اختاروا موقفًا يرتبط بـ${topic}، فسّروه وشاركوا طريقة تفكيركم. عدّل التجميع حسب الاستراتيجية المختارة.`,
      ),
      experiment: L(
        "Use a safe observation or paper model chosen by the teacher. No heat, chemicals or mains electricity. The teacher must assess suitability, supervise and approve all equipment before use.",
        "استخدم ملاحظة آمنة أو نموذجًا ورقيًا يختاره المعلم. بدون حرارة أو مواد كيميائية أو كهرباء منزلية. يقيّم المعلم الملاءمة ويشرف ويوافق على الأدوات قبل الاستخدام.",
      ),
      assessment: L(
        "Explain the idea in your own words.\nApply it to a new example.\nWhat evidence supports your answer?",
        "اشرح الفكرة بكلماتك.\nطبّقها على مثال جديد.\nما الدليل اللي بدعم إجابتك؟",
      ),
      timeline: L(
        "Recall prior knowledge → Explore an example → Practise → Share feedback",
        "استرجاع التعلم القبلي ← استكشاف مثال ← تدريب ← مشاركة التغذية الراجعة",
      ),
      summary: L(
        `Write three key ideas about ${topic}, one connection and one question for the next lesson.`,
        `دوّن ثلاث أفكار أساسية حول ${topic}، ورابطًا واحدًا، وسؤالًا للحصة القادمة.`,
      ),
      exit: L(
        "One idea I can explain…\nOne thing I still want to understand…",
        "فكرة بقدر أشرحها…\nوشغلة لسه بدي أفهمها…",
      ),
    };
    let slides = layouts.map((layout, i) => ({
      id: crypto.randomUUID(),
      layout,
      title: titles[layout],
      body: bodies[layout],
      notes: L(
        "Illustrative draft. Verify subject content, age suitability and timing before classroom use.",
        "مسودة توضيحية. راجع المحتوى وملاءمة العمر والوقت قبل الاستخدام الصفّي.",
      ),
    }));
    if (kind === "plan") {
      const duration = +r.duration,
        weights = [0.12, 0.25, 0.35, 0.18, 0.1],
        minutes = weights.map((w) => Math.floor(duration * w));
      for (let i = 0, left = duration - minutes.reduce((a, b) => a + b, 0); left > 0; left--, i++)
        minutes[i % 5]++;
      const labels = [
        L("Introduction", "التهيئة"),
        L("Explanation", "الشرح"),
        L("Activity", "النشاط"),
        L("Assessment", "التقويم"),
        L("Closure", "الختام"),
      ];
      slides = [
        {
          id: crypto.randomUUID(),
          layout: "concept",
          title: L("Learning objectives", "الأهداف التعليمية"),
          body: L(
            `Identify the central ideas of ${topic}.\nExplain an example using appropriate terms.`,
            `يتعرّف الأفكار الأساسية في ${topic}.\nيفسّر مثالًا باستخدام المصطلحات المناسبة.`,
          ),
          notes: "",
        },
        {
          id: crypto.randomUUID(),
          layout: "summary",
          title: L("Expected outcomes", "نواتج التعلم المتوقعة"),
          body: L(
            "Students explain an idea, apply it to a suitable example and reflect on their understanding. Teacher review is required.",
            "يفسّر الطالب فكرة ويطبّقها على مثال ملائم ويتأمل فهمه. يلزم مراجعة المعلم.",
          ),
          notes: "",
        },
        {
          id: crypto.randomUUID(),
          layout: "concept",
          title: L("Prerequisites and materials", "التعلم القبلي والمواد"),
          body: L(
            "Elicit prior understanding. Use the teacher’s verified references, board and paper. Adapt materials to age and available resources.",
            "استكشف الفهم السابق. استخدم مراجع المعلم الموثوقة والسبورة والورق. عدّل المواد حسب العمر والموارد المتاحة.",
          ),
          notes: "",
        },
        ...labels.map((title, i) => ({
          id: crypto.randomUUID(),
          layout: "activity",
          title,
          body: [
            bodies.section,
            bodies.concept,
            bodies.activity,
            bodies.assessment,
            bodies.summary,
          ][i],
          minutes: minutes[i],
          notes: "",
        })),
        {
          id: crypto.randomUUID(),
          layout: "summary",
          title: L("Final assessment and reflection", "التقويم الختامي والتأمل"),
          body: L(
            "Use an exit ticket. Record evidence of understanding and one adjustment for the next lesson.",
            "استخدم بطاقة خروج. سجّل دليل الفهم وتعديلًا واحدًا للحصة القادمة.",
          ),
          notes: "",
        },
      ];
    }
    return {
      id: crypto.randomUUID(),
      version: 1,
      revision: 0,
      kind,
      format: r.format,
      title: topic,
      language: r.language,
      request: copy(r),
      slides,
      template: kind === "plan" ? { id: "provisional-v1", official: false } : null,
      provenance: { adapter: "mock", curriculumVerified: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  async function generate(r, kind, { signal, onProgress, demoFailure = false } = {}) {
    validate(r);
    const id = crypto.randomUUID();
    jobs.set(id, { id, status: "running", stage: 0 });
    try {
      for (let i = 0; i < 4; i++) {
        jobs.set(id, { id, status: "running", stage: i });
        onProgress?.({ jobId: id, stage: i, mock: true });
        await wait(220, signal);
      }
      if (demoFailure) throw Error("DEMO_GENERATION_FAILED");
      const p = sample(r, kind);
      jobs.set(id, { id, status: "complete", stage: 4, projectId: p.id });
      return p;
    } catch (e) {
      jobs.set(id, { id, status: e.name === "AbortError" ? "cancelled" : "failed" });
      throw e;
    }
  }
  async function editLesson(
    { project, instruction, scope = "current", slideIds = [] },
    { signal } = {},
  ) {
    teacher();
    if (!String(instruction || "").trim()) throw Error("EMPTY_INSTRUCTION");
    await wait(220, signal);
    const p = copy(project),
      all = scope === "all";
    let changed = 0;
    for (const s of p.slides) {
      if (!all && !slideIds.includes(s.id)) continue;
      const L = (en, ar) => t(en, ar, p.language);
      s.body +=
        "\n\n" + L("Demo revision suggestion: ", "اقتراح تعديل تجريبي: ") + instruction.trim();
      changed++;
    }
    if (!changed) throw Error("NO_SLIDES_SELECTED");
    return p;
  }
  function exportLesson(projectId, format) {
    const p = getLessonPreview(projectId);
    if (format !== "json") throw Error("EXPORT_NOT_AVAILABLE");
    return new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
  }
  window.OrbitLessonStudio = {
    lessonGenerationService: {
      createLesson: (r, o) => generate(r, "lesson", o),
      getGenerationStatus: (id) => copy(jobs.get(id) || { id, status: "unknown" }),
    },
    lessonPlanService: {
      createLessonPlan: (r, o) => generate({ ...r, format: "plan" }, "plan", o),
    },
    lessonEditingService: { editLesson },
    lessonProjectService: { saveProject, listProjects, getLessonPreview, deleteProject },
    lessonExportService: { exportLesson },
    layouts: [
      "cover",
      "section",
      "concept",
      "comparison",
      "timeline",
      "process",
      "activity",
      "experiment",
      "assessment",
      "summary",
      "exit",
    ],
    adapter: "mock",
  };
})();
