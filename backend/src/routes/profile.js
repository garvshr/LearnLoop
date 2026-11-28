import { Router } from "express";
import { AVAILABLE_SKILLS, BRANCHES } from "../data/seed.js";
import { sanitizeStudent, updateStudentProfile } from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// PUT /api/profile
router.put("/", requireAuth, (req, res) => {
  const {
    name = "",
    branch = "",
    teachingSkills,
    learningSkills,
    teachingSkill = "",
    learningSkill = "",
  } = req.body || {};

  const trimmedName = name.trim();
  const trimmedBranch = branch.trim();

  const finalTeaching = Array.isArray(teachingSkills)
    ? [...new Set(teachingSkills.map((s) => String(s).trim()).filter(Boolean))]
    : teachingSkill
    ? [teachingSkill.trim()]
    : [];

  const finalLearning = Array.isArray(learningSkills)
    ? [...new Set(learningSkills.map((s) => String(s).trim()).filter(Boolean))]
    : learningSkill
    ? [learningSkill.trim()]
    : [];

  if (!trimmedName || !trimmedBranch || finalTeaching.length === 0 || finalLearning.length === 0) {
    return res.status(400).json({
      error: "Name, branch, at least one teaching skill, and at least one learning skill are required",
    });
  }

  if (!BRANCHES.includes(trimmedBranch)) {
    return res.status(400).json({ error: "Invalid branch selected" });
  }

  const invalidSkill = [...finalTeaching, ...finalLearning].find(
    (s) => !AVAILABLE_SKILLS.includes(s)
  );
  if (invalidSkill) {
    return res.status(400).json({ error: `Invalid skill selected: ${invalidSkill}` });
  }

  const overlap = finalTeaching.find((s) => finalLearning.includes(s));
  if (overlap) {
    return res.status(400).json({
      error: `"${overlap}" cannot be in both teaching and learning skills`,
    });
  }

  const updated = updateStudentProfile(req.user.id, {
    name: trimmedName,
    branch: trimmedBranch,
    teachingSkills: finalTeaching,
    learningSkills: finalLearning,
  });

  if (!updated) {
    return res.status(404).json({ error: "Student not found" });
  }

  return res.json({ student: sanitizeStudent(updated) });
});

export default router;
