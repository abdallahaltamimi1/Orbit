"use strict";
const O = ORBIT,
  { t } = O;
const experiments = {
  pendulum: {
    name: ["Pendulum", "البندول"],
    symbol: "◉",
    formula: "θ″ = −(g/L) sin θ",
    desc: [
      "Explore how length changes oscillation time. The mass does not affect the ideal period.",
      "استكشف أثر طول الخيط على زمن الاهتزاز. الكتلة لا تغيّر الزمن الدوري المثالي.",
    ],
    notes: [
      "No air drag. The period formula uses a small-angle approximation; motion uses the nonlinear pendulum equation.",
      "نهمل مقاومة الهواء. معادلة الزمن الدوري تقريب للزاوية الصغيرة؛ الحركة تستخدم معادلة البندول غير الخطية.",
    ],
    controls: [
      ["length", ["Length (m)", "الطول (m)"], 0.5, 3, 1.5, 0.1],
      ["angle", ["Initial angle (°)", "الزاوية الأولية (°)"], 5, 45, 20, 1],
    ],
  },
  spring: {
    name: ["Mass on a spring", "كتلة على نابض"],
    symbol: "↕",
    formula: "F = −kx · ω = √(k/m)",
    desc: [
      "Change stiffness and mass, then compare the speed of oscillation.",
      "غيّر الصلابة والكتلة وقارن سرعة الاهتزاز.",
    ],
    notes: [
      "Ideal vertical spring. Displacement is measured from equilibrium and damping is neglected.",
      "نابض رأسي مثالي. الإزاحة مقاسة من نقطة الاتزان مع إهمال التخميد.",
    ],
    controls: [
      ["mass", ["Mass (kg)", "الكتلة (kg)"], 0.5, 5, 2, 0.1],
      ["stiffness", ["Stiffness (N/m)", "الصلابة (N/m)"], 5, 80, 20, 1],
      ["amplitude", ["Amplitude (m)", "السعة (m)"], 0.1, 0.8, 0.4, 0.1],
    ],
  },
  projectile: {
    name: ["Projectile motion", "حركة المقذوف"],
    symbol: "⌁",
    formula: "x = v₀ cos θ · t · y = v₀ sin θ · t − ½gt²",
    desc: [
      "Launch a ball and see how speed and angle change the trajectory.",
      "أطلق كرة وشاهد أثر السرعة والزاوية على المسار.",
    ],
    notes: [
      "Launch and landing at the same height. No air resistance, g = 9.81 m/s².",
      "الإطلاق والهبوط على نفس الارتفاع. نهمل مقاومة الهواء، g = 9.81 m/s².",
    ],
    controls: [
      ["speed", ["Launch speed (m/s)", "سرعة الإطلاق (m/s)"], 5, 25, 15, 1],
      ["angle", ["Angle (°)", "الزاوية (°)"], 10, 80, 45, 1],
    ],
  },
};
let id = new URLSearchParams(location.search).get("experiment"),
  time = 0,
  playing = false,
  last = 0,
  theta = 0,
  angularV = 0,
  values = {},
  canvas,
  ctx,
  animation = 0;
const txt = (a) => t(...a);
function gallery() {
  const diagram = (kind) => {
    const shapes = {
      pendulum:
        '<path d="M150 40H350M250 45L340 210" stroke="#bdcaff" stroke-width="5"/><path d="M150 210Q250 285 350 200" fill="none" stroke="#a581ff" stroke-dasharray="5 8"/><circle cx="340" cy="210" r="25" fill="#97b5dc"/>',
      spring:
        '<path d="M160 35H340" stroke="#b0c6ed" stroke-width="7"/><path d="M250 35V55L230 70L270 85L230 100L270 115L230 130L270 145L230 160L270 175L250 190V210" stroke="#ac8aff" stroke-width="4" fill="none"/><rect x="215" y="210" width="70" height="50" rx="8" fill="#96b2dc"/>',
      projectile:
        '<path d="M50 250H450" stroke="#91a5d4" stroke-width="3"/><path d="M65 245Q250 -90 435 245" stroke="#ac87ff" stroke-width="3" stroke-dasharray="6 8" fill="none"/><circle cx="195" cy="94" r="17" fill="#8ddcff"/>',
    };
    return `<svg viewBox="0 0 500 300" role="img" aria-label="${txt(experiments[kind].name)}"><defs><radialGradient id="bg-${kind}"><stop stop-color="#253764"/><stop offset="1" stop-color="#080e26"/></radialGradient></defs><rect width="500" height="300" fill="url(#bg-${kind})"/><path d="M0 100H500M0 200H500M100 0V300M200 0V300M300 0V300M400 0V300" stroke="#a8bdff" opacity=".08"/>${shapes[kind]}</svg>`;
  };
  const cards = [
    {
      key: "car",
      name: t("Dynamics of car motion", "ديناميكا حركة السيارة"),
      description: t(
        "Investigate net force, acceleration, friction and inclined roads.",
        "استكشف القوة المحصلة والتسارع والاحتكاك على الطرق المائلة.",
      ),
      url: "../car-lab/car-lab.html",
      image: `<figure class="car-science-preview"><img src="./assets/car-scientific-diorama-v1.webp" alt="${t("Illustrative car on a scientific testing track. Applied force points right; friction opposes rightward motion.", "معاينة توضيحية لسيارة على مسار اختبار علمي. القوة نحو اليمين والاحتكاك يعاكس الحركة نحو اليمين.")}" loading="lazy" decoding="async" width="1774" height="887"><svg class="car-preview-forces" viewBox="0 0 500 250" aria-hidden="true"><defs><marker id="car-proof-drive" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#5eead4"/></marker><marker id="car-proof-friction" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#f5cf91"/></marker></defs><g class="car-preview-drive"><path d="M295 62H440" stroke="#5eead4" stroke-width="3" marker-end="url(#car-proof-drive)"/><text x="365" y="48" fill="#ccfbf1" text-anchor="middle">F →</text></g><g class="car-preview-friction"><path d="M260 205H145" stroke="#f5cf91" stroke-width="3" marker-end="url(#car-proof-friction)"/><text x="203" y="192" fill="#ffe3b7" text-anchor="middle">← f</text></g></svg><span class="car-preview-note">${t("Illustrative preview · vectors not to scale", "معاينة توضيحية · الأسهم ليست بمقياس")}</span></figure>`,
      level: t("Intermediate", "متوسط"),
      duration: 15,
      topic: t("Forces & motion", "القوى والحركة"),
      formula: "ΣF = ma",
    },
    ...Object.entries(experiments).map(([key, x]) => ({
      key,
      name: txt(x.name),
      description: txt(x.desc),
      url: "./lab.html?experiment=" + key,
      image: diagram(key),
      level: t("Introductory", "تمهيدي"),
      duration: 10,
      topic: key === "projectile" ? t("Motion", "الحركة") : t("Oscillations", "الاهتزازات"),
      formula:
        key === "pendulum" ? "T ≈ 2π√(L/g)" : key === "spring" ? "F = −kx" : "x = v₀ cos(θ)t",
    })),
  ];
  O.shell(
    t("Interactive laboratories", "المختبرات التفاعلية"),
    `<a class="lab-back" href="${{ student: "../student-dashboard/student-dashboard.html", teacher: "../teacher-dashboard/teacher-dashboard.html", school: "../school-dashboard/school-dashboard.html" }[OrbitAuth.current()?.role] || "../hompage/hompage.html"}">← ${t("Return to my orbit", "العودة إلى مداري")}</a><section class="discovery-hero"><div><span class="lab-kicker">ORBIT / EXPERIMENT STUDIO</span><h2>${t("Curiosity becomes discovery.", "هنا يتحوّل الفضول<br>إلى اكتشاف.")}</h2><p>${t("Change a variable, observe the result, and understand the science. Four working experiments, ready to explore.", "غيّر متغيّرًا، راقب النتيجة، وافهم العلم وراءها. أربع تجارب فعلية بانتظار استكشافك.")}</p><div class="hero-facts"><span>04 ${t("live experiments", "تجارب تفاعلية")}</span><span>↗ ${t("Real-time measurements", "قياسات مباشرة")}</span></div></div><div class="lab-orbital" aria-hidden="true"><div class="orbital-ring ring-one"></div><div class="orbital-ring ring-two"></div><div class="orbital-core">ΣF<span>EXPLORE · OBSERVE</span></div><span class="orbital-point"></span></div></section><section class="lab-browser" aria-labelledby="experiment-heading"><div class="lab-browser-head"><div><span class="lab-kicker">${t("LEARN BY DOING", "تعلّم بالتجربة")}</span><h2 id="experiment-heading">${t("Choose your experiment", "اختر تجربتك")}</h2></div><label class="lab-search">${t("Search experiments", "ابحث عن تجربة")}<input id="experiment-search" type="search" placeholder="${t("Name or scientific topic…", "اسم التجربة أو موضوعها العلمي…")}"></label></div><p id="experiment-count" class="lab-result-count" role="status">${cards.length} ${t("available experiments", "تجارب متاحة")}</p><div class="experiment-grid">${cards.map((card, i) => `<a class="experiment-card" href="${card.url}" data-search="${O.esc(card.name + " " + card.description + " " + card.topic)}"><div class="experiment-image">${card.image}<span class="experiment-number">0${i + 1}</span><span class="experiment-formula" dir="ltr">${card.formula}</span></div><div class="experiment-content"><span class="experiment-topic">${card.topic}</span><h3>${card.name}</h3><p>${card.description}</p><div class="experiment-meta"><span>◷ ${card.duration} ${t("min · suggested", "دقائق · مقترحة")}</span><span>${card.level}</span></div><span class="experiment-action">${t("Start exploration", "ابدأ الاستكشاف")} <span aria-hidden="true">↗</span></span></div></a>`).join("")}</div><p id="lab-empty" role="status" hidden>${t("No matching experiments. Try motion, force or oscillations.", "لا توجد تجارب مطابقة. جرّب البحث عن الحركة أو القوى أو الاهتزازات.")}</p></section>`,
  );
  document.getElementById("experiment-search").addEventListener("input", (e) => {
    const query = e.target.value.trim().toLocaleLowerCase();
    let count = 0;
    document.querySelectorAll(".experiment-card").forEach((card) => {
      card.hidden = !card.dataset.search.toLocaleLowerCase().includes(query);
      if (!card.hidden) count++;
    });
    document.getElementById("lab-empty").hidden = count > 0;
    document.getElementById("experiment-count").textContent =
      count + " " + t("available experiments", "تجارب متاحة");
  });
}
function details() {
  const exp = experiments[id];
  for (const a of exp.controls) values[a[0]] = a[4];
  theta = ((values.angle || 0) * Math.PI) / 180;
  O.shell(
    txt(exp.name),
    `<a class="lab-back" href="./lab.html">← ${t("All experiments", "كل التجارب")}</a><p>${txt(exp.desc)}</p><div class="lab-objective"><strong>${t("Learning objective", "الهدف التعليمي")}</strong><p>${txt(exp.desc)}</p><small>${t("Change one variable at a time. Run, observe the measurements, then reset and compare.", "غيّر متغيّرًا واحدًا كل مرة. شغّل التجربة، راقب القياسات، ثم أعد البداية وقارن.")}</small></div><div class="lab-experiment-workspace"><section class="lab-stage"><div class="simulation-heading"><span>${t("LIVE SIMULATION", "محاكاة مباشرة")}</span><span>${t("Change · observe · compare", "غيّر · راقب · قارن")}</span></div><canvas id="simulation" width="900" height="440" aria-label="${txt(exp.name)}"></canvas><div class="toolbar"><button class="btn" id="run">${t("Run experiment", "تشغيل التجربة")}</button><button class="btn soft" id="reset">${t("Reset", "إعادة البداية")}</button><span id="clock">0.00 s</span></div></section><section class="card experiment-controls"><span class="lab-kicker">${t("YOUR VARIABLES", "متغيّرات تجربتك")}</span><h2>${t("Explore the relationship", "استكشف العلاقة")}</h2><div class="controls-grid">${exp.controls.map((a) => `<label>${txt(a[1])}: <output id="value-${a[0]}">${a[4]}</output><input aria-label="${txt(a[1])}" data-variable="${a[0]}" type="range" min="${a[2]}" max="${a[3]}" value="${a[4]}" step="${a[5]}"></label>`).join("")}</div><h3 class="experiment-equation" dir="ltr">${exp.formula}</h3><span class="lab-kicker">${t("MEASUREMENTS", "القياسات")}</span><p id="measurements" class="value" dir="ltr"></p><p class="muted">${txt(exp.notes)}</p></section></div>`,
  );
  canvas = document.getElementById("simulation");
  ctx = canvas.getContext("2d");
  document.querySelectorAll("[data-variable]").forEach(
    (el) =>
      (el.oninput = () => {
        values[el.dataset.variable] = +el.value;
        document.getElementById("value-" + el.dataset.variable).textContent = el.value;
        reset();
      }),
  );
  document.getElementById("run").onclick = () => {
    if (!playing) {
      if (
        !OrbitSubscriptions.labStart(() => {
          playing = true;
          last = 0;
          scheduleFrame();
        })
      )
        return;
    } else {
      playing = false;
      stopFrames();
    }
    document.getElementById("run").textContent = playing
      ? t("Pause", "إيقاف مؤقت")
      : t("Run experiment", "تشغيل التجربة");
  };
  document.getElementById("reset").onclick = reset;
  draw();
}
function reset() {
  playing = false;
  stopFrames();
  document.getElementById("run").textContent = t("Run experiment", "تشغيل التجربة");
  time = 0;
  theta = ((values.angle || 0) * Math.PI) / 180;
  angularV = 0;
  draw();
}
function line(x1, y1, x2, y2, color = "#9faecc", width = 3) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function sphere(x, y, r) {
  let gradient = ctx.createRadialGradient(x - r / 3, y - r / 3, 1, x, y, r);
  gradient.addColorStop(0, "#f2f7ff");
  gradient.addColorStop(0.45, "#94b1d7");
  gradient.addColorStop(1, "#324d79");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function draw() {
  ctx.clearRect(0, 0, 900, 440);
  ctx.strokeStyle = "#ffffff10";
  ctx.lineWidth = 1;
  for (let x = 0; x < 900; x += 50) line(x, 0, x, 440, "#ffffff0d", 1);
  for (let y = 0; y < 440; y += 50) line(0, y, 900, y, "#ffffff0d", 1);
  let readout;
  if (id === "pendulum") {
    let L = values.length * 90,
      x = 450 + L * Math.sin(theta),
      y = 60 + L * Math.cos(theta);
    line(370, 55, 530, 55, "#b5c4db", 8);
    ctx.setLineDash([4, 7]);
    line(450, 60, 450, 360, "#899cb6", 1);
    ctx.setLineDash([]);
    line(450, 60, x, y, "#d7e1f0", 3);
    sphere(x, y, 23);
    sphere(450, 60, 5);
    readout =
      "T ≈ " +
      (2 * Math.PI * Math.sqrt(values.length / 9.81)).toFixed(2) +
      " s · θ = " +
      ((theta * 180) / Math.PI).toFixed(1) +
      "°";
  } else if (id === "spring") {
    const w = Math.sqrt(values.stiffness / values.mass),
      displacement = values.amplitude * Math.cos(w * time),
      y = 250 + displacement * 120;
    line(365, 45, 535, 45, "#d8e3f6", 8);
    ctx.strokeStyle = "#bfa0ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(450, 45);
    for (let i = 0; i <= 24; i++) ctx.lineTo(450 + (i % 2 ? 18 : -18), 65 + ((y - 80) * i) / 24);
    ctx.lineTo(450, y);
    ctx.stroke();
    let g = ctx.createLinearGradient(410, y, 490, y + 50);
    g.addColorStop(0, "#e3edff");
    g.addColorStop(1, "#51678d");
    ctx.fillStyle = g;
    ctx.fillRect(412, y, 76, 50);
    ctx.setLineDash([5, 8]);
    line(300, 250, 600, 250, "#ffffff55", 1);
    ctx.setLineDash([]);
    readout =
      "T = " +
      ((2 * Math.PI) / w).toFixed(2) +
      " s · x = " +
      displacement.toFixed(2) +
      " m · F = " +
      (-values.stiffness * displacement).toFixed(2) +
      " N";
  } else {
    const a = (values.angle * Math.PI) / 180,
      v = values.speed,
      flight = (2 * v * Math.sin(a)) / 9.81,
      range = (v * v * Math.sin(2 * a)) / 9.81,
      scale = 740 / Math.max(65, range),
      tt = Math.min(time, flight),
      x = v * Math.cos(a) * tt,
      y = Math.max(0, v * Math.sin(a) * tt - 4.905 * tt * tt);
    line(60, 365, 850, 365, "#b5c4db", 3);
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = "#bfa0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const tau = (flight * i) / 80,
        px = 70 + v * Math.cos(a) * tau * scale,
        py = 365 - (v * Math.sin(a) * tau - 4.905 * tau * tau) * scale;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    sphere(70 + x * scale, 365 - y * scale, 12);
    if (time >= flight && playing) {
      playing = false;
      document.getElementById("run").textContent = t("Run experiment", "تشغيل التجربة");
    }
    readout =
      "x = " +
      x.toFixed(2) +
      " m · y = " +
      y.toFixed(2) +
      " m · R = " +
      range.toFixed(2) +
      " m · t flight = " +
      flight.toFixed(2) +
      " s";
  }
  document.getElementById("measurements").textContent = readout;
  document.getElementById("clock").textContent = time.toFixed(2) + " s";
}
function scheduleFrame() {
  if (!animation && playing && !document.hidden) animation = requestAnimationFrame(frame);
}
function stopFrames() {
  if (animation) cancelAnimationFrame(animation);
  animation = 0;
  last = 0;
}
function frame(now) {
  animation = 0;
  if (!playing || document.hidden) {
    last = 0;
    return;
  }
  const dt = Math.min(0.032, (now - (last || now)) / 1000);
  last = now;
  time += dt;
  if (id === "pendulum") {
    const sub = dt / 4;
    for (let i = 0; i < 4; i++) {
      angularV -= (9.81 / values.length) * Math.sin(theta) * sub;
      theta += angularV * sub;
    }
  }
  draw();
  scheduleFrame();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopFrames();
  else {
    last = 0;
    scheduleFrame();
  }
});
window.addEventListener("pagehide", stopFrames);
window.addEventListener("pageshow", () => {
  last = 0;
  scheduleFrame();
});
experiments[id] ? details() : gallery();

const labTools = document.createElement("div");
labTools.className = "lab-page-tools";
labTools.innerHTML = `<span class="lab-kicker">${t("EXPLORE WITH CURIOSITY", "استكشف بفضول")}</span><button class="btn soft" id="lab-language">${t("العربية", "English")}</button>`;
document.querySelector("#app .lab-back")?.before(labTools);
document.getElementById("lab-language").onclick = () => {
  const prefs = O.get("orbit.student.v1", {});
  prefs.lang = document.documentElement.lang === "ar" ? "en" : "ar";
  O.set("orbit.student.v1", prefs);
  location.reload();
};
