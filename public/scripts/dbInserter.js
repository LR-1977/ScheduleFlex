/**
 * ScheduleFlex v 0.1
 * This is a database setup script that will insert data into the database.
 * 
 * This is designed for each person to test on the database together.
 *
 */

// mongo stuff
const { MongoClient, ObjectId } = require("mongodb");
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
            { email: "user1@gmail.com", ...hashPassword("12345"), type: "admin", name: 'Admin User'},
            { email: "user2@gmail.com", ...hashPassword("pass123"), type: "user", name: 'Alice Smith'},
            { email: "user3@gmail.com", ...hashPassword("password$abc"), type: "user", name: 'Bob Jones'}
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
        const eventIdA = new ObjectId();
        const eventIdB = new ObjectId();
        const eventIdC = new ObjectId();
        const eventIdD = new ObjectId();
        const testEvents = [
            { _id: eventIdA, monthYear: 'March 2026', day: 5, start: '4am', stop: '1pm', desc: 'test', overnight: false, assignedUsers: ['user2@gmail.com'] },
            { _id: eventIdB, monthYear: 'March 2026', day: 8, start: '7pm', stop: '2am', desc: '', overnight: true, assignedUsers: ['user2@gmail.com', 'user3@gmail.com'] },
            { _id: eventIdC, monthYear: 'March 2026', day: 31, start: '10pm', stop: '8am', desc: '', overnight: true, assignedUsers: ['user3@gmail.com'] },
            // Added one for the current month so your team sees data immediately upon logging in
            { _id: eventIdD, monthYear: 'April 2026', day: 15, start: '9am', stop: '5pm', desc: 'Mid-month review', overnight: false, assignedUsers: ['user2@gmail.com', 'user3@gmail.com'] }
        ];
        await db.collection("eventCollection").insertMany(testEvents);
        console.log(`Inserted ${testEvents.length} test events.`);

        // 5. Insert Test Requests
        const testRequests = [
            { type: "time_off", status: "pending", requestedBy: "user2@gmail.com", shiftId: eventIdD, reason: "Doctor Appointment", createdAt: new Date("2026-04-01T09:00:00Z")},
            { type: "time_off", status: "pending", requestedBy: "user3@gmail.com", shiftId: eventIdC, reason: "Family event, unable to make it in.", createdAt: new Date("2026-03-28T14:30:00Z")},
            { type: "shift_swap", status: "pending", requestedBy: "user2@gmail.com", shiftId: eventIdB, targetShiftId: eventIdC, targetUser: "user3@gmail.com", createdAt: new Date("2026-03-25T11:15:00Z")}
        ];
        await db.collection("requestCollection").insertMany(testRequests);
        console.log(`Inserted ${testRequests.length} test requests.`);

        console.log("\nDatabase successfully seeded! Testing time!");

    } catch (err) {
        console.error("Error seeding database:", err);
    } finally {
        // Good practice to close the client at the end.
        await client.close();
    }
}
seedDatabase();