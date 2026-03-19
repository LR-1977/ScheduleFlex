let currentUser = {
    name: "test", role: "admin"
};

function renderNavbar() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;

    navLinks.innerHTML = '';

    const links = [
        { name: 'Calendar', href:'calendar.html'}
    ];

    if (currentUser.role === 'admin') {
        links.push({ name: 'Approvals', href: 'admin-requests.html'});
        links.push({ name: 'Staff Management', href: '#'});
    } 
    else {
        links.push({ name: 'My Schedule', href: '#'});
        links.push({ name: 'Request Change', href: 'request-form.html' });
    }

    links.forEach(link => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${link.href}">${link.name}</a>`;
        navLinks.appendChild(li);
    });

    const themeLi = document.createElement('li');
    themeLi.innerHTML = `<button class="nav-link-style" onclick="toggleTheme()">Theme</button>`;
    navLinks.appendChild(themeLi);
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
}

function switchRoleTest() {
    currentUser.role = currentUser.role === 'admin' ? 'employee' : 'admin';
    alert(`Switched to: ${currentUser.role}`);
    renderNavbar();
}

document.addEventListener('DOMContentLoaded', renderNavbar);