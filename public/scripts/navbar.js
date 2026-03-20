// Rendering the Navbar
async function renderNavbar() {
    const navLinks = document.getElementById("nav-links");
    if (!navLinks) return;
    navLinks.innerHTML = "";
    
    try {
        const response = await fetch("/api/session");
        if (!response.ok) {
            window.location.href = "/"; // Redirect if not logged in.
            return;
        }

        const sessionData = await response.json();
        const role = sessionData.user.role;

        const links = [{ name: "Calendar", href: "/calendar" }];

        // Depending on when the user is an administrator or not, we show different links.
        if (role === "admin") {
            links.push({ name: "Approvals", href: "/admin-requests.html" });
            links.push({ name: "Staff Management", href: "#" });
        } else {
            links.push({ name: "My Schedule", href: "#" });
            links.push({ name: "Request Change", href: "/request-form.html" });
        }

        links.forEach((link) => {
            const li = document.createElement("li");
            li.innerHTML = `<a href="${link.href}">${link.name}</a>`;
            navLinks.appendChild(li);
        });

        const themeLi = document.createElement("li");
        themeLi.innerHTML = `<button class="nav-link-style" onclick="toggleTheme()">Theme</button>`;
        navLinks.appendChild(themeLi);

        const logoutLi = document.createElement("li");
        logoutLi.innerHTML = `<button class="nav-link-style" onclick="handleLogout()">Log Out</button>`;
        navLinks.appendChild(logoutLi);

    } catch (error) {
        console.error("Failed to load nav", error);
    }
}

async function handleLogout() {
    try {
        const response = await fetch("/api/logout", { method: "POST" });
        if (response.ok) {
            window.location.href = "/"; // Redirect to login page
        }
    } catch (error) {
        console.error("Logout failed", error);
    }
}

// Theme toggle
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.cookie = `theme = ${newTheme}`;
    html.setAttribute("data-theme", newTheme);
}


// TEMP FUNC: Switch between admin and employee for now
function switchRoleTest() {
    currentUser.role = currentUser.role === "admin" ? "employee" : "admin";
    alert(`Switched to: ${currentUser.role}`);
    renderNavbar();
}

//document.addEventListener('DOMContentLoaded', loadTheme);
document.addEventListener("DOMContentLoaded", renderNavbar);
