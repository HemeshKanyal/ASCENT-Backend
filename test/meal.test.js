const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");

process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-the-check-1234";
const meal = require("../services/mealEstimate");
const app = require("../app");

let server;
let base;
let calls = [];
const realEstimate = meal.estimate;

const post = async (body, raw) => {
  const res = await fetch(`${base}/api/meal-photo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

const estimate = { is_food: true, items: [{ name: "Roti", portion: "2 rotis", grams: 80, kcal: 240, protein_g: 7, carbs_g: 44, fat_g: 4, fiber_g: 4, confidence: "high" }], notes: "" };

before(async () => {
  meal.estimate = async (input) => {
    calls.push(input);
    return { ok: true, data: estimate };
  };
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  meal.estimate = realEstimate;
  server.close();
});

describe("meal photo", () => {
  it("reports not_configured without a Gemini key", async () => {
    delete process.env.GEMINI_API_KEY;
    const r = await post({ hint: "2 rotis" });
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "not_configured");
  });

  it("estimates from a photo or a description", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    calls = [];
    const r = await post({ image: "aGVsbG8=", mediaType: "image/png", hint: "dal and rice" });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, estimate);
    assert.equal(calls[0].media, "image/png");
    assert.match(calls[0].prompt, /dal and rice/);

    const d = await post({ hint: "3 idlis" });
    assert.equal(d.status, 200);
    assert.equal(calls[1].image, undefined);
  });

  it("accepts photos larger than the general 2 MB JSON limit", async () => {
    const r = await post({ image: "a".repeat(3_000_000) });
    assert.equal(r.status, 200);
  });

  it("rejects empty, malformed and oversized requests", async () => {
    assert.equal((await post({})).status, 400);
    assert.equal((await post({ hint: "   " })).status, 400);
    assert.equal((await post({ image: 42 })).status, 400);
    assert.equal((await post(null, "{nope")).status, 400);
    const big = await post({ image: "a".repeat(7_000_001) });
    assert.equal(big.status, 413);
    assert.equal(big.body.error, "too_large");
  });

  it("passes provider errors through as codes the app knows", async () => {
    meal.estimate = async () => ({ ok: false, error: "busy", status: 429 });
    const r = await post({ hint: "poha" });
    assert.equal(r.status, 429);
    assert.equal(r.body.error, "busy");
  });
});
