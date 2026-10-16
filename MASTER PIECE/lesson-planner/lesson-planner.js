"use strict";
const O = ORBIT,
  { t, esc } = O,
  key = "orbit.lesson.plans." + (O.user.email || "guest");
let plans = O.get(key, []),
  active = null;
const strategies = [
    ["cooperative", "Cooperative learning", "التعلم التعاوني"],
    ["inquiry", "Inquiry learning", "التعلم بالاستقصاء"],
    ["problems", "Problem solving", "حل المشكلات"],
    ["direct", "Direct instruction", "الشرح المباشر"],
    ["flipped", "Flipped classroom", "الصف المقلوب"],
  ],
  strategy = (id) => {
    const s = strategies.find((s) => s[0] === id);
    return s ? t(s[1], s[2]) : id;
  };
const field = (name, label, value = "", type = "text", extra = "") =>
    `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`,
  area = (name, label, value = "") =>
    `<label>${label}<textarea name="${name}">${esc(value)}</textarea></label>`;
function persist() {
  O.set(key, plans);
}
function list() {
  return `<aside class="planner-sidebar"><div class="planner-sidebar-heading"><span class="planner-kicker">${t("YOUR WORKSPACE", "مساحة شغلك")}</span><h2>${t("My saved plans", "تحضيراتي المحفوظة")}</h2><p>${plans.length} ${t("saved drafts", "مسودات محفوظة")}</p></div><div class="plans-list">${plans.map((p) => `<article class="plan-item"><strong>${esc(p.topic)}</strong><small>${esc(p.grade)} · ${p.duration} ${t("min", "دقيقة")} × ${p.sessions}</small><p><button class="btn soft" data-open="${p.id}">${t("Open & edit", "فتح وتعديل")}</button> <button class="btn soft" data-duplicate-plan="${p.id}">${t("Duplicate · Pro", "نسخ التحضير · Pro")}</button> <button class="btn soft" data-delete-plan="${p.id}">${t("Delete", "حذف")}</button></p></article>`).join("") || `<div class="planner-empty"><span aria-hidden="true">✧</span><h3>${t("Your first idea starts here.", "أول فكرة بتبدأ هون.")}</h3><p>${t("Create a draft and return to it here whenever you need.", "أنشئ مسودة وارجع إلها من هون بأي وقت.")}</p></div>`}</div></aside>`;
}
function renderSetup() {
  active = null;
  O.shell(
    t("Create a lesson plan", "إنشاء تحضير درس"),
    `<div class="planner-tools"><span class="planner-kicker">${t("FROM AN IDEA TO A LESSON", "من فكرة إلى حصة")}</span><button class="btn soft" id="planner-language">${t("العربية", "English")}</button></div><section class="hero planner-hero"><h2>${t("Your lesson. Its time. Its strategy.", "حصتك، وقتها، واستراتيجيتها.")}</h2><p>${t("Bring your topic, time and teaching approach together in a draft you can shape.", "اجمع موضوعك ووقتك وطريقتك بالتدريس، بمسودة بتقدر تطوّرها.")}</p><div class="ai-steps"><span>${t("Choose", "اختر")}</span><span>${t("Prepare", "حضّر")}</span><span>${t("Review", "راجع")}</span><span>${t("Export", "صدّر")}</span></div></section><div class="planner-split"><section class="card planner-setup"><div class="planner-form-heading"><h2>${t("Set up your lesson", "خلّينا نرتّب حصتك")}</h2><p>${t("Start with the essentials, then add the context that helps your students learn.", "ابدأ بالأساسيات، وبعدها أضف تفاصيل بتساعد طلابك يتعلّموا.")}</p></div><form id="setup-form" data-orbit-wizard="sections"><div class="setup-grid"><h3 class="setup-section-title"><span>01</span>${t("Lesson essentials", "أساسيات الدرس")}</h3>${field("subject", t("Subject", "المبحث"), "", "text", 'required maxlength="100"')}${field("grade", t("Grade / level", "الصف / المستوى"), "", "text", 'required maxlength="60"')}${field("unit", t("Unit title", "عنوان الوحدة"), "", "text", 'maxlength="100"')}${field("topic", t("Lesson topic", "عنوان الدرس"), "", "text", 'required maxlength="150"')}${field("duration", t("Minutes per lesson", "مدة الحصة بالدقائق"), 45, "number", 'required min="10" max="120"')}${field("sessions", t("Number of lessons", "عدد الحصص"), 1, "number", 'required min="1" max="4"')}<label>${t("Teaching strategy", "استراتيجية التدريس")}<select name="strategy">${strategies.map((s) => `<option value="${s[0]}">${t(s[1], s[2])}</option>`).join("")}</select></label><label>${t("Preferred final file", "صيغة الملف النهائية")}<select name="format"><option value="pdf">PDF</option><option value="word">Word (.docx)</option></select></label><h3 class="setup-section-title"><span>02</span>${t("Curriculum and classroom context", "المنهاج وسياق الصف")}</h3>${field("country", t("Country / curriculum", "الدولة / المنهاج"))}${field("from", t("From date", "من تاريخ"), "", "date")}${field("to", t("To date", "إلى تاريخ"), "", "date")}${field("materials", t("Available equipment", "الأدوات المتاحة"), "", "text", 'placeholder="' + t("Screen, lab, internet…", "شاشة، مختبر، إنترنت…") + '"')}${area("needs", t("Student needs / differentiation", "مستوى الطلاب واحتياجات الدعم"))}${area("prior", t("Prior learning", "التعلم القبلي"))}<h3 class="setup-section-title"><span>03</span>${t("Your reference", "مرجعك التعليمي")}</h3><label class="wide">${t("Optional textbook pages · PDF or images", "صفحات الكتاب اختيارية · PDF أو صور")}<input name="source" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"><small>${t("Stored locally as a reference. It is not read or analysed by AI yet.", "تُحفظ محليًا كمرجع، ولا تُقرأ أو تُحلّل بالـAI حاليًا.")}</small></label></div><div class="status-note"><b>${t("AI generation awaits backend connection", "توليد AI بانتظار ربط الـBackend")}</b><p>${t("This version creates an editable draft and distributes lesson time. Outcomes, activities, assessments, worksheets and video recommendations are not generated by AI yet.", "هذه النسخة تنشئ مسودة قابلة للتعديل وتوزّع الوقت. النتاجات والأنشطة والتقويم وأوراق العمل واقتراح الفيديوهات لا تُولّد بالـAI بعد.")}</p></div><p id="setup-error" class="error" role="status"></p><button class="btn">${t("Create editable draft", "إنشاء مسودة قابلة للتعديل")}</button> <button class="btn soft" disabled>${t("Generate with AI · soon", "توليد بالـAI · قريبًا")}</button></form></section>${list()}</div>`,
  );
  document.getElementById("planner-language").onclick = () => {
    const prefs = O.get("orbit.student.v1", {});
    prefs.lang = document.documentElement.lang === "ar" ? "en" : "ar";
    O.set("orbit.student.v1", prefs);
    location.reload();
  };
  bindList();
  document.getElementById("setup-form").onsubmit = async (e) => {
    e.preventDefault();
    if (!OrbitSubscriptions.allow("planning")) return;
    const form = e.target,
      d = new FormData(form),
      p = Object.fromEntries([...d].filter(([k]) => k !== "source"));
    p.duration = +p.duration;
    p.sessions = +p.sessions;
    const err = document.getElementById("setup-error"),
      button = form.querySelector("button[type=submit],button:not([type])");
    if (p.from && p.to && p.to < p.from) {
      err.textContent = t(
        "End date must follow start date.",
        "تاريخ النهاية يجب ألا يسبق البداية.",
      );
      return;
    }
    button.disabled = true;
    try {
      const file = form.elements.source.files[0];
      if (file) {
        if (
          !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type) ||
          file.size > 10 * 1024 * 1024
        )
          throw Error(
            t(
              "Reference must be PDF/image under 10 MB.",
              "المرجع يجب أن يكون PDF أو صورة بحجم أقل من 10 MB.",
            ),
          );
        const asset = "source-" + crypto.randomUUID();
        await O.media(asset, file);
        p.source = { key: asset, name: file.name, type: file.type };
      }
      p.id = crypto.randomUUID();
      p.rows = [];
      const stages = [
          t("Preparation", "التهيئة"),
          t("Explanation", "الشرح"),
          t("Student activity", "نشاط الطلاب"),
          t("Assessment", "التقويم"),
          t("Closure", "الختام"),
        ],
        weights = [0.1, 0.25, 0.35, 0.2];
      for (let session = 1; session <= p.sessions; session++) {
        let remaining = p.duration;
        for (let i = 0; i < 5; i++) {
          const minutes = i === 4 ? remaining : Math.floor(p.duration * weights[i]);
          remaining -= minutes;
          p.rows.push({
            session,
            stage: stages[i],
            outcomes: "",
            materials: p.materials,
            strategy: strategy(p.strategy),
            assessment: "",
            tool: "",
            procedures: "",
            minutes,
          });
        }
      }
      p.vertical = "";
      p.horizontal = "";
      p.reflection = { satisfied: "", challenges: "", improvements: "" };
      p.follow = Array.from({ length: 5 }, () => ({
        date: "",
        section: "",
        period: "",
        achieved: "",
        homework: "",
      }));
      p.worksheet = "";
      p.answers = "";
      p.videos = "";
      p.savedAt = new Date().toISOString();
      const next = [p, ...plans];
      O.set(key, next);
      plans = next;
      active = p;
      renderPlan();
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      button.disabled = false;
    }
  };
}
function bindList() {
  document.querySelectorAll("[data-duplicate-plan]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!OrbitSubscriptions.allow("productivity")) return;
        const original = plans.find((p) => p.id === b.dataset.duplicatePlan);
        if (!original) return;
        const copy = structuredClone(original);
        copy.id = crypto.randomUUID();
        copy.topic += " · " + t("Copy", "نسخة");
        copy.savedAt = new Date().toISOString();
        try {
          const next = [copy, ...plans];
          O.set(key, next);
          plans = next;
          renderSetup();
        } catch {
          OrbitSubscriptions.modal(
            t("Could not save", "تعذر الحفظ"),
            "<p>" + t("Check browser storage.", "تحقق من تخزين المتصفح.") + "</p>",
          );
        }
      }),
  );
  document.querySelectorAll("[data-open]").forEach(
    (b) =>
      (b.onclick = () => {
        active = plans.find((p) => p.id === b.dataset.open);
        renderPlan();
      }),
  );
  document.querySelectorAll("[data-delete-plan]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!OrbitSubscriptions.allow("planning")) return;
        const d = O.dialog(
          `<h2>${t("Delete this draft?", "حذف المسودة؟")}</h2><button class="btn" id="confirm-plan-delete">${t("Delete draft", "حذف المسودة")}</button>`,
        );
        d.querySelector("button#confirm-plan-delete").onclick = () => {
          plans = plans.filter((p) => p.id !== b.dataset.deletePlan);
          persist();
          d.close();
          renderSetup();
        };
      }),
  );
}
function timing() {
  return Array.from({ length: active.sessions }, (_, i) => ({
    session: i + 1,
    total: active.rows
      .filter((r) => r.session === i + 1)
      .reduce((sum, r) => sum + (+r.minutes || 0), 0),
  }));
}
function timeStatus() {
  const totals = timing(),
    valid = totals.every((x) => x.total === active.duration);
  document.getElementById("time-status").textContent = totals
    .map(
      (x) =>
        t("Lesson", "الحصة") +
        " " +
        x.session +
        ": " +
        x.total +
        " / " +
        active.duration +
        " " +
        t("min", "دقيقة"),
    )
    .join(" · ");
  document.getElementById("time-status").className = valid ? "timing" : "error";
  document.getElementById("print-plan").disabled = !valid;
  return valid;
}
function renderPlan() {
  const p = active;
  O.shell(
    t("Your lesson draft", "مسودة تحضيرك"),
    `<div class="toolbar"><button class="btn soft" id="back">← ${t("All drafts / new plan", "التحضيرات / تحضير جديد")}</button><button class="btn" id="save-plan">${t("Save changes", "حفظ التعديلات")}</button><button class="btn soft" id="print-plan">${t("Print / save PDF", "طباعة / حفظ PDF")}</button><button class="btn soft" disabled>${t("Export Word · backend required", "تصدير Word · يحتاج Backend")}</button></div><p class="status-note">${t("Manual editable draft, not AI-generated. The final Word document and generated teaching pack await backend integration. PDF is available through browser printing.", "مسودة يدوية قابلة للتعديل، وليست ناتج AI. ملف Word وحزمة التدريس المولّدة بانتظار ربط الخادم. PDF متاح من نافذة الطباعة في المتصفح.")}</p><p id="save-status" role="status"></p><form id="plan-form"><section class="plan-paper" id="plan-paper"><h2 class="plan-heading">${t("Lesson plan", "خطة درس")}</h2><div class="plan-metadata"><span>${t("Grade / level", "الصف / المستوى")}: ${esc(p.grade)}</span><span>${t("Subject", "المبحث")}: ${esc(p.subject)}</span><span>${t("Unit", "الوحدة")}: ${esc(p.unit)}</span><span>${t("Lesson title", "عنوان الدرس")}: ${esc(p.topic)}</span><span>${t("Lessons", "عدد الحصص")}: ${p.sessions} × ${p.duration} ${t("min", "دقيقة")}</span><span>${t("Curriculum", "المنهاج")}: ${esc(p.country)}</span><span>${t("From", "من")}: ${esc(p.from)}</span><span>${t("To", "إلى")}: ${esc(p.to)}</span><span>${t("Strategy", "الاستراتيجية")}: ${esc(strategy(p.strategy))}</span></div>${area("prior", t("Prior learning", "التعلم القبلي"), p.prior)}<div class="reflect-grid">${area("vertical", t("Vertical integration", "التكامل الرأسي"), p.vertical)}${area("horizontal", t("Horizontal integration", "التكامل الأفقي"), p.horizontal)}</div><p id="time-status" class="timing"></p><div class="table-scroll"><table class="plan-table"><thead><tr><th rowspan="2">${t("No. / lesson / phase", "الرقم / الحصة / المرحلة")}</th><th rowspan="2">${t("Specific outcomes", "النتاجات الخاصة")}</th><th rowspan="2">${t("Materials, equipment & sources", "المواد والأدوات والتجهيزات / مصادر التعلم")}</th><th rowspan="2">${t("Teaching strategy", "استراتيجيات التدريس")}</th><th colspan="2">${t("Assessment", "التقويم")}</th><th colspan="2">${t("Implementation", "التنفيذ")}</th></tr><tr><th>${t("Strategy", "الاستراتيجية")}</th><th>${t("Tool", "الأداة")}</th><th>${t("Procedures", "الإجراءات")}</th><th>${t("Time", "الزمن")}</th></tr></thead><tbody>${p.rows.map((r, i) => `<tr><td>${i + 1}<br>${t("Lesson", "الحصة")} ${r.session}<br>${esc(r.stage)}</td>${["outcomes", "materials", "strategy", "assessment", "tool", "procedures"].map((k) => `<td><textarea aria-label="${k} ${i + 1}" data-row="${i}" data-key="${k}" class="${k}">${esc(r[k])}</textarea></td>`).join("")}<td><input aria-label="${t("Minutes for phase", "دقائق المرحلة")} ${i + 1}" type="number" min="0" max="120" step="1" data-row="${i}" data-key="minutes" value="${r.minutes}" required></td></tr>`).join("")}</tbody></table></div><div class="reflect-grid"><section><h2>${t("Self-reflection · after teaching", "التأمل الذاتي · بعد تنفيذ الحصة")}</h2>${["satisfied", "challenges", "improvements"].map((k, i) => area("reflection-" + k, [t("I felt satisfied with", "أشعر بالرضا عن"), t("Challenges I faced", "تحديات واجهتني"), t("Suggestions for improvement", "اقتراحات للتحسين")][i], p.reflection[k])).join("")}</section><section><h2>${t("Daily follow-up · after teaching", "جدول المتابعة اليومي · بعد التنفيذ")}</h2><div class="table-scroll"><table class="follow-table"><thead><tr>${[t("Date", "اليوم والتاريخ"), t("Section", "الشعبة"), t("Period", "الحصة"), t("Achieved outcomes", "النتاجات المتحققة"), t("Homework", "الواجب البيتي")].map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${p.follow.map((row, i) => `<tr>${["date", "section", "period", "achieved", "homework"].map((k) => `<td><input aria-label="${k} ${i + 1}" data-follow="${i}" data-key="${k}" value="${esc(row[k])}"></td>`).join("")}</tr>`).join("")}</tbody></table></div></section></div><p>${t("Teacher signature: __________ · Subject coordinator: __________ · Principal: __________ · Supervisor: __________", "توقيع المعلم: __________ · منسق المبحث: __________ · مدير المدرسة: __________ · المشرف: __________")}</p></section><section class="card"><h2>${t("Teaching pack · fill manually for now", "حزمة التدريس · تعبئة يدوية حاليًا")}</h2>${area("worksheet", t("Student worksheet", "ورقة عمل الطلاب"), p.worksheet)}${area("answers", t("Teacher answer key · private", "نموذج الإجابات للمعلم · خاص"), p.answers)}${area("videos", t("Video links · HTTPS, one per line", "روابط الفيديو · HTTPS، رابط لكل سطر"), p.videos)}<p class="muted">${t("Links are teacher-provided and have not been automatically verified. AI video recommendations will arrive with backend search.", "الروابط يضيفها المعلم ولم يتم التحقق منها آليًا. اقتراح الفيديوهات بالـAI سيُربط بالبحث في الخادم.")}</p><button class="btn soft" type="button" id="share-worksheet">${t("Prepare worksheet post in my channel", "تجهيز منشور ورقة العمل في قناتي")}</button><p class="muted">${t("The answer key and private reflection are not copied into the student post. Review the post before publishing.", "نموذج الإجابات والتأمل الخاص لا يُنسخان إلى منشور الطلاب. راجع المنشور قبل نشره.")}</p>${p.source ? `<h3>${t("Attached book reference", "مرجع الكتاب المرفق")}</h3>${O.attachment({ attachments: [p.source] })}` : ""}</section></form>`,
  );
  timeStatus();
  document.getElementById("back").onclick = renderSetup;
  document.getElementById("save-plan").onclick = () => {
    if (!OrbitSubscriptions.allow("planning")) return;
    capture();
    if (!document.getElementById("plan-form").reportValidity() || !timeStatus()) {
      document.getElementById("save-status").textContent = t(
        "Adjust the phase times to match each lesson duration.",
        "اضبط أزمنة المراحل لتساوي مدة كل حصة.",
      );
      return;
    }
    try {
      persist();
      document.getElementById("save-status").textContent = t(
        "Draft saved in this browser.",
        "تم حفظ المسودة في هذا المتصفح.",
      );
    } catch {
      document.getElementById("save-status").textContent = t(
        "Could not save the draft. Check browser storage and try again.",
        "تعذر حفظ المسودة. تحقق من مساحة المتصفح وجرّب ثانية.",
      );
    }
  };
  document.getElementById("plan-form").oninput = (e) => {
    if (e.target.dataset.row) {
      active.rows[+e.target.dataset.row][e.target.dataset.key] =
        e.target.dataset.key === "minutes" ? +e.target.value : e.target.value;
      timeStatus();
    }
  };
  document.getElementById("plan-form").onsubmit = (e) => e.preventDefault();
  document.getElementById("print-plan").onclick = printPlan;
  document.getElementById("share-worksheet").onclick = () => {
    capture();
    if (!p.worksheet.trim()) {
      document.getElementById("save-status").textContent = t(
        "Write the worksheet first.",
        "اكتب ورقة العمل أولًا.",
      );
      return;
    }
    persist();
    O.editor();
    const f = document.querySelector("#publish-form");
    if (f) {
      f.elements.title.value = t("Worksheet: ", "ورقة عمل: ") + p.topic;
      f.elements.body.value = p.worksheet;
      f.elements.type.value = "assignment";
    }
  };
  O.hydrate();
}
function capture() {
  const form = document.getElementById("plan-form");
  for (const name of ["prior", "vertical", "horizontal", "worksheet", "answers", "videos"])
    active[name] = form.elements[name].value;
  for (const k of ["satisfied", "challenges", "improvements"])
    active.reflection[k] = form.elements["reflection-" + k].value;
  document
    .querySelectorAll("[data-row]")
    .forEach(
      (el) =>
        (active.rows[+el.dataset.row][el.dataset.key] =
          el.dataset.key === "minutes" ? +el.value : el.value),
    );
  document
    .querySelectorAll("[data-follow]")
    .forEach((el) => (active.follow[+el.dataset.follow][el.dataset.key] = el.value));
  active.savedAt = new Date().toISOString();
}
function printPlan() {
  capture();
  if (!document.getElementById("plan-form").reportValidity() || !timeStatus()) return;
  persist();
  const clone = document.getElementById("plan-paper").cloneNode(true);
  clone.querySelectorAll("input,textarea").forEach((el) => {
    const div = document.createElement("div");
    div.className = "print-value";
    div.textContent = el.value || "................................";
    el.replaceWith(div);
  });
  clone.querySelector("#time-status")?.remove();
  const print = document.getElementById("print-area");
  print.innerHTML = "";
  print.append(clone);
  const pack = document.createElement("section");
  pack.innerHTML = "<h2>" + t("Student worksheet", "ورقة عمل الطلاب") + "</h2>";
  const work = document.createElement("div");
  work.className = "print-value";
  work.textContent = active.worksheet || t("Not added yet.", "لم تُضف بعد.");
  pack.append(work);
  if (active.answers) {
    const h = document.createElement("h2");
    h.className = "print-answer-page";
    h.textContent = t(
      "Teacher answer key · keep separate from student copies",
      "نموذج إجابات المعلم · يُفصل عن نسخة الطالب",
    );
    const a = document.createElement("div");
    a.className = "print-value";
    a.textContent = active.answers;
    pack.append(h, a);
  }
  if (active.videos) {
    const h = document.createElement("h2");
    h.textContent = t("Teacher-provided video links", "روابط الفيديو التي أضافها المعلم");
    const a = document.createElement("div");
    a.className = "print-value";
    a.textContent = active.videos;
    pack.append(h, a);
  }
  print.append(pack);
  window.print();
}
if (new URLSearchParams(location.search).has("legacy") || O.user.role !== "teacher") {
  if (O.user.role === "teacher") renderSetup();
  else {
    O.shell(
      t("Lesson prep preview", "معاينة تحضير الدروس"),
      `<section class="card"><h2>${t("Plan a lesson from start to finish", "حضّر الدرس من البداية للنهاية")}</h2><p>${t("Choose the subject, level and strategy, then organise preparation, explanation, activities, assessment and closure. Teachers can save editable drafts and print them. AI generation is awaiting a backend connection.", "اختر المبحث والمستوى والاستراتيجية، ثم وزّع وقت التهيئة والشرح والأنشطة والتقويم والختام. يستطيع المعلم حفظ المسودة وطباعتها. توليد الذكاء الاصطناعي ينتظر ربط الخادم.")}</p><ol><li>${t("Preparation: 5 minutes", "التهيئة: 5 دقائق")}</li><li>${t("Explanation: 10 minutes", "الشرح: 10 دقائق")}</li><li>${t("Activity: 15 minutes", "النشاط: 15 دقيقة")}</li><li>${t("Assessment and closure: 15 minutes", "التقويم والختام: 15 دقيقة")}</li></ol><button id="planner-preview-start" class="btn">${t("Create my lesson draft", "أنشئ تحضير درسي")}</button></section>`,
    );
    document.getElementById("planner-preview-start").onclick = () =>
      OrbitSubscriptions.requireAccount("teacher");
  }
}
