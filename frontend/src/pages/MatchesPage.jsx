import React, { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";

export default function MatchesPage({ currentStudent, onEditProfile }) {
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

  return (
    <div className="container">
      {/* Current Student Swap Summary Banner */}
      <div className="summary-banner">
        <div>
          <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>
            YOUR CURRENT SKILL SWAP
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
            <span className="badge badge-teach">
              Teaching: <strong>{currentStudent.teachingSkill || "None selected"}</strong>
            </span>
            <span className="badge badge-learn">
              Want to Learn: <strong>{currentStudent.learningSkill || "None selected"}</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn-chip"
          style={{ padding: "0.5rem 0.9rem", fontSize: "0.9rem" }}
          onClick={onEditProfile}
        >
          ✏️ Edit Profile
        </button>
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
            Try updating your learning skill in Profile Setup to discover more student peers.
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
                  ✨ Mutual Match (Perfect Swap!)
                </div>
              )}

              <div>
                <div className="student-name">{student.name}</div>
                <div className="student-branch">
                  {student.branch} Department • {student.email}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem" }}>
                <div className="skill-row" style={{ marginBottom: "0.35rem" }}>
                  <span style={{ color: "#0369a1", fontWeight: 600, fontSize: "0.85rem" }}>
                    Teaches:
                  </span>
                  <span className="badge badge-teach">{student.teachingSkill}</span>
                </div>

                <div className="skill-row">
                  <span style={{ color: "#b45309", fontWeight: 600, fontSize: "0.85rem" }}>
                    Learns:
                  </span>
                  <span className="badge badge-learn">{student.learningSkill}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
