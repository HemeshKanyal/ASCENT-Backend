const express = require("express");
const { z } = require("zod");

const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const Friendship = require("../models/Friendship");
const User = require("../models/User");
const { isId, notify } = require("../services/social");

const router = express.Router();
router.use(auth);

/** Friends, requests waiting for me, and requests I sent. */
router.get("/", async (req, res) => {
  const rows = await Friendship.find({ $or: [{ requester: req.userId }, { recipient: req.userId }] })
    .populate("requester recipient")
    .sort({ updatedAt: -1 });
  const out = { friends: [], incoming: [], outgoing: [] };
  for (const f of rows) {
    if (!f.requester || !f.recipient) continue;
    const mineAsked = String(f.requester._id) === String(req.userId);
    const other = (mineAsked ? f.recipient : f.requester).toPublic();
    const row = { id: String(f._id), user: other, since: f.updatedAt };
    if (f.status === "accepted") out.friends.push(row);
    else (mineAsked ? out.outgoing : out.incoming).push(row);
  }
  res.json(out);
});

const Request = z.object({ code: z.string().trim().min(3).max(40) });

/** Add by friend code (ABCD2345) or @handle. If they already asked you, this accepts. */
router.post("/request", validate(Request), async (req, res) => {
  const q = req.body.code.replace(/^@/, "");
  const target = await User.findOne({ $or: [{ friendCode: q.toUpperCase() }, { handle: q.toLowerCase() }] });
  if (!target) return res.status(404).json({ message: "No one found with that code or handle" });
  if (String(target._id) === String(req.userId)) return res.status(400).json({ message: "That's you!" });

  const theirs = await Friendship.findOne({ requester: target._id, recipient: req.userId });
  if (theirs) {
    if (theirs.status === "pending") {
      theirs.status = "accepted";
      await theirs.save();
      await notify(target._id, req.userId, "friend_accept");
    }
    return res.json({ status: "accepted", user: target.toPublic() });
  }
  const existing = await Friendship.findOne({ requester: req.userId, recipient: target._id });
  if (existing) return res.json({ status: existing.status, user: target.toPublic() });

  await Friendship.create({ requester: req.userId, recipient: target._id });
  await notify(target._id, req.userId, "friend_request");
  res.status(201).json({ status: "pending", user: target.toPublic() });
});

router.post("/:id/accept", async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: "Request not found" });
  const f = await Friendship.findOne({ _id: req.params.id, recipient: req.userId, status: "pending" });
  if (!f) return res.status(404).json({ message: "Request not found" });
  f.status = "accepted";
  await f.save();
  await notify(f.requester, req.userId, "friend_accept");
  res.json({ status: "accepted" });
});

/** Decline, cancel or unfriend. */
router.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: "Not found" });
  const r = await Friendship.deleteOne({ _id: req.params.id, $or: [{ requester: req.userId }, { recipient: req.userId }] });
  if (!r.deletedCount) return res.status(404).json({ message: "Not found" });
  res.status(204).end();
});

module.exports = router;
