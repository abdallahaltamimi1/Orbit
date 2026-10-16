(() => {
  "use strict";
  const M = OrbitMeetings,
    user = OrbitAuth.current();
  if (!user?.email) return;
  const prefs = OrbitAuth.get("orbit.student.v1", {});
  document.documentElement.lang = prefs.lang === "en" ? "en" : "ar";
  document.documentElement.dir = prefs.lang === "en" ? "ltr" : "rtl";
  document.body.dataset.theme = prefs.theme === "dark" ? "dark" : "light";
  document.body.dataset.orbitRole = user.role;
  const t = M.t,
    id = new URLSearchParams(location.search).get("id");
  const homeName =
    user.role === "teacher"
      ? "teacher-dashboard"
      : user.role === "school"
        ? "school-dashboard"
        : "student-dashboard";
  const home = `../${homeName}/${homeName}.html#meetings-section`;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
    );
  const page = document.getElementById("meeting-room-page");
  let api = null,
    loading = false,
    generation = 0,
    readyTimer,
    checkTimer,
    deadlineTimer,
    scriptTimer,
    failedScript,
    listeners = [];
  function state(message) {
    const node = document.getElementById("meeting-connection-status");
    if (node) node.textContent = message;
  }
  function dispose() {
    generation++;
    loading = false;
    clearTimeout(readyTimer);
    clearTimeout(scriptTimer);
    clearTimeout(deadlineTimer);
    if (failedScript) {
      failedScript.onload = failedScript.onerror = null;
      failedScript.remove();
      failedScript = null;
    }
    const old = api;
    api = null;
    if (old) {
      for (const [name, handler] of listeners) old.removeEventListener?.(name, handler);
      old.dispose();
    }
    listeners = [];
    document.getElementById("meeting-container")?.replaceChildren();
  }
  function unavailable(message) {
    dispose();
    clearInterval(checkTimer);
    page.innerHTML = `<div class="meeting-room-header"><h1>${t("Meeting unavailable", "الاجتماع غير متاح")}</h1><a class="meeting-button" href="${home}">${t("Return to dashboard", "العودة للوحة التحكم")}</a></div><p role="alert">${esc(message)}</p><p class="meeting-local-note">${t("Local browser checks are a demonstration, not server-enforced room access control.", "فحوص المتصفح تجربة محلية وليست حماية دخول تفرضها الخوادم.")}</p>`;
  }
  function script() {
    if (typeof window.JitsiMeetExternalAPI === "function") return Promise.resolve();
    return new Promise((resolve, reject) => {
      const node = document.createElement("script");
      failedScript = node;
      node.src = "https://meet.jit.si/external_api.js";
      node.async = true;
      scriptTimer = setTimeout(() => {
        node.onload = node.onerror = null;
        node.remove();
        failedScript = null;
        reject(
          Error(
            t(
              "Jitsi did not load. Check your connection and retry.",
              "لم يُحمّل Jitsi. تحقق من الاتصال ثم أعد المحاولة.",
            ),
          ),
        );
      }, 15000);
      node.onload = () => {
        clearTimeout(scriptTimer);
        failedScript = null;
        typeof window.JitsiMeetExternalAPI === "function"
          ? resolve()
          : reject(Error(t("Jitsi API is unavailable.", "واجهة Jitsi غير متاحة.")));
      };
      node.onerror = () => {
        clearTimeout(scriptTimer);
        node.remove();
        failedScript = null;
        reject(
          Error(
            t(
              "Unable to load Jitsi. Check your network or content blocker.",
              "تعذّر تحميل Jitsi. تحقق من الشبكة أو مانع المحتوى.",
            ),
          ),
        );
      };
      document.head.append(node);
    });
  }
  async function connect() {
    if (api || loading) return;
    let meeting;
    try {
      meeting = M.entry(id);
    } catch (error) {
      unavailable(error.message);
      return;
    }
    loading = true;
    const token = ++generation;
    const retry = document.getElementById("meeting-retry");
    if (retry) retry.hidden = true;
    state(t("Loading the meeting…", "جارٍ تحميل الاجتماع…"));
    try {
      await script();
      if (token !== generation) return;
      meeting = M.entry(id);
      api = new JitsiMeetExternalAPI("meet.jit.si", {
        roomName: meeting.roomName,
        parentNode: document.getElementById("meeting-container"),
        width: "100%",
        height: "100%",
        lang: document.documentElement.lang,
        userInfo: { displayName: OrbitProfiles.current()?.name || user.name || user.email },
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: true,
          toolbarButtons: [
            "microphone",
            "camera",
            "desktop",
            "chat",
            "tileview",
            "raisehand",
            "settings",
            "hangup",
          ],
          prejoinConfig: { enabled: true },
        },
        onload: () => {
          if (token === generation)
            state(
              t(
                "Meeting loaded. Review your microphone and camera in Jitsi.",
                "تم تحميل الاجتماع. راجع الميكروفون والكاميرا داخل Jitsi.",
              ),
            );
        },
      });
      const on = (name, handler) => {
        api.addEventListener(name, handler);
        listeners.push([name, handler]);
      };
      on("videoConferenceJoined", () => {
        if (token !== generation) return;
        clearTimeout(readyTimer);
        state(t("You joined the meeting.", "انضممت للاجتماع."));
      });
      const leave = () => {
        if (token !== generation || !api) return;
        dispose();
        location.href = home;
      };
      on("readyToClose", leave);
      on("videoConferenceLeft", leave);
      on("errorOccurred", () => {
        if (token !== generation) return;
        state(
          t(
            "Jitsi reported a connection or device error. Check permissions, leave, or retry.",
            "أبلغ Jitsi عن مشكلة اتصال أو جهاز. راجع الأذونات أو غادر وأعد المحاولة.",
          ),
        );
        document.getElementById("meeting-retry").hidden = false;
      });
      readyTimer = setTimeout(() => {
        state(
          t(
            "Still waiting to join. The host may need to sign in to Jitsi; check the embedded screen.",
            "ما زلنا بانتظار الانضمام. قد يحتاج المضيف لتسجيل الدخول في Jitsi؛ راجع الشاشة المضمنة.",
          ),
        );
        document.getElementById("meeting-retry").hidden = false;
      }, 30000);
      guard();
    } catch (error) {
      if (token !== generation) return;
      dispose();
      state(error.message);
      document.getElementById("meeting-retry").hidden = false;
    } finally {
      if (token === generation) loading = false;
    }
  }
  function guard() {
    const now = OrbitAuth.current();
    if (!now || now.email !== user.email || now.role !== user.role) {
      unavailable(
        t(
          "Your signed-in account changed. Return to your dashboard.",
          "تغيّر الحساب المسجل. عد إلى لوحة التحكم.",
        ),
      );
      return;
    }
    try {
      const meeting = M.entry(id);
      clearTimeout(deadlineTimer);
      deadlineTimer = setTimeout(guard, Math.max(25, Date.parse(meeting.endAt) - Date.now() + 25));
    } catch (error) {
      unavailable(error.message);
    }
  }
  let meeting;
  try {
    meeting = M.entry(id);
  } catch (error) {
    unavailable(error.message);
    return;
  }
  document.title = meeting.title + " · ORBIT";
  page.innerHTML = `<div class="meeting-room-header"><div><span>ORBIT</span><h1>${esc(meeting.title)}</h1><p class="meeting-meta">${esc(meeting.teacherName)} · ${esc(meeting.subject)}</p></div><a class="meeting-button" href="${home}" id="meeting-leave">${t("Leave and return", "غادر وعد للوحة التحكم")}</a></div><p class="meeting-local-note">${t("This is a public Jitsi service. The host must sign in to Jitsi to start the room. A room link is not private authorization. Recording and premium features are not configured.", "هذه خدمة Jitsi العامة. يحتاج المضيف لتسجيل الدخول في Jitsi لبدء الغرفة. رابط الغرفة ليس تصريحًا خاصًا. التسجيل والميزات المدفوعة غير مهيأة.")}</p><p id="meeting-connection-status" class="meeting-live-feedback" role="status" aria-live="polite"></p><button class="meeting-button" id="meeting-retry" hidden>${t("Retry connection", "أعد محاولة الاتصال")}</button><div id="meeting-container" class="meeting-room-container" aria-label="${t("Jitsi video meeting", "اجتماع فيديو Jitsi")}"></div><div class="meeting-resources">${(meeting.resources || []).map((resource) => `<a class="meeting-button" href="${esc(resource.url)}" target="_blank" rel="noopener noreferrer">${esc(resource.name)} ↗</a>`).join("")}</div>`;
  document.getElementById("meeting-leave").onclick = dispose;
  // Some embedded browsers cancel Jitsi's authentication popup. Open the same
  // saved room directly; public Jitsi access remains independent of local checks.
  const direct = document.createElement("a");
  direct.className = "meeting-button";
  direct.href = "https://meet.jit.si/" + encodeURIComponent(meeting.roomName);
  direct.target = "_blank";
  direct.rel = "noopener noreferrer";
  direct.textContent = t("Open the same room in Jitsi", "افتح الغرفة نفسها في Jitsi");
  direct.addEventListener("click", (event) => {
    try {
      M.entry(id);
    } catch (error) {
      event.preventDefault();
      unavailable(error.message);
    }
  });
  document.getElementById("meeting-retry").after(direct);
  const directHint = document.createElement("p");
  directHint.className = "meeting-local-note";
  directHint.textContent = t(
    "If the host sign-in popup closes, use this link to sign in directly in Jitsi. It opens the same room; it does not bypass host authentication.",
    "إذا أُغلقت نافذة تسجيل دخول المضيف، استخدم هذا الرابط لتسجيل الدخول مباشرة في Jitsi. يفتح الغرفة نفسها، ولا يتجاوز تسجيل دخول المضيف.",
  );
  direct.after(directHint);
  document.getElementById("meeting-retry").onclick = () => {
    dispose();
    connect();
  };
  const scheduleGuard = () => {
    clearInterval(checkTimer);
    if (!document.hidden) {
      guard();
      if (document.getElementById("meeting-container")) checkTimer = setInterval(guard, 15000);
    }
  };
  window.addEventListener("storage", (event) => {
    if ([M.key, "orbitUser", "orbit.memberships.v3", "orbit.school.members.v1"].includes(event.key))
      guard();
  });
  window.addEventListener("orbit:meetings-change", guard);
  document.addEventListener("visibilitychange", scheduleGuard);
  window.addEventListener("pagehide", () => {
    clearInterval(checkTimer);
    dispose();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      scheduleGuard();
      if (document.getElementById("meeting-container")) connect();
    }
  });
  scheduleGuard();
  connect();
})();
