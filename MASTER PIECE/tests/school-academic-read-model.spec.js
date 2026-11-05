import { test, expect } from "@playwright/test";
import path from "node:path";

async function setup(page) {
  await page.route("**/__academic_read_fixture__", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body>Isolated read-model fixture</body></html>" }));
  await page.goto("/__academic_read_fixture__");
  await page.evaluate(() => {
    const schoolId = "school@fixture.test", stamp = "2026-11-02T00:00:00.000Z", row = (v) => ({ schoolId, ...v });
    localStorage.setItem("orbitUser", JSON.stringify({ email: schoolId, role: "school", name: "Fixture School" }));
    localStorage.setItem("orbit.recruitment.v1", JSON.stringify({ accounts: [{ email: schoolId, role: "school", status: "active" }, { email: "one@student.test", role: "student", status: "active" }, { email: "other@student.test", role: "student", status: "active" }] }));
    localStorage.setItem("orbit.school.academics.demo.v1:" + encodeURIComponent(schoolId), JSON.stringify({ schema: 1, schoolId, revision: 0,
      students: [row({ id: "s1", name: "Same name", studentCode: "S1", status: "enrolled", classId: "c1" }), row({ id: "s2", name: "Same name", studentCode: "S2", status: "enrolled", classId: "c1" }), row({ id: "s3", name: "Unmapped", studentCode: "S3", status: "enrolled", classId: null })],
      classes: [row({ id: "c1", grade: "7", section: "A", academicYear: "2030-2031", status: "active" }), row({ id: "c2", grade: "8", section: "B", academicYear: "2031-2032", status: "active" }), row({ id: "c3", grade: "9", section: "C", academicYear: "2031-2032", status: "active" })], teachers: [], subjects: [], allocations: [] }));
    localStorage.setItem("orbit.school.years.demo.v1:" + encodeURIComponent(schoolId), JSON.stringify({ schema: 1, schoolId, revision: 0, activeYearId: "y1", years: [
      row({ id: "y0", name: "2029-2030", startDate: "2029-09-01", endDate: "2030-06-30", status: "archived", createdAt: stamp, updatedAt: stamp }),
      row({ id: "y1", name: "2030-2031", startDate: "2030-09-01", endDate: "2031-06-30", status: "active", createdAt: stamp, updatedAt: stamp }),
      row({ id: "y2", name: "2031-2032", startDate: "2031-09-01", endDate: "2032-06-30", status: "upcoming", createdAt: stamp, updatedAt: stamp }),
    ] }));
    for (const key of ["orbit.profiles.v1", "orbit.channels.v2", "orbit.assignments.v1", "orbit.memberships.v3", "orbit.school.members.v1", "orbit.subscriptions.v1", "orbit.school.education.links.v1:" + encodeURIComponent(schoolId)]) localStorage.setItem(key, JSON.stringify({ sentinel: key }));
  });
  for (const file of ["auth.js", "school-year-service.js", "school-academic-service.js", "school-enrollment-service.js", "school-academic-read-model.js"]) await page.addScriptTag({ path: path.resolve("shared", file) });
  await page.evaluate(() => {
    window.E = OrbitSchoolEnrollments; window.R = OrbitSchoolAcademicReadModel;
    window.op = () => crypto.randomUUID(); window.ctx = () => E.read().context;
    window.snapshot = () => Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)]);
    window.attempt = (fn) => { try { fn(); return "ACCEPTED"; } catch (e) { return e.message; } };
    window.prepare = () => {
      const m = E.requestMapping("s1", ctx(), op()); E.confirmMapping(m.id, "one@student.test", ctx(), op(), true);
      E.requestMapping("s2", ctx(), op());
      for (const [classId, academicYearId] of [["c1", "y1"], ["c2", "y2"]]) {
        E.confirmClassYear(classId, academicYearId, ctx(), op(), true);
        E.enroll({ academicStudentId: "s1", academicYearId, classId }, ctx(), op(), true);
      }
    };
  });
}
test.beforeEach(async ({ page }) => setup(page));

test("explicit year filtering returns independent annual placement snapshots without access", async ({ page }) => {
  const r = await page.evaluate(() => {
    prepare(); const before = snapshot();
    return { years: R.availableYears(), first: R.read("y1"), next: R.read("y2"), empty: R.read("y0"), untouched: JSON.stringify(before) === JSON.stringify(snapshot()) };
  });
  expect(r.years.years.map((y) => y.id)).toEqual(["y0", "y1", "y2"]);
  expect(r.first.enrollments).toHaveLength(1);
  expect(r.next.enrollments).toHaveLength(1);
  expect(r.first.enrollments[0].id).not.toBe(r.next.enrollments[0].id);
  expect(r.first.enrollments[0]).toMatchObject({ verification: "verified", academicYearId: "y1", currentPlacement: { gradeSnapshot: "7", sectionSnapshot: "A" }, educationalAccess: false });
  expect(r.next).toMatchObject({ selectedYear: { id: "y2", status: "upcoming" }, educationalAccess: false });
  expect(r.next.enrollments[0]).toMatchObject({ verification: "verified", currentPlacement: { gradeSnapshot: "8", sectionSnapshot: "B" }, educationalAccess: false });
  expect(r.first.classes.map((c) => c.classId)).toEqual(["c1"]);
  expect(r.next.classes.map((c) => c.classId)).toEqual(["c2"]);
  expect(r.empty.enrollments).toEqual([]);
  expect(r.untouched).toBe(true);
});

test("legacy-only students, pending identities and unreviewed class years remain unresolved", async ({ page }) => {
  const r = await page.evaluate(() => { prepare(); const before = snapshot(); return { model: R.read("y1"), untouched: JSON.stringify(before) === JSON.stringify(snapshot()) }; });
  expect(r.model.studentsWithoutEnrollment.map((s) => s.academicStudentId)).toEqual(["s2", "s3"]);
  expect(r.model.students.find((s) => s.academicStudentId === "s2")).toMatchObject({ recordType: "legacy-roster-only", verification: "not-enrolled", identity: { status: "pending", accountId: null }, currentPlacement: null, legacyStudent: { id: "s2", classId: "c1" } });
  expect(r.model.students.find((s) => s.academicStudentId === "s3")).toMatchObject({ identity: { status: "unresolved", accountId: null }, currentPlacement: null });
  expect(r.model.unresolvedIdentities.map((s) => s.academicStudentId)).toEqual(["s2", "s3"]);
  expect(r.model.unresolvedClasses).toEqual([expect.objectContaining({ classId: "c3", academicYearId: null, relationship: "unresolved" })]);
  expect(r.untouched).toBe(true);
});

test("archived snapshots survive changed legacy labels; active label drift is flagged", async ({ page }) => {
  const r = await page.evaluate(() => {
    prepare();
    const academic = OrbitSchoolAcademics.read(); academic.classes[0].grade = "10"; academic.classes[0].section = "Z"; academic.revision++;
    localStorage.setItem(OrbitSchoolAcademics.storageKey(), JSON.stringify(academic));
    const active = R.read("y1");
    OrbitSchoolYears.activate("y2", OrbitSchoolYears.read(), true);
    const before = snapshot(), archived = R.read("y1");
    return { active, archived, untouched: JSON.stringify(before) === JSON.stringify(snapshot()) };
  });
  expect(r.active.enrollments[0]).toMatchObject({ verification: "unresolved", issues: ["LEGACY_CLASS_LABELS_CHANGED"], currentPlacement: { gradeSnapshot: "7", sectionSnapshot: "A" } });
  expect(r.archived).toMatchObject({ selectedYear: { status: "archived" } });
  expect(r.archived.enrollments[0]).toMatchObject({ verification: "verified", issues: [], warnings: ["LEGACY_CLASS_LABELS_CHANGED"], currentPlacement: { gradeSnapshot: "7", sectionSnapshot: "A" } });
  expect(r.untouched).toBe(true);
});

test("missing and inconsistent cross-store identities are diagnostic and never repaired", async ({ page }) => {
  const r = await page.evaluate(() => {
    prepare();
    const key = E.mappingKey(), mappings = JSON.parse(localStorage.getItem(key)), confirmed = mappings.mappings.find((m) => m.status === "confirmed");
    confirmed.accountId = "other@student.test";
    mappings.history.find((h) => h.mappingId === confirmed.id && h.type === "confirmed").toAccountId = "other@student.test";
    localStorage.setItem(key, JSON.stringify(mappings));
    const mismatch = R.read("y1");
    const academic = OrbitSchoolAcademics.read(); academic.students = academic.students.filter((s) => s.id !== "s1"); academic.classes = academic.classes.filter((c) => c.id !== "c1"); academic.revision++;
    localStorage.setItem(OrbitSchoolAcademics.storageKey(), JSON.stringify(academic));
    const before = snapshot(), missing = R.read("y1");
    return { mismatch, missing, untouched: JSON.stringify(before) === JSON.stringify(snapshot()) };
  });
  expect(r.mismatch.enrollments[0]).toMatchObject({ verification: "unresolved", issues: ["IDENTITY_MAPPING_MISMATCH"] });
  expect(r.mismatch.unresolvedIdentities).toContainEqual(expect.objectContaining({ academicStudentId: "s1", identity: expect.objectContaining({ status: "confirmed", enrollmentMatch: false }) }));
  expect(r.missing.enrollments[0].issues).toEqual(expect.arrayContaining(["ROSTER_STUDENT_MISSING", "CLASS_RECORD_MISSING"]));
  expect(r.missing.students.find((s) => s.academicStudentId === "s1")).toMatchObject({ name: null, legacyStudent: null, verification: "unresolved" });
  expect(r.missing.diagnostics).toContainEqual(expect.objectContaining({ code: "MAPPING_ROSTER_MISSING" }));
  expect(r.untouched).toBe(true);
});

test("structurally invalid placement and class/year references fail without rewriting", async ({ page }) => {
  const r = await page.evaluate(() => {
    prepare(); const key = E.storageKey(), original = JSON.parse(localStorage.getItem(key)), errors = [], retained = [];
    for (const change of [(db) => { db.classYearLinks = []; }, (db) => { db.enrollments[0].currentPlacementId = "missing"; }, (db) => { db.placements.push({ ...db.placements[0], id: crypto.randomUUID() }); }]) {
      const db = structuredClone(original); change(db); const raw = JSON.stringify(db); localStorage.setItem(key, raw);
      errors.push(attempt(() => R.read("y1"))); retained.push(localStorage.getItem(key) === raw);
    }
    return { errors, retained };
  });
  expect(r.errors).toEqual(Array(3).fill("INVALID_FOUNDATION_DATA"));
  expect(r.retained).toEqual(Array(3).fill(true));
});

test("defensive copies cannot modify future models, stored placements or year selection", async ({ page }) => {
  const r = await page.evaluate(() => {
    prepare(); const before = snapshot(), model = R.read("y1"), years = R.availableYears();
    model.students[0].legacyStudent.classId = "changed"; model.enrollments[0].currentPlacement.gradeSnapshot = "tampered";
    model.selectedYear.name = "tampered"; model.classes[0].legacyClass.section = "tampered"; model.students.length = 0;
    years.years[0].name = "tampered";
    const fresh = R.read("y1"), upcoming = R.read("y2");
    return { fresh, upcoming, years: R.availableYears(), untouched: JSON.stringify(before) === JSON.stringify(snapshot()) };
  });
  expect(r.fresh.students[0].legacyStudent.classId).toBe("c1");
  expect(r.fresh.enrollments[0].currentPlacement.gradeSnapshot).toBe("7");
  expect(r.fresh.classes[0].legacyClass.section).toBe("A");
  expect(r.fresh.selectedYear.name).toBe("2030-2031");
  expect(r.upcoming.selectedYear.id).toBe("y2");
  expect(r.years.years[0].name).toBe("2029-2030");
  expect(r.untouched).toBe(true);
});

test("no enrollment or mapping stores are initialized, even when mutation methods are forbidden", async ({ page }) => {
  const r = await page.evaluate(() => {
    const before = snapshot(), writes = [];
    for (const name of ["setItem", "removeItem", "clear"]) Storage.prototype[name] = () => { writes.push(name); throw Error("FORBIDDEN_WRITE"); };
    OrbitAuth.current = () => { throw Error("MUTATING_AUTH_READER_FORBIDDEN"); };
    OrbitSchoolAcademics.read = () => { throw Error("SEEDING_READER_FORBIDDEN"); };
    OrbitSchoolYears.read = () => { throw Error("SERVICE_READER_FORBIDDEN"); };
    const years = R.availableYears(), model = R.read("y1");
    return { writes, years, model, untouched: JSON.stringify(before) === JSON.stringify(snapshot()) };
  });
  expect(r.writes).toEqual([]);
  expect(r.model.enrollments).toEqual([]);
  expect(r.model.studentsWithoutEnrollment).toHaveLength(3);
  expect(r.model.unresolvedClasses).toHaveLength(3);
  expect(r.model.unresolvedIdentities).toHaveLength(3);
  expect(r.untouched).toBe(true);
});

test("missing/invalid years and missing stores fail safely without seeding", async ({ page }) => {
  const r = await page.evaluate(() => {
    const before = snapshot(), errors = [undefined, null, "", 1, " y1", "unknown"].map((v) => attempt(() => R.read(v)));
    const untouched = JSON.stringify(before) === JSON.stringify(snapshot());
    const academicKey = OrbitSchoolAcademics.storageKey(); localStorage.removeItem(academicKey);
    const missingAcademic = attempt(() => R.read("y1"));
    const notSeeded = localStorage.getItem(academicKey) === null;
    localStorage.removeItem(OrbitSchoolYears.storageKey());
    const emptyYears = R.availableYears();
    return { errors, untouched, missingAcademic, notSeeded, emptyYears, missingYear: attempt(() => R.read("y1")) };
  });
  expect(r.errors).toEqual([...Array(5).fill("YEAR_ID_REQUIRED"), "YEAR_NOT_FOUND"]);
  expect(r).toMatchObject({ untouched: true, missingAcademic: "ACADEMIC_DATA_REQUIRED", notSeeded: true, missingYear: "YEAR_NOT_FOUND" });
  expect(r.emptyYears.years).toEqual([]);
});

test("missing historical year references are diagnostic rather than silently reassigned", async ({ page }) => {
  const r = await page.evaluate(() => {
    prepare(); const key = OrbitSchoolYears.storageKey(), years = OrbitSchoolYears.read();
    years.years = years.years.filter((y) => y.id !== "y1"); years.activeYearId = null; years.revision++;
    localStorage.setItem(key, JSON.stringify(years)); const before = snapshot();
    return { model: R.read("y2"), removed: attempt(() => R.read("y1")), untouched: JSON.stringify(before) === JSON.stringify(snapshot()) };
  });
  expect(r.model.enrollments).toHaveLength(1);
  expect(r.model.diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(["ENROLLMENT_YEAR_MISSING", "CLASS_LINK_YEAR_MISSING"]));
  expect(r.removed).toBe("YEAR_NOT_FOUND");
  expect(r.untouched).toBe(true);
});

test("role denial and disabled school checks are read-only, including session preservation", async ({ page }) => {
  const r = await page.evaluate(() => {
    const errors = [];
    for (const role of ["student", "teacher"]) {
      localStorage.setItem("orbitUser", JSON.stringify({ email: "one@student.test", role }));
      errors.push(attempt(() => R.read("y1")), attempt(() => R.availableYears()));
    }
    localStorage.removeItem("orbitUser"); errors.push(attempt(() => R.read("y1")));
    localStorage.setItem("orbitUser", JSON.stringify({ email: "school@fixture.test", role: "school" }));
    const accounts = JSON.parse(localStorage.getItem("orbit.recruitment.v1")); accounts.accounts[0].status = "suspended";
    localStorage.setItem("orbit.recruitment.v1", JSON.stringify(accounts));
    const before = snapshot(), writes = [];
    for (const name of ["setItem", "removeItem", "clear"]) Storage.prototype[name] = () => { writes.push(name); throw Error("FORBIDDEN_WRITE"); };
    errors.push(attempt(() => R.read("y1")));
    return { errors, writes, untouched: JSON.stringify(before) === JSON.stringify(snapshot()) };
  });
  expect(r.errors).toEqual(Array(6).fill("ROLE_DENIED"));
  expect(r.writes).toEqual([]);
  expect(r.untouched).toBe(true);
});

test("cross-school/corrupt source data and changing snapshots fail closed", async ({ page }) => {
  const r = await page.evaluate(() => {
    prepare();
    const key = OrbitSchoolYears.storageKey(), saved = localStorage.getItem(key), db = JSON.parse(saved);
    db.schoolId = "other@school.test"; localStorage.setItem(key, JSON.stringify(db));
    const wrongSchool = attempt(() => R.read("y1")); localStorage.setItem(key, saved);
    const original = Storage.prototype.getItem; let calls = 0;
    Storage.prototype.getItem = function (k) { const value = original.call(this, k); if (k === key && ++calls === 2) return JSON.stringify({ ...JSON.parse(value), revision: 99 }); return value; };
    const stale = attempt(() => R.read("y1")); Storage.prototype.getItem = original;
    const mapKey = E.mappingKey(); localStorage.setItem(mapKey, "broken");
    const invalid = attempt(() => R.read("y1"));
    return { wrongSchool, stale, invalid, retained: localStorage.getItem(mapKey) === "broken" };
  });
  expect(r).toEqual({ wrongSchool: "INVALID_YEAR_DATA", stale: "SNAPSHOT_CHANGED", invalid: "INVALID_MAPPING_DATA", retained: true });
});
