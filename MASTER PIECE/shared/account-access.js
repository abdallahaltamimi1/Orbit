(() => {
  const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  };
  function check() {
    const user = read("orbitUser", {});
    if (!user.email) return;
    const account = (read("orbit.recruitment.v1", {}).accounts || []).find(
        (a) => a.email === user.email,
      ),
      state = read("orbit.admin.v1", {}).accountStates?.[user.email];
    if (account?.mustChangePassword && !/\/(login|school-login)\//.test(location.pathname)) { localStorage.removeItem("orbitUser"); location.replace("../login/login.html?passwordChange=1"); return; }
    if ([account?.status,state?.status].some(s=>["suspended", "deleted"].includes(s))) {
      localStorage.removeItem("orbitUser");
      sessionStorage.removeItem("orbit.admin.session");
      if (
        !/\/(hompage|login|registration|school-login|school-registration|about)\//.test(
          location.pathname,
        )
      )
        location.replace("../login/login.html?inactive=1");
    }
  }
  check();
  window.addEventListener("storage", (e) => {
    if (["orbit.recruitment.v1", "orbit.admin.v1"].includes(e.key)) check();
  });
  window.addEventListener("pageshow", check);
  window.addEventListener("orbit:admin-change", check);
  // Drop already-rendered academic content when live year/identity authority changes.
  window.addEventListener('storage',e=>{
    const u=read('orbitUser',{});
    if(u.role==='student'&&(!e.key||['orbit.school.enrollments.demo.v1:','orbit.school.enrollment-identities.demo.v1:','orbit.school.years.demo.v1:','orbit.school.section-structures.demo.v1:'].some(p=>e.key.startsWith(p))))location.reload();
  });
})();
