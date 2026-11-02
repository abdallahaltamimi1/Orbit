/* Browser-local school management scope; not a server authorization boundary. */
(() => {
  "use strict";
  function channels() {
    const user = window.OrbitAuth?.current();
    if (user?.role !== "school" || typeof user.email !== "string" || !user.email.trim())
      return [];
    const items = window.ORBIT?.channels?.() ||
      window.OrbitAuth.get("orbit.channels.v2", { channels: [] }).channels;
    if (!Array.isArray(items)) return [];
    return items.filter((channel) => channel && channel.schoolId === user.email);
  }
  window.OrbitSchool = { channels };
})();
