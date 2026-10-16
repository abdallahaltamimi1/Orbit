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
    if (["suspended", "deleted"].includes(account?.status || state?.status)) {
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
})();
