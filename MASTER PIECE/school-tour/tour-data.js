/* Illustrative campus locations; links point to existing product features. */
window.OrbitTourData = [
  {
    id: "overview",
    name: ["Your school, from a new angle", "مدرستك، من زاوية جديدة"],
    description: [
      "A welcoming campus to explore. This is an illustrative school, connected to your existing learning tools.",
      "حرم مدرسي توضيحي، مرتبط بأدوات تعلّمك الحالية. خذ راحتك، وخلي الفضول يدلّك.",
    ],
    position: [-44, 27, 54],
    look: [0, 1, 0],
    marker: [0, 5, 15],
  },
  {
    id: "entrance",
    name: ["The main entrance", "المدخل الرئيسي"],
    description: [
      "A clear route into the school. Follow the central walkway, or choose a place from the navigator.",
      "من هون بتبدأ الجولة. تابع الممر، أو اختَر المكان اللي بدك تستكشفه.",
    ],
    position: [0, 1.75, 25],
    look: [0, 1.8, 14],
    marker: [0, 3, 20],
  },
  {
    id: "corridor",
    name: ["The learning corridor", "ممر التعلّم"],
    description: [
      "Two classrooms open onto this shared corridor. Your real lessons and activities are one choice away.",
      "صفّان مفتوحان على الممر. دروسك وأنشطتك الحالية قريبة، اختَر وجهتك.",
    ],
    position: [0, 1.75, 8],
    look: [0, 1.75, -8],
    marker: [0, 5.4, 3],
    link: "../channels/channels.html",
    action: ["Open my channels", "افتح قنواتي"],
  },
  {
    id: "classroom",
    name: ["The classroom", "صف التعلّم"],
    description: [
      "Desks, daylight and room for the next question. Open the existing lesson library to continue learning.",
      "ضوء وشبابيك، ومساحة للسؤال الجاي. افتح الدروس الموجودة وكمل رحلتك.",
    ],
    position: [-7, 1.75, 6],
    look: [-15, 1.7, -8],
    marker: [-13, 5.6, 0],
    link: "../lessons/lessons.html?level=secondary&subject=physics",
    action: ["Explore lessons", "يلا نتعلّم"],
  },
  {
    id: "practice",
    name: ["The practice classroom", "صف الممارسة"],
    description: [
      "A second classroom for trying what you learned. Continue with the platform’s existing practice activity.",
      "صف ثاني للتجربة والتطبيق. جرّب النشاط الموجود، خطوة صغيرة بتفتح احتمالًا جديدًا.",
    ],
    position: [7, 1.75, 6],
    look: [15, 1.7, -8],
    marker: [13, 5.6, 0],
    link: "../practice/practice.html",
    action: ["Try the activity", "يلا نجرّب"],
  },
  {
    id: "courtyard",
    name: ["The courtyard", "الساحة الخارجية"],
    description: [
      "A quiet gathering space between buildings. Explore the real experiments in the learning lab.",
      "ساحة هادئة بين المباني. قليل من الفضول يفتح عالمًا؛ استكشف تجارب المختبر الموجودة.",
    ],
    position: [0, 1.75, -19],
    look: [0, 1.6, -29],
    marker: [0, 2, -26],
    link: "../lab/lab.html",
    action: ["Explore the lab", "استكشف المختبر"],
  },
  {
    id: "sports",
    name: ["The sports field", "الملعب"],
    description: [
      "Open space, field markings and goalposts. The existing projectile experiment lets you explore speed, angle and the science of movement.",
      "مساحة مفتوحة، خطوط ملعب ومرميان. جرّب تجربة حركة المقذوف الموجودة لتستكشف أثر السرعة والزاوية.",
    ],
    position: [18, 1.75, -22],
    look: [29, 1.1, -33],
    marker: [29, 2.4, -31],
    link: "../lab/lab.html?experiment=projectile",
    action: ["Explore motion", "استكشف الحركة"],
  },
  {
    id: "cafeteria",
    name: ["The cafeteria", "المقصف"],
    description: [
      "A warm place to pause between discoveries. No cafeteria learning activity is published yet; your lessons are always available.",
      "مكان دافئ لوقفة بين الاكتشافات. ما في نشاط تعليمي خاص بالمقصف حاليًا؛ دروسك موجودة وقت ما تحب.",
    ],
    position: [-21, 1.75, -22],
    look: [-27, 1.5, -28],
    marker: [-24, 5.3, -25],
    empty: true,
  },
  {
    id: "library",
    name: ["The library & study area", "المكتبة ومساحة الدراسة"],
    description: [
      "Books, study tables and a quiet place to focus. Open the existing lesson library; teacher-only preparation tools stay private.",
      "رفوف كتب وطاولات دراسة ومكان للتركيز. افتح مكتبة الدروس المتاحة لك؛ أدوات تحضير المعلم تبقى خاصة.",
    ],
    position: [-36, 1.75, 6],
    look: [-36, 1.7, -1],
    marker: [-36, 5, 3],
    link: "../lessons/lessons.html",
    action: ["Open learning library", "افتح مكتبة التعلم"],
  },
  {
    id: "science-lab",
    name: ["The science laboratory", "مختبر العلوم"],
    description: [
      "Lab benches, apparatus and space to investigate. Open the working pendulum experiment, change its length and observe the measured period.",
      "طاولات مختبر وأدوات ومساحة للاستقصاء. افتح تجربة البندول الفعلية، غيّر الطول وراقب زمن الدورة المحسوب.",
    ],
    position: [36, 1.75, 6],
    look: [36, 1.6, -1],
    marker: [36, 5, 3],
    link: "../lab/lab.html?experiment=pendulum",
    action: ["Run the pendulum experiment", "يلا نجرّب البندول"],
  },
  {
    id: "return",
    name: ["One connected campus", "حرم واحد، ووجهات كثيرة"],
    description: [
      "You have seen the school’s spaces. Return to any location, or continue your learning journey from the dashboard.",
      "شفت مساحات المدرسة. ارجع لأي مكان، أو كمل رحلتك التعليمية من لوحة الطالب.",
    ],
    position: [-42, 25, -55],
    look: [0, 1, 0],
    marker: [0, 6, -8],
  },
];

// Destination links use real membership; the surrounding campus remains illustrative.
(() => {
  const user = window.OrbitAuth?.current();
  if (user?.role !== "student") return;
  const get = OrbitAuth.get,
    level = ["primary", "secondary", "university"].includes(OrbitProfiles.current()?.level)
      ? OrbitProfiles.current().level
      : "secondary";
  const channels = get("orbit.channels.v2", {}).channels || [],
    joined = get("orbit.memberships.v3", {})[user.email] || [];
  const room = channels.find((c) => c.private && joined.includes(c.id));
  const id = room?.id || (joined.includes("9b") ? "9b" : null),
    classroom = OrbitTourData.find((l) => l.id === "classroom");
  if (id) {
    classroom.link = "../channel/channel.html?id=" + encodeURIComponent(id);
    classroom.action = ["Open my admitted classroom", "افتح صفي المسجل"];
    classroom.description = [
      "This room is illustrative. Continue into your actual admitted classroom to see members, published lessons and assignments.",
      "هذا المشهد توضيحي. ادخل صفك المسجل فعلًا لمتابعة الأعضاء والدروس والواجبات.",
    ];
  } else {
    classroom.link = "../lessons/lessons.html?level=" + level + "&subject=physics";
  }
  OrbitTourData.find((l) => l.id === "library").link = "../lessons/lessons.html?level=" + level;
})();

OrbitTourData.find((l) => l.id === "science-lab").action = [
  "Enter the interactive laboratory",
  "ادخل المختبر التفاعلي",
];
