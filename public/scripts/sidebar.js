var workingEmployees;
var shiftIndex = 0;

async function renderSidebar() {
    const sideLinks = document.getElementById("side-links");
    const navButtons = document.getElementById("side-buttons");
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
        workingEmployees = [["April 1st", "9:00", "17:00", "Alice 9:00-17:00", "Bob 10:00-18:00"],["April 2nd", "10:00", "18:00", "Charlie 10:00-18:00", "David 9:00-17:00", "Eve 11:00-19:00"]];

        //TODO: replace hard coded reschedule requests with db call when db created
        //Assuming the db presents a list of:
            //first item is the string saying the date of the first shift to be rescheduled
            //second item is the string of the employee requesting the change and their current shift time
            //third item is the string saying the date of the second shift to be rescheduled
            //fourth item is the string of the employee they want to switch with and their current shift time
            //fifth item is the total number of requests for the manager to approve/deny (for display purposes)
        const rescheduleRequests = [["April 1st", "Alice 9:00-17:00", "April 2nd", "Bob 10:00-18:00",1]];  
        
        
        // Depending on when the user is an administrator or not, we show different links.
        if (role === "admin") {
            
            getManagerDisplayedShift(workingEmployees[shiftIndex]);   
            getReschedule(rescheduleRequests[0]);

            // here is buttons
            const themeLi = document.createElement("li");
            themeLi.innerHTML = `<button class="nav-link-style" onclick="nextManagerShift()">Next Shift</button>`;
            navButtons.appendChild(themeLi);

            const logoutLi = document.createElement("li");
            logoutLi.innerHTML = `<button class="nav-link-style" onclick="prevManagerShift()">Prev Shift</button>`;
            navButtons.appendChild(logoutLi);
        
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
            remainingLi.innerHTML = `Remaining Requests: ${rescheduleRequests[0][4]}`;
            rescheduleButtons.appendChild(remainingLi);


        } else {
            //user is in employee role
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
    sidebarHeight();

    } catch (error) {
        console.error("Failed to load sidebar", error);
    }
}

function submitSuccessful() {
    alert("Request Submitted Successfully!");
}

function getDayOffForm() {
    const sideLinks = document.getElementById("reschedule-request");
    const li = document.createElement("li");
    li.innerHTML = `<form id="day-off-form">` +
                    `<label for="date1">Your Day Off Date:</label><br>` +
                    `<input type="date" id="1date" name="date1"><br>` +
                    `<label for="shift1">Your Shift Start Time:</label><br>` +
                    `<input type="text" id="1shift" name="shift1" size="15"><br>` +
                    `<label for="shift2">Your Shift End Time:</label><br>` +
                    `<input type="text" id="2shift" name="shift2" size="15"><br>` +
                    `<label for="reason">Reason for Day Off:</label><br>` +
                    `<textarea id="reason" name="reason" rows="4" cols="16"></textarea><br>` +  
                    `</form>`;
    sideLinks.appendChild(li);
    submitButton = document.getElementById("day-off-button");
    submitButton.addEventListener("click", async (event) => {
        event.preventDefault();
        const date1 = document.getElementById("1date").value;
        const shift1 = document.getElementById("1shift").value;        
        const shift2 = document.getElementById("2shift").value;
        const reason = document.getElementById("reason").value;
        //TODO submit this reschedule request to the db for the manager to approve/deny
        console.log(`Reschedule Request Submitted: ${date1} ${shift1}-${shift2} -> ${reason}`); 
        
        //if (await DBResponse== allgood) {
            submitSuccessful();
        //}
        
        
    });
}

function getRescheduleForm() {
    const sideLinks = document.getElementById("side-links");
    const li = document.createElement("li");
    li.innerHTML = `<form id="reschedule-form">` +
                    `<label for="date1">Your Shift Date:</label><br>` +
                    `<input type="date" id="date1" name="date1"><br>` +   
                    `<label for="shift1">Your Shift Start Time:</label><br>` +
                    `<input type="text" id="shift1" name="shift1" size="15"><br>` +
                    `<label for="shift2">Your Shift End Time:</label><br>` +
                    `<input type="text" id="shift2" name="shift2" size="15"><br>` +
                    `<label for="date2">Requested Shift Date:</label><br>` +
                    `<input type="date" id="date2" name="date2"><br>` +
                    `<label for="shift3">Requested Shift Start Time:</label><br>` +
                    `<input type="text" id="shift3" name="shift3" size="15"><br>` +
                    `<label for="shift4">Requested Shift End Time:</label><br>` +
                    `<input type="text" id="shift4" name="shift4" size="15"><br>` +
                    `<label for="otherEmp">Other Employee's Name:</label><br>` +
                    `<input type="text" id="otherEmp" name="otherEmp" size="15"><br>` +
                    `</form>`;
    sideLinks.appendChild(li);
    submitButton = document.getElementById("submit-button");
    submitButton.addEventListener("click", async (event) => {
        event.preventDefault();
        const date1 = document.getElementById("date1").value;
        const shift1 = document.getElementById("shift1").value;        
        const date2 = document.getElementById("date2").value;
        const shift2 = document.getElementById("shift2").value;
        //TODO submit this reschedule request to the db for the manager to approve/deny
        console.log(`Reschedule Request Submitted: ${date1} ${shift1}-${shift2} -> ${date2}`);
        //if (await DBResponse== allgood) {
            submitSuccessful();
        //}
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
    //TODO: update db with new shift times for each employee and remove request from list
}
function denyRequest() {
    //TODO: remove request from list without updating shift times
}
function skipRequest() {
    //TODO:display next request without updating shift times or removing request from list
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
        "Your hours:<br>" + 
        shift[1] +" - "+ shift[2] +"<br>" +
        "Employees:<br>";
    for(i=3;i<shift.length;i++){
        toReturn = toReturn + "    "+shift[i]+"<br>";
    }
    li.innerHTML = toReturn;
    document.getElementById("side-links").appendChild(li);
}

function sidebarHeight() {
    /*WHEN REMOVING THE TEMP SWITCH ROLE BUTTON IN THIS FUNCTION:
        remove the line initializing tempControls and change the active line of code in the if statement
    */ 
    
    const sidebar = document.getElementById("sidebar");
    const navLinks = document.getElementById("main-header");
    const tempControls = document.getElementById("temp-controls");
    if (sidebar && navLinks) {
        sidebar.style.top = ""+(navLinks.offsetHeight+tempControls.offsetHeight)+"px";
        //sidebar.style.top = ""+navLinks.offsetHeight+"px";
    }
    const dashboard = document.getElementById("dashboard");
    if (sidebar && dashboard) {
        sidebar.style.minHeight = ""+(dashboard.offsetHeight)+"px";
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


document.addEventListener("DOMContentLoaded", renderSidebar);
