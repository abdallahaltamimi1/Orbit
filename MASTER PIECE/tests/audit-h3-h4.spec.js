import { test, expect } from "@playwright/test";

async function login(page, role) {
  await page.goto("/login/login.html");
  await page.locator(`[data-user="${role}"]`).click();
  await page.locator("#loginButton").click();
  await page.waitForURL(`**/${role}-dashboard/${role}-dashboard.html`);
  await expect(page.locator("#orbit-logout")).toBeAttached();
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem("orbit.student.v1") || "{}");
    localStorage.setItem("orbit.student.v1", JSON.stringify({ ...prefs, lang: "en" }));
  });
}
async function ownership(page) {
  await login(page, "teacher");
  await page.evaluate(() => {
    const teacher = OrbitAuth.current().email;
    localStorage.setItem("orbit.channels.v2", JSON.stringify({
      channels: [
        { id: "school-a", schoolId: "a@school.test", teacher, en: "School A channel", ar: "قناة أ", private: false },
        { id: "school-a-2", schoolId: "a@school.test", teacher, en: "Second School A channel", private: false },
        { id: "school-b", schoolId: "b@school.test", teacher, en: "School B channel", private: false },
        { id: "personal", teacher, en: "Personal channel", private: false },
      ],
      posts: [
        { id: "old-wrong", channel: "school-a", schoolId: "b@school.test", type: "lesson", title: "Inconsistent legacy post", body: "Retain this record", attachments: [] },
        { id: "old-correct", channel: "school-a", schoolId: "a@school.test", type: "lesson", title: "Correct legacy post", body: "Retain ownership", attachments: [] },
        { id: "old-unscoped", channel: "school-a", type: "lesson", title: "Legacy without school field", body: "No automatic backfill", attachments: [] },
      ], joined: [], likes: [], saved: [], comments: {}, role: "teacher",
    }));
    localStorage.setItem("orbit.school.members.v1", JSON.stringify({ schema: 1, schools: {
      "b@school.test": { teachers: [{ id: teacher, status: "active", permissions: ["publish", "classes", "labs", "reports", "planning"] }], students: [] },
    } }));
  });
  await page.goto("/channel/channel.html?id=school-a");
}
async function edit(page, channel, title, id = "") {
  await page.evaluate(({ channel, id }) => ORBIT.editor(channel, id || undefined, () => {}), { channel, id });
  const form = page.locator("dialog[open] #publish-form");
  await form.locator('[name="channel"]').selectOption(channel);
  await form.locator('[name="type"]').selectOption("lesson");
  await form.locator('[name="title"]').fill(title);
  await form.locator('[name="body"]').fill("Ownership regression content");
  return form;
}
async function save(page) {
  for (let i = 0; i < 2; i++) if (await page.locator("dialog[open] .orbit-next:visible").count()) await page.locator("dialog[open] .orbit-next:visible").click();
  await page.locator('dialog[open] button[type="submit"]:visible').click();
}
async function assignments(page) {
  await login(page, "student");
  await page.evaluate(() => {
    const teacher = "teacher@orbit.com", student = OrbitAuth.current().email;
    const assignment = (id, extra = {}) => ({ id, channel: "assignment-room", type: "assignment", title: id, body: "Answer this assignment", dueDate: "2100-01-01", ...extra });
    localStorage.setItem("orbit.channels.v2", JSON.stringify({ channels: [{ id: "assignment-room", teacher, schoolId: "a@school.test", en: "Assignment channel", ar: "قناة الواجبات", private: false }], posts: [assignment("visible-assignment"), assignment("hidden-assignment", { moderationStatus: "hidden" }), assignment("deleted-assignment"), assignment("sample-assignment", { sample: true })], joined: [], likes: [], saved: [], comments: {}, role: "student" }));
    localStorage.setItem("orbit.memberships.v3", JSON.stringify({ [student]: ["assignment-room"] }));
    localStorage.setItem("orbit.deleted.posts", JSON.stringify(["deleted-assignment"]));
    const record = (id) => ({ id: "submission-" + id, assignmentId: id, channelId: "assignment-room", studentId: student, answer: "EXISTING ANSWER", attachments: [{ key: "existing-file", name: "existing.pdf", type: "application/pdf", size: 3 }], submittedAt: "2026-01-01T10:00:00Z", revision: 2, late: false, review: { teacherId: teacher, grade: 81, feedback: "EXISTING FEEDBACK", reviewedAt: "2026-01-01T11:00:00Z" }, history: [{ answer: "PREVIOUS ANSWER", attachments: [], review: null, submittedAt: "2025-12-30T10:00:00Z", revision: 1 }] });
    localStorage.setItem("orbit.assignments.v1", JSON.stringify({ submissions: [record("visible-assignment"), record("hidden-assignment")], notifications: ["visible-assignment", "hidden-assignment"].map((assignmentId) => ({ id: "note-" + assignmentId, assignmentId, recipient: student, en: "Feedback for " + assignmentId, ar: "ملاحظات", read: false })) }));
  });
  await page.goto("/channel/channel.html?id=assignment-room&tab=assignments");
}

test("H3 channel ownership controls new posts across subscription schools and personal channels; monitoring stays school-scoped", async ({ page }) => {
  await ownership(page);
  const before = await page.evaluate(() => ORBIT.db().posts);
  for (const [channel, title] of [["school-a", "New A billed B"], ["school-b", "New B billed B"], ["personal", "Personal billed B"]]) {
    await edit(page, channel, title); await save(page);
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  }
  const billing = await page.evaluate(() => ({ context: OrbitSubscriptions.effective().schoolId, lessons: OrbitSubscriptions.effective().record.usage.lessons }));
  expect(billing).toEqual({ context: "b@school.test", lessons: 3 });
  await page.evaluate(() => {
    const teacher = OrbitAuth.current().email;
    localStorage.setItem("orbit.school.members.v1", JSON.stringify({ schema: 1, schools: { "a@school.test": { teachers: [{ id: teacher, status: "active", permissions: ["publish", "classes", "labs", "reports", "planning"] }], students: [] } } }));
  });
  await edit(page, "school-b", "New B billed A"); await save(page);
  const posts = await page.evaluate(() => ORBIT.db().posts);
  expect(posts.filter((p) => before.some((r) => r.id === p.id))).toEqual(before);
  for (const [title, schoolId] of [["New A billed B", "a@school.test"], ["New B billed B", "b@school.test"], ["Personal billed B", null], ["New B billed A", "b@school.test"]])
    expect(posts.find((p) => p.title === title)?.schoolId).toBe(schoolId);
  for (const url of ["school-academic-service.js", "school-service.js", "school-monitoring-service.js"]) await page.addScriptTag({ url: "/shared/" + url });
  const report = await page.evaluate(() => {
    const auth = OrbitAuth.current, raw = localStorage.getItem("orbit.channels.v2");
    OrbitAuth.current = () => ({ role: "school", email: "a@school.test" });
    const a = OrbitSchoolMonitoring.report();
    OrbitAuth.current = () => ({ role: "school", email: "b@school.test" });
    const b = OrbitSchoolMonitoring.report(); OrbitAuth.current = auth;
    return { a: a.rows.map((r) => [r.channelId, r.lessons]), b: b.rows.map((r) => [r.channelId, r.lessons]), preserved: raw === localStorage.getItem("orbit.channels.v2") };
  });
  expect(report).toEqual({ a: [["school-a", 3], ["school-a-2", 0]], b: [["school-b", 2]], preserved: true });
});

test("H3 inconsistent associations are rejected, compatible edits retain legacy metadata, and same-school channel moves still work", async ({ page }) => {
  await ownership(page);
  const raw = await page.evaluate(() => localStorage.getItem("orbit.channels.v2"));
  await edit(page, "school-a", "Rejected edit", "old-wrong"); await save(page);
  await expect(page.locator("#publish-error")).toContainText("school association conflicts");
  expect(await page.evaluate(() => localStorage.getItem("orbit.channels.v2"))).toBe(raw);
  await page.keyboard.press("Escape");
  await edit(page, "school-a", "Edited legacy", "old-unscoped"); await save(page);
  expect(await page.evaluate(() => Object.hasOwn(ORBIT.db().posts.find((p) => p.id === "old-unscoped"), "schoolId"))).toBe(false);
  await edit(page, "school-a-2", "Moved within School A", "old-correct"); await save(page);
  const valid = await page.evaluate(() => ORBIT.db().posts.find((p) => p.id === "old-correct"));
  expect(valid).toMatchObject({ channel: "school-a-2", schoolId: "a@school.test" });
  await edit(page, "school-b", "Rejected move", "old-correct"); await save(page);
  await expect(page.locator("#publish-error")).toContainText("school association conflicts");
  expect(await page.evaluate(() => ORBIT.db().posts.find((p) => p.id === "old-correct"))).toEqual(valid);
});

test("H3 dashboard publication shares the ownership rule and in-flight ownership changes block a save", async ({ page }) => {
  await ownership(page);
  await page.goto("/teacher-dashboard/teacher-dashboard.html");
  // Exercise the retained dashboard publisher in addition to the shared editor used by current buttons.
  await page.evaluate(() => composeDialog("school-a"));
  const form = page.locator("#post-form");
  await form.locator('[name="channel"]').selectOption("school-a");
  await form.locator('[name="type"]').selectOption("lesson");
  await form.locator('[name="title"]').fill("Dashboard School A post");
  await form.locator('[name="body"]').fill("Dashboard ownership regression");
  await form.locator(".form-actions button").click();
  expect(await page.evaluate(() => ORBIT.db().posts.find((p) => p.title === "Dashboard School A post")?.schoolId)).toBe("a@school.test");
  await page.goto("/channel/channel.html?id=school-a");
  const editor = await edit(page, "school-a", "Do not publish after ownership changes");
  await editor.locator('[name="files"]').setInputFiles({ name: "test.pdf", mimeType: "application/pdf", buffer: Buffer.from("pdf") });
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = put.apply(this, args);
      if (String(args[1]).startsWith("media-")) {
        const db = ORBIT.db(); db.channels.find((c) => c.id === "school-a").schoolId = "b@school.test";
        ORBIT.set("orbit.channels.v2", db);
      }
      return request;
    };
  });
  await save(page);
  await expect(page.locator("#publish-error")).toContainText("Channel ownership changed");
  expect(await page.evaluate(() => ORBIT.db().posts.some((p) => p.title === "Do not publish after ownership changes"))).toBe(false);
  expect(await page.evaluate(() => ORBIT.db().channels.find((c) => c.id === "school-a").schoolId)).toBe("b@school.test");
});

test("H4 students cannot read or mutate hidden, deleted or sample assignments; stored work and feedback survive", async ({ page }) => {
  await assignments(page);
  const result = await page.evaluate(async () => {
    const A = OrbitAssignments, raw = localStorage.getItem(A.key), failures = [];
    for (const id of ["hidden-assignment", "deleted-assignment", "sample-assignment"]) {
      for (const action of [() => A.find(id), () => A.records(id), () => A.submit(id, { answer: "Do not save" }, 2), () => A.attachment(id, "student@orbit.com", "existing-file")]) {
        try { await action(); failures.push("ALLOWED"); } catch { failures.push("DENIED"); }
      }
    }
    return { visible: A.visible().map((p) => p.id), notes: A.notifications().map((n) => n.assignmentId), failures, unchanged: raw === localStorage.getItem(A.key) };
  });
  expect(result).toEqual({ visible: ["visible-assignment"], notes: ["visible-assignment"], failures: Array(12).fill("DENIED"), unchanged: true });
  await expect(page.locator('[data-post="hidden-assignment"]')).toHaveCount(0);
  await expect(page.locator('[data-post="deleted-assignment"]')).toHaveCount(0);
});

test("H4 owning teachers retain review access and authorized moderation can restore student access without deleting work", async ({ page }) => {
  await assignments(page);
  await page.addScriptTag({ url: "/admin/admin-service.js" });
  const result = await page.evaluate(() => {
    const A = OrbitAssignments, auth = OrbitAuth.current, raw = localStorage.getItem(A.key);
    const failures = [];
    for (const active of [{ role: "teacher", email: "other@teacher.test" }, { role: "school", email: "a@school.test" }]) {
      OrbitAuth.current = () => active;
      try { A.find("hidden-assignment"); failures.push("ALLOWED"); } catch { failures.push("DENIED"); }
    }
    OrbitAuth.current = () => ({ role: "teacher", email: "teacher@orbit.com" });
    const before = A.records("hidden-assignment")[0];
    A.review("hidden-assignment", "student@orbit.com", { grade: 88, feedback: "Teacher retained review access" }, before.revision);
    const after = A.records("hidden-assignment")[0];
    let nonAdmin;
    try { OrbitAdmin.setPostStatus("hidden-assignment", "visible"); nonAdmin = "ALLOWED"; } catch { nonAdmin = "DENIED"; }
    const recruitment = JSON.parse(localStorage.getItem("orbit.recruitment.v1") || "{}");
    recruitment.accounts ||= [];
    recruitment.accounts.push({ email: "audit-admin@test.local", role: "admin", status: "active" });
    localStorage.setItem("orbit.recruitment.v1", JSON.stringify(recruitment));
    sessionStorage.setItem("orbit.admin.session", JSON.stringify({ email: "audit-admin@test.local", token: "disposable-test-proof", expiresAt: Date.now() + 60000 }));
    OrbitAuth.current = () => ({ role: "admin", email: "audit-admin@test.local" });
    OrbitAdmin.setPostStatus("hidden-assignment", "visible");
    OrbitAuth.current = auth;
    return { failures, nonAdmin, answer: after.answer, history: after.history, attachments: after.attachments, beforeHistory: before.history, beforeAttachments: before.attachments, review: A.records("hidden-assignment")[0].review, visible: A.visible().map((p) => p.id), rawPreservedUntilExplicitReview: JSON.parse(raw).submissions.find((s) => s.assignmentId === "hidden-assignment").review.feedback === "EXISTING FEEDBACK" };
  });
  expect(result.failures).toEqual(["DENIED", "DENIED"]); expect(result.nonAdmin).toBe("DENIED");
  expect(result.answer).toBe("EXISTING ANSWER"); expect(result.history).toEqual(result.beforeHistory); expect(result.attachments).toEqual(result.beforeAttachments);
  expect(result.review).toMatchObject({ grade: 88, feedback: "Teacher retained review access" });
  expect(result.visible).toContain("hidden-assignment"); expect(result.rawPreservedUntilExplicitReview).toBe(true);
});

test("H4 a submission dialog opened before moderation cannot edit hidden work and works again after restoration", async ({ page }) => {
  await assignments(page);
  await page.locator('[data-assignment-submit="visible-assignment"]').click();
  const dialog = page.locator("#assignment-dialog[open]");
  await dialog.locator('[name="answer"]').fill("Attempt after moderation");
  const raw = await page.evaluate(() => {
    const db = ORBIT.db(); db.posts.find((p) => p.id === "visible-assignment").moderationStatus = "hidden";
    ORBIT.set("orbit.channels.v2", db); return localStorage.getItem("orbit.assignments.v1");
  });
  await dialog.locator('[type="submit"]').click();
  await expect(dialog.locator(".assignment-error")).toContainText("unavailable");
  expect(await page.evaluate(() => localStorage.getItem("orbit.assignments.v1"))).toBe(raw);
  await page.evaluate(() => { const db = ORBIT.db(); db.posts.find((p) => p.id === "visible-assignment").moderationStatus = "visible"; ORBIT.set("orbit.channels.v2", db); });
  await dialog.locator('[type="submit"]').click();
  await expect(dialog).toHaveCount(0);
  const saved = await page.evaluate(() => OrbitAssignments.records("visible-assignment")[0]);
  expect(saved).toMatchObject({ answer: "Attempt after moderation", review: null, revision: 3 });
  expect(saved.history.at(-1)).toMatchObject({ answer: "EXISTING ANSWER", review: { feedback: "EXISTING FEEDBACK" } });
});

test("H4 visibility is revalidated after asynchronous uploads and attachment reads", async ({ page }) => {
  await assignments(page);
  const result = await page.evaluate(async () => {
    const A = OrbitAssignments, media = ORBIT.media, raw = localStorage.getItem(A.key), failures = [];
    const hide = () => { const db = ORBIT.db(); db.posts.find((p) => p.id === "visible-assignment").moderationStatus = "hidden"; ORBIT.set("orbit.channels.v2", db); };
    const restore = () => { const db = ORBIT.db(); db.posts.find((p) => p.id === "visible-assignment").moderationStatus = "visible"; ORBIT.set("orbit.channels.v2", db); };
    let calls = 0;
    ORBIT.media = async () => { calls++; hide(); return new Blob(["pdf"], { type: "application/pdf" }); };
    try { await A.submit("visible-assignment", { answer: "Do not save", files: [new File(["pdf"], "new.pdf", { type: "application/pdf" })] }, 2); failures.push("ALLOWED"); } catch { failures.push("DENIED"); }
    restore();
    try { await A.attachment("visible-assignment", "student@orbit.com", "existing-file"); failures.push("ALLOWED"); } catch { failures.push("DENIED"); }
    ORBIT.media = media;
    return { failures, calls, unchanged: raw === localStorage.getItem(A.key) };
  });
  expect(result).toEqual({ failures: ["DENIED", "DENIED"], calls: 2, unchanged: true });
});
