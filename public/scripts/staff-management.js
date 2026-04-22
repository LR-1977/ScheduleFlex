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
                
                const roleDisplay = emp.type === "admin" 
                    ? `<span class="admin-badge">Admin</span>` 
                    : `Staff`;

                row.innerHTML = `
                    <td>${emp.email}</td>
                    <td>${roleDisplay}</td>
                    <td><button disabled>Edit (WIP)</button></td>
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

// 2. Handle the invite form submission
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

// 3. Initialize the page
document.addEventListener("DOMContentLoaded", () => {
    loadEmployees();
    
    const inviteForm = document.getElementById("invite-form");
    if (inviteForm) {
        inviteForm.addEventListener("submit", handleInviteSubmit);
    }
});