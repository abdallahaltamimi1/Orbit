(() => {
  "use strict";
  const ar = document.documentElement.lang === "ar",
    t = (en, arabic) => (ar ? arabic : en),
    hero = document.getElementById("hero"),
    nav = document.getElementById("siteNav");
  const paths = {
    student: '<path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v7c4 3 8 3 12 0v-7M22 9v8"/>',
    teacher:
      '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8m-4-5v5M7 8h10M7 12h6"/>',
    school: '<path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6M7 10h2m6 0h2M7 13h2m6 0h2"/>',
    connected:
      '<circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="m10 8-4 8m8-8 4 8M8 19h8"/>',
  };
  const section = document.createElement("section");
  section.id = "project-overview";
  section.className = "orbit-project-overview";
  section.innerHTML = `<div class="m-container"><header><h2>${t("Education, as it should be.", "التعليم، كما يجب أن يكون.")}</h2><p>${t("ORBIT brings students, teachers and schools together in one digital environment, making learning more interactive, organized and connected.", "ORBIT منصة تعليمية تجمع الطلاب والمعلمين والمدارس في بيئة رقمية متكاملة، تجعل التعلم أكثر تفاعلًا وتنظيمًا وتواصلًا.")}</p></header><div class="overview-grid">${[
    [
      "student",
      t("For students", "للطالب"),
      t(
        "Explore lessons, submit assignments and learn through interactive experiments.",
        "دروس وواجبات وتجارب مختبرية تفاعلية تساعدك تفهم وتطبّق.",
      ),
    ],
    [
      "teacher",
      t("For teachers", "للمعلم"),
      t(
        "Publish lessons and assignments, manage classroom channels and review student responses.",
        "انشر الدروس والواجبات، نظّم قنوات صفك وراجع إجابات طلابك.",
      ),
    ],
    [
      "school",
      t("For schools", "للمدرسة"),
      t(
        "Discover teacher portfolios and organize recruitment and applications in your school workspace.",
        "اكتشف ملفات المعلمين ونظّم فرص التوظيف والطلبات في لوحة مدرستك.",
      ),
    ],
    [
      "connected",
      t("One connected ecosystem", "منظومة تعليمية مترابطة"),
      t(
        "Connect learning content, classroom communication and saved progress in one platform.",
        "محتوى وتواصل صفّي وتقدّم تعليمي محفوظ، في منصة واحدة.",
      ),
    ],
  ]
    .map(
      ([key, title, copy]) =>
        `<article class="overview-card"><span class="overview-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key]}</svg></span><h3>${title}</h3><p>${copy}</p></article>`,
    )
    .join("")}</div></div>`;
  hero.after(section);
  // Keep every desktop destination in the mobile menu too.
  const menu = document.getElementById("navPanel"),
    burger = document.getElementById("navBurger");
  if (menu) {
    menu.replaceChildren();
    for (const source of document.querySelectorAll(".m-nav__links a,.m-nav__login,.m-nav__cta"))
      menu.append(source.cloneNode(true));
    menu.querySelectorAll("a").forEach((a) => a.removeAttribute("class"));
  }
  document.addEventListener("click", (event) => {
    if (!menu || menu.hidden || nav.contains(event.target)) return;
    menu.hidden = true;
    burger.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  });
  document.addEventListener("DOMContentLoaded", () =>
    setTimeout(() => {
      const language = document.getElementById("orbit-language-button"),
        actions = document.querySelector(".m-nav__actions");
      if (language && actions) actions.append(language);
    }, 0),
  );
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const cards = entry.target.querySelectorAll(".overview-card");
        if (!reduced.matches)
          cards.forEach((card, i) =>
            card.animate(
              [
                { opacity: 0, transform: "translateY(12px)" },
                { opacity: 1, transform: "none" },
              ],
              { duration: 400, delay: i * 65, easing: "cubic-bezier(.16,1,.3,1)" },
            ),
          );
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.15 },
  );
  observer.observe(section);
  const sections = [...document.querySelectorAll('.m-nav__links a[href^="#"]')]
    .map((a) => [a, document.querySelector(a.getAttribute("href"))])
    .filter(([, s]) => s);
  function active() {
    let selected = sections[0]?.[0];
    for (const [a, s] of sections) if (s.getBoundingClientRect().top <= 150) selected = a;
    sections.forEach(([a]) => {
      a.classList.toggle("is-active", a === selected);
      if (a === selected) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  }
  addEventListener("scroll", active, { passive: true });
  active();
  addEventListener(
    "pagehide",
    () => {
      observer.disconnect();
      removeEventListener("scroll", active);
    },
    { once: true },
  );
})();
