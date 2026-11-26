import { Router } from "express";
import { getAllStudents, sanitizeStudent } from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/matches
 * Returns students who teach what the signed-in student wants to learn.
 * Highlights mutual matches where the other student also wants to learn what
 * the signed-in student can teach, sorted with mutual matches first.
 */
router.get("/", requireAuth, (req, res) => {
  const current = req.user;

  if (!current.learningSkill || !current.teachingSkill) {
    return res.json({ matches: [], profileComplete: false });
  }

  const matches = getAllStudents()
    .filter((other) => other.id !== current.id)
    .filter((other) => other.teachingSkill === current.learningSkill)
    .map((other) => ({
      ...sanitizeStudent(other),
      isMutual: other.learningSkill === current.teachingSkill,
    }))
    .sort((a, b) => Number(b.isMutual) - Number(a.isMutual));

  return res.json({ matches, profileComplete: true });
});

export default router;
