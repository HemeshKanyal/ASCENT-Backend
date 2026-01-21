const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/**
 * SIGNUP
 */
router.post("/signup", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    email,
    name,
    passwordHash
  });

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, userId: user._id });
});

/**
 * LOGIN
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, userId: user._id });
});

module.exports = router;
