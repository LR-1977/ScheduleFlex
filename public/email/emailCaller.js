/* The idea for this is that the calls for looking for the emails will run from here and
   we will use windows scheduler or Cron/systemctl to automatically run this code
*/
const { MongoClient, ObjectId } = require("mongodb");

const mongoUrl = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(mongoUrl);
let db, usersColl, invitationsColl, eventsColl, requestsColl;

const EMAIL_SERVER_URL = "http://<servername>:8025/send-email";
const SERVER_TOKEN     = "superSecret";
//ServerToken must be same here and in emailer.js


async function sendEmail(data) {
    try {
        const response = await fetch(EMAIL_SERVER_URL, {
            "method":  "POST",
            "headers": {
                "Content-Type":  "application/json",
                "Authorization": SERVER_TOKEN
            },
            "body": JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
            console.log("Email sent successfully:", result);
        } else {
            console.error(`Email failed (${response.status}):`, result);
        }
    } catch (err) {
        console.error("Request error:", err.message);
    }
}

async function managerEmail(email, date, employees) {
    const emailBody = `Greetings ${name},\n` +
                `Your upcoming shift on ${date} will have the following employees:\n` +
                `${employees.join("\n")}`
    const payload = {
        "to": email,
        "subject": "Automated shift notification.",
        "body": emailBody
    };
    sendEmail(payload)
}


async function driverEmail(email, date) {
    const emailBody = `Greetings,\n` +
                `This is an automated notification about your upcoming shift on ${date}`
    const payload = {
        "to": email,
        "subject": "Automated shift notification.",
        "body": emailBody
    };
    sendEmail(payload)
}





async function mongoConnect() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        db = client.db("schedFlexDB");
        usersColl = db.collection("userCollection");
        invitationsColl = db.collection("invitationCollection");
        eventsColl = db.collection("eventCollection");
        requestsColl = db.collection("requestCollection");
        return true;
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        return false;
    }
}

function sendUserNotifications() {
    const day = new Date().getDate() + 1;
    let event = await eventsColl.find({"day":day});

    //create manager daily shift schedule
    let employees = [];
    for (let shift of event) {
        let date = " "+ shift.start +"-" +shift.stop;
        for (let employee of shift.asignedUsers) {
            employees.push(" "+employee +":"+ date);
        }
    }



    //send emails
    for (let shift of event) {
        for (let employee of shift.assignedUsers) {
            const email = employee;
            const date = shift.day+" "+shift.monthYear + " " + shift.day +" "+ shift.start +"-" +shift.stop;


            let user = await usersColl.findOne({"email":employee});
            if (!user){
                continue;
            }
            if (user.role == "user") {
                driverEmail(email,date);
            } else {
                managerEmail(email,date,employees);
            }
            
        }
    }

}

function sendManagerNotifications() {
    const day = new Date().getDate() + 1;
    let event = await eventsColl.find({"day":day});
    
}
//below gets ran on the daily run of the file
function main() {
    if (!await mongoConnect()){
        return;
    }
    sendUserNotifications();



}
main();


