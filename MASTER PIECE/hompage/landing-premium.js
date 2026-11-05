(() => {
  "use strict";
  const ar = document.documentElement.lang === "ar",
    t = (en, arabic) => (ar ? arabic : en),

    nav = document.getElementById("siteNav");

  // Keep every desktop destination in the mobile menu too.
  const menu = document.getElementById("navPanel"),
    burger = document.getElementById("navBurger");
  if (menu) {
    menu.replaceChildren();
    for (const source of document.querySelectorAll(".m-nav__links a,.m-nav__login,.m-nav__cta"))
      menu.append(source.cloneNode(true));
    menu.querySelectorAll("a").forEach((a) => a.removeAttribute("class"));
  }
  document.addEventListener("click", (event) => {
    if (!menu || menu.hidden || nav.contains(event.target)) return;
    menu.hidden = true;
    burger.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  });
  document.addEventListener("DOMContentLoaded", () =>
    setTimeout(() => {
      const language = document.getElementById("orbit-language-button"),
        actions = document.querySelector(".m-nav__actions");
      if (language && actions) actions.append(language);
    }, 0),
  );

  const sections = [...document.querySelectorAll('.m-nav__links a[href^="#"]')]
    .map((a) => [a, document.querySelector(a.getAttribute("href"))])
    .filter(([, s]) => s);
  function active() {
    let selected = sections[0]?.[0];
    for (const [a, s] of sections) if (s.getBoundingClientRect().top <= 150) selected = a;
    sections.forEach(([a]) => {
      a.classList.toggle("is-active", a === selected);
      if (a === selected) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  }
  addEventListener("scroll", active, { passive: true });
  active();
  addEventListener(
    "pagehide",
    () => {

      removeEventListener("scroll", active);
    },
    { once: true },
  );
})();
