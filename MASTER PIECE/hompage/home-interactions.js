(() => {
  "use strict";
  const t = window.OrbitHomeLocale.t;
  const $ = (s) => document.querySelector(s),
    S = OrbitSubscriptions,
    reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const themeToggle = $("#orbit-theme-toggle"),
    systemAppearance = matchMedia("(prefers-color-scheme: dark)");
  const themePreference = (() => {
    const valid = (value) => ["light", "dark", "auto"].includes(value),
      readLegacy = (key) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      read = (key, fallback) => {
        try {
          return OrbitAuth.get(key, fallback);
        } catch {
          return fallback;
        }
      },
      storedAppearance = read("orbit.settings.appearance", null),
      prefs = read("orbit.student.v1", {}),
      appearance = valid(storedAppearance)
        ? storedAppearance
        : valid(prefs.theme)
          ? prefs.theme
          : readLegacy("orbitTheme") || readLegacy("theme") || "light";
    let selected = valid(appearance) ? appearance : "light";

    function resolve() {
      return selected === "auto" ? (systemAppearance.matches ? "dark" : "light") : selected;
    }
    function saveResolved(mode) {
      try {
        const current = OrbitAuth.get("orbit.student.v1", {}),
          legacy = OrbitAuth.get("orbit.preferences", {});
        OrbitAuth.set("orbit.student.v1", { ...current, theme: mode });
        OrbitAuth.set("orbit.preferences", { ...legacy, theme: mode });
        localStorage.setItem("orbitTheme", mode);
      } catch {
        // Keep the active page usable when browser storage is unavailable.
      }
    }
    function apply() {
      const mode = resolve();
      document.body.dataset.theme = mode;
      document.documentElement.dataset.theme = mode;
      document.documentElement.dataset.orbitAppearance = selected;
      if (selected === "auto") saveResolved(mode);
      return mode;
    }
    function choose(mode) {
      selected = mode;
      try {
        const current = OrbitAuth.get("orbit.student.v1", {}),
          legacy = OrbitAuth.get("orbit.preferences", {});
        OrbitAuth.set("orbit.settings.appearance", mode);
        OrbitAuth.set("orbit.student.v1", { ...current, theme: mode });
        OrbitAuth.set("orbit.preferences", { ...legacy, theme: mode });
        localStorage.setItem("orbitTheme", mode);
      } catch {
        // The visual change still applies if browser storage is unavailable.
      }
      return apply();
    }
    const onSystemChange = () => {
      if (selected === "auto") apply();
    };
    if (systemAppearance.addEventListener)
      systemAppearance.addEventListener("change", onSystemChange);
    else systemAppearance.addListener(onSystemChange);
    addEventListener(
      "pagehide",
      () => {
        if (systemAppearance.removeEventListener)
          systemAppearance.removeEventListener("change", onSystemChange);
        else systemAppearance.removeListener(onSystemChange);
      },
      { once: true },
    );
    return { apply, choose, resolve, get appearance() { return selected; } };
  })();
  function renderThemeToggle() {
    if (!themeToggle) return;
    const dark = themePreference.apply() === "dark",
      label = t(dark ? "Switch to light mode" : "Switch to dark mode");
    themeToggle.setAttribute("aria-pressed", String(dark));
    themeToggle.setAttribute("aria-label", label);
    themeToggle.title = label;
    themeToggle.querySelector("svg").innerHTML = dark
      ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2m12-12-2 2"/>'
      : '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>';
  }
  renderThemeToggle();
  themeToggle?.addEventListener("click", () => {
    themePreference.choose(themePreference.resolve() === "dark" ? "light" : "dark");
    renderThemeToggle();
  });
  const signup = $(".m-nav__cta");
  if (signup) {
    signup.href = "../registration/registration.html";
    signup.textContent = t("Sign Up");
  }
  const navigation = $(".m-nav__links") || document.querySelector(".m-nav nav");
  if (navigation && !navigation.querySelector('[href*="pricing"]'))
    navigation.insertAdjacentHTML("beforeend", '<a href="../pricing/pricing.html">Plans</a>');
  const burger = $("#navBurger");
  if (burger && !$("#navPanel")) {
    const panel = document.createElement("nav");
    panel.id = "navPanel";
    panel.className = "orbit-home-mobile";
    panel.hidden = true;
    panel.setAttribute("aria-label", t("Mobile navigation"));
    panel.innerHTML =
      '<a href="#features">Features</a><a href="#services">Services</a><a href="../pricing/pricing.html">Plans</a><a href="../registration/registration.html">Sign up</a><a href="../login/login.html">Log in</a>';
    burger.closest("header").append(panel);
    burger.addEventListener(
      "click",
      (event) => {
        event.stopImmediatePropagation();
        const open = burger.getAttribute("aria-expanded") !== "true";
        burger.setAttribute("aria-expanded", String(open));
        panel.hidden = !open;
        burger.closest("header").classList.toggle("is-open", open);
      },
      true,
    );
    panel.addEventListener("click", () => {
      panel.hidden = true;
      burger.setAttribute("aria-expanded", "false");
      burger.closest("header").classList.remove("is-open");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) {
        panel.hidden = true;
        burger.setAttribute("aria-expanded", "false");
        burger.closest("header").classList.remove("is-open");
        burger.focus();
      }
    });
  }
  document.querySelectorAll("#features .m-card").forEach((card) => {
    const title = card.querySelector("h3")?.textContent.trim() || t("Explore feature"),
      destination = card.dataset.featureHref;
    if (!destination) return;
    const anchor = document.createElement("a");
    anchor.className = card.className + " orbit-feature-link";
    anchor.href = destination;
    anchor.setAttribute("aria-label", title);
    anchor.innerHTML = card.innerHTML;
    anchor.querySelectorAll("a").forEach((link) => {
      const span = document.createElement("span");
      span.className = link.className;
      span.innerHTML = link.innerHTML;
      link.replaceWith(span);
    });
    card.replaceWith(anchor);
  });
  const start = $(".u-cta .u-primary"),
    features = $("#features"),
    focus = $("#focus"),
    panel = $("#panel");
  if (start?.tagName === "BUTTON")
    start.onclick = () => {
      features?.scrollIntoView({
        behavior: reduced.matches ? "instant" : "smooth",
        block: "start",
      });
      const heading = features?.querySelector("h2");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    };
  let stage = 0;
  const stages = [
    [t("WHY?"), t("Find the question that makes you curious.")],
    [t("WHAT IF?"), t("Explore a new possibility through an experiment.")],
    [t("HOW?"), t("Connect the explanation with a lesson and a plan.")],
    [t("DID IT WORK?"), t("Practice and review your progress.")],
    ["WHAT’S NEXT?", t("Choose your role and continue your learning orbit.")],
  ];
  function open(i) {
    stage = i;
    focus?.setAttribute("aria-hidden", "false");
    if (window.OrbitJourney) OrbitJourney.open(i);
    else {
      focus?.classList.add("on");
      panel?.classList.add("hide");
      $("#back")?.classList.add("on");
      $("#q-title").textContent = stages[i][0];
      $("#q-text").textContent = stages[i][1];
      $("#q-step").textContent = `Stage ${i + 1} of 5`;
      $("#q-row")?.classList.remove("gone");
      $("#q-roles")?.classList.remove("on");
    }
    $("#q-title").tabIndex = -1;
    $("#q-title").focus({ preventScroll: true });
    controls
      .querySelectorAll("button")
      .forEach((b, n) => b.setAttribute("aria-current", n === i ? "step" : "false"));
  }
  const controls = document.createElement("nav");
  controls.className = "orbit-journey-stages";
  controls.setAttribute("aria-label", t("Journey stages"));
  stages.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = i + 1 + " · " + s[0];
    b.onclick = () => open(i);
    controls.append(b);
  });
  focus?.querySelector(".u-qbig")?.append(controls);
  $("#q-next")?.addEventListener(
    "click",
    (e) => {
      e.stopImmediatePropagation();
      open(((window.OrbitJourney?.current?.() ?? stage) + 1) % 5);
    },
    true,
  );
  $("#q-enter")?.addEventListener("click", () => {
    $("#q-row")?.classList.add("gone");
    $("#q-roles")?.classList.add("on");
    $("#q-roles .u-role")?.focus();
  });
  function close() {
    if (window.OrbitJourney) OrbitJourney.close();
    else {
      focus?.classList.remove("on");
      panel?.classList.remove("hide");
      $("#back")?.classList.remove("on");
    }
    focus?.setAttribute("aria-hidden", "true");
    start?.focus({ preventScroll: true });
  }
  $("#back")?.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && focus?.classList.contains("on")) close();
  });
  document.querySelectorAll(".u-role").forEach((b, i) =>
    b.addEventListener("click", () => {
      const role = ["student", "teacher", "school"][i],
        user = OrbitAuth.current();
      if (user?.role === role) {
        const dest =
          role === "student"
            ? "lessons"
            : role === "teacher"
              ? "teacher-dashboard"
              : "school-dashboard";
        location.href = "../" + dest + "/" + dest + ".html";
      } else location.href = "../registration/registration.html?role=" + role;
    }),
  );
})();
