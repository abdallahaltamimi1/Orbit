/* Homepage uses its original implementation unchanged. Other pages batch decorative measurements. */
if (
  /\/hompage(?:\/|$)/.test(location.pathname) ||
  location.pathname === "/" ||
  /\/index\.html$/.test(location.pathname)
) {
  (() => {
    "use strict";
    const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
      effects = new Map();
    let frame = 0,
      last = 0,
      phase = 0;
    function allowed() {
      return !reduced.matches && document.body.dataset.mood !== "calm" && !document.hidden;
    }
    function bounds(el) {
      const node = [...el.childNodes].find(
        (n) => n.nodeType === Node.TEXT_NODE && /orbit/i.test(n.textContent),
      );
      if (node) {
        const match = /orbit/i.exec(node.textContent),
          range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + 5);
        return range.getBoundingClientRect();
      }
      return el.getBoundingClientRect();
    }
    function measure(f) {
      const r = bounds(f.target);
      f.rect = r;
      f.width = Math.max(60, r.width + 30);
      f.height = Math.max(34, r.height * 1.6);
      f.layer.style.width = f.width + "px";
      f.layer.style.height = f.height + "px";
      f.layer.style.transform = `translate3d(${r.left + r.width / 2 - f.width / 2}px,${r.top + r.height / 2 - f.height / 2}px,0)`;
      f.layer.style.color = getComputedStyle(f.target).color;
    }
    function request() {
      if (!frame && allowed()) frame = requestAnimationFrame(tick);
    }
    function tick(now) {
      frame = 0;
      if (!allowed()) {
        for (const f of effects.values()) {
          f.layer.style.opacity = "0";
          f.layer.style.visibility = "hidden";
          f.opacity = 0;
          f.active = false;
        }
        last = 0;
        return;
      }
      const dt = Math.min(0.05, (now - (last || now - 16)) / 1000),
        ease = 1 - Math.exp(-dt * 9);
      last = now;
      phase += dt * 0.8;
      let pending = false;
      for (const [target, f] of effects) {
        if (!target.isConnected) {
          f.layer.remove();
          effects.delete(target);
          continue;
        }
        f.opacity += (Number(f.active) - f.opacity) * ease;
        f.x += (f.tx - f.x) * ease;
        f.y += (f.ty - f.y) * ease;
        if (f.opacity < 0.002 && !f.active) {
          f.layer.style.opacity = "0";
          f.layer.style.visibility = "hidden";
          continue;
        }
        pending = true;
        f.layer.style.visibility = "visible";
        f.layer.style.opacity = String(f.opacity);
        f.plane.style.transform = `translate3d(${f.x * 3}px,${f.y * 2}px,0) rotateX(${62 - f.y * 13}deg) rotateY(${f.x * 15}deg) rotateZ(${-22 + f.x * 10}deg)`;
        const a = f.width / 2,
          b = f.height / 2;
        f.dot.style.transform = `translate3d(${a * Math.cos(phase)}px,${b * Math.sin(phase)}px,${Math.sin(phase) * 12}px) rotateX(-62deg) scale(${1 + 0.16 * Math.sin(phase)})`;
      }
      if (pending) frame = requestAnimationFrame(tick);
      else last = 0;
    }
    function discover() {
      document
        .querySelectorAll(
          ".m-logo__word,.brand b,.login-logo > span:last-child,.mobile-logo,.logo,.orbit-rail-brand",
        )
        .forEach((target) => {
          if (!/orbit/i.test(target.textContent) || effects.has(target)) return;
          const layer = document.createElement("div");
          layer.className = "orbit-title-fx";
          layer.setAttribute("aria-hidden", "true");
          layer.innerHTML =
            '<div class="orbit-title-fx-plane"><div class="orbit-title-fx-ring"></div><i class="orbit-title-fx-satellite"></i></div>';
          document.body.append(layer);
          const f = {
            target,
            layer,
            plane: layer.firstChild,
            dot: layer.querySelector("i"),
            opacity: 0,
            active: false,
            x: 0,
            y: 0,
            tx: 0,
            ty: 0,
          };
          effects.set(target, f);
          measure(f);
        });
      for (const [el, f] of effects) {
        if (!el.isConnected) {
          f.layer.remove();
          effects.delete(el);
        }
      }
    }
    function leave() {
      for (const f of effects.values()) {
        f.active = false;
        f.tx = f.ty = 0;
      }
      request();
    }
    document.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse" || !allowed()) return;
        for (const f of effects.values()) {
          const r = f.rect,
            dx = e.clientX - r.left - r.width / 2,
            dy = e.clientY - r.top - r.height / 2;
          f.active = Math.abs(dx) < r.width / 2 + 24 && Math.abs(dy) < r.height / 2 + 24;
          f.tx = f.active ? Math.max(-1, Math.min(1, dx / (r.width / 2 + 24))) : 0;
          f.ty = f.active ? Math.max(-1, Math.min(1, dy / (r.height / 2 + 24))) : 0;
        }
        request();
      },
      { passive: true },
    );
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        leave();
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        for (const f of effects.values()) {
          f.layer.style.opacity = "0";
          f.layer.style.visibility = "hidden";
          f.opacity = 0;
        }
      }
    });
    function reposition() {
      for (const f of effects.values()) measure(f);
      leave();
    }
    window.addEventListener("resize", reposition, { passive: true });
    document.addEventListener("scroll", reposition, { capture: true, passive: true });
    reduced.addEventListener("change", leave);
    document.addEventListener("DOMContentLoaded", () => {
      discover();
      new MutationObserver((records) => {
        if (
          records.some(
            (r) =>
              !r.target.closest?.(".orbit-title-fx") &&
              (r.type === "attributes" ||
                [...r.addedNodes, ...r.removedNodes].some(
                  (n) => n.nodeType === 1 && !n.classList?.contains("orbit-title-fx"),
                )),
          )
        ) {
          discover();
          for (const f of effects.values()) measure(f);
          if (!allowed()) leave();
        }
      }).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-mood", "data-theme"],
      });
      document.fonts?.ready.then(reposition);
    });
  })();
} else {
  (() => {
    "use strict";
    const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
      effects = new Map();
    let frame = 0,
      last = 0,
      phase = 0,
      measureFrame = 0,
      suspended = false,
      observer = null,
      discoverPending = false;
    function allowed() {
      return (
        !suspended && !reduced.matches && document.body.dataset.mood !== "calm" && !document.hidden
      );
    }
    function bounds(el) {
      const node = [...el.childNodes].find(
        (n) => n.nodeType === Node.TEXT_NODE && /orbit/i.test(n.textContent),
      );
      if (node) {
        const match = /orbit/i.exec(node.textContent),
          range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + 5);
        return range.getBoundingClientRect();
      }
      return el.getBoundingClientRect();
    }
    function measureAll() {
      const measurements = [];
      for (const f of effects.values()) {
        if (f.target.isConnected) {
          const r = bounds(f.target);
          measurements.push({ f, r, color: getComputedStyle(f.target).color });
        }
      }
      for (const { f, r, color } of measurements) {
        f.rect = r;
        f.width = Math.max(60, r.width + 30);
        f.height = Math.max(34, r.height * 1.6);
        f.layer.style.width = f.width + "px";
        f.layer.style.height = f.height + "px";
        f.layer.style.transform = `translate3d(${r.left + r.width / 2 - f.width / 2}px,${r.top + r.height / 2 - f.height / 2}px,0)`;
        f.layer.style.color = color;
      }
    }
    function queueMeasure(discovery = false) {
      discoverPending = discoverPending || discovery;
      if (measureFrame || suspended || document.hidden) return;
      measureFrame = requestAnimationFrame(() => {
        measureFrame = 0;
        if (discoverPending) {
          discoverPending = false;
          discover();
        }
        measureAll();
        leave();
      });
    }
    function pending() {
      return [...effects.values()].some((f) => f.active || f.opacity >= 0.002);
    }
    function hide() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      for (const f of effects.values()) {
        f.active = false;
        f.opacity = 0;
        f.tx = f.ty = 0;
        f.layer.style.opacity = "0";
        f.layer.style.visibility = "hidden";
      }
    }
    function request() {
      if (!frame && allowed() && pending()) frame = requestAnimationFrame(tick);
    }
    function tick(now) {
      frame = 0;
      if (!allowed()) {
        for (const f of effects.values()) {
          f.layer.style.opacity = "0";
          f.layer.style.visibility = "hidden";
          f.opacity = 0;
          f.active = false;
        }
        last = 0;
        return;
      }
      const dt = Math.min(0.05, (now - (last || now - 16)) / 1000),
        ease = 1 - Math.exp(-dt * 9);
      last = now;
      phase += dt * 0.8;
      let pending = false;
      for (const [target, f] of effects) {
        if (!target.isConnected) {
          f.layer.remove();
          effects.delete(target);
          continue;
        }
        f.opacity += (Number(f.active) - f.opacity) * ease;
        f.x += (f.tx - f.x) * ease;
        f.y += (f.ty - f.y) * ease;
        if (f.opacity < 0.002 && !f.active) {
          f.layer.style.opacity = "0";
          f.layer.style.visibility = "hidden";
          continue;
        }
        pending = true;
        f.layer.style.visibility = "visible";
        f.layer.style.opacity = String(f.opacity);
        f.plane.style.transform = `translate3d(${f.x * 3}px,${f.y * 2}px,0) rotateX(${62 - f.y * 13}deg) rotateY(${f.x * 15}deg) rotateZ(${-22 + f.x * 10}deg)`;
        const a = f.width / 2,
          b = f.height / 2;
        f.dot.style.transform = `translate3d(${a * Math.cos(phase)}px,${b * Math.sin(phase)}px,${Math.sin(phase) * 12}px) rotateX(-62deg) scale(${1 + 0.16 * Math.sin(phase)})`;
      }
      if (pending) frame = requestAnimationFrame(tick);
      else last = 0;
    }
    function discover() {
      document
        .querySelectorAll(
          ".m-logo__word,.brand b,.login-logo > span:last-child,.mobile-logo,.logo,.orbit-rail-brand",
        )
        .forEach((target) => {
          if (!/orbit/i.test(target.textContent) || effects.has(target)) return;
          const layer = document.createElement("div");
          layer.className = "orbit-title-fx";
          layer.setAttribute("aria-hidden", "true");
          layer.innerHTML =
            '<div class="orbit-title-fx-plane"><div class="orbit-title-fx-ring"></div><i class="orbit-title-fx-satellite"></i></div>';
          document.body.append(layer);
          const f = {
            target,
            layer,
            plane: layer.firstChild,
            dot: layer.querySelector("i"),
            opacity: 0,
            active: false,
            x: 0,
            y: 0,
            tx: 0,
            ty: 0,
          };
          effects.set(target, f);
        });
      for (const [el, f] of effects) {
        if (!el.isConnected) {
          f.layer.remove();
          effects.delete(el);
        }
      }
    }
    function leave() {
      for (const f of effects.values()) {
        f.active = false;
        f.tx = f.ty = 0;
      }
      request();
    }
    document.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse" || !allowed()) return;
        for (const f of effects.values()) {
          const r = f.rect;
          if (!r) continue;
          const dx = e.clientX - r.left - r.width / 2,
            dy = e.clientY - r.top - r.height / 2;
          f.active = Math.abs(dx) < r.width / 2 + 24 && Math.abs(dy) < r.height / 2 + 24;
          f.tx = f.active ? Math.max(-1, Math.min(1, dx / (r.width / 2 + 24))) : 0;
          f.ty = f.active ? Math.max(-1, Math.min(1, dy / (r.height / 2 + 24))) : 0;
        }
        request();
      },
      { passive: true },
    );
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        leave();
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        for (const f of effects.values()) {
          f.layer.style.opacity = "0";
          f.layer.style.visibility = "hidden";
          f.opacity = 0;
        }
      }
    });
    function reposition() {
      queueMeasure();
    }
    window.addEventListener("resize", reposition, { passive: true });
    document.addEventListener("scroll", reposition, { capture: true, passive: true });
    reduced.addEventListener("change", () => {
      if (!allowed()) hide();
      else queueMeasure();
    });
    function observe() {
      observer?.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-mood", "data-theme"],
      });
    }
    function initialize() {
      observer = new MutationObserver((records) => {
        if (
          records.some(
            (r) =>
              !r.target.closest?.(".orbit-title-fx") &&
              (r.type === "attributes" ||
                [...r.addedNodes, ...r.removedNodes].some(
                  (n) => n.nodeType === 1 && !n.classList?.contains("orbit-title-fx"),
                )),
          )
        ) {
          queueMeasure(true);
          if (!allowed()) hide();
        }
      });
      observe();
      queueMeasure(true);
      document.fonts?.ready.then(reposition);
    }
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
    window.addEventListener("pagehide", () => {
      suspended = true;
      hide();
      if (measureFrame) cancelAnimationFrame(measureFrame);
      measureFrame = 0;
      observer?.disconnect();
    });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        suspended = false;
        observe();
        queueMeasure(true);
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) queueMeasure(true);
      else {
        hide();
        if (measureFrame) cancelAnimationFrame(measureFrame);
        measureFrame = 0;
      }
    });
  })();
}
