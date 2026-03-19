// FIXME: all these functions need to access actual stored elements
// temporary
const TEST_USERS = {
    "user1@gmail.com": { password: "12345", type: "admin" },
    "user2@gmail.com": { password: "pass123", type: "user" },
    "user3@gmail.com": { password: "password$abc", type: "user" },
};
const TEST_INVITATIONS = new Map([
    // unique code -> invited user
    ["13a93e8f-48d7-4b47-a61a-f6c967c0fe36", "user4@gmail.com"],
]);
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
        messageBox.backgroundColor = "transparent";
    }, time_ms);
}

function validateLogin(event) {
    event.preventDefault();
    const email = el("email").value.trim();
    const password = el("password").value.trim();
    const user = TEST_USERS[email]; // TODO: replace

    if (user && user.password === password) {
        setSessionEmail(email);
        console.log(`login successful\nuser: ${email}`);
        showStatusMessage("Login Sucessful", "success", 2000);
        // TODO: redirect to calendar, set msg timeout to 0 ^ or remove
        return;
    } else {
        console.log("login failed");
        showStatusMessage("Login Failed", "fail", 3000);
        showForm("login-form");
    }
}

// Allowing users who've received an invite to make password to log
// in after the fact, email associated to account is the one linked to
// the invite code received from an admin user.
function validateInvite(event) {
    event.preventDefault();
    const code = el("invite-code").value.trim();
    const recipient = TEST_INVITATIONS.get(code);
    if (recipient) {
        setSessionEmail(recipient);
        // making the account email visible in the set password form
        el("invitee-email").textContent = `Email: ${recipient}`;
        showForm("create-password-form");
        return;
    } else {
        showStatusMessage("Invalid code", "fail", 3000);
        showForm("accept-invite-form"); // back to code input
    }
}

function createInvitedAccount(event) {
    event.preventDefault();
    const email = getSessionEmail();
    const password = el("new-password").value.trim();

    if (TEST_USERS[email]) {
        // TODO: replace
        showStatusMessage(
            `Account with email: ${email}\nalready exists`,
            "fail",
            3000,
        );
        showForm("login-form");
        return;
    }
    if (!PW_PATTERN.test(password)) {
        showStatusMessage(
            "Password must be: at least 6 characters, have at least 1 letter, have at least 1 number",
            "fail",
            3000,
        );
        showForm("create-password-form");
        return;
    }
    // TODO: replace, storing new user, delete used invite code
    TEST_USERS[email] = { password, type: "user" }; // user type for invite recipients
    showStatusMessage(
        "Account created. You will be redirected to log in.",
        "success",
        2500,
    );
    showForm("login-form");
}

function createAdminAccount(event) {
    event.preventDefault();
    const email = el("admin-email").value.trim(); // input fields
    const password = el("admin-password").value.trim();

    if (TEST_USERS[email]) {
        // TODO: replace
        showStatusMessage(
            `Account with email: ${email}\nalready exists`,
            "fail",
            3000,
        );
        showForm("create-admin-account-form");
        return;
    }
    if (!PW_PATTERN.test(password)) {
        showStatusMessage(
            "Password must be:\nat least 6 characters\nhave at least 1 letter\n have at least 1 number",
            "fail",
            3000,
        );
        showForm("create-admin-account-form");
        return;
    }
    // TODO: replace, storing new user
    TEST_USERS[email] = { password, type: "admin" };
    showStatusMessage(
        "Account created. You will be redirected to log in.",
        "success",
        2500,
    );
    showForm("login-form");
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
