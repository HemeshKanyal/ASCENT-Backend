const express = require("express");
const router = express.Router();
const {
  getAllExercises,
  getFilteredExercises,
  getExerciseById
} = require("../controllers/exerciseController");

router.get("/", getAllExercises);
router.get("/filter", getFilteredExercises);
router.get("/:id", getExerciseById);

module.exports = router;
