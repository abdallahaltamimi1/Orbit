(() => {
  "use strict";
  const M = OrbitMeetings;
  const t = M.t;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
    );
  const active = () => OrbitAuth.current() || {};
  const locale = () => (document.documentElement.lang === "en" ? "en" : "ar");
  const meetingURL = (id) => "../meetings/meeting.html?id=" + encodeURIComponent(id);
  const statuses = () => ({
    upcoming: t("Upcoming", "قادم"),
    live: t("In progress", "جارٍ الآن"),
    completed: t("Meeting ended", "انتهى الاجتماع"),
    cancelled: t("Cancelled", "ملغى"),
  });
  const dateText = (meeting) =>
    new Intl.DateTimeFormat(locale(), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: meeting.timezone || undefined,
    }).format(new Date(meeting.startAt));
  const duration = (meeting) =>
    Math.round((Date.parse(meeting.endAt) - Date.parse(meeting.startAt)) / 60000);
  let observer,
    interval,
    toastTimer,
    queued = false;
  function feedback(message) {
    let node = document.getElementById("meeting-toast");
    if (!node) {
      node = document.createElement("div");
      node.id = "meeting-toast";
      node.className = "meeting-toast";
      node.setAttribute("role", "status");
      document.body.append(node);
    }
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      node.hidden = true;
    }, 6000);
  }
  function dialog(title, content) {
    document.querySelector("#meeting-dialog")?.remove();
    const node = document.createElement("dialog");
    node.id = "meeting-dialog";
    node.className = "meeting-dialog";
    node.innerHTML = `<header><h2 id="meeting-dialog-title">${esc(title)}</h2><button class="meeting-button" type="button" data-close-dialog aria-label="${t("Close", "إغلاق")}">×</button></header>${content}`;
    node.setAttribute("aria-labelledby", "meeting-dialog-title");
    document.body.append(node);
    node.querySelector("[data-close-dialog]").onclick = () => node.close();
    node.showModal();
    return node;
  }
  function audienceText(meeting) {
    if (meeting.audience.mode === "channel")
      return t("All enrolled students", "كل الطلاب المسجلين");
    if (meeting.audience.mode === "group")
      return (
        M.data().groups.find((group) => group.id === meeting.audience.groupId)?.name ||
        t("Student group", "مجموعة طلاب")
      );
    return t("Selected students", "طلاب محددون");
  }
  function until(meeting) {
    const minutes = Math.max(1, Math.ceil((Date.parse(meeting.startAt) - Date.now()) / 60000));
    if (minutes < 60) return t(`Starts in ${minutes} min`, `يبدأ خلال ${minutes} دقيقة`);
    if (minutes < 1440)
      return t(
        `Starts in ${Math.ceil(minutes / 60)} hours`,
        `يبدأ خلال ${Math.ceil(minutes / 60)} ساعة`,
      );
    return t(
      `Starts in ${Math.ceil(minutes / 1440)} days`,
      `يبدأ خلال ${Math.ceil(minutes / 1440)} يوم`,
    );
  }
  function resources(meeting) {
    return (meeting.resources || [])
      .map(
        (resource) =>
          `<a class="meeting-button" href="${esc(resource.url)}" target="_blank" rel="noopener noreferrer">${esc(resource.name)} ↗</a>`,
      )
      .join("");
  }
  function card(meeting) {
    const status = M.status(meeting),
      role = active().role;
    return `<article class="meeting-card" data-meeting-record="${esc(meeting.id)}"><span class="meeting-badge ${status}">${statuses()[status]}</span><h3>${esc(meeting.title)}</h3><div class="meeting-meta">${esc(meeting.teacherName)} · ${esc(meeting.subject)}<br>${esc(dateText(meeting))} · ${duration(meeting)} ${t("min", "دقيقة")}<br>${esc(meeting.timezone || "")} · ${esc(meeting.channelName)}<br>${esc(audienceText(meeting))}</div>${role !== "school" ? `<p>${esc(meeting.description.slice(0, 180))}</p>` : ""}${status === "upcoming" ? `<p class="meeting-meta">${esc(until(meeting))}</p>` : ""}<div class="meeting-actions">${role !== "school" ? `<button class="meeting-button" data-meeting-details="${meeting.id}">${t("Details", "التفاصيل")}</button>${status === "live" ? `<a class="meeting-button primary" href="${meetingURL(meeting.id)}">${t("Join meeting", "انضم للاجتماع")}</a>` : status === "completed" || status === "cancelled" ? `<span class="meeting-meta">${statuses()[status]}</span>` : ""}` : ""}${role === "teacher" ? `<button class="meeting-button" data-meeting-edit="${meeting.id}">${t("Edit", "تعديل")}</button>${status !== "cancelled" && status !== "completed" ? `<button class="meeting-button" data-meeting-cancel="${meeting.id}">${t("Cancel", "إلغاء")}</button>` : ""}<button class="meeting-button danger" data-meeting-delete="${meeting.id}">${t("Delete", "حذف")}</button>` : ""}</div></article>`;
  }
  function render(section) {
    if (!section) return;
    const role = active().role,
      list = M.visible(),
      notes = M.notifications();
    const open = section.querySelector("details")?.open;
    section.dataset.lang = locale();
    section.innerHTML = `<div class="meeting-heading"><div><h2 id="meeting-section-title">${t("Online meetings", "الاجتماعات المباشرة")}</h2><p class="meeting-meta">${t("Your schedule, audience and learning sessions.", "مواعيدك وجمهورك وجلساتك التعليمية.")}</p></div>${role === "teacher" ? `<div class="meeting-actions"><button class="meeting-button primary" data-new-meeting>${t("Create meeting", "إنشاء اجتماع")}</button><button class="meeting-button" data-new-meeting-group>${t("Create group", "إنشاء مجموعة")}</button><button class="meeting-button" data-meeting-demo>${t("Demo setup", "إعداد التجربة")}</button></div>` : ""}</div><p class="meeting-local-note">${t("Local demonstration: schedules and notifications stay in this browser. Jitsi room links are public and do not enforce enrollment access.", "تجربة محلية: المواعيد والإشعارات محفوظة في هذا المتصفح. روابط غرف Jitsi عامة ولا تفرض حماية حسب العضوية.")}</p><div class="meeting-grid">${list.map(card).join("") || `<p class="meeting-empty">${role === "teacher" ? t("No meetings yet. Enroll students in a channel, then create a meeting.", "لا توجد اجتماعات بعد. سجّل الطلاب في قناة ثم أنشئ اجتماعًا.") : t("No meetings assigned to your account.", "لا توجد اجتماعات مخصصة لحسابك.")}</p>`}</div>${
      notes.length
        ? `<details class="meeting-notifications" ${open ? "open" : ""}><summary>${t("Meeting notifications", "إشعارات الاجتماعات")} · ${notes.filter((note) => !note.read).length}</summary>${notes
            .slice(0, 30)
            .map(
              (note) =>
                `<div class="meeting-notification"><div><p>${esc(note[locale()])}</p>${M.get(note.meetingId) ? `<button class="meeting-button" data-meeting-details="${note.meetingId}">${t("Details", "التفاصيل")}</button>` : ""}</div>${!note.read ? `<button class="meeting-button" data-meeting-read="${note.id}">${t("Mark read", "تمت القراءة")}</button>` : `<span class="meeting-meta">${t("Read", "مقروء")}</span>`}</div>`,
            )
            .join("")}</details>`
        : ""
    }`;
  }
  function mount() {
    if (!["teacher", "student", "school"].includes(active().role)) return;
    const host = document.querySelector("#overview,#main-content,#app main");
    if (!host) return;
    let section = document.getElementById("meetings-section");
    if (!section) {
      section = document.createElement("section");
      section.id = "meetings-section";
      section.className = "orbit-meetings";
      section.setAttribute("aria-labelledby", "meeting-section-title");
      section.tabIndex = -1;
      const tourEntry =
        active().role === "student" ? host.querySelector("#school-tour-entry") : null;
      const before = host.querySelector(".workspace-grid,.trajectory-section,.grid");
      if (tourEntry) tourEntry.after(section);
      else if (before) before.before(section);
      else host.append(section);
      render(section);
    } else if (section.dataset.lang !== locale()) render(section);
    const nav = document.querySelector("#orbit-rail nav");
    if (nav && !nav.querySelector("[data-meeting-nav]")) {
      const link = document.createElement("a");
      link.dataset.meetingNav = "";
      link.href = "#meetings-section";
      link.className = "orbit-nav-link";
      link.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="5" width="14" height="14" rx="3"/><path d="m17 10 4-3v10l-4-3"/></svg><span>${t("Meetings", "الاجتماعات")}</span>`;
      nav.append(link);
      link.addEventListener("click", () => {
        document.body.classList.remove("orbit-menu-open");
        const page = document.getElementById("orbit-page");
        if (page) page.inert = false;
        document.getElementById("orbit-mobile-toggle")?.setAttribute("aria-expanded", "false");
        document.getElementById("meetings-section")?.focus({ preventScroll: true });
      });
    }
    const navLink = nav?.querySelector("[data-meeting-nav] span");
    if (navLink && navLink.textContent !== t("Meetings", "الاجتماعات"))
      navLink.textContent = t("Meetings", "الاجتماعات");
  }
  function options(channels, current) {
    return channels
      .map(
        (channel) =>
          `<option value="${esc(channel.id)}" ${channel.id === current ? "selected" : ""}>${esc(locale() === "en" ? channel.en || channel.ar : channel.ar || channel.en)}</option>`,
      )
      .join("");
  }
  function studentCheckboxes(channelId, selected = []) {
    return (
      M.members(channelId)
        .map(
          (member) =>
            `<label><input name="studentIds" type="checkbox" value="${esc(member.id)}" ${selected.includes(member.id) ? "checked" : ""}>${esc(member.name)}</label>`,
        )
        .join("") ||
      `<p>${t("No enrolled students in this channel.", "لا يوجد طلاب مسجلون في هذه القناة.")}</p>`
    );
  }
  function localParts(iso) {
    const date = iso ? new Date(iso) : new Date(Date.now() + 3600000);
    const pad = (n) => String(n).padStart(2, "0");
    return {
      date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    };
  }
  function editor(id) {
    const old = id ? M.get(id) : null;
    if (id && (!old || old.teacherId !== active().email))
      throw Error(t("Meeting unavailable.", "الاجتماع غير متاح."));
    const channels = M.ownChannels();
    if (!channels.length) {
      feedback(t("Create a channel and enroll students first.", "أنشئ قناة وسجّل الطلاب أولًا."));
      return;
    }
    const start = localParts(old?.startAt),
      end = localParts(old?.endAt || new Date(Date.now() + 7200000).toISOString());
    const node = dialog(
      old ? t("Edit meeting", "تعديل الاجتماع") : t("Create meeting", "إنشاء اجتماع"),
      `<form id="meeting-form"><div class="meeting-form-grid"><label class="full">${t("Meeting title", "عنوان الاجتماع")}<input name="title" required maxlength="150" value="${esc(old?.title || "")}"></label><label>${t("Subject / course", "المادة / المقرر")}<input name="subject" required maxlength="100" value="${esc(old?.subject || "")}"></label><label>${t("Channel / class", "القناة / الصف")}<select name="channelId">${options(channels, old?.channelId)}</select></label><label class="full">${t("Description and agenda", "الوصف والأجندة")}<textarea name="description" required maxlength="3000">${esc(old?.description || "")}</textarea></label><label>${t("Date", "التاريخ")}<input name="date" type="date" required value="${start.date}"></label><label>${t("Meeting type", "نوع الاجتماع")}<select name="type">${[
        ["lesson", t("Live lesson", "درس مباشر")],
        ["revision", t("Revision", "مراجعة")],
        ["consultation", t("Consultation", "استشارة")],
        ["other", t("Other", "أخرى")],
      ]
        .map(
          ([value, label]) =>
            `<option value="${value}" ${old?.type === value ? "selected" : ""}>${label}</option>`,
        )
        .join(
          "",
        )}</select></label><label>${t("Start time", "وقت البداية")}<input name="start" type="time" required value="${start.time}"></label><label>${t("End time (same day)", "وقت النهاية (اليوم نفسه)")}<input name="end" type="time" required value="${end.time}"></label><p class="meeting-meta full">${t("Times use this device’s time zone:", "الأوقات حسب المنطقة الزمنية لهذا الجهاز:")} ${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}</p><label>${t("Audience", "الجمهور")}<select name="audienceMode">${[
        ["channel", t("All channel students", "كل طلاب القناة")],
        ["group", t("Specific group", "مجموعة محددة")],
        ["individual", t("Selected students", "طلاب محددون")],
      ]
        .map(
          ([value, label]) =>
            `<option value="${value}" ${old?.audience.mode === value ? "selected" : ""}>${label}</option>`,
        )
        .join(
          "",
        )}</select></label><label>${t("Status", "الحالة")}<select name="status"><option value="scheduled">${t("Scheduled", "مجدول")}</option><option value="cancelled" ${old?.status === "cancelled" ? "selected" : ""}>${t("Cancelled", "ملغى")}</option></select></label><div class="full" id="meeting-audience-fields"></div><label class="full">${t("Optional resources: name | HTTPS URL, one per line (max 5)", "مصادر اختيارية: الاسم | رابط HTTPS، كل مصدر بسطر (حتى 5)")}<textarea name="resources" dir="auto">${esc((old?.resources || []).map((resource) => resource.name + " | " + resource.url).join("\n"))}</textarea></label><p class="meeting-meta full">${t("A unique Jitsi room is generated on save. Editing keeps the same room.", "تُنشأ غرفة Jitsi فريدة عند الحفظ. التعديل يحافظ على الغرفة نفسها.")}</p></div><p class="meeting-feedback" id="meeting-form-error" role="alert"></p><button class="meeting-button primary" type="submit">${t("Save meeting", "حفظ الاجتماع")}</button></form>`,
    );
    const form = node.querySelector("form");
    let audienceDirty = false;
    function audienceFields() {
      const mode = form.elements.audienceMode.value,
        channelId = form.elements.channelId.value;
      const choices = M.groups(channelId);
      node.querySelector("#meeting-audience-fields").innerHTML =
        mode === "group"
          ? `<label>${t("Group", "المجموعة")}<select name="groupId" required><option value="">${t("Choose a group", "اختر مجموعة")}</option>${choices.map((group) => `<option value="${esc(group.id)}" ${old?.audience.groupId === group.id ? "selected" : ""}>${esc(group.name)}</option>`).join("")}</select></label>${!choices.length ? `<p>${t("Create a group before selecting this audience.", "أنشئ مجموعة قبل اختيار هذا الجمهور.")}</p>` : ""}`
          : mode === "individual"
            ? `<fieldset><legend>${t("Select students", "اختر الطلاب")}</legend><div class="meeting-checkboxes">${studentCheckboxes(channelId, old?.audience.studentIds)}</div></fieldset>`
            : `<p class="meeting-meta">${M.members(channelId).length} ${t("enrolled students", "طالب مسجل")}</p>`;
    }
    audienceFields();
    form.addEventListener("change", (event) => {
      if (["audienceMode", "channelId", "groupId", "studentIds"].includes(event.target.name))
        audienceDirty = true;
      if (["audienceMode", "channelId"].includes(event.target.name)) audienceFields();
    });
    form.onsubmit = (event) => {
      event.preventDefault();
      const f = new FormData(form),
        button = form.querySelector("[type=submit]");
      button.disabled = true;
      try {
        const audience =
          old && !audienceDirty
            ? old.audience
            : f.get("audienceMode") === "group"
              ? { mode: "group", groupId: f.get("groupId") }
              : f.get("audienceMode") === "individual"
                ? { mode: "individual", studentIds: f.getAll("studentIds") }
                : { mode: "channel" };
        let startAt = new Date(`${f.get("date")}T${f.get("start")}:00`).toISOString(),
          endAt = new Date(`${f.get("date")}T${f.get("end")}:00`).toISOString();
        if (old && f.get("date") === start.date && f.get("start") === start.time)
          startAt = old.startAt;
        if (old && f.get("date") === start.date && f.get("end") === end.time) endAt = old.endAt;
        const resourceList = String(f.get("resources"))
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => {
            const index = line.indexOf("|");
            return { name: line.slice(0, index).trim(), url: line.slice(index + 1).trim() };
          });
        M.put(
          {
            title: f.get("title"),
            subject: f.get("subject"),
            description: f.get("description"),
            channelId: f.get("channelId"),
            type: f.get("type"),
            status: f.get("status"),
            startAt: old && startAt === new Date(old.startAt).toISOString() ? old.startAt : startAt,
            endAt: old && endAt === new Date(old.endAt).toISOString() ? old.endAt : endAt,
            audience,
            resources: resourceList,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          old?.id,
          old?.revision,
        );
        node.close();
        feedback(
          t(
            "Meeting saved and delivered to its audience.",
            "تم حفظ الاجتماع وإيصاله للجمهور المحدد.",
          ),
        );
      } catch (error) {
        node.querySelector("#meeting-form-error").textContent = error.message;
      } finally {
        button.disabled = false;
      }
    };
  }
  function groupEditor() {
    const channels = M.ownChannels();
    if (!channels.length) {
      feedback(t("Create a channel first.", "أنشئ قناة أولًا."));
      return;
    }
    const node = dialog(
      t("Create student group", "إنشاء مجموعة طلاب"),
      `<form><div class="meeting-form-grid"><label class="full">${t("Group name", "اسم المجموعة")}<input name="name" required maxlength="100"></label><label class="full">${t("Channel", "القناة")}<select name="channelId">${options(channels)}</select></label><fieldset class="full"><legend>${t("Enrolled students", "الطلاب المسجلون")}</legend><div class="meeting-checkboxes"></div></fieldset></div><p class="meeting-feedback" role="alert"></p><button class="meeting-button primary" type="submit">${t("Save group", "حفظ المجموعة")}</button></form>`,
    );
    const form = node.querySelector("form"),
      update = () => {
        node.querySelector(".meeting-checkboxes").innerHTML = studentCheckboxes(
          form.elements.channelId.value,
        );
      };
    update();
    form.elements.channelId.onchange = update;
    form.onsubmit = (event) => {
      event.preventDefault();
      try {
        const f = new FormData(form);
        M.putGroup({
          name: f.get("name"),
          channelId: f.get("channelId"),
          studentIds: f.getAll("studentIds"),
        });
        node.close();
        feedback(t("Group saved.", "تم حفظ المجموعة."));
      } catch (error) {
        node.querySelector(".meeting-feedback").textContent = error.message;
      }
    };
  }
  function details(id) {
    const meeting = M.get(id);
    if (!meeting) throw Error(t("Meeting unavailable.", "الاجتماع غير متاح."));
    const status = M.status(meeting);
    const roomInfo =
      active().role === "teacher"
        ? `<label>${t("Platform meeting URL", "رابط الاجتماع في المنصة")}<input type="url" readonly dir="ltr" value="${esc(new URL(meetingURL(meeting.id), location.href).href)}"></label><p class="meeting-meta">${t("Generated Jitsi room:", "غرفة Jitsi المنشأة:")} <code dir="ltr">${esc(meeting.roomName)}</code></p>`
        : "";
    dialog(
      meeting.title,
      `<span class="meeting-badge ${status}">${statuses()[status]}</span><p>${esc(meeting.description)}</p><p class="meeting-meta">${esc(meeting.teacherName)} · ${esc(meeting.subject)}<br>${esc(dateText(meeting))} · ${duration(meeting)} ${t("min", "دقيقة")} · ${esc(meeting.timezone || "")}<br>${esc(audienceText(meeting))}</p>${roomInfo}${status === "upcoming" ? `<p>${esc(until(meeting))}</p>` : ""}<div class="meeting-resources">${resources(meeting)}</div>${status === "live" && ["teacher", "student"].includes(active().role) ? `<a class="meeting-button primary" href="${meetingURL(meeting.id)}">${t("Join meeting", "انضم للاجتماع")}</a>` : ""}`,
    );
  }
  async function demoSetup() {
    const node = dialog(
      t("Optional local demo setup", "إعداد تجربة محلية اختياري"),
      `<p>${t("Adds separate, labelled demo accounts, one channel, two groups and three meetings. Existing accounts and content are preserved. Only use these demo credentials locally.", "يضيف حسابات تجريبية منفصلة وقناة ومجموعتين وثلاثة اجتماعات. يحافظ على الحسابات والمحتوى الحالي. استخدم بيانات التجربة محليًا فقط.")}</p><button class="meeting-button primary" data-initialize-demo>${t("Initialize demo data", "تهيئة بيانات التجربة")}</button><p class="meeting-feedback" role="status"></p><div id="meeting-demo-result"></div>`,
    );
    node.querySelector("[data-initialize-demo]").onclick = async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const result = await M.initializeDemo();
        node.querySelector("#meeting-demo-result").innerHTML =
          `<p>${t("Demo ready. Sign out, then sign in with a demo account below.", "التجربة جاهزة. سجّل الخروج ثم ادخل بأحد الحسابات أدناه.")}</p><p>${t("Password for all demo accounts:", "كلمة المرور لكل حسابات التجربة:")} <code dir="ltr">${esc(result.password)}</code></p><div class="meeting-demo-accounts"><table><thead><tr><th>${t("Role", "الدور")}</th><th>${t("Email", "البريد")}</th></tr></thead><tbody>${result.users.map((account) => `<tr><td>${{ teacher: t("Teacher", "معلم"), student: t("Student", "طالب"), school: t("School", "مدرسة") }[account.role]}</td><td dir="ltr">${esc(account.email)}</td></tr>`).join("")}</tbody></table></div><a class="meeting-button" href="../login/login.html">${t("Open sign-in", "فتح تسجيل الدخول")}</a>`;
        feedback(
          t("Demo initialized without duplicate records.", "تمت تهيئة التجربة دون تكرار السجلات."),
        );
      } catch (error) {
        node.querySelector(".meeting-feedback").textContent = error.message;
      } finally {
        button.disabled = false;
      }
    };
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest(
      "[data-new-meeting],[data-new-meeting-group],[data-meeting-demo],[data-meeting-edit],[data-meeting-details],[data-meeting-cancel],[data-meeting-delete],[data-meeting-read]",
    );
    if (!button) return;
    try {
      if (button.hasAttribute("data-new-meeting")) editor();
      else if (button.hasAttribute("data-new-meeting-group")) groupEditor();
      else if (button.hasAttribute("data-meeting-demo")) demoSetup();
      else if (button.dataset.meetingEdit) editor(button.dataset.meetingEdit);
      else if (button.dataset.meetingDetails) details(button.dataset.meetingDetails);
      else if (
        button.dataset.meetingCancel &&
        confirm(
          t("Cancel this meeting and notify its students?", "إلغاء هذا الاجتماع وإشعار طلابه؟"),
        )
      ) {
        M.cancel(button.dataset.meetingCancel);
        feedback(t("Meeting cancelled.", "تم إلغاء الاجتماع."));
      } else if (
        button.dataset.meetingDelete &&
        confirm(
          t(
            "Delete this meeting? Students will be notified.",
            "حذف هذا الاجتماع؟ سيتم إشعار الطلاب.",
          ),
        )
      ) {
        M.remove(button.dataset.meetingDelete);
        feedback(t("Meeting deleted.", "تم حذف الاجتماع."));
      } else if (button.dataset.meetingRead) M.markRead(button.dataset.meetingRead);
    } catch (error) {
      feedback(error.message);
    }
  });
  const refresh = () => {
    render(document.getElementById("meetings-section"));
    mount();
  };
  window.addEventListener("orbit:meetings-change", refresh);
  window.addEventListener("storage", (event) => {
    if ([M.key, "orbit.memberships.v3", "orbit.school.members.v1"].includes(event.key)) refresh();
  });
  function tick() {
    if (document.hidden) return;
    M.reminders();
    const section = document.getElementById("meetings-section");
    if (
      !document.querySelector("#meeting-dialog[open]") &&
      !section?.contains(document.activeElement)
    )
      render(section);
  }
  function timer() {
    clearInterval(interval);
    if (!document.hidden) interval = setInterval(tick, 30000);
  }
  document.addEventListener("visibilitychange", () => {
    timer();
    if (!document.hidden) tick();
  });
  mount();
  M.reminders();
  timer();
  observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      mount();
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["lang"],
  });
  new MutationObserver(mount).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });
  window.addEventListener("pagehide", (event) => {
    clearInterval(interval);
    clearTimeout(toastTimer);
    if (!event.persisted) observer.disconnect();
  });
  window.addEventListener("pageshow", timer);
})();
