/* Shared, opt-in interaction primitives. No continuous JS animation loop. */
(() => {
  "use strict";
  if (window.OrbitMotion) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)"),
    fine = matchMedia("(hover:hover) and (pointer:fine)"),
    timers = new Set();
  let active = null,
    frame = 0,
    point = null;
  const text = (en, ar) => (document.documentElement.lang === "en" ? en : ar);
  const allowed = () => fine.matches && !reduce.matches && document.body.dataset.mood !== "calm";
  const primary =
    "#learning-start button,#learning-start [type=submit],#save-profile,#join-code,#join-form button,#publish-form button[type=submit],[data-assignment-publish],.assignment-button.primary,.orbit-welcome-copy .button.primary";
  function eligible(el) {
    return (
      el &&
      !el.disabled &&
      el.getAttribute("aria-disabled") !== "true" &&
      !el.matches(".danger,[data-delete],[data-action=delete],#orbit-logout") &&
      !el.getAttribute("aria-busy")
    );
  }
  function reset() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    point = null;
    if (active) {
      active.style.removeProperty("translate");
      active.removeAttribute("data-orbit-magnetic");
      active = null;
    }
  }
  function move(event) {
    if (event.pointerType !== "mouse" || !allowed()) {
      reset();
      return;
    }
    const el = event.target.closest(primary + " ,[data-orbit-magnet]");
    if (!eligible(el)) {
      reset();
      return;
    }
    if (active !== el) {
      reset();
      active = el;
      el.dataset.orbitMagnetic = "true";
    }
    point = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!active || !point) return;
      const box = active.getBoundingClientRect(),
        x = Math.max(
          -2.5,
          Math.min(2.5, ((point.x - box.left - box.width / 2) / Math.max(box.width / 2, 1)) * 2.5),
        ),
        y = Math.max(
          -2.5,
          Math.min(2.5, ((point.y - box.top - box.height / 2) / Math.max(box.height / 2, 1)) * 2.5),
        );
      active.style.translate = `${x}px ${y}px`;
    });
  }
  document.addEventListener("pointermove", move, { passive: true });
  document.addEventListener(
    "pointerout",
    (e) => {
      if (active && !active.contains(e.relatedTarget)) reset();
    },
    { passive: true },
  );
  document.addEventListener("focusin", reset);
  document.addEventListener("pointerdown", reset, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reset();
  });
  reduce.addEventListener("change", reset);
  fine.addEventListener("change", reset);
  function delay(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }
  function feedback(message, { type = "success" } = {}) {
    let node = document.getElementById("orbit-action-feedback");
    if (!node) {
      node = document.createElement("div");
      node.id = "orbit-action-feedback";
      node.setAttribute("aria-atomic", "true");
      document.body.append(node);
    }
    node.getAnimations().forEach((a) => a.cancel());
    node.dataset.type = type;
    node.setAttribute("role", type === "error" ? "alert" : "status");
    node.replaceChildren();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      type === "error" ? '<path d="m7 7 10 10M17 7 7 17"/>' : '<path d="m5 12 4 4L19 6"/>';
    const label = document.createElement("span");
    label.textContent = message;
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", text("Dismiss notification", "إغلاق الإشعار"));
    close.textContent = "×";
    const hide = () => {
      node.hidden = true;
    };
    close.onclick = hide;
    node.append(svg, label, close);
    node.hidden = false;
    if (node._timer) {
      clearTimeout(node._timer);
      timers.delete(node._timer);
    }
    if (!reduce.matches && document.body.dataset.mood !== "calm") {
      node.animate(
        [
          { opacity: 0, transform: "translateY(8px) scale(.97)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 360, easing: "cubic-bezier(.16,1,.3,1)" },
      );
      if (type === "success")
        svg.animate([{ strokeDashoffset: 24 }, { strokeDashoffset: 0 }], {
          duration: 360,
          easing: "ease-out",
        });
    }
    node._timer = delay(hide, type === "error" ? 10000 : 6500);
    return node;
  }
  function queueFeedback(en, ar) {
    sessionStorage.setItem(
      "orbit.motion.feedback",
      JSON.stringify({ en, ar, at: Date.now(), account: window.OrbitAuth?.current()?.email }),
    );
  }
  const skeletonTypes = [
    "statistics",
    "lesson",
    "channel",
    "assignment",
    "profile",
    "table",
    "panel",
  ];
  function skeleton(kind = "panel", count = 1) {
    const node = document.createElement("div");
    node.className = "orbit-smart-skeleton";
    node.dataset.kind = skeletonTypes.includes(kind) ? kind : "panel";
    node.setAttribute("aria-hidden", "true");
    const number = Math.max(1, Math.min(8, count));
    for (let i = 0; i < number; i++) {
      const item = document.createElement("div");
      item.className = "orbit-skeleton-item";
      for (
        let j = 0;
        j < (kind === "table" ? 6 : kind === "statistics" ? 2 : kind === "profile" ? 5 : 4);
        j++
      ) {
        const bar = document.createElement("span");
        bar.className = "orbit-skeleton-bar";
        item.append(bar);
      }
      node.append(item);
    }
    return node;
  }
  function loading(host, { kind = "panel", count = 1, delayMs = 160 } = {}) {
    if (!host) return () => {};
    let overlay = null,
      finished = false;
    const oldBusy = host.getAttribute("aria-busy"),
      oldPosition = host.style.position;
    host.setAttribute("aria-busy", "true");
    const timer = delay(() => {
      if (finished || !host.isConnected) return;
      overlay = skeleton(kind, count);
      overlay.classList.add("orbit-skeleton-overlay");
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      host.classList.add("orbit-loading-content");
      host.append(overlay);
    }, delayMs);
    return () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      timers.delete(timer);
      overlay?.remove();
      host.classList.remove("orbit-loading-content");
      host.style.position = oldPosition;
      oldBusy === null
        ? host.removeAttribute("aria-busy")
        : host.setAttribute("aria-busy", oldBusy);
    };
  }
  window.OrbitMotion = { feedback, queueFeedback, skeleton, loading, reset };
  try {
    const queued = JSON.parse(sessionStorage.getItem("orbit.motion.feedback") || "null");
    sessionStorage.removeItem("orbit.motion.feedback");
    if (
      queued &&
      Date.now() - queued.at < 15000 &&
      queued.account === window.OrbitAuth?.current()?.email
    )
      feedback(text(queued.en, queued.ar));
  } catch {}
  addEventListener("pagehide", () => {
    reset();
    timers.forEach(clearTimeout);
    timers.clear();
    document.getElementById("orbit-action-feedback")?.remove();
  });
})();
