const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },

  date: Date,

  metric: {
    weight: Number,
    reps: Number,
    holdTime: Number
  }
});

module.exports = mongoose.model("Progress", progressSchema);
