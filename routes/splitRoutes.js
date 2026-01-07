const express = require("express");
const router = express.Router();
const Split = require("../models/Split");

router.get("/recommend", async (req, res) => {
  try {
    const { experience, days, goal, type } = req.query;

    // 1. Get all splits of selected type (Gym / Calisthenics / Mixed)
    const allSplits = await Split.find({
      type: { $regex: new RegExp(`^${type}$`, "i") }
    });

    // 2. Score each split
    const ranked = allSplits.map((split) => {
      let score = 0;

      if (split.recommendedFor?.experience?.includes(experience)) score += 3;
      if (split.recommendedFor?.goals?.includes(goal)) score += 3;
      if (split.recommendedFor?.daysPerWeek?.includes(Number(days))) score += 2;

      return { ...split.toObject(), score };
    });

    // 3. Sort by best match
    const results = ranked
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Recommendation failed" });
  }
});

module.exports = router;
