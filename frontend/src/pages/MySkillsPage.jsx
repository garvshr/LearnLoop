import React, { useEffect, useState } from "react";
import { apiRequest, uploadProofFile } from "../api/client.js";
import SkillSearchSelect from "../components/SkillSearchSelect.jsx";

const EMPTY_FORM = {
  name: "",
  category: "Programming & Web",
  proficiency: "Intermediate",
  description: "",
  teachingExperience: "",
  resourceLinksText: "",
  proofMode: "project_link", // 'project_link' | 'certificate' | 'photo' | 'video'
  proofUrl: "",
  proofFileName: "",
};

export default function MySkillsPage({ currentStudent, onStudentUpdated }) {
  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [proficiencyLevels, setProficiencyLevels] = useState([
    "Beginner",
    "Intermediate",
    "Advanced",
  ]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadCatalog() {
      try {
        const data = await apiRequest("/skills/catalog");
        setCatalog(data.skills || []);
        setCategories(data.categories || []);
        setProficiencyLevels(data.proficiencyLevels || ["Beginner", "Intermediate", "Advanced"]);
      } catch (err) {
        setError(err.message || "Failed to load skill catalog");
      }
    }
    loadCatalog();
  }, []);

  const teachingSkills = currentStudent.teachingSkills || [];
  const learningSkills = currentStudent.learningSkills || [];

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleOpenEdit = (skill) => {
    setEditingId(skill.id);
    setForm({
      name: skill.name,
      category: skill.category || "Programming & Web",
      proficiency: skill.proficiency || "Intermediate",
      description: skill.description || "",
      teachingExperience: skill.teachingExperience || "",
      resourceLinksText: (skill.resourceLinks || []).join("\n"),
      proofMode: skill.proof?.type || "project_link",
      proofUrl: skill.proof?.url || "",
      proofFileName: skill.proof?.fileName || "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const data = await uploadProofFile(file, form.proofMode);
      setForm((prev) => ({
        ...prev,
        proofUrl: data.proof.url,
        proofFileName: data.proof.fileName,
      }));
    } catch (err) {
      setError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSkill = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please select a skill from the searchable list.");
      return;
    }

    const resourceLinks = form.resourceLinksText
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    const proof = form.proofUrl.trim()
      ? {
          type: form.proofMode,
          url: form.proofUrl.trim(),
          fileName:
            form.proofFileName ||
            (form.proofMode === "project_link" ? "Project / Portfolio Link" : "Uploaded Proof"),
        }
      : null;

    const payload = {
      name: form.name,
      category: form.category,
      proficiency: form.proficiency,
      description: form.description,
      teachingExperience: form.teachingExperience,
      resourceLinks,
      proof,
    };

    setSaving(true);
    try {
      const data = editingId
        ? await apiRequest(`/skills/teaching/${editingId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await apiRequest("/skills/teaching", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      onStudentUpdated(data.student);
      setShowForm(false);
      setEditingId(null);
      setSuccess(editingId ? "Teaching skill updated!" : "Teaching skill added!");
    } catch (err) {
      setError(err.message || "Failed to save teaching skill");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (skillId) => {
    setError("");
    setSuccess("");
    try {
      const data = await apiRequest(`/skills/teaching/${skillId}`, {
        method: "DELETE",
      });
      onStudentUpdated(data.student);
      setSuccess("Teaching skill removed.");
    } catch (err) {
      setError(err.message || "Failed to delete skill");
    }
  };

  const handleAddLearningSkill = async (skillItem) => {
    if (learningSkills.some((s) => s.toLowerCase() === skillItem.name.toLowerCase())) {
      return;
    }
    setError("");
    try {
      const data = await apiRequest("/skills/learning", {
        method: "PUT",
        body: JSON.stringify({
          learningSkills: [...learningSkills, skillItem.name],
        }),
      });
      onStudentUpdated(data.student);
    } catch (err) {
      setError(err.message || "Failed to add learning skill");
    }
  };

  const handleRemoveLearningSkill = async (skillName) => {
    setError("");
    try {
      const data = await apiRequest("/skills/learning", {
        method: "PUT",
        body: JSON.stringify({
          learningSkills: learningSkills.filter((s) => s !== skillName),
        }),
      });
      onStudentUpdated(data.student);
    } catch (err) {
      setError(err.message || "Failed to remove learning skill");
    }
  };

  const renderProofPreview = (proof) => {
    if (!proof || !proof.url) return null;

    if (proof.type === "photo") {
      return (
        <div className="proof-box">
          <div className="proof-label">Proof (Photo): {proof.fileName}</div>
          <img src={proof.url} alt={proof.fileName} className="proof-media-img" />
        </div>
      );
    }

    if (proof.type === "video") {
      return (
        <div className="proof-box">
          <div className="proof-label">Proof (Video): {proof.fileName}</div>
          <video src={proof.url} controls className="proof-media-video" />
        </div>
      );
    }

    const label =
      proof.type === "certificate" ? "Certificate" : "Project / Portfolio";

    return (
      <div className="proof-box">
        <span className="proof-label">Proof ({label}): </span>
        <a
          href={proof.url}
          target="_blank"
          rel="noreferrer"
          className="proof-link"
        >
          {proof.fileName || proof.url} ↗
        </a>
      </div>
    );
  };

  return (
    <div className="container">
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {/* TEACHING SKILLS SECTION */}
      <div className="card">
        <div className="section-header">
          <div>
            <h1 className="card-title">Skills I Can Teach</h1>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Add your skills with proficiency, experience, resources, and proof of expertise.
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              className="btn-primary"
              style={{ width: "auto", padding: "0.6rem 1.1rem" }}
              onClick={handleOpenAdd}
            >
              + Add Teaching Skill
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSaveSkill} className="skill-form-box">
            <h3 style={{ marginBottom: "1rem" }}>
              {editingId ? `Edit "${form.name}"` : "Add New Teaching Skill"}
            </h3>

            {!editingId && (
              <div className="form-group">
                <label className="form-label">
                  1. Search & Select Skill ({catalog.length} available)
                </label>
                <SkillSearchSelect
                  skills={catalog}
                  categories={categories}
                  selectedSkill={form.name}
                  disabledSkills={teachingSkills.map((s) => s.name)}
                  onSelect={(item) =>
                    setForm((prev) => ({
                      ...prev,
                      name: item.name,
                      category: item.category,
                    }))
                  }
                />
                {form.name && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
                    Selected: <span className="badge badge-teach">{form.name}</span>
                  </div>
                )}
              </div>
            )}

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Proficiency Level</label>
                <select
                  className="form-select"
                  value={form.proficiency}
                  onChange={(e) => setForm({ ...form, proficiency: e.target.value })}
                >
                  {proficiencyLevels.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What topics will you cover and how do you teach?"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Teaching Experience</label>
              <input
                type="text"
                className="form-input"
                value={form.teachingExperience}
                onChange={(e) =>
                  setForm({ ...form, teachingExperience: e.target.value })
                }
                placeholder="e.g. Mentored 5 juniors, hosted 2 workshops, 1 year freelancing"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Supporting Resources / Portfolio Links (one per line)
              </label>
              <textarea
                className="form-input"
                rows={2}
                value={form.resourceLinksText}
                onChange={(e) =>
                  setForm({ ...form, resourceLinksText: e.target.value })
                }
                placeholder="https://github.com/your-repo&#10;https://your-portfolio.com"
              />
            </div>

            {/* Proof of Expertise */}
            <div className="form-group">
              <label className="form-label">
                Proof of Expertise (Certificate, Project Link, Photo, or Video)
              </label>
              <div className="proof-tabs">
                {[
                  { id: "project_link", label: "Project Link" },
                  { id: "certificate", label: "Upload Certificate" },
                  { id: "photo", label: "Upload Photo" },
                  { id: "video", label: "Upload Video" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`btn-chip ${
                      form.proofMode === tab.id ? "active-chip" : ""
                    }`}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        proofMode: tab.id,
                        proofUrl: "",
                        proofFileName: "",
                      }))
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {form.proofMode === "project_link" ? (
                <input
                  type="url"
                  className="form-input"
                  value={form.proofUrl}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      proofUrl: e.target.value,
                      proofFileName: "Project / Portfolio Link",
                    })
                  }
                  placeholder="https://github.com/username/project"
                />
              ) : (
                <div className="upload-box">
                  <input
                    type="file"
                    accept={
                      form.proofMode === "certificate"
                        ? ".pdf,image/*"
                        : form.proofMode === "photo"
                        ? "image/*"
                        : "video/*"
                    }
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  {uploading && (
                    <span style={{ fontSize: "0.85rem", color: "#4f46e5" }}>
                      Uploading file...
                    </span>
                  )}
                  {form.proofUrl && !uploading && (
                    <div style={{ marginTop: "0.4rem", fontSize: "0.85rem", color: "#15803d" }}>
                      Uploaded: <strong>{form.proofFileName}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ width: "auto", padding: "0.65rem 1.4rem" }}
                disabled={saving || uploading}
              >
                {saving ? "Saving..." : editingId ? "Update Skill" : "Save Skill"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Teaching Skills List */}
        {teachingSkills.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem 1rem" }}>
            No teaching skills added yet. Click <strong>+ Add Teaching Skill</strong> to get started.
          </div>
        ) : (
          <div className="skills-list">
            {teachingSkills.map((skill) => (
              <div key={skill.id} className="skill-detail-card">
                <div className="skill-detail-top">
                  <div>
                    <div className="skill-detail-title">
                      {skill.name}
                      <span className="badge badge-teach">{skill.category}</span>
                      <span className={`badge badge-prof-${skill.proficiency.toLowerCase()}`}>
                        {skill.proficiency}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn-chip"
                      onClick={() => handleOpenEdit(skill)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-signout"
                      onClick={() => handleDeleteSkill(skill.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {skill.description && (
                  <p className="skill-detail-text">{skill.description}</p>
                )}

                {skill.teachingExperience && (
                  <p className="skill-detail-meta">
                    <strong>Teaching Experience:</strong> {skill.teachingExperience}
                  </p>
                )}

                {skill.resourceLinks?.length > 0 && (
                  <div className="skill-detail-meta">
                    <strong>Resources:</strong>{" "}
                    {skill.resourceLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="proof-link"
                        style={{ marginRight: "0.75rem" }}
                      >
                        {link} ↗
                      </a>
                    ))}
                  </div>
                )}

                {renderProofPreview(skill.proof)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LEARNING SKILLS SECTION */}
      <div className="card">
        <h2 className="card-title">Skills I Want to Learn</h2>
        <p className="card-subtitle">
          Search from {catalog.length} skills and add what you want to learn. Matches update automatically!
        </p>

        <div className="learning-chips" style={{ marginBottom: "1.25rem" }}>
          {learningSkills.length === 0 ? (
            <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
              No learning skills selected yet.
            </span>
          ) : (
            learningSkills.map((skName) => (
              <span key={skName} className="badge badge-learn learning-chip">
                {skName}
                <button
                  type="button"
                  className="chip-remove"
                  onClick={() => handleRemoveLearningSkill(skName)}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>

        <SkillSearchSelect
          skills={catalog}
          categories={categories}
          disabledSkills={learningSkills}
          placeholder="Search skills to add to your learning list..."
          onSelect={handleAddLearningSkill}
        />
      </div>
    </div>
  );
}
