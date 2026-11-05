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
      certificates: p.certificates || [],
      workSamples: p.workSamples || [],
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
  const newest = rows => window.OrbitRecordOrder?.newest(rows) || rows;
  function listJobs() {
    return newest(data().jobs.filter((j) => j.status === "published"));
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
    return newest(data().jobs.filter((j) => j.schoolId === u.email));
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
    const inactive = new Set(
      data()
        .accounts.filter((account) => ["suspended", "deleted"].includes(account.status))
        .map((account) => account.email),
    );
    return allTeachers()
      .filter((p) => p.available && p.shareWithSchools && !inactive.has(p.id))
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
        .map((a) => ({ ...a, submittedProfile: a.profile, profile: teacher(a.teacherId) })).sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0));
    if (u.role === "teacher")
      return data()
        .applications.filter((a) => a.teacherId === u.email && (!jobId || a.jobId === jobId))
        .map((a) => ({ ...a, submittedProfile: a.profile, profile: teacher(a.teacherId) }));
    throw Error("ROLE_DENIED");
  }
  const statuses = ["pending", "review", "shortlisted", "interview_scheduled", "accepted", "rejected", "withdrawn"];
  function updateApplication(appId, status) {
    const u = current(),
      d = data(),
      a = d.applications.find((a) => a.id === appId);
    if (!a || !statuses.includes(status)) throw Error("INVALID_APPLICATION");
    if (status === "interview_scheduled" && (a.status !== status || !a.interviewMeetingId))
      throw Error("INTERVIEW_MEETING_REQUIRED");
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
    if (["accepted","rejected"].includes(a.status)) throw Error("FINAL_DECISION_RECORDED");
    if (["accepted","rejected"].includes(status)) {const modern=get('orbit.meetings.v1',{meetings:[]}).meetings||[],ids=new Set(modern.map(m=>m.id)),interviews=[...modern,...(d.interviews||[]).filter(m=>!ids.has(m.id))];if(interviews.some(m=>m.applicationId===a.id&&m.schoolId===a.schoolId&&m.teacherId===a.teacherId&&m.status==='scheduled'))throw Error("INTERVIEW_PENDING_COMPLETION");}
    a.history = [...(a.history || []), {from:a.status,to:status,actorId:u.email,at:new Date().toISOString()}];
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
          interview_scheduled: "Interview scheduled",
          accepted: "Accepted",
          rejected: "Rejected",
          withdrawn: "Withdrawn",
        }[status],
      "تغيرت حالة الطلب: " +
        {
          pending: "قيد الانتظار",
          review: "قيد المراجعة",
          shortlisted: "القائمة المختصرة",
          interview_scheduled: "تمت جدولة المقابلة",
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
    const meetings=window.OrbitMeetings,ids=new Set(meetings?.recruitmentInterviews().map(m=>m.id)||[]),interviews=(meetings?.notifications()||[]).filter(n=>ids.has(n.meetingId)).map(n=>({...n,url:(u.role==='school'?'../school-dashboard/school-dashboard.html?tab=interviews&interview=':'../applications/applications.html?interview=')+encodeURIComponent(n.meetingId)+'#interviews'}));
    return newest([...data().notifications.filter((n) => n.recipient === u.email),...interviews]);
  }
  function readNotification(id) {
    const u = current(),
      d = data();
    d.notifications
      .filter((n) => n.recipient === u.email && (!id || n.id === id))
      .forEach((n) => (n.read = true));
    save(d);
    const meetings=window.OrbitMeetings,ids=new Set(meetings?.recruitmentInterviews().map(m=>m.id)||[]);if(meetings)meetings.markRead(meetings.notifications().filter(n=>ids.has(n.meetingId)&&(!id||n.id===id)).map(n=>n.id));
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
      !split(v.levels).length
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
    let p;
    if (applicationId) {
      const a = applications().find((a) => a.id === applicationId);
      if (!a || (teacherId && OrbitProfiles.canonical(a.teacherId) !== OrbitProfiles.canonical(teacherId)))
        throw Error("ROLE_DENIED");
      p = a.profile;
    } else {
      if (!teacherId) throw Error("ROLE_DENIED");
      p = teacher(teacherId === "khaled" ? "teacher@orbit.com" : teacherId);
      const account = data().accounts.find((item) => item.email === p.id);
      if (
        !p.available ||
        !p.shareWithSchools ||
        ["suspended", "deleted"].includes(account?.status)
      )
        throw Error("PRIVATE_PROFILE");
    }
    return {
      id: p.id,
      name: p.name,
      photo: p.photo || "",
      bio: p.bio || "",
      subject: p.subject || "",
      subjects: p.subjects || [],
      qualification: p.qualification || "",
      experience: p.experience,
      grades: p.grades || [],
      skills: p.skills || [],
      methods: p.methods || [],
      positions: p.positions || "",
      certificates: p.certificates || [],
      workSamples: p.workSamples || [],
      location: p.location || "",
      cv: p.cv || "",
    };
  }
  function portfolioForViewer(teacherId, applicationId) {
    const u = current();
    if (u.role === "school") return profileForSchool(applicationId, teacherId);
    if (
      u.role !== "teacher" ||
      (teacherId && OrbitProfiles.canonical(teacherId) !== OrbitProfiles.canonical(u.email))
    )
      throw Error("ROLE_DENIED");
    const p = OrbitProfiles.read(u.email, "teacher");
    return {
      id: p.id,
      name: p.name,
      photo: p.photo || "",
      bio: p.bio || "",
      subject: p.subject || "",
      subjects: p.subjects || [],
      qualification: p.qualification || "",
      experience: p.experience,
      grades: p.grades || [],
      skills: p.skills || [],
      methods: p.methods || [],
      positions: p.positions || "",
      certificates: p.certificates || [],
      workSamples: p.workSamples || [],
      location: p.location || "",
      cv: p.cv || "",
    };
  }
  function teacherForViewer(email) {
    const u = current();
    if (u.role === "teacher") {
      if (email && OrbitProfiles.canonical(email) !== OrbitProfiles.canonical(u.email))
        throw Error("ROLE_DENIED");
      return teacher(u.email);
    }
    if (u.role !== "school" || !email) throw Error("ROLE_DENIED");
    const application = applications().find(
      (item) => OrbitProfiles.canonical(item.teacherId) === OrbitProfiles.canonical(email),
    );
    return application
      ? profileForSchool(application.id, email)
      : profileForSchool("", email);
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
    requireRole("school");
    if (!window.OrbitMeetings) throw Error("INTERVIEW_SERVICE_UNAVAILABLE");
    const job = getJob(data().applications.find(a => a.id === values.applicationId)?.jobId);
    return window.OrbitMeetings.putInterview({
      title: values.title || job?.title || "Interview",
      subject: job?.subject || "",
      description: String(values.notes || "").trim() || "Recruitment interview",
      startAt: values.startAt,
      endAt: new Date(Date.parse(values.startAt) + Number(values.duration) * 60000).toISOString(),
      type: values.url ? "interview-online" : "interview-in-person",
      externalUrl: values.url || "",
      location: values.url ? "" : values.location || "",
    }, values.applicationId);
  }
  function cancelInterview(interviewId) {
    if (window.OrbitMeetings) return window.OrbitMeetings.cancel(interviewId);
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
  function linkInterviewMeeting(applicationId, meetingId) {
    const u = requireRole("school"),
      d = data(),
      a = d.applications.find((item) => item.id === applicationId && item.schoolId === u.email);
    if (
      !a ||
      !meetingId ||
      !["pending", "review", "shortlisted", "interview_scheduled"].includes(a.status)
    )
      throw Error("INVALID_APPLICATION");
    if (a.status !== "interview_scheduled") a.interviewPreviousStatus = a.status;
    a.interviewMeetingIds = [...new Set([...(a.interviewMeetingIds || []), ...(a.interviewMeetingId ? [a.interviewMeetingId] : []), meetingId])];
    a.history = [...(a.history || []), {from:a.status,to:"interview_scheduled",interviewId:meetingId,actorId:u.email,at:new Date().toISOString()}];
    a.interviewMeetingId = meetingId;
    a.status = "interview_scheduled";
    a.updatedAt = new Date().toISOString();
    save(d);
    window.dispatchEvent(new CustomEvent("orbit:recruitment-change"));
    return a;
  }
  function clearInterviewMeeting(applicationId, meetingId, completed = false) {
    const u = requireRole("school"),
      d = data(),
      a = d.applications.find((item) => item.id === applicationId && item.schoolId === u.email);
    if (!a || a.interviewMeetingId !== meetingId) return false;
    delete a.interviewMeetingId;
    if (a.status === "interview_scheduled") {const previous=a.status;a.status=completed?"review":a.interviewPreviousStatus||"pending";a.history=[...(a.history||[]),{from:previous,to:a.status,interviewId:meetingId,actorId:u.email,at:new Date().toISOString()}];}
    delete a.interviewPreviousStatus;
    a.updatedAt = new Date().toISOString();
    save(d);
    window.dispatchEvent(new CustomEvent("orbit:recruitment-change"));
    return true;
  }

  async function issueSchoolAccount(values, password) {
    const actor = requireRole("school"), role = values.role;
    if (!["student", "teacher"].includes(role)) throw Error("INVALID_ROLE");
    const academic = get("orbit.school.academics.demo.v1:" + encodeURIComponent(actor.email), null);
    const record = academic?.[role === "student" ? "students" : "teachers"]?.find(r => r.id === values.academicId && r.schoolId === actor.email);
    if (!record) throw Error("NOT_FOUND");
    const email = norm(values.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) throw Error("INVALID_CREDENTIALS");
    const salt = encode(crypto.getRandomValues(new Uint8Array(16))), digest = await hash(password, salt);
    if (current().email !== actor.email || current().role !== "school") throw Error("ROLE_DENIED");
    if(window.OrbitAuth?.current()?.email!==actor.email)throw Error('ROLE_DENIED');
    for (const storage of ["orbit.profiles.v1", key]) {
      const raw = localStorage.getItem(storage);
      if (raw !== null) { let value; try { value = JSON.parse(raw); } catch { throw Error("INVALID_DATA"); }
        if (!value || typeof value !== "object" || Array.isArray(value) || (storage === key && value.accounts !== undefined && !Array.isArray(value.accounts)) || (storage !== key && (!value.records || typeof value.records !== "object" || Array.isArray(value.records)))) throw Error("INVALID_DATA");
        if(role==='teacher'&&storage!==key&&Object.keys(value.records).some(id=>norm(id)===email))throw Error("EMAIL_EXISTS");
      }
    }
    const d = data(), latest = get("orbit.school.academics.demo.v1:" + encodeURIComponent(actor.email), null);
    if (!latest?.[role === "student" ? "students" : "teachers"]?.some(r => r.id === record.id && r.name === record.name)) throw Error("STALE_DATA");
    if (d.accounts.some(a => norm(a.email) === email) || ["teacher@orbit.com", "student@orbit.com", "school@orbit.com"].includes(email)) throw Error("EMAIL_EXISTS");
    if (d.accounts.some(a => a.schoolId === actor.email && a.academicId === record.id)) throw Error("ACCOUNT_EXISTS");
    if(role==='student') {
      const raw=localStorage.getItem('orbit.school.enrollment-identities.demo.v1:'+encodeURIComponent(actor.email));
      let mappings;try{mappings=raw===null?{mappings:[]}:JSON.parse(raw);}catch{throw Error('INVALID_DATA');}
      if(!mappings||!Array.isArray(mappings.mappings))throw Error('INVALID_DATA');
      if(mappings.mappings.some(m=>m.academicStudentId===record.id&&m.status==='confirmed'))throw Error('ACCOUNT_EXISTS');
    }
    if(role==='teacher'){
      const teaching=get('orbit.school.teaching-assignments.demo.v1:'+encodeURIComponent(actor.email),{linkInvitations:[]});if(teaching.linkInvitations?.some(r=>r.teacherId===record.id&&r.status==='pending'))throw Error('ACCOUNT_EXISTS');
      for(const [prefix,field]of [['orbit.school.teaching-assignments.demo.v1:','reviews'],['orbit.school.education.links.v1:','mappings']]){
        const raw=localStorage.getItem(prefix+encodeURIComponent(actor.email));let db;try{db=raw===null?{[field]:[]}:JSON.parse(raw);}catch{throw Error('INVALID_DATA');}
        if(!db||!Array.isArray(db[field]))throw Error('INVALID_DATA');
        if(db[field].some(r=>field==='reviews'?r.teacherId===record.id:r.role==='teachers'&&r.academicId===record.id))throw Error('ACCOUNT_EXISTS');
      }
    }
    d.accounts.push({ email, name: record.name, role, status: "active", createdAt: new Date().toISOString(), salt, digest, schoolId: actor.email, academicId: record.id, mustChangePassword: true });
    commitRegistration(d, { id: email, role, name: record.name, ...(role === "student" ? { level: "secondary" } : { subject: String(values.subject || "general").slice(0, 100), experience: 0 }) });
    return { email, role, name: record.name };
  }
  // Hash before the synchronous multi-store demo transaction; never persist plaintext.
  async function createSchoolStudent(values, expected, confirmed = false) {
    const actor = requireRole("school"), E = OrbitSchoolEnrollments;
    if (confirmed !== true) throw Error("CONFIRMATION_REQUIRED");
    const name = String(values.name || "").trim(), email = norm(values.email);
    if (!name || name.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error("INVALID_FIELDS");
    const password = OrbitSchoolCredentials.temporary();
    const salt = encode(crypto.getRandomValues(new Uint8Array(16))), digest = await hash(password, salt);
    // Recheck live authority and all snapshots after hashing. No await during writes.
    if (requireRole("school").email !== actor.email || OrbitAuth.current()?.email !== actor.email) throw Error("ROLE_DENIED");
    const context = E.read().context;
    if (Object.keys(context).some(k => context[k] !== expected?.[k])) throw Error("STALE_DATA");
    for (const storage of [key, "orbit.profiles.v1"]) {
      const raw = localStorage.getItem(storage);
      if (raw !== null) {
        let parsed; try { parsed = JSON.parse(raw); } catch { throw Error("INVALID_DATA"); }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || (storage === key && !Array.isArray(parsed.accounts))) throw Error("INVALID_DATA");
      }
    }
    const academic = OrbitSchoolAcademics.read(), d = data();
    const profiles = get("orbit.profiles.v1", {records:{}});
    if (!profiles?.records || typeof profiles.records !== "object" || Array.isArray(profiles.records)) throw Error("INVALID_DATA");
    if (d.accounts.some(a => norm(a.email) === email) || Object.keys(profiles.records).some(k => norm(k) === email) || ["student@orbit.com", "teacher@orbit.com", "school@orbit.com"].includes(email)) throw Error("EMAIL_EXISTS");
    const comparable = v => String(v || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
    const matches = [...academic.students, ...d.accounts, ...Object.values(profiles.records)].some(r => comparable(r.name) === comparable(name));
    if (matches && values.reviewedDistinctIdentity !== true) throw Error("IDENTITY_REVIEW_REQUIRED");
    const year = OrbitSchoolYears.read().years.find(y => y.id === values.academicYearId);
    if (!year || year.status === "archived" || window.OrbitSchoolYearContext?.readOnly()) throw Error("ARCHIVED_YEAR");
    const structure = OrbitSchoolSections.view(year.id);
    if (!structure.sections.some(s => s.id === values.sectionId && s.gradeId === values.gradeId) || !structure.grades.some(g => g.id === values.gradeId)) throw Error("INVALID_SECTION");
    const keys = [OrbitSchoolAcademics.storageKey(), "orbit.profiles.v1", key, E.mappingKey(), E.storageKey()];
    const before = keys.map(k => localStorage.getItem(k));
    try {
      const student = OrbitSchoolAcademics.save("students", null, {name, studentCode:"S-" + crypto.randomUUID(), status:"enrolled", classId:null}, academic);
      d.accounts.push({email, name, role:"student", status:"active", schoolId:actor.email, academicId:student.id, salt, digest, mustChangePassword:true, createdAt:new Date().toISOString(), identityReview:matches ? {actorId:actor.email, confirmedDistinct:true, confirmedAt:new Date().toISOString()} : undefined});
      commitRegistration(d, {id:email, role:"student", name, level:"secondary"});
      const op = crypto.randomUUID(), mapping = E.requestMapping(student.id, E.read().context, op + "-request");
      E.confirmMapping(mapping.id, email, E.read().context, op + "-confirm", true);
      const enrollment = E.enrollSection({academicStudentId:student.id, academicYearId:year.id, gradeId:values.gradeId, sectionId:values.sectionId}, E.read().context, op + "-enroll", true);
      return {email, password, student, enrollment};
    } catch (error) {
      let failed = false;
      keys.forEach((k,i) => {try {if(localStorage.getItem(k)!==before[i]) {if(before[i]===null)localStorage.removeItem(k);else localStorage.setItem(k,before[i]);}} catch {failed=true;}});
      window.dispatchEvent(new Event("orbit:school-enrollments-change"));
      if (failed) throw Error("ROLLBACK_FAILED");
      throw error;
    }
  }
  // Teacher onboarding reuses the academic registry, account hashing and annual teaching store.
  async function createSchoolTeacher(values, expected, confirmed = false) {
    const actor=requireRole('school'),T=OrbitSchoolTeaching;
    if(confirmed!==true)throw Error('CONFIRMATION_REQUIRED');
    const name=String(values.name||'').trim(),email=norm(values.email),yearId=values.academicYearId;
    if(!name||name.length>100||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('INVALID_FIELDS');
    const profileKey='orbit.profiles.v1',profileSnapshot=localStorage.getItem(profileKey);
    const existing=data().accounts.filter(a=>norm(a.email)===email);
    if(existing.length>1)throw Error('IDENTITY_CONFLICT');
    if(existing.length)throw Error('EMAIL_EXISTS');
    if(existing.length&&(existing[0].role!=='teacher'||existing[0].status!=='active'))throw Error('INVALID_ACCOUNT');
    const password=existing.length?null:OrbitSchoolCredentials.temporary();
    const salt=password?encode(crypto.getRandomValues(new Uint8Array(16))):null,digest=password?await hash(password,salt):null;
    if(requireRole('school').email!==actor.email||OrbitAuth.current()?.email!==actor.email)throw Error('ROLE_DENIED');
    const view=T.read(yearId);
    if(expected?.snapshot!==view.context.snapshot||expected?.schoolId!==actor.email||profileSnapshot!==localStorage.getItem(profileKey))throw Error('STALE_DATA');
    const year=OrbitSchoolYearContext.read().selectedYear;
    if(year?.id!==yearId)throw Error('STALE_DATA');
    if(!view.selectedYear||year.status==='archived')throw Error('ARCHIVED_YEAR');
    const assignments=values.assignments||[];
    if(!Array.isArray(assignments))throw Error('INVALID_FIELDS');
    const slots=new Set();
    for(const a of assignments){
      if(!view.subjects.some(q=>q.id===a.subjectId&&q.status==='active'))throw Error('INVALID_SUBJECT');
      if(!view.sections.some(q=>q.id===a.sectionId&&q.gradeId===a.gradeId))throw Error('INVALID_SECTION');
      const slot=JSON.stringify([a.sectionId,a.subjectId]);if(slots.has(slot))throw Error('DUPLICATE_ASSIGNMENT');slots.add(slot);
      if(view.assignments.some(q=>q.sectionId===a.sectionId&&q.subjectId===a.subjectId))throw Error('PRIMARY_TEACHER_EXISTS');
    }
    const profiles=get(profileKey,{records:{}});
    if(!profiles?.records||typeof profiles.records!=='object'||Array.isArray(profiles.records))throw Error('INVALID_DATA');
    const d=data(),live=d.accounts.filter(a=>norm(a.email)===email);
    if(!existing.length&&(live.length||Object.keys(profiles.records).some(k=>norm(k)===email)||['teacher@orbit.com','student@orbit.com','school@orbit.com'].includes(email)))throw Error('EMAIL_EXISTS');
    if(existing.length&&(live.length!==1||JSON.stringify(live[0])!==JSON.stringify(existing[0])))throw Error('STALE_DATA');
    if(view.accounts.some(a=>a.accountId&&norm(a.accountId)===email)||live.some(a=>a.schoolId===actor.email&&a.academicId))throw Error('ACCOUNT_ALREADY_LINKED');
    const keys=[OrbitSchoolAcademics.storageKey(),profileKey,key,T.storageKey()],before=keys.map(k=>localStorage.getItem(k));
    try{
      const teacher=values.teacherId?view.teachers.find(t=>t.id===values.teacherId):OrbitSchoolAcademics.save('teachers',null,{name,teacherCode:'T-'+crypto.randomUUID()},OrbitSchoolAcademics.read());if(!teacher)throw Error('INVALID_TEACHER');if(values.teacherId&&(view.accounts.find(a=>a.teacherId===teacher.id)?.accountId||view.linkInvitations?.some(r=>r.teacherId===teacher.id&&r.status==='pending')))throw Error('ACCOUNT_ALREADY_LINKED');
      if(!existing.length){d.accounts.push({email,name,role:'teacher',status:'active',schoolId:actor.email,academicId:teacher.id,salt,digest,mustChangePassword:true,createdAt:new Date().toISOString()});commitRegistration(d,{id:email,role:'teacher',name,subject:'general',experience:0});}
      T.confirmTeacher(teacher.id,email,T.read(yearId).context,true);
      for(const a of assignments)T.save('',{...a,teacherId:teacher.id,academicYearId:yearId},T.read(yearId).context,true);
      return {teacher,email,password,linkedExisting:!!existing.length,assignmentCount:assignments.length};
    }catch(error){
      let failed=false;keys.forEach((k,i)=>{try{if(localStorage.getItem(k)!==before[i]){if(before[i]===null)localStorage.removeItem(k);else localStorage.setItem(k,before[i]);}}catch{failed=true;}});
      window.dispatchEvent(new Event('orbit:school-teaching-change'));if(failed)throw Error('ROLLBACK_FAILED');throw error;
    }
  }
  async function changeInitialPassword(email, temporary, password) {
    const identity = await authenticate(email, temporary);
    if (!identity || password === temporary || password.length < 10 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) throw Error("INVALID_CREDENTIALS");
    const d = data(), account = d.accounts.find(a => a.email === identity.email);
    if (!account?.mustChangePassword) throw Error("INVALID_TRANSITION");
    const expected = account.digest, salt = encode(crypto.getRandomValues(new Uint8Array(16))), digest = await hash(password, salt);
    const latest = data(), live = latest.accounts.find(a => a.email === identity.email);
    if (!live?.mustChangePassword || live.digest !== expected) throw Error("STALE_DATA");
    Object.assign(live, { salt, digest, mustChangePassword: false, passwordChangedAt: new Date().toISOString() }); save(latest); return identity;
  }

  window.OrbitRecruitment = {
    issueSchoolAccount, createSchoolStudent, createSchoolTeacher, changeInitialPassword,
    interviews,
    scheduleInterview,
    cancelInterview,
    linkInterviewMeeting,
    clearInterviewMeeting,
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
    teacher: teacherForViewer,
    match,
    discover,
    apply,
    applications,
    updateApplication,
    statuses,
    portfolioForViewer,
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
