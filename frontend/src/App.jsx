import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import ChatWindow from "./components/Chat/ChatWindow";
import CheckInForm from "./components/CheckIn/CheckInForm";
import TherapistDashboard from "./components/TherapistDashboard/Dashboard";
import "./App.css";

// Demo client/therapist IDs — in production these come from auth
const CLIENT_ID = "client-001";
const THERAPIST_CLIENT_ID = "client-001"; // therapist views this client

function NavBar() {
  const { pathname } = useLocation();
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span className="nav-logo">B</span>
        <span className="nav-name">BridgeNote</span>
      </div>
      <div className="nav-links">
        <Link to="/" className={pathname === "/" ? "active" : ""}>Check-in</Link>
        <Link to="/chat" className={pathname === "/chat" ? "active" : ""}>Chat</Link>
        <Link to="/therapist" className={pathname === "/therapist" ? "active" : ""}>Therapist View</Link>
      </div>
    </nav>
  );
}

export default function App() {
  const [checkinDone, setCheckinDone] = useState(false);

  return (
    <BrowserRouter>
      <div className="app">
        <NavBar />
        <main className="app-main">
          <Routes>
            <Route
              path="/"
              element={
                checkinDone ? (
                  <div className="page-center">
                    <CheckInForm clientId={CLIENT_ID} key="done" onComplete={() => {}} />
                    <button className="btn-link" onClick={() => setCheckinDone(false)}>
                      New check-in
                    </button>
                  </div>
                ) : (
                  <div className="page-center">
                    <CheckInForm clientId={CLIENT_ID} onComplete={() => setCheckinDone(true)} />
                  </div>
                )
              }
            />
            <Route
              path="/chat"
              element={
                <div className="page-chat">
                  <ChatWindow clientId={CLIENT_ID} />
                </div>
              }
            />
            <Route
              path="/therapist"
              element={<TherapistDashboard clientId={THERAPIST_CLIENT_ID} />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
