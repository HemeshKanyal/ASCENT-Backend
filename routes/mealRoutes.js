const express = require("express");
const { rateLimit } = require("express-rate-limit");

const meal = require("../services/mealEstimate");

const router = express.Router();

const MAX_BASE64 = 7_000_000; // ~5 MB image
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// No login needed (the app is offline-first and most people have no account),
// so cap AI calls per IP to protect the free Gemini quota.
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.MEAL_RATE_LIMIT) || 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "busy" }),
});

// POST /api/meal-photo { image?: base64, mediaType?, hint? } → MealEstimate
router.post("/", limiter, express.json({ limit: "8mb" }), async (req, res) => {
  if (!meal.configured()) return res.status(503).json({ error: "not_configured" });
  const { image, mediaType = "image/jpeg", hint } = req.body ?? {};
  if (image !== undefined && typeof image !== "string") return res.status(400).json({ error: "bad_request" });
  if (hint !== undefined && typeof hint !== "string") return res.status(400).json({ error: "bad_request" });
  if (!image && !hint?.trim()) return res.status(400).json({ error: "bad_request" });
  if (image && image.length > MAX_BASE64) return res.status(413).json({ error: "too_large" });
  const media = ALLOWED.includes(mediaType) ? mediaType : "image/jpeg";
  const prompt = hint?.trim() ? `The person says: "${hint.trim().slice(0, 500)}"` : "Estimate this meal.";

  const result = await meal.estimate({ image, media, prompt });
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  res.json(result.data);
});

module.exports = router;
