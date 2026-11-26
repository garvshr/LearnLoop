import { Router } from "express";
import { AVAILABLE_SKILLS, BRANCHES } from "../data/seed.js";
import { sanitizeStudent, updateStudentProfile } from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// PUT /api/profile
router.put("/", requireAuth, (req, res) => {
  const { name = "", branch = "", teachingSkill = "", learningSkill = "" } = req.body || {};

  const trimmedName = name.trim();
  const trimmedBranch = branch.trim();

  if (!trimmedName || !trimmedBranch || !teachingSkill || !learningSkill) {
    return res.status(400).json({
      error: "Name, branch, teaching skill, and learning skill are all required",
    });
  }

  if (!BRANCHES.includes(trimmedBranch)) {
    return res.status(400).json({ error: "Invalid branch selected" });
  }

  if (!AVAILABLE_SKILLS.includes(teachingSkill) || !AVAILABLE_SKILLS.includes(learningSkill)) {
    return res.status(400).json({ error: "Invalid skill selected" });
  }

  if (teachingSkill === learningSkill) {
    return res.status(400).json({
      error: "Teaching skill and learning skill must be different",
    });
  }

  const updated = updateStudentProfile(req.user.id, {
    name: trimmedName,
    branch: trimmedBranch,
    teachingSkill,
    learningSkill,
  });

  if (!updated) {
    return res.status(404).json({ error: "Student not found" });
  }

  return res.json({ student: sanitizeStudent(updated) });
});

export default router;
