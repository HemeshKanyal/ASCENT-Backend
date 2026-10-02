const express = require("express");

const auth = require("../middleware/authMiddleware");
const Club = require("../models/Club");
const Post = require("../models/Post");
const { clubIds, friendIds, isId, ownersFor, serializePost } = require("../services/social");

const router = express.Router();
router.use(auth);

const PAGE = 20;

/** Paging: pass the last post's `date` as ?before= for the next page. */
function page(req) {
  const before = req.query.before ? new Date(String(req.query.before)) : null;
  return before && !Number.isNaN(+before) ? { date: { $lt: before } } : {};
}

async function send(res, posts, viewer) {
  const owners = await ownersFor(posts);
  const out = posts.filter((p) => owners.has(String(p.owner))).map((p) => serializePost(p, viewer, owners));
  res.json({ posts: out, next: posts.length === PAGE ? posts[posts.length - 1].date : null });
}

/** You + friends (unless private) + anything shared to your clubs, newest first. */
router.get("/", async (req, res) => {
  const [friends, clubs] = await Promise.all([friendIds(req.userId), clubIds(req.userId)]);
  const posts = await Post.find({
    ...page(req),
    $or: [{ owner: req.userId }, { owner: { $in: friends }, visibility: "friends" }, { clubs: { $in: clubs }, visibility: "friends" }],
  })
    .sort({ date: -1 })
    .limit(PAGE);
  await send(res, posts, req.userId);
});

/** One person's posts that you're allowed to see. */
router.get("/user/:id", async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: "Not found" });
  const me = String(req.params.id) === String(req.userId);
  const friends = me ? [] : await friendIds(req.userId);
  const isFriend = friends.some((f) => String(f) === String(req.params.id));
  const clubs = me ? [] : await clubIds(req.userId);
  const filter = me
    ? { owner: req.userId }
    : { owner: req.params.id, visibility: "friends", ...(isFriend ? {} : { clubs: { $in: clubs } }) };
  const posts = await Post.find({ ...page(req), ...filter }).sort({ date: -1 }).limit(PAGE);
  await send(res, posts, req.userId);
});

router.get("/club/:id", async (req, res) => {
  if (!isId(req.params.id) || !(await Club.exists({ _id: req.params.id, members: req.userId }))) {
    return res.status(404).json({ message: "Club not found" });
  }
  const posts = await Post.find({ ...page(req), clubs: req.params.id, visibility: "friends" }).sort({ date: -1 }).limit(PAGE);
  await send(res, posts, req.userId);
});

module.exports = router;
