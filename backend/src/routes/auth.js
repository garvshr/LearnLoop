import { Router } from "express";
import { findStudentByEmail, sanitizeStudent } from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email = "", password = "" } = req.body || {};

  if (!email.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const student = findStudentByEmail(email);
  if (!student || student.password !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  return res.json({
    token: student.id,
    student: sanitizeStudent(student),
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  return res.json({ student: sanitizeStudent(req.user) });
});

export default router;
