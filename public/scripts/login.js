// FIXME: all these functions need to access actual stored elements
// temporary

const PW_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;

function getSessionEmail() {
    return localStorage.getItem("session_email");
}
function setSessionEmail(email) {
    localStorage.setItem("session_email", email);
}

function el(id) {
    return document.getElementById(id);
}

// Reset all editable fields for a form
function clearInputs(form) {
    const inputs = form.querySelectorAll("input");
    inputs.forEach((input) => {
        if (input.type !== "submit" && input.type !== "button") {
            input.value = "";
        }
    });
}

function hideForms() {
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => {
        form.style.display = "none";
    });
}

// Disable all forms except for one selected
function showForm(form_id) {
    hideForms();
    const target = el(form_id);
    if (target) target.style.display = "block";
}

function showStatusMessage(message, status, time_ms) {
    const messageBox = el("auth-msg");
    messageBox.textContent = message;
    messageBox.style.color = "white";
    messageBox.style.backgroundColor = status === "success" ? "green" : "red";
    setTimeout(() => {
        messageBox.textContent = "";
        messageBox.style.backgroundColor = "transparent";
    }, time_ms);
}

async function validateLogin(event) {
    event.preventDefault();
    const email = el("email").value.trim();
    const password = el("password").value.trim();

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            showStatusMessage("Login Successful", "success", 1000);
            setTimeout(() => {
                window.location.href = "/calendar";
            }, 1000);
        } else {
            showStatusMessage(data.message || "Login Failed", "fail", 3000);
            showForm("login-form");
        }
    } catch (error) {
        showStatusMessage("Server error. Try again later.", "fail", 3000);
    }
}

// Allowing users who've received an invite to make password to log
// in after the fact, email associated to account is the one linked to
// the invite code received from an admin user.
async function validateInvite(event) {
    event.preventDefault();
    const code = el("invite-code").value.trim();

    try {
        const response = await fetch("/api/invite/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (response.ok) {
            // The server confirmed it's valid and sent back the associated email.
            el("invitee-email").textContent = `Email: ${data.email}`;
            showForm("create-password-form");
        } else {
            showStatusMessage(data.message || "Invalid code", "fail", 3000);
            showForm("accept-invite-form"); // Keep them on the code input.
        }
    } catch (error) {
        showStatusMessage("Server error. Try again later.", "fail", 3000);
    }
}

// Create an account based on an invite code which was given to the user.
async function createInvitedAccount(event) {
    event.preventDefault();
    const password = el("new-password").value.trim();
    const PW_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;

    // Client-side validation (for password strength)
    if (!PW_PATTERN.test(password)) {
        showStatusMessage(
            "Password must be at least 6 characters, 1 letter, 1 number",
            "fail",
            3000,
        );
        return showForm("create-password-form");
    }

    try {
        // Send the password to the server.
        const response = await fetch("/api/invite/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        });

        const data = await response.json();

        // If the account was successfully created, redirect to login.
        if (response.ok) {
            showStatusMessage(
                "Account created. Redirecting to log in.",
                "success",
                2500,
            );
            setTimeout(() => {
                clearInputs(el("create-password-form"));
                showForm("login-form");
            }, 2500);
        } else {
            // If the account could not be created, show the error message.
            showStatusMessage(data.message, "fail", 3000);

            // If the session expired, kick them back to the code input form
            if (response.status === 400 && data.message.includes("expired")) {
                setTimeout(() => showForm("accept-invite-form"), 2000);
            }
        }
    } catch (error) {
        showStatusMessage("Server error. Try again later.", "fail", 3000);
    }
}

// Admin account creation
async function createAdminAccount(event) {
    event.preventDefault();
    const email = el("admin-email").value.trim();
    const password = el("admin-password").value.trim();
    const secretPhrase = el("admin-secret").value.trim(); // Grab the new phrase
    const PW_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;

    if (!PW_PATTERN.test(password)) {
        showStatusMessage(
            "Password must be at least 6 characters, 1 letter, 1 number",
            "fail",
            3000,
        );
        return showForm("create-admin-account-form");
    }

    try {
        const response = await fetch("/api/admin/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, secretPhrase }), // Include it in the payload
        });

        const data = await response.json();

        if (response.ok) {
            showStatusMessage(
                "Account created. Redirecting to log in.",
                "success",
                2500,
            );
            setTimeout(() => {
                clearInputs(el("create-admin-account-form"));
                showForm("login-form");
            }, 2500);
        } else {
            showStatusMessage(data.message, "fail", 3000);
        }
    } catch (error) {
        showStatusMessage("Server error. Try again later.", "fail", 3000);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const form_btns = document.querySelectorAll("[data-show-form]");
    form_btns.forEach((btn) => {
        btn.addEventListener("click", () => {
            // Id of form btn inst selects
            const target_form = btn.dataset.showForm;
            showForm(target_form);
        });
    });
    el("login-form").addEventListener("submit", validateLogin);
    el("accept-invite-form").addEventListener("submit", validateInvite);
    el("create-password-form").addEventListener("submit", createInvitedAccount);
    el("create-admin-account-form").addEventListener(
        "submit",
        createAdminAccount,
    );
});
