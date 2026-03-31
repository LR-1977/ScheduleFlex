async function renderSidebar() {
    const sideLinks = document.getElementById("side-links");
    const navButtons = document.getElementById("side-buttons");
    if (!sideLinks || !navButtons) return;
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
        const workingEmployees = [["April 1st", "9:00", "17:00", "Alice 9:00-17:00", "Bob 10:00-18:00"]];

        // Depending on when the user is an administrator or not, we show different links.
        if (role === "admin") {

        } else {
            //Remove sidebar if not admin
            document.getElementById("sidebar").style.display = "none";
            document.getElementById("dashboard").style.marginLeft = "0";
            
        }

        workingEmployees.forEach((workingEmployee) => {
            const li = document.createElement("li");
            li.innerHTML = getDisplayedShift(workingEmployee);
            sideLinks.appendChild(li);
        });
        ///* here is buttons
        const themeLi = document.createElement("li");
        themeLi.innerHTML = `<button class="nav-link-style" onclick="nextShift()">Next Shift</button>`;
        navButtons.appendChild(themeLi);

        const logoutLi = document.createElement("li");
        logoutLi.innerHTML = `<button class="nav-link-style" onclick="prevShift()">Prev Shift</button>`;
        navButtons.appendChild(logoutLi);
     
        
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
