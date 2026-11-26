import express from "express";
import cors from "cors";
import { AVAILABLE_SKILLS, BRANCHES } from "./data/seed.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import matchesRoutes from "./routes/matches.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health & shared metadata
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/meta", (_req, res) => {
  res.json({ skills: AVAILABLE_SKILLS, branches: BRANCHES });
});

// Feature routes (each teammate can own/extend a module)
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/matches", matchesRoutes);

app.listen(PORT, () => {
  console.log(`LearnLoop API listening on http://localhost:${PORT}`);
});
