(() => {
  "use strict";
  const form = document.getElementById("contact-form");
  if (!form) return;
  const t = (value) => window.OrbitHomeLocale?.t(value) ?? value;
  const fields = [
    [document.getElementById("contact-name"), "name"],
    [document.getElementById("contact-email"), "email"],
    [document.getElementById("contact-message"), "message"],
  ];
  const status = document.getElementById("contact-status"),
    submit = form.querySelector('[type="submit"]'),
    submitLabel = submit.querySelector(".contact-submit__label");
  let submitting = false;

  function messageFor(field, kind) {
    if (kind === "name")
      return field.value.trim() ? t("Please enter your full name.") : t("Name is required.");
    if (kind === "email")
      return field.value.trim() ? t("Enter a valid email address.") : t("Email is required.");
    if (kind === "message" && field.validity.tooLong)
      return t("Please keep your message under 2,000 characters.");
    if (kind === "message" && field.value.trim().length < 10)
      return field.value.trim() ? t("Please enter at least 10 characters.") : t("Message is required.");
    return "";
  }

  function validate(field, kind) {
    const value = field.value.trim(),
      requiredEmpty = !value,
      tooShort = kind === "name" ? value.length < 2 : kind === "message" && value.length < 10,
      invalidEmail = kind === "email" && (!field.validity.valid || value.length > 254),
      invalid = requiredEmpty || tooShort || invalidEmail || field.validity.tooLong;
    const error = document.getElementById(`${field.id}-error`);
    field.setAttribute("aria-invalid", String(invalid));
    error.textContent = invalid ? messageFor(field, kind) : "";
    return !invalid;
  }

  fields.forEach(([field, kind]) => {
    field.addEventListener("blur", () => validate(field, kind));
    field.addEventListener("input", () => {
      if (field.hasAttribute("aria-invalid")) validate(field, kind);
      status.textContent = "";
      status.removeAttribute("data-state");
    });
  });

  function unavailableMessage() {
    status.replaceChildren(
      document.createTextNode(t("Message delivery is not connected yet. Your message was not sent or saved. Please email us instead.")),
      document.createTextNode(" "),
    );
    const email = document.createElement("a");
    email.href = "mailto:abdullahaltamimi300@gmail.com";
    email.textContent = "abdullahaltamimi300@gmail.com";
    status.append(email);
    status.dataset.state = "error";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const valid = fields.map(([field, kind]) => validate(field, kind)).every(Boolean);
    if (!valid) {
      fields.find(([field]) => field.getAttribute("aria-invalid") === "true")?.[0].focus();
      return;
    }

    const endpoint = window.OrbitConfig?.contactEndpoint;
    if (!endpoint) {
      unavailableMessage();
      return;
    }

    submitting = true;
    form.setAttribute("aria-busy", "true");
    submit.disabled = true;
    submitLabel.textContent = t("Sending message…");
    status.textContent = "";
    status.removeAttribute("data-state");
    try {
      const target = new URL(endpoint, location.href);
      if (target.origin !== location.origin && target.protocol !== "https:")
        throw new Error("INSECURE_CONTACT_ENDPOINT");
      const response = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          name: fields[0][0].value.trim(),
          email: fields[1][0].value.trim(),
          message: fields[2][0].value.trim(),
        }),
      });
      if (!response.ok) throw new Error("CONTACT_REQUEST_FAILED");
      form.reset();
      fields.forEach(([field]) => field.setAttribute("aria-invalid", "false"));
      status.textContent = t("Thanks, your message was sent.");
      status.dataset.state = "success";
    } catch {
      status.textContent = t("We couldn’t send your message. Please try again.");
      status.dataset.state = "error";
    } finally {
      submitting = false;
      form.removeAttribute("aria-busy");
      submit.disabled = false;
      submitLabel.textContent = t("Send Message");
    }
  });

  document.addEventListener("DOMContentLoaded", () => setTimeout(() => {
    const language = document.getElementById("orbit-language-button"),
      actions = document.querySelector(".m-nav__actions"),
      nav = document.getElementById("siteNav"),
      burger = document.getElementById("navBurger"),
      panel = document.getElementById("navPanel"),
      contactLink = document.querySelector('.m-nav__links a[href*="contact.html"]');
    if (language && actions) actions.append(language);
    document.querySelectorAll(".contact-form-card, .contact-info-card").forEach((card) => {
      card.dir = document.documentElement.dir;
    });
    document.querySelector(".contact-card__heading h2")?.setAttribute("dir", "auto");
    document.title = t("Contact Us | ORBIT");
    if (contactLink) {
      contactLink.classList.add("is-active");
      contactLink.setAttribute("aria-current", "page");
    }
    burger?.addEventListener("click", () => {
      const open = panel?.hidden ?? false;
      if (panel) panel.hidden = !open;
      burger.setAttribute("aria-expanded", String(open));
      nav?.classList.toggle("is-open", open);
    });
    panel?.addEventListener("click", (event) => {
      if (!event.target.closest("a")) return;
      panel.hidden = true;
      burger?.setAttribute("aria-expanded", "false");
      nav?.classList.remove("is-open");
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !panel || panel.hidden) return;
      panel.hidden = true;
      burger?.setAttribute("aria-expanded", "false");
      nav?.classList.remove("is-open");
      burger?.focus();
    });
    const syncNav = () => nav?.classList.toggle("is-solid", window.scrollY > 32);
    syncNav();
    window.addEventListener("scroll", syncNav, { passive: true });
    window.addEventListener("pagehide", () => window.removeEventListener("scroll", syncNav), { once: true });
  }, 0));
})();
