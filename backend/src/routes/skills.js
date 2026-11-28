import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";
import {
  PROFICIENCY_LEVELS,
  SKILL_CATALOG,
  SKILL_CATEGORIES,
} from "../data/seed.js";
import {
  addTeachingSkill,
  removeTeachingSkill,
  sanitizeStudent,
  setLearningSkills,
  updateTeachingSkill,
} from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

// Ensure uploads directory exists on disk
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Deletes an uploaded proof file from local storage (`backend/uploads/`).
 * (Future Cloudinary/S3 integration: replace fs.unlinkSync with cloud delete API.)
 */
function deleteStoredProofFile(proofUrl) {
  if (!proofUrl || typeof proofUrl !== "string" || !proofUrl.startsWith("/uploads/")) {
    return;
  }
  const safeFileName = path.basename(proofUrl.slice("/uploads/".length));
  if (!safeFileName) return;
  const filePath = path.join(UPLOADS_DIR, safeFileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

const router = Router();

// GET /api/skills/catalog — full searchable list of skills & categories
router.get("/catalog", (_req, res) => {
  res.json({
    skills: SKILL_CATALOG,
    categories: SKILL_CATEGORIES,
    proficiencyLevels: PROFICIENCY_LEVELS,
  });
});

// GET /api/skills/my — current student's teaching & learning skills
router.get("/my", requireAuth, (req, res) => {
  const safe = sanitizeStudent(req.user);
  res.json({
    teachingSkills: safe.teachingSkills,
    learningSkills: safe.learningSkills,
  });
});

// POST /api/skills/upload-proof — upload certificate (PDF/image), photo, or video
router.post(
  "/upload-proof",
  requireAuth,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const proofType = req.body?.proofType || "certificate";
    return res.json({
      proof: {
        type: proofType,
        url: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
    });
  }
);

// DELETE /api/skills/upload-proof — delete an uploaded proof file from storage
router.delete("/upload-proof", requireAuth, (req, res) => {
  const { url = "" } = req.body || {};
  deleteStoredProofFile(url);
  return res.json({ ok: true });
});

// POST /api/skills/teaching — add a new teaching skill
router.post("/teaching", requireAuth, (req, res) => {
  const {
    name = "",
    category = "",
    proficiency = "Intermediate",
    description = "",
    teachingExperience = "",
    resourceLinks = [],
    proofs,
    proof = null,
  } = req.body || {};

  const trimmedName = name.trim();
  if (!trimmedName) {
    return res.status(400).json({ error: "Skill name is required" });
  }

  if (!PROFICIENCY_LEVELS.includes(proficiency)) {
    return res.status(400).json({ error: "Invalid proficiency level" });
  }

  const alreadyExists = req.user.teachingSkills.some(
    (sk) => sk.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (alreadyExists) {
    return res
      .status(400)
      .json({ error: `You already added "${trimmedName}" to your teaching skills` });
  }

  const cleanLinks = Array.isArray(resourceLinks)
    ? resourceLinks.map((l) => String(l).trim()).filter(Boolean)
    : [];

  const result = addTeachingSkill(req.user.id, {
    name: trimmedName,
    category: category.trim(),
    proficiency,
    description: description.trim(),
    teachingExperience: teachingExperience.trim(),
    resourceLinks: cleanLinks,
    proofs: Array.isArray(proofs) ? proofs : proof ? [proof] : [],
  });

  if (!result) {
    return res.status(404).json({ error: "Student not found" });
  }

  return res.status(201).json({
    student: sanitizeStudent(result.student),
    skill: result.skill,
  });
});

// PUT /api/skills/teaching/:skillId — update an existing teaching skill
router.put("/teaching/:skillId", requireAuth, (req, res) => {
  const { skillId } = req.params;
  const {
    name,
    category,
    proficiency,
    description,
    teachingExperience,
    resourceLinks,
    proofs,
    proof,
  } = req.body || {};

  if (proficiency && !PROFICIENCY_LEVELS.includes(proficiency)) {
    return res.status(400).json({ error: "Invalid proficiency level" });
  }

  const updates = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (category !== undefined) updates.category = String(category).trim();
  if (proficiency !== undefined) updates.proficiency = proficiency;
  if (description !== undefined) updates.description = String(description).trim();
  if (teachingExperience !== undefined) {
    updates.teachingExperience = String(teachingExperience).trim();
  }
  if (resourceLinks !== undefined) {
    updates.resourceLinks = Array.isArray(resourceLinks)
      ? resourceLinks.map((l) => String(l).trim()).filter(Boolean)
      : [];
  }
  if (Array.isArray(proofs)) {
    updates.proofs = proofs.filter(Boolean);
    updates.proof = updates.proofs[0] || null;
  } else if (proof !== undefined) {
    updates.proofs = proof ? [proof] : [];
    updates.proof = proof;
  }

  const existingSkill = req.user.teachingSkills.find((sk) => sk.id === skillId);
  const previousProofs = existingSkill?.proofs || [];

  const result = updateTeachingSkill(req.user.id, skillId, updates);
  if (!result) {
    return res.status(404).json({ error: "Teaching skill not found" });
  }

  // Delete any uploaded proof files that were removed during this update
  if (Array.isArray(updates.proofs)) {
    const nextUrls = new Set(updates.proofs.map((p) => p.url));
    previousProofs.forEach((oldProof) => {
      if (oldProof?.url && !nextUrls.has(oldProof.url)) {
        deleteStoredProofFile(oldProof.url);
      }
    });
  }

  return res.json({
    student: sanitizeStudent(result.student),
    skill: result.skill,
  });
});

// DELETE /api/skills/teaching/:skillId — remove a teaching skill and all linked proof files
router.delete("/teaching/:skillId", requireAuth, (req, res) => {
  const existingSkill = req.user.teachingSkills.find(
    (sk) => sk.id === req.params.skillId
  );

  const updated = removeTeachingSkill(req.user.id, req.params.skillId);
  if (!updated) {
    return res.status(404).json({ error: "Student not found" });
  }

  if (existingSkill) {
    const linkedProofs = Array.isArray(existingSkill.proofs)
      ? existingSkill.proofs
      : existingSkill.proof
      ? [existingSkill.proof]
      : [];
    linkedProofs.forEach((p) => deleteStoredProofFile(p?.url));
  }

  return res.json({ student: sanitizeStudent(updated) });
});

// PUT /api/skills/learning — replace the student's learning skills list
router.put("/learning", requireAuth, (req, res) => {
  const { learningSkills } = req.body || {};
  if (!Array.isArray(learningSkills)) {
    return res.status(400).json({ error: "learningSkills must be an array" });
  }

  const updated = setLearningSkills(req.user.id, learningSkills);
  if (!updated) {
    return res.status(404).json({ error: "Student not found" });
  }

  return res.json({ student: sanitizeStudent(updated) });
});

export default router;
