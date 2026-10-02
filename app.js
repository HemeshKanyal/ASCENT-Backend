const cors = require("cors");
const express = require("express");
const helmet = require("helmet");

const app = express();

// Media is loaded cross-origin by the web app, so allow that explicitly.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.set("trust proxy", 1);

// Raw uploads stream on their own; everything else is JSON.
app.use((req, res, next) => (/^\/api\/posts\/[^/]+\/media$/.test(req.path) ? next() : express.json({ limit: "2mb" })(req, res, next)));

app.use("/api/sync/evolution", require("./routes/syncEvolutionRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/exercises", require("./routes/exerciseRoutes"));
app.use("/api/splits", require("./routes/splitRoutes"));
app.use("/api/sync/templates", require("./routes/syncTemplatesRoutes"));
app.use("/api/sync/sessions", require("./routes/syncSessionsRoutes"));

// Community
app.use("/api/friends", require("./routes/friendRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/feed", require("./routes/feedRoutes"));
app.use("/api/clubs", require("./routes/clubRoutes"));
app.use("/api/leaderboard", require("./routes/leaderboardRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/media", require("./routes/mediaRoutes"));

app.get("/", (req, res) => {
  res.send("Workout API Running");
});

app.use((req, res) => res.status(404).json({ message: "Not found" }));

// Express 5 forwards async errors here.
app.use((err, req, res, _next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ message: "Request too large" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON" });
  if (err.code === 11000) return res.status(409).json({ message: "Already exists" });
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
});

module.exports = app;
