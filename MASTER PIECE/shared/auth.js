(() => {
  "use strict";
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
      if (u && ["suspended", "deleted"].includes(account?.status || state?.status)) {
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
    if (["suspended", "deleted"].includes(account?.status || state?.status))
      throw Error("ACCOUNT_INACTIVE");
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
  window.OrbitAuth = {
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
