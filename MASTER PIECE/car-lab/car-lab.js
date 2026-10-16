"use strict";
// Signed 1D point-mass motion along the road. Positive position is uphill/right.
const GRAVITY = 9.81;
function labForces(config, velocity) {
  const theta = (config.angle * Math.PI) / 180,
    normal = config.mass * GRAVITY * Math.cos(theta),
    gravity = -config.mass * GRAVITY * Math.sin(theta),
    external = config.force + gravity,
    limit = config.friction * normal;
  let friction;
  if (Math.abs(velocity) < 1e-9) {
    friction = Math.abs(external) <= limit ? -external : -Math.sign(external) * limit;
  } else friction = -Math.sign(velocity) * limit;
  return {
    normal,
    gravity,
    friction,
    net: external + friction,
    acceleration: (external + friction) / config.mass,
  };
}
function labStep(snapshot, config, dt) {
  const f = labForces(config, snapshot.v);
  let v = snapshot.v + f.acceleration * dt,
    x = snapshot.x + snapshot.v * dt + 0.5 * f.acceleration * dt * dt;
  if (snapshot.v * v < 0) {
    const stop = -snapshot.v / f.acceleration,
      remaining = dt - stop,
      after = labForces(config, 0);
    x =
      snapshot.x +
      snapshot.v * stop +
      0.5 * f.acceleration * stop * stop +
      0.5 * after.acceleration * remaining * remaining;
    v = after.acceleration * remaining;
  }
  return { x, v: Math.abs(v) < 1e-9 ? 0 : v, time: snapshot.time + dt };
}
globalThis.ORBITPhysics = { forces: labForces, step: labStep };
if (typeof document !== "undefined") initLab();
function initLab() {
  const storage = {
      get(k) {
        try {
          return localStorage.getItem(k);
        } catch {
          return null;
        }
      },
      set(k, v) {
        try {
          localStorage.setItem(k, v);
        } catch {}
      },
    },
    parse = (k) => {
      try {
        return JSON.parse(storage.get(k));
      } catch {
        return null;
      }
    };
  let profile = Object.assign(
    {
      lang: storage.get("orbitLanguage") || "ar",
      theme: storage.get("orbitTheme") || "light",
      mood: storage.get("orbitMood") || "fun",
      xp: 1280,
      done: [],
    },
    parse("orbit.student.v1") || {},
  );
  profile.done = Array.isArray(profile.done) ? profile.done : [];
  let config = Object.assign(
    { mass: 1200, speed: 0, friction: 0.03, angle: 0, force: 2400 },
    parse("orbit.lab.settings") || {},
  );
  const bounds = {
    mass: [500, 2500],
    speed: [0, 30],
    friction: [0, 0.3],
    angle: [-15, 15],
    force: [-10000, 10000],
  };
  for (const key of Object.keys(bounds)) {
    if (!Number.isFinite(+config[key])) config[key] = bounds[key][0];
    config[key] = Math.max(bounds[key][0], Math.min(bounds[key][1], +config[key]));
  }
  let trials = parse("orbit.lab.trials") || [];
  if (!Array.isArray(trials)) trials = [];
  trials = trials.slice(-6);
  let sim = { x: 0, v: config.speed, time: 0 },
    running = false,
    samples = [{ time: 0, v: config.speed }],
    last = 0,
    accumulator = 0,
    lastDisplay = 0,
    lastSample = 0,
    changes = 0,
    startedConfig = { ...config },
    unit = "ms",
    viewVectors = true,
    completed = false;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    t = (en, ar) => (profile.lang === "ar" ? ar : en),
    esc = (s) =>
      String(s).replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
      ),
    $ = (id) => document.getElementById(id),
    url = (name, q = "") => `../${name}/${name}.html${q}`;
  const icon = (name) => {
    const paths = {
      orbit:
        '<ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="3"/>',
      play: '<path d="m8 4 12 8-12 8Z"/>',
      pause: '<path d="M8 4v16M16 4v16"/>',
      reset: '<path d="M4 8a9 9 0 1 1 0 8M4 3v6h6"/>',
      arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
      save: '<path d="M4 3h14l3 3v15H3V3ZM7 3v6h10V3M7 21v-8h10v8"/>',
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
      moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
    };
    return `<svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.orbit}</svg>`;
  };
  function notify(message) {
    $("lab-toast").textContent = message;
    $("lab-toast").classList.add("show");
    clearTimeout(window.labToastTimer);
    window.labToastTimer = setTimeout(() => $("lab-toast").classList.remove("show"), 2600);
  }
  function persistProfile() {
    storage.set("orbit.student.v1", JSON.stringify(profile));
    storage.set("orbitLanguage", profile.lang);
    storage.set("orbitTheme", profile.theme);
    storage.set("orbitMood", profile.mood);
  }
  function control(key, title, symbol, units, step, help) {
    return `<label class="variable" for="${key}"><span class="variable-heading"><span><b>${title}</b><small>${help}</small></span><output id="${key}-output" for="${key}" dir="ltr">${config[key]} ${units}</output></span><input id="${key}" data-variable="${key}" type="range" min="${bounds[key][0]}" max="${bounds[key][1]}" value="${config[key]}" step="${step}"><span class="range-ends" dir="ltr"><span>${bounds[key][0]} ${units}</span><span class="variable-symbol">${symbol}</span><span>${bounds[key][1]} ${units}</span></span></label>`;
  }
  function render() {
    document.documentElement.lang = profile.lang;
    document.documentElement.dir = profile.lang === "ar" ? "rtl" : "ltr";
    document.body.dataset.theme = profile.theme;
    document.body.dataset.mood = profile.mood;
    document.title = t("ORBIT · Car Motion Dynamics Lab", "ORBIT · مختبر ديناميكا حركة السيارة");
    $("lab-app").innerHTML =
      `<header class="lab-header"><a class="brand" href="${url("student-dashboard")}"><span>${icon("orbit")}</span><b>ORBIT<small>${t("EXPERIMENT STUDIO", "استوديو التجارب")}</small></b></a><nav><a href="${url("student-dashboard")}">${t("My orbit", "مداري")}</a><span>/</span><b>${t("Physics lab", "مختبر الفيزياء")}</b></nav><div class="preferences"><button data-action="language" aria-label="${t("Switch to Arabic", "التبديل للإنجليزية")}">${profile.lang === "ar" ? "EN" : "عربي"}</button><button data-action="theme" aria-label="${t("Toggle theme", "تبديل المظهر")}">${icon(profile.theme === "dark" ? "sun" : "moon")}</button><button data-action="mood" aria-label="${t("Toggle decorative motion", "تبديل الحركة الزخرفية")}">${profile.mood === "calm" ? t("Calm", "هادئ") : t("Orbit", "مدار")}</button></div></header><main><a class="button subtle lab-back" href="../lab/lab.html" style="display:inline-flex;border-radius:24px;margin-block:20px 0">← ${t("All experiments", "كل التجارب")}</a><section class="intro"><div><span class="eyebrow">${t("LAB 01 / FORCES & MOTION", "مختبر 01 / القوى والحركة")}</span><h1>${t("Put physics in motion.", "خلّي الفيزياء تتحرك.")}</h1><p>${t("Change one variable. Watch the world respond.", "غيّر متغيرًا، وشوف العالم يستجيب.")}</p></div><a class="next-link" href="${url("quiz")}">${t("Test your understanding", "اختبر فهمك")}${icon("arrow")}</a></section><div class="experiment-layout"><section class="experiment"><header class="experiment-header"><span><i class="status-dot"></i> ${t("CAR DYNAMICS / LIVE EXPERIMENT", "ديناميكا حركة السيارة / تجربة تفاعلية")}</span><label class="vector-toggle"><input id="vectors-toggle" type="checkbox" ${viewVectors ? "checked" : ""}>${t("Force vectors", "متجهات القوى")}</label></header><div class="scene" id="scene" aria-label="${t("Realistic car on an adjustable inclined road", "سيارة واقعية على طريق قابل لتغيير الميل")}"><div class="sky-glow"></div><div class="cloud cloud-one"></div><div class="cloud cloud-two"></div><div class="hills distant"></div><div class="hills near"></div><div class="scene-grid"></div><div class="coordinate-label">${t("POSITIVE DIRECTION", "الاتجاه الموجب")} <span dir="ltr">+x →</span></div><div class="road-rig" id="road-rig"><div class="road-top"></div><div class="asphalt" id="asphalt"><div class="lane-markings" id="lane-markings"></div><div class="road-measure" id="road-measure"></div></div><div class="car" id="car"><div class="contact-shadow"></div><img id="car-image" src="./assets/realistic-car.png" alt="${t("Photorealistic silver car", "سيارة فضية واقعية")}" draggable="false"><div class="wheel-rotor rear" id="rear-wheel"></div><div class="wheel-rotor front" id="front-wheel"></div></div><svg class="force-overlay" id="force-overlay" viewBox="0 0 480 150" aria-hidden="true"><defs><marker id="head-drive" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#6e55d7"/></marker><marker id="head-resist" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#dc9957"/></marker><marker id="head-gravity" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#548faa"/></marker></defs><g id="drive-vector"><line y1="35" y2="35" x1="240" marker-end="url(#head-drive)"/><text y="22">F</text></g><g id="friction-vector"><line y1="75" y2="75" x1="240" marker-end="url(#head-resist)"/><text y="62">f</text></g><g id="gravity-vector"><line y1="115" y2="115" x1="240" marker-end="url(#head-gravity)"/><text y="102">mg sinθ</text></g></svg></div><div class="scene-readout"><span>${t("LIVE VELOCITY", "السرعة اللحظية")}</span><strong id="scene-speed" dir="ltr">0.0 <small>m/s</small></strong><small id="motion-label">${t("Ready to explore", "جاهز للاستكشاف")}</small></div><div class="scene-angle"><span>θ</span><b id="angle-readout" dir="ltr">0°</b><small>${t("road inclination", "ميل الطريق")}</small></div><div class="scene-bottom"><span>${t("Tracking view · 1 m = 4 px along the road", "عرض تتبع · كل متر = 4 بكسل على الطريق")}</span><span id="scene-time" dir="ltr">t = 0.00 s</span></div></div><div class="transport"><div class="transport-buttons"><button class="button primary" id="run-button" data-action="run">${icon(running ? "pause" : "play")}<span>${running ? t("Pause", "إيقاف مؤقت") : t("Run experiment", "شغّل التجربة")}</span></button><button class="icon-button" data-action="reset" aria-label="${t("Reset experiment", "إعادة التجربة")}">${icon("reset")}</button></div><div class="run-status" id="run-status" role="status">${t("Ready · 20-second experiment", "جاهز · تجربة لمدة 20 ثانية")}</div><button class="button subtle" id="save-trial" data-action="save">${icon("save")}${t("Save trial", "احفظ المحاولة")}</button></div><div class="telemetry">${[
        ["a-readout", t("Acceleration", "التسارع"), "m/s²"],
        ["net-readout", t("Net force", "القوة المحصلة"), "N"],
        ["distance-readout", t("Displacement", "الإزاحة"), "m"],
        ["energy-readout", t("Kinetic energy", "الطاقة الحركية"), "kJ"],
      ]
        .map(
          (r) =>
            `<div><small>${r[1]}</small><strong id="${r[0]}" dir="ltr">0 <span>${r[2]}</span></strong></div>`,
        )
        .join(
          "",
        )}</div><div class="plot-heading"><span>${t("Velocity over time", "السرعة مع الزمن")}</span><label>${t("Display unit", "وحدة العرض")}<select id="speed-unit"><option value="ms" ${unit === "ms" ? "selected" : ""}>m/s</option><option value="kmh" ${unit === "kmh" ? "selected" : ""}>km/h</option></select></label></div><canvas id="velocity-chart" role="img" aria-label="${t("Graph of signed velocity versus time, updated during the experiment", "رسم السرعة الموقعة مقابل الزمن، يتحدث أثناء التجربة")}"></canvas><div class="chart-legend"><span><i></i>${t("Current experiment", "التجربة الحالية")}</span><span>${t("Negative velocity = moving left along the road.", "سرعة سالبة = حركة لليسار على الطريق.")}</span></div></section><aside class="controls"><header><span class="eyebrow">${t("YOU ARE IN CONTROL", "التجربة بإيدك")}</span><h2>${t("Change the conditions.", "غيّر الظروف.")}</h2><p>${t("Force, friction, mass and slope update live. Initial speed applies after reset.", "القوة والاحتكاك والكتلة والميل تتغير مباشرة. السرعة الابتدائية تطبّق بعد إعادة التجربة.")}</p></header>${control("mass", t("Mass", "الكتلة"), "m", "kg", 50, t("Heavier or lighter?", "أثقل أم أخف؟"))}${control("speed", t("Initial velocity", "السرعة الابتدائية"), "v₀", "m/s", 1, t("Applied on reset", "تطبّق عند إعادة التجربة"))}${control("force", t("Applied force", "القوة المؤثرة"), "F", "N", 100, t("Negative = braking / leftward", "السالب = قوة لليسار / كبح"))}${control("friction", t("Effective friction", "الاحتكاك الفعال"), "μ", "", 0.01, t("Resistance opposing motion", "مقاومة تعاكس الحركة"))}${control("angle", t("Road inclination", "ميل الطريق"), "θ", "°", 1, t("Positive = uphill to the right", "الموجب = صعود نحو اليمين"))}<div class="preset-group"><span class="eyebrow">${t("TRY A STARTING POINT", "جرّب نقطة بداية")}</span>${[
        ["coast", t("Free coast", "حركة حرة")],
        ["brake", t("Friction stop", "توقف بالاحتكاك")],
        ["hill", t("Climb a hill", "صعود منحدر")],
      ]
        .map((r) => `<button data-preset="${r[0]}">${r[1]}</button>`)
        .join(
          "",
        )}</div><div class="control-note">${t("For a fair comparison, reset after changing a variable.", "للمقارنة العادلة، أعد التجربة بعد تغيير المتغير.")}</div></aside></div><section class="science-section"><div class="equation-block"><span class="eyebrow">${t("THE SCIENCE BEHIND THE MOTION", "العلم وراء الحركة")}</span><h2>${t("See the relationship.", "شوف العلاقة.")}</h2><div class="equation" dir="ltr">a = <span class="fraction"><b>F + F<sub>friction</sub> − mg sinθ</b><i>m</i></span></div><div id="live-equation" class="live-equation" dir="ltr"></div><div class="force-key"><span class="drive">● ${t("Applied force", "القوة المؤثرة")}</span><span class="resist">● ${t("Friction", "الاحتكاك")}</span><span class="gravity">● ${t("Gravity along slope", "الجاذبية على المنحدر")}</span></div></div><div class="investigation"><span class="eyebrow">${t("EXPLORE → EXPERIMENT → UNDERSTAND", "استكشف ← جرّب ← افهم")}</span><h2>${t("What if the mass doubles?", "ماذا لو تضاعفت الكتلة؟")}</h2><ol><li>${t("Set friction and slope to zero. Keep the force constant.", "اجعل الاحتكاك والميل صفرًا. ثبّت القوة.")}</li><li>${t("Run and save a trial. Double the mass, reset, then run again.", "شغّل واحفظ محاولة. ضاعف الكتلة، أعد التجربة ثم شغّلها مجددًا.")}</li><li>${t("Compare acceleration. Does it halve?", "قارن التسارع. هل ينخفض إلى النصف؟")}</li></ol><details><summary>${t("Model & assumptions", "النموذج والافتراضات")}</summary><p>${t("A one-dimensional point-mass model with g = 9.81 m/s², constant applied force and effective Coulomb resistance (same coefficient at rest and in motion). Positive x points right/uphill. No aerodynamic drag, drivetrain, suspension or collision model. Changing mass live holds velocity constant; reset for a controlled comparison. The scenic view tracks the car; displacement is measured along the road.", "نموذج جسم نقطي أحادي البعد، مع g = 9.81 م/ث² وقوة مؤثرة ثابتة ومقاومة كولوم فعالة بمعامل واحد للسكون والحركة. الاتجاه الموجب نحو اليمين والصعود. لا يشمل مقاومة الهواء أو المحرك أو التعليق أو التصادم. تغيير الكتلة مباشرة يحافظ على السرعة؛ أعد التجربة للمقارنة المضبوطة. المشهد يتتبع السيارة، والإزاحة تقاس على الطريق.")}</p></details></div></section><section class="trials-section"><header><div><span class="eyebrow">${t("BUILD YOUR EVIDENCE", "اجمع أدلتك")}</span><h2>${t("Your experiment notebook", "دفتر تجاربك")}</h2></div><div><button class="button subtle" data-action="export">${t("Export CSV", "تصدير CSV")}</button><button class="text-button" data-action="clear">${t("Clear trials", "مسح المحاولات")}</button></div></header><div id="trials-content"></div></section><footer><a href="${url("class-details")}">← ${t("Back to Physics 11", "العودة لفيزياء 11")}</a><span>ORBIT · ${t("Explore. Experiment. Understand. Progress.", "استكشف. جرّب. افهم. تقدم.")}</span><a class="next-link" href="${url("quiz")}">${t("Continue to quiz", "تابع للاختبار")}${icon("arrow")}</a></footer></main>`;
    bind();
    updateOutputs();
    updateView();
    drawChart();
    renderTrials();
    setupWheels();
  }
  function updateOutputs() {
    for (const key of Object.keys(bounds)) {
      const input = $(key);
      if (input) input.value = config[key];
      const units = { mass: "kg", speed: "m/s", force: "N", friction: "", angle: "°" };
      $(key + "-output").textContent =
        (key === "friction" ? config[key].toFixed(2) : config[key]) + " " + units[key];
    }
  }
  function setupWheels() {
    const image = $("car-image");
    const configure = () => {
      if (!image.naturalWidth) {
        notify(
          t(
            "The car asset could not load. Extract the complete lab folder.",
            "تعذّر تحميل صورة السيارة. فك ضغط مجلد المختبر كاملًا.",
          ),
        );
        return;
      }
      const width = $("car").clientWidth,
        height = (width * image.naturalHeight) / image.naturalWidth; // Measured hub centres in the 1774×887 source photo; rotate the entire rim inside the tire.
      const pixelScale = width / image.naturalWidth;
      for (const spec of [
        { id: "rear-wheel", x: 289, y: 624, radius: 110 },
        { id: "front-wheel", x: 1422, y: 625, radius: 110 },
      ]) {
        const wheel = $(spec.id),
          diameter = 2 * spec.radius * pixelScale,
          left = (spec.x - spec.radius) * pixelScale,
          top = (spec.y - spec.radius) * pixelScale;
        wheel.style.width = diameter + "px";
        wheel.style.height = diameter + "px";
        wheel.style.left = left + "px";
        wheel.style.top = top + "px";
        wheel.style.backgroundSize = `${width}px ${height}px`;
        wheel.style.backgroundPosition = `${-left}px ${-top}px`;
      }
    };
    image.addEventListener("load", configure);
    if (image.complete) configure();
    const ro = new ResizeObserver(() => {
      configure();
      drawChart();
      updateView();
    });
    ro.observe($("scene"));
    window.labResizeObserver?.disconnect();
    window.labResizeObserver = ro;
  }
  function updateView() {
    const f = labForces(config, sim.v),
      sceneWidth = $("scene").clientWidth,
      world = sim.x * 4,
      carX = Math.max(-sceneWidth * 0.17, Math.min(sceneWidth * 0.17, world)),
      camera = world - carX;
    $("road-rig").style.transform = `rotate(${-config.angle}deg)`;
    $("car").style.setProperty("--car-shift", carX + "px");
    $("lane-markings").style.backgroundPositionX = -camera + "px";
    $("road-measure").style.backgroundPositionX = -camera + "px";
    const turn = ((sim.x / 0.31) * 180) / Math.PI;
    for (const id of ["rear-wheel", "front-wheel"]) $(id).style.transform = `rotate(${turn}deg)`;
    $("force-overlay").style.left = `calc(50% - 240px + ${carX}px)`;
    $("force-overlay").style.display = viewVectors ? "block" : "none";
    for (const [id, value] of [
      ["drive-vector", config.force],
      ["friction-vector", f.friction],
      ["gravity-vector", f.gravity],
    ]) {
      const g = $(id),
        length = Math.min(140, Math.abs(value) / 50),
        end = 240 + Math.sign(value) * Math.max(8, length);
      g.style.display = Math.abs(value) < 0.05 ? "none" : "";
      g.querySelector("line").setAttribute("x2", end);
      g.querySelector("text").setAttribute("x", (end + 240) / 2);
      g.querySelector("text").setAttribute("text-anchor", "middle");
    }
    const speed = unit === "kmh" ? sim.v * 3.6 : sim.v,
      speedUnit = unit === "kmh" ? "km/h" : "m/s";
    $("scene-speed").innerHTML = `${speed.toFixed(1)} <small>${speedUnit}</small>`;
    $("motion-label").textContent = running
      ? Math.abs(sim.v) < 0.03
        ? t("Held by resistance", "ثابت بسبب المقاومة")
        : sim.v < 0
          ? t("Moving left along the road", "يتحرك لليسار على الطريق")
          : t("Moving right along the road", "يتحرك لليمين على الطريق")
      : completed
        ? t("Experiment complete", "اكتملت التجربة")
        : sim.time > 0
          ? t("Experiment paused", "التجربة متوقفة مؤقتًا")
          : t("Ready to explore", "جاهز للاستكشاف");
    $("angle-readout").textContent = config.angle + "°";
    $("scene-time").textContent = "t = " + sim.time.toFixed(2) + " s";
    $("a-readout").innerHTML = f.acceleration.toFixed(2) + " <span>m/s²</span>";
    $("net-readout").innerHTML = f.net.toFixed(0) + " <span>N</span>";
    $("distance-readout").innerHTML = sim.x.toFixed(1) + " <span>m</span>";
    $("energy-readout").innerHTML =
      ((0.5 * config.mass * sim.v * sim.v) / 1000).toFixed(1) + " <span>kJ</span>";
    $("live-equation").textContent =
      `(${config.force.toFixed(0)} + (${f.friction.toFixed(0)}) + (${f.gravity.toFixed(0)})) ÷ ${config.mass} = ${f.acceleration.toFixed(2)} m/s²`;
    $("run-button").innerHTML =
      icon(running ? "pause" : "play") +
      "<span>" +
      (running
        ? t("Pause", "إيقاف مؤقت")
        : completed
          ? t("Run again", "جرّب مجددًا")
          : sim.time > 0
            ? t("Resume", "تابع")
            : t("Run experiment", "شغّل التجربة")) +
      "</span>";
    $("run-status").textContent = running
      ? t("Running · controls update live", "قيد التشغيل · المتغيرات تتغير مباشرة")
      : completed
        ? t("20 seconds complete · save or reset", "اكتملت 20 ثانية · احفظ أو أعد التجربة")
        : sim.time > 0
          ? t("Paused · resume or reset", "متوقفة مؤقتًا · تابع أو أعد التجربة")
          : t("Ready · 20-second experiment", "جاهز · تجربة لمدة 20 ثانية");
    $("save-trial").disabled = sim.time < 0.1;
    document.body.dataset.running = running ? "true" : "false";
  }
  function drawChart() {
    const canvas = $("velocity-chart");
    if (!canvas) return;
    const w = canvas.clientWidth,
      h = canvas.clientHeight,
      dpr = Math.min(2, devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const dark = profile.theme === "dark",
      scale = unit === "kmh" ? 3.6 : 1,
      values = samples.map((s) => s.v * scale),
      min = Math.min(-2, ...values) * 1.12,
      max = Math.max(15, ...values) * 1.12,
      x0 = 42,
      y0 = 16,
      pw = w - 57,
      ph = h - 42,
      toX = (time) => x0 + (time / 20) * pw,
      toY = (value) => y0 + ((max - value) / (max - min)) * ph;
    ctx.font = "10px Inter, sans-serif";
    ctx.strokeStyle = dark ? "#ffffff12" : "#e5eaf2";
    ctx.fillStyle = dark ? "#9eaac2" : "#8290a5";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const y = y0 + (i * ph) / 4,
        v = max - (i * (max - min)) / 4;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + pw, y);
      ctx.stroke();
      ctx.fillText(v.toFixed(0), x0 - 8, y + 3);
    }
    ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) ctx.fillText(String(i * 5) + "s", x0 + (pw * i) / 4, h - 9);
    const zeroY = toY(0);
    ctx.strokeStyle = dark ? "#76869c" : "#b6c1d0";
    ctx.beginPath();
    ctx.moveTo(x0, zeroY);
    ctx.lineTo(x0 + pw, zeroY);
    ctx.stroke();
    ctx.strokeStyle = "#8052ed";
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach((s, i) => {
      if (i === 0) ctx.moveTo(toX(s.time), toY(s.v * scale));
      else ctx.lineTo(toX(s.time), toY(s.v * scale));
    });
    ctx.stroke();
    const latest = samples[samples.length - 1];
    ctx.fillStyle = "#8052ed";
    ctx.beginPath();
    ctx.arc(toX(latest.time), toY(latest.v * scale), 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark ? "#b5bfd2" : "#78869e";
    ctx.textAlign = "left";
    ctx.fillText(unit === "kmh" ? "km/h" : "m/s", 4, 10);
    ctx.lineWidth = 1;
  }
  function reset() {
    running = false;
    completed = false;
    sim = { x: 0, v: config.speed, time: 0 };
    samples = [{ time: 0, v: config.speed }];
    accumulator = 0;
    lastSample = 0;
    changes = 0;
    startedConfig = { ...config };
    updateView();
    drawChart();
  }
  function award() {
    if (!profile.done.includes("lab")) {
      profile.done.push("lab");
      profile.xp = (Number(profile.xp) || 0) + 15;
      persistProfile();
      notify(t("Experiment recorded · +15 XP", "تم تسجيل التجربة · +15 XP"));
    }
  }
  function saveTrial() {
    if (!OrbitSubscriptions.requireAccount()) return;
    if (sim.time < 0.1) return;
    const f0 = labForces(startedConfig, startedConfig.speed),
      row = {
        id: Date.now(),
        config: { ...startedConfig },
        endConfig: { ...config },
        initialAcceleration: f0.acceleration,
        v: sim.v,
        x: sim.x,
        time: sim.time,
        changes,
      };
    trials.push(row);
    trials = trials.slice(-6);
    storage.set("orbit.lab.trials", JSON.stringify(trials));
    if (sim.time >= 2) award();
    renderTrials();
    notify(
      t(
        "Trial saved to your notebook on this device.",
        "حُفظت المحاولة في دفتر التجارب على هذا الجهاز.",
      ),
    );
  }
  function renderTrials() {
    const target = $("trials-content");
    if (!trials.length) {
      target.innerHTML = `<div class="empty-notebook"><span>${icon("orbit")}</span><p>${t("Run an experiment, then save your trial to compare results.", "شغّل تجربة، ثم احفظ المحاولة لتقارن النتائج.")}</p></div>`;
      return;
    }
    target.innerHTML = `<div class="table-scroll"><table><thead><tr>${[t("Trial", "المحاولة"), "m (kg)", "F (N)", "μ", "θ (°)", "v₀ (m/s)", "a₀ (m/s²)", "v (m/s)", "x (m)", "t (s)", t("Conditions", "الظروف")].map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${trials.map((r, i) => `<tr><td>${i + 1}</td>${[r.config.mass, r.config.force, r.config.friction.toFixed(2), r.config.angle, r.config.speed, r.initialAcceleration.toFixed(2), r.v.toFixed(2), r.x.toFixed(1), r.time.toFixed(1)].map((x) => `<td dir="ltr">${x}</td>`).join("")}<td>${r.changes ? t("Changed live", "تغيّرت أثناء التشغيل") : t("Constant", "ثابتة")}</td></tr>`).join("")}</tbody></table></div><p class="notebook-note">${t("a₀ is initial acceleration. Trials marked “changed live” are not controlled comparisons. Up to 6 trials are saved locally.", "a₀ هو التسارع الابتدائي. المحاولات التي تغيرت أثناء التشغيل ليست مقارنة مضبوطة. تُحفظ 6 محاولات كحد أقصى محليًا.")}</p>`;
  }
  function exportCSV() {
    if (!OrbitSubscriptions.requireAccount()) return;
    if (!trials.length) {
      notify(t("Save a trial first.", "احفظ محاولة أولًا."));
      return;
    }
    const rows = [
      [
        "trial",
        "mass_kg",
        "force_N",
        "friction_mu",
        "angle_deg",
        "initial_velocity_ms",
        "initial_acceleration_ms2",
        "final_velocity_ms",
        "displacement_m",
        "duration_s",
        "live_changes",
      ],
      ...trials.map((r, i) => [
        i + 1,
        r.config.mass,
        r.config.force,
        r.config.friction,
        r.config.angle,
        r.config.speed,
        r.initialAcceleration,
        r.v,
        r.x,
        r.time,
        r.changes,
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
      downloadURL = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = downloadURL;
    a.download = "orbit-car-lab-trials.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(downloadURL), 1000);
  }
  function bind() {
    document.querySelectorAll("[data-variable]").forEach((input) =>
      input.addEventListener("input", () => {
        config[input.dataset.variable] = +input.value;
        storage.set("orbit.lab.settings", JSON.stringify(config));
        if (sim.time > 0 && input.dataset.variable !== "speed") changes++;
        if (input.dataset.variable === "speed" && sim.time === 0) {
          sim.v = config.speed;
          samples = [{ time: 0, v: sim.v }];
        }
        updateOutputs();
        updateView();
        drawChart();
      }),
    );
    $("vectors-toggle").addEventListener("change", (e) => {
      viewVectors = e.target.checked;
      updateView();
    });
    $("speed-unit").addEventListener("change", (e) => {
      unit = e.target.value;
      updateView();
      drawChart();
    });
    document.querySelectorAll("[data-preset]").forEach((button) =>
      button.addEventListener("click", () => {
        const presets = {
          coast: { mass: 1200, speed: 10, friction: 0, angle: 0, force: 0 },
          brake: { mass: 1200, speed: 15, friction: 0.15, angle: 0, force: 0 },
          hill: { mass: 1200, speed: 6, friction: 0.03, angle: 8, force: 2800 },
        };
        config = { ...presets[button.dataset.preset] };
        storage.set("orbit.lab.settings", JSON.stringify(config));
        updateOutputs();
        reset();
        notify(t("Preset loaded. Press Run to begin.", "تم تحميل الإعدادات. اضغط تشغيل لتبدأ."));
      }),
    );
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const action = b.dataset.action;
    if (action === "run") {
      if (!running && !OrbitSubscriptions.labStart(() => {})) return;
      if (completed) reset();
      if (!running && sim.time === 0) startedConfig = { ...config };
      running = !running;
      last = 0;
      accumulator = 0;
      updateView();
    }
    if (action === "reset") reset();
    if (action === "save") saveTrial();
    if (action === "export") exportCSV();
    if (action === "clear") {
      if (!OrbitSubscriptions.requireAccount()) return;
      trials = [];
      storage.set("orbit.lab.trials", "[]");
      renderTrials();
      notify(t("Notebook cleared.", "تم مسح الدفتر."));
    }
    if (["language", "theme", "mood"].includes(action)) {
      if (action === "language") profile.lang = profile.lang === "ar" ? "en" : "ar";
      if (action === "theme") profile.theme = profile.theme === "dark" ? "light" : "dark";
      if (action === "mood") profile.mood = profile.mood === "fun" ? "calm" : "fun";
      persistProfile();
      render();
      if (action === "mood")
        notify(
          t(
            "Decorative motion changed. The experiment remains interactive.",
            "تم تغيير الحركة الزخرفية. التجربة تبقى تفاعلية.",
          ),
        );
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) {
      running = false;
      updateView();
    }
    last = 0;
    accumulator = 0;
  });
  function loop(timestamp) {
    if (!last) last = timestamp;
    const elapsed = Math.min(0.1, (timestamp - last) / 1000);
    last = timestamp;
    if (running) {
      accumulator += elapsed;
      const dt = 1 / 120;
      while (accumulator >= dt && running) {
        const actual = Math.min(dt, 20 - sim.time);
        sim = labStep(sim, config, actual);
        accumulator -= dt;
        if (sim.time - lastSample >= 0.1) {
          samples.push({ time: sim.time, v: sim.v });
          lastSample = sim.time;
        }
        if (sim.time >= 20 - 1e-8) {
          sim.time = 20;
          running = false;
          completed = true;
          samples.push({ time: 20, v: sim.v });
          award();
        }
      }
      updateView();
      if (timestamp - lastDisplay > 100) {
        drawChart();
        lastDisplay = timestamp;
      }
    }
    requestAnimationFrame(loop);
  }
  window.ORBITLab = {
    getState: () => ({
      sim: { ...sim },
      config: { ...config },
      running,
      samples: [...samples],
      trials: [...trials],
    }),
    reset,
  };
  render();
  requestAnimationFrame(loop);
}
