const mongoose = require("mongoose");

const exerciseSchema = new mongoose.Schema({
  name: String,
  category: String, // Strength | Calisthenics | Cardio | Mobility
  equipment: [String],
  difficulty: String,

  muscles: {
    primary: [String],
    secondary: [String]
  },

  movementPattern: String,
  bestFor: [String],

  calisthenicsData: {
    skillType: String,
    prerequisites: [String]
  },

  variations: {
    easier: [String],
    standard: [String],
    harder: [String]
  },

  instructions: [String],
  commonMistakes: [String],
  mobilityRecommendations: [String]
});

module.exports = mongoose.model("Exercise", exerciseSchema);
