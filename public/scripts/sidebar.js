var workingEmployees;
var shiftIndex = 0;
var pendingRequests = [];

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const dashboard = document.getElementById("dashboard");
    const toggleBtn = document.getElementById("sidebar-tab");

    sidebar.classList.toggle("collapsed");

    if (dashboard) {
        dashboard.classList.toggle("sidebar-collapsed");
    }

    if (sidebar.classList.contains("collapsed")) {
        toggleBtn.innerHTML = "&#9654;";
    }
    else {
        toggleBtn.innerHTML = "&#9664;";
    }
}

async function renderSidebar() {
    const sideLinks = document.getElementById("side-links");
    const navButtons = document.getElementById("side-buttons");

    const assignForm = document.getElementById("assignment-form");
    const assignButtons = document.getElementById("assignment-buttons");

    const rescheduleRequest = document.getElementById("reschedule-request");
    const rescheduleButtons = document.getElementById("reschedule-buttons");

    if (!sideLinks || !navButtons || !rescheduleRequest) return;
    sideLinks.innerHTML = "";

    try {
        const response = await fetch("/api/session");
        if (!response.ok) {
            window.location.href = "/"; // Redirect if not logged in.
            return;
        }

        const sessionData = await response.json();
        const role = sessionData.user.role;
        //const role = "admin";

        //TODO: replace hard coded side links with db call when db created
        //const workingEmployees = await getDataFromDB(sessionData.user.email);
        //Assuming the db presents a list of:
            //first item is the string saying the date of the shift
            //second item is the start time of shift for that manager
            //third item is the end time of shift for that manager
            //all following items are a string of name and times for an employee working that day
        const eventRes = await fetch("/api/calendar/events");
        const allEvents = await eventRes.json();
        workingEmployees = allEvents
            .filter((e) => !e.eventType || e.eventType === "shift")
            .map((ev) => {
                const stop = ev.overnight ? "overnight" : ev.stop;
                const assignedList = (ev.assignedUsers || []).map(u => `${u}  ${ev.start}–${stop}`);
                return [`${ev.monthYear} — Day ${ev.day}`, ev.start, stop, ...assignedList];
            });
        //TODO: replace hard coded reschedule requests with db call when db created
        //Assuming the db presents a list of:
            //first item is the string saying the date of the first shift to be rescheduled
            //second item is the string of the employee requesting the change and their current shift time
            //third item is the string saying the date of the second shift to be rescheduled
            //fourth item is the string of the employee they want to switch with and their current shift time
            //fifth item is the total number of requests for the manager to approve/deny (for display purposes)
        const reqRes = await fetch("/api/requests/pending");
        pendingRequests = await reqRes.json();

        // Depending on when the user is an administrator or not, we show different links.
        if (role === "admin") {

            if (workingEmployees.length > 0) getManagerDisplayedShift(workingEmployees[shiftIndex]);
            if (pendingRequests.length > 0) getReschedule(formatRequestForSidebar(pendingRequests[0]));

            // here is buttons
            const switchTitle = document.createElement("li");
            switchTitle.innerHTML = `Assign A Shift:`;
            switchTitle.style.fontWeight = "bold";
            switchTitle.style.fontSize = "18px";
            assignForm.appendChild(switchTitle);

            const submitAssignment = document.createElement("li");
            submitAssignment.innerHTML = `<button class="nav-link-style" id="submit-assignment-button">Submit</button>`;
            assignButtons.appendChild(submitAssignment);
            //getAssignShiftForm() must be called after the submit button is created so that the event listener can be added to it.
            getAssignShiftForm();

            const nextLi = document.createElement("li");
            nextLi.innerHTML = `<button class="nav-link-style" onclick="nextManagerShift()">Next Shift</button>`;
            navButtons.appendChild(nextLi);

            const prevLi = document.createElement("li");
            prevLi.innerHTML = `<button class="nav-link-style" onclick="prevManagerShift()">Prev Shift</button>`;
            navButtons.appendChild(prevLi);

            const approveLi = document.createElement("li");
            approveLi.innerHTML = `<button class="nav-link-style" onclick="approveRequest()">Approve</button>`;
            rescheduleButtons.appendChild(approveLi);

            const denyLi = document.createElement("li");
            denyLi.innerHTML = `<button class="nav-link-style" onclick="denyRequest()">Deny</button>`;
            rescheduleButtons.appendChild(denyLi);

            const skipLi = document.createElement("li");
            skipLi.innerHTML = `<button class="nav-link-style" onclick="skipRequest()">Skip</button>`;
            rescheduleButtons.appendChild(skipLi);

            //TODO: make the number of remaining requests better
            const remainingLi = document.createElement("div");
            remainingLi.style.textAlign = "left";
            remainingLi.innerHTML = `Remaining Requests: ${rescheduleRequest.length}`;
            rescheduleButtons.appendChild(remainingLi);


        } else {
            //user is in employee role
            //just hiding the collapsed form and button container styling, nothing is loaded inside for non admins
            assignForm.style.display = "none";
            assignButtons.style.display = "none";

            const switchTitle = document.createElement("li");
            switchTitle.innerHTML = `Swap Shift Form:`;
            switchTitle.style.fontWeight = "bold";
            switchTitle.style.fontSize = "18px";
            sideLinks.appendChild(switchTitle);

            const submitReschedule = document.createElement("li");
            submitReschedule.innerHTML = `<button class="nav-link-style" id="submit-button">Submit</button>`;
            navButtons.appendChild(submitReschedule);
            //getRescheduleForm() must be called after the submit button is created so that the event listener can be added to it.
            getRescheduleForm();

            const dayOffTitle = document.createElement("li");
            dayOffTitle.innerHTML = `Request Day Off Form:`;
            dayOffTitle.style.fontWeight = "bold";
            dayOffTitle.style.fontSize = "18px";
            rescheduleRequest.appendChild(dayOffTitle);

            const submitDayOff = document.createElement("li");
            submitDayOff.innerHTML = `<button class="nav-link-style" id="day-off-button">Submit</button>`;
            rescheduleButtons.appendChild(submitDayOff);
            //getDayOffForm() must be called after the submit button is created so that the event listener can be added to it.
            getDayOffForm();

            document.getElementById("side-title").innerText = "Dedicated Drivers Desired Day Dashboard";
        }


    // here is for the sidebar height
    // sidebarHeight();

    } catch (error) {
        console.error("Failed to load sidebar", error);
    }
}

async function getAssignShiftForm() {
    const assignForm = document.getElementById("assignment-form");

    const li = document.createElement("li");
    li.innerHTML =
        `<form id="assign-shift-form">
        <br>

        <!-- MONTH -->
        <label for="month-input">Month</label><br>
        <select id="month-input" style="width:100%;margin:4px 0 8px 0;">
            <option value="" disabled selected>loading months</option>
        </select>
        <br>

        <!-- DAY -->
        <label for="day-input">Day</label><br>
        <input type="number" id="day-input" name="day-input" value="" placeholder="Day" size="15" style="width:40%">

        <!-- Year -->
        <input type="number" id="year-input" name="year-input" value="" placeholder="Year" size="15" style="width:40%">
        <br>

        <!-- START -->
        <br>
        <label for="start-input">Start Time</label><br>
        <select id="start-input" style="width:100%;margin:4px 0 8px 0;">
            <option value="" disabled selected>loading times</option>
        </select>
        <!-- START AM/PM -->
        <div class="radio-group">
            <input class="ampm-radio" type="radio" id="AM-1" name="start-choices" value="am">
            <label class="radio-label" for="AM-1">AM</label>

            <input class="ampm-radio" type="radio" id="PM-1" name="start-choices" value="pm">
            <label class="radio-label" for="PM-1">PM</label>
        </div>
        <br>

        <!-- END -->
        <label for="stop-input">End Time</label><br>
        <select id="stop-input" style="width:100%;margin:4px 0 8px 0;">
            <option value="" disabled selected>loading times</option>
        </select>
        <!-- END AM/PM -->
        <div class="radio-group">
            <input class="ampm-radio" type="radio" id="AM-2" name="stop-choices" value="am">
            <label class="radio-label" for="AM-2">AM</label>

            <input class="ampm-radio" type="radio" id="PM-2" name="stop-choices" value="pm">
            <label class="radio-label" for="PM-2">PM</label>
        </div>
        <br>

        <!-- DESC -->
        <label for="desc-input">Description</label><br>
        <textarea id="desc-input" name="desc-input" rows="2" cols="16"></textarea>
        <br>

        <!-- USERS -->
        <label for="employee-input">Assignee Emails (one per line, ensure no typos)</label><br>
        <textarea id="employee-input" name="employee-input" rows="2" cols="16"></textarea>
        <br>

        <!-- SUBMIT is in renderSidebar() -->
        </form>

        <style>
            .ampm-radio {
                display: none;
            }
            .radio-label {
              display: inline-block;
              padding: 4px 12px;
              border: 2px solid #fff;
              cursor: pointer;
              border-radius: 4px;
            }
            .ampm-radio:checked + label {
              background-color: var(--accent);
              color: white;
              border-color: var(--accent);
            }
        </style>`;
    assignForm.appendChild(li);

    // Populating Fields

    // Month
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currMonth = new Date().toLocaleString('default', { month: 'long' });
    const monthSelection = document.getElementById("month-input");
    monthSelection.innerHTML = ""; // remove load placeholder
    for (let i = 0; i < 12; i++) {
        let opt = document.createElement('option');
        opt.value = months[i];
        opt.innerHTML = months[i];
        if (currMonth === months[i]) {
            opt.selected = true;
        }
        monthSelection.appendChild(opt);
    }

    // Day
    const dayInput = document.getElementById("day-input");
    const currDay = new Date().getDate();
    dayInput.value = Math.min(currDay + 1, 28); // setting a safe auto-fill

    // Year
    const yearInput = document.getElementById("year-input");
    const currYear = new Date().getFullYear();
    yearInput.value = currYear;

    // Start
    const startSelection = document.getElementById("start-input");
    startSelection.innerHTML = ""; // remove load placeholder
    for (let i = 1; i <= 12; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = i;
        if (i == 12) opt.selected = true;
        startSelection.appendChild(opt);
    }

    // Stop
    const stopSelection = document.getElementById("stop-input");
    stopSelection.innerHTML = ""; // remove load placeholder
    for (let i = 1; i <= 12; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = i;
        if (i == 12) opt.selected = true;
        stopSelection.appendChild(opt);
    }

    // Wire up the submit button existing in renderSidebar
    const submitButton = document.getElementById("submit-assignment-button");
    submitButton.addEventListener("click", async (event) => {
        event.preventDefault();

        // Shift specification from form inputs
        var monthYear = document.getElementById("month-input").value + " " + document.getElementById("year-input").value;
        var day = parseInt(document.getElementById("day-input").value);
        var start = ( document.getElementById("AM-1").checked )
            ? document.getElementById("start-input").value + "am"
            : document.getElementById("start-input").value + "pm";
        var stop = ( document.getElementById("AM-2").checked )
            ? document.getElementById("stop-input").value + "am"
            : document.getElementById("stop-input").value + "pm";
        var desc = document.getElementById("desc-input").value;
        var overnight = ((start.slice(-2) === "pm") && (stop.slice(-2) === "am")) ? true : false;
        var employees = document.getElementById("employee-input").value.split('\n');

        if (monthYear === " " || !day || !start || !stop || employees.length === 0) {
            alert("Please fill all shift assignment fields, description is optional.");
            return;
        }

        // assignedUsers = employees = separate field of req body
        const shift = { monthYear: monthYear, day: day, start: start, stop: stop, desc: desc, overnight: overnight };

        try {
            const res = await fetch("/api/admin/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shift, employees }),
            });
            const data = await res.json();
            if (res.status == 200 || data.success) {
                alert("Assignment Submitted Successfully!");
            } else {
                alert(data.message);
            }
        } catch (err) {
            alert("Network error. Please try again.");
            console.error(err);
        }
    });
}

function submitSuccessful() {
    alert("Request Submitted Successfully!");
}

// function getDayOffForm() {
//     const sideLinks = document.getElementById("reschedule-request");
//     const li = document.createElement("li");
//     li.innerHTML = `<form id="day-off-form">` +
//                     `<label for="date1">Your Day Off Date:</label><br>` +
//                     `<input type="date" id="1date" name="date1"><br>` +
//                     `<label for="shift1">Your Shift Start Time:</label><br>` +
//                     `<input type="text" id="1shift" name="shift1" size="15"><br>` +
//                     `<label for="shift2">Your Shift End Time:</label><br>` +
//                     `<input type="text" id="2shift" name="shift2" size="15"><br>` +
//                     `<label for="reason">Reason for Day Off:</label><br>` +
//                     `<textarea id="reason" name="reason" rows="4" cols="16"></textarea><br>` +
//                     `</form>`;
//     sideLinks.appendChild(li);
//     submitButton = document.getElementById("day-off-button");
//     submitButton.addEventListener("click", async (event) => {
//         event.preventDefault();
//         const date1 = document.getElementById("1date").value;
//         const shift1 = document.getElementById("1shift").value;
//         const shift2 = document.getElementById("2shift").value;
//         const reason = document.getElementById("reason").value;
//         //TODO submit this reschedule request to the db for the manager to approve/deny
//         const res = await fetch("/api/requests/timeoff", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ shiftId: , reason});
//         });
//         const data = await res.json();
//         if (data.success) submitSuccessful();
//     });
// }
async function getDayOffForm() {
    const sideLinks = document.getElementById("reschedule-request");

    // Build the form with a shift dropdown instead of date/time text inputs
    const li = document.createElement("li");
    li.innerHTML =
        `<form id="day-off-form">` +
        `<label for="off-shift-select">Select Your Shift:</label><br>` +
        `<select id="off-shift-select" style="width:100%;margin:4px 0 8px 0;">` +
            `<option value="" disabled selected>Loading shifts…</option>` +
        `</select><br>` +
        `<label for="reason">Reason for Day Off:</label><br>` +
        `<textarea id="reason" name="reason" rows="4" cols="16"></textarea><br>` +
        `</form>`;
    sideLinks.appendChild(li);

    // Populate the dropdown from the user's real shifts
    const select = document.getElementById("off-shift-select");
    try {
        const res = await fetch("/api/calendar/myevents");
        const events = await res.json();
        const shifts = events.filter((e) => !e.eventType || e.eventType === "shift");

        select.innerHTML = ""; // clear loading option

        if (shifts.length === 0) {
            const opt = document.createElement("option");
            opt.disabled = true;
            opt.selected = true;
            opt.textContent = "No upcoming shifts found";
            select.appendChild(opt);
        } else {
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.disabled = true;
            placeholder.selected = true;
            placeholder.textContent = "Choose a shift…";
            select.appendChild(placeholder);

            shifts.forEach((ev) => {
                const opt = document.createElement("option");
                opt.value = ev._id;
                const stop = ev.overnight ? "overnight" : ev.stop;
                opt.textContent = `${ev.monthYear}, Day ${ev.day}  •  ${ev.start}–${stop}${ev.desc ? " (" + ev.desc + ")" : ""}`;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        select.innerHTML = '<option disabled selected>Failed to load shifts</option>';
        console.error("Failed to load shifts for day-off form", err);
    }

    // Wire up the submit button (created before this function is called in renderSidebar)
    const submitButton = document.getElementById("day-off-button");
    submitButton.addEventListener("click", async (event) => {
        event.preventDefault();

        const shiftId = document.getElementById("off-shift-select").value;
        const reason = document.getElementById("reason").value.trim();

        if (!shiftId) {
            alert("Please select a shift.");
            return;
        }
        if (!reason) {
            alert("Please enter a reason.");
            return;
        }

        try {
            const res = await fetch("/api/requests/timeoff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shiftId, reason }),
            });
            const data = await res.json();
            if (data.success) {
                submitSuccessful();
            } else {
                alert(data.message || "Submission failed. Please try again.");
            }
        } catch (err) {
            alert("Network error. Please try again.");
            console.error(err);
        }
    });
}

// function getRescheduleForm() {
//     const sideLinks = document.getElementById("side-links");
//     const li = document.createElement("li");
//     li.innerHTML = `<form id="reschedule-form">` +
//                     `<label for="date1">Your Shift Date:</label><br>` +
//                     `<input type="date" id="date1" name="date1"><br>` +
//                     `<label for="shift1">Your Shift Start Time:</label><br>` +
//                     `<input type="text" id="shift1" name="shift1" size="15"><br>` +
//                     `<label for="shift2">Your Shift End Time:</label><br>` +
//                     `<input type="text" id="shift2" name="shift2" size="15"><br>` +
//                     `<label for="date2">Requested Shift Date:</label><br>` +
//                     `<input type="date" id="date2" name="date2"><br>` +
//                     `<label for="shift3">Requested Shift Start Time:</label><br>` +
//                     `<input type="text" id="shift3" name="shift3" size="15"><br>` +
//                     `<label for="shift4">Requested Shift End Time:</label><br>` +
//                     `<input type="text" id="shift4" name="shift4" size="15"><br>` +
//                     `<label for="otherEmp">Other Employee's Name:</label><br>` +
//                     `<input type="text" id="otherEmp" name="otherEmp" size="15"><br>` +
//                     `</form>`;
//     sideLinks.appendChild(li);
//     submitButton = document.getElementById("submit-button");
//     submitButton.addEventListener("click", async (event) => {
//         event.preventDefault();
//         const date1 = document.getElementById("date1").value;
//         const shift1 = document.getElementById("shift1").value;
//         const date2 = document.getElementById("date2").value;
//         const shift2 = document.getElementById("shift2").value;
//         //TODO submit this reschedule request to the db for the manager to approve/deny
//         console.log(`Reschedule Request Submitted: ${date1} ${shift1}-${shift2} -> ${date2}`);
//         //if (await DBResponse== allgood) {
//             submitSuccessful();
//         //}
//     });
// }
async function getRescheduleForm() {
    const sideLinks = document.getElementById("side-links");


    const li = document.createElement("li");
    li.innerHTML =
        `<form id="reschedule-form">` +

        // Your shift
        `<label for="swap-my-shift">Your Shift:</label><br>` +
        `<select id="swap-my-shift" style="width:100%;margin:4px 0 8px 0;">` +
            `<option value="" disabled selected>Loading shifts…</option>` +
        `</select><br>` +

        // Coworker email
        `<label for="otherEmp">Coworker's Email:</label><br>` +
        `<input type="text" id="otherEmp" name="otherEmp" size="15"` +
            ` placeholder="coworker@example.com"><br>` +

        // Coworker's shift — hidden until email is entered
        `<div id="target-shift-wrapper" style="display:none;">` +
            `<label for="swap-target-shift">Their Shift:</label><br>` +
            `<select id="swap-target-shift" style="width:100%;margin:4px 0 8px 0;">` +
                `<option value="" disabled selected>Choose a shift…</option>` +
            `</select><br>` +
        `</div>` +

        `</form>`;
    sideLinks.appendChild(li);

    // Populate your own shift dropdown
    const mySelect = document.getElementById("swap-my-shift");
    try {
        const res = await fetch("/api/calendar/myevents");
        const events = await res.json();
        const shifts = events.filter((e) => !e.eventType || e.eventType === "shift");

        mySelect.innerHTML = "";

        if (shifts.length === 0) {
            const opt = document.createElement("option");
            opt.disabled = true;
            opt.selected = true;
            opt.textContent = "No upcoming shifts found";
            mySelect.appendChild(opt);
        } else {
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.disabled = true;
            placeholder.selected = true;
            placeholder.textContent = "Choose one of your shifts…";
            mySelect.appendChild(placeholder);

            shifts.forEach((ev) => {
                const opt = document.createElement("option");
                opt.value = ev._id;
                const stop = ev.overnight ? "overnight" : ev.stop;
                opt.textContent = `${ev.monthYear}, Day ${ev.day}  •  ${ev.start}–${stop}${ev.desc ? " (" + ev.desc + ")" : ""}`;
                mySelect.appendChild(opt);
            });
        }
    } catch (err) {
        mySelect.innerHTML = '<option disabled selected>Failed to load shifts</option>';
        console.error("Failed to load own shifts for swap form", err);
    }

    // Load coworker's shifts when a valid email is typed — debounced
    const emailInput = document.getElementById("otherEmp");
    const targetWrapper = document.getElementById("target-shift-wrapper");
    const targetSelect = document.getElementById("swap-target-shift");
    let emailTimer = null;

    emailInput.addEventListener("input", () => {
        clearTimeout(emailTimer);
        targetWrapper.style.display = "none";

        const email = emailInput.value.trim();
        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!validEmail) return;

        emailTimer = setTimeout(async () => {
            targetSelect.innerHTML = '<option disabled selected>Loading…</option>';
            targetWrapper.style.display = "block";

            try {
                const res = await fetch(`/api/calendar/userevents?email=${encodeURIComponent(email)}`);

                if (res.status === 404) {
                    targetSelect.innerHTML = '<option disabled selected>User not found</option>';
                    return;
                }

                const events = await res.json();
                const shifts = events.filter((e) => !e.eventType || e.eventType === "shift");

                targetSelect.innerHTML = "";

                if (shifts.length === 0) {
                    const opt = document.createElement("option");
                    opt.disabled = true;
                    opt.selected = true;
                    opt.textContent = "This coworker has no upcoming shifts";
                    targetSelect.appendChild(opt);
                    return;
                }

                const placeholder = document.createElement("option");
                placeholder.value = "";
                placeholder.disabled = true;
                placeholder.selected = true;
                placeholder.textContent = "Choose their shift…";
                targetSelect.appendChild(placeholder);

                shifts.forEach((ev) => {
                    const opt = document.createElement("option");
                    opt.value = ev._id;
                    const stop = ev.overnight ? "overnight" : ev.stop;
                    opt.textContent = `${ev.monthYear}, Day ${ev.day}  •  ${ev.start}–${stop}${ev.desc ? " (" + ev.desc + ")" : ""}`;
                    targetSelect.appendChild(opt);
                });
            } catch (err) {
                targetSelect.innerHTML = '<option disabled selected>Failed to load shifts</option>';
                console.error("Failed to load coworker shifts", err);
            }
        }, 600);
    });

    // Wire up the submit button (created before this function is called in renderSidebar)
    const submitButton = document.getElementById("submit-button");
    submitButton.addEventListener("click", async (event) => {
        event.preventDefault();

        const shiftId = mySelect.value;
        const targetUser = emailInput.value.trim();
        const targetShiftId = targetSelect.value;

        if (!shiftId) {
            alert("Please select one of your shifts.");
            return;
        }
        if (!targetUser) {
            alert("Please enter your coworker's email.");
            return;
        }
        if (!targetShiftId) {
            alert("Please select your coworker's shift.");
            return;
        }
        if (shiftId === targetShiftId) {
            alert("You cannot swap a shift with itself.");
            return;
        }

        try {
            const res = await fetch("/api/requests/swap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shiftId, targetShiftId, targetUser }),
            });
            const data = await res.json();
            if (data.success) {
                submitSuccessful();
            } else {
                alert(data.message || "Submission failed. Please try again.");
            }
        } catch (err) {
            alert("Network error. Please try again.");
            console.error(err);
        }
    });
}




function nextManagerShift() {
    shiftIndex+=1;
    if (shiftIndex >= workingEmployees.length){
        shiftIndex = 0;
    }
    getManagerDisplayedShift(workingEmployees[shiftIndex]);
}
function prevManagerShift() {
    shiftIndex-=1;
    if (shiftIndex < 0){
        shiftIndex = workingEmployees.length-1;
    }
    getManagerDisplayedShift(workingEmployees[shiftIndex]);
}
function getRescheduleRequests() {
    //TODO get reschedule requests from db and return in format used in renderSidebar function
}

function getReschedule(request) {
    const dayOffTitle = document.createElement("li");
    dayOffTitle.innerHTML = `Shift Change Requests:`;
    dayOffTitle.style.fontWeight = "bold";
    dayOffTitle.style.fontSize = "18px";
    document.getElementById("reschedule-request").replaceChildren(dayOffTitle);

    toDisplay ="1st Shift:<br> " +
            request[0] + "<br>" +
            request[1] + "<br>" +
            "2nd Shift:<br> " +
            request[2] + "<br>"+
            request[3] + "<br>";
    const li = document.createElement("li");
    li.innerHTML = toDisplay;
    document.getElementById("reschedule-request").appendChild(li);


}


function approveRequest() {
    if (!pendingRequests.length) return;
    const req = pendingRequests[0];
    fetch(`/api/requests/${req._id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approved" })
    }).then(() => {
        pendingRequests.shift();
        getReschedule(pendingRequests.length > 0 ? formatRequestForSidebar(pendingRequests[0]) : null);
    });
}
function denyRequest() {
    if ( !pendingRequests.length) return;
    const req = pendingRequests[0];
    fetch(`/api/requests/${req._id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "denied"})
    }).then(() => {
        pendingRequests.shift();
        getReschedule(pendingRequests.length > 0 ? formatRequestForSidebar(pendingRequests[0]) : null);
    });
}
function skipRequest() {
    if (pendingRequests.length <= 1) return;
    pendingRequests.push(pendingRequests.shift());
    getReschedule(formatRequestForSidebar(pendingRequests[0]));
}


function getManagerDisplayedShift(shift) {
    const manifestTitle = document.createElement("li");
    manifestTitle.innerHTML = `Shift Manifest:`;
    manifestTitle.style.fontWeight = "bold";
    manifestTitle.style.fontSize = "18px";
    document.getElementById("side-links").replaceChildren(manifestTitle);


    const li = document.createElement("li");

    console.log(shift);
    toReturn =
        "Date: " + shift[0] + "<br>" +
        "Shift hours:<br>" +
        shift[1] +" - "+ shift[2] +"<br>" +
        "Employees:<br>";
    for(i=3;i<shift.length;i++){
        toReturn = toReturn + "    "+shift[i]+"<br>";
    }
    li.innerHTML = toReturn;
    document.getElementById("side-links").appendChild(li);
}



/*
function sidebarHeight() {
    //WHEN REMOVING THE TEMP SWITCH ROLE BUTTON IN THIS FUNCTION:
    //    remove the line initializing tempControls and change the active line of code in the if statement

    const sidebar = document.getElementById("sidebar");
    const navLinks = document.getElementById("main-header");
    const assignment = document.getElementById("assignment-form");
    const tempControls = document.getElementById("temp-controls");
    if (sidebar && navLinks) {
        sidebar.style.height = '100%';
        //sidebar.style.minHeight = "" + (navLinks.offsetHeight + tempControls.offsetHeight + assignment.offsetHeight) + "px";
        //sidebar.style.top = ""+navLinks.offsetHeight+"px";
    }
    const dashboard = document.getElementById("dashboard");
    if (sidebar && dashboard) {
        sidebar.style.minHeight = ""+(dashboard.offsetHeight)+"px";
    }
}
*/




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

// Helper Function to convert DB request doc into array format
function formatRequestForSidebar(request) {
    if (request.type === "shift_swap") {
        return [
            `Shift ID: ${request.shiftId}`,
            `${request.requestedBy}`,
            `Shift ID: ${request.targetShiftId}`,
            `${request.targetUser}`,
            0  // placeholder, count is shown separately
        ];
    } else {
        return [
            `Shift ID: ${request.shiftId}`,
            `${request.requestedBy} — ${request.reason}`,
            "N/A",
            "N/A",
            0
        ];
    }
}

document.addEventListener("DOMContentLoaded", renderSidebar);
