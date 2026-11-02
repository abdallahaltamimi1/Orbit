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
  const missionArtwork = "<svg viewBox=\"0 0 520 350\" fill=\"none\" aria-hidden=\"true\"><defs><linearGradient id=\"missionSky\" x1=\"262\" y1=\"0\" x2=\"262\" y2=\"350\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#F8C9AE\"/><stop offset=\".46\" stop-color=\"#B8DDE2\"/><stop offset=\"1\" stop-color=\"#E9F6F3\"/></linearGradient><linearGradient id=\"missionMountain\" x1=\"260\" y1=\"131\" x2=\"260\" y2=\"333\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#528E9B\"/><stop offset=\"1\" stop-color=\"#174A63\"/></linearGradient><linearGradient id=\"missionFront\" x1=\"260\" y1=\"216\" x2=\"260\" y2=\"350\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#2F7A87\"/><stop offset=\"1\" stop-color=\"#0B4558\"/></linearGradient><clipPath id=\"missionClip\"><path d=\"M73 84C119 30 197 17 273 34c94 21 172 86 176 169 5 93-77 119-174 129-90 9-184-4-230-55C-5 231 21 146 73 84Z\"/></clipPath></defs><g clip-path=\"url(#missionClip)\"><path fill=\"url(#missionSky)\" d=\"M0 0h520v350H0z\"/><circle cx=\"350\" cy=\"94\" r=\"42\" fill=\"#FFF4D9\" opacity=\".82\"/><path d=\"m-20 226 123-89 57 42 97-95 75 71 81-62 129 101v167H-20V226Z\" fill=\"#90BBC1\"/><path d=\"m-15 261 115-85 63 58 105-105 79 77 78-52 115 83v129H-15V261Z\" fill=\"url(#missionMountain)\"/><path d=\"m-20 294 145-69 70 42 82-63 82 60 69-47 109 53v94H-20v-70Z\" fill=\"url(#missionFront)\"/><path d=\"M235 350c4-54 12-82 27-97 12-12 36-11 46 2 10 14 14 45 16 95h-89Z\" fill=\"#173B4D\"/><path d=\"m256 267 20-24 31 10 17 42-48 17-35-25 15-20Z\" fill=\"#1D5367\"/><path d=\"m279 250 12-11 21 8-7 21-22 5-11-12 7-11Z\" fill=\"#2F7180\"/><path d=\"M256 350c-1-41 3-65 10-82m31 82c0-39-2-62-9-80\" stroke=\"#0F3040\" stroke-width=\"9\" stroke-linecap=\"round\"/><path d=\"M84 288c83 39 186 52 326 14\" stroke=\"#D8F4ED\" stroke-width=\"3\" stroke-linecap=\"round\" opacity=\".8\"/></g><path d=\"M80 88C130 25 223 9 307 37c75 24 135 78 155 141\" stroke=\"#74CFC3\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\".58\"/><path d=\"M79 282c-18-19-27-43-27-69\" stroke=\"#74CFC3\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\".58\"/><path d=\"m430 68 5 12 12 5-12 5-5 12-5-12-12-5 12-5 5-12Z\" fill=\"#5FC8BC\"/><circle cx=\"95\" cy=\"124\" r=\"5\" fill=\"#189E9A\"/><circle cx=\"418\" cy=\"245\" r=\"4\" fill=\"#189E9A\"/></svg>";
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
    `<section class="about-cinematic"><div class="about-opening" data-about-reveal><h1>${t("ORBIT — learning is a journey of discovery.", "ORBIT — لأن التعلّم رحلة اكتشاف.")}</h1><p>${t("We believe meaningful education begins with curiosity, grows through experimentation, and becomes stronger when students, teachers and schools come together in one world.", "نؤمن أن التعليم الحقيقي يبدأ بالفضول، وينمو بالتجربة، ويصبح أقوى عندما يجمع الطلاب والمعلمين والمدارس في عالم واحد.")}</p><a class="about-text-link" href="#our-worlds">${t("Discover our story", "اكتشف حكايتنا")}${icon("arrow")}</a></div><div class="about-ecosystem" role="img" aria-label="${t("ORBIT connects students, teachers and schools", "تربط ORBIT الطلاب والمعلمين والمدارس")}"><svg class="about-ecosystem-lines" viewBox="0 0 520 360" aria-hidden="true"><path d="M260 174C260 122 151 124 151 82M260 174C260 121 369 124 369 82M260 188C260 236 151 236 151 278M260 188C260 236 369 236 369 278"/></svg><div class="about-ecosystem-core"><span>ORBIT</span><small>${t("A shared learning space", "مساحة تعليمية تجمعنا")}</small></div><div class="about-ecosystem-node node-student"><span>${icon("student")}</span><b>${t("Students", "الطلاب")}</b></div><div class="about-ecosystem-node node-teacher"><span>${icon("teacher")}</span><b>${t("Teachers", "المعلمون")}</b></div><div class="about-ecosystem-node node-school"><span>${icon("school")}</span><b>${t("Schools", "المدارس")}</b></div></div></section>
<section id="our-worlds" class="about-section"><div class="about-section-heading" data-about-reveal><h2>${t("Three worlds. One orbit.", "ثلاثة أطراف، منظومة واحدة")}</h2><p>${t("Different roles. A shared purpose: a better learning experience.", "أدوار مختلفة، وهدف واحد: تجربة تعلّم أفضل.")}</p></div><div class="about-worlds"><svg class="about-connections" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path d="M150 50C300 0 350 100 500 50S750 0 850 50"/><path class="about-connection-signal" d="M150 50C300 0 350 100 500 50S750 0 850 50"/></svg>${roles.map((role, i) => `<article class="about-world" data-about-reveal><button type="button" class="about-role-choice" aria-expanded="${i === 0}" aria-controls="about-role-${role.id}"><span class="about-role-icon">${icon(role.id)}</span><h3>${role.title}</h3><p>${role.copy}</p><span class="about-role-action">${t("Discover your place", "اكتشف دورك")}<b aria-hidden="true">${i === 0 ? "−" : "+"}</b></span></button><div id="about-role-${role.id}" class="about-role-detail" ${i === 0 ? "" : "hidden"}><p>${role.detail}</p><a href="${role.href}">${role.cta}${icon("arrow")}</a></div></article>`).join("")}</div></section>
<section class="about-purpose about-section about-purpose-relocated" aria-label="${t("Mission and vision", "الرسالة والرؤية")}"><div class="about-purpose-heading" data-about-reveal><span>${t("About ORBIT", "عن ORBIT")}</span><h2>${t("Our mission and vision", "مهمتنا ورؤيتنا")}</h2></div><div class="about-purpose-layout"><div class="about-purpose-art" role="img" aria-label="${t("A student looking toward a bright learning horizon", "طالب يتطلع إلى أفق تعليمي مشرق")}" data-about-reveal>${missionArtwork}</div><div class="about-purpose-cards"><article data-about-reveal><div class="about-purpose-symbol" aria-hidden="true"><span></span><i></i></div><h3>${t("Our mission", "مهمتنا")}</h3><p>${t("Bring students, teachers and schools into a learning environment where lessons, communication and progress are easier to follow.", "توفير بيئة تعليمية تجمع الطلاب والمعلمين والمدارس، وتسهّل الوصول إلى المحتوى وتنظيم رحلة التعلم والتواصل بينهم.")}</p></article><article data-about-reveal><div class="about-vision-symbol" aria-hidden="true"><i></i><i></i><i></i></div><h3>${t("Our vision", "رؤيتنا")}</h3><p>${t("A connected learning community where curiosity, practice and collaboration help every learner move forward.", "مجتمع تعليمي مترابط ينمو فيه الفهم بالممارسة والتعاون، ويمنح كل طالب ومعلم ومدرسة فرصة أكبر لتحقيق أهدافهم التعليمية.")}</p></article></div></div></section>
<section class="about-section"><div class="about-section-heading" data-about-reveal><h2>${t("More than receiving information.", "التعلّم أكثر من تلقّي معلومة.")}</h2><p>${t("Understand an idea. Try it. Share what you discover.", "افهم الفكرة. جرّبها. وشارك اللي اكتشفته.")}</p></div><div class="about-bento"><a class="about-feature about-feature-lab" href="../lab/lab.html" data-about-reveal><span class="about-feature-icon">${icon("lab")}</span><div><h3>${t("Ideas you can experiment with", "أفكار بتقدر تجرّبها")}</h3><p>${t("Change variables in physics simulations and observe the result.", "غيّر متغيرات المحاكاة الفيزيائية، وراقب كيف تتغيّر النتيجة.")}</p></div><div class="about-experiment" aria-hidden="true"><span></span><i></i><i></i><i></i><b>F = ma</b></div><span class="about-feature-arrow">${icon("arrow")}</span></a><a class="about-feature" href="../lessons/lessons.html" data-about-reveal>${icon("book")}<h3>${t("Content with a learning path", "محتوى إله مسار")}</h3><p>${t("Explanations, practice and teacher-published lessons.", "شروحات وتدريب ودروس ينشرها المعلمون.")}</p><span class="about-feature-arrow">${icon("arrow")}</span></a><a class="about-feature" href="../channels/channels.html" data-about-reveal>${icon("channel")}<h3>${t("A classroom that connects", "صفّ بيجمعك")}</h3><p>${t("Educational channels, assignments and classroom discussion.", "قنوات تعليمية وواجبات ونقاشات صفية.")}</p><span class="about-feature-arrow">${icon("arrow")}</span></a><a class="about-feature about-feature-progress" href="../achievements/achievements.html" data-about-reveal>${icon("progress")}<div><h3>${t("A next step you can see", "خطوتك الجايّة أوضح")}</h3><p>${t("Return to saved learning progress and earned achievements.", "ارجع لتقدّمك التعليمي المحفوظ، وشوف إنجازاتك المكتسبة.")}</p></div><span class="about-feature-arrow">${icon("arrow")}</span></a></div></section>
<section class="about-closing" data-about-reveal><div><h2>${t("Your journey in ORBIT starts here.", "رحلتك في عالم ORBIT تبدأ من هنا.")}</h2><p>${t("Bring your curiosity. Discover what comes next.", "جيب فضولك معك، واكتشف شو ممكن تتعلّم.")}</p></div><div class="about-closing-actions"><a class="about-primary" href="../registration/registration.html">${t("Start your journey", "ابدأ رحلتك")}${icon("arrow")}</a><a class="about-secondary" href="../hompage/hompage.html#features">${t("Discover the features", "اكتشف المميزات")}</a></div></section>`,
  );
  const nav = document.querySelector(".bar");
  nav.id = "siteNav";
  nav.className = "m-nav is-solid";
  nav.innerHTML = `<div class="m-container m-nav__inner"><a class="m-nav__brand m-logo" href="../hompage/hompage.html#top" aria-label="The Learning Orbit home"><span class="m-nav__mark m-logo__mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path class="m-logo__ring" d="M26.89 14.47A11 11 0 1 1 21.16 6.29"/><path class="m-logo__trail" d="M10.3 21.6Q16.5 15.5 28 6.5"/><circle class="m-logo__dot" cx="24.5" cy="9.3" r="2.3"/></svg></span><span class="m-logo__word">ORBIT</span></a><nav class="m-nav__links" aria-label="${t("Primary navigation", "التنقل الرئيسي")}"><a href="../hompage/hompage.html#top">${t("Home", "الرئيسية")}</a><a href="../hompage/hompage.html#features">${t("Features", "المميزات")}</a><a href="../hompage/hompage.html#services">${t("Services", "الخدمات")}</a><a href="../pricing/pricing.html">${t("Plans", "الباقات")}</a><a href="../hompage/hompage.html#faq">${t("FAQ", "الأسئلة الشائعة")}</a><a href="../hompage/hompage.html#contact">${t("Contact", "تواصل معنا")}</a></nav><div class="m-nav__actions"><a class="m-nav__login" href="../login/login.html">${t("Log in", "تسجيل الدخول")}</a><a class="m-btn m-btn--primary m-nav__cta" href="../registration/registration.html">${t("Sign Up", "إنشاء حساب")}</a><button class="m-nav__theme" id="orbit-theme-toggle" type="button" aria-label="${t("Switch to dark mode", "التبديل إلى الوضع الداكن")}" aria-pressed="false" title="${t("Switch to dark mode", "التبديل إلى الوضع الداكن")}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"></svg></button><button class="m-nav__burger" id="navBurger" type="button" aria-expanded="false" aria-controls="navPanel" aria-label="${t("Open menu", "فتح القائمة")}"><span></span><span></span><span></span></button></div></div><nav id="navPanel" class="orbit-home-mobile" hidden aria-label="${t("Mobile navigation", "التنقل على الهاتف")}"></nav>`;
  nav.querySelector(".m-logo__word").textContent = "ORBIT";
  const panel = nav.querySelector("#navPanel"),
    burger = nav.querySelector("#navBurger"),
    toggle = nav.querySelector("#orbit-theme-toggle"),
    appearanceKey = "orbit.settings.appearance",
    validAppearance = (value) => ["light", "dark", "auto"].includes(value),
    readAuth = (key, fallback) => {
      try { return OrbitAuth.get(key, fallback); } catch { return fallback; }
    },
    readLegacy = (key) => { try { return localStorage.getItem(key); } catch { return null; } },
    storedAppearance = readAuth(appearanceKey, null),
    storedPrefs = readAuth("orbit.student.v1", {}),
    legacyAppearance = readLegacy("orbitTheme") || readLegacy("theme"),
    systemAppearance = matchMedia("(prefers-color-scheme: dark)");
  let appearance = validAppearance(storedAppearance) ? storedAppearance : validAppearance(storedPrefs?.theme) ? storedPrefs.theme : validAppearance(legacyAppearance) ? legacyAppearance : "light";
  function applyAppearance() {
    const dark = appearance === "auto" ? systemAppearance.matches : appearance === "dark",
      mode = dark ? "dark" : "light",
      label = t(dark ? "Switch to light mode" : "Switch to dark mode", dark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن");
    document.body.dataset.theme = mode;
    document.documentElement.dataset.theme = mode;
    document.documentElement.dataset.orbitAppearance = appearance;
    toggle.setAttribute("aria-pressed", String(dark));
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
    toggle.querySelector("svg").innerHTML = dark ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2m12-12-2 2"/>' : '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>';
  }
  function saveAppearance(value) {
    appearance = value;
    try {
      const current = readAuth("orbit.student.v1", {}),
        legacy = readAuth("orbit.preferences", {});
      OrbitAuth.set(appearanceKey, value);
      OrbitAuth.set("orbit.student.v1", { ...current, theme: value });
      OrbitAuth.set("orbit.preferences", { ...legacy, theme: value });
      localStorage.setItem("orbitTheme", value);
    } catch {}
    applyAppearance();
  }
  applyAppearance();
  toggle.addEventListener("click", () => saveAppearance((appearance === "auto" ? systemAppearance.matches : appearance === "dark") ? "light" : "dark"));
  const onSystemAppearance = () => { if (appearance === "auto") applyAppearance(); };
  systemAppearance.addEventListener?.("change", onSystemAppearance);
  function setMenuOpen(open) {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", t(open ? "Close menu" : "Open menu", open ? "إغلاق القائمة" : "فتح القائمة"));
    panel.hidden = !open;
    nav.classList.toggle("is-open", open);
  }
  burger.addEventListener("click", () => setMenuOpen(burger.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || panel.hidden) return;
    setMenuOpen(false);
    burger.focus();
  });
  panel.innerHTML = [...nav.querySelectorAll(".m-nav__links a,.m-nav__login,.m-nav__cta")].map((link) => `<a href="${link.href}">${link.textContent}</a>`).join("");
  panel.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    setMenuOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (panel.hidden || nav.contains(event.target)) return;
    setMenuOpen(false);
  });
  document.title = t("About ORBIT · A journey of discovery", "عن ORBIT · رحلة اكتشاف");
  const root = document.getElementById("orbit-page");
  root.querySelector(".wrap>h1")?.remove();
  root.querySelector(".wrap>.eyebrow")?.remove();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
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
    (entries) => entries.forEach((entry) => entry.target.classList.toggle("about-visible", entry.isIntersecting)),
    { threshold: 0.05 },
  );
  root.querySelectorAll(".about-worlds").forEach((element) => visibility.observe(element));
  document.addEventListener("DOMContentLoaded", () =>
    setTimeout(() => {
      const language = document.getElementById("orbit-language-button");
      if (language) root.querySelector(".m-nav__actions").append(language);
    }, 0),
  );
  function leave(event) {
    if (event.persisted) return;
    reveal.disconnect();
    visibility.disconnect();
    systemAppearance.removeEventListener?.("change", onSystemAppearance);
    removeEventListener("pagehide", leave);
  }
  addEventListener("pagehide", leave);
})();
