const express = require("express");
const { z } = require("zod");

const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const Club = require("../models/Club");
const Post = require("../models/Post");
const User = require("../models/User");
const { isId, notify } = require("../services/social");

const router = express.Router();
router.use(auth);

const summary = (c, me) => ({
  id: String(c._id),
  name: c.name,
  description: c.description,
  memberCount: c.members.length,
  owner: String(c.owner) === String(me),
  code: c.code,
});

router.get("/", async (req, res) => {
  const clubs = await Club.find({ members: req.userId }).sort({ name: 1 });
  res.json({ clubs: clubs.map((c) => summary(c, req.userId)) });
});

const NewClub = z.object({ name: z.string().trim().min(2).max(60), description: z.string().trim().max(280).default("") });

router.post("/", validate(NewClub), async (req, res) => {
  let code;
  do code = User.newCode(6);
  while (await Club.exists({ code }));
  const club = await Club.create({ ...req.body, code, owner: req.userId, members: [req.userId] });
  res.status(201).json({ club: summary(club, req.userId) });
});

const Join = z.object({ code: z.string().trim().min(4).max(12) });

router.post("/join", validate(Join), async (req, res) => {
  const club = await Club.findOne({ code: req.body.code.toUpperCase() });
  if (!club) return res.status(404).json({ message: "No club with that code" });
  if (!club.members.some((m) => String(m) === String(req.userId))) {
    if (club.members.length >= 500) return res.status(400).json({ message: "This club is full" });
    club.members.push(req.userId);
    await club.save();
    await notify(club.owner, req.userId, "club_join", { club: club._id });
  }
  res.json({ club: summary(club, req.userId) });
});

router.get("/:id", async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: "Club not found" });
  const club = await Club.findOne({ _id: req.params.id, members: req.userId }).populate("members");
  if (!club) return res.status(404).json({ message: "Club not found" });
  res.json({ club: { ...summary(club, req.userId), owner: String(club.owner) === String(req.userId), members: club.members.map((m) => m.toPublic()) } });
});

router.post("/:id/leave", async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: "Club not found" });
  const club = await Club.findOne({ _id: req.params.id, members: req.userId });
  if (!club) return res.status(404).json({ message: "Club not found" });
  club.members = club.members.filter((m) => String(m) !== String(req.userId));
  // Hand the club to the longest-standing member when the owner leaves; delete it when empty.
  if (!club.members.length) {
    await Post.updateMany({ clubs: club._id }, { $pull: { clubs: club._id } });
    await club.deleteOne();
  } else {
    if (String(club.owner) === String(req.userId)) club.owner = club.members[0];
    await club.save();
  }
  await Post.updateMany({ owner: req.userId, clubs: club._id }, { $pull: { clubs: club._id } });
  res.status(204).end();
});

module.exports = router;
