(() => {
  "use strict";
  const t = window.OrbitHomeLocale.t;
  const $ = (s) => document.querySelector(s),
    S = OrbitSubscriptions,
    reduced = matchMedia("(prefers-reduced-motion: reduce)");
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
  const routes = ["lesson-planner", "channels", "lab", "lessons", "exchange", "lessons"];
  document.querySelectorAll("#features .m-card").forEach((card, i) => {
    const title = card.querySelector("h3")?.textContent.trim() || t("Explore feature"),
      route = routes[i];
    if (!route) return;
    const anchor = document.createElement("a");
    anchor.className = card.className + " orbit-feature-link";
    anchor.href =
      i === 5
        ? "../lesson/lesson.html?topic=forces#ai-assistant"
        : "../" + route + "/" + route + ".html";
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
    journey = $(".u-cta .u-second"),
    features = $("#features"),
    focus = $("#focus"),
    panel = $("#panel");
  if (start)
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
  if (journey) journey.onclick = () => open(0);
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
    journey?.focus({ preventScroll: true });
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
  document.querySelectorAll("[data-service]").forEach((card) => {
    const key = card.dataset.service;
    if (!card.querySelector("a")) {
      const a = document.createElement("a");
      a.href = key.includes("school") ? "../pricing/pricing.html" : "../lessons/lessons.html";
      a.className = "m-link";
      a.textContent = t("Explore →");
      card.append(a);
    }
  });
})();
