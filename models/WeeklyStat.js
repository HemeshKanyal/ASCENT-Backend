const mongoose = require("mongoose");

/** Totals the app reports for a Monday-week, for leaderboards (no activity detail). */
const weeklyStatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    /** YYYY-MM-DD of the Monday, in the user's own time zone. */
    week: { type: String, required: true },
    distanceKm: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 },
    activeDays: { type: Number, default: 0 },
    streakWeeks: { type: Number, default: 0 },
  },
  { timestamps: true }
);
weeklyStatSchema.index({ user: 1, week: 1 }, { unique: true });
weeklyStatSchema.index({ week: 1 });

module.exports = mongoose.model("WeeklyStat", weeklyStatSchema);
