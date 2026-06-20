import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { api } from "../../services/api";
import "./Dashboard.css";

export default function TherapistDashboard({ clientId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [contextForm, setContextForm] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    api.getTherapistDashboard(clientId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId]);

  const handleSaveContext = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const context = {
      therapist_id: "therapist-001",
      client_id: clientId,
      client_name: fd.get("client_name"),
      treatment_goals: fd.get("goals").split("\n").filter(Boolean),
      diagnoses: fd.get("diagnoses").split("\n").filter(Boolean),
      triggers: fd.get("triggers").split("\n").filter(Boolean),
      strengths: fd.get("strengths").split("\n").filter(Boolean),
      notes: fd.get("notes"),
      last_session_date: fd.get("last_session_date"),
      last_session_summary: fd.get("last_session_summary"),
    };
    await api.upsertTherapistContext(context);
    setContextForm(null);
    const updated = await api.getTherapistDashboard(clientId);
    setData(updated);
  };

  if (loading) return <div className="dash-loading">Loading dashboard…</div>;

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h1>{data?.client_name || "Client"}</h1>
          <p className="dash-subtitle">Therapist view · {clientId}</p>
        </div>
        <button className="btn-primary" onClick={() => setContextForm(data?.therapist_context || {})}>
          {data?.therapist_context ? "Edit Context" : "+ Add Client Context"}
        </button>
      </div>

      <div className="dash-tabs">
        {["overview", "checkins", "conversations"].map((t) => (
          <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="dash-section">
          <h3>Mood &amp; Wellbeing Trend (last 30 days)</h3>
          {data?.mood_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={[...data.mood_trend].reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="mood_score" stroke="#6c63ff" strokeWidth={2} dot={false} name="Mood" />
                <Line type="monotone" dataKey="anxiety_level" stroke="#e74c3c" strokeWidth={2} dot={false} name="Anxiety" />
                <Line type="monotone" dataKey="energy_level" stroke="#2ecc71" strokeWidth={2} dot={false} name="Energy" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-state">No check-in data yet.</p>
          )}

          {data?.therapist_context && (
            <div className="context-cards">
              <ContextCard title="Treatment Goals" items={data.therapist_context.treatment_goals} color="#6c63ff" />
              <ContextCard title="Known Triggers" items={data.therapist_context.triggers} color="#e74c3c" />
              <ContextCard title="Client Strengths" items={data.therapist_context.strengths} color="#2ecc71" />
            </div>
          )}
        </div>
      )}

      {activeTab === "checkins" && (
        <div className="dash-section">
          <h3>Recent Check-ins</h3>
          {data?.recent_checkins?.length > 0 ? (
            <div className="checkin-list">
              {data.recent_checkins.map((c) => (
                <div key={c.id} className="checkin-item">
                  <div className="checkin-date">{c.timestamp?.slice(0, 10)}</div>
                  <div className="checkin-scores">
                    <Score label="Mood" value={c.mood_score} max={10} color="#6c63ff" />
                    <Score label="Anxiety" value={c.anxiety_level} max={10} color="#e74c3c" />
                    <Score label="Energy" value={c.energy_level} max={10} color="#2ecc71" />
                    <Score label="Sleep" value={c.sleep_hours} max={12} color="#f39c12" unit="h" />
                  </div>
                  {c.journal_entry && (
                    <div className="checkin-journal">
                      <span className="sentiment-badge" data-sentiment={c.sentiment_label}>{c.sentiment_label}</span>
                      <p>"{c.journal_entry.slice(0, 300)}{c.journal_entry.length > 300 ? "…" : ""}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No check-ins recorded yet.</p>
          )}
        </div>
      )}

      {activeTab === "conversations" && (
        <div className="dash-section">
          <h3>Chatbot Session Summaries</h3>
          {data?.chat_summaries?.length > 0 ? (
            data.chat_summaries.map((s) => (
              <div key={s.conversation_id} className="summary-card">
                <div className="summary-meta">
                  {s.message_count} messages · ID: {s.conversation_id.slice(0, 8)}…
                </div>
                <p>{s.summary}</p>
              </div>
            ))
          ) : (
            <p className="empty-state">No chatbot conversations yet.</p>
          )}
        </div>
      )}

      {contextForm !== null && (
        <div className="modal-overlay" onClick={() => setContextForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Client Context for AI</h2>
            <p className="modal-subtitle">This information personalizes the BridgeNote chatbot for your client.</p>
            <form onSubmit={handleSaveContext}>
              <FormField name="client_name" label="Client name" defaultValue={contextForm.client_name} />
              <FormField name="goals" label="Treatment goals (one per line)" textarea defaultValue={(contextForm.treatment_goals || []).join("\n")} />
              <FormField name="diagnoses" label="Working diagnoses (one per line)" textarea defaultValue={(contextForm.diagnoses || []).join("\n")} />
              <FormField name="triggers" label="Known triggers (one per line)" textarea defaultValue={(contextForm.triggers || []).join("\n")} />
              <FormField name="strengths" label="Client strengths (one per line)" textarea defaultValue={(contextForm.strengths || []).join("\n")} />
              <FormField name="last_session_date" label="Last session date" type="date" defaultValue={contextForm.last_session_date} />
              <FormField name="last_session_summary" label="Last session summary" textarea defaultValue={contextForm.last_session_summary} />
              <FormField name="notes" label="Therapist notes" textarea defaultValue={contextForm.notes} />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setContextForm(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Context</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ContextCard({ title, items, color }) {
  if (!items?.length) return null;
  return (
    <div className="context-card" style={{ borderTop: `3px solid ${color}` }}>
      <h4>{title}</h4>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

function Score({ label, value, max, color, unit = "" }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="score">
      <span className="score-label">{label}</span>
      <div className="score-bar">
        <div className="score-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="score-val">{value}{unit}</span>
    </div>
  );
}

function FormField({ name, label, textarea, type = "text", defaultValue }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue} rows={3} />
      ) : (
        <input name={name} type={type} defaultValue={defaultValue} />
      )}
    </div>
  );
}
