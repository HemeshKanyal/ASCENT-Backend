const Exercise = require("../models/Exercise");

// GET all exercises
exports.getAllExercises = async (req, res) => {
  try {
    const exercises = await Exercise.find();
    res.status(200).json(exercises);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch exercises" });
  }
};

// GET exercises with filters
exports.getFilteredExercises = async (req, res) => {
  try {
    const { category, movementPattern, difficulty } = req.query;

    let filter = {};
    if (category) filter.category = category;
    if (movementPattern) filter.movementPattern = movementPattern;
    if (difficulty) filter.difficulty = difficulty;

    const exercises = await Exercise.find(filter);
    res.status(200).json(exercises);
  } catch (error) {
    res.status(500).json({ message: "Failed to filter exercises" });
  }
};

// GET single exercise by ID
exports.getExerciseById = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }
    res.status(200).json(exercise);
  } catch (error) {
    res.status(500).json({ message: "Error fetching exercise" });
  }
};
