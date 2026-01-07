const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// ✅ proves which file is running
console.log("SERVER FILE RUNNING:", __filename);

// ===== middleware =====
app.use(express.json());

app.use(
    session({
        secret: "secret123",
        resave: false,
        saveUninitialized: false,
    })
);

// Serve CLIENT_HW on http://localhost:3000/
app.use(express.static(path.join(__dirname, "..", "CLIENT_HW")));

// ===== JSON storage paths =====
const USERS_PATH = path.join(__dirname, "users.json");
const PLAYLISTS_PATH = path.join(__dirname, "playlists.json");

// ===== helpers =====
function readJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        const txt = fs.readFileSync(filePath, "utf8");
        if (!txt.trim()) return fallback;
        return JSON.parse(txt);
    } catch (e) {
        return fallback;
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function requireAuth(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
    next();
}

// ===== DEBUG endpoint =====
app.get("/api/_where", (req, res) => {
    res.json({ file: __filename, cwd: process.cwd() });
});

// ===== BASIC endpoints =====
app.get("/api/ping", (req, res) => {
    res.json({ ok: true, message: "Server is alive" });
});

app.get("/api/me", (req, res) => {
    if (!req.session.user) return res.json({ loggedIn: false });
    res.json({ loggedIn: true, user: req.session.user });
});

// ===== AUTH =====
app.post("/api/register", (req, res) => {
    const { username, password, email, firstName, lastName, imageUrl } = req.body || {};

    if (!username || !password || !email || !firstName || !lastName || !imageUrl) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const hasLetter = /[A-Za-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    if (!(password.length >= 6 && hasLetter && hasDigit)) {
        return res.status(400).json({
            error: "Password must be at least 6 chars and include letters + digits",
        });
    }

    const users = readJson(USERS_PATH, []);
    const exists = users.some((u) => u.username.toLowerCase() === username.toLowerCase());
    if (exists) return res.status(409).json({ error: "Username already exists" });

    users.push({
        username: username.trim(),
        password,
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        imageUrl: imageUrl.trim(),
        createdAt: Date.now(),
    });

    writeJson(USERS_PATH, users);
    res.json({ ok: true });
});

app.post("/api/login", (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    const users = readJson(USERS_PATH, []);
    const user = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    // store safe user in session
    req.session.user = {
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
    };

    res.json({ ok: true, user: req.session.user });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

// ===== PLAYLISTS =====

// get all playlists of current user
app.get("/api/playlists", requireAuth, (req, res) => {
    const all = readJson(PLAYLISTS_PATH, []);
    const mine = all.filter((p) => p.owner === req.session.user.username);
    res.json({ playlists: mine });
});

// create playlist
app.post("/api/playlists", requireAuth, (req, res) => {
    const { name } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "Playlist name is required" });

    const all = readJson(PLAYLISTS_PATH, []);
    const newPlaylist = {
        id: "pl_" + Date.now(),
        owner: req.session.user.username,
        name: name.trim(),
        items: [],
        createdAt: Date.now(),
    };

    all.push(newPlaylist);
    writeJson(PLAYLISTS_PATH, all);

    res.json({ ok: true, playlist: newPlaylist });
});

// add item to playlist
app.post("/api/playlists/:id/items", requireAuth, (req, res) => {
    const playlistId = req.params.id;
    const { videoId, title, channel, thumb, durationISO, views } = req.body || {};

    if (!videoId || !title) {
        return res.status(400).json({ error: "videoId and title are required" });
    }

    const all = readJson(PLAYLISTS_PATH, []);
    const pl = all.find((p) => p.id === playlistId);

    if (!pl) return res.status(404).json({ error: "Playlist not found" });
    if (pl.owner !== req.session.user.username) return res.status(403).json({ error: "Not your playlist" });

    const exists = pl.items.some((it) => it.videoId === videoId);
    if (exists) return res.status(409).json({ error: "Video already in playlist" });

    pl.items.push({
        videoId,
        title,
        channel: channel || "",
        thumb: thumb || "",
        durationISO: durationISO || "",
        views: views || "",
        addedAt: Date.now(),
    });

    writeJson(PLAYLISTS_PATH, all);
    res.json({ ok: true });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
