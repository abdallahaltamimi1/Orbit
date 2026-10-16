import {
  Scene,
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  CanvasTexture,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  WebGLRenderer,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Vector3,
  SRGBColorSpace,
} from "three";
// Educational scene receives role/state only. It never reads account fields.
window.OrbitRegistrationUniverse = {
  create(host) {
    if (!host || host._learningUniverse) return host?._learningUniverse;
    let renderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      host.dataset.renderer = "fallback";
      return null;
    }
    const canvas = renderer.domElement;
    canvas.className = "universe-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.append(canvas);
    host.dataset.renderer = "ready";
    const scene = new Scene(),
      camera = new PerspectiveCamera(38, 1, 0.1, 40);
    camera.position.set(0, 1.15, 7.3);
    camera.lookAt(0, 0, 0);
    scene.add(new HemisphereLight("#eaffff", "#17454d", 1.9));
    const key = new DirectionalLight("#ffffff", 2.2);
    key.position.set(-3, 5, 5);
    scene.add(key);
    const rim = new DirectionalLight("#7ee9d6", 2);
    rim.position.set(4, 2, -3);
    scene.add(rim);
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set(),
      groups = {},
      floaters = [],
      writing = [],
      signals = [];
    function material(color, options = {}) {
      const m = new MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.12,
        transparent: true,
        ...options,
      });
      materials.add(m);
      return m;
    }
    function box(parent, w, h, d, x, y, z, color, options = {}) {
      const geo = new BoxGeometry(w, h, d);
      geometries.add(geo);
      const mesh = new Mesh(geo, material(color, options));
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
    function label(
      parent,
      text,
      w,
      h,
      x,
      y,
      z,
      { background = "#f4fffd", color = "#174652", small = false } = {},
    ) {
      const c = document.createElement("canvas");
      c.width = 768;
      c.height = Math.max(160, Math.round((768 * h) / w));
      const ctx = c.getContext("2d");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = color;
      ctx.font = `600 ${small ? 55 : 72}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      String(text)
        .split("\n")
        .forEach((line, i, all) =>
          ctx.fillText(line, 384, c.height / 2 + (i - (all.length - 1) / 2) * 92, 700),
        );
      const tex = new CanvasTexture(c);
      tex.colorSpace = SRGBColorSpace;
      textures.add(tex);
      return box(parent, w, h, 0.025, x, y, z, "#ffffff", { map: tex, roughness: 0.5 });
    }
    function card(parent, x, y, z, title, w = 1.12, h = 0.72) {
      const g = new Group();
      g.position.set(x, y, z);
      parent.add(g);
      box(g, w + 0.06, h + 0.06, 0.09, 0, 0, 0, "#d9f3ee");
      label(g, title, w, h, 0, 0, 0.065, { small: true });
      floaters.push({ object: g, y, phase: floaters.length * 1.4 });
      return g;
    }
    for (const role of ["student", "teacher", "school"]) {
      const group = new Group();
      scene.add(group);
      group.rotation.y = -0.2;
      groups[role] = group;
      box(group, 4.7, 0.12, 2.65, 0, -1.5, -0.2, "#bfded9", { roughness: 0.8 });
    }
    const student = groups.student,
      tablet = new Group();
    student.add(tablet);
    tablet.rotation.set(-0.08, -0.12, -0.04);
    box(tablet, 2.45, 1.86, 0.16, 0, 0.24, 0, "#d6e9e9", { metalness: 0.45 });
    box(tablet, 2.23, 1.61, 0.025, 0, 0.24, 0.1, "#183f4c");
    label(tablet, "LEARN\nExplore · Try · Understand", 2.04, 1.4, 0, 0.24, 0.13, {
      background: "#dff8f3",
      small: true,
    });
    box(tablet, 0.65, 0.07, 0.03, -0.44, -0.15, 0.16, "#0d9488");
    box(tablet, 0.65, 0.07, 0.03, 0.36, -0.15, 0.16, "#82cabf");
    card(student, -1.55, 0.6, 0.55, "LESSON", 0.9, 0.62);
    card(student, 1.5, 1, 0.38, "✓", 0.62, 0.62);
    card(student, 1.6, -0.1, 0.45, "LAB", 0.8, 0.58);
    const book = new Group();
    book.position.set(-0.45, -0.96, 1.05);
    book.rotation.x = -0.9;
    student.add(book);
    for (const side of [-1, 1]) {
      const page = box(book, 0.78, 0.94, 0.07, side * 0.39, 0, 0, "#f3fffa");
      page.rotation.y = -side * 0.2;
      for (let i = 0; i < 4; i++) box(page, 0.5, 0.025, 0.01, 0, 0.25 - i * 0.15, 0.05, "#77a8a6");
    }
    box(book, 0.06, 0.96, 0.1, 0, 0, -0.02, "#0d9488");
    const teacher = groups.teacher;
    box(teacher, 3, 1.84, 0.13, 0, 0.45, -0.25, "#f4f7f5");
    box(teacher, 2.75, 1.6, 0.03, 0, 0.45, -0.16, "#e4f4ef");
    label(teacher, "F = m × a", 2.3, 0.55, 0, 0.78, -0.12, { background: "#e4f4ef" });
    for (let i = 0; i < 3; i++) {
      const line = box(
        teacher,
        1.8 - i * 0.28,
        0.055,
        0.02,
        -0.2,
        0.32 - i * 0.22,
        -0.1,
        "#267b76",
      );
      writing.push({ object: line, delay: i * 0.7 });
    }
    box(teacher, 0.13, 1.15, 0.12, -1, -0.99, -0.3, "#91b3b3");
    box(teacher, 0.13, 1.15, 0.12, 1, -0.99, -0.3, "#91b3b3");
    card(teacher, 1.65, -0.12, 0.7, "✓ TASK\n✓ REVIEW", 1.12, 1.25);
    card(teacher, -1.6, 0.85, 0.65, "LESSON", 0.95, 0.7);
    const tools = card(teacher, -1.2, -0.85, 1, "PLAN", 0.9, 0.5);
    tools.rotation.z = 0.1;
    box(teacher, 1.15, 0.11, 0.12, 0.25, -1.13, 0.9, "#0d9488").rotation.z = 0.2;
    const school = groups.school;
    box(school, 2.7, 1.38, 1.05, 0, -0.35, -0.2, "#edf6f3");
    box(school, 2.95, 0.18, 1.22, 0, 0.43, -0.2, "#a9d5cd");
    box(school, 0.64, 1.75, 1.13, 0, -0.18, -0.1, "#cee8e1");
    label(school, "SCHOOL", 1.25, 0.32, 0, 0.45, 0.53, {
      small: true,
      background: "#0d9488",
      color: "#ffffff",
    });
    box(school, 0.42, 0.7, 0.05, 0, -0.72, 0.51, "#358d90", { metalness: 0.4 });
    for (const x of [-1.03, -0.65, 0.65, 1.03])
      for (const y of [-0.16, -0.63])
        box(school, 0.22, 0.28, 0.025, x, y, 0.34, "#6eb9c0", { metalness: 0.45 });
    card(school, -1.7, 0.8, 0.4, "TEACHERS", 1.12, 0.65);
    card(school, 1.65, 0.8, 0.2, "CLASSROOM", 1.12, 0.65);
    card(school, 1.65, -0.65, 0.7, "STUDENTS", 1.12, 0.65);
    for (const side of [-1, 1]) {
      const geo = new BufferGeometry().setFromPoints([
        new Vector3(side * 1.6, 0.5, 0.1),
        new Vector3(side * 1.8, -0.1, 0.35),
        new Vector3(side * 1.35, -1.1, 0.6),
      ]);
      geometries.add(geo);
      const mat = new LineBasicMaterial({ color: "#5bc8b2", transparent: true });
      materials.add(mat);
      school.add(new Line(geo, mat));
      const packet = box(school, 0.08, 0.08, 0.08, side * 1.6, 0.5, 0.12, "#14b8a6");
      signals.push({ object: packet, side });
    }
    for (const x of [-1.8, 1.8]) {
      const trunk = new CylinderGeometry(0.045, 0.045, 0.42, 8);
      geometries.add(trunk);
      const m = new Mesh(trunk, material("#b5a284"));
      m.position.set(x, -1.15, -0.7);
      school.add(m);
      const foliage = new ConeGeometry(0.25, 0.64, 8);
      geometries.add(foliage);
      const tree = new Mesh(foliage, material("#449e89"));
      tree.position.set(x, -0.73, -0.7);
      school.add(tree);
    }
    const roleMaterials = {};
    for (const [role, g] of Object.entries(groups)) {
      const set = new Set();
      g.traverse((o) => {
        if (o.material) set.add(o.material);
      });
      roleMaterials[role] = [...set];
    }
    let role = "student",
      status = "idle",
      frame = 0,
      last = 0,
      clock = 0,
      visible = true,
      disposed = false,
      suspended = false,
      transition = 1;
    const weights = { student: 1, teacher: 0, school: 0 },
      from = { ...weights },
      reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const calm = () => reduce.matches || document.body.dataset.mood === "calm";
    function cancel() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    }
    function request() {
      if (!disposed && !suspended && visible && !document.hidden && !frame)
        frame = requestAnimationFrame(draw);
    }
    function draw(now) {
      frame = 0;
      if (disposed || suspended || !visible || document.hidden) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      if (!calm()) clock += dt;
      transition = calm() ? 1 : Math.min(1, transition + dt / 0.38);
      const ease = 1 - Math.pow(1 - transition, 3);
      for (const [name, g] of Object.entries(groups)) {
        weights[name] = from[name] + ((name === role ? 1 : 0) - from[name]) * ease;
        g.visible = weights[name] > 0.002;
        g.position.z = -0.22 * (1 - weights[name]);
        g.scale.setScalar(0.94 + 0.06 * weights[name]);
        roleMaterials[name].forEach((m) => (m.opacity = weights[name]));
      }
      floaters.forEach(
        (f) => (f.object.position.y = f.y + (calm() ? 0 : Math.sin(clock * 0.7 + f.phase) * 0.06)),
      );
      writing.forEach(
        (w) =>
          (w.object.scale.x = calm()
            ? 1
            : Math.min(1, Math.max(0.01, ((clock % 8) - w.delay) / 1.3))),
      );
      signals.forEach((p) => {
        const k = calm() ? 0.45 : (clock * 0.16) % 1;
        p.object.position.set(
          p.side * (1.6 + 0.2 * Math.sin(k * Math.PI)),
          0.5 - k * 1.6,
          0.12 + k * 0.48,
        );
      });
      renderer.render(scene, camera);
      if (!calm()) request();
    }
    function resize() {
      if (disposed) return;
      const w = host.clientWidth,
        h = host.clientHeight;
      if (!w || !h) return;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, w < 500 ? 1.25 : 1.5));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = camera.aspect < 1 ? 10 : 8.6;
      camera.updateProjectionMatrix();
      request();
    }
    const ro = new ResizeObserver(resize),
      io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) request();
        else cancel();
      }),
      mo = new MutationObserver(() => request());
    ro.observe(host);
    io.observe(host);
    mo.observe(document.body, { attributes: true, attributeFilter: ["data-mood"] });
    function visibility() {
      if (document.hidden) cancel();
      else request();
    }
    function preference() {
      request();
    }
    function leave(e) {
      suspended = true;
      cancel();
      if (!e.persisted) dispose();
    }
    function resume() {
      suspended = false;
      resize();
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      cancel();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      reduce.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", visibility);
      removeEventListener("pagehide", leave);
      removeEventListener("pageshow", resume);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      canvas.remove();
      host.dataset.renderer = "fallback";
      delete host._learningUniverse;
    }
    reduce.addEventListener("change", preference);
    document.addEventListener("visibilitychange", visibility);
    addEventListener("pagehide", leave);
    addEventListener("pageshow", resume);
    const api = {
      setRole(value, immediate = false) {
        if (!groups[value] || value === role) return;
        Object.assign(from, weights);
        role = value;
        host.dataset.sceneRole = role;
        transition = immediate || calm() ? 1 : 0;
        request();
      },
      setFocus() {},
      setState(value) {
        status = value;
        host.dataset.sceneState = value;
        request();
      },
      dispose,
      inspect() {
        return {
          role,
          status,
          weights: { ...weights },
          reduced: calm(),
          framePending: !!frame,
          disposed,
          renders: renderer.info.render.frame,
        };
      },
    };
    host._learningUniverse = api;
    host.dataset.sceneRole = role;
    resize();
    return api;
  },
};
