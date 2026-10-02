const express = require("express");
const { z } = require("zod");

const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const Club = require("../models/Club");
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const User = require("../models/User");
const { deleteFiles, mediaBucket } = require("../services/media");
const { canSee, isId, notify, serializePost } = require("../services/social");

const router = express.Router();
router.use(auth);

const MAX_MEDIA = 8;
const MAX_BYTES = { image: 15 * 1024 * 1024, video: 80 * 1024 * 1024 };

const num = z.number().finite().nonnegative().optional().nullable();
const Create = z.object({
  clientId: z.string().min(1).max(80),
  date: z.iso.datetime({ offset: true }),
  kind: z.string().max(30).optional(),
  activity: z.string().max(40).optional(),
  title: z.string().trim().max(120).optional(),
  caption: z.string().trim().max(2000).default(""),
  stats: z
    .object({
      distanceKm: num,
      movingSeconds: num,
      durationMinutes: num,
      paceSecPerKm: num,
      speedKmh: num,
      elevationGain: num,
      calories: num,
      sets: num,
      volumeKg: num,
    })
    .partial()
    .default({}),
  exercises: z.array(z.object({ name: z.string().max(80), sets: z.number().int().min(0).max(100), best: z.string().max(40).optional() })).max(40).default([]),
  route: z
    .array(z.array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])).max(5000))
    .max(20)
    .optional()
    .nullable(),
  visibility: z.enum(["friends", "private"]).default("friends"),
  clubs: z.array(z.string()).max(10).default([]),
});

async function loadVisible(req, res) {
  if (!isId(req.params.id)) {
    res.status(404).json({ message: "Post not found" });
    return null;
  }
  const post = await Post.findById(req.params.id);
  if (!post || !(await canSee(post, req.userId))) {
    res.status(404).json({ message: "Post not found" });
    return null;
  }
  return post;
}

async function loadOwn(req, res) {
  if (!isId(req.params.id)) {
    res.status(404).json({ message: "Post not found" });
    return null;
  }
  const post = await Post.findOne({ _id: req.params.id, owner: req.userId });
  if (!post) res.status(404).json({ message: "Post not found" });
  return post;
}

/** Only clubs the poster is actually in. */
async function ownClubs(userId, ids) {
  const valid = ids.filter(isId);
  if (!valid.length) return [];
  return (await Club.find({ _id: { $in: valid }, members: userId }, { _id: 1 }).lean()).map((c) => c._id);
}

/** Share an activity. Posting the same session again updates it instead of duplicating. */
router.post("/", validate(Create), async (req, res) => {
  const body = { ...req.body, date: new Date(req.body.date), clubs: await ownClubs(req.userId, req.body.clubs) };
  const existing = await Post.findOne({ owner: req.userId, clientId: body.clientId });
  const post = existing ? Object.assign(existing, body) : new Post({ ...body, owner: req.userId });
  await post.save();
  const owner = await User.findById(req.userId);
  res.status(existing ? 200 : 201).json({ post: serializePost(post, req.userId, new Map([[String(owner._id), owner]])) });
});

router.get("/:id", async (req, res) => {
  const post = await loadVisible(req, res);
  if (!post) return;
  const [owner, kudoers] = await Promise.all([User.findById(post.owner), User.find({ _id: { $in: post.kudos } })]);
  res.json({
    post: serializePost(post, req.userId, new Map([[String(owner._id), owner]])),
    kudos: kudoers.map((u) => u.toPublic()),
  });
});

const Patch = z.object({
  caption: z.string().trim().max(2000).optional(),
  title: z.string().trim().max(120).optional(),
  visibility: z.enum(["friends", "private"]).optional(),
  clubs: z.array(z.string()).max(10).optional(),
});

router.patch("/:id", validate(Patch), async (req, res) => {
  const post = await loadOwn(req, res);
  if (!post) return;
  const { clubs, ...rest } = req.body;
  Object.assign(post, rest);
  if (clubs) post.clubs = await ownClubs(req.userId, clubs);
  await post.save();
  const owner = await User.findById(req.userId);
  res.json({ post: serializePost(post, req.userId, new Map([[String(owner._id), owner]])) });
});

router.delete("/:id", async (req, res) => {
  const post = await loadOwn(req, res);
  if (!post) return;
  await deleteFiles(post.media.map((m) => m.fileId));
  await Comment.deleteMany({ post: post._id });
  await post.deleteOne();
  res.status(204).end();
});

/**
 * Upload one photo or clip as the raw request body (Content-Type image/* or video/*).
 * Optional query: width, height, durationMs. Streams straight into GridFS.
 */
router.post("/:id/media", async (req, res) => {
  const post = await loadOwn(req, res);
  if (!post) return;
  if (post.media.length >= MAX_MEDIA) return res.status(400).json({ message: `Up to ${MAX_MEDIA} photos or videos per post` });
  const mimeType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const type = mimeType.startsWith("image/") ? "image" : mimeType.startsWith("video/") ? "video" : null;
  if (!type) return res.status(415).json({ message: "Send an image or a video" });
  const declared = Number(req.headers["content-length"] || 0);
  if (declared > MAX_BYTES[type]) return res.status(413).json({ message: type === "video" ? "Videos up to 80 MB" : "Photos up to 15 MB" });

  const upload = mediaBucket().openUploadStream(`${post._id}`, { metadata: { owner: req.userId, post: post._id, mimeType } });
  let size = 0;
  let tooBig = false;
  await new Promise((resolve, reject) => {
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES[type] && !tooBig) {
        tooBig = true;
        req.unpipe(upload);
        upload.abort().catch(() => {});
        resolve();
      }
    });
    req.on("error", reject);
    upload.on("error", reject);
    upload.on("finish", resolve);
    req.pipe(upload);
  });
  if (tooBig) return res.status(413).json({ message: "File too large" });
  if (!size) {
    await deleteFiles([upload.id]);
    return res.status(400).json({ message: "Empty upload" });
  }

  const q = (k) => (Number.isFinite(Number(req.query[k])) && Number(req.query[k]) > 0 ? Number(req.query[k]) : undefined);
  // Re-read: another upload may have landed while this one streamed.
  const fresh = await Post.findOneAndUpdate(
    { _id: post._id, [`media.${MAX_MEDIA - 1}`]: { $exists: false } },
    { $push: { media: { fileId: upload.id, type, mimeType, width: q("width"), height: q("height"), durationMs: q("durationMs"), size } } },
    { returnDocument: "after" }
  );
  if (!fresh) {
    await deleteFiles([upload.id]);
    return res.status(400).json({ message: `Up to ${MAX_MEDIA} photos or videos per post` });
  }
  const owner = await User.findById(req.userId);
  res.status(201).json({ post: serializePost(fresh, req.userId, new Map([[String(owner._id), owner]])) });
});

// ── Kudos & comments ─────────────────────────────────────────────────────

router.post("/:id/kudos", async (req, res) => {
  const post = await loadVisible(req, res);
  if (!post) return;
  const r = await Post.updateOne({ _id: post._id, kudos: { $ne: req.userId } }, { $addToSet: { kudos: req.userId } });
  if (r.modifiedCount) await notify(post.owner, req.userId, "kudos", { post: post._id });
  res.json({ kudosCount: post.kudos.length + (r.modifiedCount ? 1 : 0), kudoed: true });
});

router.delete("/:id/kudos", async (req, res) => {
  const post = await loadVisible(req, res);
  if (!post) return;
  const r = await Post.updateOne({ _id: post._id }, { $pull: { kudos: req.userId } });
  res.json({ kudosCount: post.kudos.length - (r.modifiedCount ? 1 : 0), kudoed: false });
});

router.get("/:id/comments", async (req, res) => {
  const post = await loadVisible(req, res);
  if (!post) return;
  const comments = await Comment.find({ post: post._id }).sort({ createdAt: 1 }).limit(500).populate("author");
  res.json({
    comments: comments
      .filter((c) => c.author)
      .map((c) => ({ id: String(c._id), text: c.text, date: c.createdAt, author: c.author.toPublic(), mine: String(c.author._id) === String(req.userId) })),
  });
});

const NewComment = z.object({ text: z.string().trim().min(1).max(1000) });

router.post("/:id/comments", validate(NewComment), async (req, res) => {
  const post = await loadVisible(req, res);
  if (!post) return;
  const c = await Comment.create({ post: post._id, author: req.userId, text: req.body.text });
  await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });
  await notify(post.owner, req.userId, "comment", { post: post._id, text: req.body.text.slice(0, 140) });
  const author = await User.findById(req.userId);
  res.status(201).json({ comment: { id: String(c._id), text: c.text, date: c.createdAt, author: author.toPublic(), mine: true } });
});

/** Authors delete their own comments; post owners can delete any on their post. */
router.delete("/:id/comments/:commentId", async (req, res) => {
  const post = await loadVisible(req, res);
  if (!post || !isId(req.params.commentId)) return post && res.status(404).json({ message: "Comment not found" });
  const isOwner = String(post.owner) === String(req.userId);
  const r = await Comment.deleteOne({ _id: req.params.commentId, post: post._id, ...(isOwner ? {} : { author: req.userId }) });
  if (!r.deletedCount) return res.status(404).json({ message: "Comment not found" });
  await Post.updateOne({ _id: post._id }, { $inc: { commentCount: -1 } });
  res.status(204).end();
});

module.exports = router;
