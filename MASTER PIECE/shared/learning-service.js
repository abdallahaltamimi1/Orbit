(() => {
  "use strict";
  const O = ORBIT,
    { t, esc } = O;
  function show(host, data, request) {
    if (
      typeof data.explanation !== "string" ||
      !Array.isArray(data.questions) ||
      !data.questions.every(
        (q) =>
          q &&
          typeof q.question === "string" &&
          ["string", "number"].includes(typeof q.answer) &&
          typeof q.explanation === "string",
      )
    )
      throw Error("INVALID_LESSON");
    if (O.user.role === "student" && window.OrbitStudentLearn)
      return OrbitStudentLearn.generated(host, data, request, (answer, q) =>
        typeof q.answer === "number"
          ? Number.isFinite(+answer) && Math.abs(+answer - q.answer) < 1e-6
          : answer.toLocaleLowerCase() === String(q.answer).trim().toLocaleLowerCase(),
      );
    const key = "orbit.learning." + O.user.email,
      id = [request.subject, request.level, request.topic].join(":"),
      progress = O.get(key, {}),
      state = progress[id] || { understood: false, correct: [] };
    function save() {
      progress[id] = state;
      O.set(key, progress);
      const percent = Math.round(
        ((Number(state.understood) + state.correct.length) / (data.questions.length + 1)) * 100,
      );
      host.querySelector("#generated-progress").textContent =
        t("Progress: ", "تقدمك: ") + percent + "%";
    }
    const videos = (data.videos || []).filter(
      (v) => v && typeof v.title === "string" && /^https:\/\//.test(v.url),
    );
    host.innerHTML = `<section class="hero"><h2>${esc(request.topic)}</h2><p>${esc(request.subject)} · ${esc(request.level)}</p><strong id="generated-progress" role="status"></strong></section><section class="card"><h2>${t("Simple explanation", "خلّينا نفهم")}</h2><p class="generated-explanation">${esc(data.explanation)}</p><button class="btn" id="understood-ai">${t("I understand", "فهمت الشرح")}</button></section><section class="card"><h2>${t("Related videos", "فيديوهات تساعدك")}</h2>${videos.map((v) => `<p><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.title)} ↗</a></p>`).join("") || `<p>${t("No video source supplied.", "لم يصل مصدر فيديو لهذا الدرس.")}</p>`}</section><section><h2>${t("Try it yourself", "جرّب حالك")}</h2>${data.questions.map((q, i) => `<article class="card"><h3>${esc(q.question)}</h3><form data-generated-question="${i}"><label>${t("Your answer", "جوابك")}<input name="answer" required maxlength="500"></label><button class="btn">${t("Check", "تحقق")}</button></form><div id="generated-feedback-${i}" role="status"></div></article>`).join("")}</section><section class="card"><h2>${t("Activities and experiments", "أنشطة وتجارب")}</h2>${(data.activities || []).map((a) => `<p>${esc(typeof a === "string" ? a : a.description || "")}</p>`).join("") || `<p>${t("No activity suggested for this topic.", "لم يصل نشاط مقترح لهذا الموضوع.")}</p>`}${request.subject === "physics" ? `<a class="btn soft" href="../lab/lab.html">${t("Explore the physics lab", "استكشف مختبر الفيزياء")}</a>` : ""}</section>`;
    host.querySelector("#understood-ai").onclick = () => {
      state.understood = true;
      save();
    };
    host.querySelectorAll("[data-generated-question]").forEach(
      (f) =>
        (f.onsubmit = (e) => {
          e.preventDefault();
          const i = +f.dataset.generatedQuestion,
            q = data.questions[i],
            answer = new FormData(f).get("answer").trim(),
            correct =
              typeof q.answer === "number"
                ? Number.isFinite(+answer) && Math.abs(+answer - q.answer) < 1e-6
                : answer.toLocaleLowerCase() === String(q.answer).trim().toLocaleLowerCase(),
            box = host.querySelector("#generated-feedback-" + i);
          if (correct) {
            if (!state.correct.includes(i)) state.correct.push(i);
            box.textContent = t("Correct! ", "صح! ") + q.explanation;
            save();
          } else {
            box.innerHTML = `<p>${t("Try again, or discover the mistake.", "جرّب كمان مرة، أو اكتشف الغلط.")}</p><button class="btn soft">${t("Discover the mistake", "اكتشف الغلط")}</button>`;
            box.querySelector("button").onclick = () => {
              box.innerHTML = `<p>${esc(q.answer)}</p><p>${esc(q.explanation)}</p><p>${esc(data.simpleExplanation || data.explanation)}</p>`;
            };
          }
        }),
    );
    save();
  }
  window.OrbitLearning = { show };
})();
