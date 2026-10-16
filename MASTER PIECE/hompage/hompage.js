"use strict";

/* =========================================================
   NAVBAR
========================================================= */

const nav = document.getElementById("siteNav");
const hero = document.getElementById("hero");

function updateNavbar() {
  if (!nav || !hero) return;

  const trigger = 32;

  nav.classList.toggle("is-solid", window.scrollY > trigger);
}

window.addEventListener("scroll", updateNavbar, { passive: true });

window.addEventListener("resize", updateNavbar);

updateNavbar();

/* =========================================================
   MOBILE MENU
========================================================= */

const burger = document.getElementById("navBurger");

const panel = document.getElementById("navPanel");

function closeMenu() {
  if (!nav || !burger) return;

  nav.classList.remove("is-open");

  burger.setAttribute("aria-expanded", "false");
}

if (burger) {
  burger.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");

    burger.setAttribute("aria-expanded", String(isOpen));
  });
}

if (panel) {
  panel.addEventListener("click", (event) => {
    if (event.target.tagName === "A") {
      closeMenu();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

/* =========================================================
   SCROLL REVEAL
========================================================= */

const revealElements = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-in");

        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  revealElements.forEach((element) => {
    revealObserver.observe(element);
  });
} else {
  revealElements.forEach((element) => {
    element.classList.add("is-in");
  });
}

/* =========================================================
   FAQ
========================================================= */

const faqList = document.getElementById("faqList");

if (faqList) {
  faqList.addEventListener("click", (event) => {
    const button = event.target.closest(".m-faq__q");

    if (!button) return;

    const item = button.parentElement;

    const wasOpen = item.classList.contains("is-open");

    faqList.querySelectorAll(".m-faq__item.is-open").forEach((openItem) => {
      openItem.classList.remove("is-open");
    });

    if (!wasOpen) {
      item.classList.add("is-open");
    }
  });
}

/* =========================================================
   SERVICES ORBIT
========================================================= */

const orbit = document.getElementById("orbit");

const orbitSpin = document.getElementById("orbitSpin");

const orbitLabel = document.getElementById("orbitLabel");

const serviceCards = document.querySelectorAll("[data-service]");

if (orbit && orbitSpin && serviceCards.length) {
  let angle = 0;

  let target = null;

  let sticky = false;

  let lastTime = 0;

  const speed = 11;

  function paintOrbit() {
    orbitSpin.style.transform = `rotate(${angle}deg)`;
  }

  function animate(time) {
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;

    lastTime = time;

    if (target === null) {
      angle += delta * speed;
    } else {
      angle += (target - angle) * Math.min(1, delta * 7);
    }

    paintOrbit();

    requestAnimationFrame(animate);
  }

  function activate(key, name) {
    const nodes = orbitSpin.querySelectorAll(".m-orbit__node");

    let index = -1;

    nodes.forEach((node, i) => {
      const active = node.dataset.node === key;

      node.classList.toggle("is-live", active);

      if (active) {
        index = i;
      }
    });

    if (index < 0) return;

    target = -index * 90;

    orbit.classList.add("is-focused");

    if (orbitLabel) {
      orbitLabel.textContent = name;
    }
  }

  function release() {
    if (sticky) return;

    target = null;

    orbit.classList.remove("is-focused");

    orbitSpin.querySelectorAll(".m-orbit__node").forEach((node) => {
      node.classList.remove("is-live");
    });
  }

  serviceCards.forEach((card) => {
    const key = card.dataset.service;

    const title = card.querySelector("h3");

    card.addEventListener("mouseenter", () => {
      sticky = false;

      activate(key, title?.textContent || "");
    });

    card.addEventListener("mouseleave", release);

    card.addEventListener("click", () => {
      sticky = true;

      activate(key, title?.textContent || "");
    });
  });

  document.addEventListener("click", (event) => {
    if (!sticky) return;

    if (event.target.closest("[data-service]")) {
      return;
    }

    sticky = false;

    release();
  });

  requestAnimationFrame(animate);

  paintOrbit();
}
window.OrbitInitHeroScene = function () {
  if (!window.THREE || window.OrbitHeroSceneStarted) return;
  window.OrbitHeroSceneStarted = true;

  /* =========================================================
       BASIC SETUP
    ========================================================== */

  var canvas = document.getElementById("sky");

  var stage = document.getElementById("hero");

  var slowMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var small = window.innerWidth < 760;

  /* =========================================================
       RENDERER
    ========================================================== */

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: !small,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));

  renderer.setClearColor(0x04070d, 1);

  /* =========================================================
       SCENE
    ========================================================== */

  var scene = new THREE.Scene();

  scene.fog = new THREE.FogExp2(0x04070d, 0.0022);

  var camera = new THREE.PerspectiveCamera(46, 1, 0.5, 2000);

  /* =========================================================
       RESIZE
    ========================================================== */

  function resize() {
    var w = stage.clientWidth;

    var h = stage.clientHeight;

    renderer.setSize(w, h, false);

    camera.aspect = w / h;

    camera.updateProjectionMatrix();
  }

  /* =========================================================
       TEXTURES
    ========================================================== */

  function surface(base, accent, bands) {
    var c = document.createElement("canvas");

    c.width = 1024;
    c.height = 512;

    var x = c.getContext("2d");

    x.fillStyle = base;

    x.fillRect(0, 0, 1024, 512);

    if (bands) {
      for (var b = 0; b < 24; b++) {
        var y = Math.random() * 512;

        var hh = 6 + Math.random() * 30;

        var g = x.createLinearGradient(0, y, 0, y + hh);

        g.addColorStop(0, "rgba(255,255,255,0)");

        g.addColorStop(0.5, accent);

        g.addColorStop(1, "rgba(255,255,255,0)");

        x.globalAlpha = 0.12 + Math.random() * 0.18;

        x.fillStyle = g;

        x.fillRect(0, y, 1024, hh);
      }
    }

    for (var i = 0; i < 170; i++) {
      var r = 20 + Math.random() * 110;

      var cx = Math.random() * 1024;

      var cy = Math.random() * 512;

      var rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);

      rg.addColorStop(0, accent);

      rg.addColorStop(1, "rgba(255,255,255,0)");

      x.globalAlpha = 0.05 + Math.random() * 0.11;

      x.fillStyle = rg;

      x.beginPath();

      x.arc(cx, cy, r, 0, 6.2832);

      x.fill();
    }

    x.globalAlpha = 1;

    var t = new THREE.CanvasTexture(c);

    t.anisotropy = 4;

    return t;
  }

  function glow(color, size, op) {
    var c = document.createElement("canvas");

    c.width = c.height = 256;

    var x = c.getContext("2d");

    var g = x.createRadialGradient(128, 128, 0, 128, 128, 128);

    g.addColorStop(0, "rgba(255,255,255,.5)");

    g.addColorStop(0.2, color.replace("rgb", "rgba").replace(")", ",.4)"));

    g.addColorStop(1, "rgba(0,0,0,0)");

    x.fillStyle = g;

    x.fillRect(0, 0, 256, 256);

    var s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c),

        blending: THREE.AdditiveBlending,

        depthWrite: false,

        transparent: true,

        opacity: op === undefined ? 0.8 : op,
      }),
    );

    s.scale.set(size, size, 1);

    return s;
  }

  /* =========================================================
       STARS
    ========================================================== */

  var starLayers = [];

  function stars(n, spread, size, op) {
    var geo = new THREE.BufferGeometry();

    var pos = new Float32Array(n * 3);

    for (var i = 0; i < n; i++) {
      var r = spread * (0.45 + Math.random() * 0.55);

      var th = Math.random() * 6.2832;

      var ph = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);

      pos[i * 3 + 1] = r * Math.cos(ph) * 0.6;

      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    var points = new THREE.Points(
      geo,

      new THREE.PointsMaterial({
        color: 0xdce8ff,

        size: size,

        transparent: true,

        opacity: op,

        depthWrite: false,

        sizeAttenuation: true,
      }),
    );

    scene.add(points);

    starLayers.push(points);
  }

  stars(small ? 800 : 2000, 1000, 1.9, 0.72);

  stars(small ? 450 : 1100, 560, 1.2, 0.42);

  /* =========================================================
       NEBULAE
    ========================================================== */

  function nebula(color, x, y, z, size, rot) {
    var c = document.createElement("canvas");

    c.width = c.height = 512;

    var g2 = c.getContext("2d");

    for (var i = 0; i < 24; i++) {
      var cx = 256 + (Math.random() - 0.5) * 300;

      var cy = 256 + (Math.random() - 0.5) * 300;

      var r = 60 + Math.random() * 180;

      var g = g2.createRadialGradient(cx, cy, 0, cx, cy, r);

      g.addColorStop(0, color);

      g.addColorStop(1, "rgba(0,0,0,0)");

      g2.globalAlpha = 0.09 + Math.random() * 0.12;

      g2.fillStyle = g;

      g2.beginPath();

      g2.arc(cx, cy, r, 0, 6.2832);

      g2.fill();
    }

    var m = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),

      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(c),

        transparent: true,

        blending: THREE.AdditiveBlending,

        depthWrite: false,

        opacity: 0.85,
      }),
    );

    m.position.set(x, y, z);

    m.rotation.z = rot;

    scene.add(m);
  }

  nebula("rgba(70,110,255,1)", -200, 70, -300, 780, 0.4);

  nebula("rgba(126,80,255,1)", 260, -60, -420, 880, 1.2);

  nebula("rgba(40,170,170,1)", -120, -80, 110, 520, 2.1);

  /* =========================================================
       LIGHTS
    ========================================================== */

  scene.add(new THREE.AmbientLight(0x6e86b8, 1.5));

  var key = new THREE.DirectionalLight(0xe2ecff, 3.0);

  key.position.set(-70, 55, 70);

  scene.add(key);

  var rim = new THREE.DirectionalLight(0x8a6bff, 0.8);

  rim.position.set(80, -40, -80);

  scene.add(rim);

  /* =========================================================
       FIVE WORLDS
    ========================================================== */

  var HUB = new THREE.Vector3(30, 0, -26);

  var STAGES = [
    {
      q: window.OrbitHomeLocale.t("WHY?"),

      r: 8.0,

      orbit: 34,

      ang: 2.55,

      tilt: 0.22,

      col: "#1D3A74",

      acc: "rgba(160,195,255,1)",

      glow: "rgb(91,140,255)",

      bands: false,

      text: window.OrbitHomeLocale.t(
        "A reason to care comes before a definition. Students start curious, teachers set the hook, schools see the intent.",
      ),
    },

    {
      q: window.OrbitHomeLocale.t("WHAT IF?"),

      r: 9.5,

      orbit: 46,

      ang: 1.62,

      tilt: -0.16,

      col: "#2E2456",

      acc: "rgba(196,165,255,1)",

      glow: "rgb(138,107,255)",

      bands: true,

      ring: true,

      text: window.OrbitHomeLocale.t(
        "Try the idea before being told the answer. Students experiment, teachers watch the thinking, schools see real practice.",
      ),
    },

    {
      q: window.OrbitHomeLocale.t("HOW?"),

      r: 7.2,

      orbit: 58,

      ang: 0.74,

      tilt: 0.3,

      col: "#15463C",

      acc: "rgba(130,240,200,1)",

      glow: "rgb(57,192,139)",

      bands: false,

      text: window.OrbitHomeLocale.t(
        "Step by step, at the right level. Students follow it, teachers build it in minutes, schools keep it on curriculum.",
      ),
    },

    {
      q: window.OrbitHomeLocale.t("DID IT WORK?"),

      r: 10.5,

      orbit: 70,

      ang: -0.18,

      tilt: -0.26,

      col: "#4A3A17",

      acc: "rgba(255,215,145,1)",

      glow: "rgb(201,162,39)",

      bands: true,

      ring: true,

      text: window.OrbitHomeLocale.t(
        "A result split by skill. Students see where they slipped, teachers see who slipped, schools see which class slipped.",
      ),
    },

    {
      q: window.OrbitHomeLocale.t("WHAT'S NEXT?"),

      r: 12.0,

      orbit: 84,

      ang: -1.1,

      tilt: 0.12,

      col: "#5A2436",

      acc: "rgba(255,170,190,1)",

      glow: "rgb(230,110,140)",

      bands: false,

      text: window.OrbitHomeLocale.t(
        "Gaps become next steps. Students get practice, teachers get a plan, schools get a trend they can act on.",
      ),
    },
  ];

  /* =========================================================
       MOONS
    ========================================================== */

  var MOONS = [
    [
      {
        n: window.OrbitHomeLocale.t("The hook"),
        t: window.OrbitHomeLocale.t("A question the class actually argues about."),
      },

      {
        n: window.OrbitHomeLocale.t("The objective"),
        t: window.OrbitHomeLocale.t("What you should be able to do by the end, in one line."),
      },

      {
        n: window.OrbitHomeLocale.t("Where it fits"),
        t: window.OrbitHomeLocale.t("The unit and the lesson before it, so nothing feels random."),
      },
    ],

    [
      {
        n: window.OrbitHomeLocale.t("Interactive lab"),
        t: window.OrbitHomeLocale.t("Change the values yourself and watch the outcome move."),
      },

      {
        n: window.OrbitHomeLocale.t("Your prediction"),
        t: window.OrbitHomeLocale.t("Say what you expect before you test it."),
      },

      {
        n: window.OrbitHomeLocale.t("Shared result"),
        t: window.OrbitHomeLocale.t("Send what you found straight to your teacher."),
      },
    ],

    [
      {
        n: window.OrbitHomeLocale.t("At your level"),
        t: window.OrbitHomeLocale.t(
          "Beginner, intermediate or advanced. Same lesson, different depth.",
        ),
      },

      {
        n: window.OrbitHomeLocale.t("Worked example"),
        t: window.OrbitHomeLocale.t("Solved step by step, taken from your own curriculum."),
      },

      {
        n: window.OrbitHomeLocale.t("Short video"),
        t: window.OrbitHomeLocale.t("Five minutes, recorded by the teacher you already know."),
      },
    ],

    [
      {
        n: window.OrbitHomeLocale.t("Scored by skill"),
        t: window.OrbitHomeLocale.t("Every question carries one skill, so a result can be read."),
      },

      {
        n: window.OrbitHomeLocale.t("The gap"),
        t: window.OrbitHomeLocale.t("One weak skill, named. Not a number out of ten."),
      },

      {
        n: window.OrbitHomeLocale.t("Class view"),
        t: window.OrbitHomeLocale.t("The teacher sees who slipped, not just the average."),
      },
    ],

    [
      {
        n: window.OrbitHomeLocale.t("Targeted practice"),
        t: window.OrbitHomeLocale.t("Three questions on the one skill that slipped."),
      },

      {
        n: window.OrbitHomeLocale.t("Retry"),
        t: window.OrbitHomeLocale.t("The same skill, new questions, until it is met."),
      },

      {
        n: window.OrbitHomeLocale.t("Rejoin"),
        t: window.OrbitHomeLocale.t("The branch closes and the path carries on."),
      },
    ],
  ];

  /* =========================================================
       PLANETS
    ========================================================== */

  var fadeables = [];

  var pickables = [];

  STAGES.forEach(function (s, i) {
    var g = new THREE.Group();

    var body = new THREE.Mesh(
      new THREE.SphereGeometry(s.r, small ? 32 : 56, small ? 32 : 56),

      new THREE.MeshStandardMaterial({
        map: surface(s.col, s.acc, s.bands),

        roughness: 0.92,

        metalness: 0.05,

        transparent: true,

        opacity: 1,
      }),
    );

    body.userData.stage = i;

    g.add(body);

    pickables.push(body);

    /* Atmosphere */

    var atmo = new THREE.Mesh(
      new THREE.SphereGeometry(s.r * 1.15, 36, 36),

      new THREE.ShaderMaterial({
        uniforms: {
          c: {
            value: new THREE.Color(s.glow),
          },

          p: {
            value: 1.0,
          },
        },

        vertexShader:
          "varying vec3 vN;" +
          "void main(){" +
          "vN=normalize(normalMatrix*normal);" +
          "gl_Position=projectionMatrix*" +
          "modelViewMatrix*" +
          "vec4(position,1.0);" +
          "}",

        fragmentShader:
          "uniform vec3 c;" +
          "uniform float p;" +
          "varying vec3 vN;" +
          "void main(){" +
          "float i=pow(.62-" +
          "dot(vN,vec3(0.,0.,1.)),2.6);" +
          "gl_FragColor=vec4(c,1.)*" +
          "clamp(i,0.,1.6)*p;" +
          "}",

        side: THREE.BackSide,

        blending: THREE.AdditiveBlending,

        transparent: true,

        depthWrite: false,
      }),
    );

    g.add(atmo);

    /* Halo */

    var halo = glow(s.glow, s.r * 6, 0.75);

    g.add(halo);

    /* Ring */

    if (s.ring) {
      var rc = document.createElement("canvas");

      rc.width = 256;
      rc.height = 8;

      var rx = rc.getContext("2d");

      for (var k = 0; k < 256; k++) {
        rx.fillStyle =
          "rgba(230,240,255," + (Math.random() * 0.5 + (k % 9 === 0 ? 0.3 : 0.05)).toFixed(2) + ")";

        rx.fillRect(k, 0, 1, 8);
      }

      var ring = new THREE.Mesh(
        new THREE.RingGeometry(s.r * 1.55, s.r * 2.4, 96),

        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(rc),

          transparent: true,

          opacity: 0.38,

          side: THREE.DoubleSide,

          blending: THREE.AdditiveBlending,

          depthWrite: false,
        }),
      );

      ring.rotation.x = Math.PI / 2 - 0.4;

      ring.rotation.y = 0.18;

      g.add(ring);

      s.ringMesh = ring;
    }

    scene.add(g);

    /* Orbit */

    var pts = [];

    for (var a = 0; a <= 64; a++) {
      var t = (a / 64) * 6.2832;

      pts.push(
        new THREE.Vector3(
          Math.cos(t) * s.orbit,

          Math.sin(t) * s.orbit * s.tilt,

          Math.sin(t) * s.orbit,
        ),
      );
    }

    var line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),

      new THREE.LineBasicMaterial({
        color: 0x6e93e0,

        transparent: true,

        opacity: 0.1,

        blending: THREE.AdditiveBlending,
      }),
    );

    line.position.copy(HUB);

    scene.add(line);

    s.group = g;

    s.body = body;

    s.atmo = atmo;

    s.halo = halo;

    s.line = line;

    s.scaleNow = 1;

    s.scaleTo = 1;

    s.lineTo = 0.1;

    s.lineNow = 0.1;

    s.dimTo = 1;

    s.dimNow = 1;

    s.spin = 0.0016 + i * 0.0003;

    fadeables.push(s);
  });

  /* =========================================================
       MOONS
    ========================================================== */

  var moonPick = [];

  STAGES.forEach(function (s, i) {
    s.moons = MOONS[i].map(function (m, j) {
      var size = Math.max(1.15, s.r * 0.135);

      var mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 20, 20),

        new THREE.MeshStandardMaterial({
          color: new THREE.Color(s.glow).lerp(new THREE.Color(0xffffff), 0.55),

          emissive: new THREE.Color(s.glow),

          emissiveIntensity: 0.5,

          roughness: 0.6,

          metalness: 0.1,

          transparent: true,

          opacity: 0,
        }),
      );

      mesh.visible = false;

      mesh.userData.moon = {
        stage: i,

        idx: j,
      };

      s.group.add(mesh);

      moonPick.push(mesh);

      var el = document.createElement("div");

      el.className = "u-label u-moon is-off";

      el.textContent = m.n;

      stage.appendChild(el);

      return {
        mesh: mesh,

        el: el,

        name: m.n,

        text: m.t,

        R: s.r * (2.15 + j * 0.42),

        ang: j * 2.1,

        ty: 0.34 + j * 0.18,

        tz: -0.5 + j * 0.5,

        speed: 0.0042 - j * 0.0008,

        op: 0,

        opTo: 0,

        pop: 1,
      };
    });
  });

  /* =========================================================
       PLANET LABELS
    ========================================================== */

  var labelHost = stage;

  STAGES.forEach(function (s, i) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "u-label";
    el.textContent = s.q;
    el.setAttribute("aria-label", s.q);
    el.addEventListener("click", function () {
      openStage(i);
      wake();
    });
    el.addEventListener("pointerenter", function () {
      s.locked = true;
      wake();
    });
    el.addEventListener("pointerleave", function () {
      s.locked = false;
      wake();
    });
    el.addEventListener("focus", wake);
    el.addEventListener("blur", wake);
    labelHost.appendChild(el);
    s.label = el;
  });

  /* =========================================================
       INTERACTION
    ========================================================== */

  var ray = new THREE.Raycaster();

  var ptr = new THREE.Vector2(-5, -5);

  var hover = -1;

  var focused = -1;

  var moonHover = -1;

  function setMoonLine(txt) {
    var el = document.getElementById("q-moon");

    if (!el) return;

    if (txt) {
      el.textContent = txt;

      el.classList.add("on");
    } else {
      el.classList.remove("on");
    }
  }

  /* =========================================================
       RESET ROLES
    ========================================================== */

  function resetRoles() {
    var rowEl = document.getElementById("q-row");

    var rolesEl = document.getElementById("q-roles");

    if (!rowEl || !rolesEl) return;

    rowEl.classList.remove("gone");

    rolesEl.classList.remove("on");

    Array.prototype.forEach.call(
      rolesEl.querySelectorAll(".u-role"),

      function (b) {
        b.classList.remove("picked");
      },
    );
  }

  /* =========================================================
       UI ELEMENTS
    ========================================================== */

  var panel = document.getElementById("panel");

  var focusEl = document.getElementById("focus");

  var backEl = document.getElementById("back");

  var qStep = document.getElementById("q-step");

  var qTitle = document.getElementById("q-title");

  var qText = document.getElementById("q-text");

  /* =========================================================
       POINTER MOVE
    ========================================================== */

  canvas.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();

    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;

    ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  });

  canvas.addEventListener("pointerleave", function () {
    ptr.set(-5, -5);
  });

  /* =========================================================
       CLICK PLANET
    ========================================================== */

  canvas.addEventListener("click", function (event) {
    var bounds = canvas.getBoundingClientRect();
    ptr.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      1 - ((event.clientY - bounds.top) / bounds.height) * 2,
    );
    ray.setFromCamera(ptr, camera);
    if (focused >= 0) {
      var moons = ray.intersectObjects(
        STAGES[focused].moons.map(function (m) {
          return m.mesh;
        }),
        false,
      );
      if (moons.length) {
        setMoonLine(STAGES[focused].moons[moons[0].object.userData.moon.idx].text);
        wake();
        return;
      }
    }
    var hits = ray.intersectObjects(pickables, false);
    if (hits.length) openStage(hits[0].object.userData.stage);
    wake();
  });

  /* =========================================================
       OPEN STAGE
    ========================================================== */

  window.OrbitJourney = { open: openStage, close: closeStage, current: () => focused };
  function openStage(i) {
    wake();

    focused = i;

    var s = STAGES[i];

    qStep.textContent = window.OrbitHomeLocale.t("Stage " + (i + 1) + " of " + STAGES.length);

    qTitle.textContent = s.q;

    qText.textContent = s.text;

    focusEl.classList.add("on");

    panel.classList.add("hide");

    backEl.classList.add("on");

    STAGES.forEach(function (t) {
      t.label.classList.remove("is-hot");
    });

    hover = -1;

    moonHover = -1;

    canvas.style.cursor = "default";

    resetRoles();

    setMoonLine("");
  }

  /* =========================================================
       CLOSE STAGE
    ========================================================== */

  function closeStage() {
    wake();

    focused = -1;

    focusEl.classList.remove("on");

    panel.classList.remove("hide");

    backEl.classList.remove("on");

    hover = -1;

    moonHover = -1;

    resetRoles();

    setMoonLine("");
  }

  /* =========================================================
       BACK BUTTON
    ========================================================== */

  backEl.addEventListener("click", closeStage);

  /* =========================================================
       NEXT QUESTION
    ========================================================== */

  document.getElementById("q-next").addEventListener("click", function () {
    openStage((focused + 1) % STAGES.length);
  });

  /* =========================================================
       ROLE BUTTONS
    ========================================================== */

  var rowEl = document.getElementById("q-row");

  var rolesEl = document.getElementById("q-roles");

  document.getElementById("q-enter").addEventListener("click", function () {
    rowEl.classList.add("gone");

    rolesEl.classList.add("on");
  });

  Array.prototype.forEach.call(
    rolesEl.querySelectorAll(".u-role"),

    function (b) {
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(
          rolesEl.querySelectorAll(".u-role"),

          function (x) {
            x.classList.remove("picked");
          },
        );

        b.classList.add("picked");
      });
    },
  );

  /* =========================================================
       ESCAPE
    ========================================================== */

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && focused >= 0) {
      closeStage();
    }
  });

  /* =========================================================
       CAMERA
    ========================================================== */

  var HOME = new THREE.Vector3(-34, 16, 128);

  var START = new THREE.Vector3(-90, 70, 460);

  var FOCUS_AT = new THREE.Vector3(40, 0, -10);

  var CAM_FOCUS = new THREE.Vector3(6, 9, 78);

  var AIM_FOCUS = new THREE.Vector3(29, 1, -12);

  var SLOT_PREV = new THREE.Vector3(-30, 21, -58);

  var SLOT_NEXT = new THREE.Vector3(35, -17, -42);

  var SLOT_AWAY = new THREE.Vector3(0, 0, -300);

  var camPos = START.clone();

  var camAim = HOME.clone();

  var wantPos = new THREE.Vector3();

  var wantAim = new THREE.Vector3();

  var slot = new THREE.Vector3();

  var intro = 0;

  var clock = 0;

  var proj = new THREE.Vector3();

  var mv = new THREE.Vector3();

  var ZAXIS = new THREE.Vector3(0, 0, 1);

  STAGES.forEach(function (s) {
    s.layoutScale = 1;

    s.layoutDim = 1;
  });

  /* =========================================================
       MAIN ANIMATION LOOP
    ========================================================== */

  var raf = 0,
    lastFrame = 0,
    visible = true,
    disposed = false,
    settleFrames = 90,
    orbitBounds = null,
    orbitSignature = "";
  var motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  function wake() {
    if (disposed || !visible || document.hidden || stage.dataset.heroMedia === "cinematic") return;
    settleFrames = 90;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function overviewGeometry() {
    var w = stage.clientWidth,
      h = stage.clientHeight,
      rect = stage.getBoundingClientRect(),
      copy = panel.getBoundingClientRect(),
      mobile = w < 760;
    var rtl = document.documentElement.dir === "rtl";
    orbitBounds = mobile
      ? {
          x: 24,
          y: Math.max(360, copy.bottom - rect.top + 36),
          w: w - 48,
          h: Math.max(260, h - Math.max(360, copy.bottom - rect.top + 36) - 40),
        }
      : rtl
        ? { x: 40, y: 115, w: Math.max(280, w - copy.width - 100), h: h - 175 }
        : {
            x: copy.right - rect.left + 30,
            y: 115,
            w: Math.max(280, w - (copy.right - rect.left) - 65),
            h: h - 175,
          };
    var signature = [w, h, orbitBounds.x, orbitBounds.y, orbitBounds.w, orbitBounds.h].join(":");
    if (signature !== orbitSignature) {
      orbitSignature = signature;
      STAGES.forEach(function (s) {
        s.orbitDirty = true;
      });
    }
  }
  var screenVector = new THREE.Vector3();
  function placeLabel(el, x, y) {
    el.style.left = "0";
    el.style.top = "0";
    el.style.transform = "translate3d(" + x + "px," + y + "px,0) translate(-50%,-50%)";
  }
  function worldAt(x, y) {
    screenVector
      .set((x / stage.clientWidth) * 2 - 1, 1 - (y / stage.clientHeight) * 2, 0.5)
      .unproject(camera);
    return screenVector.sub(camera.position).normalize().multiplyScalar(160).add(camera.position);
  }
  function placeOverview() {
    overviewGeometry();
    var b = orbitBounds,
      mobile = stage.clientWidth < 760,
      columns = mobile ? 2 : 3,
      rows = mobile ? 3 : 2,
      cellW = b.w / columns,
      cellH = b.h / rows;
    STAGES.forEach(function (s, i) {
      var row = Math.floor(i / columns),
        col = i % columns,
        cx = b.x + cellW * (col + 0.5),
        cy = b.y + cellH * (row + 0.5),
        rx = Math.max(8, cellW * 0.21),
        ry = Math.max(10, cellH * 0.24),
        radius = Math.min(mobile ? 23 : 34, cellW * 0.19, cellH * 0.2),
        unit = (2 * 160 * Math.tan((camera.fov * Math.PI) / 360)) / stage.clientHeight;
      s.screenOrbit = { cx: cx, cy: cy, rx: rx, ry: ry };
      s.group.position.copy(worldAt(cx + Math.cos(s.ang) * rx, cy + Math.sin(s.ang) * ry));
      s.layoutScale = (radius * unit) / s.r;
      s.group.scale.setScalar(s.layoutScale);
      s.scaleNow = s.layoutScale;
      if (s.orbitDirty) {
        var a = s.line.geometry.attributes.position;
        for (var j = 0; j < a.count; j++) {
          var angle = (j / (a.count - 1)) * Math.PI * 2,
            v = worldAt(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry);
          a.setXYZ(j, v.x, v.y, v.z);
        }
        a.needsUpdate = true;
        s.line.position.set(0, 0, 0);
        s.line.geometry.computeBoundingSphere();
        s.orbitDirty = false;
      }
    });
  }
  function frame(time) {
    raf = 0;
    if (disposed || !visible || document.hidden || stage.dataset.heroMedia === "cinematic") return;
    var dt = lastFrame ? Math.min((time - lastFrame) / 1000, 0.05) : 1 / 60;
    lastFrame = time;
    var step = dt * 60;
    function damp(value) {
      return slowMotion ? 1 : 1 - Math.pow(1 - value, step);
    }
    if (!slowMotion || settleFrames-- > 0) raf = requestAnimationFrame(frame);

    clock += slowMotion ? 0 : dt;

    if (intro < 1) {
      intro = Math.min(1, intro + dt * 0.27);
    }

    var easeIntro = 1 - Math.pow(1 - intro, 3);

    /* =====================================================
           STARS
        ====================================================== */

    if (!slowMotion) {
      if (starLayers[0]) {
        starLayers[0].rotation.y += 0.000018 * step;

        starLayers[0].rotation.x += 0.000004 * step;
      }

      if (starLayers[1]) {
        starLayers[1].rotation.y -= 0.000028 * step;

        starLayers[1].rotation.z += 0.000006 * step;
      }
    }

    /* =====================================================
           STAGES
        ====================================================== */

    STAGES.forEach(function (s, i) {
      if (focused < 0) {
        /* Overview */

        if (!slowMotion && i !== hover && !s.locked && document.activeElement !== s.label) {
          s.ang += (0.00055 + i * 0.00008) * step;
        }

        s.group.position.set(
          HUB.x + Math.cos(s.ang) * s.orbit,

          HUB.y + Math.sin(s.ang) * s.orbit * s.tilt,

          HUB.z + Math.sin(s.ang) * s.orbit,
        );

        s.layoutScale = 1;

        s.layoutDim = 1;

        s.lineTo = i === hover ? 0.34 : 0.1;
      } else {
        /* Focus mode */

        var d = i - focused;

        if (d === 0) {
          slot.copy(FOCUS_AT);

          s.layoutScale = 1;

          s.layoutDim = 1;
        } else if (d === -1) {
          slot.copy(FOCUS_AT).add(SLOT_PREV);

          s.layoutScale = 0.42;

          s.layoutDim = 0.5;
        } else if (d === 1) {
          slot.copy(FOCUS_AT).add(SLOT_NEXT);

          s.layoutScale = 0.48;

          s.layoutDim = 0.5;
        } else {
          slot.copy(FOCUS_AT).add(SLOT_AWAY);

          s.layoutScale = 0.3;

          s.layoutDim = 0;
        }

        s.group.position.lerp(slot, damp(0.07));

        s.lineTo = 0;
      }

      s.body.rotation.y += slowMotion ? 0 : s.spin * step;

      if (s.ringMesh) {
        s.ringMesh.rotation.z += slowMotion ? 0 : 0.0006 * step;
      }
    });

    /* =====================================================
           MOONS
        ====================================================== */

    STAGES.forEach(function (s, i) {
      s.moons.forEach(function (m, j) {
        m.opTo = focused === i ? 1 : 0;

        m.op += (m.opTo - m.op) * damp(0.07);

        m.mesh.visible = m.op > 0.02;

        m.mesh.material.opacity = m.op;

        if (!m.mesh.visible) {
          m.el.classList.add("is-off");

          return;
        }

        if (!slowMotion) {
          m.ang += m.speed * step;
        }

        mv.set(
          Math.cos(m.ang) * m.R,

          Math.sin(m.ang) * m.R * m.ty,

          Math.sin(m.ang) * m.R,
        );

        mv.applyAxisAngle(ZAXIS, m.tz);

        m.mesh.position.copy(mv);

        var isHot = moonHover === j && focused === i;

        m.pop += ((isHot ? 1.55 : 1) - m.pop) * damp(0.12);

        m.mesh.scale.setScalar(m.pop);

        m.mesh.material.emissiveIntensity = isHot ? 1.25 : 0.5;

        m.mesh.getWorldPosition(mv);

        mv.y += 3.4 * m.pop;

        mv.project(camera);

        placeLabel(
          m.el,
          (mv.x * 0.5 + 0.5) * stage.clientWidth,
          (-mv.y * 0.5 + 0.5) * stage.clientHeight,
        );

        m.el.classList.toggle("is-off", mv.z > 1 || m.op < 0.5);

        m.el.classList.toggle("is-hot", isHot);
      });
    });

    /* =====================================================
           PICKING
        ====================================================== */

    if (intro > 0.85) {
      ray.setFromCamera(ptr, camera);

      var mh =
        focused >= 0
          ? ray.intersectObjects(
              STAGES[focused].moons.map(function (m) {
                return m.mesh;
              }),

              false,
            )
          : [];

      var nextMoon = mh.length ? mh[0].object.userData.moon.idx : -1;

      if (nextMoon !== moonHover) {
        moonHover = nextMoon;

        setMoonLine(moonHover >= 0 ? STAGES[focused].moons[moonHover].text : "");
      }

      var hit = moonHover >= 0 ? [] : ray.intersectObjects(pickables, false);

      var next = -1;

      for (var n = 0; n < hit.length; n++) {
        var idx = hit[n].object.userData.stage;

        if (STAGES[idx].layoutDim > 0.25 && idx !== focused) {
          next = idx;

          break;
        }
      }

      if (next !== hover) {
        hover = next;

        canvas.style.cursor = hover >= 0 || moonHover >= 0 ? "pointer" : "default";

        STAGES.forEach(function (s, k) {
          s.label.classList.toggle("is-hot", k === hover);
        });
      }
    }

    /* =====================================================
           REACTIVE PROPERTIES
        ====================================================== */

    STAGES.forEach(function (s, k) {
      s.scaleTo = s.layoutScale * (k === hover ? 1.14 : 1);

      s.dimTo = s.layoutDim * (k === hover ? 1.15 : 1);

      s.scaleNow += (s.scaleTo - s.scaleNow) * damp(0.09);

      s.dimNow += (Math.min(s.dimTo, 1) - s.dimNow) * damp(0.055);

      s.lineNow += (s.lineTo - s.lineNow) * damp(0.07);

      s.group.scale.setScalar(s.scaleNow);

      s.line.material.opacity = s.lineNow;

      s.line.visible = s.lineNow > 0.01;

      s.body.material.opacity = s.dimNow;

      s.body.visible = s.dimNow > 0.02;

      var lift = k === hover ? 1.5 : 1;

      s.atmo.material.uniforms.p.value = s.dimNow * lift;

      s.halo.material.opacity = 0.75 * s.dimNow * (k === hover ? 1.35 : 1);

      if (s.ringMesh) {
        s.ringMesh.material.opacity = 0.38 * s.dimNow;
      }
    });

    /* =====================================================
           CAMERA
        ====================================================== */

    if (focused >= 0) {
      wantPos.copy(CAM_FOCUS);

      wantAim.copy(AIM_FOCUS);
    } else {
      wantPos.copy(START).lerp(HOME, easeIntro);

      wantPos.copy(HOME);
      wantAim.copy(HUB);
    }

    var k2 = intro < 1 ? 1 : damp(0.055);

    camPos.lerp(wantPos, k2);

    camAim.lerp(wantAim, k2);

    camera.position.copy(camPos);

    camera.lookAt(camAim);

    camera.updateMatrixWorld();
    if (focused < 0) placeOverview();
    /* =====================================================
           LABELS
        ====================================================== */

    STAGES.forEach(function (s, k) {
      proj.copy(s.group.position);

      proj.y += s.r * 1.6 * s.scaleNow;

      proj.project(camera);

      var shown = proj.z < 1 && intro > 0.8 && s.layoutDim > 0.25 && k !== focused;

      placeLabel(
        s.label,
        (proj.x * 0.5 + 0.5) * stage.clientWidth,
        (-proj.y * 0.5 + 0.5) * stage.clientHeight,
      );

      s.label.classList.toggle("is-off", !shown);
    });

    /* =====================================================
           RENDER
        ====================================================== */

    renderer.render(scene, camera);
  }

  /* =========================================================
       EVENTS
    ========================================================== */

  window.addEventListener("resize", resize);

  resize();

  if (slowMotion) {
    intro = 1;

    camPos.copy(HOME);
  }

  var viewObserver = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (!visible) {
      cancelAnimationFrame(raf);
      raf = 0;
      lastFrame = 0;
    } else wake();
  });
  viewObserver.observe(stage);
  var sizeObserver = new ResizeObserver(function () {
    resize();
    orbitSignature = "";
    wake();
  });
  sizeObserver.observe(stage);
  function visibility() {
    if (document.hidden || stage.dataset.heroMedia === "cinematic") {
      cancelAnimationFrame(raf);
      raf = 0;
      lastFrame = 0;
    } else wake();
  }
  stage.addEventListener("orbit:hero-mode", visibility);
  function preference() {
    slowMotion = motionQuery.matches;
    intro = 1;
    wake();
  }
  document.addEventListener("visibilitychange", visibility);
  motionQuery.addEventListener("change", preference);
  canvas.addEventListener("pointermove", wake, { passive: true });
  canvas.addEventListener("pointerleave", wake);
  addEventListener("pagehide", function (event) {
    cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = 0;
    if (event.persisted) return;
    disposed = true;
    stage.removeEventListener("orbit:hero-mode", visibility);
    viewObserver.disconnect();
    sizeObserver.disconnect();
    motionQuery.removeEventListener("change", preference);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("resize", resize);
    scene.traverse(function (obj) {
      obj.geometry?.dispose();
      var materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach(function (mat) {
        if (!mat) return;
        Object.values(mat).forEach(function (value) {
          if (value?.isTexture) value.dispose();
        });
        mat.dispose();
      });
    });
    renderer.dispose();
  });
  addEventListener("pageshow", function () {
    if (!disposed) wake();
  });
  intro = 1;
  camPos.copy(HOME);
  camAim.copy(HUB);
  camera.position.copy(HOME);
  camera.lookAt(HUB);
  camera.updateMatrixWorld();
  wake();
};
if (document.getElementById("hero")?.dataset.heroMedia !== "cinematic") window.OrbitInitHeroScene();
