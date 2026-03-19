// Calendar Code
let currentDisplayDate = new Date();

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthDisplay = document.getElementById('month-display');

    if (!grid || !monthDisplay) return;
    
    // Clear Grid
    grid.innerHTML = '';

    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth();

    // Set Month/Year header
    const monthName = new Intl.DateTimeFormat('en-US', {month: 'long'}).format(currentDisplayDate);
    monthDisplay.innerText = `${monthName} ${year}`

    // Create Day Labels
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const el = document.createElement('div');
        el.className = 'day-label';
        el.innerText = day;
        grid.appendChild(el);
    });

    // Calendar 
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();
    const today = new Date();

    // Previous month days
    for (let x = firstDayIndex; x > 0; x--) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day muted';
        cell.innerText = prevLastDay - x + 1;
        grid.appendChild(cell);
    }

    // Current month days
    for (let i = 1; i <= lastDay; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.innerText = i;

        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            cell.classList.add('today');
        }


        // Temporary code to test "shift" cell
        if (i % 4 === 0) {
            cell.innerHTML += `<span class="shift">9am-5pm</span>`
        }

        grid.appendChild(cell);
    }
}

function changeMonth(offset) {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + offset);
    renderCalendar();
}

document.addEventListener('DOMContentLoaded', renderCalendar); 