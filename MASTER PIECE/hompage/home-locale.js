/* Homepage copy uses the same stored language and bilingual convention as ORBIT. */
(() => {
  "use strict";
  const prefs = OrbitAuth.get("orbit.student.v1", {}),
    lang = prefs.lang === "en" ? "en" : "ar";
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  const copy = {
    "Home": "الرئيسية",
    "Features": "المميزات",
    "Services": "الخدمات",
    "FAQ": "الأسئلة الشائعة",
    "Contact": "تواصل معنا",
    "Plans": "الباقات",
    "Log in": "تسجيل الدخول",
    "Sign Up": "إنشاء حساب",
    "Sign up": "إنشاء حساب",
    "Back to the universe": "العودة إلى عالم التعلم",
    "The learning journey": "رحلة التعلم",
    "Every question": "كل سؤال",
    "opens a": "يفتح",
    "new world.": "عالمًا جديدًا.",
    "One learning universe for students, teachers, and schools. Explore ideas, build skills, and discover what comes next.":
      "عالم تعليمي واحد للطلاب والمعلمين والمدارس. استكشف الأفكار، وطوّر مهاراتك، واكتشف خطوتك القادمة.",
    "Start exploring": "ابدأ الاستكشاف",
    "Explore the journey": "استكشف الرحلة",
    "Enter this stage": "ادخل هذه المرحلة",
    "Next question": "السؤال التالي",
    "Who is travelling?": "من ينطلق في الرحلة؟",
    "I am a student": "أنا طالب",
    "I teach": "أنا معلم",
    "I am a school": "أنا مدرسة",
    "Scroll": "تابع للأسفل",
    "WHY?": "لماذا؟",
    "WHAT IF?": "ماذا لو؟",
    "HOW?": "كيف؟",
    "DID IT WORK?": "هل نجحت؟",
    "WHAT'S NEXT?": "ماذا بعد؟",
    "WHAT’S NEXT?": "ماذا بعد؟",
    "Everything your class needs": "كل ما يحتاجه صفك",
    "One connected space for teaching, learning and collaboration.":
      "مساحة مترابطة للتعليم والتعلم والتعاون.",
    "Lesson prep": "تحضير الدرس",
    "Prepare lessons, worksheets, questions and learning materials.":
      "حضّر الدروس وأوراق العمل والأسئلة والمواد التعليمية.",
    "Prepare a lesson →": "حضّر درسًا ←",
    "Class channel": "قناة الصف",
    "Homework, videos, notes and results in one place.":
      "الواجبات والفيديوهات والملاحظات والنتائج في مكان واحد.",
    "See how it works →": "اكتشف طريقة العمل ←",
    "Interactive labs": "المختبرات التفاعلية",
    "Let students explore concepts through interactive experiments.":
      "دع الطلاب يستكشفون المفاهيم من خلال تجارب تفاعلية.",
    "Open the lab →": "افتح المختبر ←",
    "Learning levels": "مستويات التعلم",
    "Content adapted for different learning levels.": "محتوى يناسب مستويات التعلم المختلفة.",
    "Books & tools": "الكتب والأدوات",
    "Exchange educational books and learning tools.": "تبادل الكتب التعليمية وأدوات التعلم.",
    "AI assistant": "مساعد الذكاء الاصطناعي",
    "Support teachers and students throughout the learning journey.":
      "دعم المعلمين والطلاب طوال رحلة التعلم.",
    "Our services": "خدماتنا",
    "Built around the learning journey": "مصممة حول رحلة التعلم",
    "Everything connects through one learning orbit.": "كل شيء يترابط في مدار تعليمي واحد.",
    "School plans": "باقات المدارس",
    "One connected platform for your whole school.": "منصة مترابطة لمدرستك بأكملها.",
    "Explore →": "استكشف ←",
    "Offline learning": "التعلم دون اتصال",
    "Keep lessons available even without internet.":
      "احتفظ بالدروس المتاحة حتى دون اتصال بالإنترنت.",
    "Progress reports": "تقارير التقدم",
    "Understand student progress clearly.": "افهم تقدم الطلاب بوضوح.",
    "Local curriculum": "المنهج المحلي",
    "Learning content adapted to your curriculum.": "محتوى تعليمي يناسب منهجك.",
    "Questions people ask": "أسئلة يسألها الجميع",
    "Everything you need to know before joining the orbit.":
      "كل ما تحتاج إلى معرفته قبل الانضمام إلى المدار.",
    "Do I need an account to look around?": "هل أحتاج إلى حساب لتصفح المنصة؟",
    "You can explore the platform before creating an account.":
      "يمكنك استكشاف المنصة قبل إنشاء حساب.",
    "How do students join a class?": "كيف ينضم الطلاب إلى الصف؟",
    "Students join through a class channel.": "ينضم الطلاب من خلال قناة الصف.",
    "Does it work without internet?": "هل تعمل المنصة دون إنترنت؟",
    "Selected learning materials can remain available offline.":
      "يمكن أن تبقى مواد تعليمية محددة متاحة دون اتصال.",
    "Still have a question?": "ما زال لديك سؤال؟",
    "Our team is here to help.": "فريقنا هنا لمساعدتك.",
    "Talk to us": "تواصل معنا",
    "Quick links": "روابط سريعة",
    "About": "عن المنصة",
    "Explore": "استكشف",
    "Lessons": "الدروس",
    "Teacher directory": "دليل المعلمين",
    "Contact us": "تواصل معنا",
    "WhatsApp ·": "واتساب ·",
    "EXPLORE · LEARN · CONNECT": "استكشف · تعلّم · تواصل",
    "Learning connects us.": "التعلم يجمعنا.",
    "A learning platform connecting teachers, students and schools.":
      "منصة تعليمية تربط المعلمين والطلاب والمدارس.",
    "Mobile navigation": "التنقل على الهاتف",
    "Journey stages": "مراحل الرحلة",
    "Explore feature": "استكشف الميزة",
    "Open menu": "افتح القائمة",
    "Toggle navigation": "إظهار قائمة التنقل",
    "A reason to care comes before a definition. Students start curious, teachers set the hook, schools see the intent.":
      "الاهتمام يسبق التعريف. يبدأ الطلاب بفضول، ويثير المعلمون الاهتمام، وترى المدارس الهدف.",
    "Try the idea before being told the answer. Students experiment, teachers watch the thinking, schools see real practice.":
      "جرّب الفكرة قبل معرفة الإجابة. يجرّب الطلاب، ويراقب المعلمون التفكير، وترى المدارس تطبيقًا فعليًا.",
    "Step by step, at the right level. Students follow it, teachers build it in minutes, schools keep it on curriculum.":
      "خطوة بخطوة وبالمستوى المناسب. يتابع الطلاب، ويعدّ المعلمون الدرس، وتحافظ المدارس على ارتباطه بالمنهج.",
    "A result split by skill. Students see where they slipped, teachers see who slipped, schools see which class slipped.":
      "نتيجة مفصّلة حسب المهارة. يعرف الطلاب موضع التعثر، ويرى المعلمون من يحتاج الدعم، وتتابع المدارس الصفوف.",
    "Gaps become next steps. Students get practice, teachers get a plan, schools get a trend they can act on.":
      "تتحول الفجوات إلى خطوات قادمة. يحصل الطلاب على تدريب، والمعلمون على خطة، والمدارس على مؤشرات للعمل.",
    "The hook": "بداية الفضول",
    "A question the class actually argues about.": "سؤال يثير نقاشًا حقيقيًا في الصف.",
    "The objective": "الهدف",
    "What you should be able to do by the end, in one line.":
      "ما تستطيع إنجازه في نهاية الدرس، في سطر واحد.",
    "Where it fits": "مكانه في المنهج",
    "The unit and the lesson before it, so nothing feels random.":
      "الوحدة والدرس السابق، ليكون التعلم مترابطًا.",
    "Interactive lab": "مختبر تفاعلي",
    "Change the values yourself and watch the outcome move.":
      "غيّر القيم بنفسك وراقب تغيّر النتيجة.",
    "Your prediction": "توقعك",
    "Say what you expect before you test it.": "اذكر ما تتوقعه قبل التجربة.",
    "Shared result": "نتيجة مشتركة",
    "Send what you found straight to your teacher.": "أرسل ما اكتشفته مباشرة إلى معلمك.",
    "At your level": "بمستواك",
    "Beginner, intermediate or advanced. Same lesson, different depth.":
      "مبتدئ أو متوسط أو متقدم؛ الدرس نفسه بعمق يناسبك.",
    "Worked example": "مثال محلول",
    "Solved step by step, taken from your own curriculum.": "حل خطوة بخطوة من منهجك.",
    "Short video": "فيديو قصير",
    "Five minutes, recorded by the teacher you already know.":
      "خمس دقائق يسجلها المعلم الذي تعرفه.",
    "Scored by skill": "تقييم حسب المهارة",
    "Every question carries one skill, so a result can be read.":
      "كل سؤال يقيس مهارة لتكون النتيجة واضحة.",
    "The gap": "موضع التعثر",
    "One weak skill, named. Not a number out of ten.": "مهارة تحتاج تقوية، مع تحديدها بوضوح.",
    "Class view": "نظرة على الصف",
    "The teacher sees who slipped, not just the average.":
      "يرى المعلم من يحتاج المساعدة، وليس المتوسط فقط.",
    "Targeted practice": "تدريب موجّه",
    "Three questions on the one skill that slipped.": "ثلاثة أسئلة على المهارة التي تحتاج تقوية.",
    "Retry": "جرّب مجددًا",
    "The same skill, new questions, until it is met.": "المهارة نفسها بأسئلة جديدة حتى تتقنها.",
    "Rejoin": "تابع المسار",
    "The branch closes and the path carries on.": "تنتهي الخطوة وتستمر رحلة التعلم.",
    "Find the question that makes you curious.": "ابحث عن السؤال الذي يثير فضولك.",
    "Explore a new possibility through an experiment.": "استكشف احتمالًا جديدًا من خلال تجربة.",
    "Connect the explanation with a lesson and a plan.": "اربط الشرح بدرس وخطة.",
    "Practice and review your progress.": "تدرّب وراجع تقدمك.",
    "Choose your role and continue your learning orbit.": "اختر دورك وتابع مدارك التعليمي.",
  };
  const norm = (s) => String(s).replace(/\s+/g, " ").trim();
  function t(value) {
    const n = norm(value);
    if (lang === "en") return value;
    if (copy[n]) return copy[n];
    const stage = n.match(/^Stage (\d+) of (\d+)$/);
    if (stage) return `المرحلة ${stage[1]} من ${stage[2]}`;
    const numbered = n.match(/^(\d+) · (.+)$/);
    if (numbered && copy[numbered[2]]) return `${numbered[1]} · ${copy[numbered[2]]}`;
    return value;
  }
  function apply(scope = document.getElementById("orbit-page")) {
    if (lang !== "ar" || !scope) return;
    const walk = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const node = walk.currentNode;
      if (["SCRIPT", "STYLE"].includes(node.parentElement.tagName)) continue;
      const translated = t(node.textContent);
      if (translated !== node.textContent) node.textContent = translated;
    }
    for (const el of scope.querySelectorAll("[aria-label],[title],[placeholder]"))
      for (const attr of ["aria-label", "title", "placeholder"]) {
        const value = el.getAttribute(attr);
        if (value) {
          const translated = t(value);
          if (translated !== value) el.setAttribute(attr, translated);
        }
      }
    const meta = document.querySelector("meta[name=description]");
    if (meta) meta.content = t(meta.content);
  }
  window.OrbitHomeLocale = { t, apply, lang };
  document.addEventListener("DOMContentLoaded", () => apply());
})();
