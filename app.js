const cors = require("cors");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const helmet = require("helmet");
const mongoose = require("mongoose");

const app = express();

// Media is loaded cross-origin by the web app, so allow that explicitly.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.set("trust proxy", 1);

// Hosting health check: up only when the database is connected.
app.get("/health", (req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ ok: db, db: db ? "connected" : "disconnected" });
});

// A ceiling per IP so one runaway client can't exhaust the free tier. Media
// downloads (signed links, video range requests) are exempt.
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.API_RATE_LIMIT) || 900,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: (req) => req.path.startsWith("/media/"),
  }),
);

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
