/* School-scoped UI preference only. Does not modify academic stores or year states. */
(() => {
  "use strict";
  const prefix = "orbit.workspace.academic-year.v1:";
  function list() { return OrbitSchoolYears.read(); }
  const storageKey = (schoolId = list().schoolId) => prefix + encodeURIComponent(schoolId);
  function read(requested) {
    const db = list();
    let saved = null;
    try { const value = JSON.parse(localStorage.getItem(storageKey(db.schoolId)) || "null"); if (value?.schema === 1 && value.schoolId === db.schoolId) saved = value.academicYearId; } catch { /* Invalid preference falls back without touching records. */ }
    const explicit = requested !== undefined;
    const candidate = explicit ? requested : saved;
    const selectedYear = db.years.find(y => y.id === candidate) || db.years.find(y => y.id === db.activeYearId) || null;
    return { schoolId: db.schoolId, years: db.years, selectedYear, activeYearId: db.activeYearId, recovered: !!candidate && candidate !== selectedYear?.id };
  }
  function select(academicYearId) {
    const db = list();
    if (!db.years.some(y => y.id === academicYearId)) throw Error("YEAR_NOT_FOUND");
    try { localStorage.setItem(storageKey(db.schoolId), JSON.stringify({ schema: 1, schoolId: db.schoolId, academicYearId })); } catch { throw Error("STORAGE_FAILED"); }
    return read();
  }
  function clear() { try { localStorage.removeItem(storageKey()); } catch { throw Error("STORAGE_FAILED"); } }
  // Re-read at submission time as another tab can change the year or preference.
  function readOnly() { try { return read().selectedYear?.status === "archived"; } catch { return true; } }
  window.OrbitSchoolYearContext = { read, select, clear, readOnly, storageKey, prefix };
})();
