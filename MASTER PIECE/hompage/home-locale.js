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
    "School": "المدرسة",
    "Teacher": "المعلم",
    "Teachers": "المعلمون",
    "Students": "الطلاب",
    "Progress": "التقدم",
    "A connected learning ecosystem": "منظومة تعليمية مترابطة",
    "ORBIT connects schools, teachers, students and learning progress.":
      "تربط ORBIT المدارس والمعلمين والطلاب وتقدم التعلم.",
    "Log in": "تسجيل الدخول",
    "Sign Up": "إنشاء حساب",
    "Sign up": "إنشاء حساب",
    "Switch to dark mode": "التبديل إلى الوضع الداكن",
    "Switch to light mode": "التبديل إلى الوضع الفاتح",
    "Back to the universe": "العودة إلى عالم التعلم",
    "The learning journey": "رحلة التعلم",
    "Every question": "كل سؤال",
    "opens a": "يفتح",
    "new world.": "عالمًا جديدًا.",
    "One learning universe for students, teachers, and schools. Explore ideas, build skills, and discover what comes next.":
      "عالم تعليمي واحد للطلاب والمعلمين والمدارس. استكشف الأفكار، وطوّر مهاراتك، واكتشف خطوتك القادمة.",
    "Start exploring": "ابدأ الاستكشاف",
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
    "One platform bringing learning and opportunity together": "منصة واحدة تجمع التعليم والفرص",
    "ORBIT is a digital learning platform connecting students, teachers, and schools in one integrated experience. It helps students learn and interact in educational channels, teachers organize content and stay connected with their students, and schools discover teachers and manage teaching opportunities.": "ORBIT منصة تعليمية رقمية تربط الطلاب والمعلمين والمدارس في تجربة متكاملة. تتيح للطلاب التعلم والتفاعل داخل القنوات التعليمية، وتساعد المعلمين على إدارة المحتوى والتواصل مع طلابهم، وتمنح المدارس مساحة لاكتشاف المعلمين وإدارة فرص التوظيف.",
    "Learn · Teach · Find your opportunity": "تعلّم · علّم · اكتشف فرصتك",
    "Learning, organized around your community": "تعلّمٌ يجمع مجتمعك",
    "Channels bring lessons, assignments, and people together in one clear place.":
      "تجمع القنوات الدروس والواجبات وأفراد المجتمع التعليمي في مساحة واضحة.",
    "Educational Channels": "القنوات التعليمية",
    "Keep lessons, class updates, and conversations together in a space built around each learning group.":
      "اجمع الدروس وتحديثات الصف والنقاشات في مساحة مخصصة لكل مجموعة تعليمية.",
    "Teacher Workspace": "مساحة المعلم",
    "Create educational channels, organize lessons and assignments, and engage with your students—all in one place.":
      "أنشئ قنواتك التعليمية، نظّم دروسك وواجباتك، وتفاعل مع طلابك من مكان واحد.",
    "Assignments & Feedback": "الواجبات والتغذية الراجعة",
    "Share assignments, submit work, and follow teacher feedback within the relevant channel.":
      "شارك الواجبات، وقدّم أعمالك، وتابع ملاحظات المعلم داخل القناة المعنية.",
    "School Workspace": "مساحة المدرسة",
    "Keep your school profile and teaching opportunities connected to the educators you want to reach.":
      "أدر ملف مدرستك وفرص التدريس، وتواصل مع المعلمين المهتمين بالانضمام إلى مجتمعك.",
    "One learning space": "مساحة تعليمية واحدة",
    "ORBIT — One place,": "ORBIT — مساحة واحدة،",
    "ORBIT Features": "مميزات ORBIT",
    "Frequently asked questions": "الأسئلة الشائعة",
    "learning without limits.": "وفرص تعليمية بلا حدود.",
    "A learning platform that brings students, teachers, and schools together. Find learning content, organize the journey, and stay connected.":
      "منصة تعليمية تجمع الطلاب والمعلمين والمدارس في بيئة واحدة لتسهيل الوصول إلى المحتوى، وتنظيم رحلة التعلم، وبناء تواصل أكثر فاعلية.",
    "Get started": "ابدأ الآن",
    "See how it works": "شاهد كيف يعمل",
    "Back to ORBIT": "العودة إلى ORBIT",
    "About ORBIT": "عن ORBIT",
    "Our mission and vision": "مهمتنا ورؤيتنا",
    "A student looking toward a bright learning horizon": "طالب يتطلع إلى أفق تعليمي مشرق",
    "Our mission": "مهمتنا",
    "Bring students, teachers and schools into a learning environment where lessons, communication and progress are easier to follow.":
      "توفير بيئة تعليمية تجمع الطلاب والمعلمين والمدارس، وتسهّل الوصول إلى المحتوى وتنظيم رحلة التعلم والتواصل بينهم.",
    "Our vision": "رؤيتنا",
    "A connected learning community where curiosity, practice and collaboration help every learner move forward.":
      "مجتمع تعليمي مترابط ينمو فيه الفهم بالممارسة والتعاون، ويمنح كل طالب ومعلم ومدرسة فرصة أكبر لتحقيق أهدافهم التعليمية.",
    "How ORBIT works": "كيف تعمل ORBIT؟",
    "A few simple steps to a connected learning journey": "خطوات بسيطة لرحلة تعليمية متكاملة",
    "Create an account": "إنشاء الحساب",
    "Choose your role and set up your learning space.": "سجّل كطالب أو معلم أو مدرسة وابدأ رحلتك.",
    "Discover and join": "اكتشف وانضم",
    "Find an educational channel or create one for your class.": "انضم إلى قناة تعليمية أو أنشئ قناة لصفك.",
    "Learn and interact": "تعلّم وتفاعل",
    "Explore lessons, take part in discussions, and share work.": "استعرض الدروس وشارك في النقاشات وقدّم أعمالك.",
    "Track your progress": "تابع تقدمك",
    "Review feedback and keep moving forward, step by step.": "راجع الملاحظات وتابع تقدمك خطوة بخطوة.",
    "Start your learning journey today.": "ابدأ رحلتك التعليمية اليوم.",
    "Join students, teachers, and schools in one connected place.": "انضم إلى الطلاب والمعلمين والمدارس على ORBIT.",
    "Create your free account": "أنشئ حسابك مجانًا",
    "Questions you may have": "أهم الأسئلة التي قد تخطر في بالك",
    "What is ORBIT?": "ما هي ORBIT؟",
    "ORBIT brings students, teachers, and schools together to organize learning in one place.":
      "منصة تعليمية تجمع الطلاب والمعلمين والمدارس لتنظيم التعلم في مكان واحد.",
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
    "One Platform, Endless Learning Opportunities": "منصة واحدة، فرص تعليمية بلا حدود",
    "Discover a connected educational environment bringing students, teachers, and schools together.":
      "اكتشف بيئة تعليمية تجمع الطلاب والمعلمين والمدارس، من التعلم والتفاعل إلى التطور المهني.",
    "Interactive Learning Channels": "قنوات تعليمية تفاعلية",
    "Join teacher-led channels and explore lessons and learning activities in one place.":
      "انضم إلى قنوات المعلمين، وتابع الدروس والأنشطة التعليمية في مكان واحد.",
    "Create channels, share knowledge, and organize assignments and student engagement.":
      "أنشئ قنواتك، شارك المعرفة، ونظّم الواجبات والتفاعل مع الطلاب.",
    "Schools & Teaching Opportunities": "المدارس وفرص التدريس",
    "Discover qualified teachers, publish teaching opportunities, and manage applications and interviews.":
      "اكتشف المعلمين المؤهلين، وانشر فرص التدريس، ونظّم طلبات التوظيف والمقابلات.",
    "Manage assignments and feedback directly within learning channels.":
      "تابع الواجبات والتغذية الراجعة داخل القنوات التعليمية بكل وضوح.",
    "Explore →": "استكشف ←",
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
    "Contact Us": "تواصل معنا",
    "Contact Us | ORBIT": "تواصل معنا | ORBIT",
    "Have a question, suggestion, or feedback? Contact the ORBIT team.":
      "عندك سؤال أو اقتراح أو ملاحظة؟ تواصل مع فريق ORBIT.",
    "Have a question, suggestion, or feedback? We'd love to hear from you.":
      "عندك سؤال أو اقتراح أو ملاحظة؟ يسعدنا نسمع منك.",
    "Send Us a Message": "أرسل لنا رسالتك",
    "Full Name": "الاسم الكامل",
    "Email Address": "البريد الإلكتروني",
    "Your Message": "رسالتك",
    "Send Message": "إرسال الرسالة",
    "We are here for you": "نحن هنا من أجلك",
    "We welcome your questions, suggestions, and feedback. Our team reads every message carefully and works to make ORBIT a better experience for everyone.":
      "نرحب بجميع استفساراتك واقتراحاتك وملاحظاتك. يقرأ فريقنا كل رسالة بعناية ويسعى دائمًا إلى تقديم تجربة أفضل لجميع مستخدمينا.",
    "Enter your full name": "أدخل اسمك الكامل",
    "Write your message or feedback here...": "اكتب رسالتك أو ملاحظاتك هنا...",
    "Name is required.": "الاسم مطلوب.",
    "Please enter your full name.": "يرجى إدخال اسمك الكامل.",
    "Email is required.": "البريد الإلكتروني مطلوب.",
    "Enter a valid email address.": "أدخل بريدًا إلكترونيًا صحيحًا.",
    "Message is required.": "الرسالة مطلوبة.",
    "Please enter at least 10 characters.": "يرجى كتابة 10 أحرف على الأقل.",
    "Please keep your message under 2,000 characters.": "يرجى ألا تتجاوز رسالتك 2,000 حرف.",
    "Message delivery is not connected yet. Your message was not sent or saved. Please email us instead.":
      "إرسال الرسائل غير متاح حاليًا. لم تُرسل رسالتك ولم تُحفظ. يرجى مراسلتنا عبر البريد الإلكتروني.",
    "Sending message…": "جارٍ إرسال الرسالة…",
    "Thanks, your message was sent.": "شكرًا لك، تم إرسال رسالتك.",
    "We couldn’t send your message. Please try again.": "تعذر إرسال رسالتك. يرجى المحاولة مجددًا.",
    "Email ORBIT": "راسل ORBIT بالبريد",
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
      const translated = node.parentElement?.dataset.localeAr || t(node.textContent);
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
