(() => {
  "use strict";
  window.OrbitRecordOrder ||= { newest: rows => rows.map((row,index)=>({row,index,time:typeof row.createdAt === "string" && Number.isFinite(Date.parse(row.createdAt)) ? Date.parse(row.createdAt) : -Infinity})).sort((a,b)=>a.time===b.time?a.index-b.index:a.time>b.time?-1:1).map(v=>v.row) };
  const get = (k, d) => {
      try {
        return JSON.parse(localStorage.getItem(k)) ?? d;
      } catch {
        return d;
      }
    },
    set = (k, v) => localStorage.setItem(k, JSON.stringify(v)),
    current = () => {
      const u = get("orbitUser", null),
        account = (get("orbit.recruitment.v1", {}).accounts || []).find(
          (a) => a.email === u?.email,
        ),
        state = get("orbit.admin.v1", {}).accountStates?.[u?.email];
      if (u && [account?.status,state?.status].some(s=>["suspended", "deleted"].includes(s))) {
        localStorage.removeItem("orbitUser");
        sessionStorage.removeItem("orbit.admin.session");
        return null;
      }
      return u;
    };
  function flush() {
    const u = current(),
      state = get("orbit.student.v1", {});
    set("orbit.preferences", {
      lang: state.lang || "ar",
      theme: state.theme || "light",
      mood: state.mood || "fun",
    });
    if (u?.role === "student") set("orbit.student.state." + u.email, state);
  }
  function startSession(u) {
    if (!u?.email || !["student", "teacher", "school", "admin"].includes(u.role))
      throw Error("INVALID_SESSION");
    const account = (get("orbit.recruitment.v1", {}).accounts || []).find(
        (a) => a.email === u.email,
      ),
      state = get("orbit.admin.v1", {}).accountStates?.[u.email];
    if ([account?.status,state?.status].some(s=>["suspended", "deleted"].includes(s)))
      throw Error("ACCOUNT_INACTIVE");
    if(account?.mustChangePassword) throw Error('PASSWORD_CHANGE_REQUIRED');
    if (u.role === "admin") {
      const proof = JSON.parse(sessionStorage.getItem("orbit.admin.session") || "null");
      if (
        account?.role !== "admin" ||
        !proof ||
        typeof proof.token !== "string" ||
        !proof.token ||
        proof.email !== u.email ||
        !Number.isFinite(proof.expiresAt) ||
        proof.expiresAt <= Date.now()
      )
        throw Error("ROLE_DENIED");
      flush();
      set("orbitUser", { name: u.name, email: u.email, role: u.role });
      return;
    }
    flush();
    const previous = current(),
      prefs = get("orbit.preferences", { lang: "ar", theme: "light", mood: "fun" });
    if (u.role === "student") {
      const p = OrbitProfiles.read(u.email, u.role),
        fallback =
          u.email === "student@orbit.com" && !previous
            ? get("orbit.student.v1", {})
            : { xp: u.email === "student@orbit.com" ? 1280 : 0, done: [], quiz: null };
      const state = {
        ...fallback,
        ...get("orbit.student.state." + u.email, {}),
        ...prefs,
        name: p.name || u.name,
        photo: p.photo || "",
        address: p.address || "",
        level: p.level || "",
      };
      set("orbit.student.v1", state);
      OrbitProfiles.project(p);
    } else {
      set("orbit.student.v1", prefs);
      if (u.role === "teacher") {
        const fallback =
          u.email === "teacher@orbit.com" && !localStorage.getItem("orbit.teacher.owner")
            ? get("orbit.teacher.profile", {})
            : { name: u.name, subject: "physics", experience: 0 };
        const profile = OrbitProfiles.read(u.email, u.role);
        set("orbit.teacher.profile", { ...profile, name: profile.name || u.name });
        localStorage.setItem("orbit.teacher.owner", u.email);
      }
    }
    set("orbitUser", { name: u.name, email: u.email, role: u.role });
    OrbitProfiles.project(OrbitProfiles.read(u.email, u.role));
    const db = get("orbit.channels.v2", {});
    db.role = u.role;
    db.joined = get("orbit.memberships.v3", {})[u.email] || [];
    set("orbit.channels.v2", db);
  }
  function logout() {
    flush();
    localStorage.removeItem("orbitUser");
    sessionStorage.removeItem("orbit.admin.session");
    location.replace("../login/login.html");
  }
  function profile() {
    const p = OrbitProfiles.current();
    if (p?.role !== "student") throw Error("ROLE_DENIED");
    return p;
  }
  function updateProfile(p) {
    return OrbitProfiles.update(p);
  }
  // Live gate for managed school students. Never creates memberships or rewrites history.
  // null preserves existing independent, non-academic membership behavior.
  const managedChannel = channel => channel?.schoolChannelVersion === 1;
  function schoolChannelOptions(schoolId, email = current()?.email, archivedYearId = null, existingSubjectId = null) {
    if (!schoolId || !email) return [];
    try {
      const key = encodeURIComponent(schoolId);
      const load = name => get(name + key, {});
      const years = load("orbit.school.years.demo.v1:");
      const year = years.years.find(y => y.schoolId === schoolId && (archivedYearId
        ? y.id === archivedYearId && y.status === "archived"
        : y.id === years.activeYearId && y.status === "active"));
      if (!year || years.schoolId !== schoolId) return [];
      const accounts = get("orbit.recruitment.v1", {}).accounts || [];
      const matches = accounts.filter(a => a.email === email);
      const account = matches[0] || (email === "teacher@orbit.com" && { role: "teacher", status: "active" });
      if (matches.length > 1 || account?.role !== "teacher" || account.status !== "active" || account.mustChangePassword ||
          ["suspended", "deleted"].includes(get("orbit.admin.v1", {}).accountStates?.[email]?.status)) return [];
      const academic = load("orbit.school.academics.demo.v1:");
      const teaching = load("orbit.school.teaching-assignments.demo.v1:");
      const structures = load("orbit.school.section-structures.demo.v1:");
      if ([academic, teaching, structures].some(record => record.schoolId !== schoolId)) return [];
      const legacy = load("orbit.school.education.links.v1:");
      const links = [...teaching.reviews, ...(legacy.schoolId === schoolId ? legacy.mappings.filter(r => r.role === "teachers")
        .map(r => ({ ...r, teacherId: r.academicId })) : [])].filter(r => r.schoolId === schoolId);
      const ids = new Set(links.filter(r => r.accountId === email).map(r => r.teacherId));
      if (ids.size !== 1) return [];
      const [teacherId] = ids;
      if (links.some(r => r.teacherId === teacherId && r.accountId !== email) ||
          !academic.teachers.some(r => r.id === teacherId && r.schoolId === schoolId)) return [];
      return teaching.assignments.flatMap(a => {
        if (a.schoolId !== schoolId || a.academicYearId !== year.id || a.teacherId !== teacherId ||
            teaching.assignments.filter(r => r.academicYearId === year.id && r.sectionId === a.sectionId && r.subjectId === a.subjectId).length !== 1) return [];
        const section = structures.sections.find(r => r.schoolId === schoolId && r.id === a.sectionId && r.gradeId === a.gradeId && r.academicYearId === year.id);
        const grade = structures.grades.find(r => r.schoolId === schoolId && r.id === a.gradeId);
        const subject = academic.subjects.find(r => r.schoolId === schoolId && r.id === a.subjectId && (archivedYearId || r.id === existingSubjectId || r.status === "active"));
        return section && grade && subject ? [{ ...a, sectionName: section.name, gradeName: grade.name, subjectName: subject.name }] : [];
      });
    } catch { return []; }
  }

  function schoolChannelTeacher(channel, email, readOnly = false) {
    if (!managedChannel(channel) || channel.deleted || channel.teacher !== email || !Array.isArray(channel.sectionIds) || !channel.sectionIds.length) return false;
    const options = schoolChannelOptions(channel.schoolId, email, null, channel.subjectId);
    const allowed = rows => channel.sectionIds.every(id => rows.some(a => a.academicYearId === channel.academicYearId && a.subjectId === channel.subjectId && a.sectionId === id));
    return allowed(options) || (readOnly && allowed(schoolChannelOptions(channel.schoolId, email, channel.academicYearId, channel.subjectId)));
  }

  function schoolChannelStudent(channel, email, post, write = false) {
    if (!managedChannel(channel)) return null;
    if (channel.deleted) return false;
    if (post && (!Array.isArray(post.sectionIds) || !post.sectionIds.length || post.sectionIds.some(id => !channel.sectionIds?.includes(id)))) return false;
    if (write && get("orbit.school.years.demo.v1:" + encodeURIComponent(channel.schoolId), {}).activeYearId !== channel.academicYearId) return false;
    return schoolStudentAccess(channel, email, { managed: true, targetSections: post?.sectionIds }) === true;
  }

  function schoolChannelPlacement(channel, email, post) {
    if (!schoolChannelStudent(channel, email, post, true)) return null;
    return schoolStudentAccess(channel, email, { placement: true, targetSections: post?.sectionIds });
  }

  function schoolStudentAccess(channel, email = current()?.email, options = {}) {
    return evaluateSchoolStudentAccess(channel, email, options, (key, fallback) => {
      const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw);
    });
  }
  // One synchronous report may check hundreds of enrollments. Share parsed reads
  // within that batch, run the exact same policy, and fail closed if any source changes.
  function schoolStudentAccessBatch(channel, emails) {
    const snapshots = new Map(), parsed = new Map();
    const read = (key, fallback) => {
      if (!snapshots.has(key)) { const raw = localStorage.getItem(key); snapshots.set(key, raw); parsed.set(key, raw === null ? fallback : JSON.parse(raw)); }
      return parsed.get(key);
    };
    const result = new Map([...new Set(emails)].map(email => [email, evaluateSchoolStudentAccess(channel, email, {}, read)]));
    try { if ([...snapshots].some(([key, raw]) => localStorage.getItem(key) !== raw)) for (const email of result.keys()) result.set(email, false); }
    catch { for (const email of result.keys()) result.set(email, false); }
    return result;
  }
  function evaluateSchoolStudentAccess(channel, email, options, read) {
    if(!channel?.schoolId || !email) return null;
    try {
      const schoolId=channel.schoolId,enc=encodeURIComponent(schoolId),accounts=read('orbit.recruitment.v1',{accounts:[]}).accounts;
      if(!Array.isArray(accounts))return false;
      const matches=accounts.filter(a=>a.email===email);if(!matches.length&&email==='student@orbit.com')matches.push({email,role:'student',status:'active'});
      const account=matches[0],admin=read('orbit.admin.v1',{});
      const maps=read('orbit.school.enrollment-identities.demo.v1:'+enc,{mappings:[],history:[]}),annual=read('orbit.school.enrollments.demo.v1:'+enc,{enrollments:[],placements:[]});
      if(!Array.isArray(maps.mappings)||!Array.isArray(maps.history)||!Array.isArray(annual.enrollments)||!Array.isArray(annual.placements))return false;
      const managed=account?.role==='student'&&account.schoolId===schoolId || maps.mappings.some(m=>m.accountId===email) || maps.history.some(h=>h.fromAccountId===email||h.toAccountId===email) || annual.enrollments.some(e=>e.accountId===email);
      if(!managed)return managedChannel(channel) ? false : null;
      if(matches.length!==1||account.role!=='student'||account.status!=='active'||account.mustChangePassword||['suspended','deleted'].includes(admin.accountStates?.[email]?.status))return false;
      if(maps.schoolId!==schoolId||annual.schoolId!==schoolId)return false;
      const years=read('orbit.school.years.demo.v1:'+enc,{years:[]}),active=years.years.filter(y=>y.status==='active');
      const archived = managedChannel(channel) && !options.enrollmentOnly &&
        years.years.some(y => y.id === channel.academicYearId && y.schoolId === schoolId && y.status === "archived");
      if (!archived && (active.length !== 1 || years.activeYearId !== active[0].id || active[0].schoolId !== schoolId)) return false;
      const mappings=maps.mappings.filter(m=>m.status==='confirmed'&&m.schoolId===schoolId&&m.accountId===email);
      if(mappings.length!==1)return false;
      const m=mappings[0],events=maps.history.filter(h=>h.mappingId===m.id),last=events.at(-1);
      if(!last||!['confirmed','corrected'].includes(last.type)||last.toAccountId!==email||last.actorId!==m.actorId||last.createdAt!==m.confirmedAt)return false;
      const roster=read('orbit.school.academics.demo.v1:'+enc,{students:[],classes:[]});
      if(!roster.students.some(s=>s.id===m.academicStudentId&&s.schoolId===schoolId&&(archived || s.status==='enrolled')))return false;
      const selected = managedChannel(channel) && !options.enrollmentOnly
        ? years.years.find(y => y.schoolId === schoolId && y.id === channel.academicYearId && ["active", "archived"].includes(y.status))
        : active[0];
      if (!selected) return false;
      const enrollments=annual.enrollments.filter(e=>e.schoolId===schoolId&&e.mappingId===m.id&&e.academicStudentId===m.academicStudentId&&e.academicYearId===selected.id&&e.status==='enrolled');
      if(enrollments.length!==1)return false;
      const e=enrollments[0],p=annual.placements.find(p=>p.id===e.currentPlacementId&&p.enrollmentId===e.id&&p.schoolId===schoolId);
      if(!p)return false;
      if (managedChannel(channel) && e.accountId !== email && !events.some(event => event.type === "corrected" && event.fromAccountId === e.accountId)) return false;
      if(!managedChannel(channel) && !options.enrollmentOnly && options.requireMembership!==false && !(read('orbit.memberships.v3',{})[email]||[]).includes(channel.id))return false;
      if(e.structure==='section') {
        const structures=read('orbit.school.section-structures.demo.v1:'+enc,{sections:[],grades:[]});
        const valid=structures.schoolId===schoolId&&p.sectionId===e.sectionId&&p.gradeId===e.gradeId&&structures.grades.some(g=>g.id===p.gradeId&&g.schoolId===schoolId)&&structures.sections.some(s=>s.id===p.sectionId&&s.schoolId===schoolId&&s.gradeId===p.gradeId&&s.academicYearId===selected.id);
        if (managedChannel(channel) && !options.enrollmentOnly) {
          const labelsMatch = structures.grades.some(g => g.id === p.gradeId && g.name === p.gradeSnapshot) &&
            structures.sections.some(section => section.id === p.sectionId && section.name === p.sectionSnapshot);
          return valid && (archived || labelsMatch) && Array.isArray(channel.sectionIds) && channel.sectionIds.includes(p.sectionId) &&
            (!options.targetSections || options.targetSections.includes(p.sectionId)) &&
            (!options.placement || p);
        }
        return valid&&(options.enrollmentOnly || channel.sectionId===p.sectionId&&channel.academicYearId===active[0].id);
      }
      if (managedChannel(channel) && !options.enrollmentOnly) return false;
      const link=(annual.classYearLinks||[]).find(l=>l.classId===p.classId&&l.academicYearId===active[0].id),c=roster.classes.find(c=>c.id===p.classId&&c.status==='active');
      const links=read('orbit.school.education.links.v1:'+enc,{links:[]});
      return !!link&&!!c&&link.gradeSnapshot===c.grade&&link.sectionSnapshot===c.section&&link.legacyYearSnapshot===c.academicYear&&(options.enrollmentOnly || links.links.some(l=>l.schoolId===schoolId&&l.channelId===channel.id&&l.classId===p.classId));
    } catch { return false; }
  }
  window.OrbitAuth = {
    schoolStudentAccess, schoolStudentAccessBatch, managedChannel, schoolChannelOptions, schoolChannelTeacher, schoolChannelStudent, schoolChannelPlacement,
    get,
    set,
    current,
    flush,
    startSession,
    logout,
    profile,
    updateProfile,
    register: (v, p) => OrbitRecruitment.registerAccount(v, p),
  };
})();
