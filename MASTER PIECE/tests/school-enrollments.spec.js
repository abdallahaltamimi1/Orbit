import { test, expect } from "@playwright/test";
import path from "node:path";

// Each Playwright test owns a fresh browser context. No ORBIT page or saved profile is loaded.
async function setup(page) {
  await page.route("**/__phase3a__", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body>Isolated enrollment service fixture</body></html>" }));
  await page.goto("/__phase3a__");
  await page.evaluate(() => {
    window.actor = { role: "school", email: "a@school.test" };
    window.OrbitAuth = { current: () => window.actor };
    const stamp = "2026-11-02T00:00:00.000Z";
    for (const schoolId of ["a@school.test", "b@school.test"]) {
      const row = (r) => ({ schoolId, ...r });
      localStorage.setItem("orbit.school.academics.demo.v1:" + encodeURIComponent(schoolId), JSON.stringify({ schema: 1, schoolId, revision: 0,
        students: [row({ id: "s1", name: "Roster One", studentCode: "S1", status: "enrolled", classId: "c1" }), row({ id: "s2", name: "Roster Two", studentCode: "S2", status: "enrolled", classId: null })],
        classes: [row({ id: "c1", grade: "7", section: "A", academicYear: "2030-2031", status: "active" }), row({ id: "c2", grade: "7", section: "B", academicYear: "2031-2032", status: "active" })], teachers: [], subjects: [], allocations: [] }));
      localStorage.setItem("orbit.school.years.demo.v1:" + encodeURIComponent(schoolId), JSON.stringify({ schema: 1, schoolId, revision: 0, activeYearId: "y1", years: [
        row({ id: "y0", name: "Archived", startDate: "2029-09-01", endDate: "2030-06-30", status: "archived", createdAt: stamp, updatedAt: stamp }),
        row({ id: "y1", name: "Current", startDate: "2030-09-01", endDate: "2031-06-30", status: "active", createdAt: stamp, updatedAt: stamp }),
        row({ id: "y2", name: "Upcoming", startDate: "2031-09-01", endDate: "2032-06-30", status: "upcoming", createdAt: stamp, updatedAt: stamp }),
      ] }));
    }
    localStorage.setItem("orbit.recruitment.v1", JSON.stringify({ accounts: [{ email: "one@student.test", role: "student", status: "active" }, { email: "two@student.test", role: "student", status: "active" }, { email: "teacher@test.test", role: "teacher", status: "active" }, { email: "inactive@test.test", role: "student", status: "suspended" }] }));
    for (const key of ["orbitUser", "orbit.profiles.v1", "orbit.channels.v2", "orbit.assignments.v1", "orbit.memberships.v3", "orbit.school.members.v1", "orbit.subscriptions.v1", "orbit.school.education.links.v1:a%40school.test"]) localStorage.setItem(key, JSON.stringify({ sentinel: key }));
  });
  for (const file of ["school-academic-service.js", "school-year-service.js", "school-enrollment-service.js"]) await page.addScriptTag({ path: path.resolve("shared", file) });
  await page.evaluate(() => {
    window.E = OrbitSchoolEnrollments;
    window.ctx = () => E.read().context;
    window.op = () => crypto.randomUUID();
    window.attempt = (fn) => { try { fn(); return "ACCEPTED"; } catch (e) { return e.message; } };
    window.snapshot = () => Object.keys(localStorage).sort().filter((k) => !k.startsWith(E.prefix) && !k.startsWith(E.mappingPrefix)).map((k) => [k, localStorage.getItem(k)]);
    window.review = (student = "s1", account = "one@student.test") => {
      const m = E.requestMapping(student, ctx(), op());
      return E.confirmMapping(m.id, account, ctx(), op(), true);
    };
    window.bind = (classId = "c1", yearId = "y1") => E.confirmClassYear(classId, yearId, ctx(), op(), true);
    window.enroll = (student = "s1", year = "y1", classroom = "c1") => E.enroll({ academicStudentId: student, academicYearId: year, classId: classroom }, ctx(), op(), true);
  });
}
test.beforeEach(async ({ page }) => setup(page));

test("explicit reviews are required; upcoming enrollment is isolated and never grants access", async ({ page }) => {
  const r = await page.evaluate(() => {
    const before = snapshot(), keysBefore = Object.keys(localStorage).sort();
    E.read(); E.readMappings();
    const readsDoNotWrite = JSON.stringify(keysBefore) === JSON.stringify(Object.keys(localStorage).sort());
    const unresolved = attempt(() => enroll("s1", "y2", "c2"));
    const pending = E.requestMapping("s1", ctx(), op());
    const confirmation = attempt(() => E.confirmMapping(pending.id, "one@student.test", ctx(), op()));
    const invalid = ["missing@test.test", "teacher@test.test", "inactive@test.test"].map((a) => attempt(() => E.confirmMapping(pending.id, a, ctx(), op(), true)));
    E.confirmMapping(pending.id, "one@student.test", ctx(), op(), true);
    const unbound = attempt(() => enroll("s1", "y2", "c2"));
    const classConfirmation = attempt(() => E.confirmClassYear("c2", "y2", ctx(), op()));
    bind("c2", "y2");
    const enrollment = enroll("s1", "y2", "c2"), db = E.read();
    return { before, after: snapshot(), readsDoNotWrite, unresolved, pending, confirmation, invalid, unbound, classConfirmation, enrollment, db, capabilities: E.capabilities };
  });
  expect(r.before).toEqual(r.after);
  expect(r.readsDoNotWrite).toBe(true);
  expect(r.unresolved).toBe("UNRESOLVED_IDENTITY");
  expect(r.pending).toMatchObject({ status: "pending", accountId: null });
  expect(r.confirmation).toBe("CONFIRMATION_REQUIRED");
  expect(r.invalid).toEqual(["INVALID_ACCOUNT", "INVALID_ACCOUNT", "INVALID_ACCOUNT"]);
  expect(r.unbound).toBe("UNRESOLVED_CLASS_YEAR");
  expect(r.classConfirmation).toBe("CONFIRMATION_REQUIRED");
  expect(r.enrollment).toMatchObject({ academicYearId: "y2", accountId: "one@student.test", status: "enrolled", educationalAccess: false, revision: 1 });
  expect(r.db.placements).toHaveLength(1);
  expect(r.db.placements[0]).toMatchObject({ id: r.enrollment.currentPlacementId, enrollmentId: r.enrollment.id, gradeSnapshot: "7", sectionSnapshot: "B", previousPlacementId: null, actorId: "a@school.test" });
  expect(r.capabilities).toMatchObject({ educationalAccess: false, transfers: 'year-scoped-sections-only', mappingCorrections: true });
});

test("duplicate enrollment and conflicting identity mappings are rejected", async ({ page }) => {
  const r = await page.evaluate(() => {
    review(); bind(); const first = enroll(), before = localStorage.getItem(E.storageKey());
    const duplicate = attempt(() => enroll());
    const duplicateMapping = attempt(() => E.requestMapping("s1", ctx(), op()));
    const pending = E.requestMapping("s2", ctx(), op());
    const conflict = attempt(() => E.confirmMapping(pending.id, "one@student.test", ctx(), op(), true));
    const db = E.read(); db.placements[0].gradeSnapshot = "tampered";
    return { first, duplicate, duplicateMapping, conflict, unchanged: localStorage.getItem(E.storageKey()) === before, placements: E.read().placements, mappings: E.readMappings().mappings };
  });
  expect(r).toMatchObject({ duplicate: "DUPLICATE_ENROLLMENT", duplicateMapping: "DUPLICATE_MAPPING", conflict: "CONFLICTING_MAPPING", unchanged: true });
  expect(r.placements).toHaveLength(1);
  expect(r.placements[0].gradeSnapshot).toBe("7");
  expect(r.mappings[1].status).toBe("pending");
});

test("new-year enrollment preserves previous enrollment and placement; archived years reject writes", async ({ page }) => {
  const r = await page.evaluate(() => {
    review(); bind(); const first = enroll(), placement = E.read().placements[0];
    OrbitSchoolYears.activate("y2", OrbitSchoolYears.read(), true);
    const before = snapshot(); bind("c2", "y2"); const next = enroll("s1", "y2", "c2");
    const archivedEnrollment = attempt(() => enroll());
    const archivedBinding = attempt(() => E.confirmClassYear("c1", "y1", ctx(), op(), true));
    return { first, placement, next, archivedEnrollment, archivedBinding, db: E.read(), protectedStores: JSON.stringify(before) === JSON.stringify(snapshot()), transfer: typeof E.transfer, schema: E.transferEventSchema };
  });
  expect(r.next.id).not.toBe(r.first.id);
  expect(r.db.enrollments).toEqual([r.first, r.next]);
  expect(r.db.placements[0]).toEqual(r.placement);
  expect(r.db.placements).toHaveLength(2);
  expect(r.next.currentPlacementId).not.toBe(r.first.currentPlacementId);
  expect(r.archivedEnrollment).toBe("ARCHIVED_YEAR");
  expect(r.archivedBinding).toBe("ARCHIVED_YEAR");
  expect(r.protectedStores).toBe(true);
  expect(r.transfer).toBe("undefined");
  expect(r.schema).toMatchObject({ executable: true, required: expect.arrayContaining(["sourcePlacementId", "destinationPlacementId", "reason", "confirmedAt", "actorId", "operationId"]) });
  expect(r.db.transfers).toEqual([]);
});

test("mapping correction requires review and preserves previous authority in its audit history", async ({ page }) => {
  const r = await page.evaluate(() => {
    const m = review(), before = JSON.stringify(E.readMappings()), legacy = snapshot();
    const unconfirmed = attempt(() => E.correctMapping(m.id, "two@student.test", "Correction", ctx(), op()));
    const reason = attempt(() => E.correctMapping(m.id, "two@student.test", "", ctx(), op(), true));
    const disabled = attempt(() => E.correctMapping(m.id, "two@student.test", "Reviewed correction", ctx(), op(), true));
    const reconfirm = attempt(() => E.confirmMapping(m.id, "two@student.test", ctx(), op(), true));
    return { unconfirmed, reason, disabled, reconfirm, unchanged: before === JSON.stringify(E.readMappings()), history: E.readMappings().history, authoritative: E.readMappings().mappings[0].accountId, legacy: JSON.stringify(legacy) === JSON.stringify(snapshot()), schema: E.correctionEventSchema };
  });
  expect(r).toMatchObject({ unconfirmed: "CONFIRMATION_REQUIRED", reason: "REASON_REQUIRED", reconfirm: "MAPPING_CORRECTION_DISABLED", unchanged: false, authoritative: "two@student.test", legacy: true });
  expect(r.history.map((h) => h.type)).toEqual(["requested", "confirmed", "corrected"]);
  expect(r.schema).toMatchObject({ executable: true, required: expect.arrayContaining(["fromAccountId", "toAccountId", "reason", "confirmedAt"]) });
});

test("revision conflicts and idempotent retries never duplicate records", async ({ page }) => {
  const r = await page.evaluate(() => {
    const stale = ctx(), operationId = op();
    const m = E.requestMapping("s1", stale, operationId), saved = localStorage.getItem(E.mappingKey());
    const retry = E.requestMapping("s1", stale, operationId);
    const retryUnchanged = saved === localStorage.getItem(E.mappingKey());
    const reused = attempt(() => E.requestMapping("s2", stale, operationId));
    const conflict = attempt(() => E.requestMapping("s2", stale, op()));
    E.confirmMapping(m.id, "one@student.test", ctx(), op(), true); bind();
    const context = ctx(), enrollmentOp = op(), values = { academicStudentId: "s1", academicYearId: "y1", classId: "c1" };
    const enrollment = E.enroll(values, context, enrollmentOp, true), before = localStorage.getItem(E.storageKey());
    const enrollmentRetry = E.enroll(values, context, enrollmentOp, true);
    return { m, retry, retryUnchanged, reused, conflict, enrollment, enrollmentRetry, unchanged: before === localStorage.getItem(E.storageKey()), count: E.read().enrollments.length };
  });
  expect(r.retry).toEqual(r.m);
  expect(r).toMatchObject({ retryUnchanged: true, reused: "OPERATION_CONFLICT", conflict: "STALE_DATA", unchanged: true, count: 1 });
  expect(r.enrollmentRetry).toEqual(r.enrollment);
});

test("guest, Student, Teacher and changed-school direct mutations cannot write", async ({ page }) => {
  const r = await page.evaluate(() => {
    review(); bind(); const expected = ctx(), before = Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)]);
    const errors = [];
    for (const role of [null, "student", "teacher"]) {
      window.actor = role ? { role, email: "one@student.test" } : null;
      for (const action of [() => E.requestMapping("s2", expected, op()), () => E.confirmMapping("id", "one@student.test", expected, op(), true), () => E.confirmClassYear("c1", "y1", expected, op(), true), () => E.enroll({ academicStudentId: "s1", academicYearId: "y1", classId: "c1" }, expected, op(), true), () => E.correctMapping("id", "two@student.test", "reason", expected, op(), true)]) errors.push(attempt(action));
    }
    window.actor = { role: "school", email: "b@school.test" };
    const wrongSchool = attempt(() => E.enroll({ academicStudentId: "s1", academicYearId: "y1", classId: "c1" }, expected, op(), true));
    return { errors, wrongSchool, untouched: JSON.stringify(before) === JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])) };
  });
  expect(r.errors).toEqual(Array(15).fill("ROLE_DENIED"));
  expect(r.wrongSchool).toBe("SCHOOL_CHANGED");
  expect(r.untouched).toBe(true);
});

test("class/year links are explicit and stale legacy labels cannot be silently rebound", async ({ page }) => {
  const r = await page.evaluate(() => {
    const before = snapshot(); review();
    const unresolved = attempt(() => enroll());
    const missingYear = attempt(() => bind("c1", "unknown"));
    const missingStudent = attempt(() => review("unknown", "two@student.test"));
    bind();
    const wrongYear = attempt(() => enroll("s1", "y2", "c1"));
    const rebinding = attempt(() => bind("c1", "y2"));
    const noLegacyWrites = JSON.stringify(before) === JSON.stringify(snapshot());
    const key = OrbitSchoolAcademics.storageKey(), academic = OrbitSchoolAcademics.read();
    academic.classes[0].grade = "8"; academic.revision++;
    localStorage.setItem(key, JSON.stringify(academic));
    const changed = attempt(() => enroll());
    return { unresolved, missingYear, missingStudent, wrongYear, rebinding, noLegacyWrites, changed, count: E.read().enrollments.length };
  });
  expect(r).toEqual({ unresolved: "UNRESOLVED_CLASS_YEAR", missingYear: "YEAR_NOT_FOUND", missingStudent: "STUDENT_NOT_FOUND", wrongYear: "UNRESOLVED_CLASS_YEAR", rebinding: "CLASS_ALREADY_REVIEWED", noLegacyWrites: true, changed: "CLASS_BINDING_CHANGED", count: 0 });
});

test("same-origin cross-school conflicts are blocked without claiming global enforcement", async ({ page }) => {
  const r = await page.evaluate(() => {
    review(); bind(); enroll(); const firstKey = E.storageKey(), first = localStorage.getItem(firstKey);
    window.actor = { role: "school", email: "b@school.test" };
    review(); bind();
    const conflict = attempt(() => enroll());
    const none = E.read().enrollments.length;
    const years = OrbitSchoolYears.read(); years.years.find((y) => y.id === "y1").startDate = "2033-09-01"; years.years.find((y) => y.id === "y1").endDate = "2034-06-30"; years.revision++;
    localStorage.setItem(OrbitSchoolYears.storageKey(), JSON.stringify(years));
    const next = enroll();
    return { conflict, none, next, firstUnchanged: first === localStorage.getItem(firstKey), enforcement: E.capabilities.crossSchoolEnforcement };
  });
  expect(r.conflict).toBe("CROSS_SCHOOL_OVERLAP");
  expect(r.none).toBe(0);
  expect(r.firstUnchanged).toBe(true);
  expect(r.next.educationalAccess).toBe(false);
  expect(r.enforcement).toContain("not-guaranteed");
});

test("corrupt or missing data and failed writes never seed or replace legacy stores", async ({ page }) => {
  const r = await page.evaluate(() => {
    review(); bind(); const baseline = localStorage.getItem(E.storageKey());
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw Error("quota"); };
    const storage = attempt(() => enroll());
    Storage.prototype.setItem = set;
    const unchanged = baseline === localStorage.getItem(E.storageKey());
    localStorage.setItem(E.storageKey(), "broken");
    const corrupt = attempt(() => E.read()), retained = localStorage.getItem(E.storageKey()) === "broken";
    localStorage.setItem(E.storageKey(), baseline);
    localStorage.setItem(E.prefix + encodeURIComponent("other@school.test"), "broken");
    const crossSchool = attempt(() => enroll());
    localStorage.removeItem(OrbitSchoolAcademics.storageKey());
    const missing = attempt(() => E.read()), notSeeded = localStorage.getItem(OrbitSchoolAcademics.storageKey()) === null;
    return { storage, unchanged, corrupt, retained, crossSchool, missing, notSeeded };
  });
  expect(r).toEqual({ storage: "STORAGE_FAILED", unchanged: true, corrupt: "INVALID_DATA", retained: true, crossSchool: "CROSS_SCHOOL_UNVERIFIABLE", missing: "ACADEMIC_DATA_REQUIRED", notSeeded: true });
});

test("enrollment validates confirmation, live accounts, references and prerequisite revisions", async ({ page }) => {
  const r = await page.evaluate(() => {
    review(); bind();
    const values = { academicStudentId: "s1", academicYearId: "y1", classId: "c1" };
    const before = localStorage.getItem(E.storageKey());
    const confirmation = attempt(() => E.enroll(values, ctx(), op()));
    const missingYear = attempt(() => E.enroll({ ...values, academicYearId: "missing" }, ctx(), op(), true));
    const missingClass = attempt(() => E.enroll({ ...values, classId: "missing" }, ctx(), op(), true));
    const missingOperation = attempt(() => E.enroll(values, ctx(), "", true));
    const stale = ctx(), academic = OrbitSchoolAcademics.read(); academic.revision++;
    localStorage.setItem(OrbitSchoolAcademics.storageKey(), JSON.stringify(academic));
    const revision = attempt(() => E.enroll(values, stale, op(), true));
    const accounts = JSON.parse(localStorage.getItem("orbit.recruitment.v1")); accounts.accounts[0].status = "suspended";
    localStorage.setItem("orbit.recruitment.v1", JSON.stringify(accounts));
    const disabled = attempt(() => E.enroll(values, ctx(), op(), true));
    return { confirmation, missingYear, missingClass, missingOperation, revision, disabled, unchanged: before === localStorage.getItem(E.storageKey()) };
  });
  expect(r).toEqual({ confirmation: "CONFIRMATION_REQUIRED", missingYear: "YEAR_NOT_FOUND", missingClass: "INVALID_CLASS", missingOperation: "OPERATION_ID_REQUIRED", revision: "STALE_DATA", disabled: "INVALID_ACCOUNT", unchanged: true });
});

test("inconsistent current placements and injected transfer history fail closed", async ({ page }) => {
  const r = await page.evaluate(() => {
    review(); bind(); enroll();
    const key = E.storageKey(), original = JSON.parse(localStorage.getItem(key)), errors = [];
    const variants = [
      (db) => db.placements.push({ ...db.placements[0], id: crypto.randomUUID() }),
      (db) => { db.enrollments[0].currentPlacementId = "missing"; },
      (db) => db.enrollments.push({ ...db.enrollments[0], id: crypto.randomUUID() }),
      (db) => db.transfers.push({ id: crypto.randomUUID(), schoolId: db.schoolId }),
    ];
    const retained = [];
    for (const change of variants) {
      const db = structuredClone(original); change(db); const raw = JSON.stringify(db); localStorage.setItem(key, raw);
      errors.push(attempt(() => E.read())); retained.push(localStorage.getItem(key) === raw);
    }
    return { errors, retained };
  });
  expect(r.errors).toEqual(["INVALID_DATA", "INVALID_DATA", "INVALID_DATA", "INVALID_DATA"]);
  expect(r.retained).toEqual([true, true, true, true]);
});
