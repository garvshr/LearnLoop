import React, { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";
import SkillSearchSelect from "../components/SkillSearchSelect.jsx";

export default function ProfileSetupPage({ currentStudent, onProfileSaved }) {
  const [name, setName] = useState(currentStudent?.name || "");
  const [branch, setBranch] = useState(currentStudent?.branch || "CSE");
  const [teachingSkills, setTeachingSkills] = useState(
    (currentStudent?.teachingSkills || []).map((s) => s.name)
  );
  const [learningSkills, setLearningSkills] = useState(
    currentStudent?.learningSkills || []
  );

  const [skillCatalog, setSkillCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Load searchable skill catalog & branches from backend metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        const meta = await apiRequest("/meta");
        setSkillCatalog(meta.skillCatalog || []);
        setCategories(meta.categories || []);
        setBranches(meta.branches || []);
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    }
    loadMeta();
  }, []);

  const addTeaching = (item) => {
    setError("");
    if (learningSkills.includes(item.name)) {
      setError(`"${item.name}" is already in your learning skills.`);
      return;
    }
    if (!teachingSkills.includes(item.name)) {
      setTeachingSkills((prev) => [...prev, item.name]);
    }
  };

  const removeTeaching = (skillName) => {
    setTeachingSkills((prev) => prev.filter((s) => s !== skillName));
  };

  const addLearning = (item) => {
    setError("");
    if (teachingSkills.includes(item.name)) {
      setError(`"${item.name}" is already in your teaching skills.`);
      return;
    }
    if (!learningSkills.includes(item.name)) {
      setLearningSkills((prev) => [...prev, item.name]);
    }
  };

  const removeLearning = (skillName) => {
    setLearningSkills((prev) => prev.filter((s) => s !== skillName));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (teachingSkills.length === 0 || learningSkills.length === 0) {
      setError("Please select at least one teaching skill and one learning skill.");
      return;
    }

    setSaving(true);
    try {
      const data = await apiRequest("/profile", {
        method: "PUT",
        body: JSON.stringify({
          name,
          branch,
          teachingSkills,
          learningSkills,
        }),
      });

      setSuccess("Profile saved successfully! Navigating to matches...");
      setTimeout(() => {
        onProfileSaved(data.student);
      }, 600);
    } catch (err) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: "700px" }}>
      <div className="card">
        <h1 className="card-title">Profile Setup</h1>
        <p className="card-subtitle">
          Select multiple skills you can teach and multiple skills you want to learn.
          You can add descriptions, experience, and proof in <strong>My Skills</strong>.
        </p>

        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row-2">
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
          </div>

          <div className="form-group">
            <label className="form-label">
              Skills I Can Teach ({teachingSkills.length} selected)
            </label>
            <div className="learning-chips" style={{ marginBottom: "0.6rem" }}>
              {teachingSkills.length === 0 ? (
                <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
                  Click skills below to add them.
                </span>
              ) : (
                teachingSkills.map((skName) => (
                  <span key={skName} className="badge badge-teach learning-chip">
                    {skName}
                    <button
                      type="button"
                      className="chip-remove"
                      style={{ color: "#0369a1" }}
                      onClick={() => removeTeaching(skName)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
            <SkillSearchSelect
              skills={skillCatalog}
              categories={categories}
              disabledSkills={[...teachingSkills, ...learningSkills]}
              placeholder="Search and click skills you can teach..."
              onSelect={addTeaching}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Skills I Want to Learn ({learningSkills.length} selected)
            </label>
            <div className="learning-chips" style={{ marginBottom: "0.6rem" }}>
              {learningSkills.length === 0 ? (
                <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
                  Click skills below to add them.
                </span>
              ) : (
                learningSkills.map((skName) => (
                  <span key={skName} className="badge badge-learn learning-chip">
                    {skName}
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => removeLearning(skName)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
            <SkillSearchSelect
              skills={skillCatalog}
              categories={categories}
              disabledSkills={[...learningSkills, ...teachingSkills]}
              placeholder="Search and click skills you want to learn..."
              onSelect={addLearning}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Profile & See Matches"}
          </button>
        </form>
      </div>
    </div>
  );
}
