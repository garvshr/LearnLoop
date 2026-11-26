import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProfileSetupPage from "./pages/ProfileSetupPage.jsx";
import MatchesPage from "./pages/MatchesPage.jsx";
import { apiRequest, getToken, setToken } from "./api/client.js";

export default function App() {
  const [currentStudent, setCurrentStudent] = useState(null);
  const [activePage, setActivePage] = useState("matches"); // 'matches' | 'profile'
  const [initializing, setInitializing] = useState(true);

  // Restore session on initial load if token exists
  useEffect(() => {
    async function restoreSession() {
      const token = getToken();
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        const data = await apiRequest("/auth/me");
        setCurrentStudent(data.student);
        // If profile is incomplete, direct to profile setup
        if (!data.student.teachingSkill || !data.student.learningSkill) {
          setActivePage("profile");
        } else {
          setActivePage("matches");
        }
      } catch (err) {
        console.warn("Session restore failed", err);
        setToken(null);
      } finally {
        setInitializing(false);
      }
    }
    restoreSession();
  }, []);

  const handleLoginSuccess = (student) => {
    setCurrentStudent(student);
    if (!student.teachingSkill || !student.learningSkill) {
      setActivePage("profile");
    } else {
      setActivePage("matches");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentStudent(null);
  };

  const handleProfileSaved = (updatedStudent) => {
    setCurrentStudent(updatedStudent);
    setActivePage("matches");
  };

  if (initializing) {
    return (
      <div style={{ textAlign: "center", marginTop: "4rem", color: "#64748b" }}>
        Loading LearnLoop...
      </div>
    );
  }

  // Not logged in -> Show Login Page
  if (!currentStudent) {
    return (
      <div>
        <Navbar currentStudent={null} />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Logged in -> Show App Header and requested page
  return (
    <div>
      <Navbar
        currentStudent={currentStudent}
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
      />

      {activePage === "profile" ? (
        <ProfileSetupPage
          currentStudent={currentStudent}
          onProfileSaved={handleProfileSaved}
        />
      ) : (
        <MatchesPage
          currentStudent={currentStudent}
          onEditProfile={() => setActivePage("profile")}
        />
      )}
    </div>
  );
}
