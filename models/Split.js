const mongoose = require("mongoose");

const splitSchema = new mongoose.Schema({
  name: String,
  type: String,

  recommendedFor: {
    experience: [String],
    daysPerWeek: [Number],
    goals: [String]
  },

  structure: [
    {
      day: String,
      focus: [String]
    }
  ]
});

module.exports = mongoose.model("Split", splitSchema);
