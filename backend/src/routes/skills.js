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
import {
  deleteFromCloudinary,
  uploadBufferToCloudinary,
} from "../utils/cloudinary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

/**
 * Deletes a proof from Cloudinary (if publicId exists) or legacy local disk.
 */
async function deleteProofFromStorage(proof) {
  if (!proof) return;

  if (proof.publicId) {
    await deleteFromCloudinary(proof.publicId, proof.resourceType || "image");
    return;
  }

  // Fallback for any older local `/uploads/...` files
  if (typeof proof.url === "string" && proof.url.startsWith("/uploads/")) {
    const safeFileName = path.basename(proof.url.slice("/uploads/".length));
    if (!safeFileName) return;
    const filePath = path.join(UPLOADS_DIR, safeFileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

// Keep uploads in memory and stream directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
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

// POST /api/skills/upload-proof — upload certificate (PDF/DOCX/image), photo, or video to Cloudinary
router.post(
  "/upload-proof",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const proofType = req.body?.proofType || "certificate";
      const uploaded = await uploadBufferToCloudinary(
        req.file.buffer,
        req.file.originalname
      );

      return res.json({
        proof: {
          type: proofType,
          url: uploaded.url,
          publicId: uploaded.publicId,
          resourceType: uploaded.resourceType,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
        },
      });
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      return res.status(500).json({
        error: "Cloud upload failed. Please verify CLOUDINARY_URL in backend/.env",
      });
    }
  }
);

// DELETE /api/skills/upload-proof — delete an uploaded proof file from Cloudinary
router.delete("/upload-proof", requireAuth, async (req, res) => {
  const { url = "", publicId = "", resourceType = "image" } = req.body || {};
  await deleteProofFromStorage({ url, publicId, resourceType });
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
router.put("/teaching/:skillId", requireAuth, async (req, res) => {
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
    await Promise.all(
      previousProofs
        .filter((oldProof) => oldProof?.url && !nextUrls.has(oldProof.url))
        .map((oldProof) => deleteProofFromStorage(oldProof))
    );
  }

  return res.json({
    student: sanitizeStudent(result.student),
    skill: result.skill,
  });
});

// DELETE /api/skills/teaching/:skillId — remove a teaching skill and all linked proof files
router.delete("/teaching/:skillId", requireAuth, async (req, res) => {
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
    await Promise.all(linkedProofs.map((p) => deleteProofFromStorage(p)));
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
