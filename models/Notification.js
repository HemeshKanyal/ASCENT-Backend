const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["kudos", "comment", "friend_request", "friend_accept", "club_join"], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club" },
    text: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
