// npm install nodemailer

// NOTE: This code will run on the actual server that sends emails.
let http = require("http");
let nodemailer = require("nodemailer");
let fs = require("fs");

let logFile = fs.createWriteStream("email_server.log", { flags: "a" });

function log(level, message) {
    let line = `${new Date().toISOString()} [${level}] ${message}\n`;
    logFile.write(line);
}

const CARBONIO_HOST = "mail.something.com";
const CARBONIO_PORT = 465;
const CARBONIO_USER = "email address";
const CARBONIO_PASS = "password";


const SERVER_HOST  = "0.0.0.0";
const SERVER_PORT  = 8025;
const SERVER_TOKEN = "superSecret";  
//ServerToken must be same here and in emailCaller.js

const transporter = nodemailer.createTransport({
    "host":   CARBONIO_HOST,
    "port":   CARBONIO_PORT,
    "secure": true,
    "auth": {
        "user": CARBONIO_USER,
        "pass": CARBONIO_PASS,
    }
});

async function sendEmail({to, subject, body, cc}) {
    let mailOptions = {
        "from":    CARBONIO_USER,
        "to":      Array.isArray(to) ? to.join(", ") : to,
        "subject": subject,
        "text":    body,
    };
    if (cc) {
        mailOptions.cc = Array.isArray(cc) ? cc.join(", ") : cc;
    }


    try {
        await transporter.sendMail(mailOptions);
        log("INFO", `Email sent ${mailOptions.to} | Subject: ${subject}`);
        return { "success": true };
    } catch (err) {
        log("ERROR", `SMTP error: ${err.message}`);
        return { 'success': false, "error": err.message };
    }
}

function sendResponse(res,status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(body)
    });
    res.end(body);
}


const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/send-email") {
        return sendResponse(res,404, { "error": "Not found. Use POST /send-email" });
    }

    const auth = req.headers["authorization"] || "";
    if (auth !== SERVER_TOKEN) {
        log("WARN", `Unauthorized request from ${req.socket.remoteAddress}`);
        return sendResponse(res,401, { "error": "Unauthorized" });
        }

    
    let jsonString = "";
    req.on("data", chunk => (jsonString += chunk));

    req.on("end", async () => {

        let data;
        try {
            data = JSON.parse(jsonString);
        } catch {
            return sendResponse(res, 400, { "error": "Invalid JSON" });
        }

        const result = await sendEmail(data);
        sendResponse(res, result.success ? 200 : 500, result);
    });
});

server.listen(SERVER_PORT, SERVER_HOST, () => {
    log("INFO", `Carbonio Email Server started on ${SERVER_HOST}:${SERVER_PORT}`); 
});