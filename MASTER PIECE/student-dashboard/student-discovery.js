(() => {
  "use strict";
  const A = OrbitAuth,
    t = (en, ar) => (document.documentElement.lang === "en" ? en : ar),
    esc = (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
      );
  const normalize = (value) =>
    String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي");
  const level = () =>
    ["primary", "secondary", "university"].includes(OrbitProfiles.current()?.level)
      ? OrbitProfiles.current().level
      : "secondary";
  const levelName = () =>
    ({
      primary: t("Primary", "الأساسي"),
      secondary: t("Secondary", "الثانوي"),
      university: t("University", "الجامعي"),
    })[level()];
  const name = (post) =>
    post.title ||
    (document.documentElement.lang === "en"
      ? post.titleEn || post.titleAr
      : post.titleAr || post.titleEn) ||
    "";
  const categoryName = (key) =>
    ({
      lesson: t("Lesson", "درس"),
      teacher: t("Teacher", "معلم"),
      experiment: t("Experiment", "تجربة"),
      activity: t("Activity", "نشاط"),
      assignment: t("Assignment", "واجب"),
      resource: t("Resource", "مورد"),
      video: t("Video", "فيديو"),
      subject: t("Subject", "مادة"),
    })[key];
  let query = "",
    category = "all",
    limit = 12,
    version = 0,
    timer,
    observer,
    queued = false,
    form;
  function index() {
    const user = A.current();
    if (user?.role !== "student") return [];
    const topics = [
      ["forces", "Forces & motion", "القوى والحركة"],
      ["energy", "Energy", "الطاقة"],
      ["waves", "Waves", "الموجات"],
      ["circuits", "Electric circuits", "الدوائر الكهربائية"],
    ];
    const list = topics.map(([id, en, ar]) => ({
      name: t(en, ar),
      category: "lesson",
      detail: t("Physics", "الفيزياء") + " · " + levelName(),
      keywords: en + " " + ar + " Physics فيزياء " + levelName(),
      url: "../lesson/lesson.html?topic=" + id + "&subject=physics&level=" + level(),
    }));
    for (const [id, en, ar, words] of [
      [
        "motion",
        "Motion and constant speed",
        "الحركة والسرعة الثابتة",
        "distance time speed المسافة الزمن السرعة",
      ],
      [
        "newton",
        "Newton’s second law",
        "قانون نيوتن الثاني",
        "force mass acceleration القوة الكتلة التسارع",
      ],
      ["ohm", "Ohm’s law", "قانون أوم", "voltage resistance current الجهد المقاومة التيار"],
    ])
      list.push({
        name: t(en, ar),
        category: "experiment",
        detail: t("Interactive school laboratory", "مختبر المدرسة التفاعلي"),
        keywords: en + " " + ar + " " + words + " physics فيزياء مختبر تجربة",
        url: "../school-tour/school-tour.html?experiment=" + id + "#science-lab",
      });
    list.push({
      name: t("Physics", "الفيزياء"),
      category: "subject",
      detail: levelName(),
      keywords: "physics فيزياء " + levelName(),
      url: "../lessons/lessons.html?subject=physics&level=" + level(),
    });
    for (const [id, en, ar] of [
      ["pendulum", "Pendulum", "البندول"],
      ["spring", "Spring oscillation", "النابض"],
      ["projectile", "Projectile motion", "حركة المقذوفات"],
      ["car", "Force and acceleration", "القوة والتسارع"],
    ])
      list.push({
        name: t(en, ar),
        category: "experiment",
        detail: t(
          "Change variables and observe calculated results",
          "غيّر المتغيرات وراقب النتائج المحسوبة",
        ),
        keywords: en + " " + ar + " lab مختبر تجربة physics فيزياء",
        url: id === "car" ? "../car-lab/car-lab.html" : "../lab/lab.html?experiment=" + id,
      });
    list.push(
      {
        name: t("Force calculations", "حساب القوى"),
        category: "activity",
        detail: t("Practice using F = m × a", "تدرّب على تطبيق F = m × a"),
        keywords: "practice activity تدريب نشاط تحدي قوى",
        url: "../practice/practice.html",
      },
      {
        name: t("Forces quiz", "اختبار القوى"),
        category: "activity",
        detail: t("Check your understanding", "اختبر فهمك"),
        keywords: "quiz اختبار اسئلة questions قوى",
        url: "../quiz/quiz.html",
      },
    );
    const channels = ORBIT.channels(),
      memberships = A.get("orbit.memberships.v3", {})[user.email] || [],
      deleted = A.get("orbit.deleted.posts", []),
      posts = (A.get("orbit.channels.v2", {}).posts || []).filter(
        (p) =>
          !p.sample &&
          !deleted.includes(p.id) &&
          channels.some((c) => c.id === p.channel && (!c.private || memberships.includes(c.id))),
      );
    const indexedSubjects = new Set(["physics"]);
    const subjectNames = {
      math: ["Mathematics", "الرياضيات"],
      chemistry: ["Chemistry", "الكيمياء"],
      biology: ["Biology", "الأحياء"],
      arabic: ["Arabic", "العربية"],
      english: ["English", "الإنجليزية"],
    };
    const link = (post) =>
      "../channel/channel.html?id=" +
      encodeURIComponent(post.channel) +
      "&post=" +
      encodeURIComponent(post.id);
    for (const post of posts) {
      const channel = channels.find((c) => c.id === post.channel),
        channelLabel =
          document.documentElement.lang === "en"
            ? channel.en || channel.ar
            : channel.ar || channel.en;
      if (channel.subject && !indexedSubjects.has(channel.subject)) {
        indexedSubjects.add(channel.subject);
        const label = subjectNames[channel.subject] || [channel.subject, channel.subject];
        list.push({
          name: t(...label),
          category: "subject",
          detail: channelLabel,
          keywords: label.join(" ") + " " + channel.subject + " " + channelLabel,
          url: "../channel/channel.html?id=" + encodeURIComponent(channel.id),
        });
      }
      if (["lesson", "video", "assignment"].includes(post.type) && name(post))
        list.push({
          name: name(post),
          category: post.type,
          detail: channelLabel,
          keywords: [
            name(post),
            post.titleAr,
            post.titleEn,
            post.body,
            post.bodyAr,
            post.bodyEn,
            channelLabel,
            channel.subject,
          ]
            .filter(Boolean)
            .join(" "),
          url: link(post),
        });
      for (const file of post.attachments || [])
        list.push({
          name: file.name,
          category: "resource",
          detail: name(post) + " · " + channelLabel,
          keywords: file.name + " " + name(post) + " " + channelLabel,
          url: link(post),
        });
    }
    const accounts = A.get("orbit.recruitment.v1", {}).accounts || [];
    for (const teacher of OrbitRecruitment.allTeachers().filter(
      (p) =>
        p.available &&
        p.shareWithSchools &&
        !accounts.some((a) => a.email === p.id && ["suspended", "deleted"].includes(a.status)),
    ))
      list.push({
        name: teacher.name,
        category: "teacher",
        detail: t("Professional profile", "الملف المهني"),
        keywords:
          teacher.name +
          " " +
          (teacher.subjects || []).join(" ") +
          " " +
          (teacher.skills || []).join(" "),
        url: "../teacher-profile/teacher-profile.html?id=" + encodeURIComponent(teacher.id),
      });
    return [
      ...new Map(
        list.map((item) => [item.category + "|" + item.url + "|" + item.name, item]),
      ).values(),
    ];
  }
  async function search() {
    if (!form?.isConnected) return;
    const active = ++version,
      input = form.querySelector("#student-search"),
      select = form.querySelector("#student-search-category");
    query = input.value;
    category = select.value;
    const results = document.getElementById("student-search-results"),
      status = document.getElementById("student-search-status"),
      button = form.querySelector("[type=submit]");
    if (!query.trim() && category === "all") {
      results.hidden = true;
      results.replaceChildren();
      status.textContent = t(
        "Type a topic, teacher name or experiment.",
        "اكتب موضوعًا أو اسم معلم أو تجربة.",
      );
      form.removeAttribute("aria-busy");
      button.disabled = false;
      return;
    }
    form.setAttribute("aria-busy", "true");
    button.disabled = true;
    status.textContent = t("Searching available content…", "جارٍ البحث في المحتوى المتاح…");
    await Promise.resolve();
    try {
      const words = normalize(query).trim().split(/\s+/).filter(Boolean),
        items = index().filter(
          (item) =>
            (category === "all" || category === item.category) &&
            words.every((word) => normalize(item.keywords + " " + item.name).includes(word)),
        );
      if (active !== version || !form.isConnected) return;
      results.hidden = false;
      status.textContent = items.length + " " + t("results available", "نتائج متاحة");
      window.dispatchEvent(
        new CustomEvent("orbit:search-feedback", { detail: { empty: items.length === 0 } }),
      );
      results.innerHTML = items.length
        ? items
            .slice(0, limit)
            .map(
              (item) =>
                `<a class="student-search-result" href="${esc(item.url)}"><span><strong>${esc(item.name)}</strong><small>${categoryName(item.category)} · ${esc(item.detail)}</small></span><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></a>`,
            )
            .join("") +
          (items.length > limit
            ? `<button class="button" type="button" data-student-more>${t("Show more results", "عرض نتائج أكثر")}</button>`
            : "")
        : `<p class="student-search-empty">${t("No matching content. Try another title or choose another category.", "ما لقينا نتيجة مطابقة. ولا يهمك، جرّب كلمة ثانية أو فئة مختلفة.")}</p>`;
      results.querySelector("[data-student-more]")?.addEventListener("click", () => {
        limit += 12;
        search();
      });
    } catch {
      results.hidden = false;
      results.innerHTML = `<p class="student-search-empty">${t("Content could not be loaded. Refresh and try again.", "تعذّر تحميل المحتوى. حدّث الصفحة وحاول مجددًا.")}</p>`;
      status.textContent = t("Search unavailable", "البحث غير متاح");
    } finally {
      if (active === version) {
        form.removeAttribute("aria-busy");
        button.disabled = false;
      }
    }
  }
  function progress() {
    const host = document.getElementById("student-saved-learning");
    if (!host) return;
    const records = Object.values(A.get("orbit.learning." + A.current().email, {})).filter(
        (r) => r && typeof r === "object" && r.type !== "bookmark",
      ),
      understood = records.filter((r) => r.understood).length,
      correct = records.reduce(
        (n, r) => n + new Set((r.correct || []).filter(Number.isInteger)).size,
        0,
      );
    host.innerHTML = `<h2 id="student-saved-learning-title">${t("Your saved learning", "تعلّمك المحفوظ")}</h2>${records.length ? `<div class="student-learning-records"><span><strong>${records.length}</strong> ${t("learning records", "سجلات تعلم")}</span><span><strong>${understood}</strong> ${t("explanations understood", "شروحات فهمتها")}</span><span><strong>${correct}</strong> ${t("questions answered correctly", "أسئلة حلّيتها صح")}</span></div>` : `<p class="assignment-note">${t("Start an available lesson. Your saved understanding and answers will appear here.", "ابدأ درسًا من المكتبة، وفهمك وإجاباتك المحفوظة رح تظهر هون. إنت قدّها!")}</p>`}`;
  }
  function experimentProgress() {
    const host = document.getElementById("student-saved-learning");
    if (!host) return;
    const completed = Object.values(A.get("orbit.learning." + A.current().email, {})).filter(
      (r) => r?.type === "experiment" && r.completedAt,
    );
    if (!completed.length) return;
    const names = {
      motion: t("Motion and constant speed", "الحركة والسرعة الثابتة"),
      newton: t("Newton’s second law", "قانون نيوتن الثاني"),
      ohm: t("Ohm’s law", "قانون أوم"),
    };
    const section = document.createElement("div");
    section.className = "student-experiment-history";
    section.innerHTML =
      "<h3>" +
      t("Completed experiments", "تجارب أنهيتها") +
      "</h3>" +
      completed
        .filter((r) => names[r.experiment])
        .map(
          (r) =>
            '<p><a href="../school-tour/school-tour.html?experiment=' +
            r.experiment +
            '#science-lab">' +
            names[r.experiment] +
            "</a> · " +
            new Date(r.completedAt).toLocaleDateString(
              document.documentElement.lang === "ar" ? "ar-JO" : "en-GB",
            ) +
            "</p>",
        )
        .join("");
    host.append(section);
  }
  function mount() {
    if (A.current()?.role !== "student") return;
    const language = document.getElementById("orbit-language-button"),
      header = document.querySelector(".header-actions");
    if (language && header && !header.contains(language)) header.prepend(language);
    const schoolLevel = document.querySelector("#orbit-rail .orbit-identity small");
    if (
      schoolLevel &&
      ["primary", "secondary", "university"].includes(schoolLevel.textContent.trim())
    )
      schoolLevel.textContent = levelName();
    const next = document.getElementById("student-search-form");
    if (!next || next === form) return;
    form = next;
    form.querySelector("#student-search").value = query;
    form.querySelector("#student-search-category").value = category;
    form.onsubmit = (e) => {
      e.preventDefault();
      clearTimeout(timer);
      limit = 12;
      search();
    };
    form.querySelector("#student-search").oninput = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        limit = 12;
        search();
      }, 120);
    };
    form.querySelector("#student-search-category").onchange = () => {
      limit = 12;
      search();
    };
    progress();
    experimentProgress();
    if (query || category !== "all") search();
  }
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-student-logout]")) A.logout();
    document.querySelectorAll(".student-account-menu[open]").forEach((menu) => {
      if (!menu.contains(event.target)) menu.open = false;
    });
  });
  document.addEventListener("keydown", (event) => {
    if (
      ["ArrowDown", "ArrowUp"].includes(event.key) &&
      event.target.closest("#student-search-form,#student-search-results")
    ) {
      const links = [...document.querySelectorAll(".student-search-result")];
      if (links.length) {
        event.preventDefault();
        const current = links.indexOf(document.activeElement);
        links[
          (current + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length
        ].focus();
      }
    }
    if (event.key === "Escape")
      document.querySelectorAll(".student-account-menu[open]").forEach((menu) => {
        menu.open = false;
        menu.querySelector("summary").focus();
      });
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "orbit.learning." + A.current()?.email) progress();
    if (
      ["orbit.channels.v2", "orbit.memberships.v3", "orbit.recruitment.v1"].includes(event.key) &&
      form?.isConnected
    )
      search();
  });
  mount();
  document.addEventListener("DOMContentLoaded", mount, { once: true });
  observer = new MutationObserver((records) => {
    if (
      !records.some(
        (r) =>
          r.target.closest?.("#app") ||
          [...r.addedNodes].some((n) => ["orbit-language-button", "orbit-rail"].includes(n.id)),
      )
    )
      return;
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      mount();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("pagehide", (e) => {
    clearTimeout(timer);
    version++;
    if (!e.persisted) observer.disconnect();
  });
})();
