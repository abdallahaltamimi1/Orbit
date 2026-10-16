(() => {
  "use strict";
  const ar = () => document.documentElement.lang === "ar";
  const t = (en, arabic) => (ar() ? arabic : en);
  const root = () => document.getElementById("orbit-page");
  const user = () => window.OrbitAuth?.current();
  function dashboard() {
    if (
      location.pathname.includes("/car-lab/") ||
      (location.pathname.includes("/lab/") &&
        new URLSearchParams(location.search).has("experiment"))
    )
      return "../lab/lab.html";
    const role = user()?.role;
    return role === "teacher"
      ? "../teacher-dashboard/teacher-dashboard.html"
      : role === "school"
        ? "../school-dashboard/school-dashboard.html"
        : role === "student"
          ? "../student-dashboard/student-dashboard.html"
          : "../hompage/hompage.html";
  }
  const routes = new Set([
    "hompage",
    "about",
    "login",
    "registration",
    "school-login",
    "school-registration",
    "lab",
    "car-lab",
    "lessons",
    "lesson",
    "practice",
    "quiz",
    "result",
    "channels",
    "channel",
    "student-dashboard",
    "teacher-dashboard",
    "school-dashboard",
    "teacher-directory",
    "teacher-profile",
    "account-profile",
    "student-profile",
    "achievements",
    "exchange",
    "settings",
    "jobs",
    "applications",
    "notifications",
    "lesson-planner",
    "teacher-studio",
    "class-details",
    "pricing",
  ]);
  function safe(url) {
    try {
      const value = new URL(url, location.href),
        parts = value.pathname.split("/").filter(Boolean);
      if (
        value.origin !== location.origin ||
        parts.length !== 2 ||
        !routes.has(parts[0]) ||
        parts[1] !== parts[0] + ".html" ||
        value.pathname + value.search === location.pathname + location.search ||
        /^(login|registration|school-login|school-registration)$/.test(parts[0])
      )
        return null;
      const role = user()?.role;
      const restricted = {
        "student-dashboard": "student",
        achievements: "student",
        exchange: "student",
        practice: "student",
        quiz: "student",
        result: "student",
        "teacher-dashboard": "teacher",
        "teacher-studio": "teacher",
        "lesson-planner": "teacher",
        jobs: "teacher",
        applications: "teacher",
        "school-dashboard": "school",
        pricing: "professional",
      };
      if (
        restricted[parts[0]] &&
        (restricted[parts[0]] === "professional"
          ? !["teacher", "school"].includes(role)
          : restricted[parts[0]] !== role)
      )
        return null;
      return value.pathname + value.search;
    } catch {
      return null;
    }
  }
  function fallbackDestination() {
    const target = dashboard(),
      url = new URL(target, location.href);
    return url.pathname + url.search === location.pathname + location.search
      ? "../hompage/hompage.html"
      : target;
  }
  function backDestination() {
    let prior = null;
    try {
      const marker = sessionStorage.getItem("orbit.back.arrival");
      if (marker === location.pathname + location.search) {
        sessionStorage.removeItem("orbit.back.arrival");
        return fallbackDestination();
      }
      prior = safe(document.referrer);
    } catch {}
    return prior || fallbackDestination();
  }
  function mountBack() {
    if (!root() || location.pathname.includes("/hompage/")) return;
    const host =
      document.querySelector(".login-container") ||
      document.querySelector("#orbit-page .wrap") ||
      document.querySelector("#orbit-page main");
    if (!host) return;
    document.querySelectorAll(".orbit-return,.lab-back,#orbit-back").forEach((el) => el.remove());
    if (host.querySelector(":scope>.orbit-top-back")) return;
    const link = document.createElement("a");
    link.className = "orbit-top-back";
    link.href = backDestination();
    link.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6"/></svg><span>${t("Back", "العودة")}</span>`;
    link.addEventListener("click", () => {
      try {
        sessionStorage.setItem(
          "orbit.back.arrival",
          new URL(link.href).pathname + new URL(link.href).search,
        );
      } catch {}
    });
    host.prepend(link);
  }
  function mountFooter() {
    if (
      !/\/(hompage|about)\//.test(location.pathname) ||
      document.getElementById("orbit-site-footer")
    )
      return;
    document.querySelector(".m-footer")?.remove();
    const footer = document.createElement("footer");
    footer.id = "orbit-site-footer";
    footer.className = "orbit-site-footer orbit-footer-approved";
    const icon = (name) => {
      const paths = {
        email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
        whatsapp:
          '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M8 7c0 5 3 8 8 9l1-3-3-1-1 1-2-2 1-1-1-3Z"/>',
        up: '<path d="m6 14 6-6 6 6"/>',
        link: '<path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2"/>',
      };
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.link}</svg>`;
    };
    const links = (items) =>
      items.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("");
    footer.innerHTML = `<div class="orbit-footer-grid"><section class="orbit-footer-brand"><a class="orbit-footer-logo" href="../hompage/hompage.html" aria-label="ORBIT"><span class="orbit-footer-mark"><svg viewBox="0 0 32 32" fill="none" > <path  d="M26.89 14.47A11 11 0 1 1 21.16 6.29" /> <path  d="M10.3 21.6Q16.5 15.5 28 6.5" /> <circle class="m-logo__dot" cx="24.5" cy="9.3" r="2.3" /> </svg></span><span><b>ORBIT</b><small>${t("Discover · Learn · Grow", "اكتشف · تعلّم · تقدّم")}</small></span></a><p>${t("An educational platform connecting students, teachers and schools in one digital environment, making learning more interactive, organized and connected.", "منصة تعليمية تجمع الطلاب والمعلمين والمدارس في بيئة رقمية متكاملة، تجعل التعلّم أكثر تفاعلًا وتنظيمًا وتواصلًا.")}</p><div class="orbit-social-links" aria-label="${t("Contact and social links", "روابط التواصل")}"><a href="mailto:abdullahaltamimi300@gmail.com" aria-label="${t("Email ORBIT", "راسل ORBIT بالبريد")}" title="${t("Email", "البريد الإلكتروني")}">${icon("email")}</a><a href="https://wa.me/962772071948" target="_blank" rel="noopener noreferrer" aria-label="${t("Contact ORBIT on WhatsApp", "تواصل مع ORBIT على واتساب")}" title="${t("WhatsApp", "واتساب")}">${icon("whatsapp")}</a></div></section><section class="orbit-footer-platform"><h2>${t("Platform", "المنصة")}</h2><ul>${links(
      [
        ["../about/about.html", t("About ORBIT", "عن ORBIT")],
        ["../hompage/hompage.html#features", t("Features", "المميزات")],
        ["../hompage/hompage.html#services", t("Services", "الخدمات")],
        ["../pricing/pricing.html", t("Plans", "الباقات")],
      ],
    )}</ul></section><section class="orbit-footer-explore"><h2>${t("Explore", "استكشف")}</h2><ul>${links(
      [
        ["../lessons/lessons.html", t("Lessons", "الدروس")],
        ["../lab/lab.html", t("Interactive labs", "المختبرات التفاعلية")],
        ["../teacher-directory/teacher-directory.html", t("Teacher directory", "دليل المعلمين")],
        ["../registration/registration.html", t("Sign up", "إنشاء حساب")],
      ],
    )}</ul></section><section class="orbit-footer-quick"><h2>${t("Quick links", "روابط سريعة")}</h2><ul>${links(
      [
        ["../hompage/hompage.html", t("Home", "الرئيسية")],
        ["../channels/channels.html", t("Channels", "القنوات")],
        ["../hompage/hompage.html#faq", t("FAQ", "الأسئلة الشائعة")],
        ["../hompage/hompage.html#contact", t("Contact us", "تواصل معنا")],
      ],
    )}</ul></section></div><div class="orbit-footer-bottom"><span>${t("Learning connects us.", "التعلّم يجمعنا.")}</span><span class="orbit-footer-copyright">© ORBIT ${new Date().getFullYear()}${t(". All rights reserved.", "، جميع الحقوق محفوظة.")}</span><button type="button" class="orbit-footer-top" aria-label="${t("Back to top", "العودة إلى أعلى الصفحة")}" title="${t("Back to top", "العودة إلى أعلى الصفحة")}">${icon("up")}</button></div>`;
    root().append(footer);
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "../shared/footer-premium.css";
    document.head.append(css);
    footer.querySelector(".orbit-footer-top").onclick = () => {
      window.scrollTo({
        top: 0,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
      const target = document.querySelector(".m-nav__brand,.bar .logo");
      target?.focus({ preventScroll: true });
    };
    const social = window.OrbitConfig?.socialLinks || {};
    for (const [name, url] of Object.entries(social)) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") continue;
        const a = document.createElement("a");
        a.href = parsed.href;
        a.innerHTML = icon(name.toLowerCase() === "whatsapp" ? "whatsapp" : "link");
        a.setAttribute("aria-label", name);
        a.title = name;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        footer.querySelector(".orbit-social-links").append(a);
      } catch {}
    }
  }
  function studentOrder() {
    if (user()?.role !== "student") return;
    const milestones = document.getElementById("milestones");
    if (milestones && milestones.parentElement.lastElementChild !== milestones)
      milestones.parentElement.append(milestones);
    const quick = document.querySelector(".quick-grid");
    const achievement = quick?.querySelector('a[href*="/achievements/"]');
    if (achievement && quick.lastElementChild !== achievement) quick.append(achievement);
  }
  function imageFallback() {
    document.querySelectorAll(".experiment-image img").forEach((image) => {
      if (image.dataset.fallbackReady) return;
      image.dataset.fallbackReady = "true";
      image.addEventListener("error", () => {
        const fallback = document.createElement("div");
        fallback.className = "lab-image-fallback";
        fallback.setAttribute("role", "img");
        fallback.setAttribute("aria-label", t("Car motion diagram", "رسم لحركة السيارة"));
        fallback.innerHTML =
          '<svg viewBox="0 0 500 240" aria-hidden="true"><path d="M30 195H470M130 145l35-55h155l45 55h35v35H95v-35Z" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="155" cy="180" r="20" fill="currentColor"/><circle cx="340" cy="180" r="20" fill="currentColor"/><path d="M380 80h70l-15-15m15 15-15 15" stroke="currentColor" stroke-width="5" fill="none"/></svg>';
        image.replaceWith(fallback);
      });
      if (image.complete && !image.naturalWidth) image.dispatchEvent(new Event("error"));
    });
  }
  function loginLanguage() {
    if (!/\/(login|school-login)\//.test(location.pathname)) return;
    const prefs = window.OrbitAuth?.get("orbit.student.v1", {});
    if (prefs?.lang) {
      document.documentElement.lang = prefs.lang;
      document.documentElement.dir = prefs.lang === "ar" ? "rtl" : "ltr";
    }
    if (!ar()) return;
    const set = (selector, text) => {
      const e = document.querySelector(selector);
      if (e) e.textContent = text;
    };
    set(".login-small-title", "أهلًا بعودتك");
    set(
      ".login-heading h2",
      location.pathname.includes("school-login") ||
        new URLSearchParams(location.search).get("role") === "school"
        ? "تسجيل دخول المدرسة"
        : "تسجيل الدخول إلى حسابك",
    );
    set(".login-heading p", "تابع من حيث توقفت.");
    set("label[for=email]", "البريد الإلكتروني");
    set("label[for=password]", "كلمة المرور");
    set(".login-button .button-text", "تسجيل الدخول");
    set(".visual-badge", "✦ تابع رحلتك");
    set(".visual-content p", "عُد إلى عالمك التعليمي وتابع الاستكشاف والتعليم والنمو.");
    set(".visual-footer", "تعلّم. علّم. اكتشف.");
    document.querySelector("#password").placeholder = "أدخل كلمة المرور";
    document.querySelector("#passwordToggle").setAttribute("aria-label", "إظهار كلمة المرور");
    const signup = document.querySelector(".signup-text"),
      signupLink =
        signup.querySelector("a")?.getAttribute("href") || "../registration/registration.html";
    signup.innerHTML = "جديد في ORBIT؟ <a>أنشئ حسابًا</a>";
    signup.querySelector("a").href = signupLink;
  }
  function scan() {
    mountBack();
    studentOrder();
    imageFallback();
  }
  document.addEventListener("DOMContentLoaded", () => {
    mountFooter();
    scan();
    let queued = false;
    new MutationObserver(() => {
      if (!queued) {
        queued = true;
        queueMicrotask(() => {
          queued = false;
          scan();
        });
      }
    }).observe(root() || document.body, { childList: true, subtree: true });
  });
  window.OrbitNavigation = { safe, backDestination };
})();
