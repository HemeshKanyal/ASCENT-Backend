const express = require("express");
const { z } = require("zod");

const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const Club = require("../models/Club");
const User = require("../models/User");
const WeeklyStat = require("../models/WeeklyStat");
const { friendIds, isId } = require("../services/social");

const router = express.Router();
router.use(auth);

const WEEK = /^\d{4}-\d{2}-\d{2}$/;
const Stat = z.object({
  week: z.string().regex(WEEK),
  distanceKm: z.number().min(0).max(5000),
  minutes: z.number().min(0).max(10080),
  sessions: z.number().int().min(0).max(200),
  activeDays: z.number().int().min(0).max(7),
  streakWeeks: z.number().int().min(0).max(1000),
});

/** The app reports this week's totals (and last week's, to close it out). */
router.put("/stats", validate(z.object({ weeks: z.array(Stat).min(1).max(4) })), async (req, res) => {
  await Promise.all(
    req.body.weeks.map(({ week, ...totals }) => WeeklyStat.updateOne({ user: req.userId, week }, { $set: totals }, { upsert: true }))
  );
  res.status(204).end();
});

const METRICS = { distance: "distanceKm", time: "minutes", sessions: "sessions", days: "activeDays" };

/** ?week=YYYY-MM-DD&metric=distance|time|sessions|days&club=<id> (default: you + friends). */
router.get("/", async (req, res) => {
  const week = String(req.query.week || "");
  if (!WEEK.test(week)) return res.status(400).json({ message: "week: expected YYYY-MM-DD (Monday)" });
  const field = METRICS[String(req.query.metric || "time")] ?? "minutes";

  let people;
  if (req.query.club) {
    if (!isId(req.query.club)) return res.status(404).json({ message: "Club not found" });
    const club = await Club.findOne({ _id: req.query.club, members: req.userId });
    if (!club) return res.status(404).json({ message: "Club not found" });
    people = club.members;
  } else {
    people = [req.userId, ...(await friendIds(req.userId))];
  }
  const [users, stats] = await Promise.all([User.find({ _id: { $in: people } }), WeeklyStat.find({ user: { $in: people }, week }).lean()]);
  const byUser = new Map(stats.map((s) => [String(s.user), s]));
  const rows = users
    .map((u) => {
      const s = byUser.get(String(u._id)) ?? {};
      return {
        user: u.toPublic(),
        me: String(u._id) === String(req.userId),
        value: s[field] ?? 0,
        distanceKm: s.distanceKm ?? 0,
        minutes: s.minutes ?? 0,
        sessions: s.sessions ?? 0,
        activeDays: s.activeDays ?? 0,
        streakWeeks: s.streakWeeks ?? 0,
      };
    })
    .sort((a, b) => b.value - a.value || a.user.name.localeCompare(b.user.name));
  res.json({ week, metric: req.query.metric || "time", rows });
});

module.exports = router;
