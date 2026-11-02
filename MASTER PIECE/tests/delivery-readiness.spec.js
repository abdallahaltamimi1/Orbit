import { test, expect } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const publicRoutes = [
  "/hompage/hompage.html",
  "/about/about.html",
  "/contact/contact.html",
  "/login/login.html",
  "/registration/registration.html",
  "/school-login/school-login.html",
  "/school-registration/school-registration.html",
  "/pricing/pricing.html",
];

const roles = [
  ["student", "/student-dashboard/student-dashboard.html"],
  ["teacher", "/teacher-dashboard/teacher-dashboard.html"],
  ["school", "/school-dashboard/school-dashboard.html"],
];

async function signIn(page, role) {
  await page.goto("/login/login.html");
  await page.locator(`[data-user="${role}"]`).click();
  await page.locator("#loginButton").click();
  const destination = roles.find(([item]) => item === role)[1];
  await page.waitForURL(`**${destination}`);
  await expect(page.locator("#orbit-page")).toBeVisible();
}

async function signOut(page) {
  await page.locator("#orbit-logout").click();
  await page.waitForURL("**/login/login.html");
}

async function switchLanguage(page, language) {
  if (await page.locator("html").getAttribute("lang") !== language) {
    await page.locator("#orbit-language-button").click();
    await expect(page.locator("html")).toHaveAttribute("lang", language);
  }
}

async function signInCredentials(page, email, password) {
  await page.goto("/login/login.html");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#loginButton").click();
  const destination = email.includes("teacher")
    ? "/teacher-dashboard/teacher-dashboard.html"
    : "/student-dashboard/student-dashboard.html";
  await page.waitForURL(`**${destination}`);
  await expect(page.locator("#orbit-page")).toBeVisible();
}

function localDate(offsetDays = 2) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

test("public pages load without fatal JavaScript errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  for (const route of publicRoutes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBeLessThan(400);
    await expect(page.locator("#orbit-page"), route).toBeAttached();
    const links = await page.locator("a[href]").evaluateAll((items) =>
      items.map((item) => item.href).filter((href) => {
        const link = new URL(href);
        return link.origin === location.origin && (link.pathname !== location.pathname || link.search);
      }),
    );
    for (const href of new Set(links)) {
      const linkedPage = await page.request.get(href);
      expect(linkedPage.status(), `${route} links to ${href}`).toBeLessThan(400);
    }
  }

  expect(errors).toEqual([]);
});

test("Free School monthly job publication cap preserves drafts and school-only pricing", async ({ page, browser }) => {
  await signIn(page, "school");
  await page.evaluate(() => window.OrbitThemePreference.save("light"));
  await page.setViewportSize({ width: 1440, height: 900 });
  const planConfig = await page.evaluate(() => ({
    starter: window.OrbitPlanConfig.plans["school-starter"],
    pro: window.OrbitPlanConfig.plans["school-pro"],
    status: window.OrbitSubscriptions.effective().record.status,
  }));
  expect(planConfig.starter.name).toBe("Free School");
  expect(planConfig.starter.limits.jobs).toBe(3);
  expect(planConfig.starter.trialDays).toBeUndefined();
  expect(planConfig.status).toBe("active");
  expect(planConfig.pro.price).toBeNull();
  expect(planConfig.pro.limits.jobs).toBe(100);
  const compatibility = await page.evaluate(() => {
    const context = window.OrbitSubscriptions.effective(),
      stored = JSON.parse(localStorage.getItem("orbit.subscriptions.v1")),
      record = stored.records[context.scopeId];
    record.status = "expired";
    record.trialExpiration = "2000-01-01T00:00:00.000Z";
    record.usage.jobs = 7;
    record.events.push({ id: "job:legacy-draft", resource: "jobs", at: new Date().toISOString() });
    localStorage.setItem("orbit.subscriptions.v1", JSON.stringify(stored));
    const refreshed = window.OrbitSubscriptions.effective();
    return {
      status: refreshed.record.status,
      legacyEventRetained: refreshed.record.events.some((event) => event.id === "job:legacy-draft"),
      usage: window.OrbitSubscriptions.usage("jobs", refreshed),
    };
  });
  expect(compatibility).toEqual({ status: "active", legacyEventRetained: true, usage: 0 });

  async function saveDraft(title) {
    await page.locator("#new-job").click();
    await page.locator('#job-form [name="title"]').fill(title);
    await page.locator('#job-form [name="location"]').fill("Amman");
    await page.locator('#job-form [name="experience"]').fill("0");
    await page.locator('#job-form button[type="submit"], #job-form button:not([type])').click();
    return page.evaluate((jobTitle) =>
      window.OrbitRecruitment.ownJobs().find((job) => job.title === jobTitle)?.id,
    title);
  }

  async function publish(jobId) {
    await page.locator(`[data-job-status="${jobId}"]`).click();
    await page.locator("#confirm-action").click();
  }

  const titles = ["ORBIT cap check 1", "ORBIT cap check 2", "ORBIT cap check 3"];
  for (const title of titles) {
    const id = await saveDraft(title);
    expect(id).toBeTruthy();
    await publish(id);
    await expect.poll(() => page.evaluate((jobId) =>
      window.OrbitRecruitment.ownJobs().find((job) => job.id === jobId)?.status,
    id)).toBe("published");
  }
  const fourthId = await saveDraft("ORBIT cap check draft 4");
  expect(fourthId).toBeTruthy();
  await page.locator(`[data-edit-job="${fourthId}"]`).click();
  await page.locator('#job-form [name="title"]').fill("ORBIT cap check draft 4 edited");
  await page.locator('#job-form button[type="submit"], #job-form button:not([type])').click();
  await expect.poll(() => page.evaluate((jobId) =>
    window.OrbitRecruitment.ownJobs().find((job) => job.id === jobId)?.title,
  fourthId)).toBe("ORBIT cap check draft 4 edited");
  await publish(fourthId);
  await expect(page.locator("#orbit-access-dialog")).toContainText("نشر حتى 3 فرص تدريس شهريًا");
  await expect.poll(() => page.evaluate(() => window.OrbitSubscriptions.usage("jobs"))).toBe(3);
  await page.locator("#orbit-access-dialog .orbit-dialog-close").click();
  await page.reload();
  await switchLanguage(page, "en");
  await publish(fourthId);
  await expect(page.locator("#orbit-access-dialog")).toContainText("up to 3 published job opportunities per month");
  await expect.poll(() => page.evaluate(() => window.OrbitSubscriptions.usage("jobs"))).toBe(3);
  await page.locator("#orbit-access-dialog .orbit-dialog-close").click();
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.OrbitSubscriptions.usage("jobs"))).toBe(3);
  expect(await page.evaluate((jobId) =>
    window.OrbitRecruitment.ownJobs().find((job) => job.id === jobId)?.status,
  fourthId)).toBe("draft");

  await page.goto("/pricing/pricing.html");
  await expect(page.locator(".orbit-plan-card:visible")).toHaveCount(2);
  await expect(page.locator(".orbit-plan-card")).toContainText(["Free School", "School Pro"]);
  await expect(page.locator(".orbit-usage-grid")).toContainText("Job posts / month");
  await expect(page.locator(".orbit-usage-grid")).not.toContainText(/Classes|School students|School teachers/);
  const schoolPlanCopy = await page.locator(".orbit-plan-card").allTextContents();
  expect(schoolPlanCopy.join(" ")).not.toMatch(/Classes|School students|School teachers/);

  const publicPage = await browser.newPage();
  await publicPage.goto("/pricing/pricing.html");
  await expect(publicPage.locator(".orbit-plan-card:visible")).toHaveCount(2);
  await expect(publicPage.locator("[data-plan-audience=" + '"teacher"' + "]")).toHaveAttribute("aria-pressed", "true");
  await expect(publicPage.locator(".orbit-plan-card:visible")).toContainText(["Teacher Free", "Teacher Pro"]);
  await publicPage.locator('[data-plan-audience="school"]').click();
  await expect(publicPage.locator(".orbit-plan-card:visible")).toHaveCount(2);
  await expect(publicPage.locator(".orbit-plan-card:visible")).toContainText(["Free School", "School Pro"]);
  await publicPage.close();

  await switchLanguage(page, "ar");
  await page.evaluate(() => window.OrbitThemePreference.save("dark"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".orbit-usage-grid")).toContainText("وظائف / شهر");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

for (const [role, destination] of roles) {
  test(`${role} demo login opens its own workspace and navigation`, async ({ page }) => {
    await signIn(page, role);
    await expect(page).toHaveURL(new RegExp(destination.replaceAll("/", "\\/")));
    await expect(page.locator(".orbit-rail")).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("orbitUser") || "{}").role)).toBe(role);

    const links = await page.locator(".orbit-rail a[href]").evaluateAll((items) =>
      items.map((item) => item.href).filter((href) => new URL(href).origin === location.origin && !href.includes("#")),
    );
    expect(links.length).toBeGreaterThan(2);
    for (const href of links) {
      const response = await page.request.get(href);
      expect(response.status(), href).toBeLessThan(400);
    }
  });
}

test("language and theme preferences survive refresh", async ({ page }) => {
  await signIn(page, "student");
  const languageButton = page.locator("#orbit-language-button");
  await languageButton.click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.locator('[data-action="theme"]').click();
  const chosen = await page.evaluate(() => JSON.parse(localStorage.getItem("orbit.settings.appearance") || "null"));
  expect(["light", "dark"]).toContain(chosen);
  const displayedTheme = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", displayedTheme);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("orbit.settings.appearance") || "null"))).toBe(chosen);
});

test("representative role pages have no mobile horizontal overflow", async ({ page }) => {
  test.setTimeout(120_000);
  const sampleRoutes = [
    ["student", "/student-dashboard/student-dashboard.html"],
    ["student", "/channels/channels.html"],
    ["teacher", "/teacher-dashboard/teacher-dashboard.html"],
    ["teacher", "/teacher-profile/teacher-profile.html"],
    ["school", "/school-dashboard/school-dashboard.html"],
    ["school", "/teacher-directory/teacher-directory.html"],
  ];

  for (const [role, route] of sampleRoutes) {
    await signIn(page, role);
    await page.goto(route);
    for (const language of ["ar", "en"]) {
      await page.setViewportSize({ width: 1440, height: 844 });
      await switchLanguage(page, language);
      for (const theme of ["light", "dark"]) {
        await page.evaluate((appearance) => window.OrbitThemePreference.save(appearance), theme);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        for (const width of [1440, 1024, 768, 390, 320]) {
          await page.setViewportSize({ width, height: 844 });
          const dimensions = await page.evaluate(() => ({
            width: innerWidth,
            document: document.documentElement.scrollWidth,
            body: document.body.scrollWidth,
          }));
          expect(dimensions.document, `${role} ${route} ${language} ${theme} at ${width}px`).toBeLessThanOrEqual(width);
          expect(dimensions.body, `${role} ${route} ${language} ${theme} at ${width}px`).toBeLessThanOrEqual(width);
        }
      }
    }
    await page.goto(roles.find(([item]) => item === role)[1]);
    await switchLanguage(page, "ar");
    await page.evaluate(() => window.OrbitThemePreference.save("light"));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(os.tmpdir(), `orbit-${role}-desktop.png`), fullPage: true });
    await switchLanguage(page, "en");
    await page.evaluate(() => window.OrbitThemePreference.save("dark"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(os.tmpdir(), `orbit-${role}-mobile-dark.png`), fullPage: true });
    await page.evaluate(() => window.OrbitThemePreference.save("light"));
    await page.setViewportSize({ width: 1440, height: 900 });
    await signOut(page);
  }
});

test("teacher publishing, student submission, teacher review, and student feedback", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const title = `ORBIT QA assignment ${Date.now()}`;
  const answer = "Disposable automated test response.";
  const feedback = "ORBIT QA feedback saved.";

  await signIn(page, "teacher");
  await page.locator('button[data-action="compose"]:visible').last().click();
  const editor = page.locator("dialog[open] form");
  await editor.locator('select[name="channel"]').selectOption("9b");
  await editor.locator('select[name="type"]').selectOption("assignment");
  await editor.locator('input[name="title"]').fill(title);
  await editor.locator('textarea[name="body"]').fill("Submit a short response for this isolated test.");
  await page.locator(".orbit-next").click();
  await page.locator(".orbit-next").click();
  await page.locator('dialog[open] button[type="submit"]:visible').click();

  const assignmentId = await page.evaluate(() => JSON.parse(localStorage.getItem("orbit.channels.v2") || "{}").posts?.find((post) => post.title.startsWith("ORBIT QA assignment "))?.id);
  expect(assignmentId).toBeTruthy();
  await signOut(page);

  await signIn(page, "student");
  await page.goto("/channels/channels.html");
  await page.locator("#join-code").click();
  const joinDialog = page.locator("dialog[open]");
  await joinDialog.locator('input[name="code"]').fill("ORBIT9B");
  await joinDialog.locator('button[type="submit"]').click();
  await page.waitForURL("**/channel/channel.html?id=9b");
  await page.locator('[data-section="assignments"]').click();
  const assignmentCard = page.locator(`[data-post="${assignmentId}"]`);
  await expect(assignmentCard).toContainText(title);
  await assignmentCard.locator("[data-assignment-submit]").click();
  const submitDialog = page.locator("#assignment-dialog");
  await submitDialog.locator('textarea[name="answer"]').fill(answer);
  await submitDialog.locator('button[type="submit"]').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("orbit.assignments.v1") || "{}").submissions?.some((item) => item.studentId === "student@orbit.com" && item.answer === "Disposable automated test response."))).toBe(true);
  await signOut(page);

  await signIn(page, "teacher");
  await page.goto("/channel/channel.html?id=9b");
  await page.locator('[data-section="assignments"]').click();
  await page.locator(`[data-post="${assignmentId}"] [data-assignment-review-list]`).click();
  const reviewList = page.locator("#assignment-dialog");
  await reviewList.locator("[data-assignment-review]").click();
  const reviewDialog = page.locator("#assignment-dialog");
  await reviewDialog.locator('textarea[name="feedback"]').fill(feedback);
  await reviewDialog.locator('button[type="submit"]').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("orbit.assignments.v1") || "{}").submissions?.some((item) => item.review?.feedback === "ORBIT QA feedback saved."))).toBe(true);
  await signOut(page);

  await signIn(page, "student");
  await page.goto(`/channel/channel.html?id=9b&section=assignments&post=${encodeURIComponent(assignmentId)}`);
  await page.locator('[data-section="assignments"]').click();
  await expect(page.locator(`[data-post="${assignmentId}"]`)).toContainText(feedback);
  expect(errors).toEqual([]);
});

test("school, teacher, and student navigation remain role separated", async ({ page }) => {
  await signIn(page, "teacher");
  await expect(page.locator('.orbit-rail a[href*="teacher-directory"]')).toHaveCount(0);
  await expect(page.locator('.orbit-rail a[href*="jobs/jobs.html"]')).toHaveCount(1);
  await signOut(page);

  await signIn(page, "school");
  await expect(page.locator("#orbit-page")).toContainText("مركز التوظيف");
  await expect(page.locator("#orbit-page")).toContainText("اكتشاف المعلمين");
  await signOut(page);

  await signIn(page, "student");
  await page.goto("/teacher-profile/teacher-profile.html?id=teacher%40orbit.com");
  await expect(page).toHaveURL(/teacher-profile\/teaching-profile\.html/);
  await expect(page.locator(".teaching-profile")).toBeVisible();
  await expect(page.locator('#orbit-rail a[href*="teacher-directory"]')).toHaveCount(0);
});

test("teacher group meetings reach only actual group members and updates persist", async ({ page }) => {
  const title = `ORBIT QA group meeting ${Date.now()}`;
  await signIn(page, "teacher");
  await page.goto("/teacher-dashboard/teacher-dashboard.html#meetings-section");
  await page.locator("[data-meeting-demo]").click();
  const setup = page.locator("#meeting-dialog");
  await setup.locator("[data-initialize-demo]").click();
  await expect(setup.locator("#meeting-demo-result")).toContainText("meetings.teacher@demo.orbit.local");
  await setup.locator("[data-close-dialog]").click();
  await signOut(page);

  await signInCredentials(page, "meetings.teacher@demo.orbit.local", "OrbitMeet2026!");
  await page.goto("/teacher-dashboard/teacher-dashboard.html#meetings-section");
  await page.locator("[data-new-meeting]").click();
  const form = page.locator("#meeting-form");
  await form.locator('[name="title"]').fill(title);
  await form.locator('[name="subject"]').fill("Physics");
  await form.locator('[name="description"]').fill("Disposable group-targeting test.");
  await form.locator('[name="channelId"]').selectOption("meeting-demo-physics");
  await form.locator('[name="date"]').fill(localDate());
  await form.locator('[name="start"]').fill("10:00");
  await form.locator('[name="end"]').fill("10:45");
  await form.locator('[name="audienceMode"]').selectOption("group");
  await form.locator('[name="groupId"]').selectOption("meeting-demo-group-a");
  await form.locator('button[type="submit"]').click();

  const meeting = await page.evaluate((meetingTitle) => {
    const db = JSON.parse(localStorage.getItem("orbit.meetings.v1") || "{}");
    return db.meetings.find((item) => item.title === meetingTitle);
  }, title);
  expect(meeting?.recipientIds.sort()).toEqual([
    "meetings.lina@demo.orbit.local",
    "meetings.omar@demo.orbit.local",
  ]);
  await page.locator(`[data-meeting-edit="${meeting.id}"]`).click();
  const editMeetingForm = page.locator("#meeting-form");
  await editMeetingForm.locator('[name="date"]').fill(localDate(4));
  await editMeetingForm.locator('[name="start"]').fill("11:00");
  await editMeetingForm.locator('[name="end"]').fill("11:45");
  await editMeetingForm.locator('button[type="submit"]').click();
  const rescheduledRecord = await page.evaluate((meetingId) => JSON.parse(localStorage.getItem("orbit.meetings.v1") || "{}").meetings.find((item) => item.id === meetingId), meeting.id);
  expect(rescheduledRecord.startAt).not.toBe(meeting.startAt);

  await signOut(page);
  await signInCredentials(page, "meetings.lina@demo.orbit.local", "OrbitMeet2026!");
  await page.goto("/student-dashboard/student-dashboard.html#meetings-section");
  await expect(page.locator("#orbit-page")).toContainText(title);
  expect(await page.evaluate((meetingId) => window.OrbitMeetings.visible().find((item) => item.id === meetingId)?.startAt, meeting.id)).toBe(rescheduledRecord.startAt);
  await page.reload();
  await expect(page.locator("#orbit-page")).toContainText(title);
  await signOut(page);

  await signInCredentials(page, "meetings.sara@demo.orbit.local", "OrbitMeet2026!");
  await page.goto("/student-dashboard/student-dashboard.html#meetings-section");
  await expect(page.locator("#orbit-page")).not.toContainText(title);
  await signOut(page);

  await signInCredentials(page, "meetings.teacher@demo.orbit.local", "OrbitMeet2026!");
  await page.goto("/teacher-dashboard/teacher-dashboard.html#meetings-section");
  page.on("dialog", (dialog) => dialog.accept());
  await page.locator(`[data-meeting-cancel="${meeting.id}"]`).click();
  await expect.poll(() => page.evaluate((meetingId) => JSON.parse(localStorage.getItem("orbit.meetings.v1") || "{}").meetings.find((item) => item.id === meetingId)?.status, meeting.id)).toBe("cancelled");
  const cancelled = await page.evaluate((meetingId) => JSON.parse(localStorage.getItem("orbit.meetings.v1") || "{}").meetings.find((item) => item.id === meetingId), meeting.id);
  expect(cancelled.recipientIds.sort()).toEqual(meeting.recipientIds.sort());
  await signOut(page);
  await signInCredentials(page, "meetings.lina@demo.orbit.local", "OrbitMeet2026!");
  expect(await page.evaluate((meetingId) => window.OrbitMeetings.visible().find((item) => item.id === meetingId)?.status, meeting.id)).toBe("cancelled");
});

test("School opportunity application interview and decision flow uses linked records", async ({ page }) => {
  const title = `ORBIT QA recruitment ${Date.now()}`;
  await signIn(page, "teacher");
  await page.goto("/account-profile/account-profile.html#profile-professional");
  const profile = page.locator("#account-profile-form");
  await profile.locator('[name="qualification"]').fill("QA test qualification");
  await profile.locator('[name="bio"]').fill("Disposable local recruitment test profile.");
  await profile.locator('[name="available"]').check();
  await profile.locator('[name="shareWithSchools"]').check();
  await profile.locator('#save-profile').click();
  await expect(page.locator("#profile-status")).toContainText(/saved|انحفظ/i);

  await signOut(page);
  await signIn(page, "school");
  await page.locator("#new-job").click();
  const jobForm = page.locator("#job-form");
  await jobForm.locator('[name="title"]').fill(title);
  await jobForm.locator('[name="subject"]').selectOption("physics");
  await jobForm.locator('[name="location"]').fill("Amman");
  await jobForm.locator('[name="experience"]').fill("0");
  await jobForm.locator('[name="qualifications"]').fill("QA test qualification");
  await jobForm.locator('button[type="submit"]').click();
  const jobId = await page.evaluate((jobTitle) => JSON.parse(localStorage.getItem("orbit.recruitment.v1") || "{}").jobs?.find((item) => item.title === jobTitle)?.id, title);
  expect(jobId).toBeTruthy();
  await page.locator(`[data-job-status="${jobId}"]`).click();
  await page.locator("#confirm-action").click();
  await expect.poll(() => page.evaluate((id) => JSON.parse(localStorage.getItem("orbit.recruitment.v1") || "{}").jobs?.find((item) => item.id === id)?.status, jobId)).toBe("published");
  await page.goto(`/school-dashboard/school-dashboard.html?tab=discover&job=${encodeURIComponent(jobId)}`);
  await expect(page.locator("#orbit-page")).toContainText("Sarah Teacher");
  await expect(page.locator("#orbit-page")).toContainText("QA test qualification");
  await page.locator('a[href*="teacher-profile/teacher-profile.html"]').first().click();
  await expect(page).toHaveURL(/teacher-profile\/teacher-profile\.html/);
  await expect(page.locator("#orbit-page")).toContainText("Disposable local recruitment test profile.");

  await signOut(page);
  await signIn(page, "teacher");
  await page.goto("/jobs/jobs.html");
  await expect(page.locator("#orbit-page")).toContainText(title);
  await page.locator(`a[href*="id=${jobId}"]`).click();
  await expect(page.locator("#orbit-page")).toContainText(title);
  await page.locator("#apply").click();
  const applicationForm = page.locator("#apply-form");
  await applicationForm.locator('[name="message"]').fill("Disposable test application.");
  await applicationForm.locator('[name="consent"]').check();
  await applicationForm.locator('button[type="submit"]').click();
  const application = await page.evaluate((jobTitle) => {
    const db = JSON.parse(localStorage.getItem("orbit.recruitment.v1") || "{}");
    const job = db.jobs.find((item) => item.title === jobTitle);
    return db.applications.find((item) => item.jobId === job?.id && item.teacherId === "teacher@orbit.com");
  }, title);
  expect(application?.status).toBe("pending");
  expect(application?.schoolId).toBe("school@orbit.com");

  await signOut(page);
  await signIn(page, "school");
  await page.goto("/school-dashboard/school-dashboard.html?tab=applications");
  await expect(page.locator("#orbit-page")).toContainText(title);
  const applicant = page.locator(`[data-review="${application.id}"]`);
  await applicant.click();
  await page.locator("#schedule-from-review").click();
  const interviewForm = page.locator("#meeting-form");
  const date = localDate(3);
  await interviewForm.locator('[name="date"]').fill(date);
  await interviewForm.locator('[name="start"]').fill("10:00");
  await interviewForm.locator('[name="end"]').fill("10:30");
  await interviewForm.locator('button[type="submit"]').click();
  await expect.poll(() => page.evaluate((id) => JSON.parse(localStorage.getItem("orbit.recruitment.v1") || "{}").applications?.find((item) => item.id === id)?.status, application.id)).toBe("interview_scheduled");
  const interview = await page.evaluate((appId) => JSON.parse(localStorage.getItem("orbit.meetings.v1") || "{}").meetings?.find((item) => item.applicationId === appId), application.id);
  expect(interview?.schoolId).toBe("school@orbit.com");
  expect(interview?.teacherId).toBe("teacher@orbit.com");
  expect(interview?.jobId).toBe(jobId);

  await page.goto("/school-dashboard/school-dashboard.html?tab=interviews");
  await expect(page.locator("#orbit-page")).toContainText(title);
  await signOut(page);

  await signIn(page, "teacher");
  await page.goto("/applications/applications.html");
  await expect(page.locator("#orbit-page")).toContainText(title);
  await expect(page.locator("#orbit-page")).toContainText("مقابلة");
  await signOut(page);

  await signIn(page, "school");
  await page.goto("/school-dashboard/school-dashboard.html#meetings-section");
  await page.locator(`[data-meeting-edit="${interview.id}"]`).click();
  const rescheduleForm = page.locator("#meeting-form");
  await rescheduleForm.locator('[name="type"]').selectOption("interview-in-person");
  await rescheduleForm.locator('[name="location"]').fill("ORBIT QA interview room");
  await rescheduleForm.locator('button[type="submit"]').click();
  const inPerson = await page.evaluate((id) => JSON.parse(localStorage.getItem("orbit.meetings.v1") || "{}").meetings?.find((item) => item.id === id), interview.id);
  expect(inPerson.type).toBe("interview-in-person");
  expect(inPerson.location).toBe("ORBIT QA interview room");
  expect(inPerson.externalUrl).toBe("");
  await signOut(page);

  await signIn(page, "student");
  await page.goto("/student-dashboard/student-dashboard.html#meetings-section");
  await expect(page.locator("#orbit-page")).not.toContainText(title);
  await signOut(page);

  await signIn(page, "teacher");
  await page.goto("/applications/applications.html");
  await expect(page.locator("#orbit-page")).toContainText("ORBIT QA interview room");
  await signOut(page);

  await signIn(page, "school");
  await page.goto("/school-dashboard/school-dashboard.html?tab=interviews");
  await page.locator(`[data-cancel-interview="${interview.id}"]`).click();
  await page.locator("#confirm-action").click();
  await expect.poll(() => page.evaluate((id) => JSON.parse(localStorage.getItem("orbit.recruitment.v1") || "{}").applications?.find((item) => item.id === id)?.status, application.id)).toBe("pending");
  await page.goto("/school-dashboard/school-dashboard.html?tab=applications");
  await page.locator(`[data-review="${application.id}"]`).click();
  await page.locator("#hub-review-status").selectOption("accepted");
  await page.locator("#hub-save-status").click();
  await signOut(page);

  await signIn(page, "teacher");
  await page.goto("/applications/applications.html");
  await expect(page.locator(`[data-application="${application.id}"]`)).toContainText("مقبول");
  expect(await page.evaluate((id) => JSON.parse(localStorage.getItem("orbit.recruitment.v1") || "{}").applications?.find((item) => item.id === id)?.status, application.id)).toBe("accepted");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("orbit.meetings.v1") || "{}").meetings?.some((item) => item.kind === "recruitment-interview"))).toBe(true);
});

test("School Recruitment colors and opportunity modal remain usable in both themes and directions", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, "school");
  await page.goto("/school-dashboard/school-dashboard.html");

  for (const language of ["ar", "en"]) {
    await switchLanguage(page, language);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((appearance) => window.OrbitThemePreference.save(appearance), theme);
      await page.waitForTimeout(220);
      for (const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 820 });
        await page.mouse.move(0, 0);

        const tokens = await page.evaluate(() => {
          const style = getComputedStyle(document.getElementById("orbit-page"));
          const resolvedBackground = (token) => {
            const probe = document.createElement("span");
            probe.style.backgroundColor = `var(${token})`;
            document.body.append(probe);
            const value = getComputedStyle(probe).backgroundColor;
            probe.remove();
            return value;
          };
          const soft = resolvedBackground("--orbit-soft");
          const empty = document.querySelector(".empty");
          return {
            soft,
            emptyBackground: empty ? getComputedStyle(empty).backgroundColor : "",
              direction: document.documentElement.dir,
            tabs: [...document.querySelectorAll(".recruit-tabs [data-tab]")].map((tab) => ({
              current: tab.getAttribute("aria-current"),
              background: getComputedStyle(tab).backgroundColor,
              color: getComputedStyle(tab).color,
            })),
            noOverflow: document.documentElement.scrollWidth <= innerWidth,
          };
        });
        expect(tokens.noOverflow, `${language}/${theme}/${width}px`).toBe(true);
        expect(tokens.direction).toBe(language === "ar" ? "rtl" : "ltr");
        expect(tokens.emptyBackground).toBe(theme === "dark" ? "rgb(18, 61, 48)" : "rgb(236, 253, 245)");
        expect(tokens.emptyBackground).toBe(tokens.soft);
        expect(tokens.tabs).toHaveLength(4);
        for (const tab of tokens.tabs) {
          const channel = (value) => {
            const rgb = value.match(/[\d.]+/g).slice(0, 3).map(Number).map((part) => {
              const normalized = part / 255;
              return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
          };
          const [lighter, darker] = [channel(tab.color), channel(tab.background)].sort((a, b) => b - a);
          expect((lighter + 0.05) / (darker + 0.05), `${language}/${theme}/${width}px tab colors ${tab.color} on ${tab.background}`).toBeGreaterThanOrEqual(4.5);
        }

        const mutedTab = page.locator('.recruit-tabs [aria-current="false"]').first();
        await mutedTab.hover();
        await page.waitForTimeout(180);
        const hoverColor = await mutedTab.evaluate((node) => getComputedStyle(node).backgroundColor);
        const expectedHover = await page.evaluate(() => {
          const probe = document.createElement("span");
          probe.style.backgroundColor = "var(--orbit-hover)";
          document.body.append(probe);
          const value = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return value;
        });
        expect(hoverColor).toBe(expectedHover);

        await page.locator("#new-job").hover();
        await page.waitForTimeout(180);
        const primaryHover = await page.locator("#new-job").evaluate((node) => getComputedStyle(node).backgroundColor);
        const expectedActionHover = await page.evaluate(() => {
          const probe = document.createElement("span");
          probe.style.backgroundColor = "var(--orbit-action-hover)";
          document.body.append(probe);
          const value = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return value;
        });
        expect(primaryHover).toBe(expectedActionHover);

        await page.locator("#new-job").click();
        const dialog = page.locator("#editor.job-opportunity-dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('[name="title"]')).toBeVisible();
        await expect(dialog.locator('button[type="submit"]')).toBeVisible();
        expect(await dialog.locator("#job-form").evaluate((form) => !form.checkValidity())).toBe(true);
        const geometry = await dialog.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const close = node.querySelector(".close").getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            clientHeight: node.clientHeight,
            scrollHeight: node.scrollHeight,
            closeLeft: close.left,
            closeRight: close.right,
          };
        });
        expect(geometry.left, `modal left ${width}px`).toBeGreaterThanOrEqual(0);
        expect(geometry.right, `modal right ${width}px`).toBeLessThanOrEqual(width);
        expect(geometry.top).toBeGreaterThanOrEqual(0);
        expect(geometry.bottom).toBeLessThanOrEqual(820);
        expect(geometry.closeLeft).toBeGreaterThanOrEqual(geometry.left);
        expect(geometry.closeRight).toBeLessThanOrEqual(geometry.right);
        expect(geometry.scrollHeight).toBeGreaterThanOrEqual(geometry.clientHeight);

        const close = dialog.getByRole("button", { name: /close dialog|إغلاق النافذة/i });
        await close.focus();
        await page.keyboard.press("Tab");
        expect(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle)).not.toBe("none");
        await close.click();
        await expect(dialog).toBeHidden();
      }
    }
  }
});

test("pricing presentation separates teacher and school plans without changing plan actions", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/hompage/hompage.html");
  await page.locator('a[href="../pricing/pricing.html"]').first().click();
  await page.waitForURL("**/pricing/pricing.html");

  const grid = page.locator("#orbit-pricing-grid");
  const visiblePlanNames = () => grid.locator(".orbit-plan-card:not([hidden]) h2").allTextContents();
  const planIds = () => grid.locator(".orbit-plan-card:not([hidden])").evaluateAll((cards) => cards.map((card) => card.dataset.planId));

  await expect(grid).toHaveAttribute("data-pricing-role", "public");
  await expect(grid.locator(".orbit-plan-card")).toHaveCount(4);
  await expect(page.locator("[data-plan-audience]")).toHaveCount(2);
  await expect(page.locator('[data-plan-audience="teacher"]')).toHaveAttribute("aria-pressed", "true");
  await expect.poll(visiblePlanNames).toEqual(["Teacher Free", "Teacher Pro"]);
  await expect.poll(planIds).toEqual(["teacher-free", "teacher-pro"]);
  await expect(grid.locator('[data-plan-id="teacher-pro"]')).toHaveClass(/pricing-recommended/);

  for (const language of ["ar", "en"]) {
    await switchLanguage(page, language);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((appearance) => window.OrbitThemePreference.save(appearance), theme);
      await page.waitForTimeout(220);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${language}/${theme}/${width}px overflow`).toBe(true);
        const cols = await grid.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length);
        expect(cols, `${width}px grid columns`).toBe(width < 521 ? 1 : 2);
      }
    }
  }

  await switchLanguage(page, "ar");
  await expect(page.locator('[data-plan-audience="teacher"]')).toHaveText("باقات المعلمين");
  await expect(page.locator('[data-plan-audience="teacher"]')).toHaveAttribute("aria-pressed", "true");
  await expect.poll(planIds).toEqual(["teacher-free", "teacher-pro"]);
  await switchLanguage(page, "en");

  await page.locator('[data-plan-audience="teacher"]').focus();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle)).not.toBe("none");
  await page.locator("[data-plan-audience=teacher]").click();
  await page.locator('[data-select-plan="teacher-pro"]').click();
  await expect(page.locator("#pricing-checkout")).toBeVisible();
  await expect(page.locator("#pricing-checkout")).toContainText("Teacher Pro");
  await expect(page.locator("#pricing-pay")).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("[data-plan-audience=school]").click();
  await expect.poll(visiblePlanNames).toEqual(["Free School", "School Pro"]);
  await expect.poll(planIds).toEqual(["school-starter", "school-pro"]);
  expect(await grid.locator('[data-plan-id="school-pro"]').evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  await expect(page.locator("#pricing-checkout")).toBeHidden();
  await expect(page.locator('[data-plan-audience="school"]')).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "school plans mobile overflow").toBe(true);
  await expect.poll(visiblePlanNames).toEqual(["Free School", "School Pro"]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-select-plan="school-pro"]').click();
  await expect(page.locator("#pricing-checkout")).toBeVisible();
  await expect(page.locator("#pricing-checkout")).toContainText("School Pro");
  await page.locator("[data-plan-audience=teacher]").click();
  await expect(page.locator("#pricing-checkout")).toBeHidden();
  await expect.poll(planIds).toEqual(["teacher-free", "teacher-pro"]);
  await page.locator("[data-plan-audience=school]").click();
  await expect.poll(planIds).toEqual(["school-starter", "school-pro"]);

  await signIn(page, "teacher");
  await page.goto("/pricing/pricing.html");
  await expect(page.locator("#orbit-pricing-grid")).toHaveAttribute("data-pricing-role", "teacher");
  await expect(page.locator("[data-plan-audience]")).toHaveCount(0);
  await expect(page.locator("#orbit-pricing-grid .orbit-plan-card")).toHaveCount(2);
  await expect.poll(visiblePlanNames).toEqual(["Teacher Free", "Teacher Pro"]);
  await expect.poll(planIds).toEqual(["teacher-free", "teacher-pro"]);
  await page.evaluate(() => window.OrbitAuth.logout());
  await page.waitForURL("**/login/login.html");

  await signIn(page, "school");
  await page.goto("/pricing/pricing.html");
  await expect(page.locator("#orbit-pricing-grid")).toHaveAttribute("data-pricing-role", "school");
  await expect(page.locator("[data-plan-audience]")).toHaveCount(0);
  await expect(page.locator("#orbit-pricing-grid .orbit-plan-card")).toHaveCount(2);
  await expect.poll(visiblePlanNames).toEqual(["Free School", "School Pro"]);
  await expect.poll(planIds).toEqual(["school-starter", "school-pro"]);
});
