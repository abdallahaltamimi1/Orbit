import { test, expect } from "@playwright/test";
import os from "node:os";
import path from "node:path";

async function login(page, role) {
  await page.goto("/login/login.html");
  await page.locator(`[data-user="${role}"]`).click();
  await page.locator("#loginButton").click();
  await page.waitForURL(`**/${role}-dashboard/${role}-dashboard.html`);
}
async function interviews(page) {
  await login(page, "school");
  return page.evaluate(() => {
    const schoolId = OrbitAuth.current().email;
    const id = crypto.randomUUID(), classId = crypto.randomUUID();
    const recruitment = OrbitRecruitment.data();
    const application = { id: "audit-application", jobId: "audit-job", schoolId, teacherId: "teacher@orbit.com", status: "interview_scheduled", interviewMeetingId: id, profile: { name: "Applicant", subject: "physics" } };
    recruitment.jobs.push({ id: application.jobId, schoolId, title: "Audit teaching opportunity", subject: "physics", status: "published", grades: [], createdAt: new Date().toISOString() });
    recruitment.applications.push(application);
    localStorage.setItem("orbit.recruitment.v1", JSON.stringify(recruitment));
    const meeting = {
      id, kind: "recruitment-interview", applicationId: application.id, jobId: application.jobId,
      schoolId, teacherId: application.teacherId, teacherName: "Applicant", recipientIds: [application.teacherId],
      title: "H1 internal interview", description: "Disposable regression fixture", subject: "Physics",
      channelId: null, channelName: "Audit teaching opportunity", type: "interview-online", externalUrl: "", location: "",
      roomName: "LearningOrbit" + id.replaceAll("-", ""), audience: { mode: "individual", studentIds: [] }, resources: [],
      startAt: new Date(Date.now() - 60000).toISOString(), endAt: new Date(Date.now() + 3600000).toISOString(), timezone: "Asia/Amman", status: "scheduled", revision: 1,
    };
    const lesson = { ...meeting, id: classId, kind: "class-meeting", applicationId: null, jobId: null, channelId: "physics", title: "H1 educational meeting", recipientIds: ["student@orbit.com"], roomName: "LearningOrbit" + classId.replaceAll("-", "") };
    localStorage.setItem("orbit.meetings.v1", JSON.stringify({ schema: 1, meetings: [meeting, lesson], groups: [], notifications: [] }));
    localStorage.setItem("orbit.memberships.v3", JSON.stringify({ "student@orbit.com": ["physics"] }));
    return { id, classId, schoolId, roomName: meeting.roomName };
  });
}
async function teaching(page) {
  await login(page, "student");
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem("orbit.student.v1") || "{}");
    localStorage.setItem("orbit.student.v1", JSON.stringify({ ...prefs, lang: "en" }));
    const db = JSON.parse(localStorage.getItem("orbit.profiles.v1") || '{"schema":1,"records":{}}');
    db.records["teacher@orbit.com"] = {
      id: "teacher@orbit.com", email: "teacher@orbit.com", role: "teacher", revision: 1,
      name: "Public teaching name", subject: "physics", subjects: ["physics"],
      bio: "PRIVATE_BIO", qualification: "PRIVATE_QUALIFICATION", positions: "PRIVATE_POSITIONS",
      cv: "https://private.example/PRIVATE_CV", shareCV: false, shareWithSchools: false, available: false,
      address: "PRIVATE_ADDRESS", contact: "PRIVATE_CONTACT", location: "PRIVATE_LOCATION",
      photo: "PRIVATE_PHOTO", certificates: ["PRIVATE_CERTIFICATE"], workSamples: ["https://private.example/PRIVATE_WORK"],
    };
    localStorage.setItem("orbit.profiles.v1", JSON.stringify(db));
    const channels = [
      { id: "audit-public", teacher: "teacher@orbit.com", private: false, subject: "physics", en: "Public physics", ar: "فيزياء عامة", descEn: "Public teaching description", descAr: "وصف تعليمي عام" },
      { id: "audit-joined", teacher: "teacher@orbit.com", private: true, subject: "math", en: "Joined classroom", ar: "صف مشترك", code: "PRIVATE_JOIN_CODE" },
      { id: "audit-locked", teacher: "teacher@orbit.com", private: true, subject: "chemistry", en: "PRIVATE_LOCKED_CLASS", code: "PRIVATE_LOCKED_CODE" },
      { id: "audit-unrelated", teacher: "unrelated@demo.test", private: true, subject: "biology", en: "PRIVATE_UNRELATED_CLASS" },
    ];
    localStorage.setItem("orbit.channels.v2", JSON.stringify({ channels, posts: [], joined: [], role: "student" }));
    localStorage.setItem("orbit.memberships.v3", JSON.stringify({ "student@orbit.com": ["audit-joined"] }));
  });
}

test("H1 interview entry admits the organizing school and applicant but denies unrelated roles and class access", async ({ page }) => {
  const fixture = await interviews(page);
  const result = await page.evaluate(({ id, classId, schoolId }) => {
    const M = OrbitMeetings, auth = OrbitAuth.current;
    const raw = localStorage.getItem(M.key);
    const run = (role, email, meetingId) => {
      OrbitAuth.current = () => ({ role, email });
      try { return M.entry(meetingId).id; } catch { return "DENIED"; }
    };
    const access = [
      run("school", schoolId, id), run("teacher", "teacher@orbit.com", id),
      run("school", "other@school.test", id), run("teacher", "other@teacher.test", id),
      run("student", "teacher@orbit.com", id), run("student", "student@orbit.com", id),
      run("school", schoolId, classId), run("school", "other@school.test", classId),
      run("teacher", "teacher@orbit.com", classId), run("student", "student@orbit.com", classId),
      run("guest", "", id), run("admin", schoolId, id),
    ];
    const stateAccess = [];
    for (const update of [
      { status: "cancelled" },
      { startAt: new Date(Date.now() + 3600000).toISOString(), endAt: new Date(Date.now() + 7200000).toISOString() },
      { startAt: new Date(Date.now() - 7200000).toISOString(), endAt: new Date(Date.now() - 3600000).toISOString() },
      { applicationId: "missing" }, { jobId: "wrong-job" }, { schoolId: "other@school.test" },
    ]) {
      const db = JSON.parse(raw); Object.assign(db.meetings[0], update);
      localStorage.setItem(M.key, JSON.stringify(db));
      stateAccess.push(run("school", schoolId, id));
    }
    localStorage.setItem(M.key, raw); OrbitAuth.current = auth;
    return { access, stateAccess, unchanged: raw === localStorage.getItem(M.key) };
  }, fixture);
  expect(result.access).toEqual([fixture.id, fixture.id, "DENIED", "DENIED", "DENIED", "DENIED", "DENIED", "DENIED", fixture.classId, fixture.classId, "DENIED", "DENIED"]);
  expect(result.stateAccess).toEqual(Array(6).fill("DENIED"));
  expect(result.unchanged).toBe(true);
});

test("H1 the school's existing interview link opens the same room in English and Arabic on mobile", async ({ page }) => {
  const fixture = await interviews(page);
  await page.context().addInitScript(() => {
    window.JitsiMeetExternalAPI = class {
      constructor(host, options) { window.testMeetingRoom = { host, roomName: options.roomName }; }
      addEventListener() {} removeEventListener() {} dispose() {}
    };
  });
  await page.setViewportSize({ width: 390, height: 900 });
  for (const lang of ["en", "ar"]) {
    await page.evaluate((lang) => {
      const prefs = JSON.parse(localStorage.getItem("orbit.student.v1") || "{}");
      localStorage.setItem("orbit.student.v1", JSON.stringify({ ...prefs, lang }));
    }, lang);
    await page.goto(`/school-dashboard/school-dashboard.html?locale-check=${lang}#meetings-section`);
    await page.locator(`[data-meeting-details="${fixture.id}"]`).click();
    const link = page.locator(`#meeting-dialog a[href*="meeting.html?id=${fixture.id}"]`);
    await expect(link).toHaveAttribute("href", `../meetings/meeting.html?id=${fixture.id}`);
    const popupPromise = page.waitForEvent("popup"); await link.click(); const room = await popupPromise;
    await expect(room.locator("h1")).toHaveText("H1 internal interview");
    await expect.poll(() => room.evaluate(() => window.testMeetingRoom?.roomName)).toBe(fixture.roomName);
    await expect(room.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    expect(await room.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await room.close(); await page.keyboard.press("Escape");
  }
  await page.goto(`/meetings/meeting.html?id=${fixture.classId}`);
  await expect(page.locator("[role=alert]")).toBeVisible();
  expect(await page.evaluate(() => window.testMeetingRoom)).toBeUndefined();
});

test("H2 student teaching projection excludes private and recruitment data and preserves stored records", async ({ page }) => {
  await teaching(page);
  await page.goto("/teacher-profile/teacher-profile.html?id=khaled&application=unrelated");
  await expect(page).toHaveURL(/teacher-profile\/teaching-profile\.html\?id=khaled/);
  await expect(page.locator(".teaching-profile h2").first()).toHaveText("Public teaching name");
  const result = await page.evaluate(() => {
    const keys = ["orbit.channels.v2", "orbit.memberships.v3", "orbit.profiles.v1", "orbit.recruitment.v1", "orbit.assignments.v1", "orbit.meetings.v1"];
    const before = keys.map((k) => localStorage.getItem(k));
    const alias = OrbitTeachingProfiles.read("khaled"), direct = OrbitTeachingProfiles.read("teacher@orbit.com");
    return { alias, direct, unknown: OrbitTeachingProfiles.read("unrelated@demo.test"), unchanged: JSON.stringify(before) === JSON.stringify(keys.map((k) => localStorage.getItem(k))) };
  });
  expect(result.alias).toEqual(result.direct);
  expect(result.alias.channels.map((c) => c.id)).toEqual(["physics", "audit-public", "audit-joined"]);
  expect(Object.keys(result.alias).sort()).toEqual(["channels", "name", "subjects"]);
  expect(result.alias.subjects).not.toContain("chemistry");
  expect(result.unknown).toBeNull(); expect(result.unchanged).toBe(true);
  expect(JSON.stringify(result.alias)).not.toMatch(/PRIVATE_|qualification|certificates|workSamples|contact|address|photo|roster|answer/);
  await expect(page.locator("main")).not.toContainText("PRIVATE_");
  await page.addScriptTag({ url: "/shared/recruitment-service.js" });
  expect(await page.evaluate(() => { try { OrbitRecruitment.portfolioForViewer("teacher@orbit.com"); return "ALLOWED"; } catch (e) { return e.message; } })).toBe("ROLE_DENIED");
  await page.goto("/teacher-profile/teaching-profile.html?id=unrelated%40demo.test");
  await expect(page.getByRole("status")).toContainText("Teaching profile unavailable");
});

test("H2 student links from channel cards, channel headers and the existing directory reach safe profiles", async ({ page }) => {
  await teaching(page);
  for (const route of ["/channels/channels.html", "/channel/channel.html?id=audit-public", "/teacher-directory/teacher-directory.html"]) {
    await page.goto(route);
    await expect(page.locator('#orbit-rail a[href*="teacher-directory"]')).toHaveCount(0);
    const link = page.locator('a[href*="teacher-profile.html?id="]:visible').first();
    await expect(link).toBeVisible();
    if (route.includes("teacher-directory")) {
      await expect(page.locator("main")).not.toContainText("PRIVATE_");
      await expect(page.locator("#teacher-exp")).toBeHidden();
    }
    await link.click();
    await expect(page).toHaveURL(/\/teacher-profile\/teaching-profile\.html/);
    await expect(page.locator(".teaching-channel-list")).toBeVisible();
    await expect(page.locator("main")).not.toContainText("PRIVATE_");
    await page.locator('.teaching-channel-list a[href*="id=physics"]').click();
    await expect(page).toHaveURL(/\/channel\/channel\.html\?id=physics/);
  }
});

test("H2 teacher and school portfolio permissions remain intact, including direct safe-page URLs", async ({ page }) => {
  await teaching(page);
  await login(page, "teacher");
  await page.goto("/teacher-profile/teacher-profile.html?id=teacher%40orbit.com");
  await expect(page.locator("#recruit-profile")).toContainText("PRIVATE_QUALIFICATION");
  await page.goto("/teacher-profile/teaching-profile.html?id=teacher%40orbit.com");
  await expect(page).toHaveURL(/\/teacher-profile\/teacher-profile\.html/);
  await expect(page.locator("#recruit-profile")).toBeVisible();
  await page.goto("/teacher-profile/teacher-profile.html?id=unrelated%40demo.test");
  await expect(page.locator("#recruit-profile")).toHaveCount(0);
  await login(page, "school");
  await page.goto("/teacher-profile/teacher-profile.html?id=teacher%40orbit.com");
  await expect(page.locator("#recruit-profile")).toHaveCount(0);
  await expect(page.locator("#orbit-page")).not.toContainText("PRIVATE_QUALIFICATION");
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("orbit.profiles.v1"));
    Object.assign(db.records["teacher@orbit.com"], { available: true, shareWithSchools: true });
    localStorage.setItem("orbit.profiles.v1", JSON.stringify(db));
  });
  await page.goto("/teacher-profile/teaching-profile.html?id=teacher%40orbit.com");
  await expect(page).toHaveURL(/\/teacher-profile\/teacher-profile\.html/);
  await expect(page.locator("#recruit-profile")).toContainText("PRIVATE_QUALIFICATION");
  await expect(page.locator("#recruit-profile")).not.toContainText("PRIVATE_CV");
  await page.evaluate(() => {
    const d = OrbitRecruitment.data();
    d.applications.push({ id: "foreign-application", schoolId: "another@school.test", teacherId: "teacher@orbit.com", profile: { name: "FOREIGN_PRIVATE_SNAPSHOT" } });
    localStorage.setItem("orbit.recruitment.v1", JSON.stringify(d));
  });
  await page.goto("/teacher-profile/teacher-profile.html?id=teacher%40orbit.com&application=foreign-application");
  await expect(page.locator("#recruit-profile")).toHaveCount(0);
  await expect(page.locator("#orbit-page")).not.toContainText("FOREIGN_PRIVATE_SNAPSHOT");
});

test("H2 safe teaching profiles support Arabic, English, themes and mobile navigation", async ({ page }) => {
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await teaching(page);
  await page.goto("/teacher-profile/teacher-profile.html?id=khaled");
  await expect(page).toHaveURL(/teaching-profile\.html/);
  for (const lang of ["en", "ar"]) {
    if (await page.locator("html").getAttribute("lang") !== lang) await page.locator("#orbit-language-button").click();
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((v) => OrbitThemePreference.save(v), theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await expect(page.locator("main")).not.toContainText("PRIVATE_");
        if (width === 390) {
          await page.locator("#orbit-mobile-toggle").click();
          await expect(page.locator('#orbit-rail a[href*="channels/channels.html"]')).toBeVisible();
          await expect(page.locator('#orbit-rail a[href*="teacher-directory"]')).toHaveCount(0);
          await page.keyboard.press("Escape");
        }
        await page.screenshot({ path: path.join(os.tmpdir(), `orbit-h2-${lang}-${theme}-${width}.png`), fullPage: true });
      }
    }
  }
  expect(errors).toEqual([]);
});
