"use strict";
const O = ORBIT,
  P = OrbitProfiles,
  { t, esc } = O;
let dirty = false,
  preview = "",
  editing = false;
const split = (v) => [
  ...new Set(
    String(v || "")
      .split(/[,،\n]/)
      .map((x) => x.trim())
      .filter(Boolean),
  ),
];
function field(name, title, value = "", type = "text", extra = "") {
  return `<label>${title}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
}
function area(name, title, value = "", extra = "") {
  return `<label class="wide">${title}<textarea name="${name}" ${extra}>${esc(value)}</textarea></label>`;
}
function option(name, title, items, value) {
  return `<label>${title}<select name="${name}">${items.map(([v, en, ar]) => `<option value="${v}" ${value === v ? "selected" : ""}>${t(en, ar)}</option>`).join("")}</select></label>`;
}
const levelItems = [
    ["primary", "Primary", "أساسي"],
    ["secondary", "Secondary", "ثانوي"],
    ["university", "University", "جامعي"],
  ],
  subjectItems = [
    ["physics", "Physics", "فيزياء"],
    ["math", "Math", "رياضيات"],
    ["arabic", "Arabic", "عربي"],
    ["english", "English", "إنجليزي"],
    ["biology", "Biology", "أحياء"],
    ["chemistry", "Chemistry", "كيمياء"],
  ];
const readableSubject = (value) => {
  const item = subjectItems.find((x) => x[0] === value);
  return item ? t(item[1], item[2]) : value;
};
function rows(items) {
  return `<dl class="profile-data">${items.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(Array.isArray(value) ? value.join("، ") : value || t("Not provided", "مش مضاف بعد"))}</dd></div>`).join("")}</dl>`;
}
function render(edit = false, message = "") {
  if (preview) {
    URL.revokeObjectURL(preview);
    preview = "";
  }
  editing = edit;
  dirty = false;
  const p = P.current(),
    school = p.role === "school",
    teacher = p.role === "teacher",
    photo = school ? p.logo : p.photo,
    role = school
      ? t("School workspace", "ملف المدرسة")
      : teacher
        ? t("Teacher workspace", "ملف المعلم")
        : t("Student workspace", "ملف الطالب"),
    personal = [
      [t("Name", "الاسم"), p.name],
      [t("Email", "البريد"), p.email],
      [t("Address", "العنوان"), p.address || p.location],
      [t("Contact", "التواصل"), p.contact || p.phone],
    ];
  if (!teacher && !school)
    personal.push([
      t("Educational level", "المستوى"),
      (() => {
        const level = levelItems.find((l) => l[0] === p.level);
        return level ? t(level[1], level[2]) : "";
      })(),
    ]);
  const extra = teacher
    ? [
        [t("Biography", "النبذة"), p.bio],
        [t("Qualifications", "المؤهلات"), p.qualification],
        [t("Experience", "الخبرة"), String(p.experience ?? 0) + " " + t("years", "سنوات")],
        [
          t("Subjects", "المواد"),
          [...new Set([p.subject, ...(p.subjects || [])].filter(Boolean))].map(readableSubject),
        ],
        [t("Location", "الموقع"), p.location],
        [
          t("Recruitment discovery", "اكتشاف المدارس"),
          p.shareWithSchools ? t("Allowed", "مفعّل") : t("Private", "غير مفعّل"),
        ],
      ]
    : school
      ? [
          [t("Description", "نبذة المدرسة"), p.description],
          [t("Website", "الموقع الإلكتروني"), p.website],
          [t("Phone", "الهاتف"), p.phone],
          [t("Subjects", "المواد"), p.subjects],
          [t("Levels", "المراحل"), p.levels],
        ]
      : [];
  let inputs = "";
  if (edit) {
    inputs = `<fieldset class="profile-section" id="profile-identity"><legend>${t("Identity and contact", "بياناتك الأساسية")}</legend><div class="profile-upload">${photo ? `<img id="profile-image-preview" data-asset="${esc(photo)}" alt="${t("Profile preview", "معاينة الصورة")}">` : `<img id="profile-image-preview" hidden alt="${t("Profile preview", "معاينة الصورة")}">`}<label>${school ? t("School logo", "شعار المدرسة") : t("Your picture", "صورتك")}<input id="profile-image" type="file" accept="image/png,image/jpeg,image/webp"><small>${t("PNG, JPEG or WebP · up to 5 MB", "PNG أو JPEG أو WebP · حتى 5 MB")}</small></label></div><div class="profile-fields">${field("name", school ? t("School name", "اسم المدرسة") : t("Full name", "الاسم الكامل"), p.name, "text", 'required maxlength="100" autocomplete="name"')}${field("email", t("Account email", "بريد الحساب"), p.email, "email", 'readonly aria-describedby="email-note"')}${field("address", t("Address", "العنوان"), p.address || "", "text", 'maxlength="300"')}${field("contact", t("Contact information", "وسيلة التواصل"), p.contact || "", "text", school ? 'required maxlength="200"' : 'maxlength="200"')}${!teacher && !school ? option("level", t("Educational level", "المستوى"), levelItems, p.level || "primary") : field("location", t("City / location", "المدينة / الموقع"), p.location || "", "text", school ? 'required maxlength="200"' : 'maxlength="200"')}</div><p id="email-note" class="email-note">${t("Email changes require a verified account service. This connection is not configured.", "تغيير بريد الحساب يحتاج خدمة تحقق عبر الخادم، وهي غير مربوطة حاليًا.")}</p></fieldset>`;
    if (teacher)
      inputs += `<fieldset class="profile-section" id="profile-professional"><legend>${t("Your teaching experience", "حضورك المهني")}</legend><div class="profile-fields">${option("subject", t("Primary subject", "المادة الأساسية"), subjectItems, p.subject || "physics")}${field("experience", t("Years of experience", "سنوات الخبرة"), p.experience ?? 0, "number", 'required min="0" max="60" step="1"')}${field("qualification", t("Qualifications", "المؤهلات"), p.qualification || "", "text", 'maxlength="1000"')}${field("subjects", t("Additional subjects · comma-separated", "مواد إضافية · افصل بفواصل"), (p.subjects || []).filter((subject) => subject !== p.subject).join(", "))}${field("grades", t("Grades · comma-separated", "الصفوف · افصل بفواصل"), (p.grades || []).join(", "))}${field("skills", t("Skills · comma-separated", "المهارات · افصل بفواصل"), (p.skills || []).join(", "))}${field("methods", t("Teaching strategies", "استراتيجيات التدريس"), (p.methods || []).join(", "))}${field("cv", t("CV / portfolio link · HTTPS", "رابط السيرة / البورتفوليو · HTTPS"), p.cv || "", "url")}${area("bio", t("Professional biography", "نبذة مهنية"), p.bio || "", 'maxlength="3000"')}${area("positions", t("Previous teaching positions", "خبرات التدريس السابقة"), p.positions || "", 'maxlength="2000"')}</div></fieldset><fieldset class="profile-section" id="profile-privacy"><legend>${t("Opportunities and privacy", "الفرص والخصوصية")}</legend><p class="privacy-intro">${t("Choose what schools can discover. These preferences do not publish private classroom content.", "اختَر شو ممكن المدارس تكتشف عنك. هالخيارات ما بتنشر محتوى الصف الخاص.")}</p>${[
        ["available", "Available for opportunities", "متاح لفرص التدريس"],
        ["shareWithSchools", "Allow schools to discover my profile", "أسمح للمدارس باكتشاف ملفي"],
        ["shareCV", "Share my CV with schools", "مشاركة رابط السيرة مع المدارس"],
        ["notifyInterest", "Notify me of school interest", "إشعاري باهتمام المدارس"],
      ]
        .map(
          ([name, en, ar]) =>
            `<label class="orbit-check"><input name="${name}" type="checkbox" ${p[name] ? "checked" : ""}>${t(en, ar)}</label>`,
        )
        .join("")}</fieldset>`;
    if (school)
      inputs += `<fieldset class="profile-section" id="profile-institution"><legend>${t("Institutional information", "معلومات المدرسة")}</legend><div class="profile-fields">${field("phone", t("Phone number", "رقم الهاتف"), p.phone || "", "tel", 'maxlength="50"')}${field("website", t("Website · HTTPS", "الموقع الإلكتروني · HTTPS"), p.website || "", "url")}${option(
        "type",
        t("School type", "نوع المدرسة"),
        [
          ["private", "Private", "خاصة"],
          ["public", "Public", "حكومية"],
          ["international", "International", "دولية"],
        ],
        p.type || "private",
      )}${field("levels", t("Education levels · comma-separated", "المراحل · افصل بفواصل"), (p.levels || []).join(", "))}${field("subjects", t("Subjects · comma-separated", "المواد · افصل بفواصل"), (p.subjects || []).join(", "))}${area("description", t("School description", "نبذة المدرسة"), p.description || "", 'maxlength="3000"')}</div></fieldset>`;
  }
  document.body.classList.add("unified-profile");
  O.shell(
    t("My profile", "ملفي الشخصي"),
    `<header class="profile-banner"><h2>${t("My profile", "ملفي الشخصي")}</h2><p>${t("Your identity in the world of ORBIT.", "هويتك في عالم ORBIT.")}</p></header><div class="profile-page-tools"><span>${t("YOUR IDENTITY ACROSS ORBIT", "هويتك عبر ORBIT")}</span><button id="profile-language" class="btn soft">${t("العربية", "English")}</button></div><div class="profile-workspace"><aside class="profile-overview">${
      photo
        ? `<img class="profile-portrait" data-asset="${esc(photo)}" alt="${t("Profile picture", "الصورة الشخصية")}">`
        : `<div class="profile-portrait">${esc(
            p.name
              .split(/\s+/)
              .map((n) => n[0])
              .slice(0, 2)
              .join(""),
          )}</div>`
    }<div><h2>${esc(p.name)}</h2><p>${role}</p><span class="profile-member">${t("Member of ORBIT", "عضو في ORBIT")}</span></div><blockquote class="profile-quote">${t("Learning today…", "التعلّم اليوم…")}<strong>${t("opens brighter opportunities tomorrow.", "بصنع فرصًا أجمل غدًا.")}</strong></blockquote>${edit ? `<nav class="profile-section-nav" aria-label="${t("Profile sections", "أقسام الملف")}"><a href="#profile-identity"><span>01</span>${t("Identity and contact", "بياناتك الأساسية")}</a>${teacher ? `<a href="#profile-professional"><span>02</span>${t("Professional details", "حضورك المهني")}</a><a href="#profile-privacy"><span>03</span>${t("Opportunities & privacy", "الفرص والخصوصية")}</a>` : school ? `<a href="#profile-institution"><span>02</span>${t("School information", "معلومات المدرسة")}</a>` : ""}</nav>` : `<p class="profile-overview-note">${t("Your connected pages use these details.", "صفحاتك المرتبطة بتستخدم هالبيانات.")}</p>`}</aside><section class="profile-editor"><h2>${edit ? t("Edit your details", "عدّل بياناتك") : t("Your personal information", "معلوماتك الشخصية")}</h2><p class="muted">${t("This information appears on your ORBIT account.", "هذه المعلومات بتظهر في حسابك على ORBIT.")}</p>${edit ? `<form id="account-profile-form">${inputs}<p id="profile-status" role="status">${esc(message)}</p><div class="profile-toolbar"><button class="btn" type="submit" id="save-profile">${t("Save changes", "احفظ التغييرات")}</button><button class="btn soft" type="button" id="cancel-profile">${t("Cancel", "إلغاء")}</button></div></form>` : `<section class="profile-section">${rows(personal)}</section>${extra.length ? `<section class="profile-section">${rows(extra)}</section>` : ""}<p id="profile-status" role="status">${esc(message)}</p><div class="profile-toolbar profile-view-actions"><button class="btn" id="edit-profile">${t("Edit profile", "تعديل الملف")}</button>${teacher ? `<a class="btn soft" href="../teacher-profile/teacher-profile.html?id=${encodeURIComponent(p.id)}">${t("View public portfolio", "شوف ملفك المهني")}</a>` : ""}</div>`}</section></div><aside class="profile-help"><span aria-hidden="true">i</span><div>${t("Your details make your ORBIT experience more personal.", "معلوماتك بتخلّي تجربتك في ORBIT أكثر تميّزًا وتخصيصًا.")}<p>${t("Keep your information up to date.", "حافظ على تحديث معلوماتك دائمًا.")}</p></div></aside>`,
  );
  document.getElementById("profile-language").onclick = () => {
    if (
      dirty &&
      !confirm(
        t("Switch language and discard unsaved changes?", "تغيّر اللغة وتترك التغييرات بدون حفظ؟"),
      )
    )
      return;
    dirty = false;
    const prefs = O.get("orbit.student.v1", {});
    prefs.lang = document.documentElement.lang === "ar" ? "en" : "ar";
    O.set("orbit.student.v1", prefs);
    location.reload();
  };
  if (!edit) {
    document.getElementById("edit-profile").onclick = () => render(true);
    if (p.role === "student") {
      const progress = O.get("orbit.student.v1", {}),
        done = Array.isArray(progress.done) ? progress.done : [],
        activities = ["lesson", "practice", "lab", "quiz"],
        count = activities.filter((id) => done.includes(id)).length;
      const summary = document.createElement("section");
      summary.className = "student-profile-learning";
      summary.innerHTML =
        "<h3>" +
        t("Your learning journey", "رحلتك التعليمية") +
        "</h3><p>" +
        count +
        " / " +
        activities.length +
        " " +
        t("learning activities completed", "أنشطة تعليمية مكتملة") +
        '</p><progress value="' +
        count +
        '" max="' +
        activities.length +
        '" aria-label="' +
        t("Completed learning activities", "الأنشطة التعليمية المكتملة") +
        '"></progress><p><a class="btn soft" href="../achievements/achievements.html">' +
        t("View earned achievements", "شوف إنجازاتك المكتسبة") +
        "</a></p>";
      document.querySelector(".profile-editor").append(summary);
    }
    return;
  }
  const form = document.getElementById("account-profile-form");
  form.oninput = () => (dirty = true);
  document.getElementById("profile-image").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      e.target.value = "";
      document.getElementById("profile-status").textContent = t(
        "Choose a supported image under 5 MB.",
        "اختر صورة مدعومة أقل من 5 MB.",
      );
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    preview = URL.createObjectURL(file);
    const img = document.getElementById("profile-image-preview");
    img.src = preview;
    img.hidden = false;
    dirty = true;
  };
  document.getElementById("cancel-profile").onclick = () => render(false);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const button = document.getElementById("save-profile");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      const patch = Object.fromEntries(new FormData(form));
      delete patch.email;
      for (const name of ["subjects", "grades", "skills", "methods", "levels"])
        if (Object.hasOwn(patch, name)) patch[name] = split(patch[name]);
      if (teacher) {
        patch.experience = +patch.experience;
        patch.subjects = (patch.subjects || []).filter((subject) => subject !== patch.subject);
        for (const name of ["available", "shareWithSchools", "shareCV", "notifyInterest"])
          patch[name] = form.elements[name].checked;
      }
      const file = document.getElementById("profile-image").files[0];
      if (file) {
        const asset = "profile-" + crypto.randomUUID();
        await O.media(asset, file);
        patch[school ? "logo" : "photo"] = asset;
      }
      patch.id = p.id;
      P.update(patch, p.revision);
      window.OrbitMotion?.feedback(t("Profile updated.", "تم تحديث الملف الشخصي."));
      dirty = false;
      render(
        false,
        t(
          "Profile saved. Your connected pages use these details.",
          "انحفظ ملفك. صفحاتك المرتبطة بتعرض هالبيانات.",
        ),
      );
    } catch (error) {
      document.getElementById("profile-status").textContent =
        error.message === "PROFILE_CONFLICT"
          ? t(
              "This profile changed in another tab. Cancel to reload its latest version.",
              "تغيّر الملف بتبويب ثاني. ألغِ التعديل لتحميل أحدث نسخة.",
            )
          : t(
              "Could not save. Check the fields, HTTPS links and browser storage.",
              "تعذر الحفظ. راجع الحقول وروابط HTTPS ومساحة المتصفح.",
            );
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  };
}
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[href]");
  if (
    link &&
    dirty &&
    !confirm(t("Leave and discard unsaved changes?", "تغادر وتترك التغييرات بدون حفظ؟"))
  )
    e.preventDefault();
});
window.addEventListener("orbit:profile-change", (e) => {
  if (e.detail.external && !dirty) render(editing);
});
render();
