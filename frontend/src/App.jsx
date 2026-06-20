import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import ChatWindow from "./components/Chat/ChatWindow";
import CheckInForm from "./components/CheckIn/CheckInForm";
import TherapistDashboard from "./components/TherapistDashboard/Dashboard";
import DemoGuide from "./components/DemoGuide";
import "./App.css";

// Demo clients matching seed_demo.py
const DEMO_CLIENTS = [
  { id: "client-001", name: "Alex M.",   initials: "AM" },
  { id: "client-002", name: "Jordan R.", initials: "JR" },
  { id: "client-003", name: "Sam T.",    initials: "ST" },
  { id: "client-004", name: "Maya K.",   initials: "MK" },
];

function NavBar({ clientId, setClientId, onShowGuide }) {
  const { pathname } = useLocation();
  const isTherapist = pathname === "/therapist";
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span className="nav-logo">B</span>
        <span className="nav-name">BridgeNote</span>
      </div>
      <div className="nav-links">
        <Link to="/"          className={pathname === "/"          ? "active" : ""}>Check-in</Link>
        <Link to="/chat"      className={pathname === "/chat"      ? "active" : ""}>Chat</Link>
        <Link to="/therapist" className={pathname === "/therapist" ? "active" : ""}>Therapist View</Link>
      </div>
      {!isTherapist && (
        <div className="nav-client-select">
          <span className="nav-client-label">Client:</span>
          <select value={clientId} onChange={e => setClientId(e.target.value)}>
            {DEMO_CLIENTS.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
      <button className="nav-guide-btn" onClick={onShowGuide}>Demo Guide</button>
    </nav>
  );
}

export default function App() {
  const [clientId, setClientId] = useState("client-001");
  const [checkinKey, setCheckinKey] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  return (
    <BrowserRouter>
      <div className="app">
        <NavBar clientId={clientId} setClientId={setClientId} onShowGuide={() => setShowGuide(true)} />
        {showGuide && <DemoGuide onClose={() => setShowGuide(false)} />}
        <main className="app-main">
          <Routes>
            <Route
              path="/"
              element={
                <div className="page-center">
                  <CheckInForm
                    key={`${clientId}-${checkinKey}`}
                    clientId={clientId}
                    onComplete={() => setTimeout(() => setCheckinKey(k => k + 1), 3000)}
                  />
                </div>
              }
            />
            <Route
              path="/chat"
              element={
                <div className="page-chat">
                  <ChatWindow key={clientId} clientId={clientId} />
                </div>
              }
            />
            <Route path="/therapist" element={<TherapistDashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
