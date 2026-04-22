// Utility to display messages
function showMessage(msg, isSuccess) {
    const msgBox = document.getElementById("status-msg");
    msgBox.textContent = msg;
    msgBox.style.display = "block";
    msgBox.style.backgroundColor = isSuccess ? "#d4edda" : "#f8d7da";
    msgBox.style.color = isSuccess ? "#155724" : "#721c24";

    setTimeout(() => {
        msgBox.style.display = "none";
    }, 4000);
}

// 1. Fetch and render the employee list
async function loadEmployees() {
    const tableBody = document.getElementById("employee-table-body");

    try {
        const response = await fetch('/api/admin/employees');
        const data = await response.json();

        if (response.ok) {
            tableBody.innerHTML = ""; // Clear loading text

            data.employees.forEach(emp => {
                const row = document.createElement("tr");

                const roleDisplay = emp.role === "admin"
                    ? `<span class="admin-badge">Admin</span>`
                    : `Staff`;

                const roleAction = emp.role === "admin"
                    ? "Demote to User"
                    : "Promote to Admin";

                row.innerHTML = `
                    <td>${emp.email}</td>
                    <td>${roleDisplay}</td>
                    <td>
                        <button class="edit-user-btn" data-email="${emp.email}" data-role="${emp.role}">Edit</button>
                    </td>
                    <td class="employee-controls" style="display: none">
                        <button class="change-role-btn" data-email="${emp.email}" data-role="${emp.role}">${roleAction}</button>
                        <button class="remove-user-btn" data-email="${emp.email}">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `<tr><td colspan="3" style="color:red;">Error: ${data.message}</td></tr>`;
            // If unauthorized, put them to the calendar.
            if (response.status === 403) window.location.href = '/calendar';
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="3" style="color:red;">Network error loading staff.</td></tr>`;
    }
}

// 2. Handle employee edit controls
function handleEmployeeEdits(event) {
    const button = event.target.closest("button");
    if (!button) return;

    const empRow = button.closest("tr");
    if (!empRow) return;

    const empEmail = button.dataset.email;
    const empRole = button.dataset.role;
    const controls = empRow.querySelector(".employee-controls");

    if (button.classList.contains("edit-user-btn")) {
        const editHidden = controls.style.display === "none";
        controls.style.display = editHidden ? "table-cell" : "none";
        return;
    }
    if (button.classList.contains("change-role-btn")) {
        handleChangeUserRole(empEmail, empRole);
        return;
    }
    if (button.classList.contains("remove-user-btn")) {
        handleRemoveUser(empEmail);
        return;
    }
}

// Update employee role
async function handleChangeUserRole(email, role) {
    const setRole = role === "admin" ? "user" : "admin";

    try {
        const response = await fetch('/api/admin/employees/role', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role: setRole })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`Successfully updated ${email} role to ${setRole}.`, true);
            loadEmployees();
        } else {
            showMessage(data.message || "Failed to change user role.", false);
        }
    } catch (error) {
        showMessage("Network Error. Could not change user role.", false);
    }
}

// Delete employee by email
async function handleRemoveUser(email) {
    const confirmation = confirm(`Permanently Delete ${email} ?`);
    if (!confirmation) return;

    try {
        const response = await fetch("/api/admin/employees", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`Successfully deleted user: ${email}.`, true);
            loadEmployees();
        } else {
            showMessage(data.message || `Failed to delete user.`, false);
        }
    } catch (error) {
        showMessage("Network Error. Could not delete user.", false);
    }
}



// 3. Handle the invite form submission
async function handleInviteSubmit(event) {
    event.preventDefault();

    const emailInput = document.getElementById("invite-email");
    const targetEmail = emailInput.value.trim();
    const submitBtn = event.target.querySelector("button");

    submitBtn.disabled = true; // Prevent double clicks
    submitBtn.textContent = "Sending...";

    try {
        // Nodemailter script!
        const response = await fetch('/api/admin/invite/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetEmail })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`Invite sent successfully to ${targetEmail}`, true);
            emailInput.value = ""; // Clear the form
        } else {
            showMessage(data.message || "Failed to send invite.", false);
        }
    } catch (error) {
        showMessage("Network error. Could not send invite.", false);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Invite";
    }
}

// 4. Initialize the page
document.addEventListener("DOMContentLoaded", () => {
    loadEmployees();

    const inviteForm = document.getElementById("invite-form");
    if (inviteForm) {
        inviteForm.addEventListener("submit", handleInviteSubmit);
    }

    const tableBody = document.getElementById("employee-table-body");
    if (tableBody) {
        tableBody.addEventListener("click", handleEmployeeEdits);
    }
});