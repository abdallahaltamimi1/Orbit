"use strict";
const O = ORBIT,
  { t, esc } = O;
const topics = {
  forces: {
    symbol: "↗",
    name: ["Forces & motion", "القوى والحركة"],
    summary: [
      "A net force changes velocity. More mass needs more force for the same acceleration.",
      "القوة المحصلة تغيّر السرعة. الكتلة الأكبر تحتاج قوة أكبر لنفس التسارع.",
    ],
    formula: "F = m × a",
    simple: [
      "Think of pushing a shopping trolley: doubling the load makes the same push produce half the acceleration.",
      "تخيّل دفع عربة التسوق: إذا ضاعفت الحمولة، نفس الدفعة تعطي نصف التسارع.",
    ],
    questions: [
      {
        q: [
          "A 5 kg object accelerates at 2 m/s². Find the net force in N.",
          "جسم كتلته 5 kg وتسارعه 2 m/s². احسب القوة المحصلة بوحدة N.",
        ],
        answer: 10,
        solution: "F = 5 × 2 = 10 N",
        hint: [
          "Check whether you multiplied mass by acceleration.",
          "راجع: هل ضربت الكتلة في التسارع؟",
        ],
      },
      {
        q: [
          "A 12 N net force acts on a 3 kg object. Find acceleration in m/s².",
          "قوة محصلة 12 N تؤثر في كتلة 3 kg. احسب التسارع m/s².",
        ],
        answer: 4,
        solution: "a = F / m = 12 / 3 = 4 m/s²",
        hint: [
          "To isolate acceleration, divide force by mass.",
          "لعزل التسارع، اقسم القوة على الكتلة.",
        ],
      },
    ],
  },
  energy: {
    symbol: "ϟ",
    name: ["Kinetic energy", "الطاقة الحركية"],
    summary: [
      "Kinetic energy depends on mass and the square of speed. Doubling speed makes kinetic energy four times larger.",
      "تعتمد الطاقة الحركية على الكتلة ومربع السرعة. مضاعفة السرعة تجعل الطاقة أربعة أضعاف.",
    ],
    formula: "Eₖ = ½ m v²",
    simple: [
      "First square the speed, then multiply by mass and divide by two.",
      "ربّع السرعة أولًا، ثم اضرب بالكتلة واقسم على اثنين.",
    ],
    questions: [
      {
        q: [
          "Find kinetic energy for 2 kg moving at 3 m/s, in joules.",
          "احسب الطاقة الحركية لكتلة 2 kg تتحرك بسرعة 3 m/s، بالجول.",
        ],
        answer: 9,
        solution: "Eₖ = ½ × 2 × 3² = 9 J",
        hint: ["The speed must be squared before multiplication.", "السرعة تُربّع قبل الضرب."],
      },
      {
        q: [
          "Find kinetic energy for 4 kg moving at 2 m/s, in joules.",
          "احسب الطاقة الحركية لكتلة 4 kg بسرعة 2 m/s، بالجول.",
        ],
        answer: 8,
        solution: "Eₖ = ½ × 4 × 2² = 8 J",
        hint: ["Remember the factor one half.", "تذكّر معامل النصف."],
      },
    ],
  },
  waves: {
    symbol: "∿",
    name: ["Waves", "الموجات"],
    summary: [
      "Wave speed equals frequency times wavelength. Frequency counts cycles per second.",
      "سرعة الموجة تساوي التردد مضروبًا بالطول الموجي. التردد يحسب عدد الدورات في الثانية.",
    ],
    formula: "v = f × λ",
    simple: [
      "If 3 waves each 2 metres long pass every second, the wave covers 6 metres each second.",
      "إذا مرت 3 موجات طول كل منها متران في الثانية، تنتقل الموجة 6 أمتار كل ثانية.",
    ],
    questions: [
      {
        q: [
          "Frequency 3 Hz, wavelength 2 m. Find wave speed in m/s.",
          "التردد 3 Hz والطول الموجي 2 m. احسب سرعة الموجة m/s.",
        ],
        answer: 6,
        solution: "v = 3 × 2 = 6 m/s",
        hint: ["Multiply frequency by wavelength.", "اضرب التردد في الطول الموجي."],
      },
      {
        q: [
          "Wave speed 12 m/s, frequency 4 Hz. Find wavelength in metres.",
          "السرعة 12 m/s والتردد 4 Hz. احسب الطول الموجي بالمتر.",
        ],
        answer: 3,
        solution: "λ = 12 / 4 = 3 m",
        hint: ["Divide wave speed by frequency.", "اقسم سرعة الموجة على التردد."],
      },
    ],
  },
  circuits: {
    symbol: "⏚",
    name: ["Simple circuits", "الدوائر الكهربائية"],
    summary: [
      "In an ohmic conductor at constant temperature, voltage equals current times resistance.",
      "في موصل أومي عند ثبات درجة الحرارة، الجهد يساوي التيار مضروبًا بالمقاومة.",
    ],
    formula: "V = I × R",
    simple: [
      "Resistance limits current. For a fixed voltage, doubling resistance halves the current.",
      "المقاومة تحدّ التيار. عند ثبات الجهد، مضاعفة المقاومة تقلّل التيار للنصف.",
    ],
    questions: [
      {
        q: [
          "Voltage 12 V and resistance 4 Ω. Find current in amperes.",
          "الجهد 12 V والمقاومة 4 Ω. احسب التيار بالأمبير.",
        ],
        answer: 3,
        solution: "I = 12 / 4 = 3 A",
        hint: [
          "Isolate current by dividing voltage by resistance.",
          "اعزل التيار بقسمة الجهد على المقاومة.",
        ],
      },
      {
        q: [
          "Current 2 A and resistance 5 Ω. Find voltage in volts.",
          "التيار 2 A والمقاومة 5 Ω. احسب الجهد بالفولت.",
        ],
        answer: 10,
        solution: "V = 2 × 5 = 10 V",
        hint: ["Multiply current by resistance.", "اضرب التيار في المقاومة."],
      },
    ],
  },
};
const params = new URLSearchParams(location.search);
const selectedLevel = ["primary", "secondary", "university"].includes(params.get("level"))
  ? params.get("level")
  : O.user.role === "student"
    ? OrbitAuth.profile().level || "secondary"
    : "secondary";
const selectedSubject = params.get("subject") || "physics";
const contextQuery =
  "&level=" + encodeURIComponent(selectedLevel) + "&subject=" + encodeURIComponent(selectedSubject);
const id = topics[params.get("topic")] ? params.get("topic") : "forces",
  topic = topics[id],
  text = (a) => t(...a),
  isPractice = location.pathname.includes("/practice/");
if (selectedLevel === "primary") {
  const basic = {
    forces: [
      2,
      3,
      "A force of 6 N acts on a 2 kg toy. Find acceleration.",
      "قوة 6 N تؤثر على لعبة كتلتها 2 kg. احسب التسارع.",
      "a = 6 / 2 = 3 m/s²",
    ],
    energy: [
      2,
      4,
      "A 2 kg ball moves at 2 m/s. Find kinetic energy.",
      "كرة كتلتها 2 kg تتحرك بسرعة 2 m/s. احسب طاقة الحركة.",
      "E = 0.5 × 2 × 2² = 4 J",
    ],
    waves: [
      2,
      3,
      "A wave speed is 6 m/s and frequency 2 Hz. Find wavelength.",
      "سرعة الموجة 6 m/s وترددها 2 Hz. احسب طولها الموجي.",
      "λ = 6 / 2 = 3 m",
    ],
    circuits: [
      2,
      3,
      "Voltage is 6 V and resistance 2 Ω. Find current.",
      "الجهد 6 V والمقاومة 2 Ω. احسب التيار.",
      "I = 6 / 2 = 3 A",
    ],
  }[id];
  topic.questions = [
    {
      q: [basic[2], basic[3]],
      answer: basic[1],
      solution: basic[4],
      hint: topic.questions[0].hint,
    },
  ];
}
if (selectedLevel === "university") {
  const advanced = {
    forces: {
      q: [
        "A 4 kg object experiences 30 N forward and 10 N friction on a horizontal surface. Find net acceleration.",
        "جسم كتلته 4 kg تؤثر عليه قوة 30 N للأمام واحتكاك 10 N على سطح أفقي. احسب تسارعه الصافي.",
      ],
      answer: 5,
      solution: "a = (30 − 10) / 4 = 5 m/s²",
    },
    energy: {
      q: [
        "Kinetic energy is 200 J and mass is 4 kg. Find speed in m/s.",
        "طاقة الحركة 200 J والكتلة 4 kg. احسب السرعة بالمتر/ثانية.",
      ],
      answer: 10,
      solution: "v = √(2E / m) = √100 = 10 m/s",
    },
    waves: {
      q: [
        "A wave has period 0.25 s and speed 12 m/s. Find wavelength.",
        "موجة زمنها الدوري 0.25 s وسرعتها 12 m/s. احسب طولها الموجي.",
      ],
      answer: 3,
      solution: "f = 1/T = 4 Hz; λ = vT = 3 m",
    },
    circuits: {
      q: [
        "A 12 V supply feeds two series resistors 2 Ω and 4 Ω. Find the current.",
        "مصدر 12 V يغذي مقاومتين على التوالي 2 Ω و4 Ω. احسب التيار.",
      ],
      answer: 2,
      solution: "R = 2 + 4 = 6 Ω; I = 12/6 = 2 A",
    },
  }[id];
  topic.questions = [{ ...advanced, hint: topic.questions[0].hint }, ...topic.questions];
}
function aiBox() {
  return `<section class="card ai-box" id="ai-assistant"><h2>${t("ORBIT AI · coming later", "ORBIT AI · قريبًا")}</h2><p>${t("Ask about your topic or choose a question image. AI explanations and image analysis require the planned backend. No analysis is performed here.", "اسأل عن الموضوع أو اختر صورة سؤال. الشرح الذكي وتحليل الصورة يحتاجان ربط AI بالخادم لاحقًا. لا يُجرى تحليل هنا.")}</p><label>${t("Your question", "سؤالك")}<textarea id="ai-question" placeholder="${t("What would you like explained?", "ماذا تريد أن تفهم؟")}"></textarea></label><label>${t("Preview a question image", "معاينة صورة سؤال")}<input id="ai-image" type="file" accept="image/png,image/jpeg,image/webp"></label><img id="ai-preview" class="preview-img" hidden alt="${t("Your question image", "صورة سؤالك")}"><p id="ai-status" role="status"></p><button class="btn soft" disabled>${t("AI analysis awaits backend connection", "تحليل AI بانتظار ربط الخادم")}</button></section>`;
}
function bindAI() {
  let url;
  document.getElementById("ai-image").onchange = (e) => {
    if (url) URL.revokeObjectURL(url);
    const f = e.target.files[0],
      img = document.getElementById("ai-preview"),
      status = document.getElementById("ai-status");
    img.hidden = true;
    if (!f) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type) || f.size > 10 * 1024 * 1024) {
      status.textContent = t(
        "Choose PNG, JPEG or WebP under 10 MB.",
        "اختر PNG أو JPEG أو WebP بحجم أقل من 10 MB.",
      );
      return;
    }
    url = URL.createObjectURL(f);
    img.src = url;
    img.hidden = false;
    status.textContent = t(
      "Preview only. No upload or AI analysis has occurred.",
      "معاينة فقط. لم تُرفع الصورة ولم يُجرَ تحليل AI.",
    );
  };
}
function catalog() {
  O.shell(
    t("Choose what you want to understand", "اختر الموضوع الذي تريد فهمه"),
    `<section class="hero"><h2>${t("Explore → Understand → Try", "استكشف ← افهم ← جرّب")}</h2><p>${t("Choose a topic for an explanation, teacher videos and practice with feedback.", "اختر موضوعًا للشرح وفيديوهات المعلمين، ثم حل أسئلة واكتشف الخطأ.")}</p></section><div class="grid">${Object.entries(
      topics,
    )
      .map(
        ([key, x]) =>
          `<a class="card" href="../lesson/lesson.html?topic=${key}"><span class="topic-symbol">${x.symbol}</span><h2>${text(x.name)}</h2><p>${text(x.summary)}</p><span class="btn soft">${t("Explore topic", "افتح الموضوع")} ↗</span></a>`,
      )
      .join("")}</div>`,
  );
}
function lesson() {
  const videos = O.db().posts.filter(
    (p) =>
      !O.get("orbit.deleted.posts", []).includes(p.id) &&
      p.type === "video" &&
      p.topic === id &&
      O.channels().some(
        (c) => c.id === p.channel && (O.own(c) || !c.private || O.memberships().includes(c.id)),
      ),
  );
  if (O.user.role === "student" && window.OrbitStudentLearn)
    return OrbitStudentLearn.lesson({
      topic,
      id,
      selectedLevel,
      selectedSubject,
      contextQuery,
      aiBox,
      bindAI,
      videos,
    });
  O.shell(
    text(topic.name),
    `<div class="lesson-tools"><a href="../lessons/lessons.html?level=${encodeURIComponent(selectedLevel)}&subject=${encodeURIComponent(selectedSubject)}" class="lesson-back">← ${t("All topics", "كل المواضيع")}</a><button class="btn soft" id="lesson-language">${t("العربية", "English")}</button></div><div class="lesson-layout"><div class="lesson-reading"><section class="hero lesson-hero"><div class="lesson-orbit" aria-hidden="true"><span>${topic.symbol}</span></div><span>${t("Understand the relationship", "افهم العلاقة")}</span><h2 dir="ltr">${topic.formula}</h2><p>${text(topic.summary)}</p></section><section class="card explanation" id="explanation"><span class="section-number">01 / ${t("UNDERSTAND", "افهم")}</span><h2>${t("A simple explanation", "شرح مبسّط")}</h2><p>${text(topic.simple)}</p><p>${selectedLevel === "primary" ? t("Start by observing everyday examples, then use the relationship with small numbers.", "ابدأ بملاحظة أمثلة من يومك، ثم جرّب العلاقة بأرقام صغيرة.") : selectedLevel === "university" ? t("Define the system, assumptions and SI units before using the model. Check dimensions and explain the limits of the relationship.", "حدد النظام والافتراضات ووحدات SI قبل استخدام النموذج. تحقق من الأبعاد وفسّر حدود العلاقة.") : t("Identify the known quantities, rearrange the formula, then substitute with correct units.", "حدد المعطيات، أعد ترتيب القانون، ثم عوّض بالوحدات الصحيحة.")}</p><p class="pill">${t("Level", "المستوى")}: ${selectedLevel === "primary" ? t("Primary", "أساسي") : selectedLevel === "university" ? t("University", "جامعي") : t("Secondary", "ثانوي")}</p><button id="mark-understood" class="btn soft">${t("I understood this explanation", "فهمت الشرح")}</button><p id="learning-progress" role="status"></p><a class="btn" href="../practice/practice.html?topic=${id}${contextQuery}">${t("Try questions", "جرّب الأسئلة")}</a> <a class="btn soft" href="../lab/lab.html">${t("Explore experiments", "استكشف التجارب")}</a></section><section class="card lesson-videos" id="teacher-videos"><span class="section-number">02 / ${t("WATCH", "شاهد")}</span><h2>${t("Suggested teacher videos", "فيديوهات معلمين مقترحة")}</h2><p class="muted">${t("Videos tagged with this topic. Private classroom videos require membership.", "فيديوهات نشرها المعلمون وربطوها بهذا الموضوع. فيديوهات الصف الخاص تحتاج عضوية.")}</p>${videos.map((p) => `<article><h3>${esc(p.title)}</h3><p>${esc(O.teacher(O.channels().find((c) => c.id === p.channel).teacher))}</p>${O.attachment(p)}<a class="btn soft" href="../channel/channel.html?id=${encodeURIComponent(p.channel)}">${t("View source channel", "شاهد القناة المصدر")}</a></article>`).join("") || `<p>${t("No teacher has added a video for this topic yet.", "لم ينشر معلم فيديو لهذا الموضوع بعد.")}</p>`}</section></div><aside class="lesson-sidebar"><section class="card lesson-map"><span class="section-number">${t("YOUR LEARNING PATH", "مسار تعلّمك")}</span><h2>${t("A step closer to understanding", "خطوة أقرب للفهم")}</h2><p>${t("Read, explore, then put your idea to the test.", "اقرأ، استكشف، وبعدين جرّب الفكرة بنفسك.")}</p><nav aria-label="${t("Lesson sections", "أقسام الدرس")}"><a href="#explanation"><b>01</b>${t("Understand the idea", "افهم الفكرة")}<span>↙</span></a><a href="#teacher-videos"><b>02</b>${t("Learn with a teacher", "تعلّم مع معلم")}<span>↙</span></a><a href="../practice/practice.html?topic=${id}${contextQuery}"><b>03</b>${t("Try it yourself", "جرّب بنفسك")}<span>↗</span></a></nav><div class="lesson-progress"><h3>${t("Your progress", "تقدّمك")}</h3><progress id="learning-meter" max="100" value="0" aria-label="${t("Learning progress", "تقدّم الدرس")}"></progress><p>${t("Saved from your explanation and correct practice answers.", "محفوظ من إكمال الشرح وإجاباتك الصحيحة في التدريب.")}</p></div></section>${aiBox()}</aside></div>`,
  );
  bindAI();
  document.getElementById("lesson-language").onclick = () => {
    const prefs = O.get("orbit.student.v1", {});
    prefs.lang = document.documentElement.lang === "ar" ? "en" : "ar";
    O.set("orbit.student.v1", prefs);
    location.reload();
  };
  const savedLearning = O.get("orbit.learning." + O.user.email, {})[id + "-" + selectedLevel];
  document.getElementById("learning-meter").value = Math.round(
    ((Number(!!savedLearning?.understood) + (savedLearning?.correct?.length || 0)) /
      (topic.questions.length + 1)) *
      100,
  );
  if (savedLearning?.understood) {
    document.getElementById("learning-progress").textContent = t(
      "Explanation completed.",
      "أنهيت الشرح.",
    );
    document.getElementById("mark-understood").textContent = t(
      "✓ Explanation complete",
      "✓ أنهيت الشرح",
    );
  }
  document.getElementById("mark-understood").onclick = () => {
    if (!OrbitSubscriptions.requireAccount()) return;
    const k = "orbit.learning." + O.user.email,
      d = O.get(k, {});
    d[id + "-" + selectedLevel] = { ...(d[id + "-" + selectedLevel] || {}), understood: true };
    O.set(k, d);
    document.getElementById("learning-meter").value = Math.round(
      ((1 + (d[id + "-" + selectedLevel]?.correct?.length || 0)) / (topic.questions.length + 1)) *
        100,
    );
    document.getElementById("learning-progress").textContent = t(
      "Explanation complete. Try the questions next.",
      "تم الشرح. يلا جرّب الأسئلة!",
    );
    document.getElementById("mark-understood").textContent = t(
      "✓ Explanation complete",
      "✓ أنهيت الشرح",
    );
  };
}
function practice() {
  O.shell(
    t("Practice · ", "تدرب · ") + text(topic.name),
    `<a class="btn soft" href="../lesson/lesson.html?topic=${id}${contextQuery}">← ${t("Back to explanation", "رجوع للشرح")}</a><p>${t("Try first. If the answer is incorrect, discover the mistake before revealing the solution.", "جرّب أولًا. إذا أخطأت، اكتشف الغلط قبل عرض الحل.")}</p>${topic.questions.map((q, i) => `<section class="card"><h2>${t("Question", "السؤال")} ${i + 1}</h2><p>${text(q.q)}</p><form data-question="${i}"><label>${t("Numeric answer", "الإجابة العددية")}<input name="answer" type="number" step="any" required></label><button class="btn">${t("Check answer", "تحقق من الإجابة")}</button></form><div id="feedback-${i}" role="status"></div></section>`).join("")}${aiBox()}`,
  );
  bindAI();
  document.querySelectorAll("[data-question]").forEach(
    (f) =>
      (f.onsubmit = (e) => {
        e.preventDefault();
        const i = +f.dataset.question,
          q = topic.questions[i],
          answer = Number(new FormData(f).get("answer")),
          correct = Math.abs(answer - q.answer) < 1e-6,
          box = document.getElementById("feedback-" + i);
        const key = "orbit.practice." + (O.user.email || "guest"),
          attempts = O.get(key, {});
        attempts[id + "-" + selectedLevel + "-" + i] = { answer, correct };
        O.set(key, attempts);
        const learningKey = "orbit.learning." + O.user.email,
          learning = O.get(learningKey, {}),
          entry = learning[id + "-" + selectedLevel] || { understood: false, correct: [] };
        entry.correct = entry.correct || [];
        if (correct && !entry.correct.includes(i)) entry.correct.push(i);
        learning[id + "-" + selectedLevel] = entry;
        O.set(learningKey, learning);
        box.innerHTML = correct
          ? `<p>✓ ${t("Correct! You applied the relationship successfully.", "صحيح! طبّقت العلاقة بنجاح.")}</p>`
          : `<p class="error">${t("Not quite. Let’s discover the mistake.", "الإجابة غير صحيحة. خلّينا نكتشف الغلط.")}</p><button class="btn soft" id="discover-${i}">${t("Discover the mistake", "اكتشف الغلط")}</button>`;
        if (!correct)
          document.getElementById("discover-" + i).onclick = () => {
            box.innerHTML = `<div class="solution"><h3>${t("Check this step", "راجع هذه الخطوة")}</h3><p>${text(q.hint)}</p><p dir="ltr">${q.solution}</p><h3>${t("A simpler explanation", "شرح أبسط")}</h3><p>${text(topic.simple)}</p><a class="btn soft" href="../lesson/lesson.html?topic=${id}${contextQuery}">${t("Review this explanation", "راجع الشرح")}</a></div>`;
          };
      }),
  );
}
isPractice ? practice() : location.pathname.includes("/lessons/") ? catalog() : lesson();
