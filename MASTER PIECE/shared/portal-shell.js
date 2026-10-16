/* Shared feedback and loading, loaded once on authenticated portal pages. */
(() => {
  if (document.querySelector("script[data-orbit-motion]")) return;
  const base = new URL("../shared/", location.href);
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = new URL("motion-system.css", base).href;
  document.head.append(css);
  const script = document.createElement("script");
  script.dataset.orbitMotion = "true";
  script.src = new URL("motion-system.js", base).href;
  document.head.append(script);
})();
(() => {
  "use strict";
  const A = OrbitAuth;
  let signature = "",
    urls = new Map(),
    historyKey = "orbit.nav." + (A.current()?.email || "guest");
  const paths = {
    video: '<rect x="3" y="5" width="14" height="14" rx="3"/><path d="m17 10 4-3v10l-4-3"/>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
    home: '<path d="m3 10 9-7 9 7v10H3Z"/>',
    learn: '<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3ZM12 6v16"/>',
    lab: '<path d="M9 3h6M10 3v7l-6 10h16l-6-10V3M7 15h10"/>',
    channel: '<circle cx="12" cy="12" r="3"/><path d="M5 6a9 9 0 0 0 0 12M19 6a9 9 0 0 1 0 12"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
    award: '<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/>',
    exchange: '<path d="M3 7h18l-4-4M21 17H3l4 4"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    planner:
      '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 15h6"/>',
    jobs: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M9 7V3h6v4M3 13h18"/>',
    bell: '<path d="M5 17h14l-2-4V8a5 5 0 0 0-10 0v5ZM10 21h4"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    logout: '<path d="m16 17 5-5-5-5M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
    orbit:
      '<ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="3"/>',
  };
  const svg = (k) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[k] || paths.home}</svg>`,
    esc = (s) =>
      String(s ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
      );
  function image(key) {
    if (!key) return Promise.resolve("");
    if (urls.has(key)) return Promise.resolve(urls.get(key));
    return new Promise((resolve) => {
      const req = indexedDB.open("orbit-media-v1", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("videos");
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("videos")) {
          db.close();
          resolve("");
          return;
        }
        const read = db.transaction("videos").objectStore("videos").get(key);
        read.onsuccess = () => {
          db.close();
          if (!read.result) {
            resolve("");
            return;
          }
          const url = URL.createObjectURL(read.result);
          urls.set(key, url);
          resolve(url);
        };
        read.onerror = () => {
          db.close();
          resolve("");
        };
      };
      req.onerror = () => resolve("");
    });
  }
  function back() {
    let list;
    try {
      list = JSON.parse(sessionStorage.getItem(historyKey) || "[]");
    } catch {
      list = [];
    }
    const current = location.pathname + location.search,
      prior = list.filter((x) => x !== current).at(-1);
    if (
      prior &&
      history.length > 1 &&
      document.referrer.startsWith(location.origin) &&
      !/(login|registration)/.test(document.referrer)
    ) {
      history.back();
      return;
    }
    location.href =
      prior ||
      "../" +
        (A.current().role === "teacher"
          ? "teacher-dashboard"
          : A.current().role === "school"
            ? "school-dashboard"
            : "student-dashboard") +
        "/" +
        (A.current().role === "teacher"
          ? "teacher-dashboard"
          : A.current().role === "school"
            ? "school-dashboard"
            : "student-dashboard") +
        ".html";
  }
  function mount() {
    const u = A.current();
    if (!u || u.role === "admin") return;
    const prefs = A.get("orbit.student.v1", {}),
      ar = (prefs.lang || "ar") === "ar",
      t = (en, arabic) => (ar ? arabic : en),
      p = OrbitProfiles.current() || {},
      name = p.name || u.name,
      avatar = p.photo || p.logo || "",
      count = (A.get("orbit.recruitment.v1", {}).notifications || []).filter(
        (n) => n.recipient === u.email && !n.read,
      ).length;
    const links =
      u.role === "student"
        ? [
            ["student-dashboard", "home", "Home", "الرئيسية"],
            ["lessons", "learn", "Learn", "تعلمي"],
            ["lab", "lab", "Lab", "المختبر"],
            ["channels", "channel", "My channels", "قنواتي"],
            ["exchange", "exchange", "Exchange", "التبادل"],
            ["account-profile", "profile", "My profile", "ملفي"],
            ["settings", "settings", "Settings", "الإعدادات"],
          ]
        : u.role === "teacher"
          ? [
              ["teacher-dashboard", "home", "Overview", "نظرة عامة"],
              ["lesson-planner", "planner", "Create lesson", "إنشاء درس"],
              ["channels", "channel", "My channels", "قنواتي"],
              ["lab", "lab", "Lab", "المختبر"],
              ["account-profile", "profile", "My profile", "ملفي"],
              ["teacher-profile", "profile", "Professional portfolio", "ملفي المهني"],
              ["teacher-directory", "profile", "Teacher directory", "دليل المعلمين"],
              ["applications", "jobs", "My applications", "طلباتي"],
              ["notifications", "bell", "Notifications", "الإشعارات"],
              ["settings", "settings", "Settings", "الإعدادات"],
            ]
          : [
              ["school-dashboard", "jobs", "School recruitment", "توظيف المدرسة"],
              ["account-profile", "profile", "School profile", "ملف المدرسة"],
              ["notifications", "bell", "Notifications", "الإشعارات"],
              ["settings", "settings", "Settings", "الإعدادات"],
            ];
    if (u.role === "student") links.push(["achievements", "award", "Achievements", "الإنجازات"]);
    else if (["teacher", "school"].includes(u.role))
      links.push(["pricing", "orbit", "Plans & usage", "الخطط والاستخدام"]);
    if (u.role === "student") {
      links.splice(
        0,
        links.length,
        ["student-dashboard", "home", "Home", "الرئيسية"],
        ["lessons", "learn", "Learn", "تعلّم"],
        ["lab", "lab", "Lab", "المختبر"],
        [
          "student-dashboard",
          "planner",
          "Assignments",
          "الواجبات",
          "assignments-section",
          "assignment",
        ],
        ["student-dashboard", "video", "Meetings", "الاجتماعات", "meetings-section", "meeting"],
        ["channels", "channel", "My channels", "قنواتي"],
        ["student-dashboard", "users", "Community", "المجتمع", "student-community"],
        ["exchange", "exchange", "Exchange", "التبادل"],
        ["achievements", "award", "Achievements", "الإنجازات"],
        ["account-profile", "profile", "My profile", "ملفي"],
        ["settings", "settings", "Settings", "الإعدادات"],
      );
    } else {
      const dashboard = u.role === "teacher" ? "teacher-dashboard" : "school-dashboard";
      if (u.role === "teacher")
        links.push([
          dashboard,
          "planner",
          "Assignments",
          "الواجبات",
          "assignments-section",
          "assignment",
        ]);
      links.push([dashboard, "video", "Meetings", "الاجتماعات", "meetings-section", "meeting"]);
    }
    const sig = JSON.stringify([
      u.role,
      name,
      avatar,
      p.level,
      prefs.lang,
      prefs.theme,
      count,
      location.pathname,
      location.hash,
    ]);
    let rail = document.getElementById("orbit-rail");
    if (sig !== signature || !rail) {
      signature = sig;
      if (!rail) {
        rail = document.createElement("aside");
        rail.id = "orbit-rail";
        rail.className = "orbit-rail";
        document.body.append(rail);
      }
      const home = links.find((l) =>
        ["student-dashboard", "teacher-dashboard", "school-dashboard"].includes(l[0]),
      )[0];
      rail.innerHTML = `<a class="orbit-rail-brand" href="../${home}/${home}.html"><span class="orbit-brand-mark">${svg("orbit")}</span><b>ORBIT</b></a><div class="orbit-identity"><span class="orbit-avatar">${esc(
        name
          .split(/\s+/)
          .map((x) => x[0])
          .slice(0, 2)
          .join(""),
      )}</span><div><strong>${esc(name)}</strong><small>${u.role === "student" ? esc({ primary: t("Primary", "أساسي"), secondary: t("Secondary", "ثانوي"), university: t("University", "جامعي") }[p.level] || t("Student", "طالب")) : u.role === "teacher" ? t("Teacher", "معلم") : t("School", "مدرسة")}</small></div></div><nav aria-label="${t("Main navigation", "التنقل الرئيسي")}">${links
        .map((l, index) => {
          const destination =
            "../" +
            l[0] +
            "/" +
            l[0] +
            ".html" +
            (l[0] === "teacher-profile" ? "?id=" + encodeURIComponent(u.email) : "") +
            (l[4] ? "#" + l[4] : "");
          const target = new URL(destination, location.href),
            same = target.pathname === location.pathname;
          const active = l[4]
            ? same && location.hash === "#" + l[4]
            : (same && !location.hash) ||
              (l[0] === "channels" && location.pathname.includes("/channel/")) ||
              (l[0] === "lessons" && /\/(lesson|practice)\//.test(location.pathname)) ||
              (l[0] === "lab" && location.pathname.includes("/car-lab/"));
          const heading =
            u.role === "student"
              ? { 0: t("Learning", "تعلّم"), 5: t("Channels", "قنواتي"), 9: t("General", "عام") }[
                  index
                ]
              : index === 0
                ? t("Your workspace", "مساحة عملك")
                : "";
          return `${heading ? `<p class="orbit-nav-heading">${heading}</p>` : ""}<a href="${esc(same && l[4] ? "#" + l[4] : destination)}" class="orbit-nav-link ${active ? "is-current" : ""}" ${active ? 'aria-current="page"' : ""} ${l[5] ? "data-" + l[5] + "-nav" : ""} aria-label="${t(l[2], l[3])}" title="${t(l[2], l[3])}">${svg(l[1])}<span>${t(l[2], l[3])}</span>${l[0] === "notifications" && count ? `<small class="notification-badge">${count}</small>` : ""}</a>`;
        })
        .join(
          "",
        )}</nav><div class="orbit-rail-foot"><button class="orbit-back" id="orbit-back">${svg("back")}${t("Back", "رجوع")}</button><button type="button" id="orbit-logout" title="${t("Log out", "تسجيل الخروج")}" aria-label="${t("Log out", "تسجيل الخروج")}">${svg("logout")}<span>${t("Log out", "تسجيل الخروج")}</span></button></div>`;
      rail.querySelector("#orbit-back").onclick = back;
      rail.querySelector("#orbit-logout").onclick = () => {
        sessionStorage.removeItem(historyKey);
        A.logout();
      };
      const collapse = document.createElement("button");
      collapse.id = "orbit-rail-collapse";
      collapse.type = "button";
      collapse.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>';
      rail.querySelector(".orbit-rail-brand").after(collapse);
      const updateCollapse = () => {
        const collapsed = localStorage.getItem("orbit.sidebar.collapsed") === "true";
        document.body.classList.toggle("orbit-sidebar-collapsed", collapsed);
        collapse.setAttribute("aria-expanded", String(!collapsed));
        collapse.setAttribute(
          "aria-label",
          collapsed ? t("Expand sidebar", "توسيع القائمة") : t("Collapse sidebar", "طي القائمة"),
        );
        collapse.title = collapse.getAttribute("aria-label");
      };
      collapse.onclick = () => {
        localStorage.setItem(
          "orbit.sidebar.collapsed",
          String(!document.body.classList.contains("orbit-sidebar-collapsed")),
        );
        updateCollapse();
      };
      updateCollapse();
      rail.querySelectorAll("nav a").forEach((a) => {
        a.title = a.textContent.trim();
        a.setAttribute("aria-label", a.textContent.trim());
      });
      if (avatar)
        image(avatar).then((url) => {
          if (
            url &&
            rail.isConnected &&
            OrbitProfiles.current()?.id === p.id &&
            (OrbitProfiles.current()?.photo || OrbitProfiles.current()?.logo || "") === avatar
          ) {
            const av = rail.querySelector(".orbit-avatar");
            av.innerHTML = '<img alt="' + t("Profile picture", "الصورة الشخصية") + '">';
            av.querySelector("img").src = url;
          }
        });
    }
    rail.querySelectorAll("nav a").forEach((a) => {
      a.title = a.textContent.trim();
      a.setAttribute("aria-label", a.textContent.trim());
    });
    document.body.classList.add("orbit-shell-mounted");
    document.querySelectorAll("#orbit-page .sidebar").forEach((el) => {
      el.hidden = true;
      el.inert = true;
      el.dataset.obsoleteNavigation = "true";
    });
    document.querySelectorAll("#orbit-page #orbit-logout").forEach((el) => el.remove());
    document
      .querySelectorAll(
        '#orbit-page [data-action="settings"],#orbit-page [data-action="mood"],#orbit-page [data-setting="mood"]',
      )
      .forEach((el) => el.remove());
    document.querySelectorAll('#orbit-page a[href*="/login/"]').forEach((a) => {
      if (
        u.role === "student" &&
        (a.classList.contains("top-avatar") ||
          a.classList.contains("profile-link") ||
          a.closest(".quick-grid"))
      ) {
        a.href = "../account-profile/account-profile.html";
      }
    });
    if (/\/(teacher-directory|teacher-profile)\//.test(location.pathname))
      document.querySelectorAll("img[data-asset]").forEach((img) => {
        const asset = img.dataset.asset;
        if (!asset || img.dataset.loadingAsset === asset) return;
        img.dataset.loadingAsset = asset;
        image(asset).then((url) => {
          if (url && img.isConnected && img.dataset.asset === asset && img.src !== url)
            img.src = url;
        });
      });
    const pageAvatars = [
      ...document.querySelectorAll(
        "#orbit-page .student-avatar,#orbit-page .top-avatar" +
          (location.pathname.includes("/teacher-dashboard/") ? ",#orbit-page .profile-avatar" : ""),
      ),
    ];
    pageAvatars.forEach((el) => {
      const initials = name
        .trim()
        .split(/\s+/)
        .map((x) => x[0])
        .slice(0, 2)
        .join("");
      if (el.dataset.accountAsset !== avatar || (!avatar && el.textContent !== initials)) {
        el.dataset.accountAsset = avatar;
        el.textContent = initials;
      }
    });
    if (avatar)
      image(avatar).then((url) => {
        const current = OrbitProfiles.current();
        if (!url || current?.id !== p.id || (current.photo || current.logo || "") !== avatar)
          return;
        pageAvatars.forEach((el) => {
          if (!el.isConnected || el.dataset.accountAsset !== avatar) return;
          let img = el.querySelector("img");
          if (!img) {
            img = document.createElement("img");
            img.className = "orbit-account-picture";
            el.replaceChildren(img);
          }
          img.alt = t("Your profile picture", "صورتك الشخصية");
          if (img.src !== url) img.src = url;
        });
      });
    if (!document.getElementById("orbit-mobile-toggle")) {
      const button = document.createElement("button");
      button.id = "orbit-mobile-toggle";
      button.type = "button";
      button.setAttribute("aria-label", t("Open navigation", "فتح القائمة"));
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-controls", "orbit-rail");
      button.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
      button.onclick = () => {
        const open = document.body.classList.toggle("orbit-menu-open");
        button.setAttribute("aria-expanded", String(open));
        document.getElementById("orbit-page").inert = open;
        if (open) rail.querySelector("a")?.focus();
      };
      const shade = document.createElement("button");
      shade.id = "orbit-mobile-shade";
      shade.type = "button";
      shade.setAttribute("aria-label", t("Close navigation", "إغلاق القائمة"));
      shade.onclick = () => {
        document.body.classList.remove("orbit-menu-open");
        button.setAttribute("aria-expanded", "false");
        document.getElementById("orbit-page").inert = false;
        button.focus();
      };
      document.body.append(shade, button);
    }
    document
      .querySelectorAll(
        "#orbit-page .footer,#orbit-page .demo-hint,#orbit-page .credential-note,#orbit-page .portfolio-hint,#orbit-page .demo-note,#orbit-page .role-banner,#orbit-page .eyebrow",
      )
      .forEach((el) => {
        if (
          el.classList.contains("eyebrow") &&
          !/ORBIT\s*\/|CONNECTED LEARNING|تعلم متصل/.test(el.textContent)
        )
          return;
        el.remove();
      });
    document.querySelectorAll("#orbit-page .topbar>span").forEach((el) => {
      if (/ORBIT/.test(el.textContent) && /مساحة المعلم|Teacher workspace/.test(el.textContent))
        el.remove();
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    const u = A.current();
    if (!u || u.role === "admin") return;
    const here = location.pathname + location.search;
    let nav;
    try {
      nav = JSON.parse(sessionStorage.getItem(historyKey) || "[]");
    } catch {
      nav = [];
    }
    if (nav.at(-1) !== here) {
      nav.push(here);
      sessionStorage.setItem(historyKey, JSON.stringify(nav.slice(-30)));
    }
    mount();
    let queued = false;
    new MutationObserver((records) => {
      if (records.every((r) => r.target.closest?.("#orbit-rail,.orbit-title-fx"))) return;
      if (!queued) {
        queued = true;
        queueMicrotask(() => {
          queued = false;
          mount();
        });
      }
    }).observe(document.getElementById("orbit-page") || document.body, {
      childList: true,
      subtree: true,
    });
    window.addEventListener("pageshow", () => {
      if (!A.current()) location.replace("../login/login.html");
    });
    window.addEventListener("resize", () => {
      if (innerWidth > 780) {
        document.body.classList.remove("orbit-menu-open");
        document.getElementById("orbit-page").inert = false;
        document.getElementById("orbit-mobile-toggle")?.setAttribute("aria-expanded", "false");
      }
    });
    window.addEventListener("hashchange", mount);
    document.addEventListener("click", (event) => {
      const link = event.target.closest("#orbit-rail nav a");
      if (!link) return;
      document.body.classList.remove("orbit-menu-open");
      document.getElementById("orbit-page").inert = false;
      document.getElementById("orbit-mobile-toggle")?.setAttribute("aria-expanded", "false");
      const target = new URL(link.href);
      if (target.pathname !== location.pathname || !target.hash) return;
      const section = document.getElementById(target.hash.slice(1));
      for (let node = section?.parentElement; node; node = node.parentElement)
        if (node.tagName === "DETAILS") node.open = true;
      section?.focus({ preventScroll: true });
    });
    window.addEventListener("orbit:profile-change", mount);
    window.addEventListener("storage", () => {
      const active = A.current();
      if (!active) {
        location.replace("../login/login.html");
        return;
      }
      if (active.email !== u.email || active.role !== u.role) {
        const home =
          active.role === "teacher"
            ? "teacher-dashboard"
            : active.role === "school"
              ? "school-dashboard"
              : "student-dashboard";
        location.replace("../" + home + "/" + home + ".html");
        return;
      }
      mount();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.classList.contains("orbit-menu-open")) {
        document.body.classList.remove("orbit-menu-open");
        document.getElementById("orbit-mobile-toggle")?.setAttribute("aria-expanded", "false");
        document.getElementById("orbit-page").inert = false;
        document.getElementById("orbit-mobile-toggle")?.focus();
      }
      if (e.key === "Tab" && document.body.classList.contains("orbit-menu-open")) {
        const focusable = [...document.querySelectorAll("#orbit-rail a,#orbit-rail button")].filter(
          (el) => !el.disabled,
        );
        if (e.shiftKey && document.activeElement === focusable[0]) {
          e.preventDefault();
          focusable.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === focusable.at(-1)) {
          e.preventDefault();
          focusable[0]?.focus();
        }
      }
    });
  });
})();

/* Optional, explicitly initialized presentation content; no automatic data mutation. */
document.addEventListener("DOMContentLoaded", () => {
  if (!window.OrbitAuth?.current() || !window.ORBIT) return;
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "../shared/presentation.css";
  document.head.append(css);
  const script = document.createElement("script");
  script.src = "../shared/presentation.js";
  document.head.append(script);
});

/* Student-only organization layer. Other roles retain their existing interface. */
if (window.OrbitAuth?.current()?.role === "student") {
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "../shared/student-workspace.css";
  document.head.append(style);
  const script = document.createElement("script");
  script.src = "../shared/student-workspace.js";
  document.head.append(script);
}
