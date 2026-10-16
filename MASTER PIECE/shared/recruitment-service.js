(() => {
  "use strict";
  const key = "orbit.recruitment.v1",
    get = (k, d) => {
      try {
        return JSON.parse(localStorage.getItem(k)) ?? d;
      } catch {
        return d;
      }
    },
    write = (k, v) => localStorage.setItem(k, JSON.stringify(v)),
    norm = (s) =>
      String(s || "")
        .trim()
        .normalize("NFKC")
        .toLocaleLowerCase()
        .replace(/[\u064b-\u065f\u0640]/g, ""),
    split = (s) => [
      ...new Set(
        String(s || "")
          .split(/[,،\n]/)
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    ],
    current = () => get("orbitUser", {}),
    id = () => crypto.randomUUID();
  const demoSchool = {
    id: "school@orbit.com",
    name: "Orbit School",
    location: "Amman",
    contact: "school@orbit.com",
    type: "private",
    levels: ["secondary"],
    subjects: ["physics", "math"],
    description: "Local demonstration school.",
    website: "",
  };
  function data() {
    return Object.assign(
      { schools: [demoSchool], jobs: [], applications: [], notifications: [], accounts: [] },
      get(key, {}),
    );
  }
  function save(d) {
    write(key, d);
  }
  function requireRole(role) {
    const u = current();
    if (u.role !== role || !u.email) throw Error("ROLE_DENIED");
    return u;
  }
  function school() {
    const u = requireRole("school");
    return OrbitProfiles.read(u.email, "school");
  }
  function teacher(email) {
    email = email || (current().role === "teacher" ? current().email : "teacher@orbit.com");
    const p = OrbitProfiles.read(email, "teacher");
    return {
      id: email,
      name: p.name || (email === "teacher@orbit.com" ? "Sarah Teacher" : "Teacher"),
      subject: p.subject || "physics",
      subjects: [...new Set([p.subject || "physics", ...(p.subjects || [])])],
      qualification: p.qualification || "",
      experience: p.experience == null ? null : +p.experience,
      grades: p.grades || [],
      skills: p.skills || [],
      methods: p.methods || [],
      positions: p.positions || "",
      location: p.location || "",
      bio: p.bio || "",
      photo: p.photo || "",
      cv: p.shareCV ? p.cv || "" : "",
      available: p.available === true,
      shareWithSchools: p.shareWithSchools === true,
      notifyInterest: p.notifyInterest === true,
    };
  }
  function allTeachers() {
    return [
      ...new Set([
        "teacher@orbit.com",
        ...data()
          .accounts.filter((a) => a.role === "teacher")
          .map((a) => a.email),
      ]),
    ].map(teacher);
  }
  function match(job, p) {
    const checks = [],
      criteria = [
        [
          "subject",
          35,
          true,
          (p.subjects || [p.subject]).map(norm).includes(norm(job.subject)),
          "Same specialization",
          "نفس التخصص",
        ],
        [
          "experience",
          20,
          p.experience != null && Number.isFinite(p.experience),
          p.experience >= job.experience,
          "Required experience",
          "الخبرة المطلوبة",
        ],
        [
          "grades",
          15,
          !!p.grades?.length,
          (job.grades || []).every((g) => (p.grades || []).map(norm).includes(norm(g))),
          "Required grade levels",
          "الصفوف المطلوبة",
        ],
        [
          "skills",
          15,
          !!p.skills?.length,
          (job.skills || []).every((s) => (p.skills || []).map(norm).includes(norm(s))),
          "Required skills",
          "المهارات المطلوبة",
        ],
        [
          "qualification",
          10,
          !!p.qualification,
          split(job.qualifications).every((q) => norm(p.qualification).includes(norm(q))),
          "Qualification text matches · verify documents",
          "نص المؤهل متوافق · يحتاج تحققًا",
        ],
        [
          "location",
          5,
          !!p.location,
          norm(p.location) === norm(job.location),
          "Same location",
          "نفس الموقع",
        ],
      ];
    let weight = 0,
      earned = 0;
    for (const [key, w, known, ok, en, ar] of criteria) {
      if (
        (key === "grades" && !job.grades?.length) ||
        (key === "skills" && !job.skills?.length) ||
        (key === "qualification" && !job.qualifications) ||
        (key === "location" && (job.remote || !job.location))
      )
        continue;
      weight += w;
      if (known && ok) earned += w;
      checks.push({ key, known, ok: known && ok, en, ar });
    }
    return {
      score: weight ? Math.round((earned / weight) * 100) : 0,
      checks,
      subjectMatch: checks[0]?.ok === true,
      reviewRequired: true,
    };
  }
  function notify(d, recipient, type, event, en, ar, url) {
    if (d.notifications.some((n) => n.event === event && n.recipient === recipient)) return;
    d.notifications.unshift({
      id: id(),
      recipient,
      type,
      event,
      en,
      ar,
      url,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
  function matching(d, job) {
    if (job.status !== "published") return;
    for (const p of allTeachers()) {
      if (!p.available || !p.shareWithSchools) continue;
      const m = match(job, p);
      if (m.subjectMatch && m.score >= 60) {
        const sig = JSON.stringify([
          job.subject,
          job.experience,
          job.grades,
          job.skills,
          job.qualifications,
          job.location,
          job.remote,
        ]);
        notify(
          d,
          p.id,
          "match",
          "job-match:" + job.id + sig,
          "A matching opportunity: " + job.title,
          "فرصة مناسبة: " + job.title,
          "../jobs/jobs.html?id=" + job.id,
        );
        notify(
          d,
          job.schoolId,
          "match",
          "teacher-match:" + job.id + ":" + p.id + sig,
          "A teacher matches " + job.title,
          "معلم يطابق بيانات " + job.title,
          "../school-dashboard/school-dashboard.html?tab=discover&job=" + job.id,
        );
      }
    }
  }
  function listJobs() {
    return data().jobs.filter((j) => j.status === "published");
  }
  function publicSchool(id) {
    const s = OrbitProfiles.read(id, "school");
    return s?.name
      ? {
          id: s.id,
          name: s.name,
          logo: s.logo || "",
          location: s.location,
          type: s.type,
          levels: s.levels,
          subjects: s.subjects,
          description: s.description,
          website: s.website,
          contact: s.contact,
        }
      : null;
  }
  function getJob(id) {
    const j = data().jobs.find((j) => j.id === id);
    if (!j) return null;
    const u = current();
    if (j.status === "draft" && !(u.role === "school" && j.schoolId === u.email)) return null;
    return { ...j, school: publicSchool(j.schoolId) };
  }
  function ownJobs() {
    const u = requireRole("school");
    return data().jobs.filter((j) => j.schoolId === u.email);
  }
  function putJob(values, jobId) {
    const u = requireRole("school"),
      d = data(),
      old = jobId ? d.jobs.find((j) => j.id === jobId) : null;
    if (jobId && (!old || old.schoolId !== u.email)) throw Error("NOT_OWNER");
    for (const field of ["title", "subject", "location", "employment"])
      if (!String(values[field] || "").trim()) throw Error("REQUIRED_FIELDS");
    if (!Number.isInteger(+values.experience) || +values.experience < 0 || +values.experience > 60)
      throw Error("INVALID_EXPERIENCE");
    if (!["draft", "published", "closed"].includes(values.status)) throw Error("INVALID_STATUS");
    const j = {
      id: old?.id || id(),
      schoolId: u.email,
      title: String(values.title).trim().slice(0, 150),
      subject: values.subject,
      grades: split(values.grades),
      qualifications: String(values.qualifications || "")
        .trim()
        .slice(0, 800),
      experience: +values.experience,
      skills: split(values.skills),
      employment: values.employment,
      location: String(values.location).trim().slice(0, 100),
      remote: values.remote === true,
      description: String(values.description || "")
        .trim()
        .slice(0, 3000),
      status: values.status,
      createdAt: old?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (old) d.jobs = d.jobs.map((x) => (x.id === j.id ? j : x));
    else d.jobs.unshift(j);
    matching(d, j);
    save(d);
    return j;
  }
  function setJobStatus(jobId, status) {
    const u = requireRole("school"),
      d = data(),
      j = d.jobs.find((j) => j.id === jobId && j.schoolId === u.email);
    if (!j || !["draft", "published", "closed"].includes(status)) throw Error("NOT_OWNER");
    j.status = status;
    j.updatedAt = new Date().toISOString();
    matching(d, j);
    save(d);
  }
  function discover(jobId) {
    requireRole("school");
    const job = jobId ? ownJobs().find((j) => j.id === jobId) : null;
    if (jobId && !job) throw Error("NOT_OWNER");
    return allTeachers()
      .filter((p) => p.available && p.shareWithSchools)
      .map((p) => ({ ...p, match: job ? match(job, p) : null }));
  }
  function apply(jobId, message, consent) {
    const u = requireRole("teacher"),
      d = data(),
      job = d.jobs.find((j) => j.id === jobId);
    if (!job || job.status !== "published") throw Error("JOB_CLOSED");
    if (!consent) throw Error("CONSENT_REQUIRED");
    if (d.applications.some((a) => a.jobId === jobId && a.teacherId === u.email))
      throw Error("ALREADY_APPLIED");
    const p = teacher();
    if (!p.name || !p.qualification) throw Error("PROFILE_INCOMPLETE");
    const a = {
      id: id(),
      jobId,
      schoolId: job.schoolId,
      teacherId: u.email,
      profile: p,
      message: String(message || "")
        .trim()
        .slice(0, 2000),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    d.applications.unshift(a);
    notify(
      d,
      job.schoolId,
      "application",
      "application:" + a.id,
      "New application: " + p.name,
      "طلب جديد من " + p.name,
      "../school-dashboard/school-dashboard.html?tab=applications&job=" + jobId,
    );
    save(d);
    return a;
  }
  function applications(jobId) {
    const u = current();
    if (u.role === "school")
      return data()
        .applications.filter((a) => a.schoolId === u.email && (!jobId || a.jobId === jobId))
        .map((a) => ({ ...a, submittedProfile: a.profile, profile: teacher(a.teacherId) }));
    if (u.role === "teacher")
      return data()
        .applications.filter((a) => a.teacherId === u.email && (!jobId || a.jobId === jobId))
        .map((a) => ({ ...a, submittedProfile: a.profile, profile: teacher(a.teacherId) }));
    throw Error("ROLE_DENIED");
  }
  const statuses = ["pending", "review", "shortlisted", "accepted", "rejected", "withdrawn"];
  function updateApplication(appId, status) {
    const u = current(),
      d = data(),
      a = d.applications.find((a) => a.id === appId);
    if (!a || !statuses.includes(status)) throw Error("INVALID_APPLICATION");
    if (u.role === "teacher") {
      if (
        a.teacherId !== u.email ||
        status !== "withdrawn" ||
        ["withdrawn", "accepted", "rejected"].includes(a.status)
      )
        throw Error("ROLE_DENIED");
    } else if (u.role === "school") {
      if (a.schoolId !== u.email || status === "withdrawn" || a.status === "withdrawn")
        throw Error("ROLE_DENIED");
    } else throw Error("ROLE_DENIED");
    if (a.status === status) return;
    a.status = status;
    a.updatedAt = new Date().toISOString();
    notify(
      d,
      u.role === "school" ? a.teacherId : a.schoolId,
      "status",
      "status:" + a.id + ":" + status + ":" + a.updatedAt,
      "Application status updated: " +
        {
          pending: "Pending",
          review: "Under review",
          shortlisted: "Shortlisted",
          accepted: "Accepted",
          rejected: "Rejected",
          withdrawn: "Withdrawn",
        }[status],
      "تغيرت حالة الطلب: " +
        {
          pending: "قيد الانتظار",
          review: "قيد المراجعة",
          shortlisted: "القائمة المختصرة",
          accepted: "مقبول",
          rejected: "مرفوض",
          withdrawn: "منسحب",
        }[status],
      u.role === "school"
        ? "../applications/applications.html"
        : "../school-dashboard/school-dashboard.html?tab=applications&job=" + a.jobId,
    );
    save(d);
  }
  function notifications() {
    const u = current();
    if (!["teacher", "school"].includes(u.role)) throw Error("ROLE_DENIED");
    return data().notifications.filter((n) => n.recipient === u.email);
  }
  function readNotification(id) {
    const u = current(),
      d = data();
    d.notifications
      .filter((n) => n.recipient === u.email && (!id || n.id === id))
      .forEach((n) => (n.read = true));
    save(d);
  }
  function interest(teacherId) {
    const u = requireRole("school"),
      p = teacher(teacherId);
    if (!p.shareWithSchools) throw Error("PRIVATE_PROFILE");
    if (!p.notifyInterest) return false;
    const d = data();
    notify(
      d,
      p.id,
      "interest",
      "interest:" + u.email + ":" + p.id,
      "A school is interested in your profile",
      "مدرسة أبدت اهتمامًا بملفك",
      "../jobs/jobs.html",
    );
    save(d);
    return true;
  }
  function saveTeacher(values) {
    const u = requireRole("teacher");
    const p = OrbitProfiles.read(u.email, "teacher"),
      next = {
        ...p,
        subjects: split(values.subjects),
        grades: split(values.grades),
        skills: split(values.skills),
        methods: split(values.methods),
        positions: String(values.positions || "").slice(0, 2000),
        available: values.available === true,
        shareWithSchools: values.shareWithSchools === true,
        shareCV: values.shareCV === true,
        notifyInterest: values.notifyInterest === true,
        photo: values.photo || p.photo || "",
      };
    OrbitProfiles.update(next);
    const d = data();
    for (const j of d.jobs) matching(d, j);
    save(d);
  }
  function updateSchool(values) {
    requireRole("school");
    const patch = { ...values };
    for (const field of ["levels", "subjects"])
      if (typeof patch[field] === "string") patch[field] = split(patch[field]);
    return OrbitProfiles.update(patch);
  }
  function encode(bytes) {
    return btoa(String.fromCharCode(...bytes));
  }
  async function hash(password, salt) {
    if (!crypto.subtle) throw Error("SECURE_CONTEXT_REQUIRED");
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    return encode(
      new Uint8Array(
        await crypto.subtle.deriveBits(
          {
            name: "PBKDF2",
            salt: Uint8Array.from(atob(salt), (c) => c.charCodeAt(0)),
            iterations: 100000,
            hash: "SHA-256",
          },
          material,
          256,
        ),
      ),
    );
  }
  function commitRegistration(d, profile) {
    const keys = ["orbit.profiles.v1", key],
      before = keys.map((k) => localStorage.getItem(k));
    try {
      OrbitProfiles.create(profile);
      save(d);
    } catch (error) {
      for (let i = 0; i < keys.length; i++) {
        if (localStorage.getItem(keys[i]) === before[i]) continue;
        try {
          if (before[i] === null) localStorage.removeItem(keys[i]);
          else localStorage.setItem(keys[i], before[i]);
        } catch {}
      }
      throw error;
    }
  }
  async function registerSchool(v, password) {
    const d = data(),
      email = norm(v.email);
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 10 ||
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password)
    )
      throw Error("INVALID_CREDENTIALS");
    if (
      ["teacher@orbit.com", "student@orbit.com", "school@orbit.com"].includes(email) ||
      d.accounts.some((a) => a.email === email)
    )
      throw Error("EMAIL_EXISTS");
    if (
      !v.name?.trim() ||
      !v.location?.trim() ||
      !v.contact?.trim() ||
      !v.type ||
      !split(v.levels).length ||
      !split(v.subjects).length
    )
      throw Error("REQUIRED_FIELDS");
    if (v.website && !/^https:\/\//i.test(v.website)) throw Error("HTTPS_REQUIRED");
    const salt = encode(crypto.getRandomValues(new Uint8Array(16))),
      digest = await hash(password, salt);
    d.accounts.push({
      email,
      role: "school",
      status: "active",
      createdAt: new Date().toISOString(),
      salt,
      digest,
    });
    d.schools.push({ id: email });
    d.schoolRequests ??= [];
    d.schoolRequests.push({
      id: crypto.randomUUID(),
      schoolId: email,
      status: "pending",
      submittedAt: new Date().toISOString(),
    });
    commitRegistration(d, {
      id: email,
      role: "school",
      name: v.name.trim(),
      location: v.location.trim(),
      contact: v.contact.trim(),
      type: v.type,
      levels: split(v.levels),
      subjects: split(v.subjects),
      description: v.description || "",
      website: v.website || "",
      logo: v.logo || "",
    });
    return { name: v.name.trim(), email, role: "school" };
  }
  async function provisionLocalAdmin(values, password) {
    if (!isSecureContext || !["localhost", "127.0.0.1", "[::1]"].includes(location.hostname))
      throw Error("LOCAL_SETUP_ONLY");
    let d = data();
    const email = norm(values.email);
    if (d.accounts.some((a) => a.role === "admin")) throw Error("ADMIN_ALREADY_EXISTS");
    if (current()?.email) throw Error("LOG_OUT_FIRST");
    if (
      !values.name?.trim() ||
      values.name.trim().length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 12 ||
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password)
    )
      throw Error("INVALID_CREDENTIALS");
    if (
      d.accounts.some((a) => a.email === email) ||
      ["student@orbit.com", "teacher@orbit.com", "school@orbit.com"].includes(email)
    )
      throw Error("EMAIL_EXISTS");
    const salt = encode(crypto.getRandomValues(new Uint8Array(16))),
      digest = await hash(password, salt);
    d = data();
    if (d.accounts.some((a) => a.role === "admin")) throw Error("ADMIN_ALREADY_EXISTS");
    if (d.accounts.some((a) => a.email === email)) throw Error("EMAIL_EXISTS");
    d.accounts.push({
      email,
      name: values.name.trim(),
      role: "admin",
      status: "active",
      createdAt: new Date().toISOString(),
      salt,
      digest,
    });
    commitRegistration(d, { id: email, role: "admin", name: values.name.trim() });
    return { email, name: values.name.trim(), role: "admin" };
  }
  async function authenticate(email, password) {
    const account = data().accounts.find((a) => a.email === norm(email));
    if (!account) return null;
    if (["suspended", "deleted"].includes(account.status)) throw Error("ACCOUNT_INACTIVE");
    const digest = await hash(password, account.salt);
    if (digest !== account.digest) return null;
    if (account.role === "admin")
      sessionStorage.setItem(
        "orbit.admin.session",
        JSON.stringify({
          email: account.email,
          token: crypto.randomUUID(),
          expiresAt: Date.now() + 8 * 3600000,
        }),
      );
    const profile = OrbitProfiles.read(account.email, account.role);
    return {
      name: profile?.name || account.name || "Orbit",
      email: account.email,
      role: account.role,
    };
  }
  function profileForSchool(applicationId, teacherId) {
    const u = requireRole("school");
    if (applicationId) {
      const a = applications().find((a) => a.id === applicationId);
      if (!a) throw Error("ROLE_DENIED");
      return a.profile;
    }
    const p = teacher(teacherId === "khaled" ? "teacher@orbit.com" : teacherId);
    if (!p.shareWithSchools) throw Error("PRIVATE_PROFILE");
    return p;
  }
  async function registerAccount(v, password) {
    if (v.role === "school") return registerSchool(v, password);
    if (!["student", "teacher"].includes(v.role)) throw Error("INVALID_ROLE");
    const d = data(),
      email = norm(v.email);
    if (
      !v.name?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 10 ||
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password)
    )
      throw Error("INVALID_CREDENTIALS");
    if (
      ["student@orbit.com", "teacher@orbit.com", "school@orbit.com"].includes(email) ||
      d.accounts.some((a) => a.email === email)
    )
      throw Error("EMAIL_EXISTS");
    const salt = encode(crypto.getRandomValues(new Uint8Array(16))),
      digest = await hash(password, salt);
    d.accounts.push({
      email,
      name: v.name.trim(),
      role: v.role,
      status: "active",
      createdAt: new Date().toISOString(),
      salt,
      digest,
    });
    commitRegistration(d, {
      id: email,
      role: v.role,
      name: v.name.trim(),
      level: v.level || "primary",
      address: v.address || "",
      subject: v.subject || "physics",
      subjects: [v.subject || "physics"],
      experience: v.role === "teacher" ? Number(v.experience) || 0 : 0,
      qualification: v.role === "teacher" ? String(v.qualification || "").slice(0, 1000) : "",
      location: v.role === "teacher" ? String(v.teacherLocation || "").slice(0, 200) : "",
      bio: "",
      photo: "",
    });
    return { name: v.name.trim(), email, role: v.role };
  }
  function refreshMatching() {
    const u = current();
    if (u.role !== "teacher") return;
    const d = data();
    for (const job of d.jobs) matching(d, job);
    save(d);
  }
  window.addEventListener("orbit:profile-change", () => {
    try {
      refreshMatching();
    } catch {}
  });
  function interviews() {
    const u = current();
    if (!["school", "teacher"].includes(u.role) || !u.email) throw Error("ROLE_DENIED");
    return (data().interviews || [])
      .filter((x) => (u.role === "school" ? x.schoolId === u.email : x.teacherId === u.email))
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  }
  function scheduleInterview(values) {
    const u = requireRole("school"),
      d = data(),
      a = d.applications.find((a) => a.id === values.applicationId && a.schoolId === u.email);
    if (!a || ["withdrawn", "rejected"].includes(a.status)) throw Error("INVALID_APPLICATION");
    const start = new Date(values.startAt),
      duration = Number(values.duration),
      location = String(values.location || "")
        .trim()
        .slice(0, 500),
      url = String(values.url || "").trim();
    if (
      !Number.isFinite(+start) ||
      +start <= Date.now() ||
      !Number.isInteger(duration) ||
      duration < 15 ||
      duration > 180 ||
      (!location && !url)
    )
      throw Error("INVALID_INTERVIEW");
    if (url) {
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        throw Error("HTTPS_REQUIRED");
      }
      if (parsed.protocol !== "https:" || parsed.username || parsed.password)
        throw Error("HTTPS_REQUIRED");
    }
    const end = +start + duration * 60000;
    d.interviews ||= [];
    if (
      d.interviews.some(
        (x) =>
          x.status === "scheduled" &&
          (x.schoolId === u.email || x.teacherId === a.teacherId) &&
          Date.parse(x.startAt) < end &&
          Date.parse(x.endAt) > +start,
      )
    )
      throw Error("INTERVIEW_CONFLICT");
    const record = {
      id: id(),
      applicationId: a.id,
      jobId: a.jobId,
      schoolId: u.email,
      teacherId: a.teacherId,
      startAt: start.toISOString(),
      endAt: new Date(end).toISOString(),
      duration,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      location,
      url,
      notes: String(values.notes || "")
        .trim()
        .slice(0, 1500),
      status: "scheduled",
      createdAt: new Date().toISOString(),
    };
    d.interviews.push(record);
    notify(
      d,
      a.teacherId,
      "interview",
      "interview:" + record.id,
      "Interview invitation: " + start.toLocaleString("en-GB"),
      "دعوة مقابلة: " + start.toLocaleString("ar-JO"),
      "../applications/applications.html#interviews",
    );
    save(d);
    return record;
  }
  function cancelInterview(interviewId) {
    const u = requireRole("school"),
      d = data(),
      record = (d.interviews || []).find((x) => x.id === interviewId && x.schoolId === u.email);
    if (!record) throw Error("ROLE_DENIED");
    if (record.status === "cancelled") return;
    record.status = "cancelled";
    record.updatedAt = new Date().toISOString();
    notify(
      d,
      record.teacherId,
      "interview",
      "interview-cancel:" + record.id,
      "Interview cancelled",
      "أُلغيت المقابلة",
      "../applications/applications.html#interviews",
    );
    save(d);
  }
  window.OrbitRecruitment = {
    interviews,
    scheduleInterview,
    cancelInterview,
    provisionLocalAdmin,
    refreshMatching,
    registerAccount,
    allTeachers,
    current,
    split,
    norm,
    data,
    school,
    publicSchool,
    getJob,
    listJobs,
    ownJobs,
    putJob,
    setJobStatus,
    teacher,
    match,
    discover,
    apply,
    applications,
    updateApplication,
    statuses,
    notifications,
    readNotification,
    interest,
    saveTeacher,
    updateSchool,
    registerSchool,
    authenticate,
    profileForSchool,
  };
})();
