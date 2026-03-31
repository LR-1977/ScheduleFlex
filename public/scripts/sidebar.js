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
        
        //TODO: replace hard coded side links with db call when db created
        //const workingEmployees = await getDataFromDB(sessionData.user.email);
        //Assuming the db presents a list of:
            //first item is the string saying the date of the shift
            //second item is the start time of shift for that manager
            //third item is the end time of shift for that manager
            //all following items are a string of name and times for an employee working that day
        const workingEmployees = [["April 1st", "9:00", "17:00", "Alice 9:00-17:00", "Bob 10:00-18:00"],["April 2nd", "10:00", "18:00", "Charlie 10:00-18:00", "David 9:00-17:00"]];

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
            
            workingEmployees.forEach((workingEmployee) => {
                const li = document.createElement("li");
                li.innerHTML = getDisplayedShift(workingEmployee);
                sideLinks.appendChild(li);
            });
            getReschedule(rescheduleRequests[0]);
        } else {
            //Remove sidebar if not admin
            document.getElementById("sidebar").style.display = "none";
            document.getElementById("dashboard").style.marginLeft = "0";
            
        }

        ///* here is buttons
        const themeLi = document.createElement("li");
        themeLi.innerHTML = `<button class="nav-link-style" onclick="nextShift()">Next Shift</button>`;
        navButtons.appendChild(themeLi);

        const logoutLi = document.createElement("li");
        logoutLi.innerHTML = `<button class="nav-link-style" onclick="prevShift()">Prev Shift</button>`;
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
        
    // here is for the sidebar height
    sidebarHeight();

    } catch (error) {
        console.error("Failed to load sidebar", error);
    }
}

function nextShift() {
    //TODO get next data in sequence for manager shifts and who works
    return;
}
function prevShift() {
    //TODO get next data in sequence for manager shifts and who works
    return;
}
function getRescheduleRequests() {
    //TODO get reschedule requests from db and return in format used in renderSidebar function
}

function getReschedule(request) {
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


function getDisplayedShift(shift) {
    toReturn =
        "Date: " + shift[0] + "<br>" +
        "Your hours:<br>" + 
        shift[1] +" - "+ shift[2] +"<br>" +
        "Employees:<br>";
    for(i=3;i<shift.length;i++){
        toReturn = toReturn + "    "+shift[i]+"<br>";
    }
    return toReturn;
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
