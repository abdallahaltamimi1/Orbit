(() => {
  "use strict";
  const key = "orbit.profiles.v1",
    get = (k, d) => {
      try {
        return JSON.parse(localStorage.getItem(k)) ?? d;
      } catch {
        return d;
      }
    },
    clone = (v) => JSON.parse(JSON.stringify(v)),
    user = () => get("orbitUser", {}),
    canonical = (id) => (id === "khaled" ? "teacher@orbit.com" : id);
  const fields = {
    admin: ["name"],
    student: ["name", "photo", "address", "level", "contact"],
    teacher: [
      "name",
      "photo",
      "address",
      "contact",
      "location",
      "bio",
      "qualification",
      "subject",
      "subjects",
      "experience",
      "grades",
      "skills",
      "methods",
      "positions",
      "cv",
      "available",
      "shareWithSchools",
      "shareCV",
      "notifyInterest",
    ],
    school: [
      "name",
      "logo",
      "location",
      "address",
      "phone",
      "contact",
      "website",
      "description",
      "type",
      "levels",
      "subjects",
    ],
  };
  function data() {
    return get(key, { schema: 1, records: {} });
  }
  function seed(id, role) {
    id = canonical(id);
    const active = user(),
      accounts = get("orbit.recruitment.v1", {}),
      a = (accounts.accounts || []).find((a) => a.email === id);
    role =
      role ||
      a?.role ||
      ((accounts.schools || []).some((s) => s.id === id) && "school") ||
      (id === "teacher@orbit.com" ? "teacher" : id === "student@orbit.com" ? "student" : null);
    if (!role && active.email === id) role = active.role;
    if (!role) return null;
    if (
      !a &&
      active.email !== id &&
      !["student@orbit.com", "teacher@orbit.com", "school@orbit.com"].includes(id) &&
      !(accounts.schools || []).some((s) => s.id === id) &&
      !get("orbit." + role + ".profile." + id, null)
    )
      return null;
    let legacy = {};
    if (role === "school")
      legacy = (accounts.schools || []).find((s) => s.id === id) || {
        name: id === "school@orbit.com" ? "Orbit School" : a?.name || active.name || id,
        location: "Amman",
        contact: id,
        type: "private",
        levels: [],
        subjects: [],
      };
    else {
      legacy = get("orbit." + role + ".profile." + id, null);
      if (!legacy && active.email === id && active.role === role)
        legacy =
          role === "student" ? get("orbit.student.v1", {}) : get("orbit.teacher.profile", {});
      if (
        !legacy &&
        role === "teacher" &&
        id === "teacher@orbit.com" &&
        (!localStorage.getItem("orbit.teacher.owner") ||
          localStorage.getItem("orbit.teacher.owner") === id)
      )
        legacy = get("orbit.teacher.profile", {});
      legacy = legacy || {};
    }
    const profile = {
      id,
      role,
      email: id,
      revision: 1,
      name:
        legacy.name ||
        a?.name ||
        (active.email === id ? active.name : null) ||
        (id === "teacher@orbit.com" ? "Sarah Teacher" : id),
    };
    for (const field of fields[role])
      if (legacy[field] !== undefined) profile[field] = legacy[field];
    profile.name = String(profile.name || id);
    if (role === "teacher") {
      profile.experience = profile.experience ?? 0;
      profile.subject = profile.subject || "physics";
    }
    const d = data();
    if (d.records[id]) return d.records[id];
    d.records[id] = profile;
    localStorage.setItem(key, JSON.stringify(d));
    return profile;
  }
  function read(id, role) {
    id = canonical(id || user().email);
    return clone(data().records[id] || seed(id, role) || {});
  }
  function current() {
    const u = user();
    if (!u.email) return null;
    return read(u.email, u.role);
  }
  function project(p) {
    const u = user();
    if (u.email !== p.id) return;
    localStorage.setItem("orbitUser", JSON.stringify({ ...u, name: p.name }));
    if (p.role === "student") {
      const state = get("orbit.student.v1", {});
      localStorage.setItem(
        "orbit.student.v1",
        JSON.stringify({
          ...state,
          name: p.name,
          photo: p.photo || "",
          address: p.address || "",
          level: p.level || "",
        }),
      );
    }
    if (p.role === "teacher") {
      localStorage.setItem("orbit.teacher.profile", JSON.stringify(p));
      localStorage.setItem("orbit.teacher.owner", p.id);
    }
  }
  function validate(p) {
    if (!p.name?.trim() || p.name.trim().length > 100) throw Error("NAME_REQUIRED");
    for (const [field, max] of Object.entries({
      address: 300,
      contact: 200,
      phone: 50,
      location: 200,
      bio: 3000,
      qualification: 1000,
      positions: 2000,
      description: 3000,
    }))
      if (String(p[field] || "").length > max) throw Error("FIELD_TOO_LONG");
    if (
      p.role === "student" &&
      p.level &&
      !["primary", "secondary", "university"].includes(p.level)
    )
      throw Error("INVALID_LEVEL");
    if (p.role === "teacher") {
      if (!Number.isFinite(+p.experience) || +p.experience < 0 || +p.experience > 60)
        throw Error("INVALID_EXPERIENCE");
      if (p.cv && !/^https:\/\//i.test(p.cv)) throw Error("HTTPS_REQUIRED");
    }
    if (p.role === "school") {
      if (!p.location?.trim() || !p.contact?.trim()) throw Error("SCHOOL_REQUIRED");
      if (p.website && !/^https:\/\//i.test(p.website)) throw Error("HTTPS_REQUIRED");
    }
  }
  function update(patch, expectedRevision) {
    const u = user();
    if (
      !u.email ||
      !fields[u.role] ||
      (patch.id && patch.id !== u.email) ||
      (patch.role && patch.role !== u.role) ||
      (patch.email && patch.email !== u.email)
    )
      throw Error("ROLE_DENIED");
    const d = data(),
      old = read(u.email, u.role);
    if (old.role !== u.role || old.id !== u.email) throw Error("ROLE_DENIED");
    if (expectedRevision && old.revision !== expectedRevision) throw Error("PROFILE_CONFLICT");
    const p = { ...old };
    for (const field of fields[u.role]) if (Object.hasOwn(patch, field)) p[field] = patch[field];
    p.name = String(p.name || "").trim();
    validate(p);
    p.revision = (old.revision || 0) + 1;
    p.updatedAt = new Date().toISOString();
    d.records[p.id] = p;
    const before = localStorage.getItem(key);
    localStorage.setItem(key, JSON.stringify(d));
    try {
      project(p);
    } catch (error) {
      if (before === null) localStorage.removeItem(key);
      else localStorage.setItem(key, before);
      throw error;
    }
    window.dispatchEvent(
      new CustomEvent("orbit:profile-change", { detail: { id: p.id, profile: clone(p) } }),
    );
    return clone(p);
  }
  function list(role) {
    const d = get("orbit.recruitment.v1", {}),
      ids = new Set([
        ...Object.keys(data().records),
        ...(d.accounts || []).filter((a) => !role || a.role === role).map((a) => a.email),
      ]);
    if (role === "teacher") ids.add("teacher@orbit.com");
    if (role === "school") for (const s of d.schools || []) ids.add(s.id);
    return [...ids].map((id) => read(id, role)).filter((p) => p.role === role);
  }
  function create(profile) {
    if (!profile.id || !fields[profile.role]) throw Error("INVALID_PROFILE");
    const d = data();
    if (d.records[profile.id]) throw Error("EMAIL_EXISTS");
    const p = {
      id: profile.id,
      email: profile.id,
      role: profile.role,
      revision: 1,
      updatedAt: new Date().toISOString(),
    };
    for (const field of fields[profile.role])
      if (Object.hasOwn(profile, field)) p[field] = profile[field];
    validate(p);
    d.records[p.id] = p;
    localStorage.setItem(key, JSON.stringify(d));
    return clone(p);
  }
  window.OrbitProfiles = { read, current, update, project, list, canonical, create };
  window.addEventListener("storage", (e) => {
    if (e.key === key) {
      const p = current();
      if (p) {
        project(p);
        window.dispatchEvent(
          new CustomEvent("orbit:profile-change", {
            detail: { id: p.id, profile: p, external: true },
          }),
        );
      }
    }
  });
})();
