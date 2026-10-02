const crypto = require("crypto");
const mongoose = require("mongoose");

const Club = require("../models/Club");
const Friendship = require("../models/Friendship");
const Notification = require("../models/Notification");
const User = require("../models/User");

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const isId = (id) => mongoose.isValidObjectId(id);

/** Ids of everyone the user is friends with (accepted only). */
async function friendIds(userId) {
  const rows = await Friendship.find({ status: "accepted", $or: [{ requester: userId }, { recipient: userId }] }).lean();
  return rows.map((f) => (String(f.requester) === String(userId) ? f.recipient : f.requester));
}

async function clubIds(userId) {
  return (await Club.find({ members: userId }, { _id: 1 }).lean()).map((c) => c._id);
}

/** Who may see a post: the owner; friends unless private; members of a club it was shared to. */
async function canSee(post, userId) {
  if (String(post.owner._id ?? post.owner) === String(userId)) return true;
  if (post.visibility === "private") return false;
  const ownerId = post.owner._id ?? post.owner;
  const friends = await Friendship.exists({
    status: "accepted",
    $or: [
      { requester: userId, recipient: ownerId },
      { requester: ownerId, recipient: userId },
    ],
  });
  if (friends) return true;
  if (post.clubs?.length) return !!(await Club.exists({ _id: { $in: post.clubs }, members: userId }));
  return false;
}

// ── Media links ──────────────────────────────────────────────────────────
// Feed responses carry signed, expiring links so <Image>/<Video> can load them
// without auth headers. Anyone holding a link can view it until it expires.

const MEDIA_TTL_S = 24 * 60 * 60;
const mediaSecret = () => crypto.createHash("sha256").update(`media:${process.env.JWT_SECRET}`).digest();

function signMedia(fileId, now = Date.now()) {
  const exp = Math.floor(now / 1000) + MEDIA_TTL_S;
  const sig = crypto.createHmac("sha256", mediaSecret()).update(`${fileId}.${exp}`).digest("base64url");
  return `/api/media/${fileId}?exp=${exp}&sig=${sig}`;
}

function verifyMedia(fileId, exp, sig) {
  if (!exp || !sig || Number(exp) * 1000 < Date.now()) return false;
  const want = crypto.createHmac("sha256", mediaSecret()).update(`${fileId}.${exp}`).digest();
  const got = Buffer.from(String(sig), "base64url");
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

// ── Shaping responses ────────────────────────────────────────────────────

function serializePost(post, viewerId, owners) {
  const owner = owners?.get(String(post.owner)) ?? post.owner;
  return {
    id: String(post._id),
    clientId: post.clientId,
    owner: owner?.toPublic ? owner.toPublic() : { id: String(owner._id ?? owner), name: owner.name || owner.handle, handle: owner.handle },
    mine: String(owner._id ?? owner) === String(viewerId),
    date: post.date,
    kind: post.kind,
    activity: post.activity,
    title: post.title,
    caption: post.caption,
    stats: post.stats ?? {},
    exercises: post.exercises ?? [],
    route: post.route ?? null,
    media: (post.media ?? []).map((m) => ({ type: m.type, width: m.width, height: m.height, durationMs: m.durationMs, url: signMedia(String(m.fileId)) })),
    visibility: post.visibility,
    clubs: (post.clubs ?? []).map(String),
    kudosCount: post.kudos?.length ?? 0,
    kudoed: (post.kudos ?? []).some((k) => String(k) === String(viewerId)),
    commentCount: post.commentCount ?? 0,
  };
}

/** Load owners for many posts in one query. */
async function ownersFor(posts) {
  const ids = [...new Set(posts.map((p) => String(p.owner)))];
  const users = await User.find({ _id: { $in: ids } });
  return new Map(users.map((u) => [String(u._id), u]));
}

async function notify(user, actor, type, extra = {}) {
  if (String(user) === String(actor)) return;
  await Notification.create({ user, actor, type, ...extra });
}

module.exports = { oid, isId, friendIds, clubIds, canSee, signMedia, verifyMedia, serializePost, ownersFor, notify };
