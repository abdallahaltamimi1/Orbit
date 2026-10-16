(() => {
  "use strict";
  const hero = document.getElementById("hero"),
    video = document.getElementById("hero-film-video"),
    panel = document.getElementById("panel"),
    focus = document.getElementById("focus");
  if (!hero || !video || !panel) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let visible = true,
    disposed = false,
    failed = false,
    frameId = null,
    reveal = null;
  // Video time is the only clock. No CSS-duration timer, seeking or playback changes here.
  function updateReveal() {
    const duration = video.duration;
    const hidden =
      hero.dataset.heroMedia === "cinematic" &&
      !reduce.matches &&
      !failed &&
      hero.dataset.videoReady === "true" &&
      Number.isFinite(duration) &&
      duration > 4 &&
      video.currentTime >= duration - 4;
    if (hidden === reveal) return;
    reveal = hidden;
    hero.dataset.filmReveal = String(hidden);
    panel.inert = hidden;
    if (hidden) panel.setAttribute("aria-hidden", "true");
    else panel.removeAttribute("aria-hidden");
  }
  function stopFrames() {
    if (frameId !== null && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frameId);
    frameId = null;
  }
  function trackFrames() {
    if (
      frameId !== null ||
      disposed ||
      !visible ||
      document.hidden ||
      reduce.matches ||
      video.paused ||
      !video.requestVideoFrameCallback
    )
      return;
    frameId = video.requestVideoFrameCallback(() => {
      frameId = null;
      updateReveal();
      trackFrames();
    });
  }
  async function syncPlayback() {
    if (disposed || document.hidden || !visible || reduce.matches || failed) {
      video.pause();
      stopFrames();
      updateReveal();
      return;
    }
    if (!video.hasAttribute("src")) {
      video.src = video.dataset.src;
      video.load();
    }
    try {
      await video.play();
      if (disposed || document.hidden || !visible || reduce.matches) {
        video.pause();
        stopFrames();
      } else trackFrames();
    } catch {
      if (disposed || document.hidden || !visible || reduce.matches) return;
      failed = true;
      hero.dataset.videoReady = "false";
      updateReveal();
    }
  }
  function setMode(next) {
    hero.dataset.heroMedia = next;
    if (next === "interactive") {
      try {
        window.OrbitInitHeroScene?.();
      } catch {
        /* Existing journey DOM still works without WebGL. */
      }
    }
    hero.dispatchEvent(new Event("orbit:hero-mode"));
    updateReveal();
  }
  function journey(event) {
    if (
      event.target.closest(".u-cta .u-second") ||
      event.target.closest(".orbit-journey-stages button")
    )
      setMode("interactive");
  }
  const journeyObserver = new MutationObserver(() => {
    if (hero.dataset.heroMedia === "interactive" && !focus?.classList.contains("on"))
      setMode("cinematic");
  });
  if (focus) journeyObserver.observe(focus, { attributes: true, attributeFilter: ["class"] });
  function playing() {
    hero.dataset.videoReady = "true";
    updateReveal();
    trackFrames();
  }
  function error() {
    failed = true;
    hero.dataset.videoReady = "false";
    stopFrames();
    updateReveal();
  }
  function preference() {
    video.autoplay = !reduce.matches;
    updateReveal();
    syncPlayback();
  }
  function visibility() {
    syncPlayback();
  }
  const timingEvents = [
    "loadedmetadata",
    "durationchange",
    "timeupdate",
    "seeking",
    "seeked",
    "ended",
  ];
  for (const name of timingEvents) video.addEventListener(name, updateReveal);
  video.addEventListener("playing", playing);
  video.addEventListener("pause", stopFrames);
  video.addEventListener("error", error);
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (!visible) stopFrames();
      syncPlayback();
    },
    { threshold: 0.02 },
  );
  observer.observe(hero);
  function pagehide(event) {
    video.pause();
    stopFrames();
    if (event.persisted) return;
    disposed = true;
    observer.disconnect();
    journeyObserver.disconnect();
    reduce.removeEventListener("change", preference);
    document.removeEventListener("visibilitychange", visibility);
    hero.removeEventListener("click", journey, true);
    for (const name of timingEvents) video.removeEventListener(name, updateReveal);
    video.removeEventListener("playing", playing);
    video.removeEventListener("pause", stopFrames);
    video.removeEventListener("error", error);
    removeEventListener("pageshow", syncPlayback);
  }
  hero.addEventListener("click", journey, true);
  document.addEventListener("visibilitychange", visibility);
  reduce.addEventListener("change", preference);
  addEventListener("pagehide", pagehide);
  addEventListener("pageshow", syncPlayback);
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = !reduce.matches;
  updateReveal();
  syncPlayback();
})();
