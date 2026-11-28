import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_STUDENTS, SKILL_CATALOG } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "db.json");

function findCategoryForSkill(skillName) {
  const match = SKILL_CATALOG.find(
    (item) => item.name.toLowerCase() === String(skillName || "").toLowerCase()
  );
  return match ? match.category : "Academics & Other";
}

/**
 * Ensures older student records (from the initial single-skill MVP)
 * seamlessly work with the new teachingSkills[] / learningSkills[] structure.
 */
function normalizeStudent(student) {
  let teachingSkills = Array.isArray(student.teachingSkills)
    ? student.teachingSkills
    : [];

  if (teachingSkills.length === 0 && student.teachingSkill) {
    teachingSkills = [
      {
        id: `sk-${student.id}-1`,
        name: student.teachingSkill,
        category: findCategoryForSkill(student.teachingSkill),
        proficiency: "Intermediate",
        description: "",
        teachingExperience: "",
        resourceLinks: [],
        proof: null,
      },
    ];
  }

  let learningSkills = Array.isArray(student.learningSkills)
    ? student.learningSkills
    : [];

  if (learningSkills.length === 0 && student.learningSkill) {
    learningSkills = [student.learningSkill];
  }

  return {
    ...student,
    teachingSkills,
    learningSkills,
    // Keep convenience fields synced with first entry for backward compatibility
    teachingSkill: teachingSkills[0]?.name || "",
    learningSkill: learningSkills[0] || "",
  };
}

/**
 * Simple JSON-file backed store for the starter MVP.
 * Teammates can replace this with MongoDB / PostgreSQL later without changing route contracts.
 */
function loadStudents() {
  if (!fs.existsSync(DB_PATH)) {
    const seeded = SEED_STUDENTS.map(normalizeStudent);
    fs.writeFileSync(DB_PATH, JSON.stringify(seeded, null, 2));
    return seeded;
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw).map(normalizeStudent);
}

function saveStudents(students) {
  fs.writeFileSync(
    DB_PATH,
    JSON.stringify(students.map(normalizeStudent), null, 2)
  );
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

  const existing = students[index];
  let teachingSkills = existing.teachingSkills;
  let learningSkills = existing.learningSkills;

  // Support multi-skill array from Profile Setup while preserving existing skill details
  if (Array.isArray(updates.teachingSkills)) {
    const existingByName = new Map(
      existing.teachingSkills.map((sk) => [sk.name.toLowerCase(), sk])
    );
    teachingSkills = updates.teachingSkills.map((skillName, idx) => {
      const found = existingByName.get(skillName.toLowerCase());
      if (found) return found;
      return {
        id: `sk-${Date.now()}-${idx}`,
        name: skillName,
        category: findCategoryForSkill(skillName),
        proficiency: "Intermediate",
        description: "",
        teachingExperience: "",
        resourceLinks: [],
        proof: null,
      };
    });
  } else if (updates.teachingSkill) {
    const alreadyHas = teachingSkills.some(
      (sk) => sk.name.toLowerCase() === updates.teachingSkill.toLowerCase()
    );
    if (!alreadyHas) {
      teachingSkills = [
        {
          id: `sk-${Date.now()}`,
          name: updates.teachingSkill,
          category: findCategoryForSkill(updates.teachingSkill),
          proficiency: "Intermediate",
          description: "",
          teachingExperience: "",
          resourceLinks: [],
          proof: null,
        },
        ...teachingSkills,
      ];
    }
  }

  if (Array.isArray(updates.learningSkills)) {
    learningSkills = [...new Set(updates.learningSkills.map((s) => s.trim()).filter(Boolean))];
  } else if (updates.learningSkill) {
    const alreadyWants = learningSkills.some(
      (sk) => sk.toLowerCase() === updates.learningSkill.toLowerCase()
    );
    if (!alreadyWants) {
      learningSkills = [updates.learningSkill, ...learningSkills];
    }
  }

  students[index] = normalizeStudent({
    ...existing,
    name: updates.name ?? existing.name,
    branch: updates.branch ?? existing.branch,
    teachingSkills,
    learningSkills,
  });

  saveStudents(students);
  return students[index];
}

export function addTeachingSkill(studentId, skillData) {
  const students = loadStudents();
  const index = students.findIndex((s) => s.id === studentId);
  if (index === -1) return null;

  const newSkill = {
    id: `sk-${Date.now()}`,
    name: skillData.name,
    category: skillData.category || findCategoryForSkill(skillData.name),
    proficiency: skillData.proficiency || "Intermediate",
    description: skillData.description || "",
    teachingExperience: skillData.teachingExperience || "",
    resourceLinks: Array.isArray(skillData.resourceLinks)
      ? skillData.resourceLinks
      : [],
    proof: skillData.proof || null,
  };

  students[index] = normalizeStudent({
    ...students[index],
    teachingSkills: [...students[index].teachingSkills, newSkill],
  });

  saveStudents(students);
  return { student: students[index], skill: newSkill };
}

export function updateTeachingSkill(studentId, skillId, updates) {
  const students = loadStudents();
  const index = students.findIndex((s) => s.id === studentId);
  if (index === -1) return null;

  const currentSkills = students[index].teachingSkills;
  const skillIndex = currentSkills.findIndex((sk) => sk.id === skillId);
  if (skillIndex === -1) return null;

  const updatedSkill = {
    ...currentSkills[skillIndex],
    ...updates,
    id: skillId,
  };

  const nextSkills = [...currentSkills];
  nextSkills[skillIndex] = updatedSkill;

  students[index] = normalizeStudent({
    ...students[index],
    teachingSkills: nextSkills,
  });

  saveStudents(students);
  return { student: students[index], skill: updatedSkill };
}

export function removeTeachingSkill(studentId, skillId) {
  const students = loadStudents();
  const index = students.findIndex((s) => s.id === studentId);
  if (index === -1) return null;

  students[index] = normalizeStudent({
    ...students[index],
    teachingSkills: students[index].teachingSkills.filter(
      (sk) => sk.id !== skillId
    ),
  });

  saveStudents(students);
  return students[index];
}

export function setLearningSkills(studentId, learningSkills) {
  const students = loadStudents();
  const index = students.findIndex((s) => s.id === studentId);
  if (index === -1) return null;

  const uniqueSkills = [...new Set(learningSkills.map((s) => s.trim()).filter(Boolean))];

  students[index] = normalizeStudent({
    ...students[index],
    learningSkills: uniqueSkills,
  });

  saveStudents(students);
  return students[index];
}

export function sanitizeStudent(student) {
  const { password: _, ...safe } = normalizeStudent(student);
  return safe;
}
