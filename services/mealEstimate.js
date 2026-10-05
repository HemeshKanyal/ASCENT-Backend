/**
 * Meal estimate from a photo and/or a description, using Gemini (free tier).
 * Lives on the backend so the API key never ships in the app or web bundle.
 * Returns { ok: true, data } or { ok: false, error, status } with the error
 * codes the app understands (not_configured, refused, busy, failed).
 */
const { z } = require("zod");

const Item = z.object({
  name: z.string().describe("Common English name, local name in brackets if different, e.g. 'Kidney bean curry (rajma)'"),
  portion: z.string().describe("Household description, e.g. '1 bowl', '3 rotis', '1 glass'"),
  grams: z.number().describe("Estimated edible weight in grams (ml for drinks)"),
  kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number(),
  confidence: z.enum(["high", "medium", "low"]),
});
const MealEstimate = z.object({
  is_food: z.boolean(),
  items: z.array(Item),
  notes: z.string().describe("One or two short sentences: assumptions made, anything hard to see"),
});

const SYSTEM = `You estimate what's in a meal and how much, for a nutrition tracker used by people without a kitchen scale.
- Identify each distinct food or drink. Name dishes the way the person would (Indian, global, home-cooked or restaurant).
- Estimate portions from visual cues: a dinner plate is about 26 cm across, a katori holds about 150 ml, a glass about 250 ml, one roti is about 40 g, one idli about 40 g.
- Count discrete items (rotis, eggs, idlis, pieces) carefully.
- Include cooking fat that is typical for the dish (ghee or oil in curries, butter on bread) inside that dish's numbers.
- Nutrition values are for the estimated portion, not per 100 g.
- If the person describes the meal, trust their description for what the foods are and their counts; use the photo for portion sizes.
- Use "low" confidence when a portion is hidden, stacked, or ambiguous, and say so in notes.
- If there is no food, set is_food to false and return no items.`;

const configured = () => Boolean(process.env.GEMINI_API_KEY);

async function estimate({ image, media, prompt }) {
  if (!configured()) return { ok: false, error: "not_configured", status: 503 };
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const parts = [];
  if (image) parts.push({ inline_data: { mime_type: media, data: image } });
  parts.push({ text: prompt });
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(MealEstimate) },
  });
  const call = (m) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body,
      signal: AbortSignal.timeout(60_000),
    });
  let res;
  try {
    res = await call(model);
    // 503 = model overloaded, 429 = its free daily quota is used up. The
    // lighter model has its own, larger quota and is usually still available.
    if (res.status === 503 || res.status === 429) res = await call(process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest");
  } catch {
    return { ok: false, error: "failed", status: 502 };
  }
  if (res.status === 401 || res.status === 403) return { ok: false, error: "not_configured", status: 503 };
  if (res.status === 429 || res.status === 503) return { ok: false, error: "busy", status: 429 };
  if (!res.ok) return { ok: false, error: "failed", status: 502 };
  const json = await res.json().catch(() => ({}));
  const candidate = json.candidates?.[0];
  if (json.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY") return { ok: false, error: "refused", status: 422 };
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  try {
    const parsed = MealEstimate.safeParse(JSON.parse(text));
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: "failed", status: 502 };
  } catch {
    return { ok: false, error: "failed", status: 502 };
  }
}

module.exports = { estimate, configured, MealEstimate };
