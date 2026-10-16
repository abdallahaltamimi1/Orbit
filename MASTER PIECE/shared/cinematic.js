/* Finite visual arrival only: no data access, frame loop or mutation observer. */
(() => {
  "use strict";
  const selectedRole = document.getElementById("account-role");
  const role = selectedRole?.value || window.OrbitAuth?.current()?.role;
  selectedRole?.addEventListener("change", () => {
    document.body.dataset.orbitRole = selectedRole.value;
  });
  document.body.dataset.orbitRole = ["student", "teacher", "school"].includes(role)
    ? role
    : "public";
  const root = document.querySelector("#orbit-page[data-orbit-page]");
  if (!root || root.dataset.orbitPage === "hompage") return;
  // Login's interactive leaf replaces the former introductory photo zoom.
  if (["login", "school-login"].includes(root.dataset.orbitPage)) return;
  const regions = {
    login: ".login-visual",
    "school-login": ".login-visual",
    channels: ".directory-banner",
    "student-dashboard": ".welcome",
    "teacher-dashboard": ".studio-banner",
    "school-dashboard": ".hero",
    "teacher-profile": ".professional-intro",
    "teacher-directory": ".directory-intro",
    result: ".hero",
    about: ".about-hero",
  };
  const region = root.querySelector(regions[root.dataset.orbitPage] || "[data-no-arrival]");
  if (
    !region ||
    matchMedia("(prefers-reduced-motion:reduce)").matches ||
    document.body.dataset.mood === "calm"
  )
    return;
  region.classList.add("orbit-scene-entry");
  region.addEventListener("animationend", (event) => {
    if (event.target === region) region.classList.remove("orbit-scene-entry");
  });
})();

/* Reference-inspired enhancement. Decorative surfaces only; no stored state. */
(() => {
  "use strict";
  const root = document.querySelector("#orbit-page[data-orbit-page]");
  if (!root || root.dataset.orbitPage === "hompage") return;
  const page = root.dataset.orbitPage;
  if (
    ![
      "login",
      "school-login",
      "student-dashboard",
      "teacher-dashboard",
      "school-dashboard",
      "account-profile",
      "settings",
    ].includes(page)
  )
    return;
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  const fine = matchMedia("(hover:hover) and (pointer:fine)");
  const quiet = () => reduced.matches || document.body.dataset.mood === "calm";
  const activeAnimations = new Set();
  let pointerIntent = false,
    intentTime = 0,
    disposed = false,
    bounds = null,
    feedbackTimer = 0;
  const visual = ["login", "school-login"].includes(page)
    ? root.querySelector(".login-visual")
    : null;
  let layer = null;
  if (visual) {
    layer = document.createElement("span");
    layer.className = "orbit-observatory-depth";
    layer.setAttribute("aria-hidden", "true");
    visual.prepend(layer);
  }
  const resetDepth = () => {
    if (layer) layer.style.transform = "";
    bounds = null;
  };
  function move(event) {
    if (!layer || quiet() || !fine.matches || document.hidden || event.pointerType !== "mouse")
      return;
    if (!bounds) bounds = visual.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));
    layer.style.transform = `translate3d(${x * 8}px,${y * 6}px,0) scale(1.04)`;
  }
  function pulse(element, earned = false) {
    if (
      !element ||
      quiet() ||
      !pointerIntent ||
      performance.now() - intentTime > 5000 ||
      document.hidden
    )
      return;
    const old = element.getAnimations().find((a) => activeAnimations.has(a));
    const opacity = old ? getComputedStyle(element).opacity : ".72";
    old?.cancel();
    const frames = earned
      ? [
          { transform: "scale(.97)", opacity: 0.8 },
          { transform: "scale(1.06)", opacity: 1, offset: 0.6 },
          { transform: "scale(1)", opacity: 1 },
        ]
      : [{ opacity }, { opacity: 1 }];
    const animation = element.animate(frames, {
      duration: earned ? 240 : 160,
      easing:
        getComputedStyle(root).getPropertyValue("--ease-out").trim() || "cubic-bezier(.23,1,.32,1)",
    });
    activeAnimations.add(animation);
    animation.finished.catch(() => {}).finally(() => activeAnimations.delete(animation));
  }
  function intent(event) {
    pointerIntent = event.detail > 0;
    intentTime = performance.now();
    if (
      page === "student-dashboard" &&
      pointerIntent &&
      event.target.closest(".milestone.unlocked")
    ) {
      clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => {
        feedbackTimer = 0;
        pulse(root.querySelector("#milestone-dialog[open] .detail-symbol"), true);
      }, 0);
    }
  }
  function keyboard() {
    pointerIntent = false;
    resetDepth();
  }
  const previous = new WeakMap();
  const statusSelectors = {
    settings: "#status",
    "account-profile": "#profile-status",
    "school-dashboard": "#recruit-errors",
    "teacher-dashboard": ".form-error",
  };
  const selector = statusSelectors[page];
  function messages() {
    if (!selector) return;
    root.querySelectorAll(selector).forEach((element) => {
      const text = element.textContent.trim(),
        prior = previous.get(element);
      previous.set(element, text);
      if (text && text !== prior) pulse(element);
    });
  }
  const observer = selector ? new MutationObserver(messages) : null;
  const moodObserver = new MutationObserver(preference);
  function preference() {
    if (quiet() || !fine.matches) {
      resetDepth();
      activeAnimations.forEach((a) => a.cancel());
      activeAnimations.clear();
    }
  }
  function visibility() {
    if (document.hidden) {
      resetDepth();
      activeAnimations.forEach((a) => a.cancel());
      activeAnimations.clear();
    }
  }
  function connect() {
    if (disposed) return;
    visual?.addEventListener("pointermove", move, { passive: true });
    visual?.addEventListener("pointerleave", resetDepth);
    window.addEventListener("resize", resetDepth, { passive: true });
    document.addEventListener("click", intent, true);
    document.addEventListener("keydown", keyboard, true);
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", preference);
    fine.addEventListener("change", preference);
    moodObserver.observe(document.body, { attributes: true, attributeFilter: ["data-mood"] });
    messages();
    observer?.observe(root, { subtree: true, childList: true, characterData: true });
  }
  function disconnect() {
    visual?.removeEventListener("pointermove", move);
    visual?.removeEventListener("pointerleave", resetDepth);
    window.removeEventListener("resize", resetDepth);
    document.removeEventListener("click", intent, true);
    document.removeEventListener("keydown", keyboard, true);
    document.removeEventListener("visibilitychange", visibility);
    reduced.removeEventListener("change", preference);
    fine.removeEventListener("change", preference);
    clearTimeout(feedbackTimer);
    feedbackTimer = 0;
    observer?.disconnect();
    moodObserver.disconnect();
    activeAnimations.forEach((a) => a.cancel());
    activeAnimations.clear();
    resetDepth();
    pointerIntent = false;
  }
  function hide(event) {
    disconnect();
    if (!event.persisted) {
      disposed = true;
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
    }
  }
  function show(event) {
    if (event.persisted && !disposed) connect();
  }
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", show);
  connect();
})();
