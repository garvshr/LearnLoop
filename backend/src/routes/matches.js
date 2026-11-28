import { Router } from "express";
import { getAllStudents, sanitizeStudent } from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/matches
 * Returns students who teach at least one skill the signed-in student wants to learn.
 * Highlights mutual matches where both students can teach at least one skill
 * the other wants to learn, sorted with mutual matches first.
 */
router.get("/", requireAuth, (req, res) => {
  const current = sanitizeStudent(req.user);

  if (current.learningSkills.length === 0 || current.teachingSkills.length === 0) {
    return res.json({ matches: [], profileComplete: false });
  }

  const currentLearningSet = new Set(
    current.learningSkills.map((s) => s.toLowerCase())
  );
  const currentTeachingSet = new Set(
    current.teachingSkills.map((s) => s.name.toLowerCase())
  );

  const matches = getAllStudents()
    .filter((other) => other.id !== current.id)
    .map((other) => {
      const safeOther = sanitizeStudent(other);

      // Skills the other student teaches that current user wants to learn
      const matchedTeachingSkills = safeOther.teachingSkills.filter((sk) =>
        currentLearningSet.has(sk.name.toLowerCase())
      );

      if (matchedTeachingSkills.length === 0) {
        return null;
      }

      // Skills current user teaches that the other student wants to learn
      const reverseMatchedSkills = safeOther.learningSkills.filter((skName) =>
        currentTeachingSet.has(skName.toLowerCase())
      );

      return {
        ...safeOther,
        matchedSkills: matchedTeachingSkills.map((s) => s.name),
        isMutual: reverseMatchedSkills.length > 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.isMutual) - Number(a.isMutual));

  return res.json({ matches, profileComplete: true });
});

export default router;
