/* Animation receives interaction state only; validation remains independent. */
(() => {
  "use strict";
  const form = document.getElementById("registration-form");
  const layout = document.querySelector(".onboarding-layout");
  if (!form || !layout) return;
  const story = layout.querySelector(".onboarding-story");
  form.dataset.orbitWizard = "true";
  const text = ORBIT.t;
  const back = document.createElement("a");
  back.className = "orbit-return";
  back.href = "../hompage/hompage.html";
  back.textContent = text("← Return home", "← العودة للرئيسية");
  layout.before(back);
  story.innerHTML = `<a class="education-brand" href="../hompage/hompage.html">ORBIT</a><div class="mission-copy"><h2>${text("Choose your journey.", "اختَر رحلتك.")}</h2><p>${text("Learn, teach, or connect your school with the right people.", "تعلّم، علّم، أو وصّل مدرستك بالأشخاص المناسبين.")}</p></div><div class="learning-universe education-stage" data-renderer="fallback" aria-hidden="true"><div class="education-fallback"><svg viewBox="0 0 100 80" fill="none" stroke="currentColor" stroke-width="2"><rect x="15" y="10" width="70" height="50" rx="5"/><path d="M30 68h40M50 60v8M25 25h50M25 35h30M25 45h40"/></svg><span>${text("Your learning workspace", "مساحتك التعليمية")}</span></div></div><div class="mission-indicator" role="status"></div><p class="education-caption">${text("An illustration of your ORBIT experience.", "تصوّر لتجربتك التعليمية في ORBIT.")}</p>`;
  const host = story.querySelector(".learning-universe");
  const renderer = window.OrbitRegistrationUniverse?.create(host);
  const select = form.elements.role;
  let roleImmediate = false,
    keyboardFocus = false;
  form.addEventListener("keydown", () => {
    keyboardFocus = true;
  });
  form.addEventListener(
    "pointerdown",
    () => {
      keyboardFocus = false;
    },
    { passive: true },
  );
  const roles = document.createElement("div");
  roles.className = "orbit-role-picker";
  roles.setAttribute("role", "group");
  roles.setAttribute("aria-label", text("Account role", "نوع الحساب"));
  for (const option of select.options) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.text;
    button.dataset.role = option.value;
    button.onclick = (event) => {
      roleImmediate = event.detail === 0;
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    };
    roles.append(button);
  }
  select.closest("label").classList.add("role-source");
  select.closest("label").setAttribute("aria-hidden", "true");
  select.tabIndex = -1;
  select.closest("label").after(roles);
  const indicator = story.querySelector(".mission-indicator");
  const roleCopy = {
    student: () => text("Discover. Try. Find your own way.", "اكتشف وجرّب، وخلي الفضول يدلّك."),
    teacher: () => text("Make room for the next great idea.", "افتح مساحة للفكرة الجايّة."),
    school: () =>
      text("Bring people and possibilities together.", "اجمع الناس والفرص في مكان واحد."),
  };
  const syncRoles = () => {
    roles
      .querySelectorAll("button")
      .forEach((button) =>
        button.setAttribute("aria-pressed", String(button.dataset.role === select.value)),
      );
    const nameLabel = form.elements.name.closest("label"),
      nameText = [...nameLabel.childNodes].find((n) => n.nodeType === 3);
    if (nameText)
      nameText.textContent =
        select.value === "school"
          ? text("School name", "اسم المدرسة")
          : text("Full name", "الاسم الكامل");
    renderer?.setRole(select.value, roleImmediate);
    roleImmediate = false;
    story.dataset.role = select.value;
    indicator.textContent =
      roleCopy[select.value]?.() || text("Ready for discovery", "جاهز للاكتشاف");
  };
  select.addEventListener("change", syncRoles);
  syncRoles();
  let state = "idle",
    debounce = 0,
    focusTimer = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const quiet = () => reduced.matches || document.body.dataset.mood === "calm";
  function setState(next) {
    state = next;
    renderer?.setState(next, keyboardFocus);
  }
  form.addEventListener("focusin", (event) => {
    if (event.target.matches("input,select,textarea")) renderer?.setFocus(true, keyboardFocus);
  });
  form.addEventListener("focusout", () => {
    clearTimeout(focusTimer);
    focusTimer = setTimeout(() => {
      if (!form.contains(document.activeElement)) renderer?.setFocus(false, keyboardFocus);
    }, 0);
  });
  form.addEventListener("input", (event) => {
    if (!event.target.matches("input,select,textarea")) return;
    if (!["pending", "success"].includes(state)) setState("scanning");
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      if (!["pending", "success"].includes(state)) setState("idle");
    }, 700);
  });
  form.addEventListener(
    "invalid",
    () => {
      if (state !== "success") setState("error");
    },
    true,
  );
  window.OrbitSatellite = {
    pending() {
      clearTimeout(debounce);
      setState("pending");
      indicator.textContent = text("Preparing your account…", "جاري تجهيز حسابك…");
    },
    error() {
      setState("error");
      indicator.textContent = text("Check the form to continue", "راجع النموذج للمتابعة");
    },
    success() {
      clearTimeout(debounce);
      setState("success");
      indicator.textContent = text("Account created. Welcome to ORBIT.", "تم إنشاء الحساب بنجاح.");
      return new Promise((resolve) => setTimeout(resolve, quiet() || keyboardFocus ? 100 : 700));
    },
  };
  window.addEventListener("pagehide", () => {
    clearTimeout(debounce);
    clearTimeout(focusTimer);
    debounce = focusTimer = 0;
  });
  window.addEventListener("pageshow", () => {
    if (state === "scanning") setState("idle");
  });
  // Validation adapter: values stay here, separate from the animation state.
  function validate(el, report = false) {
    el.setCustomValidity("");
    if (el.closest("[hidden]")) {
      el.closest("label").classList.remove("orbit-validated");
      return true;
    }
    if (el.name === "name" && !el.value.trim())
      el.setCustomValidity(text("Enter your name.", "أدخل الاسم."));
    if (el.name === "email" && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()))
      el.setCustomValidity(text("Enter a valid email.", "أدخل بريدًا صالحًا."));
    if (
      el.name === "password" &&
      el.value &&
      (!/[a-zA-Z]/.test(el.value) || !/[0-9]/.test(el.value))
    )
      el.setCustomValidity(text("Include letters and digits.", "أضف حروفًا وأرقامًا."));
    if (el.name === "confirm" && el.value !== form.elements.password.value)
      el.setCustomValidity(text("Passwords do not match.", "كلمتا المرور غير متطابقتين."));
    if (
      form.elements.role.value === "school" &&
      ["location", "contact", "levels", "subjects"].includes(el.name) &&
      !el.value.trim()
    )
      el.setCustomValidity(text("Complete this field.", "أكمل هذا الحقل."));
    if (
      form.elements.role.value === "school" &&
      ["levels", "subjects"].includes(el.name) &&
      !el.value.split(/[,،\\n]/).some((part) => part.trim())
    )
      el.setCustomValidity(text("Enter at least one item.", "أدخل عنصرًا واحدًا على الأقل."));
    const valid = Boolean(el.value.trim()) && el.validity.valid;
    el.closest("label").classList.toggle("orbit-validated", valid);
    if (report && !el.validity.valid) el.reportValidity();
    return el.validity.valid;
  }
  form.addEventListener("input", (e) => {
    if (e.target.matches("input")) {
      validate(e.target);
      if (e.target.name === "password") validate(form.elements.confirm);
    }
  });
  form.addEventListener("focusout", (e) => {
    if (e.target.matches("input")) validate(e.target, true);
  });
  select.addEventListener("change", () =>
    form.querySelectorAll("input").forEach((el) => validate(el)),
  );
  form.addEventListener(
    "submit",
    (e) => {
      for (const el of form.querySelectorAll("input")) {
        if (el.closest("[hidden]")) continue;
        if (!validate(el)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          el.reportValidity();
          el.focus();
          return;
        }
      }
    },
    true,
  );
})();
