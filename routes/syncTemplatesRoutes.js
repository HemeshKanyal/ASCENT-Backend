const express = require("express");
const router = express.Router();
const Workout = require("../models/Workout");
const auth = require("../middleware/authMiddleware");

/**
 * PUSH templates to cloud
 */
router.post("/push", auth, async (req, res) => {
  const { templates } = req.body;

  if (!Array.isArray(templates)) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const saved = [];

  for (const tpl of templates) {
    const existing = await Workout.findOne({
      userId: req.userId,
      baseTemplateId: tpl.baseTemplateId,
      version: tpl.version,
    });

    if (!existing) {
      const created = await Workout.create({
        ...tpl,
        userId: req.userId,
      });
      saved.push(created);
    }
  }

  res.json({ savedCount: saved.length });
});

/**
 * PULL latest templates from cloud
 */
router.get("/pull", auth, async (req, res) => {
  const templates = await Workout.find({ userId: req.userId });
  res.json(templates);
});

module.exports = router;
