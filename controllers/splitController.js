const Split = require("../models/Split");

// GET all splits
exports.getAllSplits = async (req, res) => {
  try {
    const splits = await Split.find();
    res.status(200).json(splits);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch splits" });
  }
};

// GET recommended splits (basic)
exports.getRecommendedSplits = async (req, res) => {
  try {
    const { experience, days, goal, type } = req.query;

    const splits = await Split.find({
      "recommendedFor.experience": experience,
      "recommendedFor.daysPerWeek": Number(days),
      "recommendedFor.goals": goal,
      type: type
    });

    res.status(200).json(splits);
  } catch (error) {
    res.status(500).json({ message: "Failed to recommend splits" });
  }
};
