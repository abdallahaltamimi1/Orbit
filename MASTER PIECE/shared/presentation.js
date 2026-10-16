/* Fictional presentation records in the existing application; no production claims. */
(() => {
  "use strict";
  const KEY = "orbit.presentation.v1",
    PASSWORD = "OrbitShow2026!",
    PREFIX = "presentation-";
  const teacherId = "presentation.teacher@orbit.local",
    schoolId = "presentation.school@orbit.local";
  const students = [
    "لينا أحمد",
    "عمر خالد",
    "سارة علي",
    "يزن سامر",
    "نور حسن",
    "آدم يوسف",
    "ريم مازن",
    "تالا رائد",
  ].map((name, i) => ({
    name,
    email: `presentation.student${i + 1}@orbit.local`,
    role: "student",
  }));
  const teachers = [
    {
      name: "أحمد عبدالله · تجريبي",
      email: teacherId,
      role: "teacher",
      subject: "physics",
      experience: 8,
    },
    {
      name: "مريم يوسف · تجريبي",
      email: "presentation.math@orbit.local",
      role: "teacher",
      subject: "math",
      experience: 6,
    },
    {
      name: "خالد سامر · تجريبي",
      email: "presentation.science@orbit.local",
      role: "teacher",
      subject: "physics",
      experience: 4,
    },
  ];
  const school = {
    name: "مدرسة الأفق · تجريبية",
    email: schoolId,
    role: "school",
    location: "عمّان",
    contact: "presentation.school@orbit.local",
    type: "private",
    levels: "secondary",
    subjects: "physics,math",
    description:
      "مدرسة افتراضية لعرض التعليم التفاعلي وتوظيف المعلمين. جميع الأشخاص والنتائج بيانات تجريبية.",
  };
  const t = (en, ar) => (document.documentElement.lang === "en" ? en : ar);
  const read = (k, d) => OrbitAuth.get(k, d),
    write = (k, v) => OrbitAuth.set(k, v);
  const manifest = () => read(KEY, null);
  const route = (role) => `../${role}-dashboard/${role}-dashboard.html`;
  const today = (offset) => {
    const d = new Date(Date.now() + offset * 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  async function login(account) {
    const u = await OrbitRecruitment.authenticate(account.email, PASSWORD);
    if (!u || u.role !== account.role)
      throw Error(t("Presentation account could not sign in.", "تعذّر الدخول لحساب العرض."));
    OrbitAuth.startSession(u);
    return u;
  }
  async function diagram() {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 560;
    const c = canvas.getContext("2d");
    c.fillStyle = "#f6f8fc";
    c.fillRect(0, 0, 1000, 560);
    c.fillStyle = "#142b4a";
    c.font = "bold 36px sans-serif";
    c.fillText("Newton’s second law — F = m × a", 55, 80);
    c.font = "24px sans-serif";
    c.fillText("Illustrative worksheet: m = 4 kg, F = 20 N, a = 5 m/s²", 55, 135);
    c.fillStyle = "#08786f";
    c.fillRect(330, 270, 190, 120);
    c.fillStyle = "#fff";
    c.fillText("4 kg", 380, 340);
    c.strokeStyle = "#2563eb";
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(525, 325);
    c.lineTo(780, 325);
    c.lineTo(740, 290);
    c.moveTo(780, 325);
    c.lineTo(740, 360);
    c.stroke();
    c.fillStyle = "#142b4a";
    c.fillText("20 N", 620, 275);
    c.fillText("Fictional student response — demonstration only", 55, 490);
    return new File(
      [await new Promise((r) => canvas.toBlob(r, "image/png"))],
      "force-worksheet.png",
      { type: "image/png" },
    );
  }
  async function clip() {
    try {
      const response = await fetch("../shared/assets/presentation-forces.webm");
      if (response.ok) {
        const blob = await response.blob();
        if (blob.type.startsWith("video/") && blob.size) return blob;
      }
    } catch {}
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const c = canvas.getContext("2d"),
      stream = canvas.captureStream(15),
      chunks = [];
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) =>
      MediaRecorder.isTypeSupported(m),
    );
    if (!mime) {
      stream.getTracks().forEach((track) => track.stop());
      return null;
    }
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const done = new Promise((resolve, reject) => {
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      recorder.onerror = () => reject(Error("VIDEO_RECORDING_FAILED"));
    });
    recorder.start();
    try {
      for (let f = 0; f < 45; f++) {
        c.fillStyle = "#142b4a";
        c.fillRect(0, 0, 960, 540);
        c.fillStyle = "#edf4ff";
        c.font = "bold 40px sans-serif";
        c.fillText("Forces & motion", 50, 80);
        c.font = "25px sans-serif";
        c.fillText("Illustrative teaching animation · F = m × a", 50, 130);
        c.strokeStyle = "#b4c3d8";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(50, 380);
        c.lineTo(910, 380);
        c.stroke();
        const x = 100 + f * 12;
        c.fillStyle = "#22c7a9";
        c.fillRect(x, 260, 110, 110);
        c.fillStyle = "#142b4a";
        c.fillText("4 kg", x + 25, 320);
        c.strokeStyle = "#ffd166";
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(x + 120, 305);
        c.lineTo(x + 230, 305);
        c.lineTo(x + 205, 285);
        c.moveTo(x + 230, 305);
        c.lineTo(x + 205, 325);
        c.stroke();
        c.fillStyle = "#edf4ff";
        c.fillText("Applied force: 20 N", 50, 470);
        await new Promise((r) => setTimeout(r, 67));
      }
    } finally {
      recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
    }
    return done;
  }
  async function support() {
    for (const [global, file] of [
      ["OrbitAssignments", "assignment-service.js"],
      ["OrbitMeetings", "meeting-service.js"],
    ]) {
      if (window[global]) continue;
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "../shared/" + file;
        script.onload = resolve;
        script.onerror = () =>
          reject(
            Error(
              t(
                "Could not load platform service. Refresh and retry.",
                "تعذّر تحميل الخدمة. حدّث الصفحة وحاول مجددًا.",
              ),
            ),
          );
        document.head.append(script);
      });
    }
  }
  function worksheetPDF() {
    const lines = [
      "The Learning Orbit - Illustrative worksheet",
      "Newton second law: F = m x a",
      "1. A 4 kg cart experiences a net force of 20 N.",
      "Calculate the acceleration and include its unit.",
      "2. Double the mass, keeping the force constant.",
      "Explain what happens to the acceleration.",
      "3. Draw the force direction and label your diagram.",
      "4. Compare your prediction with the interactive lab.",
      "Fictional teaching material for the platform presentation.",
    ];
    const stream =
      "BT /F1 14 Tf 50 790 Td " +
      lines
        .map((line, i) => (i ? "0 -32 Td " : "") + "(" + line.replace(/[()\\]/g, "\\$&") + ") Tj")
        .join("\n") +
      " ET";
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
    ];
    let pdf = "%PDF-1.4\n",
      offsets = [0];
    objects.forEach((body, i) => {
      offsets.push(pdf.length);
      pdf += i + 1 + " 0 obj\n" + body + "\nendobj\n";
    });
    const start = pdf.length;
    pdf +=
      "xref\n0 6\n0000000000 65535 f \n" +
      offsets
        .slice(1)
        .map((offset) => String(offset).padStart(10, "0") + " 00000 n \n")
        .join("") +
      "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" +
      start +
      "\n%%EOF";
    return new File([pdf], "forces-worksheet.pdf", { type: "application/pdf" });
  }
  async function prepare(progress = () => {}) {
    const old = manifest();
    if (old?.status === "ready") return old;
    await support();
    if (!["teacher", "school"].includes(OrbitAuth.current()?.role))
      throw Error(
        t("Open from a teacher or school account.", "افتح التجهيز من حساب معلم أو مدرسة."),
      );
    const original = { ...OrbitAuth.current() },
      all = [...teachers, school, ...students];
    const existing = read("orbit.recruitment.v1", {}).accounts || [];
    if (!old && all.some((a) => existing.some((x) => x.email === a.email)))
      throw Error(
        t(
          "Presentation account collision; existing data was not changed.",
          "حساب عرض موجود مسبقًا؛ لم يتم تغيير بياناته.",
        ),
      );
    write(KEY, {
      status: "preparing",
      original,
      accounts: all.map(({ email, name, role }) => ({ email, name, role })),
      startedAt: new Date().toISOString(),
    });
    try {
      progress(t("Preparing profiles…", "جارٍ تجهيز الملفات الشخصية…"));
      for (const a of all) {
        if (!(read("orbit.recruitment.v1", {}).accounts || []).some((x) => x.email === a.email))
          await OrbitRecruitment.registerAccount(
            {
              ...a,
              level: "secondary",
              qualification: a.role === "teacher" ? "بكالوريوس في تخصص التعليم · مؤهل افتراضي" : "",
              teacherLocation: "عمّان",
            },
            PASSWORD,
          );
      }
      for (const a of teachers) {
        await login(a);
        OrbitProfiles.update({
          name: a.name,
          qualification:
            a.subject === "math" ? "بكالوريوس رياضيات · تجريبي" : "بكالوريوس فيزياء · تجريبي",
          bio: "معلم افتراضي يشرح المفاهيم عبر التجارب وحل المشكلات. هذا ملف تجريبي وليس مؤهلًا موثقًا.",
          location: "عمّان",
          address: "عمّان · بيانات عرض",
          subject: a.subject,
          subjects: [a.subject],
          experience: a.experience,
          grades: ["9", "10", "11"],
          skills: ["التعلم التفاعلي", "إدارة الصف", "التقويم التكويني"],
          methods: ["الاستقصاء", "التعلم التعاوني"],
          positions: "تدريس المرحلة الثانوية · خبرة افتراضية لعرض المنصة",
          available: true,
          shareWithSchools: true,
          notifyInterest: true,
        });
      }
      const rooms = [
        {
          id: PREFIX + "physics",
          ar: "تاسع باء · الفيزياء (تجريبي)",
          en: "Grade 9B · Physics (illustrative)",
          private: true,
          teacher: teacherId,
          subject: "physics",
          code: "ORBIT-LIVE-9",
          schoolId,
          descAr: "صف تفاعلي للقوى والحركة: دروس وتجارب وواجبات ومراجعات.",
          descEn: "Forces and motion: lessons, experiments, assignments and feedback.",
        },
        {
          id: PREFIX + "public",
          ar: "استكشف الفيزياء (تجريبي)",
          en: "Explore Physics (illustrative)",
          private: false,
          teacher: teacherId,
          subject: "physics",
          schoolId,
          descAr: "عينات تدريس عامة مختارة للعرض.",
          descEn: "Selected public teaching samples for the presentation.",
        },
        {
          id: PREFIX + "math",
          ar: "الرياضيات · عاشر (تجريبي)",
          en: "Grade 10 · Mathematics (illustrative)",
          private: true,
          teacher: teachers[1].email,
          subject: "math",
          code: "ORBIT-LIVE-10",
          schoolId,
          descAr: "معادلات خطية وتطبيقات واقعية.",
          descEn: "Linear equations and practical applications.",
        },
      ];
      const db = read("orbit.channels.v2", { channels: [], posts: [], comments: {} });
      db.channels ??= [];
      db.posts ??= [];
      db.comments ??= {};
      for (const room of rooms)
        if (!db.channels.some((c) => c.id === room.id))
          db.channels.push({ ...room, createdAt: new Date().toISOString(), demo: true });
      const posts = [
        [
          "newton",
          "lesson",
          rooms[0].id,
          "قوانين نيوتن: من الفكرة إلى التجربة",
          "Newtons laws: from idea to experiment",
          "الأول: يبقى الجسم على حالته ما لم تؤثر قوة محصلة. الثاني: F = m × a. الثالث: لكل فعل رد فعل مساوٍ ومعاكس. جرّب دفع عربة ومقارنة تسارعها عند تغيير كتلتها.",
        ],
        [
          "energy",
          "lesson",
          rooms[0].id,
          "الطاقة الحركية وحفظ الطاقة",
          "Kinetic energy and conservation",
          "طاقة الحركة تساوي نصف الكتلة في مربع السرعة. قارن جسمين لهما الكتلة نفسها وسرعتان مختلفتان، ثم فسّر لماذا تؤثر مضاعفة السرعة أكثر من مضاعفة الكتلة.",
        ],
        [
          "circuit",
          "lesson",
          rooms[1].id,
          "كيف تعمل الدائرة الكهربائية؟",
          "How does an electric circuit work?",
          "تحتاج الدائرة إلى مصدر طاقة وأسلاك ومسار مغلق وحمل كهربائي. افتح مختبر الدوائر وقارن التوصيل على التوالي والتوازي.",
        ],
        [
          "assignment-force",
          "assignment",
          rooms[0].id,
          "واجب: القوى والتسارع (تجريبي)",
          "Assignment: forces and acceleration (illustrative)",
          "كتلة عربة 4 kg وتؤثر عليها قوة محصلة 20 N. احسب التسارع واذكر الوحدة، ثم فسّر أثر مضاعفة الكتلة عند ثبات القوة. أرفق رسمًا يبين اتجاه القوة.",
        ],
        [
          "assignment-energy",
          "assignment",
          rooms[0].id,
          "واجب: مقارنة الطاقة (تجريبي)",
          "Assignment: comparing energy (illustrative)",
          "جسم كتلته 2 kg يتحرك بسرعة 3 m/s. احسب طاقته الحركية. ماذا تصبح الطاقة عند مضاعفة السرعة؟ اعرض خطوات الحل.",
        ],
        [
          "assignment-lab",
          "assignment",
          rooms[0].id,
          "تقرير المختبر: البندول (تجريبي)",
          "Lab report: pendulum (illustrative)",
          "شغّل تجربة البندول، وغيّر الطول إلى 0.5 m ثم 1 m. سجّل زمن الدورة في الحالتين واشرح العلاقة بين الطول وزمن الدورة.",
        ],
        [
          "assignment-math",
          "assignment",
          rooms[2].id,
          "ورقة عمل: المعادلات الخطية (تجريبي)",
          "Worksheet: linear equations (illustrative)",
          "حل 3x + 6 = 21، ثم تحقق بالتعويض. مثّل العلاقة y = 2x + 1 لثلاث قيم مختلفة.",
        ],
        [
          "discussion",
          "discussion",
          rooms[0].id,
          "نقاش: لماذا نستخدم حزام الأمان؟",
          "Discussion: why do we wear seat belts?",
          "اربط حزام الأمان بقانون القصور الذاتي. اقرأ إجابة زميلك وأضف مثالًا من الحياة اليومية.",
        ],
        [
          "announcement",
          "announcement",
          rooms[0].id,
          "خطة التعلم لهذا الأسبوع",
          "This weeks learning plan",
          "نبدأ بقوانين نيوتن، ثم نطبقها في مختبر القوى، وبعدها نسلم ورقة العمل ونناقش الحلول. بيانات الصف والأسماء والنتائج تجريبية.",
        ],
      ];
      for (const [id, type, channel, titleAr, titleEn, bodyAr] of posts)
        if (!db.posts.some((p) => p.id === PREFIX + id))
          db.posts.push({
            id: PREFIX + id,
            type,
            channel,
            title: titleAr,
            titleAr,
            titleEn,
            body: bodyAr,
            bodyAr,
            bodyEn: bodyAr,
            createdAt: new Date().toISOString(),
            demo: true,
            topic: type === "lesson" ? "forces" : "",
            attachments: [],
            ...(type === "assignment"
              ? { dueDate: today(id === "assignment-force" ? -1 : 3) }
              : {}),
          });
      db.comments[PREFIX + "discussion"] ??= [
        {
          user: students[0].name,
          text: "حزام الأمان يمنع استمرار اندفاع الجسم عندما تتوقف السيارة فجأة.",
        },
        {
          user: students[1].name,
          text: "نشاهد القصور الذاتي أيضًا عندما تتحرك الحافلة ويشعر الراكب بأنه يميل للخلف.",
        },
      ];
      write("orbit.channels.v2", db);
      const memberships = read("orbit.memberships.v3", {}),
        classrooms = read("orbit.classrooms.v1", {});
      for (const [i, a] of students.entries()) {
        memberships[a.email] = [
          ...new Set([
            ...(memberships[a.email] || []),
            rooms[0].id,
            rooms[1].id,
            ...(i < 5 ? [rooms[2].id] : []),
          ]),
        ];
        const done =
          i === 0
            ? ["lesson", "practice", "quiz"]
            : i < 4
              ? ["lesson", "practice", "lab", "quiz"]
              : ["lesson"];
        const previous = read("orbit.student.state." + a.email, {});
        if (!previous.presentationSeeded)
          write("orbit.student.state." + a.email, {
            ...previous,
            name: a.name,
            level: "secondary",
            xp: 180 + i * 40,
            done,
            quiz:
              i < 4
                ? {
                    correct: i === 0 ? 2 : 3,
                    score: i === 0 ? 67 : 100,
                    date: new Date().toISOString(),
                  }
                : null,
            presentationSeeded: true,
          });
      }
      write("orbit.memberships.v3", memberships);
      for (const room of rooms.filter((r) => r.private)) {
        if (!classrooms[room.id])
          classrooms[room.id] = {
            slots: 12,
            seats: Object.fromEntries(
              students
                .filter((a) => memberships[a.email].includes(room.id))
                .map((a, i) => [a.email, i]),
            ),
            joinRequests: [],
          };
      }
      write("orbit.classrooms.v1", classrooms);
      const org = read("orbit.school.members.v1", { schema: 1, schools: {} });
      org.schools ??= {};
      org.schools[schoolId] ??= {
        teachers: teachers.map((a) => ({
          id: a.email,
          status: "active",
          permissions: ["publish", "classes", "labs", "reports", "planning"],
        })),
        students: students.map((a) => a.email),
      };
      write("orbit.school.members.v1", org);
      progress(t("Preparing media and student responses…", "جارٍ تجهيز الفيديو وإجابات الطلاب…"));
      await login(teachers[0]);
      const image = await diagram();
      await ORBIT.media(PREFIX + "worksheet", image);
      const pdf = worksheetPDF();
      await ORBIT.media(PREFIX + "worksheet-pdf", pdf);
      const resourceDb = read("orbit.channels.v2", {});
      const worksheetPost = resourceDb.posts.find((p) => p.id === PREFIX + "assignment-force");
      if (worksheetPost && !worksheetPost.attachments.length)
        worksheetPost.attachments.push({
          key: PREFIX + "worksheet-pdf",
          name: "forces-worksheet.pdf",
          type: "application/pdf",
        });
      const explanationPost = resourceDb.posts.find((p) => p.id === PREFIX + "newton");
      if (explanationPost && !explanationPost.attachments.length)
        explanationPost.attachments.push({
          key: PREFIX + "worksheet",
          name: "force-diagram.png",
          type: "image/png",
        });
      write("orbit.channels.v2", resourceDb);
      const videoId = PREFIX + "video";
      let currentDb = read("orbit.channels.v2", {});
      if (!currentDb.posts.some((p) => p.id === videoId)) {
        const video = await clip();
        if (video) {
          await ORBIT.media(PREFIX + "video-asset", video);
          currentDb = read("orbit.channels.v2", {});
          currentDb.posts.push({
            id: videoId,
            channel: rooms[0].id,
            type: "video",
            title: "القوة والحركة · فيديو توضيحي محلي",
            titleAr: "القوة والحركة · فيديو توضيحي محلي",
            titleEn: "Force and motion · local illustrative video",
            body: "حركة عربة تحت تأثير قوة ثابتة. فيديو تعليمي مبسط مولّد للعرض، وليس تسجيلًا لحصة حقيقية.",
            bodyAr: "حركة عربة تحت تأثير قوة ثابتة. فيديو تعليمي مبسط مولّد للعرض.",
            bodyEn: "A locally generated illustrative teaching animation.",
            videoAsset: PREFIX + "video-asset",
            duration: 3,
            topic: "forces",
            attachments: [],
            demo: true,
            createdAt: new Date().toISOString(),
          });
          write("orbit.channels.v2", currentDb);
        }
      }
      for (let i = 0; i < 6; i++) {
        await login(students[i]);
        const id = PREFIX + "assignment-force";
        if (!OrbitAssignments.records(id).length)
          await OrbitAssignments.submit(
            id,
            {
              answer:
                i === 2
                  ? "التسارع = 20 × 4 = 80. أحتاج مراجعة طريقة تطبيق القانون."
                  : "a = F / m = 20 / 4 = 5 m/s². عند مضاعفة الكتلة يصبح التسارع 2.5 m/s² لأن العلاقة عكسية عند ثبات القوة.",
              files: i === 0 ? [image] : [],
              keepKeys: [],
            },
            0,
          );
        if (i < 3 && !OrbitAssignments.records(PREFIX + "assignment-energy").length)
          await OrbitAssignments.submit(
            PREFIX + "assignment-energy",
            {
              answer:
                "الطاقة الحركية = 0.5 × 2 × 3² = 9 J. عند مضاعفة السرعة تصبح 36 J، أي أربعة أمثالها.",
              files: [],
              keepKeys: [],
            },
            0,
          );
      }
      await login(teachers[0]);
      for (let i = 0; i < 3; i++) {
        for (const id of [PREFIX + "assignment-force", PREFIX + "assignment-energy"]) {
          const record = OrbitAssignments.records(id).find(
            (r) => r.studentId === students[i].email,
          );
          if (record && !record.review)
            OrbitAssignments.review(
              id,
              record.studentId,
              {
                grade: i === 2 ? 60 : i === 0 ? 92 : 88,
                feedback:
                  i === 2
                    ? "راجع القانون: التسارع يساوي القوة مقسومة على الكتلة. أعد الحل مع كتابة الوحدات."
                    : "حل واضح وخطوات صحيحة. أضف رسم القوى واذكر الوحدات في كل خطوة. هذه مراجعة تجريبية.",
              },
              record.revision,
            );
        }
      }
      const planKey = "orbit.lesson.plans." + teacherId,
        plans = read(planKey, []);
      for (const [i, topic] of [
        "قوانين نيوتن · تحضير تجريبي",
        "الطاقة الحركية · تحضير تجريبي",
      ].entries()) {
        if (plans.some((p) => p.id === PREFIX + "plan" + i)) continue;
        plans.push({
          id: PREFIX + "plan" + i,
          topic,
          subject: "الفيزياء",
          grade: "التاسع",
          unit: "القوى والطاقة",
          duration: 45,
          sessions: 1,
          country: "الأردن · مثال تعليمي",
          from: today(0),
          to: today(1),
          strategy: "inquiry",
          format: "pdf",
          prior: "تمييز الكتلة عن الوزن والتعرف على وحدة القوة.",
          vertical: "يرتبط بالحركة في الصف السابق.",
          horizontal: "الرياضيات: التعويض والحسابات.",
          worksheet: "عربة كتلتها 4 kg تؤثر عليها قوة 20 N. احسب التسارع ثم مثّل القوى بالرسم.",
          answers: "التسارع 5 m/s². نموذج خاص بالمعلم.",
          videos: "",
          reflection: {
            satisfied: "تفاعل الطلاب مع التجربة الافتراضية.",
            challenges: "التمييز بين القوة والتسارع.",
            improvements: "إضافة أمثلة من حياة الطلاب.",
          },
          follow: [
            {
              date: today(0),
              section: "9B",
              period: "2",
              achieved: "تطبيق F = ma",
              homework: "ورقة عمل القوى",
            },
          ],
          rows: [
            ["التهيئة", 5, "استرجاع مفهوم القوة"],
            ["الشرح", 10, "تفسير قوانين نيوتن"],
            ["التجربة", 15, "تغيير الكتلة وقياس التسارع"],
            ["التقويم", 10, "حل مسألة وتفسير النتيجة"],
            ["الختام", 5, "تلخيص وتكليف ورقة العمل"],
          ].map(([stage, minutes, outcomes]) => ({
            stage,
            minutes,
            outcomes,
            session: 1,
            materials: "مختبر المنصة، ورقة عمل، شاشة",
            strategy: "استقصاء وتعاون",
            assessment: "أسئلة وملاحظة الأداء",
            tool: "بطاقة خروج",
            procedures: outcomes,
          })),
          savedAt: new Date().toISOString(),
          demo: true,
        });
      }
      write(planKey, plans);
      progress(t("Preparing school recruitment and meetings…", "جارٍ تجهيز التوظيف والاجتماعات…"));
      await login(school);
      const jobs = [];
      for (const spec of [
        { title: "معلم فيزياء للمرحلة الثانوية · تجريبي", subject: "physics", experience: 3 },
        { title: "معلم رياضيات · تجريبي", subject: "math", experience: 2 },
      ]) {
        let j = OrbitRecruitment.ownJobs().find((j) => j.title === spec.title);
        if (!j)
          j = OrbitRecruitment.putJob({
            ...spec,
            grades: "9,10",
            qualifications: spec.subject === "math" ? "رياضيات" : "فيزياء",
            skills: "التعلم التفاعلي",
            employment: "full-time",
            location: "عمّان",
            description:
              "فرصة توظيف افتراضية لعرض المطابقة والملف المهني ومراجعة الطلبات. لا تمثل وظيفة حقيقية.",
            status: "published",
          });
        jobs.push(j);
      }
      for (const [i, a] of teachers.entries()) {
        await login(a);
        const job = jobs[i === 1 ? 1 : 0];
        if (!OrbitRecruitment.applications(job.id).length)
          OrbitRecruitment.apply(
            job.id,
            "طلب تجريبي: أشارك نموذج خطة درس وخبرتي في التعليم التفاعلي، وأرغب بعرض ملفي المهني للمدرسة.",
            true,
          );
      }
      await login(school);
      for (const a of OrbitRecruitment.applications()) {
        const state =
          a.teacherId === teacherId
            ? "shortlisted"
            : a.teacherId === teachers[1].email
              ? "accepted"
              : "review";
        if (a.status === "pending") OrbitRecruitment.updateApplication(a.id, state);
      }
      await login(teachers[0]);
      for (const [i, mode] of ["channel", "individual"].entries()) {
        if (
          OrbitMeetings.data().meetings.some(
            (m) =>
              m.teacherId === teacherId &&
              m.title.startsWith(i ? "مراجعة فردية · تجريبي" : "حصة القوى والحركة · تجريبي"),
          )
        )
          continue;
        const start = new Date();
        start.setDate(start.getDate() + 1);
        start.setHours(i ? 16 : 15, 0, 0, 0);
        OrbitMeetings.put({
          channelId: rooms[0].id,
          title: i ? "مراجعة فردية · تجريبي" : "حصة القوى والحركة · تجريبي",
          subject: "الفيزياء",
          description:
            "اجتماع مجدول لتوضيح رحلة المعلم والطالب. الاتصال الفعلي يعتمد على مزود الاجتماع الخارجي.",
          startAt: start.toISOString(),
          endAt: new Date(+start + 45 * 60000).toISOString(),
          type: i ? "consultation" : "lesson",
          status: "scheduled",
          audience: { mode, ...(i ? { studentIds: [students[0].email] } : {}) },
          resources: [],
        });
      }
      const completed = {
        ...manifest(),
        status: "ready",
        preparedAt: new Date().toISOString(),
        mainTeacher: teacherId,
        mainStudent: students[0].email,
        school: schoolId,
        channel: rooms[0].id,
        code: "ORBIT-LIVE-9",
        seedVersion: 1,
      };
      write(KEY, completed);
      return completed;
    } finally {
      OrbitAuth.startSession(original);
    }
  }
  async function switchTo(email) {
    const state = manifest();
    if (!state?.status || state.status !== "ready")
      throw Error(t("Prepare the presentation content first.", "جهّز تفاصيل العرض أولًا."));
    const account = state.accounts.find((a) => a.email === email);
    if (!account) throw Error("INVALID_ACCOUNT");
    const u = await login(account);
    location.href = route(u.role);
  }
  window.OrbitPresentation = { prepare, switchTo, manifest, teacherId, schoolId, students };
  function bar() {
    if (document.getElementById("orbit-presentation-bar") || !OrbitAuth.current() || !window.ORBIT)
      return;
    const state = manifest(),
      teacher = OrbitAuth.current().role === "teacher" || OrbitAuth.current().role === "school";
    if (!state && !teacher) return;
    const node = document.createElement("details");
    node.id = "orbit-presentation-bar";
    node.className = "presentation-bar";
    document.body.classList.add("presentation-active");
    node.innerHTML = `<summary>${t("Presentation content", "تفاصيل العرض")} ${state?.status === "ready" ? "· " + t("Illustrative data", "بيانات تجريبية") : ""}</summary><div class="presentation-controls"><p>${t("Fictional accounts and results. Existing platform pages and actions remain functional. One signed-in account per browser.", "الحسابات والنتائج المضافة تجريبية، والصفحات والإجراءات تعمل فعليًا محليًا. حساب واحد نشط في المتصفح.")}</p>${state?.status === "ready" ? `<label>${t("Open account", "افتح حساب")}<select id="presentation-account"><option value="">${t("Choose an account", "اختر حسابًا")}</option>${state.accounts.map((a) => `<option value="${a.email}">${a.role === "teacher" ? t("Teacher", "معلم") : a.role === "school" ? t("School", "مدرسة") : t("Student", "طالب")} · ${a.name}</option>`).join("")}</select></label><div class="presentation-links">${OrbitAuth.current().email === state.mainTeacher || OrbitAuth.current().role === "student" ? `<a href="../channel/channel.html?id=${state.channel}">${t("Classroom", "الصف")}</a>` : ""}<a href="../lab/lab.html?experiment=pendulum">${t("Lab", "المختبر")}</a>${OrbitAuth.current().role === "student" ? '<a href="../result/result.html">' + t("Quiz result", "نتيجة الاختبار") + "</a>" : ""}<a href="../shared/presentation-guide.html">${t("Presentation guide", "دليل العرض")}</a></div><p>${t("Class invitation:", "كود الصف:")} <bdi>ORBIT-LIVE-9</bdi></p>` : `<button id="prepare-presentation" type="button">${t("Prepare platform details", "تجهيز تفاصيل المنصة")}</button>`}<p role="status" id="presentation-status"></p></div>`;
    document.body.append(node);
    node.querySelector("#prepare-presentation")?.addEventListener("click", async (e) => {
      e.target.disabled = true;
      const status = node.querySelector("#presentation-status");
      try {
        await prepare((message) => (status.textContent = message));
        await switchTo(teacherId);
      } catch (error) {
        status.textContent = error.message;
        e.target.disabled = false;
      }
    });
    node.querySelector("#presentation-account")?.addEventListener("change", async (e) => {
      if (!e.target.value) return;
      e.target.disabled = true;
      try {
        await switchTo(e.target.value);
      } catch (error) {
        node.querySelector("#presentation-status").textContent = error.message;
        e.target.disabled = false;
      }
    });
  }
  bar();
  new MutationObserver(() => {
    const old = document.getElementById("orbit-presentation-bar"),
      opened = old?.open;
    old?.remove();
    bar();
    const next = document.getElementById("orbit-presentation-bar");
    if (next) next.open = !!opened;
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
})();
