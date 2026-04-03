// Calendar Code
let currentDisplayDate = new Date();

function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const monthDisplay = document.getElementById("month-display");

    if (!grid || !monthDisplay) return;

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
        cell.innerText = prevLastDay - x + 1;
        grid.appendChild(cell);
    }

    // Current month days
    for (let i = 1; i <= lastDay; i++) {
        const cell = document.createElement("div");
        cell.className = "calendar-day";
        cell.innerText = i;

        if (
            i === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {
            cell.classList.add("today");
        }

        // Temporary code to test "shift" cell
        if (i % 4 === 0) {
            cell.innerHTML += `<span class="shift">9am-5pm</span>`;
        }

        grid.appendChild(cell);
    }
    //Temporary code to populate test items
    let items = [['March 2026',5,'4am','1pm','test',false],['March 2026',8,'7pm','2am','',true],['March 2026', 31, '10pm','8am','',true]];
    populateCalendar(items);
}

function changeMonth(offset) {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + offset);
    renderCalendar();
}

function populateCalendar(items) {
    
    //items is an array of arrays, with the inner arrays containing: 
    //['month year', day of month, start time, stop time, text description, overnight]
    //  month year: string how it appears on webpage
    //  day of month: int of day of month to modify
    //  start time: string to display for start time
    //  stop time: string to display for stop time
    //  text description: text to display under time
    //  overnight: boolean, true for over midnight shifts false otherwise
    let currentDisplayedMonth = document.getElementById('month-display').childNodes[0].textContent;

    for (let item of items) {
        if (item[0] == currentDisplayedMonth) {
            let toDisplay = `<span class = 'shift'>`+item[2];
            if (!item[5]) {
                toDisplay += "-"+item[3];
            } else {
                toDisplay += "-overnight";
                let nextDisplay = "<span class = 'shift'>overnight-"+item[3]+"</span>";
                appendCell(item[1]+1,nextDisplay);

            }
            if (item[4].length >0) {
                toDisplay += '\n'+item[4];
            }
            toDisplay += "</span>"
            appendCell(item[1],toDisplay);
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
    const grid = document.getElementById('calendar-grid');
    for (element of grid.childNodes) {
        if (element.className == 'calendar-day' && element.innerText.startsWith(day)) {
            return element;
        }
    }

}
//TODO add muted cell changes

function getMutedCell() {
    const grid = document.getElementById('calendar-grid');
    for (element of grid.childNodes) {
        if (element.className == 'calendar-day muted' && element.innerText.startsWith(day)) {
            return element;
        }
    }
}

document.addEventListener("DOMContentLoaded", renderCalendar);
