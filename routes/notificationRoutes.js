const express = require("express");

const auth = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");

const router = express.Router();
router.use(auth);

router.get("/", async (req, res) => {
  const items = await Notification.find({ user: req.userId }).sort({ createdAt: -1 }).limit(60).populate("actor club");
  res.json({
    unread: items.filter((n) => !n.read).length,
    items: items
      .filter((n) => n.actor)
      .map((n) => ({
        id: String(n._id),
        type: n.type,
        actor: n.actor.toPublic(),
        post: n.post ? String(n.post) : null,
        club: n.club ? { id: String(n.club._id), name: n.club.name } : null,
        text: n.text ?? "",
        read: n.read,
        date: n.createdAt,
      })),
  });
});

router.get("/unread", async (req, res) => {
  res.json({ unread: await Notification.countDocuments({ user: req.userId, read: false }) });
});

router.post("/read", async (req, res) => {
  await Notification.updateMany({ user: req.userId, read: false }, { $set: { read: true } });
  res.status(204).end();
});

module.exports = router;
