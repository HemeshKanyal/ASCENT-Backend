const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  workoutId: { type: mongoose.Schema.Types.ObjectId, ref: "Workout" },

  date: Date,
  durationMinutes: Number,

  logs: [
    {
      exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },
      variation: String,
      setsCompleted: [{ reps: Number, weight: Number }]
    }
  ]
});

module.exports = mongoose.model("Session", sessionSchema);
