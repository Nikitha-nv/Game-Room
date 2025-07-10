const express = require("express");
const argon2 = require("argon2");
const fs = require("fs");
const session = require("express-session");

const app = express();
app.use(express.static("public"));
app.use(express.json());

const gameSession = session({
    secret: "game",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 300000 } // 5 minutes
});
app.use(gameSession);

function containWordCharsOnly(text) {
    return /^\w+$/.test(text);
}

// Register Endpoint
app.post("/register", async (req, res) => {
    const { username, avatar, name, password } = req.body;

    // Step D: Read users.json
    let users = {};
    try {
        users = JSON.parse(fs.readFileSync("data/users.json"));
    } catch (err) {
        users = {};
    }

    // Step E: Validate user input
    if (!username || !avatar || !name || !password) {
        res.json({ error: "Username/avatar/name/password cannot be empty." });
        return;
    }
    if (!containWordCharsOnly(username)) {
        res.json({ error: "Username can only contain underscores, letters or numbers." });
        return;
    }
    if (username in users) {
        res.json({ error: "Username has already been used." });
        return;
    }

    // Step G: Add user with hashed password
    const hash = await argon2.hash(password);
    users[username] = {
        avatar,
        name,
        password: hash
    };

    // Step H: Save updated users.json
    fs.writeFileSync("data/users.json", JSON.stringify(users, null, 2));

    // Step I: Return success
    res.json({ success: true });
});

// Sign-In Endpoint
app.post("/signin", async (req, res) => {
    const { username, password } = req.body;

    // Step D: Read users.json
    let users = {};
    try {
        users = JSON.parse(fs.readFileSync("data/users.json"));
    } catch (err) {
        res.json({ error: "Server error." });
        return;
    }

    // Step E: Check username/password
    if (!(username in users)) {
        res.json({ error: "Incorrect username/password." });
        return;
    }

    const user = users[username];
    const verified = await argon2.verify(user.password, password);
    if (!verified) {
        res.json({ error: "Incorrect username/password." });
        return;
    }

    // Step G: Save session data
    req.session.user = {
        username,
        avatar: user.avatar,
        name: user.name
    };

    // Step H: Return user info
    res.json({ user: req.session.user });
});

// Validate Session Endpoint
app.get("/validate", (req, res) => {
    const user = req.session.user;

    // Step B: Check session user
    if (!user) {
        res.json({ error: "Not signed in." });
        return;
    }

    // Step D: Return session user
    res.json({ user });
});

// Sign Out Endpoint
app.get("/signout", (req, res) => {
    if (req.session.user) {
        delete req.session.user;
    }
    res.json({ success: true });
});

// Start server
app.listen(8000, () => {
    console.log("The game server has started...");
});

