const express = require("express");
const router = express.Router();
const Session = require("../models/Session");
const auth = require("../middleware/authMiddleware");

/**
 * PUSH workout sessions
 */
router.post("/push", auth, async (req, res) => {
  const { sessions } = req.body;

  if (!Array.isArray(sessions)) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  let saved = 0;

  for (const session of sessions) {
    const exists = await Session.findOne({
      userId: req.userId,
      date: session.date,
      workoutId: session.workoutId,
    });

    if (!exists) {
      await Session.create({
        ...session,
        userId: req.userId,
      });
      saved++;
    }
  }

  res.json({ savedCount: saved });
});

/**
 * PULL sessions
 */
router.get("/pull", auth, async (req, res) => {
  const sessions = await Session.find({ userId: req.userId });
  res.json(sessions);
});

module.exports = router;
