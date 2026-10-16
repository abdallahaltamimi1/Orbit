import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  HemisphereLight,
  DirectionalLight,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  PlaneGeometry,
  CanvasTexture,
  SRGBColorSpace,
  MeshStandardMaterial,
  Group,
  Raycaster,
  Vector2,
  ACESFilmicToneMapping,
} from "three";
import { experiments, defaults, calculate, sample } from "./physics-models.js";

const t = (en, ar) => (document.documentElement.lang === "ar" ? ar : en);
let active = null;
window.OrbitPhysicsLab = {
  open(options = {}) {
    if (active) return;
    active = createLaboratory(options);
  },
};

function createLaboratory({ onExit = () => {} }) {
  if (window.OrbitAuth?.current()?.role !== "student") return null;
  const abort = new AbortController(),
    { signal } = abort,
    room = document.createElement("section");
  room.className = "physics-room";
  room.setAttribute("aria-label", t("Interactive physics laboratory", "مختبر الفيزياء التفاعلي"));
  room.innerHTML = `<header><h1 tabindex="-1">${t("Physics laboratory", "مختبر الفيزياء")}</h1><div><button data-room-back hidden>${t("Back to laboratory", "العودة للمختبر")}</button> <button data-room-exit>${t("Exit to school", "الرجوع للمدرسة")}</button></div></header><div class="physics-layout"><div class="physics-stage"><p class="physics-stage-fallback" hidden></p><button class="physics-equipment" hidden></button><p class="physics-stage-note">${t("Select a workstation. All measurements are simulated.", "اختَر محطة تجربة. جميع القياسات ناتجة عن محاكاة.")}</p></div><div class="physics-panel"><h2 id="physics-heading">${t("Choose your experiment", "اختَر تجربتك")}</h2><p class="physics-intro">${t("Click a workstation in the room or use the accessible list below.", "اضغط على محطة داخل الغرفة أو اختَر من القائمة التالية.")}</p><nav class="physics-selection" aria-label="${t("Experiments", "التجارب")}">${Object.entries(
    experiments,
  )
    .map(
      ([id, e]) =>
        `<button data-experiment="${id}">${t(...e.name)}<small dir="ltr">${e.formula}</small></button>`,
    )
    .join(
      "",
    )}</nav><div class="physics-work" hidden><p class="physics-objective"></p><p class="physics-formula" dir="ltr"></p><form class="physics-controls"></form><output class="physics-measurement" aria-label="${t("Calculated result", "النتيجة المحسوبة")}"></output><p class="physics-live"></p><div class="physics-actions"><button class="physics-run">${t("Run experiment", "شغّل التجربة")}</button><button class="physics-reset">${t("Reset", "إعادة ضبط")}</button></div><p class="physics-status" role="status"></p><p>${t("Change a variable, run the experiment, then compare the result. Completion is saved after the simulation finishes.", "غيّر متغيرًا وشغّل التجربة، وبعدين قارن النتيجة. يُحفظ الإنجاز بعد انتهاء المحاكاة.")}</p></div></div></div>`;
  document.body.append(room);
  document.body.dataset.physicsOpen = "true";
  const background = [...document.body.children]
    .filter((el) => el !== room)
    .map((el) => [el, el.inert]);
  background.forEach(([el]) => {
    el.inert = true;
  });
  const $ = (selector) => room.querySelector(selector),
    stage = $(".physics-stage"),
    quiet = matchMedia("(prefers-reduced-motion:reduce)"),
    resources = [],
    groups = {},
    targets = [];
  let renderer,
    scene,
    camera,
    observer,
    frame = 0,
    disposed = false,
    id = null,
    values = null,
    running = false,
    elapsed = 0,
    lastTime = 0,
    hover = null,
    cart,
    signals = [],
    circuitSwitch = false,
    returnFocus = document.activeElement;
  const materials = {},
    boards = {};
  const mat = (name, color, metalness = 0) =>
    materials[name] ||
    (materials[name] = new MeshStandardMaterial({ color, metalness, roughness: 0.48 }));
  function box(parent, w, h, d, x, y, z, material) {
    const geometry = new BoxGeometry(w, h, d),
      mesh = new Mesh(geometry, material);
    resources.push(geometry);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent, r, h, x, y, z, material) {
    const geometry = new CylinderGeometry(r, r, h, 16),
      mesh = new Mesh(geometry, material);
    resources.push(geometry);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function request() {
    if (!disposed && !document.hidden && renderer && !frame) frame = requestAnimationFrame(draw);
  }
  function stop() {
    running = false;
    lastTime = 0;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function sceneBuild() {
    try {
      renderer = new WebGLRenderer({ antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.25 : 1.5));
      renderer.toneMapping = ACESFilmicToneMapping;
      stage.prepend(renderer.domElement);
      scene = new Scene();
      scene.background = new Color("#dce4ef");
      camera = new PerspectiveCamera(48, 1, 0.1, 80);
      scene.add(new HemisphereLight("#ffffff", "#64748b", 2));
      const light = new DirectionalLight("#ffffff", 3);
      light.position.set(0, 9, 4);
      scene.add(light);
      const white = mat("white", "#f6f8fc"),
        wood = mat("wood", "#bd9b76"),
        metal = mat("metal", "#64748b", 0.65),
        blue = mat("blue", "#2563eb"),
        mint = mat("mint", "#22c7a9"),
        yellow = mat("yellow", "#ffd166");
      box(scene, 18, 0.2, 14, 0, -0.1, 0, white);
      box(scene, 18, 6, 0.2, 0, 3, -6, white);
      box(scene, 0.2, 6, 14, -9, 3, 0, white);
      for (let i = 0; i < 4; i++) {
        box(scene, 0.12, 2.7, 2, -8.8, 3, -4 + i * 2.8, blue);
        box(scene, 0.1, 2.4, 1.75, -8.7, 3, -4 + i * 2.8, mat("glass", "#eaf1ff"));
      }
      ["motion", "newton", "ohm"].forEach((key, i) => {
        const g = new Group();
        g.position.set((i - 1) * 5.2, 0, -1);
        scene.add(g);
        groups[key] = g;
        materials["bench" + key] = wood.clone();
        const bench = box(g, 4.7, 0.18, 2.8, 0, 1.5, 0, materials["bench" + key]);
        bench.userData.experiment = key;
        targets.push(bench);
        [-1.8, 1.8].forEach((x) =>
          [-1, 1].forEach((z) => box(g, 0.12, 1.4, 0.12, x, 0.7, z, metal)),
        );
        if (key === "ohm") {
          box(g, 3.7, 0.06, 1.8, 0, 1.65, 0, white);
          // A closed rectangular ideal circuit: source, resistor and ammeter in series.
          for (const z of [-0.6, 0.6]) box(g, 3.6, 0.055, 0.055, 0, 1.75, z, metal);
          for (const x of [-1.8, 1.8]) box(g, 0.055, 0.055, 1.2, x, 1.75, 0, metal);
          const battery = box(g, 0.45, 0.55, 0.6, -1.8, 1.94, 0, blue);
          battery.userData.experiment = key;
          targets.push(battery);
          const resistor = box(g, 0.8, 0.25, 0.35, 0, 1.86, -0.6, yellow);
          resistor.userData.experiment = key;
          targets.push(resistor);
          cylinder(g, 0.32, 0.17, 1.8, 1.9, 0, white);
          box(g, 0.36, 0.05, 0.12, 1.8, 2, 0, blue);
          for (let j = 0; j < 8; j++) {
            const geo = new SphereGeometry(0.045, 8, 6),
              dot = new Mesh(geo, mint);
            resources.push(geo);
            g.add(dot);
            signals.push(dot);
          }
        } else {
          box(g, 4, 0.06, 0.7, 0, 1.65, 0, metal);
          for (let j = 0; j <= 10; j++)
            box(g, 0.025, 0.03, 0.22, -1.85 + j * 0.37, 1.7, 0.45, white);
          const wagon = new Group();
          box(wagon, 0.5, 0.3, 0.45, 0, 0, 0, key === "motion" ? blue : mint);
          [-0.17, 0.17].forEach((x) =>
            [-0.24, 0.24].forEach((z) => {
              const wheel = cylinder(wagon, 0.095, 0.06, x, -0.15, z, metal);
              wheel.rotation.x = Math.PI / 2;
            }),
          );
          wagon.position.set(-1.8, 1.98, 0);
          g.add(wagon);
          g.userData.cart = wagon;
          wagon.userData.experiment = key;
          wagon.children.forEach((child) => {
            child.userData.experiment = key;
            targets.push(child);
          });
        }
        cylinder(g, 0.17, 0.45, 1.7, 1.85, 0.9, mat("beaker", "#e2f7f3"));
        box(g, 0.5, 0.03, 0.6, -1.5, 1.65, 0.85, white);
        const board = document.createElement("canvas");
        board.width = 768;
        board.height = 256;
        const texture = new CanvasTexture(board);
        texture.colorSpace = SRGBColorSpace;
        resources.push(texture);
        const geometry = new PlaneGeometry(4.3, 1.43);
        resources.push(geometry);
        const material = new MeshStandardMaterial({ map: texture, roughness: 1 });
        materials["sign" + key] = material;
        const sign = new Mesh(geometry, material);
        sign.position.set(0, 3, -2.2);
        g.add(sign);
        boards[key] = { board, texture };
        paintBoard(key, defaults(key));
      });
      observer = new ResizeObserver(() => {
        const w = stage.clientWidth,
          h = stage.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        request();
      });
      observer.observe(stage);
      stage.addEventListener(
        "webglcontextlost",
        (event) => {
          event.preventDefault();
          fallback();
        },
        { signal },
      );
      renderer.domElement.addEventListener("pointermove", point, { signal });
      renderer.domElement.addEventListener(
        "pointerleave",
        () => {
          hover = null;
          stage.style.cursor = "";
          $(".physics-equipment").hidden = true;
          request();
        },
        { signal },
      );
      renderer.domElement.addEventListener(
        "click",
        (event) => {
          const found = hit(event);
          if (found) select(found);
        },
        { signal },
      );
      overview();
    } catch {
      fallback();
    }
  }
  function fallback() {
    stop();
    renderer?.dispose();
    renderer?.domElement.remove();
    renderer = null;
    observer?.disconnect();
    $(".physics-stage-fallback").hidden = false;
    $(".physics-stage-fallback").textContent = t(
      "3D rendering is unavailable. All experiment controls and calculations remain available below.",
      "تعذّر عرض المشهد ثلاثي الأبعاد. تقدر تستخدم كل أدوات التجارب والحسابات أدناه.",
    );
  }
  function hit(event) {
    if (!renderer) return null;
    const rect = renderer.domElement.getBoundingClientRect(),
      pointer = new Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      ray = new Raycaster();
    ray.setFromCamera(pointer, camera);
    return ray.intersectObjects(targets, false)[0]?.object.userData.experiment || null;
  }
  function point(event) {
    const next = hit(event);
    if (next === hover) return;
    hover = next;
    stage.style.cursor = next ? "pointer" : "";
    const badge = $(".physics-equipment");
    badge.hidden = !next;
    if (next) {
      badge.textContent = t(...experiments[next].name);
      badge.dataset.select = next;
    }
    request();
  }
  function overview() {
    stop();
    id = null;
    $(".physics-work").hidden = true;
    $(".physics-selection").hidden = false;
    $(".physics-intro").hidden = false;
    $("[data-room-back]").hidden = true;
    $("#physics-heading").textContent = t("Choose your experiment", "اختَر تجربتك");
    if (camera) {
      camera.position.set(9, 8, 13);
      camera.lookAt(0, 1, -1);
    }
    request();
  }
  function select(key) {
    if (!experiments[key]) return;
    stop();
    id = key;
    values = defaults(id);
    elapsed = 0;
    circuitSwitch = false;
    const e = experiments[id];
    $(".physics-work").hidden = false;
    $(".physics-selection").hidden = true;
    $(".physics-intro").hidden = true;
    $("[data-room-back]").hidden = false;
    $("#physics-heading").textContent = t(...e.name);
    $(".physics-objective").textContent = t(...e.objective);
    $(".physics-formula").textContent = e.formula;
    $(".physics-controls").innerHTML = e.variables
      .map(
        (v) =>
          `<label for="physics-${v.id}">${t(...v.name)} · <output id="value-${v.id}">${v.value} ${v.unit}</output></label><input type="range" id="physics-${v.id}" name="${v.id}" min="${v.min}" max="${v.max}" step="${v.step}" value="${v.value}">`,
      )
      .join("");
    $(".physics-status").textContent = t(
      "Ready. Adjust variables, then run.",
      "جاهز. عدّل المتغيرات وبعدين شغّل.",
    );
    if (camera) {
      const x = groups[id].position.x;
      camera.position.set(x + 2.4, 4.5, 4.6);
      camera.lookAt(x, 1.7, -1);
      cart = groups[id].userData.cart;
    }
    update();
    $("#physics-heading").tabIndex = -1;
    $("#physics-heading").focus({ preventScroll: true });
  }
  function paintBoard(key, input) {
    const item = boards[key];
    if (!item) return;
    const ctx = item.board.getContext("2d"),
      e = experiments[key];
    ctx.fillStyle = "#142b4a";
    ctx.fillRect(0, 0, 768, 256);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.direction = document.documentElement.dir;
    ctx.font = "32px Segoe UI";
    ctx.fillText(t(...e.name), 384, 56);
    ctx.direction = "ltr";
    ctx.font = "38px Segoe UI";
    ctx.fillText(e.formula + "   ·   " + calculate(key, input).toFixed(3) + " " + e.unit, 384, 126);
    ctx.font = "26px Segoe UI";
    ctx.fillStyle = "#ffd166";
    ctx.fillText(
      key === "motion"
        ? "0 — " + input.distance + " m"
        : key === "newton"
          ? "0 — 10 m"
          : input.voltage + " V  /  " + input.resistance + " Ω",
      384,
      192,
    );
    item.texture.needsUpdate = true;
  }
  function update() {
    if (!id) return;
    const e = experiments[id],
      result = calculate(id, values);
    $(".physics-measurement").textContent = e.symbol + " = " + result.toFixed(3) + " " + e.unit;
    e.variables.forEach((v) => ($("#value-" + v.id).textContent = values[v.id] + " " + v.unit));
    paintBoard(id, values);
    visual(sample(id, values, elapsed));
    request();
  }
  function visual(state) {
    if (cart && id !== "ohm") {
      cart.position.x = -1.8 + 3.6 * (id === "newton" ? state.position / 10 : state.fraction);
      cart.scale.y = id === "newton" ? Math.min(1.7, 0.7 + values.mass * 0.1) : 1;
    }
    if (id === "ohm")
      signals.forEach((dot, i) => {
        const length = 9.6,
          p = ((i / 8 + elapsed * state.result * 0.12) % 1) * length;
        const x = p < 3.6 ? -1.8 + p : p < 4.8 ? 1.8 : p < 8.4 ? 1.8 - (p - 4.8) : -1.8;
        const z = p < 3.6 ? -0.6 : p < 4.8 ? -0.6 + p - 3.6 : p < 8.4 ? 0.6 : 0.6 - (p - 8.4);
        dot.position.set(x, 1.8, z);
        dot.visible = circuitSwitch;
      });
    $(".physics-live").textContent =
      id === "ohm"
        ? t(
            "Ideal circuit · conventional current shown; signal speed is illustrative.",
            "دائرة مثالية · اتجاه التيار الاصطلاحي، وسرعة الإشارات توضيحية.",
          )
        : t("Simulation time: ", "زمن المحاكاة: ") +
          state.time.toFixed(2) +
          " s · " +
          t("Position: ", "الموقع: ") +
          state.position.toFixed(2) +
          " m" +
          (id === "newton" ? " · v = " + state.velocity.toFixed(2) + " m/s" : "");
  }
  function complete() {
    const A = window.OrbitAuth,
      user = A?.current();
    if (user?.role !== "student") return;
    try {
      const key = "orbit.learning." + user.email,
        records = A.get(key, {});
      records["experiment:" + id] = {
        ...(records["experiment:" + id] || {}),
        type: "experiment",
        experiment: id,
        completedAt: new Date().toISOString(),
        variables: { ...values },
        result: calculate(id, values),
      };
      A.set(key, records);
      if (id === "newton") {
        const prefs = A.get("orbit.student.v1", {});
        prefs.done = [...new Set([...(prefs.done || []), "lab"])];
        prefs.lastAction = {
          en: "Completed Newton’s second law experiment",
          ar: "أنهيت تجربة قانون نيوتن الثاني",
          at: Date.now(),
        };
        A.set("orbit.student.v1", prefs);
        A.flush();
      }
      $(".physics-status").textContent = t(
        "Experiment complete. Your activity has been saved. Change a variable and compare.",
        "خلصت التجربة وانحفظ نشاطك. جرّب تغيّر متغيرًا وتقارن.",
      );
    } catch {
      $(".physics-status").textContent = t(
        "Simulation complete, but activity could not be saved. Check browser storage.",
        "خلصت المحاكاة، لكن تعذّر حفظ النشاط. افحص مساحة التخزين بالمتصفح.",
      );
    }
  }
  let timer = 0;
  function start() {
    if (!id) return;
    stop();
    clearTimeout(timer);
    elapsed = 0;
    running = true;
    circuitSwitch = id === "ohm";
    $(".physics-status").textContent = t("Simulation running…", "المحاكاة شغّالة…");
    // Reduced motion keeps the experiment meaningful through its final state, without travel animation.
    if (quiet.matches || !renderer) {
      elapsed = sample(id, values, 0).duration;
      visual(sample(id, values, elapsed));
      running = false;
      request();
      complete();
    } else request();
  }
  function draw(now) {
    frame = 0;
    if (disposed || document.hidden || !renderer) return;
    if (running) {
      if (lastTime) elapsed += (now - lastTime) / 1000;
      lastTime = now;
      const state = sample(id, values, elapsed);
      visual(state);
      if (state.finished) {
        running = false;
        lastTime = 0;
        complete();
      }
    }
    for (const [key, g] of Object.entries(groups))
      g.children[0].material.emissive?.set(key === hover ? "#17243a" : "#000000");
    renderer.render(scene, camera);
    if (running) request();
  }
  room.addEventListener(
    "click",
    (event) => {
      const e = event.target.closest("[data-experiment]");
      if (e) select(e.dataset.experiment);
      const badge = event.target.closest("[data-select]");
      if (badge) select(badge.dataset.select);
      if (event.target.closest("[data-room-back]")) overview();
      if (event.target.closest("[data-room-exit]")) dispose();
      if (event.target.closest(".physics-run")) start();
      if (event.target.closest(".physics-reset") && id) select(id);
    },
    { signal },
  );
  $(".physics-controls").addEventListener("submit", (event) => event.preventDefault(), { signal });
  $(".physics-controls").addEventListener(
    "input",
    (event) => {
      if (!id || !experiments[id].variables.some((v) => v.id === event.target.name)) return;
      const n = Number(event.target.value);
      try {
        const next = { ...values, [event.target.name]: n };
        calculate(id, next);
        stop();
        elapsed = 0;
        values = next;
        update();
        $(".physics-status").textContent = t(
          "Variables changed. Run again to compare.",
          "تغيّرت المتغيرات. شغّل مرة ثانية وقارن.",
        );
      } catch {
        $(".physics-status").textContent = t(
          "Use a value within the displayed range.",
          "استخدم قيمة ضمن المجال المعروض.",
        );
      }
    },
    { signal },
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
      } else request();
    },
    { signal },
  );
  quiet.addEventListener(
    "change",
    () => {
      if (quiet.matches && running) {
        stop();
        elapsed = sample(id, values, 0).duration;
        visual(sample(id, values, elapsed));
        complete();
        request();
      }
    },
    { signal },
  );
  function dispose(notify = true) {
    if (disposed) return;
    disposed = true;
    stop();
    clearTimeout(timer);
    abort.abort();
    observer?.disconnect();
    resources.forEach((r) => r.dispose());
    Object.values(materials).forEach((m) => m.dispose());
    renderer?.dispose();
    renderer?.forceContextLoss();
    room.remove();
    background.forEach(([el, inert]) => {
      el.inert = inert;
    });
    delete document.body.dataset.physicsOpen;
    active = null;
    if (notify) {
      onExit();
      returnFocus?.focus?.({ preventScroll: true });
    }
  }
  window.addEventListener(
    "pagehide",
    (event) => {
      if (!event.persisted) dispose(false);
      else {
        stop();
      }
    },
    { signal },
  );
  room._physics = {
    inspect: () => ({
      experiment: id,
      values,
      result: id ? calculate(id, values) : null,
      running,
      elapsed,
      framePending: Boolean(frame),
      webgl: Boolean(renderer),
      canvasCount: room.querySelectorAll("canvas").length,
    }),
    dispose,
  };
  sceneBuild();
  $("h1").focus({ preventScroll: true });
  const requested = new URLSearchParams(location.search).get("experiment");
  if (experiments[requested]) select(requested);
  return room._physics;
}
