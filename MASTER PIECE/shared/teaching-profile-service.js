/* Student-facing educational projection. Recruitment portfolio access stays separate. */
(() => {
  "use strict";
  function read(teacherId) {
    const user = OrbitAuth.current();
    if (user?.role !== "student" || !user.email) throw Error("ROLE_DENIED");
    if (typeof teacherId !== "string" || !teacherId.trim()) return null;
    const canonical = OrbitProfiles.canonical;
    const channels = OrbitChannels.channels().filter((c) =>
      canonical(c.teacher) === canonical(teacherId) &&
      !c.deleted && c.moderationStatus !== "hidden" && OrbitChannels.canRead(c),
    );
    if (!channels.length) return null;
    // Whitelist fields: no CV, contact details, application snapshots, code, roster or posts.
    const displayName = ORBIT.teacher(teacherId);
    return {
      name: [teacherId, canonical(teacherId)].includes(displayName) ? ORBIT.t("Teacher", "معلم") : displayName,
      subjects: [...new Set(channels.map((c) => c.subject).filter((s) => typeof s === "string" && s.trim()))],
      channels: channels.map((c) => ({
        id: c.id, en: c.en || "", ar: c.ar || "",
        descEn: c.descEn || "", descAr: c.descAr || "", private: !!c.private,
      })),
    };
  }
  function list() {
    if (OrbitAuth.current()?.role !== "student") throw Error("ROLE_DENIED");
    const ids = [...new Set(OrbitChannels.channels().map((c) => OrbitProfiles.canonical(c.teacher)))];
    return ids.filter((id) => typeof id === "string" && id.trim()).flatMap((id) => {
      const profile = read(id);
      return profile ? [{ id, ...profile }] : [];
    });
  }
  window.OrbitTeachingProfiles = { read, list };
})();
