(() => {
  "use strict";
  const readyForms = new WeakSet(),
    readyFields = new WeakSet();
  let sequence = 0;
  const uploadURLs = new Map();
  const ar = () => document.documentElement.lang === "ar",
    t = (en, arabic) => (ar() ? arabic : en);
  function permitted(el, form) {
    for (let p = el.parentElement; p && p !== form; p = p.parentElement)
      if (p.hidden && !p.classList.contains("orbit-step")) return false;
    return !el.disabled && el.type !== "hidden";
  }
  function fields(form) {
    for (const el of form.querySelectorAll("input,select,textarea")) {
      if (readyFields.has(el)) continue;
      readyFields.add(el);
      if (!el.id) el.id = "orbit-field-" + ++sequence;
      const label =
        el.closest("label") || form.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (!label) continue;
      if (el.type === "checkbox" || el.type === "radio") {
        label.classList.add("orbit-check");
        continue;
      }
      const error = document.createElement("span");
      error.className = "orbit-field-error";
      error.id = el.id + "-error";
      error.setAttribute("aria-live", "polite");
      label.append(error);
      el.setAttribute(
        "aria-describedby",
        [el.getAttribute("aria-describedby") || "", error.id].filter(Boolean).join(" "),
      );
      el.addEventListener("invalid", () => {
        el.setAttribute("aria-invalid", "true");
        error.textContent = el.validity.valueMissing
          ? t("Complete this field.", "أكمل هالحقل.")
          : el.validity.typeMismatch
            ? t("Check the format.", "راجع صيغة الإدخال.")
            : el.validity.rangeUnderflow || el.validity.rangeOverflow
              ? t("Use a value within the permitted range.", "اختر قيمة ضمن المدى المسموح.")
              : t("Please check this value.", "راجع هالقيمة.");
      });
      el.addEventListener("input", () => {
        el.removeAttribute("aria-invalid");
        error.textContent = "";
      });
      if (el.type === "password" && !el.closest("#loginForm")) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "orbit-password-toggle";
        toggle.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
        toggle.setAttribute("aria-label", t("Show password", "إظهار كلمة المرور"));
        toggle.setAttribute("aria-controls", el.id);
        toggle.setAttribute("aria-pressed", "false");
        toggle.onclick = () => {
          const show = el.type === "password";
          el.type = show ? "text" : "password";
          toggle.setAttribute("aria-pressed", String(show));
          toggle.innerHTML = show
            ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 3 18 18M10.5 5.1 12 5c6.5 0 10 7 10 7a20 20 0 0 1-4.1 4.7M6.2 6.2A20 20 0 0 0 2 12s3.5 7 10 7a13 13 0 0 0 5.4-1.2M10 10a3 3 0 0 0 4 4"/></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
          toggle.setAttribute(
            "aria-label",
            show
              ? t("Hide password", "إخفاء كلمة المرور")
              : t("Show password", "إظهار كلمة المرور"),
          );
        };
        const wrapper = document.createElement("span");
        wrapper.className = "orbit-password-field";
        el.before(wrapper);
        wrapper.append(el, toggle);
      }
      if (el.type === "file" && el.accept.includes("image")) {
        if (
          form.id === "listing-form" ||
          form.querySelector("#profile-image-preview,#picture-preview,#ai-preview")
        )
          continue;
        const preview = document.createElement("div");
        preview.className = "orbit-upload-preview";
        label.after(preview);
        let urls = [];
        el.addEventListener("change", () => {
          urls.forEach(URL.revokeObjectURL);
          urls = [];
          preview.replaceChildren();
          for (const file of [...el.files].slice(0, 3)) {
            if (
              !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
              file.size > 5 * 1024 * 1024
            )
              continue;
            const img = document.createElement("img");
            const url = URL.createObjectURL(file);
            urls.push(url);
            uploadURLs.set(el, urls);
            img.src = url;
            img.alt = file.name;
            preview.append(img);
          }
        });
      }
    }
  }

  function wizard(form) {
    if (
      form.dataset.orbitWizard ||
      ![
        "school-register-form",
        "job-form",
        "publish-form",
        "setup-form",
        "registration-form",
      ].includes(form.id)
    )
      return;
    if (form.id === "registration-form" && form.querySelector("[name=role]")?.value === "student")
      return;
    const candidates = (
      form.id === "setup-form"
        ? [...form.querySelectorAll(".setup-grid > label")]
        : ["school-register-form", "job-form"].includes(form.id)
          ? [
              ...form.querySelectorAll(".form-grid > label"),
              ...form.querySelectorAll(":scope > label"),
            ]
          : [...form.children]
    ).filter(
      (e) =>
        e.matches("label,.form-grid,.setup-grid,#student-fields,#teacher-fields,#school-fields") &&
        e.querySelector("input,select,textarea"),
    );
    if (candidates.length < 5) return;
    form.dataset.orbitWizard = "true";
    form.noValidate = true;
    const groupCount = form.id === "school-register-form" ? 3 : 2,
      steps = [],
      names =
        form.id === "school-register-form"
          ? [
              t("School identity", "هوية المدرسة"),
              t("Contact and location", "التواصل والموقع"),
              t("Account details", "بيانات الحساب"),
              t("Review", "المراجعة"),
            ]
          : [
              t("Basic information", "المعلومات الأساسية"),
              t("Details", "التفاصيل"),
              t("Review", "المراجعة"),
            ],
      progress = document.createElement("ol");
    progress.className = "orbit-steps";
    progress.setAttribute("aria-label", t("Form progress", "تقدم النموذج"));
    progress.innerHTML = names.map((n) => "<li>" + n + "</li>").join("");
    form.prepend(progress);
    const chunk = Math.ceil(candidates.length / groupCount);
    for (let i = 0; i < groupCount; i++) {
      const step = document.createElement("fieldset");
      step.className = "orbit-step";
      const legend = document.createElement("legend");
      legend.textContent = names[i];
      step.append(legend);
      const nodes =
        form.id === "registration-form"
          ? candidates.filter((n) =>
              i === 0
                ? !["student-fields", "teacher-fields", "school-fields"].includes(n.id)
                : ["student-fields", "teacher-fields", "school-fields"].includes(n.id),
            )
          : form.id === "school-register-form"
            ? candidates.filter((n) => {
                const name = n.querySelector("input,select,textarea")?.name;
                const group = ["email", "password", "confirmPassword"].includes(name)
                  ? 2
                  : ["location", "contact", "website", "phone"].includes(name)
                    ? 1
                    : 0;
                return group === i;
              })
            : candidates.slice(i * chunk, (i + 1) * chunk);
      if (nodes.length) {
        (steps.at(-1) || progress).after(step);
        const fields = document.createElement("div");
        fields.className = "orbit-step-fields";
        step.append(fields);
        nodes.forEach((n) => fields.append(n));
      }
      steps.push(step);
    }
    const review = document.createElement("fieldset");
    review.className = "orbit-step";
    review.innerHTML = "<legend>" + names.at(-1) + '</legend><dl class="orbit-review"></dl>';
    const submit = form.querySelector("button[type=submit]");
    if (!submit) return;
    submit.before(review);
    steps.push(review);
    const controls = document.createElement("div");
    controls.className = "orbit-wizard-controls";
    controls.innerHTML =
      '<button type="button" class="orbit-back-step">' +
      t("Back", "رجوع") +
      '</button><button type="button" class="orbit-next">' +
      t("Continue", "متابعة") +
      "</button>";
    form.append(controls);
    let index = 0;
    function render() {
      steps.forEach((step, i) => (step.hidden = i !== index));
      [...progress.children].forEach((li, i) => {
        li.classList.toggle("is-complete", i < index);
        if (i === index) li.setAttribute("aria-current", "step");
        else li.removeAttribute("aria-current");
      });
      submit.hidden = index !== steps.length - 1;
      controls.lastElementChild.hidden = index === steps.length - 1;
      controls.firstElementChild.disabled = index === 0;
      if (index === steps.length - 1) {
        const dl = review.querySelector("dl");
        dl.replaceChildren();
        for (const el of form.querySelectorAll("input,select,textarea")) {
          if (
            !el.name ||
            ["password", "confirm", "confirmPassword"].includes(el.name) ||
            ["password", "file", "checkbox", "radio"].includes(el.type) ||
            !permitted(el, form)
          )
            continue;
          const item = document.createElement("div"),
            term = document.createElement("dt"),
            value = document.createElement("dd");
          const label = el.closest("label");
          term.textContent = label
            ? [...label.childNodes]
                .filter((n) => n.nodeType === 3)
                .map((n) => n.textContent)
                .join("")
                .trim()
            : el.name;
          value.textContent =
            el.tagName === "SELECT" ? el.selectedOptions[0]?.textContent : el.value;
          item.append(term, value);
          dl.append(item);
        }
      }
    }
    function valid(step, report = true) {
      for (const el of step.querySelectorAll("input,select,textarea"))
        if (permitted(el, form) && !el.checkValidity()) {
          if (report) {
            el.reportValidity();
            el.focus();
          }
          return false;
        }
      return true;
    }
    controls.lastElementChild.onclick = () => {
      if (valid(steps[index])) {
        index++;
        render();
        steps[index].scrollIntoView({ block: "nearest" });
      }
    };
    controls.firstElementChild.onclick = () => {
      index = Math.max(0, index - 1);
      render();
    };
    form.addEventListener(
      "submit",
      (e) => {
        for (let i = 0; i < steps.length - 1; i++)
          if (!valid(steps[i], false)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            index = i;
            render();
            const invalid = steps[i].querySelector("[aria-invalid=true]");
            invalid?.focus();
            invalid?.reportValidity();
            return;
          }
      },
      true,
    );
    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && index < steps.length - 1) {
        e.preventDefault();
        controls.lastElementChild.click();
      }
    });
    form.orbitWizard = {
      next: () => controls.lastElementChild.click(),
      back: () => controls.firstElementChild.click(),
      index: () => index,
    };
    render();
  }

  function exchangePreview(form) {
    if (form.id !== "listing-form" || form.dataset.orbitPreview) return;
    form.dataset.orbitPreview = "true";
    const host = document.createElement("div");
    host.className = "exchange-compose";
    form.before(host);
    host.append(form);
    const preview = document.createElement("aside");
    preview.className = "exchange-live";
    preview.setAttribute("aria-label", t("Listing preview", "معاينة الإعلان"));
    host.append(preview);
    let photoURL = "";
    const imageInput = form.querySelector("[name=images]");
    if (imageInput)
      imageInput.addEventListener("change", () => {
        if (photoURL) URL.revokeObjectURL(photoURL);
        const file = imageInput.files[0];
        photoURL =
          file &&
          ["image/png", "image/jpeg", "image/webp"].includes(file.type) &&
          file.size <= 5 * 1024 * 1024
            ? URL.createObjectURL(file)
            : "";
        uploadURLs.set(imageInput, photoURL ? [photoURL] : []);
        render();
      });
    const value = (n) => form.elements[n]?.value || "";
    function render() {
      preview.replaceChildren();
      const label = document.createElement("small");
      label.textContent = t("Your listing preview", "هيك رح يظهر إعلانك");
      const title = document.createElement("strong");
      title.textContent = value("title") || t("Book or equipment title", "اسم الكتاب أو الأداة");
      const description = document.createElement("p");
      description.textContent =
        value("description") ||
        t("Describe its condition and what is included.", "احكي عن حالته وشو بيشمل.");
      const location = document.createElement("p");
      location.textContent = value("location");
      const price = document.createElement("p");
      price.className = "orbit-preview-price";
      price.textContent =
        value("type") === "sale"
          ? (value("price") || "—") + " " + t("JD", "دينار")
          : (value("days") || "—") + " " + t("days lending", "يوم إعارة");
      preview.append(label);
      if (photoURL) {
        const image = document.createElement("img");
        image.src = photoURL;
        image.alt = value("title");
        image.className = "orbit-preview-photo";
        preview.append(image);
      }
      preview.append(title, description, location, price);
    }
    form.addEventListener("input", render);
    form.addEventListener("change", render);
    render();
  }

  function scan() {
    for (const [input, urls] of uploadURLs) {
      if (!input.isConnected) {
        urls.forEach(URL.revokeObjectURL);
        uploadURLs.delete(input);
      }
    }
    const root = document.getElementById("orbit-page");
    if (!root) return;
    for (const group of root.querySelectorAll(
      ".filters,.controls-grid,.ai-box,.toolbar:has(input),.toolbar:has(select)",
    )) {
      group.classList.add("orbit-form");
      fields(group);
    }
    for (const form of root.querySelectorAll("form")) {
      form.classList.add("orbit-form");
      if (!readyForms.has(form)) {
        readyForms.add(form);
        for (const button of form.querySelectorAll("button"))
          if (!button.hasAttribute("type")) button.type = "submit";
        form.addEventListener("submit", () => {
          const button = form.querySelector("button[type=submit]");
          if (button) button.setAttribute("aria-busy", "true");
          queueMicrotask(() => {
            setTimeout(() => {
              if (button && !button.disabled) button.removeAttribute("aria-busy");
            }, 500);
          });
        });
      }
      fields(form);
      wizard(form);
      exchangePreview(form);
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    scan();
    document.getElementById("orbit-page")?.addEventListener("change", (e) => {
      if (e.target.name === "role") queueMicrotask(scan);
    });
    let scheduled = false;
    new MutationObserver(() => {
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(() => {
          scheduled = false;
          scan();
        });
      }
    }).observe(document.getElementById("orbit-page") || document.body, {
      childList: true,
      subtree: true,
    });
  });
  window.OrbitForms = { scan };
})();
