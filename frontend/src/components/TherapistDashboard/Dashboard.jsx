import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { api } from "../../services/api";
import "./Dashboard.css";

const THERAPIST_ID = "therapist-001";

const DEMO_CLIENTS = [
  { client_id: "client-001", name: "Alex M.", tag: "GAD · Social Anxiety" },
  { client_id: "client-002", name: "Jordan R.", tag: "Depression · GRAPES focus" },
  { client_id: "client-003", name: "Sam T.",   tag: "PTSD Recovery" },
];

export default function TherapistDashboard() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [contextForm, setContextForm] = useState(null);
  const [configForm, setConfigForm] = useState(null);

  const selectClient = async (client) => {
    setSelectedClient(client);
    setLoading(true);
    setActiveTab("overview");
    try {
      const d = await api.getTherapistDashboard(client.client_id);
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContext = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const context = {
      therapist_id: THERAPIST_ID,
      client_id: selectedClient.client_id,
      client_name: fd.get("client_name"),
      treatment_goals: fd.get("goals").split("\n").filter(Boolean),
      diagnoses:  fd.get("diagnoses").split("\n").filter(Boolean),
      triggers:   fd.get("triggers").split("\n").filter(Boolean),
      strengths:  fd.get("strengths").split("\n").filter(Boolean),
      notes: fd.get("notes"),
      last_session_date: fd.get("last_session_date"),
      last_session_summary: fd.get("last_session_summary"),
    };
    await api.upsertTherapistContext(context);
    setContextForm(null);
    const updated = await api.getTherapistDashboard(selectedClient.client_id);
    setData(updated);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const sliderKeys = fd.getAll("slider_keys");
    const sliderLabels = fd.getAll("slider_labels");
    const sliderColors = fd.getAll("slider_colors");
    const config = {
      sliders: sliderKeys.map((k, i) => ({
        key: k, label: sliderLabels[i], color: sliderColors[i],
      })),
      button_groups: data?.therapist_context?.checkin_config?.button_groups || [],
    };
    await api.saveCheckinConfig(selectedClient.client_id, config);
    setConfigForm(null);
  };

  // ── Client list ──
  if (!selectedClient) {
    return (
      <div className="client-list-page">
        <div className="client-list-header">
          <h1>Your Clients</h1>
          <p className="dash-subtitle">Select a client to view their dashboard</p>
        </div>
        <div className="client-grid">
          {DEMO_CLIENTS.map(c => (
            <button key={c.client_id} className="client-card" onClick={() => selectClient(c)}>
              <div className="client-avatar">{c.name.split(" ").map(w => w[0]).join("")}</div>
              <div className="client-info">
                <div className="client-name">{c.name}</div>
                <div className="client-tag">{c.tag}</div>
              </div>
              <span className="client-arrow">→</span>
            </button>
          ))}
          <button className="client-card client-card--add" onClick={() => alert("Add client flow coming soon")}>
            <div className="client-avatar client-avatar--add">+</div>
            <div className="client-info">
              <div className="client-name">Add new client</div>
              <div className="client-tag">Create a client profile</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── Client dashboard ──
  return (
    <div className="dashboard">
      <div className="dash-header">
        <button className="back-btn" onClick={() => { setSelectedClient(null); setData(null); }}>
          ← Clients
        </button>
        <div className="dash-title-block">
          <h1>{selectedClient.name}</h1>
          <p className="dash-subtitle">{selectedClient.tag}</p>
        </div>
        <div className="dash-header-actions">
          <button className="btn-secondary" onClick={() => setConfigForm(true)}>Check-in Config</button>
          <button className="btn-primary" onClick={() => setContextForm(data?.therapist_context || {})}>
            {data?.therapist_context ? "Edit Context" : "+ Add Context"}
          </button>
        </div>
      </div>

      {loading && <div className="dash-loading">Loading…</div>}

      {!loading && (
        <>
          <div className="dash-tabs">
            {["overview", "checkins", "conversations"].map(t => (
              <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="dash-section">
              {data?.therapist_context && (
                <div className="context-cards">
                  <ContextCard title="Treatment Goals" items={data.therapist_context.treatment_goals} color="#6c63ff" />
                  <ContextCard title="Known Triggers"  items={data.therapist_context.triggers}        color="#e74c3c" />
                  <ContextCard title="Client Strengths" items={data.therapist_context.strengths}      color="#2ecc71" />
                </div>
              )}

              {data?.therapist_context?.last_session_summary && (
                <div className="last-session-card">
                  <h4>Last session — {data.therapist_context.last_session_date}</h4>
                  <p>{data.therapist_context.last_session_summary}</p>
                </div>
              )}

              <h3>Mood trend (recent check-ins)</h3>
              {data?.mood_trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={[...data.mood_trend].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="mood_score" stroke="#6c63ff" strokeWidth={2} dot={{ r: 4 }} name="Mood (1–5)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="empty-state">No check-in data yet — client hasn't checked in.</p>
              )}

              {data?.mood_trend?.some(d => d.anxiety_level) && (
                <>
                  <h3 style={{ marginTop: 24 }}>Anxiety &amp; Energy</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[...data.mood_trend].reverse().slice(0, 14)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="anxiety_level" fill="#e74c3c" name="Anxiety" radius={[4,4,0,0]} />
                      <Bar dataKey="energy_level"  fill="#2ecc71" name="Energy"  radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

          {activeTab === "checkins" && (
            <div className="dash-section">
              <h3>Recent check-ins</h3>
              {data?.recent_checkins?.length > 0 ? (
                <div className="checkin-list">
                  {data.recent_checkins.map(c => (
                    <div key={c.id} className="checkin-item">
                      <div className="checkin-item-header">
                        <span className="checkin-date">{c.timestamp?.slice(0, 10)}</span>
                        <MoodBadge score={c.mood_score} label={c.mood_label} />
                      </div>
                      {c.slider_values && Object.keys(c.slider_values).length > 0 && (
                        <div className="checkin-scores">
                          {Object.entries(c.slider_values).map(([k, v]) => (
                            <Score key={k} label={k} value={v} max={10} />
                          ))}
                        </div>
                      )}
                      {c.button_selections && (
                        <div className="checkin-buttons-summary">
                          {Object.entries(c.button_selections).map(([group, items]) =>
                            items.length > 0 ? (
                              <div key={group} className="btn-summary-group">
                                <span className="btn-summary-label">{group.replace(/_/g," ")}:</span>
                                {items.map(item => <span key={item} className="btn-summary-tag">{item}</span>)}
                              </div>
                            ) : null
                          )}
                        </div>
                      )}
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
              <h3>Chatbot session summaries</h3>
              {data?.chat_summaries?.length > 0 ? (
                data.chat_summaries.map(s => (
                  <div key={s.conversation_id} className="summary-card">
                    <div className="summary-meta">{s.message_count} messages · {s.conversation_id.slice(0,8)}…</div>
                    <p>{s.summary}</p>
                  </div>
                ))
              ) : (
                <p className="empty-state">No chatbot conversations yet.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Context modal */}
      {contextForm !== null && (
        <Modal title="Client AI Context" subtitle="This personalizes BridgeNote's chatbot for this client." onClose={() => setContextForm(null)}>
          <form onSubmit={handleSaveContext}>
            <FormField name="client_name" label="Client name" defaultValue={contextForm.client_name || selectedClient.name} />
            <FormField name="goals"    label="Treatment goals (one per line)"      textarea defaultValue={(contextForm.treatment_goals||[]).join("\n")} />
            <FormField name="diagnoses" label="Working diagnoses (one per line)"   textarea defaultValue={(contextForm.diagnoses||[]).join("\n")} />
            <FormField name="triggers"  label="Known triggers (one per line)"      textarea defaultValue={(contextForm.triggers||[]).join("\n")} />
            <FormField name="strengths" label="Client strengths (one per line)"    textarea defaultValue={(contextForm.strengths||[]).join("\n")} />
            <FormField name="last_session_date" label="Last session date" type="date" defaultValue={contextForm.last_session_date} />
            <FormField name="last_session_summary" label="Last session summary" textarea defaultValue={contextForm.last_session_summary} />
            <FormField name="notes" label="Ongoing therapist notes" textarea defaultValue={contextForm.notes} />
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setContextForm(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

const MOOD_FACES = ["","😢","😕","😐","🙂","😄"];
const MOOD_COLORS = ["","#e74c3c","#e67e22","#f1c40f","#2ecc71","#27ae60"];

function MoodBadge({ score, label }) {
  if (!score) return null;
  return (
    <span className="mood-badge" style={{ background: MOOD_COLORS[score] + "20", color: MOOD_COLORS[score] }}>
      {MOOD_FACES[score]} {label || score}
    </span>
  );
}

function ContextCard({ title, items, color }) {
  if (!items?.length) return null;
  return (
    <div className="context-card" style={{ borderTop: `3px solid ${color}` }}>
      <h4>{title}</h4>
      <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

function Score({ label, value, max = 10 }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="score">
      <span className="score-label">{label}</span>
      <div className="score-bar"><div className="score-fill" style={{ width: `${pct}%` }} /></div>
      <span className="score-val">{value}</span>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        {subtitle && <p className="modal-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function FormField({ name, label, textarea, type = "text", defaultValue }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      {textarea
        ? <textarea name={name} defaultValue={defaultValue} rows={3} />
        : <input name={name} type={type} defaultValue={defaultValue} />}
    </div>
  );
}
