const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,

  profile: {
    age: Number,
    gender: String,
    height: Number,
    weight: Number,
    experienceLevel: String,
    goal: [String],
    trainingPreference: String,
    daysPerWeek: Number,
    equipment: [String]
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
