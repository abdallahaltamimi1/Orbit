/* Local assignment adapter; server-side authorization is required in production. */
(() => {
  "use strict";
  const KEY = "orbit.assignments.v1";
  const user = () => OrbitAuth.current() || {};
  const t = (en, ar) => (document.documentElement.lang === "en" ? en : ar);
  const fail = (en, ar) => {
    throw Error(t(en, ar));
  };
  const canonical = (id) => (id === "khaled" ? "teacher@orbit.com" : id);
  const data = () => {
    const db = OrbitAuth.get(KEY, {});
    return {
      ...db,
      submissions: Array.isArray(db.submissions) ? db.submissions : [],
      notifications: Array.isArray(db.notifications) ? db.notifications : [],
    };
  };
  const save = (db) => {
    localStorage.setItem(KEY, JSON.stringify(db));
    window.dispatchEvent(new CustomEvent("orbit:assignments-change"));
  };
  const published = () =>
    (OrbitAuth.get("orbit.channels.v2", {}).posts || []).filter(
      (post) => post.type === "assignment" && !post.sample,
    );
  function channel(post) {
    return ORBIT.channels().find((item) => item.id === post.channel);
  }
  function owner(post) {
    return canonical(channel(post)?.teacher);
  }
  function enrolled(post, id = user().email) {
    return (
      !!channel(post) &&
      (OrbitAuth.get("orbit.memberships.v3", {})[id] || []).includes(post.channel)
    );
  }
  function mayRead(post) {
    const active = user();
    return (
      (active.role === "teacher" && active.email === owner(post)) ||
      (active.role === "student" && enrolled(post))
    );
  }
  const visible = () => published().filter(mayRead);
  function find(id) {
    const post = published().find((item) => item.id === id);
    if (!post || !mayRead(post))
      fail("Assignment unavailable for your account.", "الواجب غير متاح لحسابك.");
    return post;
  }
  function records(id) {
    const post = find(id),
      active = user();
    return data().submissions.filter(
      (item) =>
        item.assignmentId === id &&
        ((active.role === "teacher" && active.email === owner(post)) ||
          item.studentId === active.email),
    );
  }
  function late(post, date) {
    return (
      !!post.dueDate &&
      Number.isFinite(Date.parse(post.dueDate + "T23:59:59")) &&
      Date.parse(date) > Date.parse(post.dueDate + "T23:59:59")
    );
  }
  function state(record) {
    return !record ? "missing" : record.review ? "reviewed" : record.late ? "late" : "submitted";
  }
  function notify(db, recipient, post, event, en, ar) {
    db.notifications.unshift({
      id: crypto.randomUUID(),
      recipient,
      assignmentId: post.id,
      event,
      en,
      ar,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
  async function submit(id, values, expectedRevision = 0) {
    const active = user(),
      post = find(id);
    if (active.role !== "student" || !enrolled(post))
      fail("Only enrolled students can submit.", "الطلاب المسجلون في القناة فقط يستطيعون التسليم.");
    const answer = String(values.answer || "").trim(),
      files = [...(values.files || [])],
      keep = [...(values.keepKeys || [])];
    const existing = records(id).find((item) => item.studentId === active.email);
    if ((existing?.revision || 0) !== expectedRevision)
      fail(
        "Your submission changed. Reopen it before saving.",
        "تغيّر تسليمك. أعد فتحه قبل الحفظ.",
      );
    if (answer.length > 10000 || files.length + keep.length > 3)
      fail("Use up to 10,000 characters and three files.", "استخدم حتى 10000 حرف وثلاثة ملفات.");
    const retained = (existing?.attachments || []).filter((item) => keep.includes(item.key));
    if (retained.length !== keep.length)
      fail("An attachment is no longer available.", "أحد المرفقات لم يعد متاحًا.");
    if (!answer && !files.length && !retained.length)
      fail("Write an answer or attach a file.", "اكتب إجابة أو أرفق ملفًا.");
    for (const file of files)
      if (
        !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024 ||
        file.size === 0
      )
        fail(
          "Use non-empty PDF or PNG/JPEG/WebP files, at most 5 MB each.",
          "استخدم PDF أو صور PNG/JPEG/WebP غير فارغة، بحد أقصى 5 MB للملف.",
        );
    const added = [];
    try {
      for (const file of files) {
        const key = "assignment-" + crypto.randomUUID();
        await ORBIT.media(key, file);
        added.push({ key, name: file.name, type: file.type, size: file.size });
      }
      // Recheck membership, assignment and revision after asynchronous uploads.
      const currentPost = find(id),
        db = data(),
        old = db.submissions.find(
          (item) => item.assignmentId === id && item.studentId === active.email,
        );
      if (
        user().email !== active.email ||
        user().role !== "student" ||
        !enrolled(currentPost) ||
        (old?.revision || 0) !== expectedRevision
      )
        fail(
          "Account, enrollment or submission changed. Reopen the assignment.",
          "تغيّر الحساب أو العضوية أو التسليم. أعد فتح الواجب.",
        );
      const submittedAt = new Date().toISOString();
      const record = {
        id: old?.id || crypto.randomUUID(),
        assignmentId: id,
        channelId: currentPost.channel,
        studentId: active.email,
        answer,
        attachments: [...retained, ...added],
        submittedAt,
        late: late(currentPost, submittedAt),
        revision: (old?.revision || 0) + 1,
        review: null,
        history: [
          ...(old?.history || []),
          ...(old
            ? [
                {
                  answer: old.answer,
                  attachments: old.attachments,
                  submittedAt: old.submittedAt,
                  review: old.review,
                  revision: old.revision,
                },
              ]
            : []),
        ],
      };
      db.submissions = db.submissions.filter((item) => item.id !== record.id);
      db.submissions.push(record);
      notify(
        db,
        owner(currentPost),
        currentPost,
        "submitted:" + record.id + ":" + record.revision,
        "A student submitted: " + (currentPost.title || currentPost.titleEn || currentPost.titleAr),
        "سلّم طالب واجب: " + (currentPost.title || currentPost.titleAr || currentPost.titleEn),
      );
      save(db);
      return record;
    } catch (error) {
      // Uncommitted uploads are not referenced by any submission; retain existing work.
      throw error;
    }
  }
  function review(id, studentId, values, expectedRevision) {
    const active = user(),
      post = find(id);
    if (active.role !== "teacher" || owner(post) !== active.email)
      fail("Only the channel owner can review.", "مالك القناة فقط يستطيع مراجعة الإجابات.");
    const db = data(),
      record = db.submissions.find(
        (item) => item.assignmentId === id && item.studentId === studentId,
      );
    if (!record || record.revision !== expectedRevision)
      fail(
        "The student changed their answer. Reopen the submission.",
        "غيّر الطالب إجابته. أعد فتح التسليم.",
      );
    const feedback = String(values.feedback || "").trim();
    const grade = values.grade === "" || values.grade == null ? null : Number(values.grade);
    if (
      feedback.length > 3000 ||
      (grade !== null && (!Number.isFinite(grade) || grade < 0 || grade > 100)) ||
      (!feedback && grade === null)
    )
      fail("Add feedback or a grade from 0 to 100.", "أضف ملاحظات أو درجة من 0 إلى 100.");
    record.review = {
      teacherId: active.email,
      feedback,
      grade,
      reviewedAt: new Date().toISOString(),
    };
    record.revision++;
    notify(
      db,
      studentId,
      post,
      "reviewed:" + record.id + ":" + record.revision,
      "Your assignment was reviewed: " + (post.title || post.titleEn || post.titleAr),
      "تمت مراجعة واجبك: " + (post.title || post.titleAr || post.titleEn),
    );
    save(db);
    return record;
  }
  async function attachment(id, studentId, key) {
    const record = records(id).find((item) => item.studentId === studentId);
    const allowed = [
      ...(record?.attachments || []),
      ...(record?.history || []).flatMap((item) => item.attachments || []),
    ].some((item) => item.key === key);
    if (!allowed) fail("Attachment unavailable for your account.", "المرفق غير متاح لحسابك.");
    const blob = await ORBIT.media(key);
    if (!blob)
      fail("This file is missing from browser storage.", "هذا الملف غير موجود في تخزين المتصفح.");
    // Permission might have changed while IndexedDB was reading.
    find(id);
    if (!records(id).some((item) => item.studentId === studentId))
      fail("Submission unavailable.", "التسليم غير متاح.");
    return blob;
  }
  const notifications = () =>
    data().notifications.filter((item) => item.recipient === user().email);
  function markRead(id) {
    const db = data(),
      note = db.notifications.find((item) => item.id === id && item.recipient === user().email);
    if (note && !note.read) {
      note.read = true;
      save(db);
    }
  }
  window.OrbitAssignments = {
    key: KEY,
    visible,
    find,
    records,
    submit,
    review,
    attachment,
    notifications,
    markRead,
    state,
    owner,
    t,
  };
})();
