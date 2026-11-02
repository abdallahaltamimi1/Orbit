/* School-scoped browser demo only; no enrollment or historical-record migration. */
(() => {
  "use strict";
  const prefix = "orbit.school.years.demo.v1:";
  const fail = (code) => { throw Error(code); };
  const norm = (s) => s.normalize("NFKC").trim().toLocaleLowerCase();
  function school() {
    const user = window.OrbitAuth?.current();
    if (user?.role !== "school" || !user.email?.trim()) fail("ROLE_DENIED");
    return user.email;
  }
  const storageKey = (id = school()) => prefix + encodeURIComponent(id);
  const date = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && s.slice(0, 4) !== "0000" && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  function fields(row) {
    if (typeof row.name !== "string" || !row.name.trim() || row.name.trim().length > 100) fail("INVALID_FIELDS");
    if (!date(row.startDate) || !date(row.endDate) || row.endDate <= row.startDate) fail("INVALID_DATES");
  }
  function validate(db, schoolId) {
    if (!db || db.schema !== 1 || db.schoolId !== schoolId || !Number.isInteger(db.revision) || db.revision < 0 || !Array.isArray(db.years)) fail("INVALID_DATA");
    const ids = new Set(), names = new Set();
    for (const row of db.years) {
      if (!row || row.schoolId !== schoolId || typeof row.id !== "string" || !row.id || ids.has(row.id) || !["upcoming", "active", "archived"].includes(row.status)) fail("INVALID_DATA");
      fields(row);
      if (names.has(norm(row.name))) fail("DUPLICATE_YEAR");
      if (![row.createdAt, row.updatedAt].every((v) => typeof v === "string" && Number.isFinite(Date.parse(v)))) fail("INVALID_DATA");
      ids.add(row.id); names.add(norm(row.name));
    }
    const live = db.years.filter((r) => r.status !== "archived");
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      if (live[i].startDate <= live[j].endDate && live[j].startDate <= live[i].endDate) fail("OVERLAPPING_YEARS");
    }
    const active = db.years.filter((r) => r.status === "active");
    if (active.length > 1 || db.activeYearId !== (active[0]?.id || null)) fail("INVALID_DATA");
    return db;
  }
  function read() {
    const schoolId = school();
    let raw;
    try { raw = localStorage.getItem(storageKey(schoolId)); } catch { fail("STORAGE_FAILED"); }
    if (raw === null) return { schema: 1, schoolId, revision: 0, activeYearId: null, years: [] };
    let db;
    try { db = JSON.parse(raw); } catch { fail("INVALID_DATA"); }
    return validate(db, schoolId);
  }
  function change(context, operation) {
    const db = read();
    if (context?.schoolId !== db.schoolId) fail("SCHOOL_CHANGED");
    if (context.revision !== db.revision) fail("STALE_DATA");
    const result = operation(db);
    db.revision++;
    validate(db, db.schoolId);
    try { localStorage.setItem(storageKey(db.schoolId), JSON.stringify(db)); } catch { fail("STORAGE_FAILED"); }
    window.dispatchEvent(new Event("orbit:school-years-change"));
    return result;
  }
  const find = (db, id) => db.years.find((r) => r.id === id) || fail("NOT_FOUND");
  function save(id, values, context, confirmed = false) {
    return change(context, (db) => {
      const old = id ? find(db, id) : null;
      if (old?.status === "archived") fail("ARCHIVED_RECORD");
      const input = { name: values.name, startDate: values.startDate, endDate: values.endDate };
      fields(input);
      input.name = input.name.trim();
      if (old?.status === "active") {
        if (input.name !== old.name) fail("ACTIVE_NAME_READONLY");
        if ((input.startDate !== old.startDate || input.endDate !== old.endDate) && confirmed !== true) fail("CONFIRMATION_REQUIRED");
      }
      const now = new Date().toISOString();
      const row = { id: old?.id || crypto.randomUUID(), schoolId: db.schoolId, ...input, status: old?.status || "upcoming", createdAt: old?.createdAt || now, updatedAt: now };
      db.years = old ? db.years.map((r) => r.id === id ? row : r) : [...db.years, row];
      return row;
    });
  }
  function activate(id, context, confirmed = false) {
    return change(context, (db) => {
      const row = find(db, id);
      if (row.status !== "upcoming") fail("INVALID_TRANSITION");
      if (confirmed !== true) fail("CONFIRMATION_REQUIRED");
      const now = new Date().toISOString();
      for (const year of db.years) if (year.status === "active") { year.status = "archived"; year.updatedAt = now; }
      row.status = "active"; row.updatedAt = now;
      db.activeYearId = row.id;
      return row;
    });
  }
  window.OrbitSchoolYears = { read, save, activate, storageKey, prefix };
})();
