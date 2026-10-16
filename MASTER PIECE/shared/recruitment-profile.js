(() => {
  "use strict";
  const O = ORBIT,
    R = OrbitRecruitment,
    { t, esc } = O;
  function field(name, label, value) {
    return `<label>${label}<input name="${name}" value="${esc(value || "")}"></label>`;
  }
  function photo(p) {
    return p.photo
      ? `<img class="recruit-photo" data-asset="${esc(p.photo)}" alt="${t("Teacher photo", "صورة المعلم")}">`
      : "";
  }
  function renderExtension() {
    document.getElementById("recruit-profile")?.remove();
    if (new URLSearchParams(location.search).get("id") === "sara") return;
    const isSchool = O.user.role === "school",
      recruit = new URLSearchParams(location.search).get("recruit") === "1";
    if (!isSchool) {
      const requestedId =
          new URLSearchParams(location.search).get("id") ||
          (O.user.role === "teacher" ? O.user.email : "teacher@orbit.com"),
        profile = OrbitProfiles.read(OrbitProfiles.canonical(requestedId), "teacher"),
        avatar = document.querySelector(".profile-header .profile-avatar");
      if (avatar && profile.role === "teacher" && profile.photo) {
        const img = document.createElement("img");
        img.dataset.asset = profile.photo;
        img.alt = t("Teacher photo", "صورة المعلم");
        avatar.replaceChildren(img);
        O.hydrate();
      }
    }
    if (isSchool) {
      const host = document.querySelector(".content");
      try {
        const p = R.profileForSchool(
            new URLSearchParams(location.search).get("application"),
            new URLSearchParams(location.search).get("id"),
          ),
          publicPosts = O.db().posts.filter(
            (post) =>
              O.channels().some(
                (c) =>
                  c.id === post.channel &&
                  (c.teacher === p.id ||
                    (p.id === "teacher@orbit.com" && c.teacher === "khaled")) &&
                  !c.private,
              ) && !O.get("orbit.deleted.posts", []).includes(post.id),
          );
        host.innerHTML = `<section id="recruit-profile" class="card"><h1>${esc(p.name)}</h1>${photo(p)}<p>${esc(p.bio)}</p><h2>${t("Professional qualifications", "المؤهلات المهنية")}</h2><p>${esc(p.qualification || t("Not supplied", "غير مذكورة"))}</p><p>${p.experience ?? t("Not supplied", "غير مذكورة")} ${t("years experience", "سنوات خبرة")}</p><p>${t("Subjects", "المواد")}: ${esc(p.subjects.join("، "))}</p><p>${t("Grades", "الصفوف")}: ${esc(p.grades.join("، "))}</p><p>${t("Skills", "المهارات")}: ${esc(p.skills.join("، "))}</p><p>${t("Methods", "أساليب التدريس")}: ${esc(p.methods.join("، "))}</p><p>${t("Past teaching positions", "وظائف التدريس السابقة")}: ${esc(p.positions)}</p><p>${t("Location", "الموقع")}: ${esc(p.location)}</p>${p.cv && /^https:\/\//.test(p.cv) ? `<a class="btn outline" href="${esc(p.cv)}" target="_blank" rel="noopener noreferrer">${t("Shared CV", "السيرة التي وافق على مشاركتها")} ↗</a>` : ""}<p class="muted">${t("Self-reported qualifications; not verified. Application views show current professional details; the original submission is retained.", "مؤهلات معلنة ذاتيًا وغير موثقة. عرض الطلب يعرض بيانات الملف الحالية، مع الاحتفاظ بنسخة وقت التقديم.")}</p><h2>${t("Public teaching contributions", "المساهمات التعليمية العامة")}</h2>${publicPosts.map((post) => `<article class="card"><h3>${esc(post.title || post.titleAr || post.titleEn)}</h3><p>${esc(post.body || post.bodyAr || post.bodyEn)}</p>${O.attachment(post)}<a class="btn outline" href="../channel/channel.html?id=${encodeURIComponent(post.channel)}">${t("Source channel", "القناة المصدر")}</a></article>`).join("") || `<p>${t("No published public contributions yet.", "لا توجد مساهمات عامة منشورة بعد.")}</p>`}<a class="btn outline" href="../school-dashboard/school-dashboard.html?tab=applications">${t("Back to recruitment", "رجوع للتوظيف")}</a></section>`;
        O.hydrate();
      } catch {
        host.innerHTML = `<section class="card"><h2>${t("Profile unavailable to this school", "الملف غير متاح لهذه المدرسة")}</h2><p>${t("The teacher has not opted in to discovery, or this application belongs to another school.", "المعلم لم يشارك ملفه للاكتشاف، أو الطلب يخص مدرسة أخرى.")}</p><a class="btn outline" href="../school-dashboard/school-dashboard.html">${t("Back", "رجوع")}</a></section>`;
      }
      return;
    }
    if (O.user.role !== "teacher") return;
    const requested = new URLSearchParams(location.search).get("id");
    if (
      requested &&
      requested !== O.user.email &&
      !(requested === "khaled" && O.user.email === "teacher@orbit.com")
    )
      return;
    const section = document.createElement("section");
    section.id = "recruit-profile";
    section.className = "card";
    section.innerHTML =
      "<h2>" +
      t("Your professional profile", "ملفك المهني") +
      "</h2><p>" +
      t(
        "Manage your personal details, qualifications and recruitment preferences in one place.",
        "عدّل بياناتك ومؤهلاتك وتفضيلات التوظيف من مكان واحد.",
      ) +
      '</p><a class="btn" href="../account-profile/account-profile.html">' +
      t("Edit my profile", "تعديل ملفي") +
      "</a>";
    document.querySelector(".profile-layout")?.after(section);
  }

  const existingRender = render;
  render = () => {
    existingRender();
    renderExtension();
  };
  render();
})();
