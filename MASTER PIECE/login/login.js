document.addEventListener("DOMContentLoaded", function () {
  const loginText = (en, ar) => (document.documentElement.lang === "ar" ? ar : en);

  const appearance = OrbitAuth.get("orbit.student.v1", {});
  document.body.dataset.theme = appearance.theme === "dark" ? "dark" : "light";
  document.body.dataset.mood =
    localStorage.getItem("orbit.motion.preference") || appearance.mood || "fun";
  const schoolOnly =
    location.pathname.includes("/school-login/") ||
    new URLSearchParams(location.search).get("role") === "school";

  if (schoolOnly) {
    document.querySelector(".login-heading h2").textContent = "School account login";
    document.querySelectorAll('.demo-user:not([data-user="school"])').forEach((b) => b.remove());
    document.querySelector(".signup-text").innerHTML =
      'New school? <a href="../school-registration/school-registration.html">Register your school</a>';
    if (new URLSearchParams(location.search).has("registered"))
      document.querySelector(".login-heading p").textContent =
        "School account created locally. Sign in with your email and password.";
  }

  const loginForm = document.getElementById("loginForm");

  const emailInput = document.getElementById("email");

  emailInput.value = sessionStorage.getItem("orbit.registration.email") || "";

  const emailBox = document.getElementById("emailBox");

  const emailStatus = document.getElementById("emailStatus");

  const emailMessage = document.getElementById("emailMessage");

  const passwordInput = document.getElementById("password");

  const passwordBox = document.getElementById("passwordBox");

  const passwordMessage = document.getElementById("passwordMessage");

  const passwordToggle = document.getElementById("passwordToggle");

  const loginButton = document.getElementById("loginButton");

  const loginMessage = document.getElementById("loginMessage");

  const demoButtons = document.querySelectorAll(".demo-user");

  const loginAnimation = document.getElementById("loginAnimation");

  const animationIcon = document.getElementById("animationIcon");

  const animationTitle = document.getElementById("animationTitle");

  const animationText = document.getElementById("animationText");

  // Stop with a useful console error if HTML and JS are not the same version.

  const required = {
    loginForm,
    emailInput,
    emailBox,
    emailStatus,
    emailMessage,

    passwordInput,
    passwordBox,
    passwordMessage,
    passwordToggle,

    loginButton,
    loginMessage,
    loginAnimation,

    animationIcon,
    animationTitle,
    animationText,
  };

  for (const [name, element] of Object.entries(required)) {
    if (!element) {
      console.error(`ORBIT Login: Missing HTML element: ${name}`);

      return;
    }
  }

  const demoAllowed = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  if (!demoAllowed) document.querySelector(".demo-section")?.remove();
  const users = [
    {
      name: "Alex Student",

      email: "student@orbit.com",

      password: "Student123!",

      role: "student",
    },

    {
      name: "Sarah Teacher",

      email: "teacher@orbit.com",

      password: "Teacher123!",

      role: "teacher",
    },

    {
      name: "Orbit School",

      email: "school@orbit.com",

      password: "School123!",

      role: "school",
    },
  ];

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function resetEmailState() {
    emailBox.classList.remove("success", "error", "shake");

    emailStatus.textContent = "";

    emailMessage.textContent = "";

    emailInput.removeAttribute("aria-invalid");
  }

  function showEmailSuccess() {
    emailBox.classList.remove("error", "shake");

    emailBox.classList.add("success");

    emailStatus.textContent = "✓";

    emailMessage.textContent = "";

    emailInput.setAttribute("aria-invalid", "false");
  }

  function showEmailError(message) {
    emailBox.classList.remove("success", "shake");

    emailBox.classList.add("error");

    emailStatus.textContent = "!";

    emailMessage.textContent = message;

    emailInput.setAttribute("aria-invalid", "true");

    // Restart shake animation.

    void emailBox.offsetWidth;

    emailBox.classList.add("shake");

    setTimeout(function () {
      emailBox.classList.remove("shake");
    }, 350);
  }

  emailInput.addEventListener("input", function () {
    const email = emailInput.value.trim();

    loginMessage.textContent = "";

    if (email === "") {
      resetEmailState();

      return;
    }

    if (validateEmail(email)) {
      showEmailSuccess();
    } else {
      // Stay neutral while the user is still typing.

      emailBox.classList.remove("success", "error", "shake");

      emailStatus.textContent = "";

      emailMessage.textContent = "";
    }
  });

  emailInput.addEventListener("blur", function () {
    const email = emailInput.value.trim();

    if (email === "") {
      showEmailError(loginText("Email address is required.", "البريد الإلكتروني مطلوب."));
    } else if (!validateEmail(email)) {
      showEmailError(loginText("Enter a valid email address.", "أدخل بريدًا إلكترونيًا صحيحًا."));
    } else {
      showEmailSuccess();
    }
  });

  passwordInput.addEventListener("input", function () {
    passwordBox.classList.remove("error", "shake");
    passwordInput.removeAttribute("aria-invalid");

    passwordMessage.textContent = "";

    loginMessage.textContent = "";
  });

  passwordToggle.addEventListener("click", function () {
    const passwordIsHidden = passwordInput.type === "password";

    passwordInput.type = passwordIsHidden ? "text" : "password";

    passwordToggle.innerHTML = passwordIsHidden
      ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 3 18 18M10.5 5.1 12 5c6.5 0 10 7 10 7a20 20 0 0 1-4.1 4.7M6.2 6.2A20 20 0 0 0 2 12s3.5 7 10 7a13 13 0 0 0 5.4-1.2M10 10a3 3 0 0 0 4 4"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';

    passwordToggle.setAttribute("aria-pressed", String(passwordIsHidden));

    passwordToggle.setAttribute(
      "aria-label",

      document.documentElement.lang === "ar"
        ? passwordIsHidden
          ? "إخفاء كلمة المرور"
          : "إظهار كلمة المرور"
        : passwordIsHidden
          ? "Hide password"
          : "Show password",
    );
  });

  function showPasswordError(message) {
    passwordBox.classList.remove("shake");

    passwordBox.classList.add("error");

    passwordMessage.textContent = message;

    void passwordBox.offsetWidth;

    passwordBox.classList.add("shake");

    setTimeout(function () {
      passwordBox.classList.remove("shake");
    }, 350);
  }

  demoButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const selectedUser = users.find(function (user) {
        return user.role === button.dataset.user;
      });

      if (!demoAllowed || !selectedUser) return;
      demoButtons.forEach((b) => {
        b.classList.toggle("is-selected", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      });

      emailInput.value = selectedUser.email;

      passwordInput.value = selectedUser.password;

      showEmailSuccess();

      passwordBox.classList.remove("error", "shake");

      passwordMessage.textContent = "";

      loginMessage.textContent = "";
    });
  });

  function findUser(email, password) {
    if (!demoAllowed) return null;

    return users.find(function (user) {
      return user.email.toLowerCase() === email.toLowerCase() && user.password === password;
    });
  }

  function redirectUser(user) {
    const pages = {
      admin: "../admin/admin.html",
      student: "../student-dashboard/student-dashboard.html",

      teacher: "../teacher-dashboard/teacher-dashboard.html",

      school: "../school-dashboard/school-dashboard.html",
    };

    const destination = OrbitSubscriptions.nextDestination(user) || pages[user.role];

    // The dashboard files will be added later.

    if (destination) {
      window.location.href = destination;
    }
  }

  function resetAnimation() {
    loginAnimation.className = "login-animation";

    loginAnimation.setAttribute("aria-hidden", "true");

    animationIcon.textContent = "";

    animationTitle.textContent = "";

    animationText.textContent = "";
  }

  let redirectTimer = 0;
  function playSuccessAnimation(user) {
    resetAnimation();
    loginAnimation.classList.add("show", "success-animation");
    loginAnimation.setAttribute("aria-hidden", "false");
    loginAnimation.setAttribute("role", "status");
    loginAnimation.setAttribute("aria-live", "polite");
    animationIcon.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
    animationTitle.textContent =
      loginText("Welcome back, ", "أهلًا بعودتك، ") + user.name.split(" ")[0];
    animationText.textContent = loginText("Opening your dashboard…", "بنفتح صفحتك…");
    redirectTimer = setTimeout(
      () => redirectUser(user),
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 450,
    );
  }
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (loginButton.disabled) return;
    const email = emailInput.value.trim(),
      password = passwordInput.value;
    let valid = true;
    loginMessage.textContent = "";
    if (!email || !validateEmail(email)) {
      showEmailError(loginText("Enter a valid email address.", "أدخل بريدًا إلكترونيًا صحيحًا."));
      valid = false;
    } else showEmailSuccess();
    if (!password) {
      showPasswordError(loginText("Password is required.", "كلمة المرور مطلوبة."));
      passwordInput.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (!valid) {
      (!email || !validateEmail(email) ? emailInput : passwordInput).focus();
      return;
    }
    loginButton.classList.add("loading");
    loginButton.disabled = true;
    loginButton.setAttribute("aria-busy", "true");
    loginMessage.textContent = loginText("Signing in…", "جارٍ تسجيل الدخول…");
    let success = false;
    try {
      let user =
        findUser(email, password) || (await OrbitRecruitment.authenticate(email, password));
      if (schoolOnly && user?.role !== "school") user = null;
      if (!user) {
        loginMessage.textContent = loginText(
          "Email or password is incorrect.",
          "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        );
        passwordInput.setAttribute("aria-invalid", "true");
        passwordInput.focus();
        return;
      }
      try {
        OrbitAuth.startSession(user);
      } catch {
        loginMessage.textContent = loginText(
          "This account is inactive or access is denied.",
          "هذا الحساب غير نشط أو لا يملك صلاحية الدخول.",
        );
        return;
      }
      success = true;
      loginButton.classList.add("success");
      loginMessage.textContent = "";
      try {
        if (document.getElementById("rememberMe").checked)
          localStorage.setItem("orbit.login.rememberedEmail", email);
        else localStorage.removeItem("orbit.login.rememberedEmail");
      } catch {}
      playSuccessAnimation(user);
    } catch {
      loginMessage.textContent = loginText(
        "Login is unavailable. Check your connection and browser storage, then try again.",
        "تعذر تسجيل الدخول. تحقق من الاتصال وتخزين المتصفح وحاول مجددًا.",
      );
    } finally {
      loginButton.classList.remove("loading");
      loginButton.removeAttribute("aria-busy");
      if (!success) loginButton.disabled = false;
    }
  });
  try {
    const remembered = localStorage.getItem("orbit.login.rememberedEmail");
    if (remembered) {
      if (!emailInput.value) emailInput.value = remembered;
      document.getElementById("rememberMe").checked = true;
    }
  } catch {}
  addEventListener("pagehide", () => clearTimeout(redirectTimer));
  const recovery = document.querySelector(".password-label>span");
  if (recovery) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "passwordRecovery";
    button.className = "password-recovery";
    button.textContent = loginText("Forgot password?", "نسيت كلمة المرور؟");
    button.onclick = () => {
      loginMessage.textContent = loginText(
        "Password recovery is not connected yet. No reset email has been sent.",
        "استعادة كلمة المرور غير مربوطة حاليًا. لم تُرسل رسالة استعادة.",
      );
      loginMessage.focus();
    };
    recovery.replaceWith(button);
  }
  const setText = (selector, en, ar) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = loginText(en, ar);
  };

  setText(".visual-badge", "✦ Continue your journey", "✦ كمّل رحلتك");

  const visualTitle = document.querySelector(".visual-content h1");
  if (visualTitle)
    visualTitle.innerHTML = loginText(
      "Your next <span>discovery</span> is waiting.",
      "<span>اكتشافك</span> القادم بانتظارك.",
    );

  setText(
    ".visual-content>p",
    "Return to your learning universe and continue exploring, teaching and growing.",
    "ارجع إلى عالمك التعليمي، وكمل الاستكشاف والتدريس والتطور.",
  );

  setText(".visual-footer", "Learn. Teach. Discover.", "تعلّم. علّم. اكتشف.");

  setText(".login-small-title", "Welcome back", "أهلًا بعودتك");

  setText(
    ".login-heading h2",
    schoolOnly ? "School account login" : "Log in to your account",
    schoolOnly ? "تسجيل دخول المدرسة" : "سجّل دخولك إلى حسابك",
  );

  setText(
    ".login-heading p",
    schoolOnly && new URLSearchParams(location.search).has("registered")
      ? "School account created locally. Sign in with your email and password."
      : "Continue where you left off.",
    schoolOnly && new URLSearchParams(location.search).has("registered")
      ? "تم إنشاء حساب المدرسة محليًا. ادخل بالبريد وكلمة المرور."
      : "كمّل من المكان اللي وصلت له.",
  );

  setText("label[for=email]", "Email address", "البريد الإلكتروني");
  setText("label[for=password]", "Password", "كلمة المرور");

  setText(".password-label>span", "Forgot password?", "نسيت كلمة المرور؟");

  const recoveryHint = document.querySelector(".password-label>span");
  if (recoveryHint)
    recoveryHint.title = loginText(
      "Password recovery is not connected in this local prototype",
      "استعادة كلمة المرور غير مربوطة في النموذج المحلي.",
    );

  passwordInput.placeholder = loginText("Enter your password", "أدخل كلمة المرور");
  passwordInput.dir = "ltr";
  emailInput.dir = "ltr";

  passwordToggle.setAttribute("aria-label", loginText("Show password", "إظهار كلمة المرور"));

  setText(".remember>span", "Remember my email", "تذكّر بريدي");
  setText(".button-text", "Log in", "تسجيل الدخول");
  setText(".demo-title", "Demo accounts", "حسابات تجريبية");

  for (const [role, en, ar] of [
    ["student", "Student", "طالب"],
    ["teacher", "Teacher", "معلم"],
    ["school", "School", "مدرسة"],
  ]) {
    const button = document.querySelector('[data-user="' + role + '"]');
    if (button) {
      const icon = button.querySelector("span");
      button.replaceChildren(icon, document.createTextNode(loginText(en, ar)));
    }
  }

  const signup = document.querySelector(".signup-text");
  if (signup)
    signup.innerHTML = schoolOnly
      ? loginText(
          'New school? <a href="../school-registration/school-registration.html">Register your school</a>',
          'مدرسة جديدة؟ <a href="../school-registration/school-registration.html">سجّل مدرستك</a>',
        )
      : loginText(
          'New to ORBIT? <a href="../registration/registration.html">Create an account</a>',
          'جديد على ORBIT؟ <a href="../registration/registration.html">أنشئ حسابًا</a>',
        );

  document.title = loginText("Login | ORBIT", "تسجيل الدخول | ORBIT");
});
