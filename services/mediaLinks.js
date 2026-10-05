const crypto = require("crypto");

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

module.exports = { signMedia, verifyMedia };
