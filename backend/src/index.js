import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import {
  AVAILABLE_SKILLS,
  BRANCHES,
  PROFICIENCY_LEVELS,
  SKILL_CATALOG,
  SKILL_CATEGORIES,
} from "./data/seed.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import matchesRoutes from "./routes/matches.js";
import skillsRoutes from "./routes/skills.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../uploads");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve uploaded proof files (certificates, photos, videos)
app.use("/uploads", express.static(UPLOADS_DIR));

// Health & shared metadata
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/meta", (_req, res) => {
  res.json({
    skills: AVAILABLE_SKILLS,
    skillCatalog: SKILL_CATALOG,
    categories: SKILL_CATEGORIES,
    proficiencyLevels: PROFICIENCY_LEVELS,
    branches: BRANCHES,
  });
});

// Feature routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/matches", matchesRoutes);

app.listen(PORT, () => {
  console.log(`LearnLoop API listening on http://localhost:${PORT}`);
});
