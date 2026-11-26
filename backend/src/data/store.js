import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_STUDENTS } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "db.json");

/**
 * Simple JSON-file backed store for the starter MVP.
 * Teammates can replace this with MongoDB / PostgreSQL later without changing route contracts.
 */
function loadStudents() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(SEED_STUDENTS, null, 2));
    return structuredClone(SEED_STUDENTS);
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function saveStudents(students) {
  fs.writeFileSync(DB_PATH, JSON.stringify(students, null, 2));
}

export function getAllStudents() {
  return loadStudents();
}

export function findStudentByEmail(email) {
  const normalized = email.trim().toLowerCase();
  return loadStudents().find((s) => s.email.toLowerCase() === normalized) || null;
}

export function findStudentById(id) {
  return loadStudents().find((s) => s.id === id) || null;
}

export function updateStudentProfile(id, updates) {
  const students = loadStudents();
  const index = students.findIndex((s) => s.id === id);
  if (index === -1) return null;

  students[index] = {
    ...students[index],
    name: updates.name,
    branch: updates.branch,
    teachingSkill: updates.teachingSkill,
    learningSkill: updates.learningSkill,
  };
  saveStudents(students);
  return students[index];
}

export function sanitizeStudent(student) {
  const { password: _, ...safe } = student;
  return safe;
}
