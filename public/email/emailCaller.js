/* The idea for this is that the calls for looking for the emails will run from here and
   we will use windows scheduler or Cron/systemctl to automatically run this code
*/


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

async function managerEmail(email, body, date, name, employees) {
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


async function driverEmail(email, body, date, name) {
    const emailBody = `Greetings ${name},\n` +
                `This is an automated notification about your upcoming shift on ${date}`
    const payload = {
        "to": email,
        "subject": "Automated shift notification.",
        "body": emailBody
    };
    sendEmail(payload)
}