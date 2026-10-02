const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ["image", "video"], required: true },
    mimeType: String,
    width: Number,
    height: Number,
    durationMs: Number,
    size: Number,
  },
  { _id: false }
);

/** A shared activity. Routes arrive already privacy-trimmed by the app. */
const postSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /** The app's own session id, so re-posting is idempotent. */
    clientId: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    kind: String,
    activity: String,
    title: { type: String, maxlength: 120 },
    caption: { type: String, maxlength: 2000, default: "" },
    stats: {
      distanceKm: Number,
      movingSeconds: Number,
      durationMinutes: Number,
      paceSecPerKm: Number,
      speedKmh: Number,
      elevationGain: Number,
      calories: Number,
      sets: Number,
      volumeKg: Number,
    },
    exercises: [{ _id: false, name: String, sets: Number, best: String }],
    /** [[ [lat, lon], ... ], ...] */
    route: { type: [[[Number]]], default: undefined },
    media: { type: [mediaSchema], default: [] },
    visibility: { type: String, enum: ["friends", "private"], default: "friends" },
    clubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Club", index: true }],
    kudos: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
postSchema.index({ owner: 1, clientId: 1 }, { unique: true });

module.exports = mongoose.model("Post", postSchema);
