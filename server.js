require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");

const app = express();

connectDB();

// ENABLE CORS
app.use(cors());

app.use(express.json());

app.use("/api/exercises", require("./routes/exerciseRoutes"));
app.use("/api/splits", require("./routes/splitRoutes"));

app.get("/", (req, res) => {
  res.send("Workout API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
