(() => {
  "use strict";
  const prefix = "orbit.school.monitoring-reviews.v1:";
  const read = (key, fallback) => JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback));
  const date = value => Date.parse(value) || 0;

  function report(yearId) {
    const actor = OrbitAuth.current();
    if (actor?.role !== "school") throw Error("ROLE_DENIED");
    const schoolId = actor.email;
    const teaching = OrbitSchoolTeaching.read(yearId);
    const year = teaching.selectedYear;
    if (!year) throw Error("YEAR_NOT_FOUND");

    const annual = OrbitSchoolAcademicReadModel.read(yearId);
    const channels = read("orbit.channels.v2", { channels: [], posts: [] });
    const deleted = new Set(read("orbit.deleted.posts", []));

    const submissions = read("orbit.assignments.v1", { submissions: [] }).submissions || [];
    const reviews = read(prefix + encodeURIComponent(schoolId), []);
    const rows = [];
    const verifiedChannels = [];
    const unresolved = [];

    for (const channel of channels.channels.filter(c => c.schoolId === schoolId && !c.deleted)) {
      if (channel.academicYearId && channel.academicYearId !== yearId) continue;
      const managed = window.OrbitAuth?.managedChannel?.(channel) || channel.schoolChannelVersion === 1;
      const sectionIds = managed ? channel.sectionIds : [channel.sectionId];
      const assignment = teaching.assignments.find(a => !a.issue && a.sectionId === channel.sectionId &&
        a.subjectId === channel.subjectId && (!channel.assignmentId || channel.assignmentId === a.id));
      const account = teaching.accounts.find(a => a.teacherId === assignment?.teacherId);
      if (managed && !OrbitAuth.schoolChannelTeacher(channel, channel.teacher, true) || channel.academicYearId !== yearId || !assignment || account?.status !== "active" ||
          account.accountId !== channel.teacher || channels.channels.filter(c => c.id === channel.id).length !== 1) {
        unresolved.push({ name: channel.en || channel.ar || channel.id });
        continue;
      }
      const section = teaching.sections.find(s => s.id === assignment.sectionId);
      const emails = annual.students.filter(s=>s.verification === "verified" && s.identity.status === "confirmed" && sectionIds.includes(s.currentPlacement?.sectionId)).map(s=>s.identity.accountId);
      const access = year.status === "active" ? (OrbitAuth.schoolStudentAccessBatch
        ? OrbitAuth.schoolStudentAccessBatch(channel, emails)
        : new Map(emails.map(email=>[email,OrbitAuth.schoolStudentAccess(channel,email)]))) : null;
      verifiedChannels.push({ id: channel.id, name: channel.en || channel.ar || channel.id, nameAr: channel.ar, teacherId: assignment.teacherId, subjectId: assignment.subjectId, sectionIds, gradeIds: teaching.sections.filter(s => sectionIds.includes(s.id)).map(s => s.gradeId) });
      for (const post of channels.posts.filter(p => p.channel === channel.id && !p.sample &&
        !deleted.has(p.id) && (!p.authorId || p.authorId === account.accountId || managed && channel.managementHistory?.some(event => event.from === p.authorId)) && (!p.schoolId || p.schoolId === schoolId) &&
        (!p.academicYearId || p.academicYearId === yearId) &&
        ["lesson", "video", "assignment"].includes(p.type))) {
        if (channels.posts.filter(p => p.id === post.id).length !== 1) continue;
        const targets = managed ? post.sectionIds : sectionIds;
        if (!Array.isArray(targets) || !targets.length || targets.some(id => !sectionIds.includes(id))) continue;
        const progress = [];
        if (post.type === "assignment" && year.status !== "upcoming") {
          for (const student of annual.students) {
            const historical = year.status === "archived"
              ? annual.enrollments.find(record => record.id === student.enrollmentId) : null;
            const accountId = year.status === "archived" ? historical?.accountId : student.identity.accountId;
            if (student.verification !== "verified" || !targets.includes(student.currentPlacement?.sectionId) ||
                student.identity.status !== "confirmed" || !accountId) continue;
            if (year.status === "active" && access.get(accountId) !== true) continue;
            const candidates = submissions.filter(r => r.assignmentId === post.id && r.channelId === channel.id &&
              r.studentId === accountId && (!r.schoolId || r.schoolId === schoolId) &&
              (!r.academicYearId || r.academicYearId === yearId) && (!managed || targets.includes(r.sectionId)) &&
              Number.isInteger(r.revision) && r.revision > 0 && date(r.submittedAt))
              .sort((a,b) => b.revision - a.revision || date(b.submittedAt) - date(a.submittedAt));
            const latest = candidates[0];
            const ambiguous = latest && candidates.filter(r => r.revision === latest.revision).length > 1;
            if (year.status === "archived" && !latest) continue;
            const evaluation = !ambiguous && (latest?.review?.teacherId === channel.teacher || managed && channel.managementHistory?.some(event => event.from === latest?.review?.teacherId)) && date(latest.review.reviewedAt)
              ? { grade: typeof latest.review.grade === "number" ? latest.review.grade : null, at: latest.review.reviewedAt } : null;
            progress.push({ student: student.name, submittedAt: ambiguous ? null : latest?.submittedAt || null,
              evaluation, uncertain: !!ambiguous });
          }
        }
        rows.push({ id: post.id, channelId: channel.id, channel: channel.en || channel.ar || channel.id,
          title: post.title || post.titleEn || post.titleAr || post.id, type: post.type,
          body: post.body || post.bodyEn || post.bodyAr || "",
          teacherAccountId: account.accountId, teacherId: assignment.teacherId, subjectId: assignment.subjectId, sectionId: section.id, sectionIds: targets, gradeId: section.gradeId, gradeIds: teaching.sections.filter(row => targets.includes(row.id)).map(row => row.gradeId),
          createdAt: post.createdAt, dueDate: post.dueDate, hidden: post.moderationStatus === "hidden", progress });
      }
    }
    rows.sort((a,b) => date(b.createdAt) - date(a.createdAt) || a.id.localeCompare(b.id));
    let coverage = null;
    try { coverage = window.OrbitSchoolPeriods?.read(yearId).sections ?? null; } catch { /* Coverage is independently verified. */ }
    return { year, schoolId, coverage, rows, channels: verifiedChannels, unresolved, reviews: reviews.filter(r => r.yearId === yearId),
      grades: teaching.grades, sections: teaching.sections, teachers: teaching.teachers, subjects: teaching.subjects,
      assignments: teaching.assignments.filter(a => !a.issue) };
  }

  function review(yearId, ids, action, reason) {
    const view = report(yearId);
    if (view.year.status === "archived" || OrbitSchoolYearContext.readOnly()) throw Error("ARCHIVED_YEAR");
    if (OrbitSchoolYearContext.read().selectedYear?.id !== yearId) throw Error("STALE_DATA");
    reason = String(reason ?? "").trim();
    if (!reason || reason.length > 500 || !["request", "hide"].includes(action) || !ids.length) throw Error("INVALID_FIELDS");
    const targets = [...new Set(ids)].map(id => view.rows.find(r => r.id === id && !r.hidden));
    if (targets.some(r => !r)) throw Error("CONTENT_UNAVAILABLE");
    const key = prefix + encodeURIComponent(view.schoolId);
    const history = read(key, []);
    const at = new Date().toISOString();
    const events = targets.map(r => ({ id: crypto.randomUUID(), yearId, postId: r.id, channelId: r.channelId,
      actor: view.schoolId, teacherAccountId: r.teacherAccountId, action, reason, at }));
    if (action === "request") {
      const assignmentKey = "orbit.assignments.v1";
      const original = localStorage.getItem(assignmentKey);
      const db = read(assignmentKey, { submissions: [], notifications: [] });
      db.notifications = [...events.map((event, index) => ({
        id: event.id, recipient: targets[index].teacherAccountId, assignmentId: event.postId,
        channelId: event.channelId, title: targets[index].title, event: "school-content-review", en: "School requested a content correction. " + reason,
        ar: "طلبت المدرسة تصحيح المحتوى. " + reason, read: false, createdAt: at
      })), ...(db.notifications || [])];
      localStorage.setItem(assignmentKey, JSON.stringify(db));
      try {
        localStorage.setItem(key, JSON.stringify([...events, ...history]));
      } catch (error) {
        if (original === null) localStorage.removeItem(assignmentKey);
        else localStorage.setItem(assignmentKey, original);
        throw error;
      }
      return;
    }
    const channelKey = "orbit.channels.v2";
    const original = localStorage.getItem(channelKey);
    const db = JSON.parse(original);
    for (const target of targets) {
      const post = db.posts.find(p => p.id === target.id && p.channel === target.channelId);
      post.moderationStatus = "hidden";
      post.moderatedAt = at;
    }
    localStorage.setItem(channelKey, JSON.stringify(db));
    try {
      localStorage.setItem(key, JSON.stringify([...events, ...history]));
    } catch (error) {
      localStorage.setItem(channelKey, original);
      throw error;
    }
  }

  const status = request => request.history?.at(-1)?.status || "pending";

  function teacherRequests() {
    const actor = OrbitAuth.current();
    if (actor?.role !== "teacher") return [];
    const notes = read("orbit.assignments.v1", {}).notifications || [];
    const results = [];
    for (const key of Object.keys(localStorage).filter(key => key.startsWith(prefix))) {
      let schoolId, records;
      try { schoolId = decodeURIComponent(key.slice(prefix.length)); records = read(key, []); }
      catch { continue; }
      if (!Array.isArray(records)) continue;
      for (const request of records) {
        if (request?.action !== "request" || request.actor !== schoolId) continue;
        const note = notes.find(note => note.id === request.id && note.event === "school-content-review" &&
          note.recipient === actor.email && note.assignmentId === request.postId && note.channelId === request.channelId);
        if (!note || (request.teacherAccountId && request.teacherAccountId !== actor.email)) continue;
        try {
          const access = OrbitSchoolPeriods.reviewChannel(schoolId, request.yearId, request.channelId);
          results.push({ ...request, ...access, schoolId, title: note.title, status: status(request) });
        } catch { /* Exclude requests that no longer have verified teacher access. */ }
      }
    }
    return results;
  }

  function resolve(schoolId, yearId, requestId, decision, response) {
    const actor = OrbitAuth.current();
    const key = prefix + encodeURIComponent(schoolId);
    const raw = localStorage.getItem(key);
    const records = JSON.parse(raw ?? "[]");
    const request = records.find(record => record.id === requestId && record.yearId === yearId && record.action === "request");
    response = String(response ?? "").trim();
    if (!request || !response || response.length > 500) throw Error("INVALID_FIELDS");
    const current = status(request);
    let next;
    if (actor?.role === "teacher") {
      const visible = teacherRequests().find(record => record.id === requestId && record.schoolId === schoolId);
      if (!visible || visible.archived || !["pending", "reopened"].includes(current) ||
          !["corrected", "explained"].includes(decision)) throw Error("REVIEW_UNAVAILABLE");
      next = "responded";
    } else {
      if (actor?.role !== "school" || actor.email !== schoolId ||
          OrbitSchoolYearContext.read().selectedYear?.id !== yearId || report(yearId).year.status === "archived" ||
          current !== "responded" || !["closed", "reopened"].includes(decision)) throw Error("REVIEW_UNAVAILABLE");
      next = decision;
    }
    if (localStorage.getItem(key) !== raw) throw Error("STALE_DATA");
    request.history = [...(request.history || []), { status: next, decision, response, actor: actor.email, at: new Date().toISOString() }];
    localStorage.setItem(key, JSON.stringify(records));
  }

  window.OrbitAnnualMonitoring = Object.freeze({ report, review, status, teacherRequests, resolve });
})();
