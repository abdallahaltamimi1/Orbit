document.addEventListener("DOMContentLoaded", function () {
    const schoolOnly = location.pathname.includes('/school-login/') || new URLSearchParams(location.search).get('role') === 'school';
    if(schoolOnly){document.querySelector('.login-heading h2').textContent='School account login';document.querySelectorAll('.demo-user:not([data-user="school"])').forEach(b=>b.remove());document.querySelector('.signup-text').innerHTML='New school? <a href="../school-registration/school-registration.html">Register your school</a>';if(new URLSearchParams(location.search).has('registered'))document.querySelector('.login-heading p').textContent='School account created locally. Sign in with your email and password.';}
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    emailInput.value=sessionStorage.getItem("orbit.registration.email")||"";
    const emailBox = document.getElementById("emailBox");
    const emailStatus = document.getElementById("emailStatus");
    const emailMessage = document.getElementById("emailMessage");

    const passwordInput = document.getElementById("password");
    const passwordBox = document.getElementById("passwordBox");
    const passwordMessage = document.getElementById("passwordMessage");
    const passwordToggle = document.getElementById("passwordToggle");
    const passwordPlanets = document.querySelectorAll("#passwordPlanets span");

    const loginButton = document.getElementById("loginButton");
    const loginMessage = document.getElementById("loginMessage");
    const demoButtons = document.querySelectorAll(".demo-user");

    const loginAnimation = document.getElementById("loginAnimation");
    const animationIcon = document.getElementById("animationIcon");
    const animationTitle = document.getElementById("animationTitle");
    const animationText = document.getElementById("animationText");

    // Stop with a useful console error if HTML and JS are not the same version.
    const required = {
        loginForm, emailInput, emailBox, emailStatus, emailMessage,
        passwordInput, passwordBox, passwordMessage, passwordToggle,
        loginButton, loginMessage, loginAnimation,
        animationIcon, animationTitle, animationText
    };

    for (const [name, element] of Object.entries(required)) {
        if (!element) {
            console.error(`ORBIT Login: Missing HTML element: ${name}`);
            return;
        }
    }

    const users = [
        {
            name: "Alex Student",
            email: "student@orbit.com",
            password: "Student123!",
            role: "student"
        },
        {
            name: "Sarah Teacher",
            email: "teacher@orbit.com",
            password: "Teacher123!",
            role: "teacher"
        },
        {
            name: "Orbit School",
            email: "school@orbit.com",
            password: "School123!",
            role: "school"
        }
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
            showEmailError("Email address is required.");
        } else if (!validateEmail(email)) {
            showEmailError("Enter a valid email address.");
        } else {
            showEmailSuccess();
        }
    });

    function getPasswordStrength(password) {
        let strength = 0;

        if (password.length >= 6) {
            strength++;
        }

        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
            strength++;
        }

        if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) {
            strength++;
        }

        return strength;
    }

    function updatePasswordPlanets() {
        const strength = getPasswordStrength(passwordInput.value);

        passwordPlanets.forEach(function (planet, index) {
            planet.classList.toggle("active", index < strength);
        });
    }

    passwordInput.addEventListener("input", function () {
        updatePasswordPlanets();
        passwordBox.classList.remove("error", "shake");
        passwordMessage.textContent = "";
        loginMessage.textContent = "";
    });

    passwordToggle.addEventListener("click", function () {
        const passwordIsHidden = passwordInput.type === "password";

        passwordInput.type = passwordIsHidden ? "text" : "password";
        passwordToggle.textContent = passwordIsHidden ? "×" : "◉";
        passwordToggle.setAttribute(
            "aria-label",
            passwordIsHidden ? "Hide password" : "Show password"
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

            if (!selectedUser) return;

            emailInput.value = selectedUser.email;
            passwordInput.value = selectedUser.password;

            showEmailSuccess();
            updatePasswordPlanets();

            passwordBox.classList.remove("error", "shake");
            passwordMessage.textContent = "";
            loginMessage.textContent = "";
        });
    });

    function findUser(email, password) {
        return users.find(function (user) {
            return (
                user.email.toLowerCase() === email.toLowerCase() &&
                user.password === password
            );
        });
    }

    function redirectUser(user) {
        const pages = {
            student: "../student-dashboard/student-dashboard.html",
            teacher: "../teacher-dashboard/teacher-dashboard.html",
            school: "../school-dashboard/school-dashboard.html"
        };

        const destination = pages[user.role];

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

    function playSuccessAnimation(user) {
        resetAnimation();

        // Force browser to apply the reset before replaying.
        void loginAnimation.offsetWidth;

        loginAnimation.classList.add("show", "running");
        loginAnimation.setAttribute("aria-hidden", "false");

        setTimeout(function () {
            loginAnimation.classList.remove("running");
            loginAnimation.classList.add("success-animation");

            animationIcon.textContent = "✓";
            animationTitle.textContent =
                "Welcome back, " + user.name.split(" ")[0];
            animationText.textContent = "Entering your orbit...";
        }, 1500);

        setTimeout(function () {
            redirectUser(user);
        }, 2800);
    }

    function playErrorAnimation() {
        resetAnimation();
        void loginAnimation.offsetWidth;

        loginAnimation.classList.add("show", "running");
        loginAnimation.setAttribute("aria-hidden", "false");

        setTimeout(function () {
            loginAnimation.classList.remove("running");
            loginAnimation.classList.add("error-animation");

            animationIcon.textContent = "×";
            animationTitle.textContent = "Off course";
            animationText.textContent = "Check your email or password.";
        }, 1000);

        setTimeout(function () {
            resetAnimation();
        }, 2500);
    }

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        let formIsValid = true;

        loginButton.classList.remove("success");
        loginMessage.textContent = "";

        if (email === "") {
            showEmailError("Email address is required.");
            formIsValid = false;
        } else if (!validateEmail(email)) {
            showEmailError("Enter a valid email address.");
            formIsValid = false;
        } else {
            showEmailSuccess();
        }

        if (password === "") {
            showPasswordError("Password is required.");
            formIsValid = false;
        }

        if (!formIsValid) return;

        loginButton.classList.add("loading");
        loginButton.disabled = true;

        // Front-end demo delay. Replace with fetch() when backend is ready.
        setTimeout(async function () {
            let user;try { user = findUser(email, password) || await OrbitRecruitment.authenticate(email, password); } catch { loginButton.classList.remove("loading");loginButton.disabled=false;loginMessage.textContent="Local login unavailable. Use localhost or HTTPS and check browser storage.";return; }

            loginButton.classList.remove("loading");
            loginButton.disabled = false;

            if (schoolOnly && user?.role !== "school") user = null;
            if (!user) {
                loginMessage.textContent = "Email or password is incorrect.";
                showPasswordError("Check your password and try again.");
                playErrorAnimation();
                return;
            }

            loginButton.classList.add("success");

            OrbitAuth.startSession(user);
            loginButton.disabled = true;
            playSuccessAnimation(user);
        }, 900);
    });

    console.log("ORBIT login.js loaded successfully.");
});
