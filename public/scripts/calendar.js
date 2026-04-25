// Calendar Code
let currentDisplayDate = new Date();
let currentUser = null;
let currentEvents = [];
let calendarView = "monthly";


async function loadSessionAndEvents() {
    try {
        const session = await fetch("/api/session");
        if (!session.ok) {
            window.location.href = "/";
            return;
        }

        const sessionData = await session.json();
        currentUser = sessionData.user;

        // User role conditional shift info and rendering
        const scopeEl = document.getElementById("calendar-scope");
        let endpoint;
        if (currentUser.role === "admin") {
            endpoint = "/api/calendar/events";
            scopeEl.innerText = "Showing all scheduled shifts";
        } else {
            endpoint = "/api/calendar/myevents";
            scopeEl.innerText = "Showing your scheduled shifts";
        }

        const events = await fetch(endpoint);
        if (!events.ok) {
            throw new Error("Fialed to load calendar events");
        }

        currentEvents = await events.json(); // the global

    } catch (err) {
        console.error("Failed to load session/events:", err);
    }
}

async function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const monthDisplay = document.getElementById("month-display");

    if (!grid || !monthDisplay) return;

    if (calendarView === "weekly") {
        renderWeeklyCalendar();
        return;
    }

    grid.classList.remove("weekly-view");


    // Clear Grid
    grid.innerHTML = "";

    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth();

    // Set Month/Year header
    const monthName = new Intl.DateTimeFormat("en-US", {
        month: "long",
    }).format(currentDisplayDate);
    monthDisplay.innerText = `${monthName} ${year}`;

    // Create Day Labels
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    days.forEach((day) => {
        const el = document.createElement("div");
        el.className = "day-label";
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
        const cell = document.createElement("div");
        cell.className = "calendar-day muted";
        const dayNum = prevLastDay - x + 1;
        cell.innerHTML = `<div class="day-number">${dayNum}</div>`;
        grid.appendChild(cell);
    }

    // Current month days
    for (let i = 1; i <= lastDay; i++) {
        const cell = document.createElement("div");
        cell.className = "calendar-day";
        cell.dataset.day = String(i);
        cell.innerHTML = `<div class="day-number">${i}</div>`;

        if (
            i === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {
            cell.classList.add("today");
        }

        grid.appendChild(cell);
    }
    const displayedMonthYear = `${monthName} ${year}`;
    monthDisplay.innerText = displayedMonthYear;
    populateCalendar(currentEvents, displayedMonthYear);

}

function renderWeeklyCalendar() {
    const grid = document.getElementById("calendar-grid");
    const monthDisplay = document.getElementById("month-display");

    if (!grid || !monthDisplay) return;

    grid.innerHTML = "";
    grid.classList.add("weekly-view");

    // Find Sunday of the current week
    const weekStart = new Date(currentDisplayDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Header text showing the date range
    const fmt = { month: "short", day: "numeric" };
    const yearStr = weekEnd.getFullYear();
    monthDisplay.innerText =
        `${weekStart.toLocaleDateString("en-US", fmt)} – ${weekEnd.toLocaleDateString("en-US", fmt)}, ${yearStr}`;

    // Day-of-week labels
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    days.forEach((day) => {
        const el = document.createElement("div");
        el.className = "day-label";
        el.innerText = day;
        grid.appendChild(el);
    });

    const today = new Date();

    // One cell per day of the week
    for (let i = 0; i < 7; i++) {
        const cellDate = new Date(weekStart);
        cellDate.setDate(cellDate.getDate() + i);

        const cell = document.createElement("div");
        cell.className = "calendar-day";
        cell.dataset.day = String(cellDate.getDate());

        const dateLabel = cellDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        cell.innerHTML = `<div class="day-number">${dateLabel}</div>`;

        // Mute days outside current month
        if (cellDate.getMonth() !== currentDisplayDate.getMonth()) {
            cell.classList.add("muted");
        }

        // Highlight today
        if (
            cellDate.getDate() === today.getDate() &&
            cellDate.getMonth() === today.getMonth() &&
            cellDate.getFullYear() === today.getFullYear()
        ) {
            cell.classList.add("today");
        }

        grid.appendChild(cell);
    }

    // Populate events for each day in the week
    for (let i = 0; i < 7; i++) {
        const cellDate = new Date(weekStart);
        cellDate.setDate(cellDate.getDate() + i);

        const monthYear = new Intl.DateTimeFormat("en-US", { month: "long" }).format(cellDate) + " " + cellDate.getFullYear();
        const dayNum = cellDate.getDate();

        // Temporarily set data-day for populateCalendar's getCell to work
        // (already set above), just call populateCalendar for this specific monthYear
        populateCalendarDay(currentEvents, monthYear, dayNum);
    }
}



function changeMonth(offset) {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + offset);
    renderCalendar();
}

function changeWeek(offset) {
    currentDisplayDate.setDate(currentDisplayDate.getDate() + (offset * 7));
    renderCalendar();
}

function toggleCalendarView() {
    const toggleBtn = document.getElementById("view-toggle");
    const prevBtn = document.getElementById("btn-prev");
    const nextBtn = document.getElementById("btn-next");

    if (calendarView === "monthly") {
        calendarView = "weekly";
        toggleBtn.innerText = "Monthly View";
        prevBtn.setAttribute("onclick", "changeWeek(-1)");
        nextBtn.setAttribute("onclick", "changeWeek(1)");
        prevBtn.innerText = "Prev Week";
        nextBtn.innerText = "Next Week";
    }
    else {
        calendarView = "monthly";
        toggleBtn.innerText = "Weekly View";
        prevBtn.setAttribute("onclick", "changeMonth(-1)");
        nextBtn.setAttribute("onclick", "changeMonth(1)");
        prevBtn.innerText = "Prev Month";
        nextBtn.innerText = "Next Month";
    }

    renderCalendar();
}

function populateCalendar(items, displayedMonthYear) {

    //items is an array of arrays, with the inner arrays containing:
    //['month year', day of month, start time, stop time, text description, overnight]
    //  month year: string how it appears on webpage
    //  day of month: int of day of month to modify
    //  start time: string to display for start time
    //  stop time: string to display for stop time
    //  text description: text to display under time
    //  overnight: boolean, true for over midnight shifts false otherwise
    // let currentDisplayedMonth = document.getElementById('month-display').childNodes[0].textContent;

    for (const item of items) {
        // arrays are now objects.
        if (item.monthYear !== displayedMonthYear) continue;

        let toDisplay = `<span class='shift'>` + item.start;

        if (!item.overnight) {
            toDisplay += "-" + item.stop;
        } else {
            toDisplay += "-overnight";
            // let nextDisplay = `<span class='shift'>overnight-${item.stop}</span>`;
            // item.day + 1 handles the next day logic
            // appendCell(item.day + 1, nextDisplay);
        }
        if (item.desc && item.desc.length > 0) {
            toDisplay += `<br />${item.desc}`;
        }

        // admins can see who is assigned but would lowkey be useful for swapping purposes,
        // FUTURE: show employees a list of shifts up for swapping ?
        if (currentUser && currentUser.role === "admin" && Array.isArray(item.assignedUsers) && item.assignedUsers.length > 0) {
            toDisplay += `<br />${item.assignedUsers.join(' ')}`;
        }

        toDisplay += "</span>";

        appendCell(item.day, toDisplay);

        // overnight continuation
        if (item.overnight) {
            const nextDay = item.day + 1;
            const cont = `<span class="shift">overnight-${item.stop}</span>`;
            appendCell(nextDay, cont);
        }
    }
}

function populateCalendarDay(items, monthYear, dayNum) {
    for (const item of items) {
        if (item.monthYear !== monthYear || item.day !== dayNum) continue;

        let toDisplay = `<span class='shift'>` + item.start;

        if (!item.overnight) {
            toDisplay += "-" + item.stop;
        } else {
            toDisplay += "-overnight";
        }
        if (item.desc && item.desc.length > 0) {
            toDisplay += `<br />${item.desc}`;
        }

        if (currentUser && currentUser.role === "admin" && Array.isArray(item.assignedUsers) && item.assignedUsers.length > 0) {
            toDisplay += `<br />${item.assignedUsers.join(' ')}`;
        }

        toDisplay += "</span>";
        appendCell(dayNum, toDisplay);

        if (item.overnight) {
            const nextDay = dayNum + 1;
            const cont = `<span class="shift">overnight-${item.stop}</span>`;
            appendCell(nextDay, cont);
        }
    }
}

function appendCell(day, text) {
    let cell = getCell(day);
    if (cell == null) {
        return;
    }
    cell.innerHTML += text;
}

function getCell(day) {
    return document.querySelector(`.calendar-day[data-day="${day}"]`);
}

function getMutedCell() {
    const grid = document.getElementById('calendar-grid');
    for (element of grid.childNodes) {
        if (element.className == 'calendar-day muted' && element.innerText.startsWith(day)) {
            return element;
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadSessionAndEvents();
    renderCalendar();
});
