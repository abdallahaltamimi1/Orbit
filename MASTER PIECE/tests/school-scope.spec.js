import { test, expect } from "@playwright/test";

async function fixture(page) {
  await page.goto("/login/login.html");
  await page.evaluate(() => {
    document.body.innerHTML = '<div id="app"><main></main></div>';
    document.body.className = "";
    window.scopeUser = { role: "school", email: "a@school.test" };
    const channels = [
      { id: "a", schoolId: "a@school.test", teacher: "linked@teacher.test", en: "School A", ar: "School A", private: true },
      { id: "b", schoolId: "b@school.test", teacher: "linked@teacher.test", en: "School B", ar: "School B" },
      { id: "personal", teacher: "linked@teacher.test", en: "Personal", ar: "Personal" },
      { id: "null", schoolId: null, teacher: "linked@teacher.test" },
      { id: "empty", schoolId: "", teacher: "linked@teacher.test" },
    ];
    const stores = {
      "orbit.channels.v2": { channels, posts: channels.map((c) => ({ id: `post-${c.id}`, channel: c.id, type: "assignment" })) },
      "orbit.memberships.v3": { "a@student.test": ["a"], "b@student.test": ["b"], "personal@student.test": ["personal"] },
      "orbit.assignments.v1": { submissions: [] },
    };
    window.OrbitAuth = { current: () => window.scopeUser, get: (key, fallback) => stores[key] ?? fallback };
    window.ORBIT = { channels: () => channels };
    window.OrbitProfiles = { read: (id) => ({ name: id }) };
    window.OrbitSubscriptions = {
      effective: () => ({ user: window.scopeUser, schoolId: window.scopeUser.email }),
      check: () => ({ allowed: true }),
      organizations: () => ({ schools: {
        "a@school.test": { teachers: [{ id: "linked@teacher.test", status: "active" }], students: [] },
        "b@school.test": { teachers: [], students: [] },
      } }),
      scopedChannels: () => { throw Error("Subscription scope must not be used for school monitoring"); },
    };
  });
  await page.addScriptTag({ url: "/shared/school-service.js" });
}

test("explicit school links isolate two schools and exclude a linked teacher's personal channels", async ({ page }) => {
  await fixture(page);
  expect(await page.evaluate(() => OrbitSchool.channels().map((c) => c.id))).toEqual(["a"]);
  await page.evaluate(() => { window.scopeUser.email = "b@school.test"; });
  expect(await page.evaluate(() => OrbitSchool.channels().map((c) => c.id))).toEqual(["b"]);
  await page.evaluate(() => { delete window.ORBIT; });
  expect(await page.evaluate(() => OrbitSchool.channels().map((c) => c.id))).toEqual(["b"]);
  for (const user of [null, { role: "teacher", email: "a@school.test" }, { role: "student", email: "a@school.test" }, { role: "school", email: "" }]) {
    await page.evaluate((value) => { window.scopeUser = value; }, user);
    expect(await page.evaluate(() => OrbitSchool.channels())).toEqual([]);
  }
});

test("monitoring derives channels, assignments and student roster from dedicated school scope", async ({ page }) => {
  await fixture(page);
  await page.addScriptTag({ url: "/school-dashboard/school-follow.js" });
  await expect(page.locator("#school-follow")).toContainText("1");
  const studentButton = page.locator('#school-follow [data-follow-view="students"]');
  await studentButton.click();
  await expect(page.locator("[data-follow-results]")).toContainText("a@student.test");
  await expect(page.locator("[data-follow-results]")).not.toContainText("b@student.test");
  await expect(page.locator("[data-follow-results]")).not.toContainText("personal@student.test");
  expect(await page.locator("[data-follow-channel] option").evaluateAll((items) => items.map((item) => item.value))).toEqual(["", "a"]);
  await page.evaluate(() => {
    window.scopeUser.email = "b@school.test";
    window.dispatchEvent(new Event("orbit:subscription-change"));
  });
  await expect(page.locator("[data-follow-results]")).toContainText("b@student.test");
  await expect(page.locator("[data-follow-results]")).not.toContainText("a@student.test");
});

test("real recruitment dashboard loads school service and keeps monitoring hidden", async ({ page }) => {
  await page.goto("/login/login.html");
  await page.locator('[data-user="school"]').click();
  await page.locator("#loginButton").click();
  await page.waitForURL("**/school-dashboard/school-dashboard.html");
  await expect(page.locator("body")).toHaveClass(/recruitment-hub/);
  expect(await page.evaluate(() => typeof window.OrbitSchool?.channels)).toBe("function");
  await expect(page.locator("#school-follow")).toBeHidden();
});
