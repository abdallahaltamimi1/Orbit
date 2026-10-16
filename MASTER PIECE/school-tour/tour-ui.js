(() => {
  "use strict";
  const user = window.OrbitAuth?.current();
  if (!user?.email || user.role !== "student") return;
  const locations = window.OrbitTourData,
    root = document.body,
    host = document.getElementById("tour-scene");
  const $ = (id) => document.getElementById(id),
    t = (en, ar) => (document.documentElement.lang === "ar" ? ar : en);
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  const initialPrefs = OrbitAuth.get("orbit.student.v1", {});
  root.dataset.theme = initialPrefs.theme || "light";
  let api = null,
    current = 0,
    previous = null,
    paused = false,
    manualSimple = new URLSearchParams(location.search).get("view") === "simple";
  let pendingLab = false,
    labOpen = false;
  let disposed = false,
    suspended = false,
    stepHeight = Math.max(innerHeight, 400),
    navigationScroll = null;
  const abort = new AbortController(),
    signal = abort.signal;
  const icon = (path) =>
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg>';
  const names = () => locations.map((item) => t(...item.name));
  const systemQuiet = () =>
    reduced.matches ||
    document.body.dataset.mood === "calm" ||
    localStorage.getItem("orbit.motion.preference") === "calm";
  const quiet = () => manualSimple || systemQuiet() || root.dataset.tourState === "fallback";
  const initial = locations.findIndex((item) => item.id === location.hash.slice(1));
  if (initial >= 0) current = initial;
  function labels() {
    document.title = t("ORBIT | School Tour", "ORBIT | جولة المدرسة");
    $("tour-title").textContent = t("School Tour", "جولة المدرسة");
    document.querySelector(".tour-skip").textContent = t("Choose a location", "اختيار المواقع");
    document
      .querySelector(".tour-brand")
      .setAttribute("aria-label", t("Return to student dashboard", "العودة للوحة الطالب"));
    $("tour-exit").querySelector("span").textContent = t("Back to dashboard", "العودة للوحة");
    $("tour-navigator").setAttribute("aria-label", t("School locations", "مواقع المدرسة"));
    $("tour-overview").innerHTML =
      icon("M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z") +
      "<span>" +
      t("Overview", "نظرة عامة") +
      "</span>";
    $("tour-previous").innerHTML =
      icon("M20 12H4m6-6-6 6 6 6") + "<span>" + t("Previous place", "المكان السابق") + "</span>";
    $("tour-simple").innerHTML =
      icon("M4 12h16M12 4v16") + "<span>" + t("Simple views", "نمط هادئ") + "</span>";
    $("loading-title").textContent = t("Preparing your tour", "نجهّز جولتك");
    $("loading-description").textContent = t(
      "Loading the scene. You can choose a destination or return to your dashboard at any time.",
      "جاري تحميل المشهد. تقدر تختار وجهة أو ترجع للوحة بأي وقت.",
    );
    $("tour-loading").setAttribute("aria-label", t("Loading the tour", "تحميل الجولة"));
    $("tour-loading-progress").setAttribute("aria-label", t("Scene loading", "تحميل المشهد"));
    $("fallback-title").textContent = t("Explore by location", "استكشف حسب المكان");
    $("fallback-description").textContent = t(
      "The interactive scene is unavailable. This campus navigator keeps every learning destination within reach.",
      "المشهد التفاعلي غير متاح. دليل الحرم يخلّي كل الوجهات التعليمية قريبة منك.",
    );
    $("fallback-preview").alt = t("The illustrative ORBIT school campus", "حرم المدرسة التوضيحي");
    $("fallback-plan").setAttribute(
      "aria-label",
      t("Diagram of the illustrative campus", "مخطط الحرم التوضيحي"),
    );
    $("tour-empty").textContent = t(
      "No activity is linked to this space yet.",
      "ما في نشاط مرتبط بهذا المكان حاليًا.",
    );
  }
  labels();
  const navigator = $("tour-navigator"),
    hotspots = $("tour-hotspots");
  locations.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tour-destination";
    button.dataset.tourDestination = item.id;
    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");
    const label = document.createElement("span");
    label.textContent = t(...item.name);
    button.append(number, label);
    button.addEventListener("click", (event) => navigate(index, event.detail === 0), { signal });
    navigator.append(button);
    if (index > 0 && index < locations.length - 1) {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "tour-hotspot";
      marker.dataset.tourHotspot = item.id;
      marker.textContent = t(...item.name);
      marker.tabIndex = -1;
      marker.hidden = true;
      marker.addEventListener("click", () => navigate(index), { signal });
      hotspots.append(marker);
    }
  });
  function update(index) {
    current = index;
    const item = locations[index];
    $("location-title").textContent = t(...item.name);
    $("location-description").textContent = t(...item.description);
    $("tour-counter").textContent = String(index + 1).padStart(2, "0") + " / " + locations.length;
    $("tour-content-link").hidden = !item.link;
    if (item.link) {
      $("tour-content-link").href = item.link;
      $("tour-content-link").textContent = t(...item.action);
    }
    $("tour-empty").hidden = !item.empty;
    navigator.querySelectorAll("button").forEach((button, i) => {
      if (i === index) {
        button.setAttribute("aria-current", "location");
        button.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      } else button.removeAttribute("aria-current");
    });
    $("tour-previous").disabled = previous === null || previous === current;
    history.replaceState(null, "", location.pathname + location.search + "#" + item.id);
  }
  function routeSize() {
    stepHeight = Math.max(innerHeight, 400);
    $("tour-route").style.height = stepHeight * (locations.length - 1) + innerHeight + "px";
  }
  function scroll() {
    if (labOpen) return;
    if (disposed || suspended || quiet() || paused) return;
    if (navigationScroll !== null) {
      const own = Math.abs(scrollY - navigationScroll) < 3;
      navigationScroll = null;
      if (own) return;
    }
    const progress = Math.max(0, Math.min(locations.length - 1, scrollY / stepHeight));
    api?.setProgress(progress);
  }
  function navigate(index, instant = false) {
    if (index < 0 || index >= locations.length || disposed) return;
    pendingLab = locations[index].id === "science-lab";
    previous = current === index ? previous : current;
    update(index);
    const moving =
      api && !quiet() && !paused && !instant && Math.abs(index - api.inspect().progress) > 0.01;
    $("tour-feedback").textContent = moving
      ? t("Moving to ", "ننتقل إلى ") + t(...locations[index].name) + "…"
      : "";
    if (!quiet()) {
      navigationScroll = index * stepHeight;
      window.scrollTo({ top: navigationScroll, behavior: "instant" });
    }
    api?.setProgress(index, { instant: instant || quiet() || paused, navigation: true });
    if (pendingLab && (!api || quiet() || paused || instant)) enterLab();
  }
  function mode() {
    if (disposed) return;
    const simple = quiet();
    root.dataset.tourMotion = simple ? "simple" : "cinematic";
    $("tour-simple").setAttribute("aria-pressed", String(simple));
    $("tour-simple").disabled = systemQuiet() || root.dataset.tourState === "fallback";
    $("tour-simple").title = systemQuiet()
      ? t(
          "Your saved or device preference requests reduced motion.",
          "تفضيل جهازك أو إعداداتك يطلب تقليل الحركة.",
        )
      : "";
    $("tour-pause").disabled = simple;
    $("tour-pause").setAttribute("aria-pressed", String(paused));
    $("tour-pause").innerHTML =
      icon(paused ? "M8 4l12 8-12 8Z" : "M8 4v16M16 4v16") +
      "<span>" +
      t(paused ? "Resume" : "Pause", paused ? "متابعة" : "إيقاف") +
      "</span>";
    $("tour-hint").textContent = simple
      ? t("Choose a place to explore", "اختَر مكانًا للاستكشاف")
      : paused
        ? t("Camera paused", "الكاميرا متوقفة")
        : t("Scroll to explore · or choose a place", "مرّر للاستكشاف، أو اختَر مكانًا");
    api?.setSimple(simple);
    api?.setPaused(paused || labOpen);
  }
  function fallback(reason, collisions = []) {
    if (disposed) return;
    root.dataset.tourState = "fallback";
    root.dataset.tourFailure = reason;
    if (collisions.length) root.dataset.tourPathErrors = JSON.stringify(collisions.slice(0, 10));
    $("tour-loading").hidden = true;
    $("tour-fallback").hidden = false;
    $("fallback-preview").src = "./assets/campus-preview.png";
    $("fallback-preview").onload = () => {
      $("fallback-plan").hidden = true;
    };
    $("fallback-preview").onerror = () => {
      $("fallback-preview").hidden = true;
      $("fallback-plan").hidden = false;
    };
    $("tour-feedback").textContent = t(
      "You can still choose any place and open its available learning content.",
      "تقدر تختار أي مكان وتفتح محتواه التعليمي المتاح.",
    );
    api = null;
    mode();
  }
  function enterLab() {
    if (!window.OrbitPhysicsLab || labOpen) return;
    pendingLab = false;
    labOpen = true;
    api?.setPaused(true);
    window.OrbitPhysicsLab.open({
      onExit() {
        labOpen = false;
        api?.setPaused(paused);
        $("tour-content-link").focus({ preventScroll: true });
      },
    });
  }
  $("tour-content-link").addEventListener(
    "click",
    (event) => {
      if (locations[current].id === "science-lab") {
        event.preventDefault();
        enterLab();
      }
    },
    { signal },
  );
  $("tour-overview").addEventListener("click", (event) => navigate(0, event.detail === 0), {
    signal,
  });
  $("tour-previous").addEventListener(
    "click",
    (event) => {
      if (previous !== null) navigate(previous, event.detail === 0);
    },
    { signal },
  );
  $("tour-pause").addEventListener(
    "click",
    () => {
      paused = !paused;
      mode();
      if (!paused && !quiet()) {
        navigationScroll = null;
        api?.setProgress(Math.min(locations.length - 1, scrollY / stepHeight), {
          navigation: true,
        });
      }
    },
    { signal },
  );
  $("tour-simple").addEventListener(
    "click",
    () => {
      manualSimple = !manualSimple;
      const params = new URLSearchParams(location.search);
      if (manualSimple) params.set("view", "simple");
      else params.delete("view");
      history.replaceState(
        null,
        "",
        location.pathname + (params.size ? "?" + params : "") + location.hash,
      );
      mode();
      routeSize();
      if (!quiet()) navigate(current, true);
    },
    { signal },
  );
  function preference() {
    mode();
    if (quiet()) api?.setProgress(current, { instant: true });
  }
  reduced.addEventListener("change", preference);
  const moodObserver = new MutationObserver(preference);
  moodObserver.observe(root, { attributes: true, attributeFilter: ["data-mood"] });
  window.addEventListener("scroll", scroll, { passive: true, signal });
  window.addEventListener(
    "resize",
    () => {
      routeSize();
      if (!quiet()) {
        navigationScroll = current * stepHeight;
        window.scrollTo({ top: navigationScroll, behavior: "instant" });
        api?.setProgress(current, { instant: true });
      }
    },
    { passive: true, signal },
  );
  window.addEventListener(
    "storage",
    (event) => {
      if (event.key === "orbit.student.v1") {
        const prefs = OrbitAuth.get("orbit.student.v1", {});
        if (prefs.lang && prefs.lang !== document.documentElement.lang) {
          location.reload();
          return;
        }
        root.dataset.theme = prefs.theme || "light";
      }
      if (["orbit.student.v1", "orbit.motion.preference"].includes(event.key)) preference();
    },
    { signal },
  );
  function hide(event) {
    suspended = true;
    moodObserver.disconnect();
    if (!event.persisted) {
      disposed = true;
      abort.abort();
      reduced.removeEventListener("change", preference);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
    }
  }
  function show(event) {
    if (event.persisted && !disposed) {
      suspended = false;
      moodObserver.observe(root, { attributes: true, attributeFilter: ["data-mood"] });
      preference();
    }
  }
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", show);
  routeSize();
  update(current);
  mode();
  // Only an admitted student on this dedicated page requests the heavy scene.
  const script = document.createElement("script");
  script.src = "./tour-scene.bundle.js";
  script.async = true;
  script.onerror = () => fallback("SCENE_LOAD_FAILED");
  script.onload = () => {
    if (disposed) return;
    $("tour-loading-progress").value = 1;
    api = window.OrbitSchoolTour?.create(host, {
      locations,
      initialProgress: current,
      onLocation(index) {
        update(index);
        $("tour-feedback").textContent = "";
        if (pendingLab && locations[index].id === "science-lab") enterLab();
      },
      onReady(scene) {
        api = scene;
        $("tour-loading-progress").value = 3;
        root.dataset.tourState = "ready";
        $("tour-loading").hidden = true;
        mode();
        navigate(current, true);
      },
      onError: fallback,
    });
    if (api) $("tour-loading-progress").value = 2;
    else if (root.dataset.tourState !== "fallback") fallback("SCENE_INIT_FAILED");
  };
  document.head.append(script);
})();
