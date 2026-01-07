const mongoose = require("mongoose");

const workoutSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  name: String,
  splitName: String,
  trainingType: String,

  exercises: [
    {
      exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },
      variation: String,
      sets: Number,
      reps: String,
      restSeconds: Number
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Workout", workoutSchema);
