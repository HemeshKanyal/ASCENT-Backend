const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-the-check-1234";
const app = require("../app");

let mongo;
let server;
let base;

async function call(method, path, { token, body, raw, type } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body) headers["content-type"] = "application/json";
  if (raw) headers["content-type"] = type;
  const res = await fetch(base + path, { method, headers, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, body: json, headers: res.headers };
}

const signup = async (name, handle) => {
  const r = await call("POST", "/api/auth/signup", { body: { name, handle, email: `${handle}@example.test`, password: "correct-horse-1" } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return { token: r.body.token, ...r.body.user };
};

const befriend = async (a, b) => {
  const r = await call("POST", "/api/friends/request", { token: a.token, body: { code: b.friendCode } });
  assert.equal(r.status, 201);
  const list = await call("GET", "/api/friends", { token: b.token });
  const req = list.body.incoming.find((x) => x.user.id === a.id);
  assert.equal((await call("POST", `/api/friends/${req.id}/accept`, { token: b.token })).status, 200);
};

const run = (clientId, extra = {}) => ({
  clientId,
  date: new Date().toISOString(),
  kind: "endurance",
  activity: "run",
  title: "Morning run",
  stats: { distanceKm: 5.2, movingSeconds: 1800 },
  route: [
    [
      [28.6, 77.2],
      [28.61, 77.21],
    ],
  ],
  ...extra,
});

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongo.stop();
});

describe("auth", () => {
  it("signs up with a handle and friend code, and rejects bad input", async () => {
    const a = await signup("Asha", "asha");
    assert.equal(a.handle, "asha");
    assert.match(a.friendCode, /^[A-Z2-9]{8}$/);
    assert.equal((await call("POST", "/api/auth/signup", { body: { name: "X", email: "asha@example.test", password: "correct-horse-1" } })).status, 409);
    assert.equal((await call("POST", "/api/auth/signup", { body: { name: "X", email: "x@example.test", password: "short" } })).status, 400);
    assert.equal((await call("POST", "/api/auth/login", { body: { email: "ASHA@example.test", password: "correct-horse-1" } })).status, 200);
    assert.equal((await call("POST", "/api/auth/login", { body: { email: "asha@example.test", password: "wrong-password" } })).status, 401);
    assert.equal((await call("GET", "/api/auth/me", { token: "nope" })).status, 401);
    assert.equal((await call("GET", "/api/auth/me", { token: a.token })).body.user.handle, "asha");
  });
});

describe("friends, feed and privacy", () => {
  let a;
  let b;
  let c;
  before(async () => {
    a = await signup("Arjun", "arjun");
    b = await signup("Bela", "bela");
    c = await signup("Chen", "chen");
    await befriend(a, b);
  });

  it("friends see each other's posts; strangers and private posts stay hidden", async () => {
    const p = await call("POST", "/api/posts", { token: a.token, body: run("act_1") });
    assert.equal(p.status, 201);
    const priv = await call("POST", "/api/posts", { token: a.token, body: run("act_2", { visibility: "private", title: "Secret" }) });

    const feedB = await call("GET", "/api/feed", { token: b.token });
    assert.deepEqual(
      feedB.body.posts.map((x) => x.title),
      ["Morning run"]
    );
    assert.equal(feedB.body.posts[0].owner.handle, "arjun");
    assert.equal((await call("GET", "/api/feed", { token: c.token })).body.posts.length, 0);
    assert.equal((await call("GET", `/api/posts/${p.body.post.id}`, { token: c.token })).status, 404);
    assert.equal((await call("GET", `/api/posts/${priv.body.post.id}`, { token: b.token })).status, 404);
    assert.equal((await call("GET", "/api/feed", { token: a.token })).body.posts.length, 2);
  });

  it("re-posting the same session updates it instead of duplicating", async () => {
    const again = await call("POST", "/api/posts", { token: a.token, body: run("act_1", { caption: "Felt great" }) });
    assert.equal(again.status, 200);
    const mine = await call("GET", `/api/feed/user/${a.id}`, { token: a.token });
    assert.equal(mine.body.posts.filter((x) => x.clientId === "act_1").length, 1);
  });

  it("kudos and comments notify the owner, once", async () => {
    const post = (await call("GET", "/api/feed", { token: b.token })).body.posts[0];
    assert.equal((await call("POST", `/api/posts/${post.id}/kudos`, { token: b.token })).body.kudosCount, 1);
    assert.equal((await call("POST", `/api/posts/${post.id}/kudos`, { token: b.token })).body.kudosCount, 1);
    assert.equal((await call("POST", `/api/posts/${post.id}/kudos`, { token: c.token })).status, 404);
    const cm = await call("POST", `/api/posts/${post.id}/comments`, { token: b.token, body: { text: "Strong pace!" } });
    assert.equal(cm.status, 201);
    const list = await call("GET", `/api/posts/${post.id}/comments`, { token: a.token });
    assert.equal(list.body.comments[0].text, "Strong pace!");

    const inbox = await call("GET", "/api/notifications", { token: a.token });
    const types = inbox.body.items.map((n) => n.type).sort();
    assert.deepEqual(types, ["comment", "friend_accept", "kudos"]);
    await call("POST", "/api/notifications/read", { token: a.token });
    assert.equal((await call("GET", "/api/notifications/unread", { token: a.token })).body.unread, 0);

    // The post owner can remove a comment on their post; strangers can't.
    assert.equal((await call("DELETE", `/api/posts/${post.id}/comments/${cm.body.comment.id}`, { token: c.token })).status, 404);
    assert.equal((await call("DELETE", `/api/posts/${post.id}/comments/${cm.body.comment.id}`, { token: a.token })).status, 204);
    assert.equal((await call("GET", `/api/posts/${post.id}`, { token: a.token })).body.post.commentCount, 0);
  });

  it("only the owner can edit or delete a post", async () => {
    const post = (await call("GET", "/api/feed", { token: b.token })).body.posts[0];
    assert.equal((await call("PATCH", `/api/posts/${post.id}`, { token: b.token, body: { caption: "hijack" } })).status, 404);
    assert.equal((await call("DELETE", `/api/posts/${post.id}`, { token: b.token })).status, 404);
    assert.equal((await call("PATCH", `/api/posts/${post.id}`, { token: a.token, body: { caption: "Edited" } })).body.post.caption, "Edited");
  });

  it("adding by @handle works, and asking back accepts", async () => {
    const r = await call("POST", "/api/friends/request", { token: c.token, body: { code: "@bela" } });
    assert.equal(r.body.status, "pending");
    const back = await call("POST", "/api/friends/request", { token: b.token, body: { code: c.friendCode } });
    assert.equal(back.body.status, "accepted");
    const friends = await call("GET", "/api/friends", { token: c.token });
    assert.deepEqual(
      friends.body.friends.map((f) => f.user.handle),
      ["bela"]
    );
  });
});

describe("media", () => {
  it("uploads to a post, serves via signed links with ranges, and rejects tampering", async () => {
    const u = await signup("Dev", "dev");
    const post = (await call("POST", "/api/posts", { token: u.token, body: run("act_m") })).body.post;
    const bytes = Buffer.from("0123456789abcdef".repeat(100));
    const up = await call("POST", `/api/posts/${post.id}/media?width=10&height=20`, { token: u.token, raw: bytes, type: "video/mp4" });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    const m = up.body.post.media[0];
    assert.equal(m.type, "video");

    const full = await fetch(base + m.url);
    assert.equal(full.status, 200);
    assert.equal(Buffer.from(await full.arrayBuffer()).length, bytes.length);
    const part = await fetch(base + m.url, { headers: { range: "bytes=16-31" } });
    assert.equal(part.status, 206);
    assert.equal(await part.text(), "0123456789abcdef");

    assert.equal((await fetch(base + m.url.replace(/sig=[^&]+/, "sig=AAAA"))).status, 403);
    assert.equal((await call("POST", `/api/posts/${post.id}/media`, { token: u.token, raw: Buffer.from("x"), type: "text/plain" })).status, 415);
  });
});

describe("clubs and leaderboards", () => {
  it("joins by code, shares to the club, and ranks weekly totals", async () => {
    const e = await signup("Esha", "esha");
    const f = await signup("Farid", "farid");
    const club = (await call("POST", "/api/clubs", { token: e.token, body: { name: "Sunday Long Run" } })).body.club;
    assert.equal((await call("POST", "/api/clubs/join", { token: f.token, body: { code: club.code.toLowerCase() } })).status, 200);

    // Not friends, but the club post shows up for the club.
    await call("POST", "/api/posts", { token: e.token, body: run("act_c", { clubs: [club.id] }) });
    assert.equal((await call("GET", `/api/feed/club/${club.id}`, { token: f.token })).body.posts.length, 1);
    assert.equal((await call("GET", "/api/feed", { token: f.token })).body.posts.length, 1);

    const week = "2025-10-13";
    await call("PUT", "/api/leaderboard/stats", { token: e.token, body: { weeks: [{ week, distanceKm: 12, minutes: 90, sessions: 3, activeDays: 3, streakWeeks: 4 }] } });
    await call("PUT", "/api/leaderboard/stats", { token: f.token, body: { weeks: [{ week, distanceKm: 20, minutes: 60, sessions: 2, activeDays: 2, streakWeeks: 1 }] } });
    const byDistance = await call("GET", `/api/leaderboard?week=${week}&metric=distance&club=${club.id}`, { token: e.token });
    assert.deepEqual(
      byDistance.body.rows.map((r) => r.user.handle),
      ["farid", "esha"]
    );
    const byTime = await call("GET", `/api/leaderboard?week=${week}&metric=time&club=${club.id}`, { token: e.token });
    assert.equal(byTime.body.rows[0].user.handle, "esha");

    // Leaving removes access.
    assert.equal((await call("POST", `/api/clubs/${club.id}/leave`, { token: f.token })).status, 204);
    assert.equal((await call("GET", `/api/feed/club/${club.id}`, { token: f.token })).status, 404);
  });
});

describe("profile photo", () => {
  it("sets, replaces and removes an avatar, visible to friends via a signed link", async () => {
    const u = await signup("Ira", "ira");
    const v = await signup("Jai", "jai");
    await befriend(u, v);
    const png = Buffer.alloc(300, 7).toString("base64");
    const r = await call("PUT", "/api/auth/me/avatar", { token: u.token, body: { mimeType: "image/png", data: png } });
    assert.equal(r.status, 200);
    assert.match(r.body.user.avatarUrl, /^\/api\/media\/[a-f0-9]{24}\?exp=\d+&sig=/);
    const img = await fetch(base + r.body.user.avatarUrl);
    assert.equal(img.headers.get("content-type"), "image/png");

    const friends = await call("GET", "/api/friends", { token: v.token });
    assert.ok(friends.body.friends[0].user.avatarUrl);

    const again = await call("PUT", "/api/auth/me/avatar", { token: u.token, body: { mimeType: "image/png", data: png } });
    assert.notEqual(again.body.user.avatarUrl.split("?")[0], r.body.user.avatarUrl.split("?")[0]);
    assert.equal(await mongoose.connection.db.collection("media.files").countDocuments({ "metadata.kind": "avatar", "metadata.owner": new mongoose.Types.ObjectId(u.id) }), 1);
    assert.equal((await call("PUT", "/api/auth/me/avatar", { token: u.token, body: { mimeType: "text/html", data: png } })).status, 400);
    assert.equal((await call("DELETE", "/api/auth/me/avatar", { token: u.token })).body.user.avatarUrl, null);
  });
});

describe("account deletion", () => {
  it("removes the user's posts, friendships and media", async () => {
    const g = await signup("Gia", "gia");
    const h = await signup("Hari", "hari");
    await befriend(g, h);
    const post = (await call("POST", "/api/posts", { token: g.token, body: run("act_g") })).body.post;
    await call("POST", `/api/posts/${post.id}/media`, { token: g.token, raw: Buffer.from("img"), type: "image/jpeg" });
    assert.equal((await call("DELETE", "/api/auth/me", { token: g.token })).status, 204);
    assert.equal((await call("GET", "/api/feed", { token: h.token })).body.posts.length, 0);
    assert.equal((await call("GET", "/api/friends", { token: h.token })).body.friends.length, 0);
    assert.equal(await mongoose.connection.db.collection("media.files").countDocuments({ "metadata.post": new mongoose.Types.ObjectId(post.id) }), 0);
  });
});
