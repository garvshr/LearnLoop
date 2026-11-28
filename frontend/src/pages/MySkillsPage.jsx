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
  proofs: [],
};

const PROOF_LABELS = {
  project_link: "Project Link",
  certificate: "Certificate",
  photo: "Photo",
  video: "Video",
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

  // Staged (not-yet-uploaded) file & project link input
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingProjectUrl, setPendingProjectUrl] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [switchPrompt, setSwitchPrompt] = useState(null); // { targetMode }
  const [deleteSkillPrompt, setDeleteSkillPrompt] = useState(null); // skill object
  const [unsavedUploads, setUnsavedUploads] = useState([]); // [{ url, publicId, resourceType }]

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
        setProficiencyLevels(
          data.proficiencyLevels || ["Beginner", "Intermediate", "Advanced"]
        );
      } catch (err) {
        setError(err.message || "Failed to load skill catalog");
      }
    }
    loadCatalog();
  }, []);

  const teachingSkills = currentStudent.teachingSkills || [];
  const learningSkills = currentStudent.learningSkills || [];

  const resetProofInputs = () => {
    setPendingFile(null);
    setPendingProjectUrl("");
    setFileInputKey((k) => k + 1);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    resetProofInputs();
    setSwitchPrompt(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleOpenEdit = (skill) => {
    setEditingId(skill.id);
    const existingProofs = Array.isArray(skill.proofs)
      ? skill.proofs
      : skill.proof
      ? [skill.proof]
      : [];

    setForm({
      name: skill.name,
      category: skill.category || "Programming & Web",
      proficiency: skill.proficiency || "Intermediate",
      description: skill.description || "",
      teachingExperience: skill.teachingExperience || "",
      resourceLinksText: (skill.resourceLinks || []).join("\n"),
      proofMode: "project_link",
      proofs: existingProofs,
    });
    resetProofInputs();
    setSwitchPrompt(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const uploadPendingFile = async () => {
    if (!pendingFile) return true;
    setUploading(true);
    setError("");
    try {
      const data = await uploadProofFile(pendingFile, form.proofMode);
      const uploadedProof = {
        id: `prf-${Date.now()}`,
        ...data.proof,
      };
      setForm((prev) => ({
        ...prev,
        proofs: [...prev.proofs, uploadedProof],
      }));
      setUnsavedUploads((prev) => [
        ...prev,
        {
          url: data.proof.url,
          publicId: data.proof.publicId,
          resourceType: data.proof.resourceType,
        },
      ]);
      setPendingFile(null);
      setFileInputKey((k) => k + 1);
      return true;
    } catch (err) {
      setError(err.message || "Failed to upload file");
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleAddProjectLink = () => {
    const trimmed = pendingProjectUrl.trim();
    if (!trimmed) return;
    setForm((prev) => ({
      ...prev,
      proofs: [
        ...prev.proofs,
        {
          id: `prf-${Date.now()}`,
          type: "project_link",
          url: trimmed,
          fileName: trimmed,
        },
      ],
    }));
    setPendingProjectUrl("");
  };

  const handleRemoveProof = async (indexToRemove) => {
    const target = form.proofs[indexToRemove];
    setForm((prev) => ({
      ...prev,
      proofs: prev.proofs.filter((_, idx) => idx !== indexToRemove),
    }));

    // If this file was uploaded in the current unsaved form session, delete from storage immediately
    const unsavedItem = unsavedUploads.find((u) => u.url === target?.url);
    if (unsavedItem) {
      setUnsavedUploads((prev) => prev.filter((u) => u.url !== target.url));
      apiRequest("/skills/upload-proof", {
        method: "DELETE",
        body: JSON.stringify(unsavedItem),
      }).catch(() => {});
    }
  };

  const handleTabClick = (targetMode) => {
    if (targetMode === form.proofMode) return;
    // If a file is chosen but not uploaded yet, ask user to Upload or Cancel
    if (pendingFile) {
      setSwitchPrompt({ targetMode });
      return;
    }
    setForm((prev) => ({ ...prev, proofMode: targetMode }));
  };

  const handlePromptUpload = async () => {
    const targetMode = switchPrompt?.targetMode;
    const ok = await uploadPendingFile();
    if (ok && targetMode) {
      setForm((prev) => ({ ...prev, proofMode: targetMode }));
    }
    setSwitchPrompt(null);
  };

  const handlePromptCancel = () => {
    const targetMode = switchPrompt?.targetMode;
    setPendingFile(null);
    setFileInputKey((k) => k + 1);
    if (targetMode) {
      setForm((prev) => ({ ...prev, proofMode: targetMode }));
    }
    setSwitchPrompt(null);
  };

  const handleSaveSkill = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please select a skill from the searchable list.");
      return;
    }

    if (pendingFile) {
      setError(
        `You selected "${pendingFile.name}" but haven't clicked Upload yet. Please upload or remove it first.`
      );
      return;
    }

    const resourceLinks = form.resourceLinksText
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: form.name,
      category: form.category,
      proficiency: form.proficiency,
      description: form.description,
      teachingExperience: form.teachingExperience,
      resourceLinks,
      proofs: form.proofs,
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
      setUnsavedUploads([]);
      resetProofInputs();
      setSuccess(editingId ? "Teaching skill updated!" : "Teaching skill added!");
    } catch (err) {
      setError(err.message || "Failed to save teaching skill");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelForm = () => {
    unsavedUploads.forEach((item) => {
      apiRequest("/skills/upload-proof", {
        method: "DELETE",
        body: JSON.stringify(item),
      }).catch(() => {});
    });
    setUnsavedUploads([]);
    setShowForm(false);
    setEditingId(null);
    resetProofInputs();
  };

  const handleConfirmDeleteSkill = async () => {
    if (!deleteSkillPrompt) return;
    setError("");
    setSuccess("");
    try {
      const data = await apiRequest(`/skills/teaching/${deleteSkillPrompt.id}`, {
        method: "DELETE",
      });
      onStudentUpdated(data.student);
      setSuccess(`Removed "${deleteSkillPrompt.name}" and all linked proofs.`);
    } catch (err) {
      setError(err.message || "Failed to delete skill");
    } finally {
      setDeleteSkillPrompt(null);
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

  const renderProofPreview = (proof, idx) => {
    if (!proof || !proof.url) return null;

    if (proof.type === "photo") {
      return (
        <div key={proof.id || idx} className="proof-box">
          <div className="proof-label">Photo: {proof.fileName}</div>
          <img src={proof.url} alt={proof.fileName} className="proof-media-img" />
        </div>
      );
    }

    if (proof.type === "video") {
      return (
        <div key={proof.id || idx} className="proof-box">
          <div className="proof-label">Video: {proof.fileName}</div>
          <video src={proof.url} controls className="proof-media-video" />
        </div>
      );
    }

    const label = PROOF_LABELS[proof.type] || "Proof";
    return (
      <div key={proof.id || idx} className="proof-box">
        <span className="proof-label">{label}: </span>
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

      {/* Un-uploaded file confirmation popup */}
      {switchPrompt && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ marginBottom: "0.5rem" }}>Un-uploaded File Selected</h3>
            <p style={{ fontSize: "0.92rem", color: "#475569", marginBottom: "1.25rem" }}>
              You chose <strong>{pendingFile?.name}</strong> under{" "}
              <strong>{PROOF_LABELS[form.proofMode]}</strong>, but haven't uploaded it yet.
              Would you like to upload it before switching?
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handlePromptCancel}
                disabled={uploading}
              >
                Cancel (Discard File)
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ width: "auto", padding: "0.6rem 1.2rem" }}
                onClick={handlePromptUpload}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete skill confirmation popup */}
      {deleteSkillPrompt && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ marginBottom: "0.5rem" }}>Delete Teaching Skill?</h3>
            <p style={{ fontSize: "0.92rem", color: "#475569", marginBottom: "1.25rem" }}>
              Are you sure you want to delete <strong>{deleteSkillPrompt.name}</strong>?
              This will also permanently delete all linked proof files from storage.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteSkillPrompt(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-signout"
                style={{ padding: "0.6rem 1.2rem", fontSize: "0.92rem" }}
                onClick={handleConfirmDeleteSkill}
              >
                Delete Skill
              </button>
            </div>
          </div>
        </div>
      )}

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

            {/* Proof of Expertise (supports adding multiple proofs) */}
            <div className="form-group">
              <label className="form-label">
                Proof of Expertise (Add Project Link, Certificate, Photo, and/or Video)
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
                    onClick={() => handleTabClick(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {form.proofMode === "project_link" ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="url"
                    className="form-input"
                    value={pendingProjectUrl}
                    onChange={(e) => setPendingProjectUrl(e.target.value)}
                    placeholder="https://github.com/username/project"
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: "auto", padding: "0 1.1rem", whiteSpace: "nowrap" }}
                    onClick={handleAddProjectLink}
                    disabled={!pendingProjectUrl.trim()}
                  >
                    Add Link
                  </button>
                </div>
              ) : (
                <div className="upload-box">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <input
                      key={fileInputKey}
                      type="file"
                      accept={
                        form.proofMode === "certificate"
                          ? ".pdf,.doc,.docx,image/*"
                          : form.proofMode === "photo"
                          ? "image/*"
                          : "video/*"
                      }
                      onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: "auto", padding: "0.45rem 1rem", fontSize: "0.85rem" }}
                      onClick={uploadPendingFile}
                      disabled={!pendingFile || uploading}
                    >
                      {uploading ? "Uploading..." : "Upload"}
                    </button>
                  </div>
                  {pendingFile && (
                    <div style={{ marginTop: "0.45rem", fontSize: "0.82rem", color: "#b45309" }}>
                      Selected: <strong>{pendingFile.name}</strong> — click <strong>Upload</strong> to attach.
                    </div>
                  )}
                </div>
              )}

              {/* List of all proofs attached to this skill */}
              {form.proofs.length > 0 && (
                <div className="attached-proofs-list">
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                    Attached Proofs ({form.proofs.length})
                  </div>
                  {form.proofs.map((p, idx) => (
                    <div key={p.id || idx} className="attached-proof-item">
                      <span>
                        <span className="badge badge-teach" style={{ marginRight: "0.45rem" }}>
                          {PROOF_LABELS[p.type] || p.type}
                        </span>
                        <a href={p.url} target="_blank" rel="noreferrer" className="proof-link">
                          {p.fileName || p.url}
                        </a>
                      </span>
                      <button
                        type="button"
                        className="chip-remove"
                        style={{ color: "#991b1b" }}
                        onClick={() => handleRemoveProof(idx)}
                        title="Remove proof"
                      >
                        ×
                      </button>
                    </div>
                  ))}
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
                onClick={handleCancelForm}
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
            {teachingSkills.map((skill) => {
              const allProofs = Array.isArray(skill.proofs)
                ? skill.proofs
                : skill.proof
                ? [skill.proof]
                : [];

              return (
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
                        onClick={() => setDeleteSkillPrompt(skill)}
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

                  {allProofs.length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
                        Proofs of Expertise ({allProofs.length}):
                      </div>
                      {allProofs.map((p, idx) => renderProofPreview(p, idx))}
                    </div>
                  )}
                </div>
              );
            })}
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
