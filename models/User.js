const crypto = require("crypto");
const mongoose = require("mongoose");

// No 0/O/1/I so codes are easy to read out loud.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = (n = 8) =>
  Array.from(crypto.randomBytes(n), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true, trim: true },
    passwordHash: String,
    /** Public @handle, unique, lowercase. */
    handle: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    bio: { type: String, maxlength: 160 },
    /** Share this to be added as a friend. */
    friendCode: { type: String, unique: true, sparse: true },

    profile: {
      age: Number,
      gender: String,
      height: Number,
      weight: Number,
      experienceLevel: String,
      goal: [String],
      trainingPreference: String,
      daysPerWeek: Number,
      equipment: [String],
    },
  },
  { timestamps: true }
);

userSchema.statics.newCode = newCode;

/** What other people may see about a user. */
userSchema.methods.toPublic = function toPublic() {
  return { id: String(this._id), name: this.name || this.handle, handle: this.handle, bio: this.bio || "" };
};

module.exports = mongoose.model("User", userSchema);
