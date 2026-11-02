import { test, expect } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const route = "/school-management/school-management.html";
async function setup(page, section = "timetable") {
  await page.goto("/login/login.html");
  await page.locator('[data-user="school"]').click();
  await page.locator("#loginButton").click();
  await page.waitForURL("**/school-dashboard/school-dashboard.html");
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem("orbit.student.v1") || "{}");
    localStorage.setItem("orbit.student.v1", JSON.stringify({ ...prefs, lang: "en" }));
  });
  await page.goto(`${route}?section=${section}`);
  return page.evaluate(() => OrbitSchoolAcademics.read());
}

test("timetable CRUD persists and rejects invalid times, allocations, class, teacher and room conflicts", async ({ page }) => {
  await setup(page);
  const result = await page.evaluate(() => {
    const S = OrbitSchoolSchedule, A = OrbitSchoolAcademics;
    let a = A.read();
    A.save("allocations", "", { classId: a.classes[1].id, subjectId: a.subjects[0].id, teacherId: a.teachers[0].id }, a);
    a = A.read();
    A.save("allocations", "", { classId: a.classes[1].id, subjectId: a.subjects[1].id, teacherId: a.teachers[1].id }, a);
    a = A.read();
    const values = { ...a.allocations[0], day: 0, startTime: "08:10", endTime: "09:05", room: "Lab A" };
    const save = (v, id = "") => S.save("timetable", id, v, S.snapshot("timetable").context);
    const errors = [];
    const denied = (v) => { try { save(v); errors.push("ALLOWED"); } catch (e) { errors.push(e.message); } };
    const first = save(values);
    denied({ ...values, startTime: "09:00", endTime: "08:00" });
    denied({ ...values, startTime: "25:00" });
    denied({ ...values, day: "" });
    denied({ ...values, teacherId: a.teachers[1].id });
    denied({ ...values, startTime: "08:30", room: "Other" });
    denied({ ...values, ...a.allocations[1], room: "Other" });
    denied({ ...values, ...a.allocations[2], room: "  lab   A " });
    const adjacent = save({ ...values, startTime: "09:05", endTime: "09:51" });
    const edited = save({ ...values, day: 1, room: "Room 102" }, first.id);
    S.remove("timetable", adjacent.id, S.snapshot("timetable").context);
    return { errors, edited, ids: S.read("timetable").records.map((r) => r.id), key: S.storageKey("timetable") };
  });
  expect(result.errors).toEqual(["INVALID_TIME", "INVALID_TIME", "INVALID_DAY", "INVALID_ALLOCATION", "CLASS_CONFLICT", "TEACHER_CONFLICT", "ROOM_CONFLICT"]);
  expect(result.ids).toEqual([result.edited.id]);
  await page.reload();
  await expect(page.locator(`[data-schedule-record="${result.edited.id}"]`)).toContainText("Room 102");
});

test("events and announcements CRUD, audiences and two-school isolation preserve unrelated stores", async ({ page }) => {
  await setup(page, "events");
  const result = await page.evaluate(() => {
    const S = OrbitSchoolSchedule, a = OrbitSchoolAcademics.read();
    const protectedKeys = ["orbit.recruitment.v1", "orbit.subscriptions.v1", "orbit.assignments.v1", "orbit.meetings.v1", "orbit.channels.v2", OrbitSchoolAcademics.storageKey()];
    const before = protectedKeys.map((k) => localStorage.getItem(k));
    const base = { type: "event", title: "School fair", description: "Bring your project", dateTime: "2099-11-04T12:15", audience: "school", classIds: [], location: "Hall" };
    const save = (v, id = "") => S.save("events", id, v, S.snapshot("events").context);
    const first = save(base);
    const announcement = save({ ...base, type: "announcement", audience: "teachers", title: "Staff notice" });
    save({ ...base, audience: "students", title: "Student notice" });
    save({ ...base, audience: "classes", classIds: [a.classes[0].id], title: "Class notice" });
    save({ ...base, title: "Past event", dateTime: "2001-01-01T10:00" });
    const errors = [];
    for (const v of [{ ...base, audience: "classes", classIds: [] }, { ...base, audience: "classes", classIds: ["foreign-class"] }, { ...base, dateTime: "2026-02-31T12:00" }]) {
      try { save(v); } catch (e) { errors.push(e.message); }
    }
    save({ ...base, title: "Updated fair" }, first.id);
    S.remove("events", announcement.id, S.snapshot("events").context);
    const ctx = S.snapshot("events").context, raw = localStorage.getItem(S.storageKey("events"));
    const auth = OrbitAuth.current;
    OrbitAuth.current = () => ({ role: "school", email: "second@school.test" });
    const second = S.snapshot("events");
    let schoolChanged, foreign;
    try { S.save("events", "", base, ctx); } catch (e) { schoolChanged = e.message; }
    try { S.save("events", "", { ...base, audience: "classes", classIds: [a.classes[0].id] }, second.context); } catch (e) { foreign = e.message; }
    S.save("events", "", { ...base, title: "Second school" }, second.context);
    const secondTimetable = S.snapshot("timetable");
    const aa = secondTimetable.academic.allocations[0];
    S.save("timetable", "", { ...aa, day: 0, startTime: "10:00", endTime: "10:40" }, secondTimetable.context);
    OrbitAuth.current = auth;
    return { errors, schoolChanged, foreign, secondEmpty: second.records.length === 0, unchanged: raw === localStorage.getItem(S.storageKey("events")), protected: JSON.stringify(before) === JSON.stringify(protectedKeys.map((k) => localStorage.getItem(k))), records: S.read("events").records, timetable: S.read("timetable").records };
  });
  expect(result).toMatchObject({ errors: ["INVALID_AUDIENCE", "INVALID_AUDIENCE", "INVALID_DATE"], schoolChanged: "SCHOOL_CHANGED", foreign: "INVALID_AUDIENCE", secondEmpty: true, unchanged: true, protected: true, timetable: [] });
  expect(result.records).toHaveLength(4);
  await page.reload();
  await expect(page.locator(".sm-event-groups")).toContainText("Updated fair");
  await expect(page.locator(".sm-event-groups")).toContainText("Past event");
  await expect(page.locator(".sm-event-groups")).not.toContainText("Second school");
});

test("archived and removed references retain records, require repair and stay off the overview", async ({ page }) => {
  await setup(page);
  const result = await page.evaluate(() => {
    const S = OrbitSchoolSchedule, A = OrbitSchoolAcademics, a = A.read(), allocation = a.allocations[0];
    const lesson = { ...allocation, day: new Date().getDay(), startTime: "10:00", endTime: "11:00", room: "101" };
    S.save("timetable", "", lesson, S.snapshot("timetable").context);
    S.save("events", "", { type: "announcement", title: "Class only", description: "Retain me", dateTime: "2099-01-01T10:00", audience: "classes", classIds: [allocation.classId] }, S.snapshot("events").context);
    const raw = localStorage.getItem(S.storageKey("timetable")), eventsRaw = localStorage.getItem(S.storageKey("events"));
    A.save("allocations", allocation.id, { ...allocation, teacherId: a.teachers[1].id }, A.read());
    const reassigned = S.snapshot("timetable").records[0].status;
    A.save("allocations", allocation.id, allocation, A.read());
    A.archive("subjects", allocation.subjectId, A.read());
    const subjectStatus = S.snapshot("timetable").records[0].status;
    A.archive("classes", allocation.classId, A.read());
    const eventStatus = S.snapshot("events").records[0].status;
    let blocked;
    try { S.save("timetable", "", lesson, S.snapshot("timetable").context); } catch (e) { blocked = e.message; }
    A.remove("allocations", allocation.id, A.read());
    const changed = S.snapshot("timetable").records[0].status;
    A.remove("teachers", allocation.teacherId, A.read());
    const removed = S.snapshot("timetable").records[0].status;
    const dashboard = S.dashboard();
    return { reassigned, subjectStatus, eventStatus, changed, removed, blocked, today: dashboard.today, upcoming: dashboard.upcoming, needsRepair: dashboard.needsRepair, preserved: raw === localStorage.getItem(S.storageKey("timetable")) && eventsRaw === localStorage.getItem(S.storageKey("events")) };
  });
  expect(result).toMatchObject({ reassigned: "changed-allocation", subjectStatus: "archived-reference", eventStatus: "archived-reference", removed: "missing-reference", blocked: "INACTIVE_REFERENCE", today: [], upcoming: [], needsRepair: 2, preserved: true });
  await page.reload();
  await expect(page.locator(".sm-reference-warning")).toContainText("Needs repair");
  await expect(page.locator("[data-schedule-record]")).toHaveCount(1);
});

test("stale context, corrupt data, failed persistence and role changes never replace saved records", async ({ page }) => {
  await setup(page);
  const result = await page.evaluate(() => {
    const S = OrbitSchoolSchedule, A = OrbitSchoolAcademics;
    const context = S.snapshot("timetable").context, a = A.read();
    const values = { ...a.allocations[0], day: 0, startTime: "10:00", endTime: "11:00" };
    const first = S.save("timetable", "", values, context);
    const raw = localStorage.getItem(S.storageKey("timetable"));
    const errors = [];
    try { S.save("timetable", first.id, values, context); } catch (e) { errors.push(e.message); }
    const ctx = S.snapshot("timetable").context;
    A.save("subjects", "", { name: "Another subject" }, A.read());
    try { S.remove("timetable", first.id, ctx); } catch (e) { errors.push(e.message); }
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key.startsWith(S.prefixes.timetable)) throw Error("quota"); return set.call(this, key, value); };
    try { S.remove("timetable", first.id, S.snapshot("timetable").context); } catch (e) { errors.push(e.message); }
    Storage.prototype.setItem = set;
    const preserved = localStorage.getItem(S.storageKey("timetable")) === raw;
    const auth = OrbitAuth.current;
    for (const role of ["teacher", "student", "guest"]) {
      OrbitAuth.current = () => ({ role, email: "school@orbit.com" });
      try { S.snapshot("timetable"); } catch (e) { errors.push(e.message); }
    }
    OrbitAuth.current = auth;
    localStorage.setItem(S.storageKey("timetable"), "corrupt");
    return { errors, preserved };
  });
  expect(result).toEqual({ errors: ["STALE_DATA", "STALE_DATA", "STORAGE_FAILED", "ROLE_DENIED", "ROLE_DENIED", "ROLE_DENIED"], preserved: true });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("has not been replaced");
  expect(await page.evaluate(() => localStorage.getItem(OrbitSchoolSchedule.storageKey("timetable")))).toBe("corrupt");
});

test("accessible timetable and event forms support CRUD, filtering, validation and real dashboard cards", async ({ page }) => {
  const a = await setup(page);
  await expect(page.locator(".sm-empty")).toContainText("No lessons match");
  await page.locator("[data-schedule-add]").click();
  const modal = page.locator(".sm-academic-dialog[open]");
  await expect(modal).toHaveAccessibleName("Add lesson");
  await modal.locator('[name="allocationId"]').selectOption(a.allocations[0].id);
  await modal.locator('[name="day"]').selectOption(String(new Date().getDay()));
  await modal.locator('[name="startTime"]').fill("08:17");
  await modal.locator('[name="endTime"]').fill("08:10");
  await modal.getByRole("button", { name: "Save", exact: true }).click();
  await expect(modal.locator("[role=alert]")).toContainText("End time must");
  await modal.locator('[name="endTime"]').fill("09:03");
  await modal.locator('[name="room"]').fill("Studio 8");
  await modal.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("[data-schedule-record]")).toHaveCount(1);
  await page.locator('[data-schedule-filter="classId"]').selectOption(a.classes[1].id);
  await expect(page.locator("[data-schedule-record]")).toHaveCount(0);
  await page.locator('[data-schedule-filter="classId"]').selectOption(a.classes[0].id);
  await page.locator('[data-schedule-filter="teacherId"]').selectOption(a.teachers[0].id);
  await page.locator('[data-schedule-filter="day"]').selectOption(String(new Date().getDay()));
  await expect(page.locator("[data-schedule-record]")).toHaveCount(1);
  await page.locator("[data-schedule-edit]").click();
  await modal.locator('[name="room"]').fill("Studio 9");
  await modal.getByRole("button", { name: "Save", exact: true }).click();
  await page.locator('.sm-nav a[href="?section=events"]').click();
  await page.locator("[data-schedule-add]").click();
  await modal.locator('[name="type"]').selectOption("announcement");
  await modal.locator('[name="title"]').fill("Project day <safe>");
  await modal.locator('[name="description"]').fill("Share your project\nBring a notebook.");
  await modal.locator('[name="dateTime"]').fill("2099-06-20T13:45");
  await modal.locator('[name="audience"]').selectOption("classes");
  await modal.getByRole("button", { name: "Save", exact: true }).click();
  await expect(modal.locator("[role=alert]")).toContainText("at least one active class");
  await modal.locator(`[name="classIds"][value="${a.classes[0].id}"]`).check();
  await modal.locator('[name="location"]').fill("School hall");
  await modal.getByRole("button", { name: "Save", exact: true }).click();
  await page.locator("[data-schedule-edit]").click();
  await modal.locator('[name="description"]').fill("Updated notice");
  await modal.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(page.locator(".sm-event-list")).toContainText("Updated notice");
  await page.locator('.sm-nav a[href="?section=overview"]').click();
  await expect(page.locator("[data-overview-schedule]")).toContainText("Studio 9");
  await expect(page.locator("[data-overview-events]")).toContainText("Project day <safe>");
  await expect(page.locator(".sm-totals")).toContainText("See monitoring");
  await expect(page.locator("#sm-content")).not.toContainText("Weekly class plan prepared");
  await page.locator('[data-overview-events] a').click();
  await page.locator("[data-schedule-delete]").click();
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("[data-schedule-record]")).toHaveCount(1);
  await page.locator("[data-schedule-delete]").click();
  await modal.getByRole("button", { name: "Delete", exact: true }).click();
  await page.locator('.sm-nav a[href="?section=timetable"]').click();
  await page.locator("[data-schedule-delete]").click();
  await modal.getByRole("button", { name: "Delete", exact: true }).click();
  await page.reload();
  await expect(page.locator("[data-schedule-record]")).toHaveCount(0);
  await page.locator('.sm-nav a[href="?section=overview"]').click();
  await expect(page.locator("[data-overview-schedule]")).toContainText("No lessons scheduled today");
  await expect(page.locator("[data-overview-events]")).toContainText("No upcoming events");
});

test("schedule pages and dialogs support both languages, directions, themes and responsive layouts", async ({ page }) => {
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await page.evaluate(() => {
    const S = OrbitSchoolSchedule, v = S.snapshot("timetable");
    S.save("timetable", "", { ...v.academic.allocations[0], day: new Date().getDay(), startTime: "10:15", endTime: "11:35", room: "Science lab · مختبر العلوم" }, v.context);
    S.save("events", "", { type: "event", title: "Science fair · معرض العلوم", description: "A school project exhibition · معرض مشاريع المدرسة", dateTime: "2099-06-20T13:45", audience: "school", location: "Hall · القاعة" }, S.snapshot("events").context);
  });
  for (const lang of ["en", "ar"]) {
    if (await page.locator("html").getAttribute("lang") !== lang) await page.locator("#orbit-language-button").click();
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((v) => OrbitThemePreference.save(v), theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const section of ["timetable", "events"]) {
          await page.locator(`.sm-nav a[href="?section=${section}"]`).click();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
          await page.screenshot({ path: path.join(os.tmpdir(), `orbit-phase5-${section}-${lang}-${theme}-${width}.png`), fullPage: true });
          await page.locator("[data-schedule-add]").click();
          const modal = page.locator(".sm-academic-dialog[open]");
          expect(await modal.evaluate((el) => el.contains(document.activeElement))).toBe(true);
          expect(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
          await page.screenshot({ path: path.join(os.tmpdir(), `orbit-phase5-form-${section}-${lang}-${theme}-${width}.png`), fullPage: true });
          await page.keyboard.press("Escape");
          await expect(page.locator("[data-schedule-add]")).toBeFocused();
        }
      }
    }
  }
  expect(errors).toEqual([]);
});
