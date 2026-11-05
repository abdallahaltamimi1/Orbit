(() => {
  "use strict";
  const get = (k, d) => {
      try {
        return JSON.parse(localStorage.getItem(k)) ?? d;
      } catch {
        return d;
      }
    },
    set = (k, v) => localStorage.setItem(k, JSON.stringify(v)),
    user = get("orbitUser", {}),
    prefs = get("orbit.student.v1", {}),
    t = (en, ar) => ((prefs.lang || "ar") === "ar" ? ar : en),
    esc = (s) =>
      String(s ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
      );
  const validAppearance = (value) => ["light", "dark", "auto"].includes(value);
  function appearancePreference() {
    const configured = get("orbit.settings.appearance", null),
      storedPrefs = get("orbit.student.v1", {}),
      legacy = localStorage.getItem("orbitTheme") || localStorage.getItem("theme") || "light",
      preference = validAppearance(configured)
        ? configured
        : validAppearance(storedPrefs.theme)
          ? storedPrefs.theme
          : validAppearance(legacy)
            ? legacy
            : "light";
    return {
      preference,
      theme: preference === "auto"
        ? matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        : preference,
    };
  }
  function applyAppearance() {
    const { preference, theme } = appearancePreference();
    document.documentElement.dataset.orbitAppearance = preference;
    document.documentElement.dataset.theme = theme;
    if (document.body) document.body.dataset.theme = theme;
    return theme;
  }
  function saveAppearance(preference) {
    if (!validAppearance(preference)) return applyAppearance();
    const theme = preference === "auto"
      ? matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : preference;
    set("orbit.settings.appearance", preference);
    set("orbit.student.v1", { ...get("orbit.student.v1", {}), theme });
    set("orbit.preferences", { ...get("orbit.preferences", {}), theme });
    localStorage.setItem("orbitTheme", theme);
    return applyAppearance();
  }
  window.OrbitThemePreference ||= { read: appearancePreference, apply: applyAppearance, save: saveAppearance };
  const appearanceMedia = matchMedia("(prefers-color-scheme: dark)");
  appearanceMedia.addEventListener?.("change", () => {
    if (appearancePreference().preference === "auto") applyAppearance();
  });
  if (!window.__orbitThemeToggleCapture) {
    window.__orbitThemeToggleCapture = true;
    document.addEventListener("click", (event) => {
      if (!event.target.closest?.('[data-action="theme"]')) return;
      saveAppearance(applyAppearance() === "dark" ? "light" : "dark");
    }, true);
  }
  window.addEventListener("storage", (event) => {
    if (["orbit.settings.appearance", "orbit.student.v1", "orbitTheme", "theme"].includes(event.key)) applyAppearance();
  });
  const seeds = [
    {
      id: "physics",
      en: "Physics in motion",
      ar: "الفيزياء بحركة",
      teacher: "khaled",
      subject: "physics",
      private: false,
      descAr: "الفيزياء من حولنا",
      descEn: "Physics around us",
    },
    {
      id: "9b",
      en: "Grade 9B",
      ar: "تاسع باء",
      teacher: "khaled",
      subject: "physics",
      private: true,
      code: "ORBIT9B",
    },
    {
      id: "math",
      en: "Math studio",
      ar: "استوديو الرياضيات",
      teacher: "sara",
      private: false,
      subject: "math",
    },
  ];
  const teacher = (id) =>
    id === "sara"
      ? t("Sara Ali", "سارة علي")
      : OrbitProfiles.read(OrbitProfiles.canonical(id), "teacher").name || t("Teacher", "معلم");
  function db() {
    return Object.assign(
      { channels: [], posts: [], joined: [], likes: [], saved: [], comments: {} },
      get("orbit.channels.v2", {}),
    );
  }
  const channels = () => {
      const stored = db().channels;
      const result = [...seeds.map(c=>({...c,...stored.find(x=>x.id===c.id)})),...stored.filter(c=>!seeds.some(s=>s.id===c.id))];
      return window.OrbitRecordOrder?.newest(result) || result;
    },
    label = (c) => (prefs.lang === "en" ? c.en || c.ar : c.ar || c.en),
    own = (c) => {
      const active = get("orbitUser", {});
      if (window.OrbitAuth?.managedChannel(c)) return active.role === "teacher" && OrbitAuth.schoolChannelTeacher(c, active.email);
      return (
        !!c &&
        active.role === "teacher" &&
        (c.teacher === active.email ||
          (active.email === "teacher@orbit.com" && c.teacher === "khaled"))
      );
    };
  function publicationSchool(channelId, previous = null) {
    const matches = channels().filter((c) => c.id === channelId);
    const c = matches[0];
    if (matches.length !== 1 || !own(c))
      throw Error(t("Only the channel owner can publish here.", "النشر هنا متاح لمالك القناة فقط."));
    if (previous && previous.channel !== channelId && (OrbitAuth.managedChannel(c) || channels().some(item => item.id === previous.channel && OrbitAuth.managedChannel(item))))
      throw Error(t("School posts stay in their original channel.", "تبقى المنشورات المدرسية في قناتها الأصلية."));
    const schoolId = c.schoolId == null || c.schoolId === "" ? null : c.schoolId;
    const original = previous && previous.channel !== channelId
      ? channels().filter((item) => item.id === previous.channel) : null;
    if ((schoolId !== null && (typeof schoolId !== "string" || !schoolId.trim() || schoolId !== schoolId.trim())) ||
        (previous && previous.schoolId != null && previous.schoolId !== "" && previous.schoolId !== schoolId) ||
        (original && (original.length !== 1 || !own(original[0]) || (original[0].schoolId || null) !== schoolId)))
      throw Error(t("The post's school association conflicts with its channel. No changes were saved.", "ارتباط المنشور بالمدرسة يتعارض مع قناته. لم تُحفظ التغييرات."));
    return schoolId;
  }
  function memberships() {
    if (!user.email) return [];
    const stored = get("orbit.memberships.v3", {})[user.email] || [];
    if (user.role !== "student") return stored;
    const available = channels();
    return [...new Set([...stored.filter(id => {
      const channel = available.find(c => c.id === id);
      return !OrbitAuth.managedChannel(channel) && OrbitAuth.schoolStudentAccess(channel, user.email) !== false;
    }), ...available.filter(c => OrbitAuth.schoolChannelStudent(c, user.email, null, true)).map(c => c.id)])];
  }
  function join(id, leave = false) {
    if (!OrbitSubscriptions.requireAccount("student")) return false;
    const channel = channels().find((c) => c.id === id);
    if (!channel || OrbitAuth.managedChannel(channel)) return false;
    if(!leave && OrbitAuth.schoolStudentAccess(channel,user.email,{requireMembership:false})===false)return false;
    if (!leave && !memberships().includes(id) && channel.private) {
      if (!OrbitSubscriptions.canJoinClass(id)) return false;
    }
    const m = get("orbit.memberships.v3", {}),
      key = user.email || "guest";
    m[key] = leave ? (m[key]||[]).filter((x) => x !== id) : [...new Set([...(m[key]||[]), id])];
    set("orbit.memberships.v3", m);
    const d = db();
    d.joined = m[key];
    set("orbit.channels.v2", d);
  }
  function mediaDB() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open("orbit-media-v1", 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains("videos")) r.result.createObjectStore("videos");
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function media(key, blob) {
    const d = await mediaDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction("videos", blob ? "readwrite" : "readonly"),
        r = blob ? tx.objectStore("videos").put(blob, key) : tx.objectStore("videos").get(key);
      let result;
      r.onsuccess = () => (result = r.result);
      tx.oncomplete = () => {
        d.close();
        resolve(result);
      };
      tx.onerror = () => {
        d.close();
        reject(tx.error);
      };
    });
  }
  let urls = [];
  function cleanMedia() {
    urls.forEach(URL.revokeObjectURL);
    urls = [];
  }
  async function hydrate() {
    for (const el of document.querySelectorAll("[data-asset]")) {
      if (
        el.dataset.orbitHydrated === el.dataset.asset ||
        el.dataset.orbitPending === el.dataset.asset
      )
        continue;
      el.dataset.orbitPending = el.dataset.asset;
      try {
        const blob = await media(el.dataset.asset);
        if (blob && el.isConnected) {
          const url = URL.createObjectURL(blob);
          urls.push(url);
          if (el.tagName === "A") el.href = url;
          else el.src = url;
          el.dataset.orbitHydrated = el.dataset.asset;
        }
      } catch {
      } finally {
        delete el.dataset.orbitPending;
      }
    }
  }
  function attachment(p) {
    return `${p.videoAsset ? `<video controls preload="metadata" data-asset="${esc(p.videoAsset)}"></video>` : p.type === "video" && /^https:\/\//.test(p.url || "") ? `<video controls src="${esc(p.url)}"></video>` : ""}${(p.attachments || []).map((a) => (a.type.startsWith("image/") ? `<figure><img class="attachment" data-asset="${esc(a.key)}" alt="${esc(a.name)}"><figcaption>${esc(a.name)}</figcaption></figure>` : `<a class="btn soft" data-asset="${esc(a.key)}" download="${esc(a.name)}">↓ ${esc(a.name)} · PDF</a>`)).join("")}`;
  }
  function shell(title, html) {
    cleanMedia();
    document.documentElement.lang = prefs.lang || "ar";
    document.documentElement.dir = prefs.lang === "en" ? "ltr" : "rtl";
    applyAppearance();
    document.body.dataset.mood = localStorage.getItem("orbit.motion.preference") || "fun";
    document.getElementById("app").innerHTML =
      `<header class="bar"><a class="logo" href="../${user.role === "school" ? "school-dashboard/school-dashboard" : user.role === "teacher" ? "teacher-dashboard/teacher-dashboard" : "student-dashboard/student-dashboard"}.html">◉ ORBIT</a><nav><a href="../channels/channels.html">${t("Channels", "القنوات")}</a><a href="../lessons/lessons.html">${t("Topics", "الدروس")}</a><a href="../lab/lab.html">${t("Experiments", "المختبر")}</a><a href="../settings/settings.html">${t("Settings", "الإعدادات")}</a></nav></header><main class="wrap"><span class="eyebrow">ORBIT / ${t("EXPLORE · UNDERSTAND", "استكشف · افهم")}</span><h1>${title}</h1>${html}</main>`;
    if (!user.email) document.querySelector("#app .bar .logo").href = "../hompage/hompage.html";
    hydrate();
  }
  function dialog(html) {
    document.querySelector("#editor")?.remove();
    const d = document.createElement("dialog");
    d.id = "editor";
    d.innerHTML = `<button class="close" type="button" aria-label="${t("Close dialog", "إغلاق النافذة")}">×</button>${html}`;
    (document.getElementById("orbit-page") || document.body).append(d);
    d.querySelector(".close").onclick = () => d.close();
    const heading = d.querySelector("h1,h2,h3");
    if (heading) {
      heading.id = heading.id || "orbit-dialog-title";
      d.setAttribute("aria-labelledby", heading.id);
    }
    d.showModal();
    return d;
  }
  async function duration(file) {
    const url = URL.createObjectURL(file);
    try {
      return await new Promise((resolve, reject) => {
        const v = document.createElement("video");
        let timer = setTimeout(() => finish(Error("Cannot read video")), 8000);
        function finish(err) {
          clearTimeout(timer);
          let n = v.duration;
          v.removeAttribute("src");
          v.load();
          err || !Number.isFinite(n) ? reject(err || Error("Invalid video")) : resolve(n);
        }
        v.onloadedmetadata = () => finish();
        v.onerror = () => finish(Error("Cannot read video"));
        v.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function editor(channelId, postId, onDone = null) {
    if (!OrbitSubscriptions.requireAccount("teacher")) return;
    const data = db(),
      old = data.posts.find((p) => p.id === postId),
      options = channels().filter(own);
    if (!options.length) {
      dialog(
        "<h2>" +
          t("Create a channel first", "أنشئ قناة أولًا") +
          "</h2><p>" +
          t(
            "Create your channel from your dashboard, then publish your lesson or attachment.",
            "أنشئ قناتك من صفحتك، وبعدين انشر الدرس أو المرفق.",
          ) +
          '</p><a class="btn" href="../teacher-dashboard/teacher-dashboard.html">' +
          t("My dashboard", "صفحتي") +
          "</a>",
      );
      return;
    }
    const d = dialog(
      `<h2>${old ? t("Edit post", "تعديل المنشور") : t("Publish to your channel", "انشر في قناتك")}</h2><form id="publish-form"><label>${t("Channel", "القناة")}<select name="channel">${options.map((c) => `<option value="${esc(c.id)}" ${c.id === (old?.channel || channelId) ? "selected" : ""}>${esc(label(c))}</option>`).join("")}</select></label><label>${t("Type", "النوع")}<select name="type">${["lesson", "video", "assignment", "announcement", "discussion"].map((x) => `<option value="${x}" ${x === old?.type ? "selected" : ""}>${{ lesson: t("Lesson", "شرح"), video: t("Video", "فيديو"), assignment: t("Assignment", "واجب"), announcement: t("Announcement", "إعلان"), discussion: t("Discussion", "نقاش") }[x]}</option>`).join("")}</select></label><label>${t("Title", "العنوان")}<input name="title" required maxlength="150" value="${esc(old?.title || "")}"></label><label>${t("Instructions / explanation", "التعليمات / الشرح")}<textarea name="body" required maxlength="3000">${esc(old?.body || "")}</textarea></label><label>${t("Topic for suggested lessons", "موضوع لربط الفيديو بالدروس")}<select name="topic"><option value="">${t("General", "عام")}</option>${["forces", "energy", "waves", "circuits"].map((x) => `<option ${old?.topic === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>${t("Upload video, PDF or images", "ارفع فيديو أو PDF أو صورًا")}<input name="files" type="file" multiple accept="video/mp4,video/webm,application/pdf,image/png,image/jpeg,image/webp"></label><p class="muted">${t("Video: 3 minutes / 50 MB. PDF / images: 10 MB each. Stored in this browser.", "الفيديو: 3 دقائق / 50 MB. PDF والصورة: 10 MB للملف. تُحفظ في هذا المتصفح.")}</p>${old && (old.videoAsset || (old.attachments || []).length) ? `<label><input type="checkbox" name="removeAttachments"> ${t("Remove existing attachments", "إزالة المرفقات الحالية")}</label>` : ""}<label>${t("Optional direct HTTPS video link", "رابط فيديو HTTPS مباشر اختياري")}<input name="url" type="url" value="${esc(old?.url || "")}"></label><label>${t("Due date (assignment)", "موعد تسليم الواجب")}<input name="dueDate" type="date" value="${esc(old?.dueDate || "")}"></label><p id="publish-error" role="status"></p><button class="btn">${t("Save post", "حفظ المنشور")}</button></form>`,
    );
    const publishForm = d.querySelector("form");
    const targeting = document.createElement("fieldset");
    publishForm.elements.channel.closest("label").after(targeting);
    function renderTargeting() {
      const channel = options.find(item => item.id === publishForm.elements.channel.value);
      targeting.hidden = !OrbitAuth.managedChannel(channel);
      if (targeting.hidden) { targeting.replaceChildren(); return; }
      const assignments = OrbitAuth.schoolChannelOptions(channel.schoolId);
      targeting.innerHTML = `<legend>${t("Target sections", "الشعب المستهدفة")}</legend>${channel.sectionIds.map(id => {
        const assignment = assignments.find(row => row.sectionId === id && row.subjectId === channel.subjectId);
        return `<label><input type="checkbox" name="schoolSection" value="${esc(id)}" ${!old?.sectionIds || old.sectionIds.includes(id) ? "checked" : ""}>${esc(assignment?.gradeName)} · ${esc(assignment?.sectionName)}</label>`;
      }).join("")}`;
    }
    publishForm.elements.channel.addEventListener("change", renderTargeting);
    renderTargeting();
    publishForm.onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target),
        c = channels().find((c) => c.id === f.get("channel"));
      if (!own(c)) return;
      const button = e.target.querySelector("button[type=submit],button:not([type])");
      button.disabled = true;
      const err = d.querySelector("#publish-error");
      try {
        const schoolId = publicationSchool(c.id, old);
        let files = [...e.target.files.files];
        if (files.length > 5) throw Error(t("Maximum 5 files", "الحد الأقصى 5 ملفات"));
        let videoAsset = f.has("removeAttachments") ? "" : old?.videoAsset || "",
          attachments = f.has("removeAttachments") ? [] : [...(old?.attachments || [])],
          url = f.get("url").trim();
        if (url && !/^https:\/\//i.test(url)) throw Error(t("Use HTTPS", "استخدم HTTPS"));
        const validated = [];
        for (const file of files) {
          if (
            ![
              "video/mp4",
              "video/webm",
              "application/pdf",
              "image/png",
              "image/jpeg",
              "image/webp",
            ].includes(file.type)
          )
            throw Error(t("Unsupported file", "نوع ملف غير مدعوم"));
          if (file.size > (file.type.startsWith("video/") ? 50 : 10) * 1024 * 1024)
            throw Error(t("File too large", "الملف أكبر من الحد"));
          if (file.type.startsWith("video/")) {
            if (f.get("type") !== "video")
              throw Error(t("Choose Video type", "اختر نوع المنشور فيديو"));
            if (files.filter((x) => x.type.startsWith("video/")).length > 1)
              throw Error(t("One video per post", "فيديو واحد لكل منشور"));
            if ((await duration(file)) > 180)
              throw Error(t("Maximum 3 minutes in demo", "الحد 3 دقائق في النموذج"));
          }
          validated.push(file);
        }
        for (const file of validated) {
          const key = "media-" + crypto.randomUUID();
          await media(key, file);
          if (file.type.startsWith("video/")) {
            videoAsset = key;
            url = "";
          } else attachments.push({ key, name: file.name, type: file.type });
        }
        if (f.get("type") === "video" && !videoAsset && !url)
          throw Error(t("Upload a video or add its URL", "ارفع فيديو أو أضف رابطه"));
        const targetSections = OrbitAuth.managedChannel(c) ? [...new Set(f.getAll("schoolSection"))] : null;
        if (targetSections && old?.sectionIds && get("orbit.assignments.v1", {}).submissions?.some(row => row.assignmentId === old.id) && old.sectionIds.some(id => !targetSections.includes(id))) throw Error(t("Keep sections with existing submissions.", "احتفظ بالشعب التي لها تسليمات."));
        if (targetSections && (!targetSections.length || targetSections.some(id => !c.sectionIds.includes(id)))) throw Error(t("Choose authorized sections.", "اختر الشعب المصرح بها."));
        const post = {
          ...old,
          id: old?.id || "post-" + crypto.randomUUID(),
          channel: c.id,
          ...(targetSections ? { sectionIds: targetSections, academicYearId: c.academicYearId } : {}),
          type: f.get("type"),
          title: f.get("title").trim(),
          body: f.get("body").trim(),
          topic: f.get("topic"),
          url,
          videoAsset,
          attachments,
          dueDate: f.get("dueDate"),
          likes: old?.likes || 0,
          createdAt: old?.createdAt || new Date().toISOString(),
        };
        delete post.titleAr;
        delete post.titleEn;
        delete post.bodyAr;
        delete post.bodyEn;
        if (!post.title || !post.body)
          throw Error(t("Complete title and text", "أكمل العنوان والنص"));
        if (!OrbitSubscriptions.allow("publishing")) throw Error("SUBSCRIPTION_BLOCKED");
        if (publicationSchool(c.id, old) !== schoolId)
          throw Error(t("Channel ownership changed. Reopen the editor before publishing.", "تغيرت ملكية القناة. أعد فتح المحرر قبل النشر."));
        post.authorId = user.email;
        // Existing associations are retained on explicit edits; no data migration.
        if (!old) post.schoolId = schoolId;
        const resource =
          post.type === "lesson" ? "lessons" : post.type === "assignment" ? "assignments" : null;
        OrbitSubscriptions.perform(
          old?.type === post.type ? null : resource,
          () => {
            const live = db(), current = old && live.posts.find((p) => p.id === old.id);
            if ((old && !current) || publicationSchool(c.id, current || null) !== schoolId)
              throw Error(t("Channel or post ownership changed. Reopen the editor before publishing.", "تغيرت ملكية القناة أو المنشور. أعد فتح المحرر قبل النشر."));
            if (old) {
              // Retain current moderation and ownership metadata while saving the edited content.
              for (const key of ["schoolId", "moderationStatus", "moderatedAt"]) {
                if (Object.hasOwn(current, key)) post[key] = current[key];
                else delete post[key];
              }
              live.posts = live.posts.map((p) => p.id === old.id ? post : p);
            } else live.posts.unshift(post);
            set("orbit.channels.v2", live);
          },
          "post:" + post.id + ":" + resource,
        );
        d.close();
        const successEn = postId
            ? "Changes saved."
            : post.type === "assignment"
              ? "Assignment published."
              : "Content published.",
          successAr = postId
            ? "تم حفظ التغييرات."
            : post.type === "assignment"
              ? "تم نشر الواجب."
              : "تم نشر المحتوى.";
        if (onDone) {
          onDone();
          window.OrbitMotion?.feedback(t(successEn, successAr));
        } else {
          window.OrbitMotion?.queueFeedback(successEn, successAr);
          location.reload();
        }
      } catch (ex) {
        err.textContent = ex.message;
      } finally {
        button.disabled = false;
      }
    };
  }
  window.ORBIT = {
    get,
    set,
    user,
    prefs,
    t,
    esc,
    db,
    channels,
    label,
    teacher,
    own,
    publicationSchool,
    memberships,
    join,
    media,
    hydrate,
    attachment,
    shell,
    dialog,
    editor,
  };
  document.addEventListener(
    "click",
    (e) => {
      const b = e.target.closest('[data-action="compose"]');
      if (b && location.pathname.includes("teacher-dashboard")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        editor(b.dataset.channel);
      }
    },
    true,
  );
})();
