import React, { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";

export default function MatchesPage({ currentStudent, onEditProfile, onManageSkills }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMatches() {
      try {
        setLoading(true);
        const data = await apiRequest("/matches");
        setMatches(data.matches || []);
      } catch (err) {
        setError(err.message || "Failed to load matches");
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, []);

  const teachingList = currentStudent.teachingSkills || [];
  const learningList = currentStudent.learningSkills || [];

  return (
    <div className="container">
      {/* Current Student Swap Summary Banner */}
      <div className="summary-banner">
        <div>
          <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>
            YOUR CURRENT SKILL SWAP
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
            {teachingList.length > 0 ? (
              teachingList.map((sk) => (
                <span key={sk.id} className="badge badge-teach">
                  Teach: <strong>{sk.name}</strong> ({sk.proficiency})
                </span>
              ))
            ) : (
              <span className="badge badge-teach">Teaching: None</span>
            )}
            {learningList.length > 0 ? (
              learningList.map((skName) => (
                <span key={skName} className="badge badge-learn">
                  Learn: <strong>{skName}</strong>
                </span>
              ))
            ) : (
              <span className="badge badge-learn">Want to Learn: None</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn-chip"
            style={{ padding: "0.5rem 0.9rem", fontSize: "0.9rem" }}
            onClick={onManageSkills}
          >
            Manage Skills
          </button>
          <button
            type="button"
            className="btn-chip"
            style={{ padding: "0.5rem 0.9rem", fontSize: "0.9rem" }}
            onClick={onEditProfile}
          >
            Edit Profile
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Recommended Skill Matches</h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
          Students who teach what you want to learn. Green cards are <strong>Mutual Matches</strong> where you can teach each other!
        </p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <div className="empty-state">Finding best student matches...</div>
      ) : matches.length === 0 ? (
        <div className="card empty-state">
          <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "#334155" }}>
            No matches found right now.
          </p>
          <p style={{ color: "#64748b", marginTop: "0.5rem" }}>
            Try adding more learning skills in <strong>My Skills</strong> to discover more student peers.
          </p>
        </div>
      ) : (
        <div className="matches-grid">
          {matches.map((student) => (
            <div
              key={student.id}
              className={`match-card ${student.isMutual ? "mutual" : ""}`}
            >
              {student.isMutual && (
                <div className="mutual-badge">
                  Mutual Match (Perfect Swap!)
                </div>
              )}

              <div>
                <div className="student-name">{student.name}</div>
                <div className="student-branch">
                  {student.branch} Department • {student.email}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem" }}>
                <div style={{ marginBottom: "0.5rem" }}>
                  <div style={{ color: "#0369a1", fontWeight: 600, fontSize: "0.82rem", marginBottom: "0.25rem" }}>
                    Teaches:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {(student.teachingSkills || []).map((sk) => {
                      const proofs = Array.isArray(sk.proofs)
                        ? sk.proofs
                        : sk.proof
                        ? [sk.proof]
                        : [];
                      const proofNames = [
                        ...new Set(
                          proofs.map((p) =>
                            p.type === "project_link"
                              ? "Project Link"
                              : p.type === "certificate"
                              ? "Certificate"
                              : p.type === "photo"
                              ? "Photo"
                              : "Video"
                          )
                        ),
                      ];

                      return (
                        <span key={sk.id} className="badge badge-teach">
                          {sk.name} • {sk.proficiency}
                          {proofNames.length > 0 ? ` ✓ (${proofNames.join(", ")})` : ""}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#b45309", fontWeight: 600, fontSize: "0.82rem", marginBottom: "0.25rem" }}>
                    Wants to Learn:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {(student.learningSkills || []).map((skName) => (
                      <span key={skName} className="badge badge-learn">
                        {skName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
