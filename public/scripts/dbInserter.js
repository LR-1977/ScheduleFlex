/**
 * ScheduleFlex v 0.1
 * This is a database setup script that will insert data into the database.
 * 
 * This is designed for each person to test on the database together.
 *
 */

// mongo stuff
const { MongoClient } = require("mongodb");
const crypto = require("crypto");

const mongoUrl = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(mongoUrl);
// The same hash function from main.js.
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");

    const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
    return { salt, hash: derivedKey };
}

/**
 * Inserts test data into the database.
 * 
 * This program wull use our old hard coded databases and put them into legitinate databases.
 */
async function seedDatabase() {
    try {
        await client.connect();
        console.log("Connected to MongoDB for seeding...");
        
        const db = client.db("schedFlexDB");

        // 1. Clear existing data (ensures a clean slate for us)
        await db.collection("userCollection").deleteMany({});
        await db.collection("invitationCollection").deleteMany({});
        await db.collection("eventCollection").deleteMany({});
        console.log("Cleared existing collections.");

        // 2. Insert Test Users
        const testUsers = [
            { email: "user1@gmail.com", ...hashPassword("12345"), type: "admin" },
            { email: "user2@gmail.com", ...hashPassword("pass123"), type: "user" },
            { email: "user3@gmail.com", ...hashPassword("password$abc"), type: "user" }
        ];
        await db.collection("userCollection").insertMany(testUsers);
        console.log(`Inserted ${testUsers.length} test users.`);

        // 3. Insert Test Invitations
        const testInvites = [
            { code: "13a93e8f-48d7-4b47-a61a-f6c967c0fe36", email: "user4@gmail.com" }
        ];
        await db.collection("invitationCollection").insertMany(testInvites);
        console.log(`Inserted ${testInvites.length} test invitations.`);

        // 4. Insert Test Calendar Events
        // Mapped from Mun's example data events for testing.
        const testEvents = [
            { monthYear: 'March 2026', day: 5, start: '4am', stop: '1pm', desc: 'test', overnight: false },
            { monthYear: 'March 2026', day: 8, start: '7pm', stop: '2am', desc: '', overnight: true },
            { monthYear: 'March 2026', day: 31, start: '10pm', stop: '8am', desc: '', overnight: true },
            // Added one for the current month so your team sees data immediately upon logging in
            { monthYear: 'April 2026', day: 15, start: '9am', stop: '5pm', desc: 'Mid-month review', overnight: false }
        ];
        await db.collection("eventCollection").insertMany(testEvents);
        console.log(`Inserted ${testEvents.length} test events.`);

        console.log("\nDatabase successfully seeded! Testing time!");

    } catch (err) {
        console.error("Error seeding database:", err);
    } finally {
        // Good practice to close the client at the end.
        await client.close();
    }
}
seedDatabase();