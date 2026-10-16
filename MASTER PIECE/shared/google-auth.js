(() => {
  "use strict";
  const gt = (en, ar) => (document.documentElement.lang === "ar" ? ar : en);
  function setup() {
    const host = document.querySelector(".login-container,#registration-google");
    if (!host) return;
    const wrap = document.createElement("div");
    wrap.className = "orbit-google";
    wrap.innerHTML =
      '<div id="orbit-google-button"></div><p id="orbit-google-status" role="status"></p>';
    host.append(wrap);
    const cfg = window.OrbitConfig || {},
      status = wrap.querySelector("p");
    if (!cfg.googleClientId || !cfg.googleSessionEndpoint) {
      wrap.querySelector("div").innerHTML =
        '<button class="google-unconfigured" type="button" disabled><span aria-hidden="true" class="google-g">G</span> ' +
        gt("Continue with Google", "المتابعة باستخدام Google") +
        "</button>";
      status.textContent =
        document.documentElement.lang === "ar"
          ? "تسجيل Google غير مفعّل حاليًا. استخدم البريد وكلمة المرور."
          : "Google sign-in is not enabled yet. Use email and password.";
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onerror = () =>
      (status.textContent = gt(
        "Could not load Google sign-in. Try email login.",
        "تعذر تحميل تسجيل Google. جرّب البريد الإلكتروني.",
      ));
    script.onload = () => {
      google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: async (response) => {
          status.textContent = gt("Verifying Google sign-in…", "جاري التحقق من تسجيل Google…");
          try {
            const req = await fetch(cfg.googleSessionEndpoint, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
            });
            if (!req.ok) throw Error("authentication");
            const result = await req.json();
            if (!result.user?.email || !["student", "teacher", "school"].includes(result.user.role))
              throw Error("role");
            OrbitAuth.startSession(result.user);
            location.replace(
              "../" +
                (result.user.role === "school"
                  ? "school-dashboard"
                  : result.user.role === "teacher"
                    ? "teacher-dashboard"
                    : "student-dashboard") +
                "/" +
                (result.user.role === "school"
                  ? "school-dashboard"
                  : result.user.role === "teacher"
                    ? "teacher-dashboard"
                    : "student-dashboard") +
                ".html",
            );
          } catch {
            status.textContent = gt(
              "Google authentication failed. Please retry or use email login.",
              "فشل تسجيل Google. حاول مجددًا أو استخدم البريد الإلكتروني.",
            );
          }
        },
      });
      google.accounts.id.renderButton(wrap.querySelector("#orbit-google-button"), {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 300,
      });
    };
    document.head.append(script);
  }
  document.addEventListener("DOMContentLoaded", setup);
})();
