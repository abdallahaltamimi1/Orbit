/* Local meeting adapter. Production requires authenticated server authorization. */
(() => {
  "use strict";
  const KEY = "orbit.meetings.v1";
  const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const user = () => window.OrbitAuth?.current() || {};
  const canonical = (value) =>
    value === "khaled"
      ? "teacher@orbit.com"
      : String(value || "")
          .trim()
          .toLowerCase();
  const lang = () => (document.documentElement.lang === "en" ? "en" : "ar");
  const t = (en, ar) => (lang() === "en" ? en : ar);
  const fail = (en, ar) => {
    throw new Error(t(en, ar));
  };
  function data() {
    const value = read(KEY, {});
    return {
      ...value,
      schema: 1,
      meetings: Array.isArray(value.meetings) ? value.meetings : [],
      groups: Array.isArray(value.groups) ? value.groups : [],
      notifications: Array.isArray(value.notifications) ? value.notifications : [],
    };
  }
  function persist(value) {
    localStorage.setItem(KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("orbit:meetings-change"));
  }
  function requireRole(role) {
    const active = user();
    if (!active.email || active.role !== role)
      fail("This action is not permitted for your account.", "هذه العملية غير متاحة لحسابك.");
    return active;
  }
  function channels() {
    const list = window.ORBIT?.channels?.() || read("orbit.channels.v2", {}).channels || [];
    return list.filter(
      (channel, index) => list.findIndex((other) => other.id === channel.id) === index,
    );
  }
  const ownChannels = () =>
    user().role === "teacher"
      ? channels().filter((channel) => canonical(channel.teacher) === canonical(user().email))
      : [];
  function members(channelId) {
    return Object.entries(read("orbit.memberships.v3", {}))
      .filter(([id, list]) => id !== "guest" && Array.isArray(list) && list.includes(channelId))
      .map(([id]) => ({ id, name: window.OrbitProfiles?.read(id, "student")?.name || id }));
  }
  function ownedChannel(channelId, teacherId) {
    const channel = channels().find(
      (item) => item.id === channelId && canonical(item.teacher) === canonical(teacherId),
    );
    if (!channel) fail("Choose one of your own channels.", "اختر إحدى قنواتك.");
    return channel;
  }
  function schoolFor(channel, teacherId) {
    const organizations = read("orbit.school.members.v1", {}).schools || {};
    if (channel.schoolId) {
      const org = organizations[channel.schoolId];
      if (
        (org?.teachers || []).some(
          (member) => canonical(member.id) === canonical(teacherId) && member.status === "active",
        )
      )
        return channel.schoolId;
      return null;
    }
    return (
      Object.entries(organizations).find(([, org]) =>
        (org.teachers || []).some(
          (member) => canonical(member.id) === canonical(teacherId) && member.status === "active",
        ),
      )?.[0] || null
    );
  }
  function groups(channelId) {
    return data().groups.filter(
      (group) => group.teacherId === user().email && (!channelId || group.channelId === channelId),
    );
  }
  function putGroup(values) {
    const active = requireRole("teacher");
    ownedChannel(values.channelId, active.email);
    const eligible = new Set(members(values.channelId).map((member) => member.id));
    const studentIds = [...new Set(values.studentIds || [])];
    if (
      !values.name?.trim() ||
      values.name.length > 100 ||
      !studentIds.length ||
      studentIds.some((id) => !eligible.has(id))
    )
      fail(
        "Name the group and select enrolled students.",
        "سمّ المجموعة واختر طلابًا مسجلين في القناة.",
      );
    const db = data();
    const group = {
      id: crypto.randomUUID(),
      teacherId: active.email,
      channelId: values.channelId,
      name: values.name.trim(),
      studentIds,
    };
    db.groups.push(group);
    persist(db);
    return group;
  }
  function recipients(audience, channelId, teacherId, db) {
    const enrolled = new Set(members(channelId).map((member) => member.id));
    let ids;
    if (audience?.mode === "channel") ids = [...enrolled];
    else if (audience?.mode === "group") {
      const group = db.groups.find(
        (item) =>
          item.id === audience.groupId &&
          item.teacherId === teacherId &&
          item.channelId === channelId,
      );
      if (!group)
        fail(
          "This group is not available for this channel.",
          "هذه المجموعة غير متاحة لهذه القناة.",
        );
      ids = group.studentIds.filter((id) => enrolled.has(id));
    } else if (audience?.mode === "individual") {
      ids = [...new Set(audience.studentIds || [])];
      if (ids.some((id) => !enrolled.has(id)))
        fail("Select students enrolled in this channel.", "اختر طلابًا مسجلين في هذه القناة.");
    } else fail("Choose a target audience.", "اختر الجمهور المستهدف.");
    if (!ids.length)
      fail(
        "The selected audience has no enrolled students.",
        "الجمهور المختار لا يحتوي طلابًا مسجلين.",
      );
    return ids;
  }
  const stamp = (value) => new Date(value).toISOString();
  function validate(values, allowPast = false) {
    for (const [field, max] of [
      ["title", 150],
      ["subject", 100],
      ["description", 3000],
    ]) {
      if (!String(values[field] || "").trim() || String(values[field]).length > max)
        fail(
          "Complete the title, subject and agenda within their length limits.",
          "أكمل العنوان والمادة والأجندة ضمن الحد المسموح.",
        );
    }
    const start = Date.parse(values.startAt),
      end = Date.parse(values.endAt);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      end - start > 24 * 3600000
    )
      fail(
        "Use valid dates and an end time after the start (maximum 24 hours).",
        "أدخل تاريخًا صحيحًا ووقت نهاية بعد البداية (بحد أقصى 24 ساعة).",
      );
    if (!allowPast && start < Date.now() - 60000)
      fail("Choose a start time in the future.", "اختر موعد بداية في المستقبل.");
    if (!["lesson", "revision", "consultation", "other"].includes(values.type))
      fail("Choose a valid meeting type.", "اختر نوع اجتماع صحيحًا.");
    if (!["scheduled", "cancelled"].includes(values.status || "scheduled"))
      fail("Invalid meeting status.", "حالة الاجتماع غير صحيحة.");
    if (!Array.isArray(values.resources || []) || (values.resources || []).length > 5)
      fail("Attach up to five HTTPS resources.", "أرفق حتى خمسة مصادر HTTPS.");
    for (const resource of values.resources || []) {
      let url;
      try {
        url = new URL(resource.url);
      } catch {
        fail("A resource URL is invalid.", "رابط أحد المصادر غير صحيح.");
      }
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        resource.url.length > 2000 ||
        !resource.name?.trim() ||
        resource.name.length > 150
      )
        fail(
          "Use named HTTPS resource links without credentials.",
          "استخدم روابط HTTPS مسماة دون بيانات اعتماد في الرابط.",
        );
    }
  }
  function notify(db, ids, meeting, event, en, ar) {
    for (const recipient of new Set(ids)) {
      if (db.notifications.some((item) => item.event === event && item.recipient === recipient))
        continue;
      db.notifications.unshift({
        id: crypto.randomUUID(),
        recipient,
        meetingId: meeting.id,
        event,
        en,
        ar,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }
  function make(values, teacherId, db, demo = false) {
    validate(values, demo);
    const channel = ownedChannel(values.channelId, teacherId);
    const ids = recipients(values.audience, channel.id, teacherId, db);
    const id = crypto.randomUUID();
    return {
      ...values,
      id,
      roomName: "LearningOrbit" + id.replaceAll("-", ""),
      teacherId,
      teacherName: window.OrbitProfiles?.read(teacherId, "teacher")?.name || teacherId,
      channelName: channel.ar || channel.en || channel.id,
      schoolId: schoolFor(channel, teacherId),
      recipientIds: ids,
      startAt: stamp(values.startAt),
      endAt: stamp(values.endAt),
      status: values.status || "scheduled",
      revision: 1,
      createdAt: new Date().toISOString(),
      demo,
    };
  }
  function put(values, meetingId = null, expectedRevision = null) {
    const active = requireRole("teacher");
    // Form fields only: never let an edit change its owner, ID or room identity.
    values = Object.fromEntries(
      [
        "title",
        "subject",
        "description",
        "channelId",
        "type",
        "status",
        "startAt",
        "endAt",
        "audience",
        "resources",
        "timezone",
      ]
        .filter((key) => Object.hasOwn(values, key))
        .map((key) => [key, values[key]]),
    );
    const db = data();
    const old = meetingId ? db.meetings.find((meeting) => meeting.id === meetingId) : null;
    if (meetingId && (!old || old.teacherId !== active.email))
      fail("Only the owner can edit this meeting.", "مالك الاجتماع فقط يستطيع تعديله.");
    if (old && old.revision !== expectedRevision)
      fail(
        "This meeting changed. Reload its details before editing.",
        "تغيّر الاجتماع. أعد فتح التفاصيل قبل التعديل.",
      );
    validate(values, !!old && values.startAt === old.startAt && values.endAt === old.endAt);
    const channel = ownedChannel(values.channelId, active.email);
    const unchanged =
      old &&
      old.channelId === values.channelId &&
      JSON.stringify(old.audience) === JSON.stringify(values.audience);
    const ids = unchanged
      ? [...old.recipientIds]
      : recipients(values.audience, channel.id, active.email, db);
    const meeting = old
      ? {
          ...old,
          ...values,
          recipientIds: ids,
          startAt: stamp(values.startAt),
          endAt: stamp(values.endAt),
          schoolId: schoolFor(channel, active.email),
          channelName: channel.ar || channel.en || channel.id,
          revision: old.revision + 1,
          updatedAt: new Date().toISOString(),
        }
      : make(values, active.email, db);
    meeting.title = meeting.title.trim();
    meeting.subject = meeting.subject.trim();
    meeting.description = meeting.description.trim();
    if (old) db.meetings = db.meetings.map((item) => (item.id === old.id ? meeting : item));
    else db.meetings.unshift(meeting);
    const event = meeting.status === "cancelled" ? "cancelled" : old ? "changed" : "created";
    notify(
      db,
      [...ids, ...(old?.recipientIds || [])],
      meeting,
      `${event}:${meeting.id}:${meeting.revision}`,
      {
        created: "Your teacher scheduled a new lesson: ",
        changed: "A meeting was updated: ",
        cancelled: "A meeting was cancelled: ",
      }[event] + meeting.title,
      {
        created: "حدّد معلمك درسًا جديدًا: ",
        changed: "تم تحديث اجتماع: ",
        cancelled: "تم إلغاء اجتماع: ",
      }[event] + meeting.title,
    );
    persist(db);
    return meeting;
  }
  function interviewApplication(applicationId, schoolId = user().email) {
    if (user().role !== "school" || !schoolId || user().email !== schoolId)
      fail("This interview is not available to your account.", "هذه المقابلة غير متاحة لحسابك.");
    const recruitment = window.OrbitRecruitment,
      application = recruitment?.applications().find((item) => item.id === applicationId),
      job = application && recruitment.getJob(application.jobId);
    if (!application || !job || application.schoolId !== schoolId)
      fail("Choose an application belonging to your school.", "اختر طلبًا تابعًا لمدرستك.");
    return { application, job };
  }
  function interviewForApplication(applicationId) {
    requireRole("school");
    return (
      data().meetings.find(
        (meeting) =>
          meeting.kind === "recruitment-interview" &&
          meeting.applicationId === applicationId &&
          meeting.schoolId === user().email &&
          meeting.status === "scheduled",
      ) || null
    );
  }
  function putInterview(values, applicationId, meetingId = null, expectedRevision = null) {
    const school = requireRole("school"),
      recruitment = window.OrbitRecruitment,
      { application, job } = interviewApplication(applicationId, school.email),
      original = data(),
      before = data(),
      old = meetingId
        ? before.meetings.find(
            (meeting) =>
              meeting.id === meetingId &&
              meeting.kind === "recruitment-interview" &&
              meeting.applicationId === applicationId &&
              meeting.schoolId === school.email,
          )
        : null;
    if (meetingId && !old) fail("This interview is not available.", "هذه المقابلة غير متاحة.");
    if (old && old.revision !== expectedRevision)
      fail("This meeting changed. Reload it before editing.", "تغيّر الاجتماع. أعد فتحه قبل التعديل.");
    if (old?.status === "cancelled")
      fail("A cancelled interview cannot be rescheduled.", "لا يمكن إعادة جدولة مقابلة ملغاة.");
    if (
      !["pending", "interview_scheduled"].includes(application.status) ||
      (application.status === "interview_scheduled" && application.interviewMeetingId && application.interviewMeetingId !== old?.id)
    )
      fail("This application is no longer eligible for an interview.", "لم يعد هذا الطلب مؤهلًا للمقابلة.");
    const duplicate = before.meetings.find(
      (meeting) =>
        meeting.kind === "recruitment-interview" &&
        meeting.applicationId === applicationId &&
        meeting.status === "scheduled" &&
        meeting.id !== old?.id,
    );
    if (duplicate)
      fail("An interview is already scheduled for this application.", "تمت جدولة مقابلة لهذا الطلب بالفعل.");
    const start = Date.parse(values.startAt),
      end = Date.parse(values.endAt),
      type = values.type,
      location = String(values.location || "").trim().slice(0, 500),
      externalUrl = String(values.externalUrl || "").trim();
    if (
      before.meetings.some(
        (meeting) =>
          meeting.kind === "recruitment-interview" &&
          meeting.status === "scheduled" &&
          meeting.id !== old?.id &&
          (meeting.schoolId === school.email || meeting.teacherId === application.teacherId) &&
          Date.parse(meeting.startAt) < end &&
          Date.parse(meeting.endAt) > start,
      )
    )
      fail("This time overlaps another interview for the school or teacher.", "يتعارض الموعد مع مقابلة أخرى للمدرسة أو المعلم.");
    if (!String(values.title || "").trim() || values.title.length > 150 || !String(values.description || "").trim())
      fail("Complete the interview title and details.", "أكمل عنوان المقابلة وتفاصيلها.");
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= Date.now() || end <= start || end - start < 15 * 60000 || end - start > 180 * 60000)
      fail("Choose a future interview between 15 and 180 minutes.", "اختر موعدًا مستقبليًا مدته بين 15 و180 دقيقة.");
    if (!["interview-online", "interview-in-person"].includes(type))
      fail("Choose online or in-person interview.", "اختر مقابلة عن بُعد أو حضورية.");
    if (type === "interview-in-person" && !location)
      fail("Enter the in-person interview location.", "أدخل موقع المقابلة الحضورية.");
    if (externalUrl) {
      let parsed;
      try {
        parsed = new URL(externalUrl);
      } catch {
        fail("Use a valid HTTPS meeting link.", "استخدم رابط اجتماع HTTPS صحيحًا.");
      }
      if (parsed.protocol !== "https:" || parsed.username || parsed.password || externalUrl.length > 2000)
        fail("Use a valid HTTPS meeting link.", "استخدم رابط اجتماع HTTPS صحيحًا.");
    }
    if (type === "interview-in-person" && externalUrl)
      fail("In-person interviews do not use an online meeting link.", "المقابلة الحضورية لا تستخدم رابطًا إلكترونيًا.");
    const id = old?.id || crypto.randomUUID(),
      teacher = recruitment.teacher(application.teacherId),
      record = {
        ...(old || {}),
        id,
        kind: "recruitment-interview",
        applicationId,
        jobId: application.jobId,
        schoolId: school.email,
        teacherId: application.teacherId,
        teacherName: teacher.name,
        title: String(values.title).trim().slice(0, 150),
        subject: String(values.subject || job.subject).trim().slice(0, 100),
        description: String(values.description).trim().slice(0, 3000),
        channelId: null,
        channelName: job.title,
        audience: { mode: "individual", studentIds: [] },
        recipientIds: [application.teacherId],
        type,
        location: type === "interview-in-person" ? location : "",
        externalUrl: type === "interview-online" ? externalUrl : "",
        roomName: old?.roomName || "LearningOrbit" + id.replaceAll("-", ""),
        resources: [],
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        timezone: String(values.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone),
        status: "scheduled",
        revision: old ? old.revision + 1 : 1,
        createdAt: old?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    if (old) before.meetings = before.meetings.map((meeting) => (meeting.id === id ? record : meeting));
    else before.meetings.unshift(record);
    const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: record.timezone }).format(new Date(start));
    notify(
      before,
      [application.teacherId],
      record,
      `${old ? "changed" : "created"}:${record.id}:${record.revision}`,
      `${old ? "Interview rescheduled: " : "Interview scheduled: "}${when}`,
      `${old ? "تم تغيير موعد المقابلة: " : "تمت جدولة مقابلة: "}${new Intl.DateTimeFormat("ar-JO", { dateStyle: "medium", timeStyle: "short", timeZone: record.timezone }).format(new Date(start))}`,
    );
    persist(before);
    try {
      recruitment.linkInterviewMeeting(applicationId, id);
    } catch (error) {
      persist(original);
      throw error;
    }
    return record;
  }
  function cancel(id) {
    const active = user(),
      db = data(),
      meeting = db.meetings.find((item) => item.id === id);
    const interview = meeting?.kind === "recruitment-interview";
    if (interview) {
      if (active.role !== "school" || meeting.schoolId !== active.email)
        fail("Only the organizing school can cancel this interview.", "المدرسة المنظمة فقط يمكنها إلغاء هذه المقابلة.");
    } else {
      requireRole("teacher");
      if (!meeting || meeting.teacherId !== active.email)
        fail("Meeting not found or not owned by you.", "الاجتماع غير موجود أو ليس ملكك.");
    }
    if (!meeting) fail("Meeting not found or not owned by you.", "الاجتماع غير موجود أو ليس ملكك.");
    if (meeting.status === "cancelled") return;
    const before = data();
    meeting.status = "cancelled";
    meeting.revision++;
    meeting.updatedAt = new Date().toISOString();
    notify(
      db,
      meeting.recipientIds,
      meeting,
      "cancelled:" + id + ":" + meeting.revision,
      interview ? "An interview was cancelled: " + meeting.title : "A meeting was cancelled: " + meeting.title,
      interview ? "تم إلغاء مقابلة: " + meeting.title : "تم إلغاء اجتماع: " + meeting.title,
    );
    persist(db);
    if (interview) {
      try {
        window.OrbitRecruitment.clearInterviewMeeting(meeting.applicationId, meeting.id);
      } catch (error) {
        persist(before);
        throw error;
      }
    }
  }
  function remove(id) {
    const active = requireRole("teacher"),
      db = data(),
      meeting = db.meetings.find((item) => item.id === id && item.teacherId === active.email);
    if (!meeting) fail("Meeting not found or not owned by you.", "الاجتماع غير موجود أو ليس ملكك.");
    notify(
      db,
      meeting.recipientIds,
      meeting,
      "deleted:" + id,
      "A meeting was deleted: " + meeting.title,
      "تم حذف اجتماع: " + meeting.title,
    );
    db.meetings = db.meetings.filter((item) => item.id !== id);
    persist(db);
  }
  function status(meeting, now = Date.now()) {
    if (meeting.status === "cancelled") return "cancelled";
    if (now < Date.parse(meeting.startAt)) return "upcoming";
    return now < Date.parse(meeting.endAt) ? "live" : "completed";
  }
  function canView(meeting, active = user()) {
    if (!active.email) return false;
    if (meeting.kind === "recruitment-interview") {
      const application = window.OrbitRecruitment?.data().applications.find(
        (item) => item.id === meeting.applicationId,
      );
      if (
        !application ||
        application.jobId !== meeting.jobId ||
        application.teacherId !== meeting.teacherId ||
        application.schoolId !== meeting.schoolId ||
        !meeting.recipientIds.includes(meeting.teacherId)
      )
        return false;
      if (active.role === "teacher") return meeting.teacherId === active.email;
      if (active.role === "school") return meeting.schoolId === active.email;
      return false;
    }
    if (active.role === "teacher") return meeting.teacherId === active.email;
    if (active.role === "student")
      return (
        meeting.recipientIds.includes(active.email) &&
        (read("orbit.memberships.v3", {})[active.email] || []).includes(meeting.channelId)
      );
    // The existing non-interview meeting model is teacher-to-student and
    // channel-scoped. School-channel association alone must not expose lessons.
    if (active.role === "school") return false;
    return false;
  }
  const visible = () =>
    data()
      .meetings.filter((meeting) => canView(meeting))
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const recruitmentInterviews = () =>
    visible().filter((meeting) => meeting.kind === "recruitment-interview");
  function get(id) {
    const meeting = data().meetings.find((item) => item.id === id);
    return meeting && canView(meeting) ? meeting : null;
  }
  function updateInterview(values, meetingId, expectedRevision) {
    const meeting = get(meetingId);
    if (!meeting || meeting.kind !== "recruitment-interview" || user().role !== "school")
      fail("This interview is not available.", "هذه المقابلة غير متاحة.");
    return putInterview(values, meeting.applicationId, meetingId, expectedRevision);
  }
  function entry(id) {
    const meeting = get(id);
    const active = user();
    // get() has already checked the interview/application relationship and ownership.
    const organizingSchool = active.role === "school" &&
      meeting?.kind === "recruitment-interview" && meeting.schoolId === active.email;
    if (!meeting || (!["teacher", "student"].includes(active.role) && !organizingSchool))
      fail("This meeting is not available to your account.", "هذا الاجتماع غير متاح لحسابك.");
    if (status(meeting) !== "live")
      fail(
        "Entry is available only during the scheduled meeting window.",
        "الدخول متاح خلال الموعد المحدد للاجتماع فقط.",
      );
    if (!/^LearningOrbit[a-f0-9]{32}$/.test(meeting.roomName))
      fail("The saved room is invalid.", "الغرفة المحفوظة غير صحيحة.");
    return meeting;
  }
  function reminders() {
    const active = user();
    if (active.role !== "student") return;
    const db = data(),
      before = db.notifications.length;
    for (const meeting of db.meetings.filter(
      (item) => canView(item) && status(item) === "upcoming",
    )) {
      if (Date.parse(meeting.startAt) - Date.now() <= 15 * 60000)
        notify(
          db,
          [active.email],
          meeting,
          "soon:" + meeting.id + ":" + meeting.startAt,
          "Your lesson starts soon: " + meeting.title,
          "درسك يبدأ قريبًا: " + meeting.title,
        );
    }
    if (db.notifications.length !== before) persist(db);
  }
  const notifications = () =>
    data().notifications.filter((item) => item.recipient === user().email);
  function markRead(id) {
    const db = data(),
      item = db.notifications.find((item) => item.id === id && item.recipient === user().email);
    if (item && !item.read) {
      item.read = true;
      persist(db);
    }
  }
  async function initializeDemo() {
    requireRole("teacher");
    const demoUsers = [
      { email: "meetings.teacher@demo.orbit.local", name: "Demo · أحمد الخطيب", role: "teacher" },
      { email: "meetings.lina@demo.orbit.local", name: "Demo · لينا", role: "student" },
      { email: "meetings.omar@demo.orbit.local", name: "Demo · عمر", role: "student" },
      { email: "meetings.sara@demo.orbit.local", name: "Demo · سارة", role: "student" },
      { email: "meetings.yazan@demo.orbit.local", name: "Demo · يزن", role: "student" },
      { email: "meetings.school@demo.orbit.local", name: "Demo · مدرسة المدار", role: "school" },
    ];
    const password = "OrbitMeet2026!";
    if (data().demoInitialized) return { users: demoUsers, password, already: true };
    const existing = read("orbit.recruitment.v1", {}).accounts || [];
    for (const account of demoUsers) {
      const old = existing.find((item) => item.email === account.email);
      if (
        old &&
        (old.role !== account.role ||
          (old.name || OrbitProfiles.read(account.email, account.role).name) !== account.name)
      )
        fail(
          "A demo address is already used by another account. No accounts were changed.",
          "أحد عناوين التجربة مستخدم بحساب آخر. لم تُغيّر الحسابات.",
        );
    }
    for (const account of demoUsers) {
      if (
        !(read("orbit.recruitment.v1", {}).accounts || []).some(
          (item) => item.email === account.email,
        )
      )
        await OrbitRecruitment.registerAccount(
          {
            ...account,
            subject: "physics",
            level: "secondary",
            location: "Amman",
            contact: account.email,
            type: "private",
            levels: ["secondary"],
            subjects: ["physics"],
          },
          password,
        );
    }
    const db = data();
    if (db.demoInitialized) return { users: demoUsers, password, already: true };
    const teacherId = demoUsers[0].email,
      schoolId = demoUsers[5].email,
      studentIds = demoUsers.slice(1, 5).map((item) => item.email),
      channelId = "meeting-demo-physics";
    const channelDB = read("orbit.channels.v2", { channels: [], posts: [] });
    channelDB.channels = channelDB.channels || [];
    if (channelDB.channels.some((item) => item.id === channelId && item.teacher !== teacherId))
      fail(
        "The demo channel ID already belongs to another teacher.",
        "معرّف قناة التجربة يخص معلمًا آخر.",
      );
    if (!channelDB.channels.some((item) => item.id === channelId))
      channelDB.channels.push({
        id: channelId,
        ar: "Demo · فيزياء الصف التاسع",
        en: "Demo · Grade 9 Physics",
        teacher: teacherId,
        schoolId,
        subject: "physics",
        private: true,
        code: "DEMO-" + crypto.randomUUID(),
        descAr: "قناة تجريبية للاجتماعات",
        descEn: "Meeting demonstration channel",
      });
    localStorage.setItem("orbit.channels.v2", JSON.stringify(channelDB));
    const enrollment = read("orbit.memberships.v3", {});
    for (const id of studentIds)
      enrollment[id] = [...new Set([...(enrollment[id] || []), channelId])];
    localStorage.setItem("orbit.memberships.v3", JSON.stringify(enrollment));
    const orgs = read("orbit.school.members.v1", { schools: {} });
    orgs.schools = orgs.schools || {};
    const org = orgs.schools[schoolId] || { teachers: [], students: [] };
    if (!org.teachers.some((item) => item.id === teacherId))
      org.teachers.push({
        id: teacherId,
        status: "active",
        permissions: ["publish", "classes", "labs", "reports", "planning"],
      });
    org.students = [...new Set([...org.students, ...studentIds])];
    orgs.schools[schoolId] = org;
    localStorage.setItem("orbit.school.members.v1", JSON.stringify(orgs));
    const groupA = {
      id: "meeting-demo-group-a",
      name: "Demo · المجموعة أ",
      teacherId,
      channelId,
      studentIds: studentIds.slice(0, 2),
    };
    const groupB = {
      id: "meeting-demo-group-b",
      name: "Demo · المجموعة ب",
      teacherId,
      channelId,
      studentIds: studentIds.slice(2),
    };
    for (const group of [groupA, groupB])
      if (!db.groups.some((item) => item.id === group.id)) db.groups.push(group);
    const now = Date.now();
    for (const [title, audience, offset] of [
      ["Demo · Newton’s Laws — Revision Lesson", { mode: "channel" }, 86400000],
      ["Demo · Group A Live Revision", { mode: "group", groupId: groupA.id }, -5 * 60000],
      [
        "Demo · Individual Consultation",
        { mode: "individual", studentIds: [studentIds[1], studentIds[3]] },
        2 * 86400000,
      ],
    ]) {
      const meeting = make(
        {
          title,
          subject: "Physics · الفيزياء",
          description: "Demo · مراجعة قوانين نيوتن وحل مسائل القوى والحركة.",
          channelId,
          audience,
          startAt: new Date(now + offset).toISOString(),
          endAt: new Date(now + offset + 60 * 60000).toISOString(),
          type: "revision",
          status: "scheduled",
          resources: [],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        teacherId,
        db,
        true,
      );
      db.meetings.push(meeting);
      notify(
        db,
        meeting.recipientIds,
        meeting,
        "created:" + meeting.id + ":1",
        "Demo · A new lesson was scheduled: " + meeting.title,
        "Demo · تمت جدولة درس: " + meeting.title,
      );
    }
    db.demoInitialized = true;
    persist(db);
    return { users: demoUsers, password, already: false };
  }
  window.OrbitMeetings = {
    key: KEY,
    data,
    ownChannels,
    members,
    groups,
    putGroup,
    put,
    putInterview,
    interviewForApplication,
    updateInterview,
    cancel,
    remove,
    status,
    visible,
    recruitmentInterviews,
    get,
    entry,
    reminders,
    notifications,
    markRead,
    initializeDemo,
    t,
  };
})();
