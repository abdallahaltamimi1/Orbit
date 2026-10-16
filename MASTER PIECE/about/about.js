(() => {
  "use strict";
  const { t } = ORBIT;
  const paths = {
    student: '<path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v7c4 3 8 3 12 0v-7M22 9v8"/>',
    teacher:
      '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8m-4-5v5M7 8h10M7 12h6"/>',
    school: '<path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6M7 10h2m6 0h2M7 13h2m6 0h2"/>',
    lab: '<path d="M9 3h6M10 3v7L4 20h16l-6-10V3M7 15h10"/>',
    book: '<path d="M12 6v15M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3Z"/>',
    channel: '<circle cx="12" cy="12" r="3"/><path d="M5 6a9 9 0 0 0 0 12M19 6a9 9 0 0 1 0 12"/>',
    progress: '<path d="M3 21V3m0 18h18M7 15l4-5 4 2 5-7"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  };
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  const roles = [
    {
      id: "student",
      title: t("Student", "الطالب"),
      copy: t("Curiosity becomes understanding.", "فضول يتحوّل لفهم."),
      detail: t(
        "Explore lessons, submit assignment responses, try interactive experiments and return to your saved progress.",
        "استكشف الدروس، سلّم إجابات الواجبات، جرّب التجارب التفاعلية وارجع لتقدّمك المحفوظ.",
      ),
      href: "../lessons/lessons.html",
      cta: t("Explore learning", "استكشف التعلّم"),
    },
    {
      id: "teacher",
      title: t("Teacher", "المعلم"),
      copy: t("Your knowledge opens possibilities.", "معرفتك بتفتح احتمالات."),
      detail: t(
        "Publish lessons and assignments, organize private classroom channels, review responses and share your professional portfolio.",
        "انشر الدروس والواجبات، نظّم قنوات الصف الخاصة، راجع الإجابات وشارك ملفك المهني.",
      ),
      href: "../channels/channels.html",
      cta: t("Explore channels", "استكشف القنوات"),
    },
    {
      id: "school",
      title: t("School", "المدرسة"),
      copy: t("The right people, connected.", "الأشخاص المناسبون، معًا."),
      detail: t(
        "Discover teacher specializations and portfolios, publish teaching opportunities and follow applications in the school workspace.",
        "اكتشف تخصصات المعلمين وملفاتهم المهنية، وانشر فرص التدريس وتابع الطلبات من لوحة المدرسة.",
      ),
      href: "../teacher-directory/teacher-directory.html",
      cta: t("Meet the teachers", "تعرّف على المعلمين"),
    },
  ];
  ORBIT.shell(
    t("About ORBIT", "عن ORBIT"),
    `<section class="about-cinematic"><div class="about-opening" data-about-reveal><h1>${t("ORBIT — learning is a journey of discovery.", "ORBIT — لأن التعلّم رحلة اكتشاف.")}</h1><p>${t("We believe meaningful education begins with curiosity, grows through experimentation, and becomes stronger when students, teachers and schools come together in one world.", "نؤمن أن التعليم الحقيقي يبدأ بالفضول، وينمو بالتجربة، ويصبح أقوى عندما يجمع الطلاب والمعلمين والمدارس في عالم واحد.")}</p><a class="about-text-link" href="#our-worlds">${t("Discover our story", "اكتشف حكايتنا")}${icon("arrow")}</a></div><div class="about-orbital" aria-hidden="true"><div class="about-orbital-depth"><div class="about-orbit-core"><span>ORBIT</span><small>${t("Learn. Connect. Grow.", "تعلّم. تواصل. تقدّم.")}</small></div><div class="about-ring ring-one"><i></i></div><div class="about-ring ring-two"><i></i></div><div class="about-ring ring-three"><i></i></div><span class="about-orbit-node node-student">${icon("student")}</span><span class="about-orbit-node node-teacher">${icon("teacher")}</span><span class="about-orbit-node node-school">${icon("school")}</span></div></div></section>
<section id="our-worlds" class="about-section"><div class="about-section-heading" data-about-reveal><h2>${t("Three worlds. One orbit.", "ثلاثة أطراف، منظومة واحدة")}</h2><p>${t("Different roles. A shared purpose: a better learning experience.", "أدوار مختلفة، وهدف واحد: تجربة تعلّم أفضل.")}</p></div><div class="about-worlds"><svg class="about-connections" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path d="M150 50C300 0 350 100 500 50S750 0 850 50"/><path class="about-connection-signal" d="M150 50C300 0 350 100 500 50S750 0 850 50"/></svg>${roles.map((role, i) => `<article class="about-world" data-about-reveal><button type="button" class="about-role-choice" aria-expanded="${i === 0}" aria-controls="about-role-${role.id}"><span class="about-role-icon">${icon(role.id)}</span><h3>${role.title}</h3><p>${role.copy}</p><span class="about-role-action">${t("Discover your place", "اكتشف دورك")}<b aria-hidden="true">${i === 0 ? "−" : "+"}</b></span></button><div id="about-role-${role.id}" class="about-role-detail" ${i === 0 ? "" : "hidden"}><p>${role.detail}</p><a href="${role.href}">${role.cta}${icon("arrow")}</a></div></article>`).join("")}</div></section>
<section class="about-purpose about-section" aria-label="${t("Mission and vision", "الرسالة والرؤية")}"><article data-about-reveal><div class="about-purpose-symbol" aria-hidden="true"><span></span><i></i></div><h2>${t("Our mission", "رسالتنا")}</h2><p>${t("Make ideas easier to understand through exploration, and connect every next step with the right people and tools.", "نقرّب الأفكار بالاستكشاف والتجربة، ونربط كل خطوة تعليمية بالأشخاص والأدوات المناسبة.")}</p></article><article data-about-reveal><div class="about-vision-symbol" aria-hidden="true"><i></i><i></i><i></i></div><h2>${t("Our vision", "رؤيتنا")}</h2><p>${t("A connected educational community where understanding grows through practice, collaboration and the courage to ask another question.", "مجتمع تعليمي مترابط، ينمو فيه الفهم بالممارسة والتعاون، وبالشجاعة لطرح سؤال جديد.")}</p></article></section>
<section class="about-section"><div class="about-section-heading" data-about-reveal><h2>${t("More than receiving information.", "التعلّم أكثر من تلقّي معلومة.")}</h2><p>${t("Understand an idea. Try it. Share what you discover.", "افهم الفكرة. جرّبها. وشارك اللي اكتشفته.")}</p></div><div class="about-bento"><a class="about-feature about-feature-lab" href="../lab/lab.html" data-about-reveal><span class="about-feature-icon">${icon("lab")}</span><div><h3>${t("Ideas you can experiment with", "أفكار بتقدر تجرّبها")}</h3><p>${t("Change variables in physics simulations and observe the result.", "غيّر متغيرات المحاكاة الفيزيائية، وراقب كيف تتغيّر النتيجة.")}</p></div><div class="about-experiment" aria-hidden="true"><span></span><i></i><i></i><i></i><b>F = ma</b></div><span class="about-feature-arrow">${icon("arrow")}</span></a><a class="about-feature" href="../lessons/lessons.html" data-about-reveal>${icon("book")}<h3>${t("Content with a learning path", "محتوى إله مسار")}</h3><p>${t("Explanations, practice and teacher-published lessons.", "شروحات وتدريب ودروس ينشرها المعلمون.")}</p><span class="about-feature-arrow">${icon("arrow")}</span></a><a class="about-feature" href="../channels/channels.html" data-about-reveal>${icon("channel")}<h3>${t("A classroom that connects", "صفّ بيجمعك")}</h3><p>${t("Educational channels, assignments and classroom discussion.", "قنوات تعليمية وواجبات ونقاشات صفية.")}</p><span class="about-feature-arrow">${icon("arrow")}</span></a><a class="about-feature about-feature-progress" href="../achievements/achievements.html" data-about-reveal>${icon("progress")}<div><h3>${t("A next step you can see", "خطوتك الجايّة أوضح")}</h3><p>${t("Return to saved learning progress and earned achievements.", "ارجع لتقدّمك التعليمي المحفوظ، وشوف إنجازاتك المكتسبة.")}</p></div><span class="about-feature-arrow">${icon("arrow")}</span></a></div></section>
<section class="about-closing" data-about-reveal><div><h2>${t("Your journey in ORBIT starts here.", "رحلتك في عالم ORBIT تبدأ من هنا.")}</h2><p>${t("Bring your curiosity. Discover what comes next.", "جيب فضولك معك، واكتشف شو ممكن تتعلّم.")}</p></div><div class="about-closing-actions"><a class="about-primary" href="../registration/registration.html">${t("Start your journey", "ابدأ رحلتك")}${icon("arrow")}</a><a class="about-secondary" href="../hompage/hompage.html#features">${t("Discover the features", "اكتشف المميزات")}</a></div></section>`,
  );
  document.querySelector(".bar nav").innerHTML =
    `<a href="../hompage/hompage.html">${t("Home", "الرئيسية")}</a><a href="../login/login.html">${t("Log in", "تسجيل الدخول")}</a>`;
  document.querySelector(".bar .logo").href = "../hompage/hompage.html";
  document.title = t("About ORBIT · A journey of discovery", "عن ORBIT · رحلة اكتشاف");
  const root = document.getElementById("orbit-page");
  root.querySelector(".wrap>h1")?.remove();
  root.querySelector(".wrap>.eyebrow")?.remove();
  const motion = matchMedia("(prefers-reduced-motion: reduce)"),
    fine = matchMedia("(hover:hover) and (pointer:fine)");
  root.querySelectorAll(".about-role-choice").forEach((button) =>
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";
      root.querySelectorAll(".about-role-choice").forEach((other) => {
        const selected = other === button && !open;
        other.setAttribute("aria-expanded", String(selected));
        other.querySelector("b").textContent = selected ? "−" : "+";
        document.getElementById(other.getAttribute("aria-controls")).hidden = !selected;
      });
    }),
  );
  const reveal = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (!motion.matches && document.body.dataset.mood !== "calm")
          e.target.animate(
            [
              { opacity: 0, transform: "translateY(12px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" },
          );
        reveal.unobserve(e.target);
      }
    },
    { threshold: 0.12 },
  );
  root.querySelectorAll("[data-about-reveal]").forEach((e) => reveal.observe(e));
  const visibility = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => e.target.classList.toggle("about-visible", e.isIntersecting)),
    { threshold: 0.05 },
  );
  root.querySelectorAll(".about-orbital,.about-worlds").forEach((e) => visibility.observe(e));
  const visual = root.querySelector(".about-orbital"),
    depth = visual.firstElementChild;
  let frame = 0,
    point = null;
  function reset() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    depth.style.removeProperty("transform");
  }
  visual.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse" || motion.matches || !fine.matches) return;
      point = { x: e.offsetX / visual.clientWidth - 0.5, y: e.offsetY / visual.clientHeight - 0.5 };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        depth.style.transform = `rotateY(${point.x * 5}deg) rotateX(${-point.y * 5}deg)`;
      });
    },
    { passive: true },
  );
  visual.addEventListener("pointerleave", reset);
  function quiet() {
    reset();
    root.dataset.aboutQuiet = String(
      motion.matches || document.hidden || document.body.dataset.mood === "calm",
    );
  }
  motion.addEventListener("change", quiet);
  document.addEventListener("visibilitychange", quiet);
  quiet();
  document.addEventListener("DOMContentLoaded", () =>
    setTimeout(() => {
      const language = document.getElementById("orbit-language-button");
      if (language) root.querySelector(".bar").append(language);
    }, 0),
  );
  function leave(event) {
    reset();
    if (event.persisted) {
      root.dataset.aboutQuiet = "true";
      return;
    }
    reveal.disconnect();
    visibility.disconnect();
    motion.removeEventListener("change", quiet);
    document.removeEventListener("visibilitychange", quiet);
    removeEventListener("pageshow", quiet);
    removeEventListener("pagehide", leave);
  }
  addEventListener("pagehide", leave);
  addEventListener("pageshow", quiet);
})();
