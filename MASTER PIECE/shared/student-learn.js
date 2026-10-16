/* Shared student presentation; existing flows supply correctness and content. */
(() => {
  "use strict";
  const O = ORBIT,
    { t, esc } = O;
  const mood = () =>
    localStorage.getItem("orbit.motion.preference") || O.get("orbit.student.v1", {}).mood || "fun";
  const activate = () => {
    document.body.classList.add("student-learn-space");
    document.body.dataset.mood = mood();
  };
  const stages = (step, complete = false, understood = false) =>
    `<nav class="learn-stages" aria-label="${t("Learning stages", "مراحل التعلم")}">${[t("Understand", "افهم"), t("Practice", "طبّق"), t("Master", "أتقن")].map((label, i) => `<span ${i === step ? 'aria-current="step"' : ""}><b>${complete || (i === 0 && understood) ? "✓" : i + 1}</b>${label}</span>`).join("")}</nav>`;
  const controls = () =>
    `<label class="learn-mood">${t("ORBIT Reactions", "تفاعلات ORBIT")}<select data-learn-mood><option value="fun" ${mood() === "fun" ? "selected" : ""}>${t("Fun · gentle reactions", "مرح · تفاعلات خفيفة")}</option><option value="calm" ${mood() === "calm" ? "selected" : ""}>${t("Calm · no playful effects", "هادئ · بدون مؤثرات مرحة")}</option></select></label><p class="learn-mode-status" role="status"></p>`;
  const done = (m) =>
    new Set(
      (m.read().correct || []).filter(
        (i) => Number.isInteger(i) && i >= 0 && i < m.questions.length,
      ),
    );
  const percent = (m) =>
    Math.round(((Number(!!m.read().understood) + done(m).size) / (m.questions.length + 1)) * 100);
  function animate(node) {
    if (mood() === "fun" && !matchMedia("(prefers-reduced-motion:reduce)").matches)
      node.animate(
        [
          { opacity: 0.6, transform: "translateY(3px) scale(.99)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 400, easing: "cubic-bezier(.23,1,.32,1)" },
      );
  }
  function nativeModel(c) {
    const key = "orbit.learning." + O.user.email,
      attempt = "orbit.practice." + O.user.email,
      entry = c.id + "-" + c.selectedLevel;
    return {
      title: t(...c.topic.name),
      summary: t(...c.topic.summary),
      example: t(...c.topic.simple),
      formula: c.topic.formula || "",
      questions: c.topic.questions.map((q) => ({
        question: t(...q.q),
        hint: t(...q.hint),
        solution: q.solution,
        explanation: t(...c.topic.summary),
      })),
      numeric: true,
      check: c.check,
      read: () => O.get(key, {})[entry] || { understood: false, correct: [] },
      last: (i) => O.get(attempt, {})[entry + "-" + i],
      commit(i, answer, correct, meta) {
        const all = O.get(key, {}),
          s = { ...(all[entry] || { understood: false, correct: [] }) },
          solved = new Set(s.correct || []);
        if (correct) solved.add(i);
        s.correct = [...solved];
        all[entry] = s;
        const attempts = O.get(attempt, {});
        attempts[entry + "-" + i] = { ...meta, answer, correct };
        const old = [localStorage.getItem(key), localStorage.getItem(attempt)];
        try {
          O.set(key, all);
          O.set(attempt, attempts);
        } catch (e) {
          [key, attempt].forEach((k, n) => {
            try {
              old[n] === null ? localStorage.removeItem(k) : localStorage.setItem(k, old[n]);
            } catch {}
          });
          throw e;
        }
      },
      understand() {
        const all = O.get(key, {});
        all[entry] = { ...(all[entry] || {}), understood: true };
        O.set(key, all);
      },
      lessonURL: "../lesson/lesson.html?topic=" + encodeURIComponent(c.id) + c.contextQuery,
      practiceURL: "../practice/practice.html?topic=" + encodeURIComponent(c.id) + c.contextQuery,
    };
  }
  function questionFlow(host, m) {
    let active = 0,
      sequence = 0,
      streak = 0,
      completionShown = false;
    const awarded = done(m);
    host.innerHTML = `<div data-learn-stages>${stages(1)}</div><header class="learn-practice-heading"><div><h2>${t("Put the idea into practice", "خلّينا نطبّق الفكرة")}</h2><p>${t("Try, use a hint, then review your reasoning.", "جرّب، خذ تلميح إذا احتجت، وبعدين راجع طريقة تفكيرك.")}</p></div><div>${controls()}</div></header><div class="learn-progress-row"><p data-learn-count role="status"></p><progress data-learn-meter max="${m.questions.length}" value="0" aria-label="${t("Correctly solved questions", "الأسئلة المحلولة بشكل صحيح")}"></progress></div><div class="learn-practice-layout"><div>${m.questions.map((q, i) => `<section class="learn-question" id="question-${i}" ${i ? "hidden" : ""}><h3 tabindex="-1">${t("Question", "السؤال")} <bdi>${i + 1} / ${m.questions.length}</bdi></h3><p class="learn-question-text" dir="auto">${esc(q.question)}</p><form data-learn-question="${i}" novalidate><label>${m.numeric ? t("Numeric answer · use the unit in the question", "إجابة عددية · بوحدة القياس المذكورة في السؤال") : t("Your answer", "إجابتك")}<input name="answer" ${m.numeric ? 'type="number" step="any" inputmode="decimal"' : 'type="text" maxlength="500"'} required aria-describedby="feedback-${i}"></label><button class="btn" type="submit">${t("Check answer", "تحقق من الإجابة")}</button></form><div id="feedback-${i}" class="learn-reaction" role="status" aria-live="polite" aria-atomic="true"></div><div class="learn-question-actions"><button type="button" class="btn soft" data-learn-prev="${i}" ${i ? "" : "disabled"}>${t("Previous", "السابق")}</button><button type="button" class="btn soft" data-learn-next="${i}" ${i === m.questions.length - 1 ? "hidden" : ""}>${t("Next question", "السؤال التالي")}</button></div></section>`).join("")}${!m.questions.length ? `<p class="learn-empty">${t("No practice questions were supplied. You can review the explanation.", "لم تصل أسئلة تدريب. تقدر تراجع الشرح.")}</p>` : ""}<section class="learn-completion" hidden><h3></h3><p></p><a class="btn soft" href="${esc(m.lessonURL || "../lessons/lessons.html")}">${t("Review understanding", "راجع الفهم")}</a><a class="btn" href="../lessons/lessons.html">${t("Explore another topic", "استكشف موضوعًا آخر")}</a></section></div><aside class="learn-practice-aside"><h3>${t("Your questions", "أسئلتك")}</h3><nav aria-label="${t("Choose a question", "اختيار سؤال")}">${m.questions.map((_, i) => `<button type="button" data-learn-jump="${i}">${t("Question", "السؤال")} ${i + 1}<span></span></button>`).join("")}</nav>${m.formula ? `<p class="learn-equation" dir="ltr">${esc(m.formula)}</p>` : ""}<p>${t("Correct answers remain saved. Repeating a solved question does not extend your streak.", "الإجابة الصحيحة بتضل محفوظة. إعادة نفس السؤال ما بتزيد سلسلة الإجابات.")}</p>${m.lessonURL ? `<a class="learn-text-link" href="${esc(m.lessonURL)}">${t("Back to explanation", "ارجع للشرح")}</a>` : ""}</aside></div>`;
    function refresh() {
      const solved = done(m),
        complete = solved.size === m.questions.length && m.questions.length > 0,
        master = complete && m.read().understood;
      host.querySelector("[data-learn-count]").innerHTML =
        "<bdi>" +
        solved.size +
        " / " +
        m.questions.length +
        "</bdi> " +
        t("solved correctly", "محلولة بشكل صحيح");
      host.querySelector("[data-learn-meter]").value = solved.size;
      host.querySelector("[data-learn-stages]").innerHTML = stages(
        master ? 2 : 1,
        master,
        !!m.read().understood,
      );
      host.querySelectorAll("[data-learn-jump]").forEach((b, i) => {
        b.setAttribute("aria-current", i === active ? "step" : "false");
        b.querySelector("span").textContent = solved.has(i) ? "✓" : "";
      });
      const panel = host.querySelector(".learn-completion");
      panel.hidden = !complete;
      if (complete) {
        panel.querySelector("h3").textContent = master
          ? t("Lesson completed", "أنهيت الدرس")
          : t("Practice completed", "أنهيت التدريب");
        panel.querySelector("p").textContent = master
          ? t(
              "You confirmed your understanding and solved all questions correctly.",
              "أكدت فهمك وحلّيت كل الأسئلة بشكل صحيح.",
            )
          : t(
              "All answers are correct. Review and confirm the explanation to complete the lesson.",
              "حلّيت الأسئلة صح. راجع الشرح وأكد فهمك حتى يكتمل الدرس.",
            );
      }
    }
    function select(i, focus = true) {
      active = Math.max(0, Math.min(m.questions.length - 1, i));
      host.querySelectorAll(".learn-question").forEach((s, n) => (s.hidden = n !== active));
      refresh();
      if (focus) host.querySelector("#question-" + active + " h3")?.focus({ preventScroll: true });
    }
    function feedback(i, correct, { restored = false, wrong = 0, celebrate = false } = {}) {
      const q = m.questions[i],
        box = host.querySelector("#feedback-" + i),
        fun = mood() === "fun" && !restored;
      const positive = [
          t("Nice work — you have the idea.", "كفو! ماسك الفكرة."),
          t("That is the right approach.", "يا سلام، هيك الفكرة!"),
          t("Keep that reasoning.", "صح! كمّل بنفس التفكير."),
          t("You connected the steps.", "ربطت الخطوات صح."),
        ],
        support = [
          t("Let’s try another approach.", "ولا يهمك، خلّينا نفكر بطريقة ثانية."),
          t("Use the hint and try once more.", "شوف التلميحة وجرّب من جديد."),
          t("Review one step at a time.", "نراجع خطوة خطوة، إنت قدّها."),
        ];
      const message = restored
        ? t("Your saved response", "إجابتك المحفوظة")
        : fun
          ? correct
            ? positive[sequence++ % positive.length]
            : support[Math.max(0, wrong - 1) % support.length]
          : correct
            ? t("Your reasoning is on track.", "تفكيرك بالاتجاه الصحيح.")
            : t("Review the hint before trying again.", "راجع التلميح قبل المحاولة التالية.");
      let hint =
        q.hint ||
        t(
          "Identify what is known and what the question asks for.",
          "حدد المعطيات والمطلوب في السؤال.",
        );
      if (wrong >= 2)
        hint +=
          " " +
          (m.formula
            ? t("Identify the unknown in: ", "حدد المجهول في: ") + "\u2066" + m.formula + "\u2069"
            : t("Break the explanation into smaller steps.", "قسّم الشرح لخطوات أصغر."));
      if (wrong >= 3)
        hint +=
          " " +
          t(
            "Write each step and check the units or key terms. Open the worked solution when ready.",
            "اكتب كل خطوة وراجع الوحدات أو الكلمات الأساسية. افتح الحل لما تكون جاهز.",
          );
      box.dataset.result = correct ? "correct" : "incorrect";
      box.innerHTML = `<div class="learn-reaction-heading"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${correct ? '<circle cx="16" cy="16" r="12"/><path d="m10 16 4 4 8-9"/>' : '<path d="M12 23h8M13 27h6M10 18a9 9 0 1 1 12 0c-2 2-2 3-2 5h-8c0-2 0-3-2-5Z"/>'}</svg><div><strong>${correct ? t("Correct answer", "إجابة صحيحة") : t("Not correct yet", "لسّه الإجابة مش صحيحة")}</strong><p>${esc(message)}</p></div></div><p dir="auto">${esc(correct ? q.explanation || m.summary || t("Your answer matches the expected response.", "إجابتك تطابق الإجابة المتوقعة.") : hint)}</p><p>${correct ? t("Continue to the next question, or review the explanation.", "كمّل للسؤال التالي، أو راجع الشرح.") : t("Edit your answer and check it again.", "عدّل إجابتك وجرّب التحقق مرة ثانية.")}</p>${!correct ? `<button class="learn-text-link" type="button" data-solution>${t("Show worked solution", "شاهد الحل خطوة بخطوة")}</button>` : ""}${fun && streak >= 3 && correct ? `<p class="learn-streak">${streak} ${t("new correct answers in a row in this session", "إجابات جديدة صحيحة ورا بعض في هذا التدريب")}</p>` : ""}`;
      box.querySelector("[data-solution]")?.addEventListener("click", (e) => {
        box.insertAdjacentHTML(
          "beforeend",
          `<div class="learn-worked-solution"><h4>${t("Worked solution", "الحل خطوة بخطوة")}</h4><p dir="auto">${esc(q.solution ?? q.answer ?? "")}</p><p dir="auto">${esc(q.explanation || m.example || m.summary || "")}</p></div>`,
        );
        e.currentTarget.disabled = true;
      });
      if (celebrate && !restored) animate(box);
    }
    host.querySelectorAll("[data-learn-question]").forEach((form) => {
      const i = +form.dataset.learnQuestion,
        last = m.last(i);
      if (last && last.answer !== undefined) {
        form.elements.answer.value = last.answer;
        feedback(i, !!last.correct, { restored: true, wrong: last.wrongAttempts || 0 });
      }
      form.onsubmit = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        const input = form.elements.answer,
          raw = input.value.trim(),
          box = host.querySelector("#feedback-" + i);
        if (!raw || (m.numeric && !Number.isFinite(input.valueAsNumber))) {
          input.setAttribute("aria-invalid", "true");
          box.dataset.result = "empty";
          box.textContent = t(
            "Enter an answer before checking.",
            "اكتب إجابتك أولًا، وبعدين تحقّق.",
          );
          input.focus({ preventScroll: true });
          return;
        }
        input.removeAttribute("aria-invalid");
        const answer = m.numeric ? input.valueAsNumber : raw,
          correct = m.check(answer, i),
          last = m.last(i) || {},
          wrong = (last.wrongAttempts || 0) + (correct ? 0 : 1),
          before = done(m).size;
        try {
          m.commit(i, answer, correct, {
            attempts: (last.attempts || 0) + 1,
            wrongAttempts: wrong,
          });
          const fresh = correct && !awarded.has(i);
          if (!correct) streak = 0;
          if (fresh) {
            awarded.add(i);
            streak++;
          }
          const milestone =
            correct &&
            done(m).size === m.questions.length &&
            before < m.questions.length &&
            !completionShown;
          if (milestone) completionShown = true;
          feedback(i, correct, { wrong, celebrate: milestone || (fresh && streak === 3) });
          refresh();
          if (milestone) animate(host.querySelector(".learn-completion"));
          host.dispatchEvent(new CustomEvent("learn:progress", { bubbles: true }));
        } catch {
          box.dataset.result = "error";
          box.textContent = t(
            "Could not save your response. Try again; completion is not confirmed.",
            "تعذّر حفظ إجابتك. جرّب مرة ثانية؛ ما تم تأكيد الإكمال.",
          );
        }
      };
    });
    host
      .querySelectorAll("[data-learn-next]")
      .forEach((b) => (b.onclick = () => select(+b.dataset.learnNext + 1)));
    host
      .querySelectorAll("[data-learn-prev]")
      .forEach((b) => (b.onclick = () => select(+b.dataset.learnPrev - 1)));
    host
      .querySelectorAll("[data-learn-jump]")
      .forEach((b) => (b.onclick = () => select(+b.dataset.learnJump)));
    host.querySelector("[data-learn-mood]").onchange = (e) => {
      try {
        const value = e.target.value,
          prefs = O.get("orbit.student.v1", {});
        localStorage.setItem("orbit.motion.preference", value);
        localStorage.setItem("orbitMood", value);
        O.set("orbit.student.v1", { ...prefs, mood: value });
        document.body.dataset.mood = value;
        host.querySelector(".learn-mode-status").textContent = t(
          "ORBIT Mood preference saved.",
          "تم حفظ إعداد ORBIT Mood.",
        );
        host
          .querySelectorAll(".learn-reaction,.learn-completion")
          .forEach((n) => n.getAnimations().forEach((a) => a.cancel()));
        host.querySelectorAll("[data-learn-question]").forEach((f) => {
          const i = +f.dataset.learnQuestion,
            last = m.last(i),
            result = host.querySelector("#feedback-" + i).dataset.result;
          if (last && ["correct", "incorrect"].includes(result))
            feedback(i, last.correct, { restored: true, wrong: last.wrongAttempts || 0 });
        });
      } catch {
        host.querySelector(".learn-mode-status").textContent = t(
          "Could not save this preference.",
          "تعذّر حفظ الإعداد.",
        );
      }
    };
    select(
      Math.max(
        0,
        m.questions.findIndex((_, i) => !done(m).has(i)),
      ),
      false,
    );
    return { refresh };
  }
  function lesson(c) {
    activate();
    const m = nativeModel(c);
    O.shell(
      m.title,
      `<div class="learn-workspace"><div data-lesson-stages>${stages(0)}</div><div class="learn-reading-layout"><article class="learn-reading"><h2>${t("Understand the idea", "افهم الفكرة")}</h2><p class="learn-level">${t("Level: ", "المستوى: ")}${c.selectedLevel === "primary" ? t("Primary", "أساسي") : c.selectedLevel === "university" ? t("University", "جامعي") : t("Secondary", "ثانوي")}</p><p class="learn-summary">${esc(m.summary)}</p>${m.formula ? `<div class="learn-equation" dir="ltr">${esc(m.formula)}</div>` : ""}<h3>${t("An example that connects the idea", "مثال يقرّب الفكرة")}</h3><p dir="auto">${esc(m.example)}</p><h3>${t("Before practising", "قبل ما تطبّق")}</h3><p>${t("Identify the known information, the unknown, and the units or key terms.", "حدد المعطيات والمطلوب والوحدات أو الكلمات الأساسية.")}</p><div class="learn-reading-actions"><button class="btn soft" id="mark-understood">${m.read().understood ? t("Understanding saved", "فهمك محفوظ") : t("I understood the explanation", "فهمت الشرح")}</button><a class="btn" href="${esc(m.practiceURL)}">${t("Start practice", "ابدأ التدريب")}</a></div><p id="learning-progress" role="status"></p><section id="teacher-videos"><h3>${t("Learn with your teachers", "تعلّم مع معلميك")}</h3>${c.videos.map((p) => `<article><h4>${esc(p.title)}</h4><p>${esc(O.teacher(O.channels().find((c) => c.id === p.channel)?.teacher))}</p>${O.attachment(p)}<a class="learn-text-link" href="../channel/channel.html?id=${encodeURIComponent(p.channel)}">${t("Source channel", "القناة المصدر")}</a></article>`).join("") || `<p>${t("No teacher video is linked to this topic yet.", "لسّه ما فيه فيديو معلم مرتبط بهذا الموضوع.")}</p>`}</section></article><aside class="learn-reading-aside"><h3>${t("Your progress", "تقدّمك")}</h3><progress id="learning-meter" max="100" value="${percent(m)}" aria-label="${t("Lesson progress", "تقدم الدرس")}"></progress><p>${t("Saved understanding and correct answers; no estimated grades.", "حسب فهمك المحفوظ وإجاباتك الصحيحة، بدون درجات تقديرية.")}</p><a class="btn soft" href="../lab/lab.html">${t("Explore experiments", "استكشف التجارب")}</a><a class="learn-text-link" href="../lessons/lessons.html?level=${encodeURIComponent(c.selectedLevel)}&subject=${encodeURIComponent(c.selectedSubject)}">${t("All topics", "كل المواضيع")}</a></aside></div><details class="learn-ai-support"><summary>${t("AI support and question image preview", "المساعدة الذكية ومعاينة صورة سؤال")}</summary>${c.aiBox()}</details></div>`,
    );
    c.bindAI();
    const refresh = () => {
      document.getElementById("learning-meter").value = percent(m);
      document.querySelector("[data-lesson-stages]").innerHTML = stages(
        percent(m) === 100 ? 2 : 0,
        percent(m) === 100,
        !!m.read().understood,
      );
    };
    refresh();
    document.getElementById("mark-understood").onclick = () => {
      if (!OrbitSubscriptions.requireAccount()) return;
      try {
        m.understand();
        refresh();
        document.getElementById("learning-progress").textContent = t(
          "Understanding saved. Continue to practice.",
          "انحفظ فهمك. يلا نكمّل بالتدريب.",
        );
        document.getElementById("mark-understood").textContent = t(
          "Understanding saved",
          "فهمك محفوظ",
        );
      } catch {
        document.getElementById("learning-progress").textContent = t(
          "Could not save. Try again.",
          "تعذّر الحفظ. جرّب مرة ثانية.",
        );
      }
    };
  }
  function practice(c) {
    activate();
    O.shell(
      t("Practice · ", "طبّق · ") + t(...c.topic.name),
      '<div class="learn-workspace" id="learn-practice-root"></div><details class="learn-ai-support"><summary>' +
        t("AI support", "المساعدة الذكية") +
        "</summary>" +
        c.aiBox() +
        "</details>",
    );
    c.bindAI();
    questionFlow(document.getElementById("learn-practice-root"), nativeModel(c));
  }
  function generated(host, data, request, check) {
    host._orbitLearnDispose?.();
    activate();
    const key = "orbit.learning." + O.user.email,
      id = [request.subject, request.level, request.topic].join(":"),
      m = {
        lessonURL: "#generated-reading",
        title: request.topic,
        summary: data.explanation,
        example: data.simpleExplanation || data.explanation,
        formula: typeof data.formula === "string" ? data.formula : "",
        questions: data.questions.map((q) => ({
          ...q,
          hint: typeof q.hint === "string" ? q.hint : "",
          solution: q.answer,
        })),
        numeric: false,
        check: (answer, i) => check(answer, data.questions[i]),
        read: () => O.get(key, {})[id] || { understood: false, correct: [] },
        last: (i) => O.get(key, {})[id]?.attempts?.[i],
        commit(i, answer, correct, meta) {
          const all = O.get(key, {}),
            s = { ...(all[id] || { understood: false, correct: [] }) },
            solved = new Set(s.correct || []);
          if (correct) solved.add(i);
          s.correct = [...solved];
          s.attempts = { ...(s.attempts || {}), [i]: { ...meta, answer, correct } };
          all[id] = s;
          O.set(key, all);
        },
        understand() {
          const all = O.get(key, {});
          all[id] = { ...(all[id] || {}), understood: true };
          O.set(key, all);
        },
      };
    const videos = (data.videos || []).filter(
      (v) => v && typeof v.title === "string" && /^https:\/\//.test(v.url),
    );
    host.innerHTML = `<div class="learn-workspace"><article id="generated-reading" class="learn-reading"><h2>${esc(request.topic)}</h2><p class="generated-explanation" dir="auto">${esc(data.explanation)}</p>${m.formula ? `<p class="learn-equation" dir="ltr">${esc(m.formula)}</p>` : ""}<button class="btn soft" id="understood-ai">${t("I understand", "فهمت الشرح")}</button><p id="generated-progress" role="status"></p>${videos.map((v) => `<p><a class="learn-text-link" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.title)}</a></p>`).join("")}</article><section id="generated-practice"></section><section class="learn-generated-activities"><h3>${t("Activities and experiments", "أنشطة وتجارب")}</h3>${(data.activities || []).map((a) => `<p>${esc(typeof a === "string" ? a : a.description || "")}</p>`).join("") || `<p>${t("No activity was supplied.", "لم يصل نشاط لهذا الموضوع.")}</p>`}${request.subject === "physics" ? `<a class="btn soft" href="../lab/lab.html">${t("Explore the physics lab", "استكشف مختبر الفيزياء")}</a>` : ""}</section></div>`;
    const flow = questionFlow(host.querySelector("#generated-practice"), m),
      refresh = () => {
        host.querySelector("#generated-progress").textContent =
          t("Saved progress: ", "التقدم المحفوظ: ") + percent(m) + "%";
        flow.refresh();
      };
    host.querySelector("#understood-ai").onclick = () => {
      try {
        m.understand();
        refresh();
      } catch {
        host.querySelector("#generated-progress").textContent = t(
          "Could not save understanding.",
          "تعذّر حفظ الفهم.",
        );
      }
    };
    host.addEventListener("learn:progress", refresh);
    host._orbitLearnDispose = () => {
      host.removeEventListener("learn:progress", refresh);
      delete host._orbitLearnDispose;
    };
    refresh();
  }
  function catalog() {
    if (OrbitAuth.current()?.role !== "student") return;
    activate();
    const target = document.querySelector(".learning-hero");
    if (target && !target.querySelector(".learn-stages"))
      target.insertAdjacentHTML("beforebegin", stages(0));
  }
  window.OrbitStudentLearn = { lesson, practice, generated, catalog };
})();
