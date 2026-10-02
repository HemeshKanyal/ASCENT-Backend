/** Required settings, checked once at startup so a missing secret fails loudly. */
function requireEnv() {
  const missing = ["MONGO_URI", "JWT_SECRET"].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")} (see .env.example)`);
  if (process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
}

module.exports = { requireEnv };
