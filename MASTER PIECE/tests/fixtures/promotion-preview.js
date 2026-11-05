import path from "node:path";
export const previewRoute = "/school-management/school-management.html?section=students&view=promotions";
export async function setupPromotion(page) {
  await page.route("**/__promotion_fixture__", (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html><html><body></body></html>" }));
  await page.goto("/__promotion_fixture__");
  await page.evaluate(() => {
    const schoolId = "school@preview.test", stamp = "2026-11-03T00:00:00.000Z", row = (v) => ({ schoolId, ...v });
    localStorage.setItem("orbitUser", JSON.stringify({ email: schoolId, role: "school", name: "Preview School" }));
    localStorage.setItem("orbit.student.v1", JSON.stringify({ lang: "en", theme: "light" }));
    localStorage.setItem("orbit.channels.v2", JSON.stringify({ role: "school", joined: [], channels: [], posts: [] }));
    localStorage.setItem("orbit.memberships.v3", JSON.stringify({}));
    localStorage.setItem("orbit.assignments.v1", JSON.stringify({ submissions: [{ id: "preserve-grade", review: { grade: 88 } }] }));
    localStorage.setItem("orbit.recruitment.v1", JSON.stringify({ accounts: [{ email: schoolId, role: "school", status: "active", name: "Preview School" }, ...[1, 2, 3, 5].map((n) => ({ email: `student${n}@preview.test`, role: "student", status: "active" }))], notifications: [] }));
    const classes = [["s7", "7", "A", "2030-2031"], ["s8", "8", "A", "2030-2031"], ["s9", "9", "A", "2030-2031"], ["sBad", "7", "Z", "2030-2031"], ["d7", "7", "R", "2031-2032"], ["d8a", "8", "A", "2031-2032"], ["d8b", "8", "B", "2031-2032"], ["d9", "9", "A", "2031-2032"], ["unreviewed", "9", "Z", "2031-2032"]].map(([id, grade, section, academicYear]) => row({ id, grade, section, academicYear, status: "active" }));
    const students = [1, 2, 3, 4, 5, 6].map((n) => row({ id: `r${n}`, name: `Student ${n} · طالب ${n}`, studentCode: `S${n}`, status: "enrolled", classId: ["s7", "s8", "s9", "s7", "sBad", null][n - 1] }));
    localStorage.setItem("orbit.school.academics.demo.v1:" + encodeURIComponent(schoolId), JSON.stringify({ schema: 1, schoolId, revision: 0, students, classes, teachers: [], subjects: [], allocations: [] }));
    localStorage.setItem("orbit.school.years.demo.v1:" + encodeURIComponent(schoolId), JSON.stringify({ schema: 1, schoolId, revision: 0, activeYearId: "source", years: [row({ id: "past", name: "Past", startDate: "2029-09-01", endDate: "2030-06-30", status: "archived", createdAt: stamp, updatedAt: stamp }), row({ id: "source", name: "Source 2030", startDate: "2030-09-01", endDate: "2031-06-30", status: "active", createdAt: stamp, updatedAt: stamp }), row({ id: "target", name: "Target 2031", startDate: "2031-09-01", endDate: "2032-06-30", status: "upcoming", createdAt: stamp, updatedAt: stamp })] }));
  });
  for (const name of ["auth.js", "school-academic-service.js", "school-year-service.js", "school-enrollment-service.js", "school-academic-read-model.js", "school-year-context.js", "school-section-service.js", "school-promotion-preview-service.js"]) await page.addScriptTag({ path: path.resolve("shared", name) });
  await page.evaluate(() => {
    const E = OrbitSchoolEnrollments, ctx = () => E.read().context, op = () => crypto.randomUUID();
    for (const c of ["s7", "s8", "s9", "sBad"]) E.confirmClassYear(c, "source", ctx(), op(), true);
    for (const c of ["d7", "d8a", "d8b", "d9"]) E.confirmClassYear(c, "target", ctx(), op(), true);
    for (const n of [1, 2, 3, 5]) {
      const m = E.requestMapping(`r${n}`, ctx(), op()); E.confirmMapping(m.id, `student${n}@preview.test`, ctx(), op(), true);
      E.enroll({ academicStudentId: `r${n}`, academicYearId: "source", classId: { 1: "s7", 2: "s8", 3: "s9", 5: "sBad" }[n] }, ctx(), op(), true);
    }
    E.requestMapping("r4", ctx(), op());
    const academic = OrbitSchoolAcademics.read(); academic.classes.find((c) => c.id === "sBad").section = "Changed"; academic.revision++;
    localStorage.setItem(OrbitSchoolAcademics.storageKey(), JSON.stringify(academic));
    window.P = OrbitSchoolPromotionPreviews;
    window.op = () => crypto.randomUUID(); window.ctx = () => P.read().context;
    window.prepareDraft = () => { P.saveProgression(["7", "8", "9"], P.read().context, op(), true); return P.createDraft("source", "target", P.read().context, op(), true); };
    window.attempt = (fn) => { try { fn(); return "ACCEPTED"; } catch (e) { return e.message; } };
    window.protectedSnapshot = () => Object.keys(localStorage).sort().filter((k) => !k.startsWith(P.prefix)).map((k) => [k, localStorage.getItem(k)]);
  });
}
