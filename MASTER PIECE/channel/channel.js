"use strict";
const O = ORBIT,
  C = OrbitChannels,
  { t, esc } = O;
const channelId = new URLSearchParams(location.search).get("id");
let section = new URLSearchParams(location.search).has("post") ? "lessons" : "overview",
  notice = "",
  previousSeats = [],
  change = null;
let roomPage = 0,
  seatQuery = "",
  highlightSeat = null;
if (sessionStorage.getItem("orbit.channel.joined") === channelId) {
  sessionStorage.removeItem("orbit.channel.joined");
  notice = t(
    "You joined successfully. Choose an empty chair.",
    "تم انضمامك بنجاح. اختر كرسيًا فارغًا.",
  );
}
const tabs = [
  ["overview", "Overview", "نظرة عامة"],
  ["lessons", "Lessons & videos", "الدروس والفيديوهات"],
  ["assignments", "Assignments", "الواجبات"],
  ["resources", "Resources", "المصادر"],
  ["members", "Members", "الأعضاء"],
];
const subjects = {
  physics: ["Physics", "الفيزياء"],
  math: ["Mathematics", "الرياضيات"],
  chemistry: ["Chemistry", "الكيمياء"],
  biology: ["Biology", "الأحياء"],
  english: ["English", "الإنجليزية"],
};
const subject = (c) =>
  subjects[c.subject] ? t(...subjects[c.subject]) : c.subject || t("General", "عام");
const title = (p) => p.title || t(p.titleEn, p.titleAr) || "",
  body = (p) => p.body || t(p.bodyEn, p.bodyAr) || "";
const initials = (name) =>
  name
    .split(/\s+/)
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
const samplePosts = [
  {
    id: "p1",
    channel: "physics",
    type: "lesson",
    titleAr: "قوانين نيوتن من حياتنا",
    titleEn: "Newton in everyday life",
    bodyAr: "اكتشف أثر القوى على الحركة.",
    bodyEn: "Explore forces and motion.",
    sample: true,
  },
  {
    id: "p2",
    channel: "9b",
    type: "assignment",
    titleAr: "القوى من حولنا",
    titleEn: "Forces around us",
    bodyAr: "اذكر ثلاثة أمثلة للقوى في البيت.",
    bodyEn: "List three examples of forces at home.",
    sample: true,
  },
];
function posts(c) {
  const stored = O.db().posts;
  return [...stored, ...samplePosts.filter((p) => !stored.some((x) => x.id === p.id))].filter(
    (p) =>
      p.channel === c.id &&
      p.moderationStatus !== "hidden" &&
      !O.get("orbit.deleted.posts", []).includes(p.id),
  );
}
const types = {
  lesson: ["Lesson", "درس"],
  video: ["Video", "فيديو"],
  assignment: ["Assignment", "واجب"],
  announcement: ["Announcement", "إعلان"],
  discussion: ["Discussion", "نقاش"],
};
function feedback(message) {
  notice = message;
  renderChannel();
}
function error(message) {
  const status = document.getElementById("channel-status");
  status.textContent = message;
  status.classList.add("is-error");
  status.focus();
}
function guard(c, write = false) {
  const live = C.find(c.id);
  if (!C.canRead(live) || (write && !C.admitted(live)))
    throw Error(t("Join this channel to participate.", "انضم إلى القناة للمشاركة."));
  return live;
}
function memberList(c) {
  const list = C.members(c.id);
  return (
    '<div class="member-list">' +
    (list
      .map(
        (m) =>
          '<div class="member-row"><span class="member-initial">' +
          esc(initials(m.name)) +
          "</span><div><strong>" +
          esc(m.name) +
          "</strong><small>" +
          t("Admitted member", "عضو منضم") +
          "</small></div>" +
          (O.own(c)
            ? '<button class="btn soft" data-remove="' +
              esc(m.id) +
              '">' +
              t("Remove", "إزالة") +
              "</button>"
            : "") +
          "</div>",
      )
      .join("") ||
      '<p class="muted">' +
        t(
          "No students have joined yet. Share the invitation to start your classroom.",
          "لم ينضم طلاب بعد. شارك الدعوة ليبدأ صفك.",
        ) +
        "</p>") +
    "</div>"
  );
}

function chairFigure(member) {
  return (
    '<span class="seat-illustration" aria-hidden="true"><svg class="chair-art" viewBox="0 0 96 108"><ellipse cx="48" cy="99" rx="32" ry="7" fill="#141421" opacity=".6"/><path d="M24 61v30l7 5V68M69 64v29l7-5V63" fill="#716780"/><path d="M24 21q0-8 8-8h32q8 0 8 8v38H24Z" fill="#574d6d" stroke="#9a87b8" stroke-width="1.5"/><path d="M30 23h36v27H30Z" fill="#716184"/><path d="m20 58 28-7 29 8v12l-29 8-28-9Z" fill="#4b405d" stroke="#9a87b8" stroke-width="1.3"/><path d="m20 58 28-7 29 8-29 9Z" fill="#8a77a3"/>' +
    (member
      ? '<g class="sitting-student"><g class="student-feet"><path d="m37 68 2 18-8 8M58 69l3 17 11 5" fill="none" stroke="#a797c8" stroke-width="9" stroke-linecap="round"/><path d="m32 92-5 5h14M68 90l10 4" fill="none" stroke="#e2d8f2" stroke-width="6" stroke-linecap="round"/></g><path d="M33 42q2-8 14-8t16 8l-3 28H35Z" fill="#8a58ee" stroke="#c4a4ff" stroke-width="1.2"/><path d="m34 45-6 15 13 5M61 45l8 15-12 6" fill="none" stroke="#b193ed" stroke-width="7" stroke-linecap="round"/><path d="m35 62 7 3M58 63l-6 3" stroke="#f1cebb" stroke-width="5" stroke-linecap="round"/><rect x="43" y="28" width="10" height="10" rx="4" fill="#e1b89f"/><circle cx="48" cy="22" r="13" fill="#f1cebb"/><path d="M35 22q-2-17 12-17t14 18l-6-9q-8 7-18 3Z" fill="#292334"/><circle cx="43" cy="23" r="1" fill="#4a3346"/><circle cx="53" cy="23" r="1" fill="#4a3346"/><path d="M44 29q4 3 8 0" fill="none" stroke="#ac786c" stroke-linecap="round"/></g>'
      : "") +
    "</svg>" +
    (member ? walkingFigure() : "") +
    "</span>"
  );
}
function walkingFigure() {
  return '<svg class="walking-student" viewBox="0 0 96 108" aria-hidden="true"><ellipse cx="48" cy="101" rx="20" ry="5" fill="#141421" opacity=".4"/><g class="walking-legs"><path d="m42 64-4 31M54 64l8 29" stroke="#a797c8" stroke-width="8" stroke-linecap="round"/><path d="m37 95-7 4h13M61 94l9 4" stroke="#e2d8f2" stroke-width="6" stroke-linecap="round"/></g><path d="M33 38q3-7 15-7t15 7l-5 28H37Z" fill="#8a58ee" stroke="#c4a4ff" stroke-width="1.2"/><path d="m34 39-8 20M62 39l8 19" stroke="#b193ed" stroke-width="7" stroke-linecap="round"/><circle cx="25" cy="62" r="4" fill="#f1cebb"/><circle cx="71" cy="61" r="4" fill="#f1cebb"/><rect x="43" y="26" width="10" height="10" rx="4" fill="#e1b89f"/><circle cx="48" cy="19" r="13" fill="#f1cebb"/><path d="M35 19q-2-17 12-17t14 18l-6-9q-8 7-18 3Z" fill="#292334"/><circle cx="43" cy="20" r="1" fill="#4a3346"/><circle cx="53" cy="20" r="1" fill="#4a3346"/></svg>';
}

function teacherFigure() {
  return '<svg class="teacher-figure" viewBox="0 0 160 155" aria-hidden="true"><ellipse cx="80" cy="142" rx="61" ry="10" fill="#151522" opacity=".55"/><path d="M69 91v39M87 91l7 39" stroke="#9687b2" stroke-width="11" stroke-linecap="round"/><path d="M65 130h14M91 130h13" stroke="#e8def6" stroke-width="7" stroke-linecap="round"/><g class="teacher-body"><path d="M60 55q2-12 20-12t19 12l-7 42H66Z" fill="#7951bd" stroke="#b699e4"/><path d="m75 45 5 12 6-12" fill="#eadff8"/><path d="m79 57-3 20 5 5 4-5-3-20Z" fill="#322841"/><path d="m61 57-14 19 18 7" fill="none" stroke="#9879c5" stroke-width="9" stroke-linecap="round"/><path d="m64 83 8-2" stroke="#eec9b1" stroke-width="6" stroke-linecap="round"/><g class="teacher-gesture"><path d="m97 58 13 11 11-20" fill="none" stroke="#9879c5" stroke-width="9" stroke-linecap="round"/><circle cx="122" cy="46" r="4" fill="#eec9b1"/><path d="m124 44 9-20" stroke="#d2c3e9" stroke-width="2" stroke-linecap="round"/></g><rect x="75" y="35" width="11" height="12" rx="4" fill="#d5a68b"/><circle cx="80" cy="28" r="15" fill="#eec9b1"/><path d="M65 29q-4-20 15-20t15 21l-5-14q-9 6-22 4Z" fill="#262134"/><g fill="none" stroke="#53415f" stroke-width="1.5"><rect x="69" y="26" width="9" height="7" rx="2"/><rect x="82" y="26" width="9" height="7" rx="2"/><path d="M78 28h4"/></g><path d="M75 37q5 3 10 0" fill="none" stroke="#ad7768" stroke-linecap="round"/></g><path d="m29 102 53-10 52 10-53 12Z" fill="#8e78ab" stroke="#b4a0cc"/><path d="m29 102 52 12 53-12v10l-53 13-52-12Z" fill="#625171"/><path d="M40 115v20M123 115v20" stroke="#a38ab7" stroke-width="5"/><path d="m48 101 19-4 12 3-19 4Z" fill="#e7dcf7"/></svg>';
}
function studentSeat(member, index) {
  if (!member)
    return O.user.role === "student" && C.admitted(C.find(channelId))
      ? '<button class="empty-seat-choice" type="button" data-choose-seat="' +
          index +
          '" aria-label="' +
          esc(t("Sit in seat ", "اجلس في المقعد ") + (index + 1)) +
          '">' +
          chairFigure(null) +
          "</button>"
      : chairFigure(null);
  return (
    '<button class="seat-person" type="button" data-student-seat="' +
    index +
    '" aria-expanded="false" aria-controls="student-detail-' +
    index +
    '" aria-label="' +
    esc(t("Student details: ", "معلومات الطالب: ") + member.name) +
    '">' +
    chairFigure(member) +
    '</button><span class="seat-details" id="student-detail-' +
    index +
    '" role="tooltip" hidden><strong>' +
    esc(member.name) +
    "</strong><span>" +
    t("Admitted student", "طالب منضم") +
    "</span><span>" +
    t("Assigned seat", "المقعد المخصص") +
    " · " +
    (index + 1) +
    "</span></span>"
  );
}
function bindStudentDetails() {
  document.querySelectorAll("[data-student-seat]").forEach((button) => {
    const seat = button.closest(".class-seat"),
      detail = seat.querySelector(".seat-details");
    const hide = () => {
      detail.hidden = true;
      button.setAttribute("aria-expanded", "false");
      seat.classList.remove("show-details");
    };
    const show = () => {
      document.querySelectorAll(".seat-details").forEach((other) => {
        other.hidden = true;
        other
          .closest(".class-seat")
          ?.querySelector(".seat-person")
          ?.setAttribute("aria-expanded", "false");
      });
      detail.hidden = false;
      button.setAttribute("aria-expanded", "true");
      seat.classList.add("show-details");
      const r = button.getBoundingClientRect(),
        seatRect = seat.getBoundingClientRect(),
        width = Math.min(220, innerWidth - 24);
      detail.style.width = width + "px";
      detail.style.left =
        Math.max(12, Math.min(innerWidth - width - 12, r.left + r.width / 2 - width / 2)) -
        seatRect.left +
        "px";
      detail.style.top = r.top - seatRect.top - detail.offsetHeight - 10 + "px";
    };
    seat.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "touch") show();
    });
    seat.addEventListener("pointerleave", () => {
      if (document.activeElement !== button) hide();
    });
    button.addEventListener("focus", () => {
      if (matchMedia("(hover:hover)").matches) show();
    });
    button.addEventListener("blur", hide);
    button.addEventListener("click", () => (detail.hidden ? show() : hide()));
    button.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        hide();
        e.stopPropagation();
      }
    });
  });
}

function classroom(c) {
  const seats = C.seats(c.id),
    pageSize = 12,
    groups = [],
    pageCount = Math.max(1, Math.ceil(seats.length / pageSize));
  if (change?.kind === "join") {
    const admitted = seats.find((x) => x.member?.id === change.id);
    if (admitted) roomPage = Math.floor(admitted.index / pageSize);
  }
  roomPage = Math.max(0, Math.min(roomPage, pageCount - 1));
  const offset = roomPage * pageSize;
  {
    groups.push(
      '<div class="orbit-room" aria-label="' +
        t("Classroom seats", "مقاعد الصف") +
        '"><div class="classroom-front"><div class="classroom-board"><strong>' +
        esc(O.label(c)) +
        '</strong></div><div class="teacher-center">' +
        teacherFigure() +
        "<strong>" +
        esc(O.teacher(c.teacher)) +
        "</strong><small>" +
        t("Teacher", "المعلم") +
        '</small></div></div><div class="classroom-rows">' +
        seats
          .slice(offset, offset + pageSize)
          .map((s, i) => {
            const angle = (i / pageSize) * Math.PI * 2 - Math.PI / 2,
              x = 50 + 39 * Math.cos(angle),
              y = 50 + 37 * Math.sin(angle);
            return (
              '<div class="class-seat ' +
              (s.member ? "occupied" : "vacant") +
              (s.index === highlightSeat ? " seat-found" : "") +
              '" data-seat="' +
              s.index +
              '" style="--seat-x:' +
              x +
              "%;--seat-y:" +
              y +
              '%">' +
              studentSeat(s.member, s.index) +
              '<strong class="seat-name" title="' +
              esc(s.member ? s.member.name : t("Available", "متاح")) +
              '">' +
              esc(s.member ? s.member.name : t("Empty chair", "كرسي فارغ")) +
              "</strong><small>" +
              t("Seat", "مقعد") +
              " " +
              (s.index + 1) +
              "</small></div>"
            );
          })
          .join("") +
        "</div></div>",
    );
  }
  previousSeats = seats;
  return (
    '<section class="classroom-panel"><div class="panel-heading"><div><span class="section-kicker">' +
    t("YOUR ORBIT CLASSROOM", "صفك المداري") +
    "</span><h2>" +
    t("A place for every learner", "مكان لكل متعلم") +
    '</h2></div><span class="room-count">' +
    C.members(c.id).length +
    " " +
    t("members", "أعضاء") +
    '</span></div><p class="muted">' +
    t(
      "Seats reflect admitted members. Empty seats are available positions, not a class capacity limit.",
      "المقاعد تعكس الأعضاء المنضمين. المقاعد الفارغة أماكن متاحة وليست حدًا لسعة الصف.",
    ) +
    "</p>" +
    seatChoicePrompt(seats) +
    roomControls(seats, pageCount) +
    groups.join("") +
    roomNavigation(pageCount, offset, seats.length) +
    '<div class="room-legend"><span>● ' +
    t("Admitted", "منضم") +
    "</span><span>○ " +
    t("Available seat", "مقعد متاح") +
    '</span><button class="text-button" id="open-members">' +
    t("View member list", "عرض قائمة الأعضاء") +
    " ↗</button></div></section>"
  );
}

function seatChoicePrompt(seats) {
  if (O.user.role !== "student") return "";
  const own = seats.find((s) => s.member?.id === O.user.email);
  return (
    '<div class="seat-choice-prompt" role="status"><strong>' +
    (own
      ? t("Your seat: ", "مقعدك: ") + (own.index + 1)
      : t("Choose where you want to sit", "اختر وين تحب تقعد")) +
    "</strong><span>" +
    (own
      ? t("Click an empty chair to change your seat.", "اضغط على كرسي فارغ لتغيّر مقعدك.")
      : t(
          "You have joined. Select an empty chair below to take your seat.",
          "تم انضمامك. اختر كرسيًا فارغًا لتجلس فيه.",
        )) +
    "</span>" +
    (own
      ? '<button class="text-button" id="find-my-seat">' +
        t("Show my seat", "اعرض مقعدي") +
        "</button>"
      : "") +
    "</div>"
  );
}
function bindSeatChoice() {
  document.querySelectorAll("[data-choose-seat]").forEach(
    (button) =>
      (button.onclick = () => {
        try {
          const index = Number(button.dataset.chooseSeat),
            oldSeat = previousSeats.find((s) => s.member?.id === O.user.email),
            oldFigure =
              oldSeat &&
              document.querySelector('[data-seat="' + oldSeat.index + '"] .seat-illustration'),
            oldRect = oldFigure?.getBoundingClientRect(),
            from = oldRect ? { x: oldRect.left + scrollX, y: oldRect.top + scrollY } : null;
          if (C.selectSeat(channelId, index) !== true) return;
          section = "overview";
          roomPage = Math.floor(index / 12);
          highlightSeat = index;
          change = { kind: "join", id: O.user.email, from, fromSeat: oldSeat?.index };
          feedback(
            t(
              "Your seat is saved. You can change it by selecting another empty chair.",
              "تم حفظ مقعدك. يمكنك تغييره باختيار كرسي فارغ آخر.",
            ),
          );
        } catch (ex) {
          error(ex.message);
          renderChannel();
          error(ex.message);
        }
      }),
  );
  document.getElementById("find-my-seat")?.addEventListener("click", () => {
    const own = previousSeats.find((s) => s.member?.id === O.user.email);
    if (!own) return;
    roomPage = Math.floor(own.index / 12);
    highlightSeat = own.index;
    renderChannel();
    document.querySelector('[data-seat="' + own.index + '"] .seat-person')?.focus();
  });
}

function roomControls(seats, pageCount) {
  return (
    '<div class="room-tools"><label class="room-search">' +
    t("Find a student’s seat", "ابحث عن مقعد طالب") +
    '<input id="seat-search" type="search" autocomplete="off" value="' +
    esc(seatQuery) +
    '" placeholder="' +
    t("Student name…", "اسم الطالب…") +
    '" aria-controls="seat-search-results"></label><label class="room-group-label">' +
    t("Classroom group", "مجموعة الصف") +
    '<select id="room-group" aria-label="' +
    t("Select classroom group", "اختر مجموعة الصف") +
    '">' +
    Array.from(
      { length: pageCount },
      (_, index) =>
        '<option value="' +
        index +
        '" ' +
        (index === roomPage ? "selected" : "") +
        ">" +
        t("Group", "مجموعة") +
        " " +
        (index + 1) +
        "</option>",
    ).join("") +
    '</select></label></div><div id="seat-search-results" class="seat-search-results" role="region" aria-label="' +
    t("Student search results", "نتائج البحث عن الطلاب") +
    '"></div>'
  );
}
function roomNavigation(pageCount, offset, total) {
  return (
    '<div class="room-pagination"><button class="room-page-button" id="room-previous" ' +
    (roomPage === 0 ? "disabled" : "") +
    ">" +
    t("Previous group", "المجموعة السابقة") +
    '</button><span id="room-page-status" role="status">' +
    t("Group", "مجموعة") +
    " " +
    (roomPage + 1) +
    " / " +
    pageCount +
    "<small>" +
    t("Seats", "المقاعد") +
    " " +
    (offset + 1) +
    "–" +
    Math.min(offset + 12, total) +
    '</small></span><button class="room-page-button" id="room-next" ' +
    (roomPage >= pageCount - 1 ? "disabled" : "") +
    ">" +
    t("Next group", "المجموعة التالية") +
    "</button></div>"
  );
}
function seatSearchResults() {
  const target = document.getElementById("seat-search-results");
  if (!target) return;
  const query = seatQuery.trim().toLocaleLowerCase();
  if (!query) {
    target.innerHTML = "";
    return;
  }
  const matches = previousSeats.filter(
    (s) => s.member && s.member.name.toLocaleLowerCase().includes(query),
  );
  target.innerHTML =
    '<p role="status">' +
    matches.length +
    " " +
    t("matching students", "طلاب مطابقين") +
    "</p>" +
    matches
      .slice(0, 20)
      .map(
        (s) =>
          '<button class="seat-search-result" data-find-seat="' +
          s.index +
          '"><strong>' +
          esc(s.member.name) +
          "</strong><span>" +
          t("Group", "مجموعة") +
          " " +
          (Math.floor(s.index / 12) + 1) +
          " · " +
          t("Seat", "مقعد") +
          " " +
          (s.index + 1) +
          "</span></button>",
      )
      .join("") +
    (matches.length > 20
      ? "<p>" +
        t(
          "Showing the first 20 matches. Refine the name to find a specific student.",
          "تظهر أول 20 نتيجة. اكتب الاسم بدقة للوصول لطالب محدد.",
        ) +
        "</p>"
      : "");
  target.querySelectorAll("[data-find-seat]").forEach(
    (button) =>
      (button.onclick = () => {
        highlightSeat = Number(button.dataset.findSeat);
        roomPage = Math.floor(highlightSeat / 12);
        renderChannel();
        const seat = document.querySelector('[data-seat="' + highlightSeat + '"]');
        seat?.querySelector(".seat-person")?.focus();
        seat?.scrollIntoView({
          block: "nearest",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        });
      }),
  );
}
function bindRoomNavigation() {
  document.getElementById("seat-search")?.addEventListener("input", (event) => {
    seatQuery = event.target.value;
    highlightSeat = null;
    document.querySelector(".seat-found")?.classList.remove("seat-found");
    seatSearchResults();
  });
  document.getElementById("room-group")?.addEventListener("change", (event) => {
    roomPage = Number(event.target.value);
    highlightSeat = null;
    renderChannel();
    document.getElementById("room-group")?.focus();
  });
  for (const [id, delta] of [
    ["room-previous", -1],
    ["room-next", 1],
  ])
    document.getElementById(id)?.addEventListener("click", () => {
      roomPage += delta;
      highlightSeat = null;
      renderChannel();
      document.getElementById(id)?.focus();
    });
  seatSearchResults();
}
function postCard(p, c) {
  const data = O.db(),
    liked = data.likes.includes(p.id),
    saved = data.saved.includes(p.id),
    participate = C.admitted(c);
  return (
    '<article class="card post" data-post="' +
    esc(p.id) +
    '"><header><span class="post-type">' +
    (types[p.type] ? t(...types[p.type]) : esc(p.type)) +
    (p.sample ? " · " + t("Demo sample", "مثال تجريبي") : "") +
    "</span>" +
    (p.createdAt
      ? "<time>" +
        esc(
          new Intl.DateTimeFormat(t("en", "ar"), { dateStyle: "medium" }).format(
            new Date(p.createdAt),
          ),
        ) +
        "</time>"
      : "") +
    "</header><h2>" +
    esc(title(p)) +
    '</h2><p class="post-body">' +
    esc(body(p)) +
    "</p>" +
    O.attachment(p) +
    (p.dueDate ? "<p>" + t("Due: ", "موعد التسليم: ") + esc(p.dueDate) + "</p>" : "") +
    (O.own(c)
      ? '<div class="post-actions"><button class="btn soft" data-edit="' +
        esc(p.id) +
        '">' +
        t("Edit", "تعديل") +
        '</button><button class="btn danger" data-delete="' +
        esc(p.id) +
        '">' +
        t("Delete", "حذف") +
        "</button></div>"
      : "") +
    (p.type === "assignment" ? '<div data-assignment-slot="' + esc(p.id) + '"></div>' : "") +
    (participate
      ? '<div class="post-actions"><button class="btn soft" data-like="' +
        esc(p.id) +
        '">' +
        (liked ? "♥" : "♡") +
        " " +
        Number(liked) +
        '</button><button class="btn soft" data-save="' +
        esc(p.id) +
        '">' +
        (saved ? t("Saved", "محفوظ") : t("Save", "حفظ")) +
        '</button></div><div class="comments">' +
        (data.comments[p.id] || [])
          .map(
            (m) =>
              "<p><b>" +
              esc(
                m.authorId
                  ? OrbitProfiles.read(m.authorId).name || t("Student", "طالب")
                  : m.name || t("Student", "طالب"),
              ) +
              "</b> " +
              esc(m.text) +
              "</p>",
          )
          .join("") +
        '</div><form data-comment="' +
        esc(p.id) +
        '"><label>' +
        t("Class discussion", "نقاش الصف") +
        '<input name="text" required maxlength="300"></label><button class="btn soft">' +
        t("Comment", "تعليق") +
        "</button></form>"
      : "") +
    "</article>"
  );
}
function content(c) {
  const list = posts(c),
    filtered =
      section === "lessons"
        ? list.filter((p) => ["lesson", "video"].includes(p.type))
        : section === "assignments"
          ? list.filter((p) => p.type === "assignment")
          : section === "resources"
            ? list.filter((p) => (p.attachments || []).length)
            : list.filter((p) => ["announcement", "discussion"].includes(p.type));
  return (
    '<div class="panel-heading"><h2>' +
    t(...tabs.find((x) => x[0] === section).slice(1)) +
    '</h2><span class="muted">' +
    filtered.length +
    " " +
    t("posts", "منشورات") +
    "</span></div>" +
    (filtered.map((p) => postCard(p, c)).join("") ||
      '<div class="content-empty"><span>◇</span><h3>' +
        t("Nothing published here yet", "لم يُنشر محتوى هنا بعد") +
        "</h3><p>" +
        t(
          "New content will appear in this section when the teacher publishes it.",
          "سيظهر المحتوى هنا عندما ينشره المعلم.",
        ) +
        "</p></div>")
  );
}
function renderChannel() {
  let c;
  try {
    c = C.find(channelId);
  } catch {
    O.shell(
      t("Channel not found", "القناة غير موجودة"),
      '<a class="btn" href="../channels/channels.html">' +
        t("Back to channels", "العودة للقنوات") +
        "</a>",
    );
    return;
  }
  const owner = O.own(c),
    admitted = C.admitted(c),
    read = C.canRead(c);
  if (!admitted && section === "members") section = "overview";
  O.shell(
    esc(O.label(c)),
    '<div class="channel-top"><a href="../channels/channels.html">← ' +
      t("All channels", "كل القنوات") +
      '</a><button class="btn soft" id="channel-language">' +
      t("العربية", "English") +
      '</button></div><section class="channel-summary">' +
      (c.coverAsset
        ? '<img class="channel-cover-image" data-asset="' + esc(c.coverAsset) + '" alt="">'
        : "") +
      '<div><span class="channel-badge">' +
      (c.private ? t("Private classroom", "صف خاص") : t("Public channel", "قناة عامة")) +
      " · " +
      esc(subject(c)) +
      '</span><p class="summary-description">' +
      esc(t(c.descEn || c.descAr || "", c.descAr || c.descEn || "")) +
      '</p><a class="teacher-link" href="../teacher-profile/teacher-profile.html?id=' +
      encodeURIComponent(c.teacher) +
      '">' +
      t("Led by", "بإشراف") +
      " " +
      esc(O.teacher(c.teacher)) +
      ' ↗</a></div><div class="summary-actions">' +
      (owner
        ? '<button class="btn" id="publish">＋ ' +
          t("Publish content", "نشر محتوى") +
          '</button><button class="btn soft" id="manage-channel">' +
          t("Channel settings", "إعدادات القناة") +
          "</button>"
        : !O.user.email || O.user.role === "student"
          ? '<button class="btn" id="membership">' +
            (admitted
              ? t("Leave channel", "مغادرة القناة")
              : c.private
                ? t("Join with code", "انضم بكود")
                : t("Join channel", "انضم للقناة")) +
            "</button>"
          : "") +
      '</div></section><p id="channel-status" role="status" tabindex="-1">' +
      esc(notice) +
      "</p>" +
      (!read
        ? '<section class="locked-channel"><span>◇</span><h2>' +
          t("Your classroom is one invitation away", "دعوة واحدة تفصلك عن صفك") +
          "</h2><p>" +
          t(
            "Enter the code from your teacher to access lessons, resources and your classroom.",
            "أدخل كود معلمك للوصول للدروس والمصادر والصف.",
          ) +
          '</p><button class="btn" id="locked-join">' +
          t("Enter invitation code", "أدخل كود الدعوة") +
          "</button></section>"
        : '<nav class="channel-tabs" aria-label="' +
          t("Channel sections", "أقسام القناة") +
          '">' +
          tabs
            .filter((x) => x[0] !== "members" || admitted)
            .map(
              (x) =>
                '<button data-section="' +
                x[0] +
                '" aria-current="' +
                (section === x[0] ? "page" : "false") +
                '">' +
                t(...x.slice(1)) +
                "</button>",
            )
            .join("") +
          '</nav><div class="channel-layout"><div class="channel-main">' +
          (section === "overview" && admitted ? classroom(c) : "") +
          (section === "members"
            ? '<section class="members-panel"><div class="panel-heading"><h2>' +
              t("Class members", "أعضاء الصف") +
              "</h2><span>" +
              C.members(c.id).length +
              "</span></div>" +
              memberList(c) +
              "</section>"
            : '<section class="content-panel">' + content(c) + "</section>") +
          '</div><aside class="channel-aside"><section><span class="section-kicker">' +
          t("ABOUT THIS CHANNEL", "عن هذه القناة") +
          "</span><h3>" +
          esc(subject(c)) +
          "</h3><p>" +
          esc(
            t(c.descEn || c.descAr || "", c.descAr || c.descEn || "") ||
              t("Learn together, one lesson at a time.", "نتعلم معًا، درسًا بعد درس."),
          ) +
          "</p><dl><div><dt>" +
          t("Members", "الأعضاء") +
          "</dt><dd>" +
          C.members(c.id).length +
          "</dd></div><div><dt>" +
          t("Published content", "المحتوى المنشور") +
          "</dt><dd>" +
          posts(c).length +
          "</dd></div><div><dt>" +
          t("Access", "الوصول") +
          "</dt><dd>" +
          (c.private ? t("By code", "بكود") : t("Public", "عام")) +
          "</dd></div></dl></section>" +
          (owner && c.private
            ? '<section class="invite-panel"><span class="section-kicker">' +
              t("INVITE YOUR CLASS", "ادعُ طلابك") +
              "</span><h3>" +
              t("Bring learners into your orbit", "اجمع المتعلمين في مدارك") +
              "</h3><p>" +
              t("Share this code with your students.", "شارك هذا الكود مع طلابك.") +
              '</p><strong class="invitation-code" dir="ltr">' +
              esc(c.code) +
              '</strong><button class="btn soft" id="copy-code">' +
              t("Copy code", "نسخ الكود") +
              '</button><button class="text-button" id="regenerate-code">' +
              t("Regenerate code", "إنشاء كود جديد") +
              "</button></section>"
            : "") +
          "</aside></div>"),
  );
  document.title = "ORBIT · " + O.label(c);
  bind(c);
  O.hydrate();
  const renderedRoom = document.querySelector(".orbit-room"),
    pendingMove = change;
  change = null;
  if (pendingMove)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (renderedRoom?.isConnected) {
          change = pendingMove;
          animateChange();
        }
      }),
    );
}

function animateChange() {
  if (!change) return;
  const event = change;
  change = null;
  if (
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.body.dataset.mood === "calm"
  )
    return;
  if (event.kind === "join") {
    const seat = previousSeats.find((s) => s.member?.id === event.id),
      el = seat && document.querySelector('[data-seat="' + seat.index + '"]');
    if (!el) return;
    const room = el.closest(".orbit-room"),
      walker = el.querySelector(".walking-student"),
      sitting = el.querySelector(".sitting-student"),
      name = el.querySelector(".seat-name"),
      r = room.getBoundingClientRect(),
      p = walker.getBoundingClientRect();
    let start = event.from;
    // When moving between groups, preserve the original row/column position in the shared classroom layout.
    if (!start && Number.isInteger(event.fromSeat)) {
      const original = room
        .querySelectorAll(".class-seat")
        [event.fromSeat % 12]?.querySelector(".seat-illustration")
        ?.getBoundingClientRect();
      if (original) start = { x: original.left + scrollX, y: original.top + scrollY };
    }
    const moving = !!start,
      dx = moving ? start.x - (p.left + scrollX) : r.left + r.width / 2 - (p.left + p.width / 2),
      dy = moving ? start.y - (p.top + scrollY) : r.bottom - 30 - (p.top + p.height),
      duration = Math.max(700, Math.min(1300, 650 + Math.hypot(dx, dy) * 0.65));
    el.classList.add("student-arriving");
    walker.style.opacity = "1";
    sitting.style.opacity = "0";
    name.style.opacity = "0";
    const walk = walker.animate(
      [
        { transform: "translate(" + dx + "px," + dy + "px)", opacity: moving ? 1 : 0, offset: 0 },
        { transform: "translate(" + dx + "px," + (dy - 6) + "px)", opacity: 1, offset: 0.12 },
        { transform: "translate(0,-6px)", opacity: 1, offset: 0.87 },
        { transform: "translate(0,0)", opacity: 1, offset: 1 },
      ],
      { duration, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" },
    );
    walk.finished
      .then(() => {
        if (!el.isConnected) return;
        walker.animate(
          [
            { opacity: 1, transform: "translateY(0)" },
            { opacity: 0, transform: "translateY(8px)" },
          ],
          { duration: 220, fill: "forwards" },
        );
        sitting.style.opacity = "1";
        sitting.animate(
          [
            { transform: "translateY(-10px)", opacity: 0 },
            { transform: "translateY(0)", opacity: 1 },
          ],
          { duration: 300, easing: "cubic-bezier(.2,.7,.3,1)" },
        );
        name.style.opacity = "1";
        name.animate(
          [
            { opacity: 0, transform: "translateY(4px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 250 },
        );
        el.classList.remove("student-arriving");
      })
      .catch(() => {});
  } else {
    const el = document.querySelector('[data-seat="' + event.seat + '"]');
    if (!el) return;
    const figure = el.querySelector(".seat-illustration");
    figure.insertAdjacentHTML("beforeend", walkingFigure());
    const walker = figure.querySelector(".walking-student");
    walker.style.opacity = "1";
    const animation = walker.animate(
      [
        { transform: "translateY(0)", opacity: 1 },
        { transform: "translate(50px,45px)", opacity: 0 },
      ],
      { duration: 550, easing: "cubic-bezier(.23,1,.32,1)", fill: "forwards" },
    );
    animation.finished.then(() => walker.remove()).catch(() => walker.remove());
  }
}
function joinCode() {
  if (!OrbitSubscriptions.requireAccount("student")) return;
  const d = O.dialog(
    "<h2>" +
      t("Join your classroom", "انضم إلى صفك") +
      '</h2><form id="join-form"><label>' +
      t("Invitation code", "كود الدعوة") +
      '<input name="code" required dir="ltr" maxlength="64" autocomplete="off"></label><p class="error" role="alert"></p><button class="btn">' +
      t("Join classroom", "انضم للصف") +
      "</button></form>",
  );
  d.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    try {
      const code = new FormData(e.target).get("code").trim().toUpperCase(),
        c = C.find(channelId);
      if (!c.private || code !== c.code)
        throw Error(t("Invalid code for this channel.", "الكود غير صحيح لهذه القناة."));
      if (C.join(c.id, false, code) === false) return;
      d.close();
      section = "overview";
      feedback(
        t(
          "You joined successfully. Choose an empty chair.",
          "تم انضمامك بنجاح. اختر كرسيًا فارغًا.",
        ),
      );
    } catch (ex) {
      d.querySelector(".error").textContent = ex.message;
    }
  };
}
function confirmation(title, description, action) {
  const d = O.dialog(
    "<h2>" +
      title +
      "</h2><p>" +
      description +
      '</p><div class="dialog-actions"><button class="btn danger" id="confirm-action">' +
      t("Confirm", "تأكيد") +
      '</button><button class="btn soft" id="cancel-action">' +
      t("Cancel", "إلغاء") +
      '</button></div><p class="error" role="alert"></p>',
  );
  d.querySelector("#cancel-action").onclick = () => d.close();
  d.querySelector("#confirm-action").onclick = () => {
    try {
      action();
      d.close();
    } catch (ex) {
      d.querySelector(".error").textContent = ex.message;
    }
  };
}
function manage(c) {
  if (!O.own(C.find(c.id))) return;
  const d = O.dialog(
    "<h2>" +
      t("Channel settings", "إعدادات القناة") +
      '</h2><form id="settings-form"><label>' +
      t("Name in Arabic", "الاسم بالعربية") +
      '<input name="ar" required maxlength="100" value="' +
      esc(c.ar || c.en) +
      '"></label><label>' +
      t("Name in English", "الاسم بالإنجليزية") +
      '<input name="en" required maxlength="100" value="' +
      esc(c.en || c.ar) +
      '"></label><label>' +
      t("Description in Arabic", "الوصف بالعربية") +
      '<textarea name="descAr" maxlength="350">' +
      esc(c.descAr || "") +
      "</textarea></label><label>" +
      t("Description in English", "الوصف بالإنجليزية") +
      '<textarea name="descEn" maxlength="350">' +
      esc(c.descEn || "") +
      "</textarea></label><label>" +
      t("Subject", "المادة") +
      '<select name="subject">' +
      Object.entries(subjects)
        .map(
          ([key, value]) =>
            '<option value="' +
            key +
            '" ' +
            (c.subject === key ? "selected" : "") +
            ">" +
            t(...value) +
            "</option>",
        )
        .join("") +
      "</select></label><label>" +
      t("New cover (optional)", "غلاف جديد (اختياري)") +
      '<input name="cover" type="file" accept="image/png,image/jpeg,image/webp"></label><label><input name="removeCover" type="checkbox"> ' +
      t("Remove cover", "إزالة الغلاف") +
      "</label>" +
      (c.private
        ? "<label>" +
          t("Invitation expires (optional)", "انتهاء صلاحية الدعوة (اختياري)") +
          '<input name="expires" type="datetime-local" value="' +
          (c.codeExpiresAt ? esc(localDate(c.codeExpiresAt)) : "") +
          '"></label>'
        : "") +
      '<p class="muted">' +
      t(
        "Access type is kept unchanged to avoid publishing private classroom content.",
        "نوع الوصول ثابت لتجنب نشر محتوى الصف الخاص علنًا.",
      ) +
      '</p><p class="error" role="alert"></p><button class="btn">' +
      t("Save settings", "حفظ الإعدادات") +
      "</button></form>",
  );
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target,
      f = new FormData(form),
      button = form.querySelector(".btn");
    button.disabled = true;
    try {
      const updates = {};
      for (const key of ["ar", "en", "descAr", "descEn", "subject"])
        updates[key] = f.get(key).trim();
      if (!updates.ar || !updates.en) throw Error(t("Enter the channel name.", "أدخل اسم القناة."));
      if (c.private)
        updates.codeExpiresAt = f.get("expires") ? new Date(f.get("expires")).toISOString() : null;
      const image = form.elements.cover.files[0];
      if (image) {
        if (
          !["image/png", "image/jpeg", "image/webp"].includes(image.type) ||
          image.size > 5 * 1024 * 1024
        )
          throw Error(
            t(
              "Use a PNG, JPEG or WebP image under 5 MB.",
              "استخدم صورة PNG أو JPEG أو WebP أصغر من 5 MB.",
            ),
          );
        updates.coverAsset = "cover-" + crypto.randomUUID();
        await O.media(updates.coverAsset, image);
      } else if (f.has("removeCover")) updates.coverAsset = "";
      C.save(c.id, updates);
      d.close();
      feedback(t("Channel settings saved.", "تم حفظ إعدادات القناة."));
    } catch (ex) {
      d.querySelector(".error").textContent = ex.message;
    } finally {
      button.disabled = false;
    }
  };
}
function localDate(date) {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function bind(c) {
  bindStudentDetails();
  bindRoomNavigation();
  bindSeatChoice();
  document.getElementById("channel-language").onclick = () => {
    const prefs = O.get("orbit.student.v1", {});
    prefs.lang = t("ar", "en");
    O.set("orbit.student.v1", prefs);
    location.reload();
  };
  document.querySelectorAll("[data-section]").forEach(
    (b) =>
      (b.onclick = () => {
        section = b.dataset.section;
        renderChannel();
        document.querySelector('[data-section="' + section + '"]').focus();
      }),
  );
  document.getElementById("open-members")?.addEventListener("click", () => {
    section = "members";
    renderChannel();
  });
  document
    .getElementById("publish")
    ?.addEventListener("click", () =>
      O.editor(c.id, null, () => feedback(t("Content saved.", "تم حفظ المحتوى."))),
    );
  document.getElementById("manage-channel")?.addEventListener("click", () => manage(c));
  document.getElementById("locked-join")?.addEventListener("click", joinCode);
  document.getElementById("membership")?.addEventListener("click", () => {
    if (C.admitted(c)) {
      confirmation(
        t("Leave this channel?", "مغادرة هذه القناة؟"),
        t(
          "You will need a valid code to rejoin a private classroom.",
          "ستحتاج كودًا صالحًا للعودة إلى الصف الخاص.",
        ),
        () => {
          const seat = previousSeats.find((s) => s.member?.id === O.user.email);
          if (C.join(c.id, true) === false) return;
          change = { kind: "remove", seat: seat?.index };
          feedback(t("You left the channel.", "تمت مغادرة القناة."));
        },
      );
    } else if (c.private) joinCode();
    else
      try {
        if (C.join(c.id) === false) return;
        section = "overview";
        feedback(
          t(
            "You joined successfully. Choose an empty chair.",
            "تم انضمامك بنجاح. اختر كرسيًا فارغًا.",
          ),
        );
      } catch (ex) {
        error(ex.message);
      }
  });
  document.getElementById("copy-code")?.addEventListener("click", async () => {
    try {
      if (!O.own(C.find(c.id))) return;
      await navigator.clipboard.writeText(C.find(c.id).code);
      feedback(t("Invitation code copied.", "تم نسخ كود الدعوة."));
    } catch {
      error(
        t(
          "Could not copy. Select the code and copy it manually.",
          "تعذر النسخ. حدد الكود وانسخه يدويًا.",
        ),
      );
    }
  });
  document.getElementById("regenerate-code")?.addEventListener("click", () =>
    confirmation(
      t("Replace the invitation code?", "استبدال كود الدعوة؟"),
      t(
        "The old code will stop working. Current members stay admitted.",
        "سيتوقف الكود القديم. الأعضاء الحاليون يبقون منضمين.",
      ),
      () => {
        C.save(c.id, { code: C.code(), codeExpiresAt: null });
        feedback(t("A new invitation code is ready.", "كود الدعوة الجديد جاهز."));
      },
    ),
  );
  document.querySelectorAll("[data-remove]").forEach(
    (b) =>
      (b.onclick = () =>
        confirmation(
          t("Remove this student?", "إزالة هذا الطالب؟"),
          t(
            "They will lose access to this private classroom.",
            "سيفقد الطالب الوصول إلى الصف الخاص.",
          ),
          () => {
            const seat = previousSeats.find((s) => s.member?.id === b.dataset.remove);
            C.remove(c.id, b.dataset.remove);
            section = "overview";
            change = { kind: "remove", seat: seat?.index };
            feedback(
              t("Student removed. The seat is available.", "تمت إزالة الطالب. المقعد متاح الآن."),
            );
          },
        )),
  );
  document.querySelectorAll("[data-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!O.own(C.find(c.id))) return;
        const p = posts(c).find((p) => p.id === b.dataset.edit);
        if (p?.sample && !O.db().posts.some((x) => x.id === p.id)) {
          const data = O.db();
          data.posts.push({ ...p, title: title(p), body: body(p) });
          O.set("orbit.channels.v2", data);
        }
        O.editor(c.id, b.dataset.edit, () => feedback(t("Content updated.", "تم تحديث المحتوى.")));
      }),
  );
  document.querySelectorAll("[data-delete]").forEach(
    (b) =>
      (b.onclick = () =>
        confirmation(
          t("Delete this post?", "حذف هذا المنشور؟"),
          t(
            "This removes the published content from the channel.",
            "سيُزال المحتوى المنشور من القناة.",
          ),
          () => {
            if (!O.own(C.find(c.id)))
              throw Error(t("Only the owner can delete content.", "حذف المحتوى متاح للمالك فقط."));
            const data = O.db();
            data.posts = data.posts.filter((p) => p.id !== b.dataset.delete);
            delete data.comments[b.dataset.delete];
            O.set("orbit.channels.v2", data);
            O.set("orbit.deleted.posts", [...O.get("orbit.deleted.posts", []), b.dataset.delete]);
            feedback(t("Post deleted.", "تم حذف المنشور."));
          },
        )),
  );
  for (const action of ["like", "save"])
    document.querySelectorAll("[data-" + action + "]").forEach(
      (b) =>
        (b.onclick = () => {
          try {
            guard(c, true);
            const data = O.db(),
              key = action === "like" ? "likes" : "saved",
              id = b.dataset[action];
            data[key] = data[key].includes(id)
              ? data[key].filter((x) => x !== id)
              : [...data[key], id];
            O.set("orbit.channels.v2", data);
            renderChannel();
          } catch (ex) {
            error(ex.message);
          }
        }),
    );
  document.querySelectorAll("[data-comment]").forEach(
    (form) =>
      (form.onsubmit = (e) => {
        e.preventDefault();
        try {
          guard(c, true);
          const text = new FormData(form).get("text").trim();
          if (!text) return;
          const data = O.db();
          (data.comments[form.dataset.comment] ??= []).push({
            name: O.user.name || t("Student", "طالب"),
            authorId: O.user.email,
            text,
          });
          O.set("orbit.channels.v2", data);
          feedback(t("Comment added.", "تمت إضافة التعليق."));
        } catch (ex) {
          error(ex.message);
        }
      }),
  );
}
window.addEventListener("storage", (e) => {
  if (
    [
      "orbit.memberships.v3",
      "orbit.channels.v2",
      "orbit.profiles.v1",
      "orbit.classrooms.v1",
    ].includes(e.key)
  ) {
    const old = previousSeats;
    const fresh = C.members(channelId),
      added = fresh.find((m) => !old.some((s) => s.member?.id === m.id)),
      removed = old.find((s) => s.member && !fresh.some((m) => m.id === s.member.id));
    if (added) change = { kind: "join", id: added.id };
    else if (removed) change = { kind: "remove", seat: removed.index };
    renderChannel();
  }
});
renderChannel();
const selectedPost = new URLSearchParams(location.search).get("post");
if (selectedPost) {
  const c = C.find(channelId),
    p = posts(c).find((p) => p.id === selectedPost);
  if (p && C.canRead(c)) {
    section =
      p.type === "assignment"
        ? "assignments"
        : ["lesson", "video"].includes(p.type)
          ? "lessons"
          : "overview";
    renderChannel();
    [...document.querySelectorAll("[data-post]")]
      .find((el) => el.dataset.post === selectedPost)
      ?.scrollIntoView({ block: "start" });
  }
}
