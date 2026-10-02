require("dotenv").config();
const { requireEnv } = require("./config/env");
const connectDB = require("./config/db");
const app = require("./app");

requireEnv();

connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
});
