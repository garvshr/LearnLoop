import { findStudentById } from "../data/store.js";

/**
 * Lightweight token auth for the starter MVP.
 * Expects `Authorization: Bearer <studentId>` (ready to swap for JWT later).
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const student = findStudentById(token);
  if (!student) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = student;
  next();
}
