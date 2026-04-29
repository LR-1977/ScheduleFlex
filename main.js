const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { MongoClient, ObjectId } = require("mongodb");
const app = express();
const port = 3000;

const mongoUrl = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(mongoUrl);
let db, usersColl, invitationsColl, eventsColl, requestsColl;

const SMTP_HOST = "mail.orvik.com";
const SMTP_USER = "scheduleflex.notifications";
const SMTP_PASS = "PASSWORD"; // replace w/ actual password when testing. DO NOT SHARE THIS PW TO GITHUB

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});
async function sendInviteEmail(recipientEmail, inviteCode) {
    try {
        const info = await transporter.sendMail({
            from: `"ScheduleFlex Admin" <${SMTP_USER}>`,
            to: recipientEmail,
            subject: "You've been invited to ScheduleFlex",
            text: `Hello!\n\nYou have been invited to join the ScheduleFlex platform.\n\nYour secure invite code is: ${inviteCode}\n\nPlease enter this code on the login portal to create your password and set up your account.`
        });
        console.log(`Email successfully sent to ${recipientEmail} | Message ID: ${info.messageId}`);
    } catch (error) {
        console.error("SMTP Error: Could not send email.", error);
    }
}
async function startServer() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        db = client.db("schedFlexDB");
        usersColl = db.collection("userCollection");
        invitationsColl = db.collection("invitationCollection");
        eventsColl = db.collection("eventCollection");
        requestsColl = db.collection("requestCollection");
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}
// Password functions

// Hashes the password to be stored in the database
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");

    const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
    return { salt, hash: derivedKey };
}

// Verifies the password.
function verifyPassword(password, storedHash, storedSalt) {
    const derivedKey = crypto
        .scryptSync(password, storedSalt, 64)
        .toString("hex");
    return derivedKey === storedHash;
}

// Authentication Middleware
function requireLogin(req, res, next) {
    if(!req.session.user) return res.status(401).json({success: false, message: "Not Logged in."});
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user) return res.status(401).json({success: false, message: "Not logged in"});
    if (req.session.user.role !== "admin") return res.status(403).json({success: false, message: "Forbidden."});
    next();
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serve files from public
app.use(
    session({
        secret: "scheduleflex-super-secret-key", // remove for actual deployment
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    }),
);

// HTML Routing
// Homepage
app.get("/", (req, res) => {
    if (req.session.user) return res.redirect("/calendar");
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/calendar", (req, res) => {
    if (!req.session.user) return res.redirect("/"); // Protect the calendar
    res.sendFile(path.join(__dirname, "public", "calendar.html"));
});

app.get("/request-off", (req, res) => {
    if (!req.session.user) return res.redirect("/");
    res.sendFile(path.join(__dirname, "public", "request-off.html"));
})

app.get("/swap-shifts", (req, res) => {
    if (!req.session.user) return res.redirect("/");
    res.sendFile(path.join(__dirname, "public", "swap-shifts.html"));
})

// API Routing

// Get current logged-in user info (used by navbar)
app.get("/api/session", (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.status(401).json({ loggedIn: false });
    }
});

// Login functionality

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await usersColl.findOne({ email });

    // Check if the user exists and the password is correct
    if (user && verifyPassword(password, user.hash, user.salt)) {
        req.session.user = { email: email, role: user.role };
        res.json({ success: true, message: "Login successful" });
    } else {
        res.status(401).json({
            success: false,
            message: "Invalid credentials",
        });
    }
});

// Admin Account Creation
app.post("/api/admin/create", async (req, res) => {
    const { email, password, secretPhrase } = req.body;

    // Check the secret phrase first.
    const EXPECTED_SECRET = "JordanWasHere";
    if (secretPhrase !== EXPECTED_SECRET) {
        return res
            .status(403)
            .json({ success: false, message: "Invalid admin passphrase." });
    }
    const user = await usersColl.findOne({ email });

    // Checks if the account exists already.
    if (user != null) {
        return res
            .status(400)
            .json({ success: false, message: "Account already exists." });
    }

    // Create the new admin account and hash the password.
    const secureAuth = hashPassword(password);
    let newUser = {
        hash: secureAuth.hash,
        salt: secureAuth.salt,
        role: "admin",
    };

    await usersColl.insertOne({ email, ...newUser });

    res.json({ success: true, message: "Admin account created." });
});

// Validate an invite code invitation.
app.post("/api/invite/validate", async (req, res) => {
    const { code } = req.body;

    // Check our temporary server-side map.
    const inviteDoc = await invitationsColl.findOne({ code });

    if (inviteDoc) {
        req.session.pendingInviteEmail = inviteDoc.email;
        req.session.pendingInviteCode = code;

        res.json({ success: true, email: inviteDoc.email });
    } else {
        res.status(400).json({ success: false, message: "Invalid invite code." });

    }


});

// Accept an invited account to make a new user.
app.post("/api/invite/accept", async (req, res) => {
    const { password } = req.body;

    // Check if the user is in the middle of accepting an invite or not.
    const email = req.session.pendingInviteEmail;
    const code = req.session.pendingInviteCode;

    if (!email || !code) {
        return res
            .status(400)
            .json({ success: false, message: "Session expired." });
    }
    let currentUser = await usersColl.findOne({ email });
    if (currentUser) {
        return res
            .status(400)
            .json({ success: false, message: "Account already exists." });
    }

    // Create the new user account and hash the password.
    const secureAuth = hashPassword(password);
    let newUser = {
        hash: secureAuth.hash,
        salt: secureAuth.salt,
        role: "user",
    };

    await usersColl.insertOne({ email, ...newUser });
    await invitationsColl.deleteOne({ code });



    delete req.session.pendingInviteEmail;
    delete req.session.pendingInviteCode;

    res.json({ success: true, message: "Account created successfully." });
});

// User logout
app.post("/api/logout", (req, res) => {
    // Destroy the session securely
    req.session.destroy((err) => {
        if (err) {
            return res
                .status(500)
                .json({ success: false, message: "Could not log out." });
        }
        res.clearCookie("connect.sid"); // Clear the default Express session cookie
        res.json({ success: true });
    });
});

// Calendar API
// All events (for admin)
app.get("/api/calendar/events", async (req, res) => {
    const events = await eventsColl.find({}).toArray();
    res.json(events);
});
// Logged-in User's events
app.get("/api/calendar/myevents", requireLogin, async (req, res) => {
    const events = await eventsColl.find({ assignedUsers : req.session.user.email }).toArray()
    res.json(events);
});

// Specific User's shifts by email
app.get("/api/calendar/userevents", requireLogin, async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({success: false, message: "Email required."});

    const targetUser = await usersColl.findOne({email});
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found." });

    const events = await eventsColl.find({ assignedUsers: email}).toArray();
    res.json(events)
});

// Requesting APIs
// User time off request
app.post("/api/requests/timeoff", requireLogin,async (req, res) => {
    const { shiftId, reason } = req.body;
    if (!shiftId || !reason) {
        return res.status(400).json({success: false, message: "shiftID and reason are required." });
    }

    const shift = await eventsColl.findOne({
        _id: new ObjectId(shiftId), assignedUsers: req.session.user.email
    });

    if (!shift) {
        return res.status(403).json({ success: false, message: "Shift not found or you are not assigned to it."});
    }

    const existing = await requestsColl.findOne({
        type: "time_off", status: "pending", requestedBy: req.session.user.email, shiftId: new ObjectId(shiftId)
    });
    if (existing) {
        return res.status(409).json({ success: false, message: "You already have a pending time-off request for this shift."});
    }

    await requestsColl.insertOne({
        type: "time_off", status: "pending", requestedBy: req.session.user.email, shiftId: new ObjectId(shiftId), reason, createdAt: new Date()
    });
    res.json({ success: true, message: "Time-off request submitted."});
})

// User shift change request: swap shifts

app.post("/api/requests/swap", requireLogin, async (req, res) => {
    const {shiftId, targetShiftId, targetUser } = req.body;

    if (!shiftId || !targetShiftId || !targetUser) {
        return res.status(400).json({ success: false, message: "shiftId, targetShiftId, and targetUser are required"});
    }

    if (shiftId === targetShiftId) {
        return res.status(400).json({ success: false, message: "Cannot swap a shift with iteslf."});
    }

    const myShift = await eventsColl.findOne({
        _id: new ObjectId(shiftId),
        assignedUsers: req.session.user.email
    });
    if (!myShift) {
        return res.status(403).json({ success: false, message: "Your shift not found or you are not assigned to it."});
    }

    const targetShift = await eventsColl.findOne({
        _id: new ObjectId(targetShiftId),
        assignedUsers: targetUser
    });
    if (!targetShift) {
        return res.status(403).json({ success: false, message: "Target shift not found or the coworker is not assigned to it." });
    }

    const existing = await requestsColl.findOne({
        type: "shift_swap",
        status: "pending",
        requestedBy: req.session.user.email,
        shiftId: new ObjectId(shiftId),
        targetShiftId: new ObjectId(targetShiftId)
    });
    if (existing) {
        return res.status(409).json({ success: false, message: "A pending swap request for these shifts already exist." });
    }

    await requestsColl.insertOne({
        type: "shift_swap",
        status: "pending",
        requestedBy: req.session.user.email,
        shiftId: new ObjectId(shiftId),
        targetShiftId: new ObjectId(targetShiftId),
        targetUser,
        createdAt: new Date()
    });

    res.json({ success: true, message: "Shift swap request submitted."});
});

// Admin Requests
app.get("/admin-requests", (req, res) => {
    if (!req.session.user) return res.redirect("/");
    if (req.session.user.role !== "admin") return res.redirect("/calendar");
    res.sendFile(path.join(__dirname, "public", "admin-requests.html"))
});

// Admin retreival of shift change requests with status: in-review
app.get("/api/requests/pending", requireAdmin, async (req, res) => {
    const requests = await requestsColl.find({ status: "pending" }).sort({ createdAt: 1}).toArray();
    res.json(requests)
});

// Approve or Deny requests
app.post("/api/requests/:id/decision", requireAdmin, async (req, res) => {
    const { decision } = req.body;

    if (!["approved", "denied"].includes(decision)) {
        return res.status(400).json({ success: false, message: "decision must be 'approved' or 'denied'."});
    }
    let requestDoc;

    try {
        requestDoc = await requestsColl.findOne({ _id: new ObjectId(req.params.id) });
    }
    catch {
        return res.status(400).json({ success: false, message: "Invalid request ID."});
    }

    if (!requestDoc) {
        return res.status(404).json({ sucess: false, message: "Request not found." });
    }

    if (requestDoc.status !== "pending") {
        return res.status(409).json({ success: false, message: "This request has already been decided."});
    }

    if (decision === "approved" && requestDoc.type === "shift_swap") {
        const requester = requestDoc.requestedBy;
        const target = requestDoc.targetUser;

        await eventsColl.updateOne(
            { _id: requestDoc.shiftId },
            { $pull: {assignedUsers: requester}}
        );
        await eventsColl.updateOne(
            { _id: requestDoc.shiftId },
            { $push: { assignedUsers: target } }
        );
        await eventsColl.updateOne(
            { _id: requestDoc.targetShiftId },
            { $pull: { assignedUsers: target } }
        );
        await eventsColl.updateOne(
            { _id: requestDoc.targetShiftId },
            { $push: { assignedUsers: requester } }
        );
    }
    // For time-off we can just mark it and managers can handle manually
    await requestsColl.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status: decision, decidedAt: new Date(), decidedBy: req.session.user.email }}
    );

    res.json({ success: true, message: `Request ${decision}`});
});


// Assign Shift
app.post("/api/admin/assign", requireAdmin, async (req, res) => {
    const { shift, employees } = req.body;

    if (!Array.isArray(employees)) {
        return res.status(406).json({ success: false, messsage: "Cant assign users to shift, expected type Array of user(s)."});
    }

    try {
        const scheduled = await eventsColl.findOne({
            monthYear: shift.monthYear,
            day: shift.day,
            start: shift.start,
            stop: shift.stop
        });

        // Handle existing rewrite of existing assignment as a swap, allow admins
        // to override swapping, need to email all involved
        if (scheduled) {
            const result = await eventsColl.updateOne(
                { _id: scheduled._id },
                { $set: { assignedUsers: employees } }
            );
        }
        // No existing shift: New assignment, need email update
        else {
            const result = await eventsColl.insertOne({
                monthYear: shift.monthYear,
                day: shift.day,
                start: shift.start,
                stop: shift.stop,
                desc: shift.desc,
                overnight: shift.overnight,
                assignedUsers: employees
            });
        }
        return res.status(200).json({ success: true, message: `Successfully assigned shift to: ${employees}` })
    } catch (error) {
        console.error("Error fetching/patching employees:", error);
        return res.status(500).json({ success: false, message: "Server error assigning shift." });
    }
});


// Admin invite email sending:
app.post("/api/admin/invite/create", async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Unauthorized. Admins only." });
    }

    const { targetEmail } = req.body;

    if (!targetEmail) {
        return res.status(400).json({ success: false, message: "Email is required." });
    }

    const existingUser = await usersColl.findOne({ email: targetEmail });
    if (existingUser) {
        return res.status(400).json({ success: false, message: "User already has an account." });
    }

    const inviteCode = crypto.randomUUID();

    try {
        await invitationsColl.insertOne({ code: inviteCode, email: targetEmail });

        // Call Nodemailer to send the email directly through your VPS
        sendInviteEmail(targetEmail, inviteCode);

        res.json({ success: true, message: "Invite generated and email sent." });
    } catch (error) {
        console.error("Database error creating invite:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// Fetch all employees.
app.get("/api/admin/employees", async (req, res) => {
    // 1. Strict Role Check
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Unauthorized. Admins only." });
    }

    try {
        // Fetch all users, but explicitly EXCLUDE the hash and salt fields
        const employees = await usersColl.find({}, { projection: { hash: 0, salt: 0 } }).toArray();
        res.json({ success: true, employees });
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ success: false, message: "Server error fetching employees." });
    }
});

// Update employee role
app.patch("/api/admin/employees/role", requireAdmin, async (req, res) => {
    const { email, role } = req.body;
    if (!email || !role || !["admin", "user"].includes(role)) {
        return res.json({ success: false, message: "Invalid employee update params." });
    }

    try {
        const target = await usersColl.findOne({ email: email });
        if (!target) {
            return res.json({ success: false, message: "Couldn't find target user for update." });
        }

        // Ensure there is always >= 1 admin
        const numAdmins = await usersColl.countDocuments({ role: "admin" });
        if ( target && target.role === "admin" && numAdmins <= 1) {
            return res.json({ success: false, message: "Denied attempt to demote remaining admin." });
        }

        // Safely update role
        await usersColl.updateOne(
            { email: email },
            { $set: { role: role } }
        )

        res.json({ success: true, message: `Updated email: ${email} to role: ${role}` });
    } catch (error) {
        console.error("Error patching employee:", error);
        res.json({ success: false, message: "Server error patching employee." });
    }
});

// Delete employee
app.delete("/api/admin/employees", requireAdmin, async (req, res) => {
    const { email } = req.body;
    if (email === req.session.user.email) {
        return res.json({ success: false, message: "Attempt to delete active session email." });
    }

    try {
        // Ensure there is always >= 1 admin
        const numAdmins = await usersColl.countDocuments({ role: "admin" });
        const target = await usersColl.findOne({ email: email });
        if ( target && target.role === "admin" && numAdmins <= 1) {
            return res.json({ success: false, message: "Denied attempt to delete remaining admin." });
        }

        // Safely delete
        const deletion = await usersColl.deleteOne({ email: email });
        if (deletion.deletedCount === 0) {
            return res.json({ success: false, message: "Couldn't find target user to delete." });
        }

        res.json({ success: true, message: `Deleted email: ${email}` });

    } catch (error) {
        console.error("Error deleting employee:", error);
        res.json({ success: false, message: "Server error deleting employee." });
    }
});


startServer();