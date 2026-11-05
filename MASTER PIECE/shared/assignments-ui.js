(() => {
  "use strict";
  const A = OrbitAssignments,
    t = A.t;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
    );
  const user = () => OrbitAuth.current() || {};
  const title = (post) =>
    post.title ||
    (document.documentElement.lang === "en"
      ? post.titleEn || post.titleAr
      : post.titleAr || post.titleEn) ||
    t("Assignment", "واجب");
  const body = (post) =>
    post.body ||
    (document.documentElement.lang === "en"
      ? post.bodyEn || post.bodyAr
      : post.bodyAr || post.bodyEn) ||
    "";
  const date = (iso) =>
    new Intl.DateTimeFormat(document.documentElement.lang === "en" ? "en" : "ar", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  const statuses = () => ({
    missing: t("Not submitted", "لم يُسلَّم"),
    submitted: t("Submitted", "مُسلَّم"),
    late: t("Submitted late", "مُسلَّم متأخرًا"),
    reviewed: t("Reviewed", "تمت المراجعة"),
  });
  let observer,
    localeObserver,
    queued = false,
    toastTimer;
  const objectURLs = new Set();
  function notify(message, type = "success") {
    if (window.OrbitMotion) {
      OrbitMotion.feedback(message, { type });
      return;
    }
    let node = document.getElementById("assignment-alert");
    if (!node) {
      node = document.createElement("div");
      node.id = "assignment-alert";
      node.className = "assignment-alert";
      node.setAttribute("role", "status");
      document.body.append(node);
    }
    node.hidden = false;
    node.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      node.hidden = true;
    }, 6000);
  }
  function dialog(name, html) {
    document.querySelector("#assignment-dialog")?.remove();
    const node = document.createElement("dialog");
    node.id = "assignment-dialog";
    node.className = "assignment-dialog";
    node.setAttribute("aria-labelledby", "assignment-dialog-title");
    node.addEventListener("close", () => node.remove(), { once: true });
    node.innerHTML = `<header><h2 id="assignment-dialog-title">${esc(name)}</h2><button class="assignment-button" type="button" data-close-assignment aria-label="${t("Close", "إغلاق")}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>${html}`;
    document.body.append(node);
    node.querySelector("[data-close-assignment]").onclick = () => node.close();
    node.showModal();
    return node;
  }
  function result(record) {
    return record?.review
      ? `<div class="assignment-feedback"><strong>${t("Teacher review", "مراجعة المعلم")}</strong>${record.review.grade !== null ? `<p>${t("Grade", "الدرجة")}: ${record.review.grade} / 100</p>` : ""}${record.review.feedback ? `<p>${esc(record.review.feedback)}</p>` : ""}</div>`
      : "";
  }
  function files(id, record, items = record.attachments || []) {
    return `<div class="assignment-files">${items.map((file) => `<button class="assignment-button" type="button" data-assignment-file="${esc(file.key)}" data-assignment-id="${esc(id)}" data-student-id="${esc(record.studentId)}" data-filename="${esc(file.name)}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/></svg><bdi>${esc(file.name)}</bdi></button>`).join("")}</div>`;
  }
  const enrolledStudents = (post) => {
    const channel = ORBIT.channels().find(c => c.id === post.channel);
    if (OrbitAuth.managedChannel(channel)) {
      const accounts = OrbitAuth.get("orbit.recruitment.v1", {}).accounts || [];
      return [...new Set([...accounts.map(account => account.email), "student@orbit.com"])]
        .filter(email => OrbitAuth.schoolChannelStudent(channel, email, post))
        .map(id => ({ id, profile: OrbitProfiles.read(id, "student") }));
    }
    return Object.entries(OrbitAuth.get("orbit.memberships.v3", {}))
      .filter(
        ([email, ids]) =>
          email !== "guest" &&
          email !== user().email &&
          Array.isArray(ids) &&
          ids.includes(post.channel),
      )
      .map(([email]) => ({ id: email, profile: OrbitProfiles.read(email, "student") }))
      .sort((a, b) =>
        (a.profile.name || a.id).localeCompare(
          b.profile.name || b.id,
          document.documentElement.lang,
        ),
      );
  };
  function inline(post) {
    const records = A.records(post.id);
    let content;
    if (user().role === "teacher") {
      const members = enrolledStudents(post),
        submitted = members.filter((m) => records.some((r) => r.studentId === m.id)).length;
      content = `<div class="assignment-inline"><p class="assignment-tally">${submitted} / ${members.length} ${t("students submitted", "طلاب سلّموا")} · ${members.length - submitted} ${t("not submitted", "لم يسلّموا")}</p><p class="assignment-note">${records.filter((record) => !record.review).length} ${t("awaiting review", "بانتظار المراجعة")}</p><button class="assignment-button primary" data-assignment-review-list="${esc(post.id)}">${t("Students and submissions", "الطلاب والتسليمات")}</button></div>`;
    } else {
      const record = records[0],
        state = A.state(record);
      content = `<div class="assignment-inline"><span class="assignment-status ${state}">${statuses()[state]}</span>${record ? `<p class="assignment-note">${t("Last submitted:", "آخر تسليم:")} ${esc(date(record.submittedAt))}${record.late ? " · " + t("Late", "متأخر") : ""}</p>` : ""}${result(record)}<div class="assignment-actions">${A.canWrite(post) ? `<button class="assignment-button primary" data-assignment-submit="${esc(post.id)}">${record ? t("Edit and resubmit", "تعديل وإعادة التسليم") : t("Submit answer", "سلّم إجابتك")}</button>` : ""}${record ? `<button class="assignment-button" data-assignment-own="${esc(post.id)}">${t("View my answer", "عرض إجابتي")}</button>` : ""}</div></div>`;
    }
    const notifications = A.notifications().filter((note) => note.assignmentId === post.id);
    return content + notifications.map(
      (note) =>
        `<div class="assignment-notification"><p>${esc(note[document.documentElement.lang === "en" ? "en" : "ar"])}</p>${!note.read ? `<button class="assignment-button" data-assignment-note="${esc(note.id)}">${t("Mark read", "تمت القراءة")}</button>` : ""}</div>`,
    ).join("");
  }
  function mount(force = false) {
    const active = user();
    if (!["teacher", "student"].includes(active.role)) return;
    const posts = A.visible();
    document.querySelectorAll("[data-assignment-slot]").forEach((slot) => {
      if (!force && slot.dataset.assignmentHydrated === document.documentElement.lang) return;
      const post = posts.find((item) => item.id === slot.dataset.assignmentSlot);
      slot.innerHTML = post
        ? inline(post)
        : `<p class="assignment-note">${t("Only published assignments can be submitted by enrolled students. Illustrative samples do not collect answers.", "التسليم متاح للواجبات المنشورة وللطلاب المسجلين فقط. الأمثلة التوضيحية لا تجمع إجابات.")}</p>`;
      slot.dataset.assignmentHydrated = document.documentElement.lang;
    });
  }
  function submitDialog(id) {
    const post = A.find(id),
      record = A.records(id)[0];
    const node = dialog(
      title(post),
      `<p>${esc(body(post))}</p>${post.dueDate ? `<p>${t("Due:", "موعد التسليم:")} ${esc(post.dueDate)}</p>` : ""}<p class="assignment-note">${t("Late submissions are accepted and labelled late. Resubmission keeps the old answer in history and requires a new teacher review.", "يُقبل التسليم بعد الموعد مع علامة متأخر. إعادة التسليم تحفظ الإجابة السابقة في السجل وتحتاج مراجعة جديدة من المعلم.")}</p>${record?.review ? `<p class="assignment-note">${t("This answer was reviewed; resubmitting resets its current review.", "هذه الإجابة تمت مراجعتها؛ إعادة التسليم تعيد حالتها إلى انتظار المراجعة.")}</p>` : ""}<form><label>${t("Your answer", "إجابتك")}<textarea name="answer" maxlength="10000" dir="auto">${esc(record?.answer || "")}</textarea></label>${(record?.attachments || []).map((file) => `<label class="assignment-keep"><input type="checkbox" name="keepKeys" value="${esc(file.key)}" checked>${t("Keep", "الاحتفاظ بـ")} ${esc(file.name)}</label>`).join("")}<label>${t("Attach PDF or images (3 files total, 5 MB each)", "أرفق PDF أو صورًا (3 ملفات إجمالًا، 5 MB للملف)")}<input type="file" name="files" multiple accept="application/pdf,image/png,image/jpeg,image/webp"></label><p class="assignment-error" role="alert"></p><button class="assignment-button primary" type="submit">${t("Submit answer", "تسليم الإجابة")}</button></form>`,
    );
    const form = node.querySelector("form");
    form.onsubmit = async (event) => {
      event.preventDefault();
      const button = form.querySelector("[type=submit]");
      button.disabled = true;
      button.textContent = t("Submitting…", "جارٍ التسليم…");
      form.setAttribute("aria-busy", "true");
      try {
        const f = new FormData(form);
        await A.submit(
          id,
          {
            answer: f.get("answer"),
            files: form.elements.files.files,
            keepKeys: f.getAll("keepKeys"),
          },
          record?.revision || 0,
        );
        node.close();
        notify(t("Your answer was submitted.", "تم تسليم إجابتك."));
      } catch (error) {
        node.querySelector(".assignment-error").textContent = error.message;
      } finally {
        button.disabled = false;
        button.textContent = t("Submit answer", "تسليم الإجابة");
        form.removeAttribute("aria-busy");
      }
    };
  }
  function answerHTML(id, record) {
    return `<span class="assignment-status ${A.state(record)}">${statuses()[A.state(record)]}</span><p class="assignment-note">${esc(date(record.submittedAt))} · ${t("Version", "النسخة")} ${record.history.length + 1}${record.late ? " · " + t("Late submission", "تسليم متأخر") : ""}</p><div class="assignment-answer" tabindex="0" dir="auto">${esc(record.answer || t("Answer supplied as attachments.", "الإجابة مرفقة كملفات."))}</div>${files(id, record)}${result(record)}${record.history.length ? `<details><summary>${t("Previous versions", "النسخ السابقة")} · ${record.history.length}</summary>${record.history.map((item) => `<section class="assignment-submission"><p class="assignment-note">${esc(date(item.submittedAt))}</p><div class="assignment-answer" tabindex="0" dir="auto">${esc(item.answer)}</div>${files(id, record, item.attachments || [])}${result(item)}</section>`).join("")}</details>` : ""}`;
  }
  function ownDialog(id) {
    const post = A.find(id),
      record = A.records(id)[0];
    if (!record) throw Error(t("No submission yet.", "لا يوجد تسليم بعد."));
    dialog(title(post), answerHTML(id, record));
  }
  function reviewList(id) {
    const post = A.find(id);
    if (user().role !== "teacher") return;
    const list = A.records(id),
      members = enrolledStudents(post),
      submitted = members.filter((m) => list.some((r) => r.studentId === m.id)).length;
    const row = (member, record, former = false) =>
      `<section class="assignment-submission" data-roster-state="${record ? "submitted" : "missing"}"><div><h3>${esc(member.profile.name || member.id)}</h3><p class="assignment-note"><bdi>${esc(member.id)}</bdi>${former ? " · " + t("Former member", "عضو سابق") : ""}</p><p class="assignment-note">${record ? esc(date(record.submittedAt)) + " · " + (record.attachments || []).length + " " + t("attachments", "مرفقات") + (record.review?.grade != null ? " · " + t("Grade:", "الدرجة:") + " " + record.review.grade + " / 100" : "") : t("No answer submitted for this assignment.", "لم يسلّم إجابة لهذا الواجب بعد.")}</p></div><span class="assignment-status ${A.state(record)}">${statuses()[A.state(record)]}</span>${record ? `<button class="assignment-button" data-assignment-review="${esc(id)}" data-student-id="${esc(member.id)}">${t("Open answer and review", "فتح الإجابة ومراجعتها")}</button>` : ""}</section>`;
    const former = list.filter((r) => !members.some((m) => m.id === r.studentId));
    const node = dialog(
      t("Students and submissions", "الطلاب والتسليمات") + " · " + title(post),
      `<p class="assignment-summary">${members.length} ${t("enrolled students", "طلاب مسجلين")} · ${submitted} ${t("submitted", "سلّموا")} · ${members.length - submitted} ${t("not submitted", "لم يسلّموا")}</p><label class="assignment-roster-filter">${t("Show students", "عرض الطلاب")}<select data-roster-filter><option value="all">${t("All students", "كل الطلاب")}</option><option value="submitted">${t("Submitted", "الذين سلّموا")}</option><option value="missing">${t("Not submitted", "الذين لم يسلّموا")}</option></select></label><div class="assignment-roster" data-current-roster>${
        members
          .map((m) =>
            row(
              m,
              list.find((r) => r.studentId === m.id),
            ),
          )
          .join("") ||
        `<p class="assignment-empty">${t("No enrolled students yet.", "لا يوجد طلاب مسجلون بعد.")}</p>`
      }</div><p class="assignment-empty" data-roster-empty hidden>${t("No students in this status.", "لا يوجد طلاب بهذه الحالة.")}</p>${former.length ? `<details class="assignment-former"><summary>${t("Previous members’ submissions", "تسليمات الأعضاء السابقين")} · ${former.length}</summary><p class="assignment-note">${t("These responses are retained separately and do not count toward current enrollment.", "هذه الإجابات محفوظة منفصلة ولا تُحتسب ضمن الطلاب المسجلين حاليًا.")}</p><div class="assignment-roster">${former.map((r) => row({ id: r.studentId, profile: OrbitProfiles.read(r.studentId, "student") }, r, true)).join("")}</div></details>` : ""}`,
    );
    node.classList.add("assignment-list-dialog");
    node.querySelector("[data-roster-filter]").onchange = (event) => {
      const rows = [...node.querySelectorAll("[data-current-roster] [data-roster-state]")];
      rows.forEach((row) => {
        row.hidden = event.target.value !== "all" && row.dataset.rosterState !== event.target.value;
      });
      node.querySelector("[data-roster-empty]").hidden =
        !members.length || rows.some((row) => !row.hidden);
    };
  }
  function reviewDialog(id, studentId) {
    const post = A.find(id),
      record = A.records(id).find((item) => item.studentId === studentId);
    if (!record || user().role !== "teacher") return;
    const node = dialog(
      title(post) + " · " + (OrbitProfiles.read(studentId, "student").name || studentId),
      `<button class="assignment-back" type="button" data-assignment-review-list="${esc(id)}">${t("Back to submissions", "العودة للتسليمات")}</button><div class="assignment-review-layout"><section class="assignment-response"><h3>${t("Student answer", "إجابة الطالب")}</h3>${answerHTML(id, record)}</section><form class="assignment-review-form"><h3>${t("Your review", "مراجعتك")}</h3><label>${t("Teacher feedback", "ملاحظات المعلم")}<textarea name="feedback" maxlength="3000">${esc(record.review?.feedback || "")}</textarea></label><label>${t("Optional grade / 100", "درجة اختيارية / 100")}<input name="grade" type="number" min="0" max="100" step="0.1" value="${record.review?.grade ?? ""}"></label><p class="assignment-error" role="alert"></p><button class="assignment-button primary" type="submit">${t("Save review", "حفظ المراجعة")}</button></form></div>`,
    );
    node.classList.add("assignment-review-dialog");
    if (!A.canWrite(post)) { node.querySelector("form").remove(); return; }
    node.querySelector("form").onsubmit = (event) => {
      event.preventDefault();
      try {
        const f = new FormData(event.target);
        A.review(
          id,
          studentId,
          { feedback: f.get("feedback"), grade: f.get("grade") },
          record.revision,
        );
        node.close();
        notify(t("Review saved and the student notified.", "تم حفظ المراجعة وإشعار الطالب."));
      } catch (error) {
        node.querySelector(".assignment-error").textContent = error.message;
      }
    };
  }
  document.addEventListener("click", async (event) => {
    const button = event.target.closest(
      "[data-assignment-submit],[data-assignment-own],[data-assignment-review-list],[data-assignment-review],[data-assignment-file],[data-assignment-note]",
    );
    if (!button) return;
    try {
      if (button.dataset.assignmentSubmit) submitDialog(button.dataset.assignmentSubmit);
      else if (button.dataset.assignmentOwn) ownDialog(button.dataset.assignmentOwn);
      else if (button.dataset.assignmentReviewList) reviewList(button.dataset.assignmentReviewList);
      else if (button.dataset.assignmentReview)
        reviewDialog(button.dataset.assignmentReview, button.dataset.studentId);
      else if (button.dataset.assignmentNote) A.markRead(button.dataset.assignmentNote);
      else if (button.dataset.assignmentFile) {
        button.disabled = true;
        try {
          const blob = await A.attachment(
              button.dataset.assignmentId,
              button.dataset.studentId,
              button.dataset.assignmentFile,
            ),
            href = URL.createObjectURL(blob);
          objectURLs.add(href);
          const link = document.createElement("a");
          link.href = href;
          link.download = button.dataset.filename;
          document.body.append(link);
          link.click();
          link.remove();
          setTimeout(() => {
            URL.revokeObjectURL(href);
            objectURLs.delete(href);
          }, 30000);
        } finally {
          button.disabled = false;
        }
      }
    } catch (error) {
      notify(error.message, "error");
    }
  });
  window.addEventListener("orbit:assignments-change", () => mount(true));
  window.addEventListener("storage", (event) => {
    if (["orbit.assignments.v1", "orbit.channels.v2", "orbit.memberships.v3"].includes(event.key)) {
      document.querySelector("#assignment-dialog[open]")?.close();
      mount(true);
    }
  });
  mount();
  observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      mount();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  localeObserver = new MutationObserver(() => mount(true));
  localeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  window.addEventListener("pagehide", (event) => {
    clearTimeout(toastTimer);
    objectURLs.forEach(URL.revokeObjectURL);
    objectURLs.clear();
    if (!event.persisted) {
      observer.disconnect();
      localeObserver.disconnect();
    }
  });
})();
