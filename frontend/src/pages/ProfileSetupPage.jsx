import React, { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";

export default function ProfileSetupPage({ currentStudent, onProfileSaved }) {
  const [name, setName] = useState(currentStudent?.name || "");
  const [branch, setBranch] = useState(currentStudent?.branch || "CSE");
  const [teachingSkill, setTeachingSkill] = useState(currentStudent?.teachingSkill || "");
  const [learningSkill, setLearningSkill] = useState(currentStudent?.learningSkill || "");

  const [availableSkills, setAvailableSkills] = useState([]);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Load available skills & branches from backend metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        const meta = await apiRequest("/meta");
        setAvailableSkills(meta.skills || []);
        setBranches(meta.branches || []);

        if (!teachingSkill && meta.skills.length > 0) {
          setTeachingSkill(meta.skills[0]);
        }
        if (!learningSkill && meta.skills.length > 1) {
          setLearningSkill(meta.skills[1]);
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    }
    loadMeta();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (teachingSkill === learningSkill) {
      setError("The skill you can teach and skill you want to learn must be different.");
      return;
    }

    setSaving(true);
    try {
      const data = await apiRequest("/profile", {
        method: "PUT",
        body: JSON.stringify({
          name,
          branch,
          teachingSkill,
          learningSkill,
        }),
      });

      setSuccess("Profile saved successfully! Navigating to matches...");
      setTimeout(() => {
        onProfileSaved(data.student);
      }, 700);
    } catch (err) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: "560px" }}>
      <div className="card">
        <h1 className="card-title">Profile Setup</h1>
        <p className="card-subtitle">
          Tell us your branch and what you want to swap.
        </p>

        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Branch / Department</label>
            <select
              className="form-select"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              required
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Skill I Can Teach</label>
            <select
              className="form-select"
              value={teachingSkill}
              onChange={(e) => setTeachingSkill(e.target.value)}
              required
            >
              {availableSkills.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Skill I Want to Learn</label>
            <select
              className="form-select"
              value={learningSkill}
              onChange={(e) => setLearningSkill(e.target.value)}
              required
            >
              {availableSkills.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Profile & See Matches"}
          </button>
        </form>
      </div>
    </div>
  );
}
