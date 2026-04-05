const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto = require("crypto");
const { MongoClient, ObjectId } = require("mongodb");
const app = express();
const port = 3000;

const mongoUrl = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(mongoUrl);
let db, usersColl, postsColl, sessionsColl;

async function startServer() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        db = client.db("schedFlexDB");
        usersColl = db.collection("userCollection");
        invitationsColl = db.collection("invitationCollection");
        eventsColl = db.collection("eventCollection");
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
        req.session.user = { email: email, role: user.type };
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
        type: "admin",
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
        type: "user",
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

app.get("/api/calendar/events", async (req, res) => {
    const events = await eventsColl.find({}).toArray();
    res.json(events);
});

startServer();