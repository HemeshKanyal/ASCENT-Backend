const bcrypt = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");
const { rateLimit } = require("express-rate-limit");
const { z } = require("zod");

const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const Club = require("../models/Club");
const Comment = require("../models/Comment");
const Friendship = require("../models/Friendship");
const Notification = require("../models/Notification");
const Post = require("../models/Post");
const User = require("../models/User");
const WeeklyStat = require("../models/WeeklyStat");
const { deleteFiles } = require("../services/media");

const router = express.Router();

// Slow down password guessing; generous enough for a few friends on one Wi-Fi.
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });

const HANDLE = /^[a-z0-9_.]{3,24}$/;
const handleOf = (s) => s.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 24);

async function uniqueHandle(base) {
  let h = handleOf(base) || "athlete";
  if (h.length < 3) h = `${h}fit`;
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? h : `${h.slice(0, 20)}${Math.floor(Math.random() * 9000 + 1000)}`;
    if (!(await User.exists({ handle: candidate }))) return candidate;
  }
  throw new Error("Couldn't find a free handle");
}

async function uniqueCode() {
  for (;;) {
    const code = User.newCode();
    if (!(await User.exists({ friendCode: code }))) return code;
  }
}

/** Older accounts were created before handles and friend codes existed. */
async function ensureSocial(user) {
  let changed = false;
  if (!user.handle) {
    user.handle = await uniqueHandle(user.name || user.email.split("@")[0]);
    changed = true;
  }
  if (!user.friendCode) {
    user.friendCode = await uniqueCode();
    changed = true;
  }
  if (changed) await user.save();
  return user;
}

const sign = (user) => jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
const me = (user) => ({ ...user.toPublic(), email: user.email, friendCode: user.friendCode });

const Signup = z.object({
  email: z.email().max(200),
  password: z.string().min(8, "use at least 8 characters").max(200),
  name: z.string().trim().min(1).max(60),
  handle: z.string().trim().toLowerCase().regex(HANDLE, "3–24 letters, numbers, _ or .").optional(),
});

router.post("/signup", limiter, validate(Signup), async (req, res) => {
  const { email, password, name, handle } = req.body;
  if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: "An account with that email already exists" });
  if (handle && (await User.exists({ handle }))) return res.status(409).json({ message: "That handle is taken" });

  const user = await User.create({
    email,
    name,
    handle: handle || (await uniqueHandle(name)),
    friendCode: await uniqueCode(),
    passwordHash: await bcrypt.hash(password, 10),
  });
  res.status(201).json({ token: sign(user), userId: user._id, user: me(user) });
});

const Login = z.object({ email: z.string().trim().min(1).max(200), password: z.string().min(1).max(200) });

router.post("/login", limiter, validate(Login), async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  const ok = user && user.passwordHash && (await bcrypt.compare(req.body.password, user.passwordHash));
  if (!ok) return res.status(401).json({ message: "Wrong email or password" });
  await ensureSocial(user);
  res.json({ token: sign(user), userId: user._id, user: me(user) });
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found" });
  await ensureSocial(user);
  res.json({ user: me(user) });
});

const Update = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(160).optional(),
  handle: z.string().trim().toLowerCase().regex(HANDLE, "3–24 letters, numbers, _ or .").optional(),
});

router.patch("/me", auth, validate(Update), async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Account not found" });
  if (req.body.handle && req.body.handle !== user.handle && (await User.exists({ handle: req.body.handle }))) {
    return res.status(409).json({ message: "That handle is taken" });
  }
  Object.assign(user, req.body);
  await user.save();
  res.json({ user: me(user) });
});

/** Delete the account and everything it shared. */
router.delete("/me", auth, async (req, res) => {
  const posts = await Post.find({ owner: req.userId }).lean();
  await deleteFiles(posts.flatMap((p) => p.media.map((m) => m.fileId)));
  const postIds = posts.map((p) => p._id);
  await Promise.all([
    Comment.deleteMany({ $or: [{ post: { $in: postIds } }, { author: req.userId }] }),
    Post.deleteMany({ owner: req.userId }),
    Post.updateMany({ kudos: req.userId }, { $pull: { kudos: req.userId } }),
    Friendship.deleteMany({ $or: [{ requester: req.userId }, { recipient: req.userId }] }),
    Notification.deleteMany({ $or: [{ user: req.userId }, { actor: req.userId }] }),
    WeeklyStat.deleteMany({ user: req.userId }),
    Club.updateMany({ members: req.userId }, { $pull: { members: req.userId } }),
  ]);
  await Club.deleteMany({ members: { $size: 0 } });
  await User.deleteOne({ _id: req.userId });
  res.status(204).end();
});

module.exports = router;
