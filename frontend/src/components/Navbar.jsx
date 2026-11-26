import React from "react";

export default function Navbar({ currentStudent, activePage, onNavigate, onLogout }) {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        LearnLoop <span className="nav-tag">Starter MVP</span>
      </div>

      {currentStudent && (
        <div className="nav-links">
          <button
            className={`nav-btn ${activePage === "matches" ? "active" : ""}`}
            onClick={() => onNavigate("matches")}
          >
            Matches
          </button>
          <button
            className={`nav-btn ${activePage === "profile" ? "active" : ""}`}
            onClick={() => onNavigate("profile")}
          >
            Profile Setup
          </button>

          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            Signed in as <strong>{currentStudent.name}</strong>
          </span>

          <button className="btn-signout" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
