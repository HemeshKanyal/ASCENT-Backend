const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    description: { type: String, maxlength: 280, default: "" },
    /** Invite code; anyone with it can join. */
    code: { type: String, required: true, unique: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Club", clubSchema);
