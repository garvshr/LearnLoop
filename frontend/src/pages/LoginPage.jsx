import React, { useState } from "react";
import { apiRequest, setToken } from "../api/client.js";

// Pre-seeded demo student shortcuts for easy 1-click test filling
const DEMO_ACCOUNTS = [
  { label: "Aarav (Needs Profile Setup)", email: "aarav@learnloop.edu" },
  { label: "Priya (Teaches Python, Learns React)", email: "priya@learnloop.edu" },
  { label: "Sneha (Teaches React, Learns ML)", email: "sneha@learnloop.edu" },
];

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("aarav@learnloop.edu");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Save token in client storage
      setToken(data.token);
      onLoginSuccess(data.student);
    } catch (err) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
  };

  return (
    <div className="container" style={{ maxWidth: "480px" }}>
      <div className="card">
        <h1 className="card-title">Student Sign In</h1>
        <p className="card-subtitle">
          Sign in with your pre-created college account to start swapping skills.
        </p>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. aarav@learnloop.edu"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="demo-box">
          <div className="demo-title">Quick-Fill Demo Accounts</div>
          <div className="demo-grid">
            {DEMO_ACCOUNTS.map((acc) => (
              <div key={acc.email} className="demo-item">
                <span>{acc.label}</span>
                <button
                  type="button"
                  className="btn-chip"
                  onClick={() => handleQuickFill(acc.email)}
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
