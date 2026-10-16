(() => {
  "use strict";
  const A = OrbitAuth,
    u = A.current(),
    here = location.pathname,
    publicPage =
      /\/(hompage|login|school-login|registration|school-registration|pricing|lessons|lesson|lab|car-lab|channels|channel|teacher-directory|teacher-profile|lesson-planner|exchange)\//.test(
        here,
      );
  if (publicPage) return;
  if (u?.role === "admin") {
    location.replace("../admin/admin.html");
    return;
  }
  const roleHome = (role) =>
    "../" +
    (role === "teacher"
      ? "teacher-dashboard"
      : role === "school"
        ? "school-dashboard"
        : "student-dashboard") +
    "/" +
    (role === "teacher"
      ? "teacher-dashboard"
      : role === "school"
        ? "school-dashboard"
        : "student-dashboard") +
    ".html";
  if (!u?.email || !["student", "teacher", "school"].includes(u.role)) {
    location.replace(
      "../login/login.html?next=" + encodeURIComponent(location.pathname + location.search),
    );
    return;
  }
  const teacherOnly =
      /\/(teacher-dashboard|teacher-studio|lesson-planner|jobs|applications)\//.test(here),
    studentOnly =
      /\/(student-dashboard|school-tour|student-profile|exchange|achievements|quiz|result|practice)\//.test(
        here,
      ),
    schoolOnly = here.includes("/school-dashboard/");
  if (
    (teacherOnly && u.role !== "teacher") ||
    (studentOnly && u.role !== "student") ||
    (schoolOnly && u.role !== "school") ||
    (here.includes("/notifications/") && u.role === "student")
  ) {
    location.replace(roleHome(u.role));
    return;
  }
  const p = A.get("orbit.student.v1", {});
  p.mood = localStorage.getItem("orbit.motion.preference") || "fun";
  A.set("orbit.student.v1", p);
  localStorage.setItem("orbitMood", p.mood);
  const db = A.get("orbit.channels.v2", {});
  db.role = u.role;
  db.joined = A.get("orbit.memberships.v3", {})[u.email] || [];
  A.set("orbit.channels.v2", db);
  document.addEventListener("DOMContentLoaded", () => {
    document.body.dataset.theme = p.theme || "light";
    document.body.dataset.mood = p.mood;
    document
      .querySelectorAll('.demo-role,.student-preview,[data-action="student-view"]')
      .forEach((el) => el.remove());
  });
})();
