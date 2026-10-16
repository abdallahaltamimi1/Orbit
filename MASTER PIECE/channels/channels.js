"use strict";
const O = ORBIT,
  { t, esc } = O;
let mode = O.user.email ? "mine" : "search",
  query = "";
function title(p) {
  return p.title || t(p.titleEn, p.titleAr) || "";
}
function body(p) {
  return p.body || t(p.bodyEn, p.bodyAr) || "";
}
const teacherMode = O.user.role === "teacher",
  path = location.pathname;
const seedPosts = [
  {
    id: "p1",
    channel: "physics",
    type: "lesson",
    titleAr: "قوانين نيوتن من حياتنا",
    titleEn: "Newton in everyday life",
    bodyAr: "اكتشف أثر القوى على الحركة.",
    bodyEn: "Explore forces and motion.",
    likes: 42,
  },
  {
    id: "p2",
    channel: "9b",
    type: "assignment",
    titleAr: "القوى من حولنا",
    titleEn: "Forces around us",
    bodyAr: "اذكر ثلاثة أمثلة للقوى في البيت.",
    bodyEn: "List three examples of forces at home.",
    likes: 18,
  },
];
const allPosts = () =>
  [...O.db().posts, ...seedPosts.filter((p) => !O.db().posts.some((x) => x.id === p.id))].filter(
    (p) => !O.get("orbit.deleted.posts", []).includes(p.id) && p.moderationStatus !== "hidden",
  );

const subjects = {
  physics: ["Physics", "الفيزياء"],
  math: ["Mathematics", "الرياضيات"],
  chemistry: ["Chemistry", "الكيمياء"],
  biology: ["Biology", "الأحياء"],
  english: ["English", "الإنجليزية"],
};
const subjectLabel = (c) =>
  subjects[c.subject] ? t(...subjects[c.subject]) : c.subject || t("General", "عام");
const description = (c) => t(c.descEn || c.descAr || "", c.descAr || c.descEn || "");
const memberCount = (c) =>
  Object.values(O.get("orbit.memberships.v3", {})).filter(
    (list) => Array.isArray(list) && list.includes(c.id),
  ).length;
function card(c) {
  if (O.user.role === "student" || teacherMode) return studentCard(c);
  return (
    '<article class="card channel-card"><div class="channel-cover">' +
    (c.coverAsset
      ? '<img data-asset="' + esc(c.coverAsset) + '" alt="">'
      : '<span aria-hidden="true">◉</span>') +
    '<span class="tag">' +
    (c.private ? t("Private classroom", "صف خاص") : t("Public channel", "قناة عامة")) +
    '</span></div><div class="channel-card-body"><span class="channel-subject">' +
    esc(subjectLabel(c)) +
    "</span><h2>" +
    esc(O.label(c)) +
    '</h2><p class="channel-description">' +
    esc(description(c) || t("A space to learn together.", "مساحة لنتعلم معًا.")) +
    '</p><a class="channel-teacher" href="../teacher-profile/teacher-profile.html?id=' +
    encodeURIComponent(c.teacher) +
    '">' +
    esc(O.teacher(c.teacher)) +
    " ↗</a><footer><span>" +
    memberCount(c) +
    " " +
    t("members", "أعضاء") +
    '</span><a class="btn soft" href="../channel/channel.html?id=' +
    encodeURIComponent(c.id) +
    '">' +
    (O.own(c) ? t("Manage channel", "إدارة القناة") : t("View channel", "عرض القناة")) +
    " ←</a></footer></div></article>"
  );
}
function studentCard(c) {
  const subject = ["physics", "math", "chemistry", "biology", "english"].includes(c.subject)
      ? c.subject
      : "general",
    icons = {
      physics:
        '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
      math: '<path d="M5 7h14M5 17h14M8 3v8m8 2v8"/>',
      chemistry: '<path d="M9 3h6M10 3v7l-6 10h16l-6-10V3M7 15h10"/>',
      biology: '<path d="M5 20C4 8 9 4 20 4c0 11-4 16-15 16Zm0 0L17 7M9 16v-5m4 2h5"/>',
      english: '<path d="M3 5h7l2 2 2-2h7v15h-7l-2 2-2-2H3ZM12 7v15"/>',
    };
  return `<article class="card channel-card"><div class="channel-cover subject-${subject}"><span class="channel-cover-fallback" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[subject] || icons.english}</svg></span>${c.coverAsset ? `<img data-asset="${esc(c.coverAsset)}" alt="" onerror="this.hidden=true">` : ""}<span class="tag">${channelIcon(c.private ? "lock" : "globe")}${c.private ? t("Private classroom", "صف خاص") : t("Public channel", "قناة عامة")}</span><span class="cover-subject">${esc(subjectLabel(c))}</span></div><div class="channel-card-body"><h2>${esc(O.label(c))}</h2><p class="channel-description">${esc(description(c) || t("No description added yet.", "لم يُضف وصف بعد."))}</p><div class="channel-people"><a class="channel-teacher" href="../teacher-profile/teacher-profile.html?id=${encodeURIComponent(c.teacher)}">${channelIcon("user")}${esc(O.teacher(c.teacher))}</a><span>${channelIcon("users")}${memberCount(c)} ${t("members", "أعضاء")}</span></div><a class="btn channel-enter" href="../channel/channel.html?id=${encodeURIComponent(c.id)}">${O.own(c) ? t("Manage channel", "إدارة القناة") : teacherMode ? t("View channel", "عرض القناة") : O.memberships().includes(c.id) ? t("Enter channel", "دخول القناة") : t("Explore channel", "استكشف القناة")}${channelIcon("arrowRight")}</a></div></article>`;
}
function channelIcon(name) {
  const paths = {
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    globe:
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
    arrowRight: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  };
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.users}</svg>`;
}
function directoryList() {
  const all = O.channels();
  return (
    mode === "search"
      ? all.filter((c) => !c.private)
      : teacherMode
        ? all.filter(O.own)
        : all.filter((c) => O.memberships().includes(c.id))
  ).filter((c) =>
    (O.label(c) + " " + O.teacher(c.teacher) + " " + subjectLabel(c) + " " + description(c))
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
}
function results() {
  const list = directoryList();
  document.getElementById("channel-results").innerHTML =
    list.map(card).join("") ||
    '<div class="channel-empty"><span aria-hidden="true">◉</span><h2>' +
      t("Your next classroom is waiting", "صفك القادم بانتظارك") +
      "</h2><p>" +
      (query
        ? t(
            "No channels match your search. Try another name or subject.",
            "لا توجد قنوات مطابقة. جرّب اسمًا أو مادة أخرى.",
          )
        : teacherMode && mode === "mine"
          ? t(
              "Create a channel to bring your lessons and students together.",
              "أنشئ قناة تجمع دروسك وطلابك في مكان واحد.",
            )
          : t(
              "Discover a public channel or enter the code from your teacher.",
              "اكتشف قناة عامة أو أدخل كود الدعوة من معلمك.",
            )) +
      "</p></div>";
  document.getElementById("result-count").textContent = list.length + " " + t("channels", "قنوات");
  O.hydrate();
}
function renderDirectory() {
  document.body.classList.toggle("student-channels", O.user.role === "student");
  document.body.classList.toggle("teacher-channels", teacherMode);
  O.shell(
    t("Your learning spaces", "مساحاتك التعليمية"),
    '<div class="directory-heading"><div><p>' +
      t(
        "Every lesson starts with a connection. Find your classroom and keep learning.",
        "كل درس يبدأ بتواصل. اعثر على صفك وتابع رحلة التعلم.",
      ) +
      '</p></div><div class="directory-actions"><button class="btn soft" id="channel-language" aria-label="' +
      t("Switch to Arabic", "التبديل إلى الإنجليزية") +
      '">' +
      t("العربية", "English") +
      "</button>" +
      (teacherMode
        ? '<button class="btn" id="create-channel">＋ ' +
          t("Create channel", "إنشاء قناة") +
          "</button>"
        : '<button class="btn" id="join-code">＋ ' +
          t("Join with code", "انضم بكود") +
          "</button>") +
      '</div></div><section class="directory-banner"><div><span>' +
      t("CONNECTED LEARNING", "تعلّم يجمعنا") +
      "</span><h2>" +
      (teacherMode
        ? t("Give your teaching a space to grow.", "امنح تعليمك مساحة للنمو.")
        : t("A classroom. A community. Your orbit.", "صفّك، مجتمعك، ومدارك.")) +
      "</h2><p>" +
      t(
        "Public channels for discovery. Private classrooms by invitation.",
        "قنوات عامة للاكتشاف، وصفوف خاصة بدعوة من المعلم.",
      ) +
      '</p></div><div class="directory-orbit" aria-hidden="true">' +
      (O.user.role === "student" || teacherMode
        ? '<svg class="channel-banner-book" viewBox="0 0 100 80" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15h27l13 8 13-8h27v50H63l-13 8-13-8H10ZM50 23v50M20 29h16m-16 10h16m-16 10h16m28-20h16M64 39h16M64 49h16"/></svg>'
        : "<i></i><i></i><b>◉</b>") +
      '</div></section><section class="channel-library"><div class="directory-tools"><div class="directory-tabs" role="group" aria-label="' +
      t("Channel view", "عرض القنوات") +
      '"><button id="my-channels" aria-pressed="' +
      (mode === "mine") +
      '">' +
      t("My channels", "قنواتي") +
      '</button><button id="discover" aria-pressed="' +
      (mode === "search") +
      '">' +
      t("Discover", "اكتشف") +
      '</button></div><label class="directory-search"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="channel-search" value="' +
      esc(query) +
      '" placeholder="' +
      t("Search channels, teachers, subjects…", "ابحث عن قناة أو معلم أو مادة…") +
      '" aria-label="' +
      t("Search channels", "البحث عن قنوات") +
      '"></label></div><div class="directory-caption"><span id="result-count" role="status"></span><a href="../teacher-directory/teacher-directory.html">' +
      t("Explore teachers", "تعرّف على المعلمين") +
      ' ↗</a></div><div class="grid" id="channel-results"></div></section>',
  );
  if (O.user.role === "student" || teacherMode) {
    const heading = document.querySelector(".directory-heading>div"),
      pageTitle = document.querySelector(".wrap>h1");
    if (heading && pageTitle) heading.prepend(pageTitle);
  }
  results();
  for (const [id, next] of [
    ["my-channels", "mine"],
    ["discover", "search"],
  ])
    document.getElementById(id).onclick = () => {
      mode = next;
      query = "";
      renderDirectory();
    };
  document.getElementById("join-code")?.addEventListener("click", joinCode);
  document.getElementById("create-channel")?.addEventListener("click", createChannel);
  document.getElementById("channel-search").oninput = (e) => {
    query = e.target.value;
    results();
  };
  document.getElementById("channel-language").onclick = () => {
    const prefs = O.get("orbit.student.v1", {});
    prefs.lang = t("ar", "en");
    O.set("orbit.student.v1", prefs);
    location.reload();
  };
  document.title = t("ORBIT · Channels", "ORBIT · القنوات");
}
function createChannel() {
  if (!OrbitSubscriptions.requireAccount("teacher")) return;
  const d = O.dialog(
    "<h2>" +
      t("Create a learning space", "أنشئ مساحة للتعلم") +
      '</h2><form id="new-channel"><label>' +
      t("Channel name", "اسم القناة") +
      '<input name="name" required maxlength="100"></label><label>' +
      t("Description", "الوصف") +
      '<textarea name="description" required maxlength="350" rows="3"></textarea></label><label>' +
      t("Subject", "المادة") +
      '<select name="subject">' +
      Object.entries(subjects)
        .map(([key, value]) => '<option value="' + key + '">' + t(...value) + "</option>")
        .join("") +
      "</select></label><label>" +
      t("Access", "نوع الوصول") +
      '<select name="access"><option value="public">' +
      t("Public — discoverable", "عامة — قابلة للاكتشاف") +
      '</option><option value="private">' +
      t("Private — invitation code", "خاصة — بكود دعوة") +
      "</option></select></label><label>" +
      t("Optional cover image", "صورة غلاف اختيارية") +
      '<input type="file" name="cover" accept="image/png,image/jpeg,image/webp"></label><p class="muted">' +
      t("Private classrooms require a teacher code.", "الصفوف الخاصة تتطلب كودًا من المعلم.") +
      '</p><p class="error" role="alert"></p><button class="btn">' +
      t("Create channel", "إنشاء القناة") +
      "</button></form>",
  );
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target,
      f = new FormData(form),
      button = form.querySelector(".btn");
    button.disabled = true;
    try {
      const name = f.get("name").trim(),
        desc = f.get("description").trim();
      if (!name || !desc) throw Error(t("Enter a name and description.", "أدخل اسمًا ووصفًا."));
      const privateChannel = f.get("access") === "private";
      if (privateChannel && !OrbitSubscriptions.allow("classes")) return;
      let coverAsset = "";
      const image = form.elements.cover.files[0];
      if (image) {
        if (
          !["image/png", "image/jpeg", "image/webp"].includes(image.type) ||
          image.size > 5 * 1024 * 1024
        )
          throw Error(
            t(
              "Choose a PNG, JPEG or WebP image under 5 MB.",
              "اختر صورة PNG أو JPEG أو WebP بحجم أقل من 5 MB.",
            ),
          );
        coverAsset = "cover-" + crypto.randomUUID();
        await O.media(coverAsset, image);
      }
      let code;
      do {
        code = "ORB" + crypto.getRandomValues(new Uint32Array(2)).join("").slice(0, 10);
      } while (O.channels().some((c) => c.code === code));
      const c = {
        id: "c-" + crypto.randomUUID(),
        en: name,
        ar: name,
        descEn: desc,
        descAr: desc,
        subject: f.get("subject"),
        private: privateChannel,
        teacher: O.user.email === "teacher@orbit.com" ? "khaled" : O.user.email,
        code,
        coverAsset,
        createdAt: new Date().toISOString(),
        schoolId: OrbitSubscriptions.effective().schoolId || null,
      };
      OrbitSubscriptions.perform(
        privateChannel ? "classes" : null,
        () => {
          const data = O.db();
          data.channels.push(c);
          O.set("orbit.channels.v2", data);
        },
        "class:" + c.id,
      );
      d.close();
      mode = "mine";
      query = "";
      renderDirectory();
      const success = O.dialog(
        "<h2>" +
          t("Channel created", "تم إنشاء القناة") +
          "</h2><p>" +
          esc(name) +
          "</p>" +
          (privateChannel
            ? "<p>" +
              t("Invitation code", "كود الدعوة") +
              ': <strong dir="ltr">' +
              esc(code) +
              "</strong></p>"
            : "") +
          '<button class="btn" id="creation-done">' +
          t("Back to my channels", "العودة إلى قنواتي") +
          "</button>",
      );
      success.querySelector("#creation-done").onclick = () => success.close();
    } catch (error) {
      d.querySelector(".error").textContent =
        error.message === "SUBSCRIPTION_BLOCKED"
          ? t("Your plan does not allow this channel.", "خطتك لا تتيح إنشاء هذه القناة.")
          : error.message;
    } finally {
      button.disabled = false;
    }
  };
}
function joinCode() {
  if (!OrbitSubscriptions.requireAccount("student")) return;
  const d = O.dialog(
    `<h2>${t("Join your classroom", "انضم إلى صفك")}</h2><p>${t("Ask your teacher for the invitation code to get started.", "خذ كود الدعوة من معلمك، وخلّينا نبدأ.")}</p><form id="join-form"><label for="invitation-code">${t("Invitation code", "كود الدعوة")}</label><input id="invitation-code" name="code" required maxlength="64" dir="ltr" autocomplete="off" spellcheck="false" aria-describedby="join-feedback"><p id="join-feedback" class="error" role="status" aria-live="polite"></p><button class="btn" type="submit">${t("Join classroom", "انضم للصف")}</button></form>`,
  );
  d.classList.add("channel-join-dialog");
  const form = d.querySelector("form"),
    input = form.elements.code,
    feedback = d.querySelector(".error"),
    button = form.querySelector("button");
  form.onsubmit = async (e) => {
    e.preventDefault();
    button.disabled = true;
    form.setAttribute("aria-busy", "true");
    feedback.textContent = t("Checking your code…", "بنتأكد من الكود…");
    input.removeAttribute("aria-invalid");
    await new Promise(requestAnimationFrame);
    try {
      const code = input.value.trim().toUpperCase(),
        c = O.channels().find((c) => c.private && c.code === code);
      if (!c)
        throw Error(
          t(
            "This code is not valid. Check it with your teacher and try again.",
            "الكود غير صحيح. تأكد منه مع معلمك وجرّب مرة ثانية.",
          ),
        );
      if (O.join(c.id, false, code) === false) {
        feedback.textContent = t(
          "Joining could not be completed. Check the account message.",
          "ما اكتمل الانضمام. راجع رسالة الحساب.",
        );
        return;
      }
      feedback.classList.add("join-success");
      feedback.textContent = t("You joined! Opening your classroom…", "انضمّيت بنجاح! بنفتح صفّك…");
      window.OrbitMotion?.queueFeedback("You joined the classroom.", "انضمّيت للصف بنجاح.");
      sessionStorage.setItem("orbit.channel.joined", c.id);
      location.href = "../channel/channel.html?id=" + encodeURIComponent(c.id);
    } catch (error) {
      feedback.textContent = error.message;
      input.setAttribute("aria-invalid", "true");
      input.focus();
    } finally {
      button.disabled = false;
      form.removeAttribute("aria-busy");
    }
  };
  input.focus();
}
function postCard(p, c) {
  const data = O.db(),
    liked = data.likes.includes(p.id),
    saved = data.saved.includes(p.id),
    comments = data.comments[p.id] || [],
    isOwner = O.own(c);
  return `<article class="card post" data-post="${esc(p.id)}"><header><a href="../teacher-profile/teacher-profile.html?id=${c.teacher}">${esc(O.teacher(c.teacher))} ↗</a><span>${p.type === "assignment" ? t("Assignment", "واجب") : p.type === "lesson" ? t("Lesson", "درس") : esc(p.type)}</span></header><h2>${esc(title(p))}</h2><p>${esc(body(p))}</p>${O.attachment(p)}${p.dueDate ? `<p>${t("Due: ", "التسليم: ")}${esc(p.dueDate)}</p>` : ""}${isOwner ? `<div class="post-actions"><button class="btn soft" data-edit="${esc(p.id)}">${t("Edit", "تعديل")}</button> <button class="btn danger" data-delete="${esc(p.id)}">${t("Delete", "حذف")}</button></div>` : p.type === "assignment" ? `<p class="muted">${t("Assignment instructions are above. Individual submission tools are coming later.", "تعليمات الواجب أعلاه. تسليم الواجبات الفردي سيُضاف لاحقًا.")}</p>` : p.type === "lesson" ? `<a class="btn soft" href="../lessons/lessons.html">${t("Explore this subject", "استكشف الموضوع")}</a>` : ""}<div class="post-actions"><button class="btn soft" data-like="${esc(p.id)}">${liked ? "♥" : "♡"} ${(p.likes || 0) + Number(liked)}</button> <button class="btn soft" data-save="${esc(p.id)}">${saved ? t("Saved", "محفوظ") : t("Save", "حفظ")}</button></div>${comments.length ? `<div class="comments">${comments.map((m) => `<p><b>${esc(m.authorId ? OrbitProfiles.read(m.authorId).name || m.name : m.name)}</b> ${esc(m.text)}</p>`).join("")}</div>` : ""}<form data-comment="${esc(p.id)}"><label>${t("Class discussion", "نقاش القناة")}<input name="text" required maxlength="300"></label><button class="btn soft">${t("Comment", "تعليق")}</button></form></article>`;
}
function renderChannel() {
  const id = new URLSearchParams(location.search).get("id"),
    c = O.channels().find((c) => c.id === id);
  if (!c) {
    O.shell(
      t("Channel not found", "القناة غير موجودة"),
      `<a class="btn" href="../channels/channels.html">${t("Back", "رجوع")}</a>`,
    );
    return;
  }
  const isOwner = O.own(c),
    joined = O.memberships().includes(c.id),
    canSee = isOwner || !c.private || joined;
  O.shell(
    esc(O.label(c)),
    `<section class="hero"><p>${c.private ? t("Private classroom", "صف خاص") : t("Public teaching channel", "قناة عامة")}</p><h2>${esc(O.label(c))}</h2><a href="../teacher-profile/teacher-profile.html?id=${c.teacher}">${t("Published by", "ينشر فيها")} ${esc(O.teacher(c.teacher))} ↗</a></section><div class="toolbar">${isOwner ? `<button id="publish" class="btn">＋ ${t("Publish content", "نشر محتوى")}</button>${c.private ? `<span>${t("Class code: ", "كود الصف: ")}<b dir="ltr">${esc(c.code)}</b></span>` : ""}` : !O.user.email || O.user.role === "student" ? `<button id="membership" class="btn">${joined ? t("Leave channel", "مغادرة القناة") : c.private ? t("Join with code", "انضم بكود") : t("Join channel", "انضم للقناة")}</button>` : ""}</div>${
      canSee
        ? allPosts()
            .filter((p) => p.channel === id)
            .map((p) => postCard(p, c))
            .join("") || `<div class="empty">${t("No posts yet", "لا توجد منشورات بعد")}</div>`
        : `<section class="empty">${t("Enter the teacher’s code to view this private classroom.", "أدخل كود الأستاذ لتعرض منشورات هذا الصف الخاص.")}</section>`
    }`,
  );
  document
    .getElementById("publish")
    ?.addEventListener("click", () => O.editor(id, null, renderChannel));
  document.getElementById("membership")?.addEventListener("click", () => {
    if (c.private && !joined) joinCode();
    else {
      O.join(id, joined);
      renderChannel();
    }
  });
  document.querySelectorAll("[data-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = allPosts().find((x) => x.id === b.dataset.edit);
        if (!O.db().posts.some((x) => x.id === p.id)) {
          const d = O.db();
          d.posts.push({ ...p, title: title(p), body: body(p) });
          O.set("orbit.channels.v2", d);
        }
        O.editor(id, p.id, renderChannel);
      }),
  );
  document.querySelectorAll("[data-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        const d = O.dialog(
          `<h2>${t("Delete this post?", "حذف المنشور؟")}</h2><p>${t("The post will be removed from this prototype.", "سيُزال المنشور من القناة في هذا النموذج.")}</p><button class="btn danger" id="confirm-delete">${t("Delete", "حذف")}</button>`,
        );
        d.querySelector("#confirm-delete").onclick = () => {
          const data = O.db();
          data.posts = data.posts.filter((p) => p.id !== b.dataset.delete);
          delete data.comments[b.dataset.delete];
          O.set("orbit.channels.v2", data);
          O.set("orbit.deleted.posts", [...O.get("orbit.deleted.posts", []), b.dataset.delete]);
          d.close();
          renderChannel();
        };
      }),
  );
  for (const action of ["like", "save"])
    document.querySelectorAll("[data-" + action + "]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!OrbitSubscriptions.requireAccount()) return;
          const d = O.db(),
            id = b.dataset[action],
            key = action === "like" ? "likes" : "saved";
          d[key] = d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id];
          O.set("orbit.channels.v2", d);
          renderChannel();
        }),
    );
  document.querySelectorAll("[data-comment]").forEach(
    (f) =>
      (f.onsubmit = (e) => {
        e.preventDefault();
        if (!OrbitSubscriptions.requireAccount()) return;
        const text = new FormData(f).get("text").trim();
        if (!text) return;
        const d = O.db();
        (d.comments[f.dataset.comment] ??= []).push({
          name: O.user.name || t("Student", "طالب"),
          text,
        });
        O.set("orbit.channels.v2", d);
        renderChannel();
      }),
  );
}
path.includes("/channels/") ? renderDirectory() : renderChannel();
