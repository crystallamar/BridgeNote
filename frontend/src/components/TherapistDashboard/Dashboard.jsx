import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, BarChart, Bar,
} from "recharts";
import { api } from "../../services/api";
import "./Dashboard.css";

const THERAPIST_ID = "therapist-001";

const DEMO_CLIENTS = [
  { client_id: "client-001", name: "Alex M.",   tag: "GAD · Social Anxiety" },
  { client_id: "client-002", name: "Jordan R.", tag: "Depression · GRAPES focus" },
  { client_id: "client-003", name: "Sam T.",    tag: "PTSD Recovery" },
  { client_id: "client-004", name: "Maya K.",   tag: "Anxiety · Depression · Student (pre-med)" },
];

const PRESET_SLIDERS = [
  { key: "anxiety",    label: "Anxiety",     color: "#e74c3c" },
  { key: "depression", label: "Depression",  color: "#9b59b6" },
  { key: "energy",     label: "Energy",      color: "#2ecc71" },
  { key: "motivation", label: "Motivation",  color: "#3498db" },
  { key: "stress",     label: "Stress",      color: "#e67e22" },
  { key: "safety",     label: "Feeling safe","color": "#1abc9c" },
  { key: "sleep",      label: "Sleep quality","color": "#f39c12" },
];

const PRESET_GROUPS = [
  {
    key: "grapes", label: "GRAPES — what did you do today?", multi: true,
    items: ["Grateful", "Relax", "Accomplish", "Pleasure", "Exercise", "Social"],
  },
  {
    key: "self_care", label: "Self-care", multi: true,
    items: ["Showered", "Ate meals", "Took medication", "Got outside", "Slept well"],
  },
  {
    key: "grounding", label: "Grounding practices", multi: true,
    items: ["5-4-3-2-1 senses", "Box breathing", "Body scan", "Cold water", "Safe place visualization"],
  },
  {
    key: "connections", label: "Connected with someone?", multi: true,
    items: ["Texted a friend", "Called someone", "Saw someone in person", "Online community"],
  },
  {
    key: "academics", label: "Academic check-in", multi: true,
    items: ["Attended class", "Studied", "Asked for help", "Took a break", "Submitted work"],
  },
];

// Color by mood score 1–5
function moodColor(score) {
  if (!score) return "#ccc";
  if (score >= 4.5) return "#27ae60";
  if (score >= 3.5) return "#2ecc71";
  if (score >= 2.5) return "#f1c40f";
  if (score >= 1.5) return "#e67e22";
  return "#e74c3c";
}

// Custom dot for mood line — colored by score
function MoodDot(props) {
  const { cx, cy, payload } = props;
  const color = moodColor(payload?.mood_score);
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />;
}

// Custom tooltip
function MoodTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const score = d.mood_score;
  const LABELS = ["","Struggling","Difficult","Okay","Good","Great"];
  return (
    <div style={{ background: "white", border: "1px solid #eee", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#555" }}>{label}</p>
      {score && <p style={{ margin: 0, color: moodColor(score), fontWeight: 700 }}>Mood: {LABELS[Math.round(score)]} ({score}/5)</p>}
    </div>
  );
}

export default function TherapistDashboard() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [contextForm, setContextForm] = useState(null);
  const [configModal, setConfigModal] = useState(false);
  const [checkinConfig, setCheckinConfig] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // Local config editor state
  const [activeSliders, setActiveSliders] = useState([]);
  const [activeGroups, setActiveGroups] = useState([]);

  const selectClient = async (client) => {
    setSelectedClient(client);
    setLoading(true);
    setActiveTab("overview");
    setData(null);
    try {
      const [d, cfg] = await Promise.all([
        api.getTherapistDashboard(client.client_id),
        api.getCheckinConfig(client.client_id),
      ]);
      setData(d);
      setCheckinConfig(cfg);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const openConfigModal = () => {
    if (checkinConfig) {
      setActiveSliders(checkinConfig.sliders?.map(s => s.key) || []);
      setActiveGroups(checkinConfig.button_groups?.map(g => g.key) || []);
    }
    setConfigModal(true);
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    const newConfig = {
      sliders: PRESET_SLIDERS.filter(s => activeSliders.includes(s.key)),
      button_groups: PRESET_GROUPS.filter(g => activeGroups.includes(g.key)),
    };
    try {
      await api.saveCheckinConfig(selectedClient.client_id, newConfig);
      setCheckinConfig(newConfig);
      setConfigModal(false);
    } catch {
      alert("Could not save — backend offline.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveContext = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const context = {
      therapist_id: THERAPIST_ID,
      client_id: selectedClient.client_id,
      client_name: selectedClient.name,   // from selection, not editable
      treatment_goals: fd.get("goals").split("\n").filter(Boolean),
      diagnoses: fd.get("diagnoses").split("\n").filter(Boolean),
      triggers:  fd.get("triggers").split("\n").filter(Boolean),
      strengths: fd.get("strengths").split("\n").filter(Boolean),
      notes: fd.get("notes"),
      last_session_date: fd.get("last_session_date"),
      last_session_summary: fd.get("last_session_summary"),
    };
    await api.upsertTherapistContext(context);
    setContextForm(null);
    try {
      const updated = await api.getTherapistDashboard(selectedClient.client_id);
      setData(updated);
    } catch {}
  };

  // ── Client list screen ──────────────────────────────────────────────────
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
          <button className="client-card client-card--add" onClick={() => alert("Add client flow — coming soon")}>
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

  // ── Client dashboard ────────────────────────────────────────────────────
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
          <button className="btn-secondary" onClick={openConfigModal} title="Configure which sliders and buttons appear on this client's check-in form">
            ⚙ Check-in Form
          </button>
          <button className="btn-primary" onClick={() => setContextForm(data?.therapist_context || {})}>
            {data?.therapist_context ? "Edit AI Context" : "+ Add AI Context"}
          </button>
        </div>
      </div>

      {loading && <div className="dash-loading">Loading {selectedClient.name}'s data…</div>}

      {!loading && (
        <>
          <div className="dash-tabs">
            {["overview", "checkins", "conversations"].map(t => (
              <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
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

              {!data?.therapist_context && !loading && (
                <div className="empty-context-prompt">
                  <p>No AI context set yet.</p>
                  <button className="btn-primary" onClick={() => setContextForm({})}>
                    + Add client context
                  </button>
                </div>
              )}

              <h3>Mood trend</h3>
              <div className="chart-legend-row">
                <span className="legend-item" style={{ color: "#e74c3c" }}>● Struggling–Difficult</span>
                <span className="legend-item" style={{ color: "#f1c40f" }}>● Okay</span>
                <span className="legend-item" style={{ color: "#27ae60" }}>● Good–Great</span>
              </div>

              {data?.mood_trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={[...data.mood_trend].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6c63ff" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6c63ff" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]}
                      tickFormatter={v => ["","😢","😕","😐","🙂","😄"][v] || v}
                      tick={{ fontSize: 13 }}
                    />
                    {/* Color zones */}
                    <ReferenceArea y1={1} y2={2.5} fill="#e74c3c" fillOpacity={0.06} />
                    <ReferenceArea y1={2.5} y2={3.5} fill="#f1c40f" fillOpacity={0.06} />
                    <ReferenceArea y1={3.5} y2={5}   fill="#2ecc71" fillOpacity={0.06} />
                    <Tooltip content={<MoodTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="mood_score"
                      stroke="#6c63ff"
                      strokeWidth={2.5}
                      fill="url(#moodGrad)"
                      dot={<MoodDot />}
                      activeDot={{ r: 7 }}
                      name="Mood"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="empty-state">No check-in data yet.</p>
              )}

              {checkinConfig?.sliders?.length > 0 && data?.mood_trend?.length > 0 && (
                <>
                  <h3 style={{ marginTop: 28 }}>Slider metrics</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[...data.mood_trend].reverse().slice(0, 14)} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      {checkinConfig.sliders.map(s => (
                        <Bar key={s.key} dataKey={s.key} fill={s.color} name={s.label} radius={[4,4,0,0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

          {/* ── Check-ins ── */}
          {activeTab === "checkins" && (
            <div className="dash-section">
              <h3>Recent check-ins</h3>
              {data?.recent_checkins?.length > 0 ? (
                <div className="checkin-list">
                  {data.recent_checkins.map(c => (
                    <div key={c.id} className="checkin-item">
                      <div className="checkin-item-header">
                        <span className="checkin-date">{c.entry_date || c.timestamp?.slice(0, 10)}</span>
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
                            items?.length > 0 ? (
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
                          {c.sentiment_label && <span className="sentiment-badge" data-sentiment={c.sentiment_label}>{c.sentiment_label}</span>}
                          <p>"{c.journal_entry.slice(0, 300)}{c.journal_entry.length > 300 ? "…" : ""}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No check-ins yet.</p>
              )}
            </div>
          )}

          {/* ── Conversations ── */}
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

      {/* ── Context modal ── */}
      {contextForm !== null && (
        <Modal
          title={`AI Context — ${selectedClient.name}`}
          subtitle="This personalizes BridgeNote's chatbot responses for this specific client."
          onClose={() => setContextForm(null)}
        >
          <form onSubmit={handleSaveContext}>
            <div className="form-field">
              <label>Client</label>
              <div className="client-readonly">{selectedClient.name} <span className="client-id-badge">{selectedClient.client_id}</span></div>
            </div>
            <FormField name="goals"    label="Treatment goals (one per line)"    textarea defaultValue={(contextForm.treatment_goals||[]).join("\n")} />
            <FormField name="diagnoses" label="Working diagnoses (one per line)" textarea defaultValue={(contextForm.diagnoses||[]).join("\n")} />
            <FormField name="triggers"  label="Known triggers (one per line)"    textarea defaultValue={(contextForm.triggers||[]).join("\n")} />
            <FormField name="strengths" label="Client strengths (one per line)"  textarea defaultValue={(contextForm.strengths||[]).join("\n")} />
            <FormField name="last_session_date" label="Last session date" type="date" defaultValue={contextForm.last_session_date} />
            <FormField name="last_session_summary" label="Last session summary" textarea defaultValue={contextForm.last_session_summary} />
            <FormField name="notes" label="Ongoing therapist notes" textarea defaultValue={contextForm.notes} />
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setContextForm(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Save context</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Check-in config modal ── */}
      {configModal && (
        <Modal
          title={`Check-in Form — ${selectedClient.name}`}
          subtitle="Choose which sliders and button groups appear when this client does their daily check-in."
          onClose={() => setConfigModal(false)}
        >
          <div className="config-section">
            <p className="config-section-label">Sliders <span className="config-hint">(rated 1–10)</span></p>
            <div className="config-toggle-grid">
              {PRESET_SLIDERS.map(s => (
                <label key={s.key} className={`config-toggle ${activeSliders.includes(s.key) ? "config-toggle--on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={activeSliders.includes(s.key)}
                    onChange={e => {
                      setActiveSliders(prev =>
                        e.target.checked ? [...prev, s.key] : prev.filter(k => k !== s.key)
                      );
                    }}
                  />
                  <span className="toggle-dot" style={{ background: s.color }} />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div className="config-section">
            <p className="config-section-label">Button groups <span className="config-hint">(tap-to-select items)</span></p>
            {PRESET_GROUPS.map(g => (
              <label key={g.key} className={`config-group-toggle ${activeGroups.includes(g.key) ? "config-group-toggle--on" : ""}`}>
                <input
                  type="checkbox"
                  checked={activeGroups.includes(g.key)}
                  onChange={e => {
                    setActiveGroups(prev =>
                      e.target.checked ? [...prev, g.key] : prev.filter(k => k !== g.key)
                    );
                  }}
                />
                <div className="group-toggle-info">
                  <strong>{g.label}</strong>
                  <span className="group-items-preview">{g.items.join(" · ")}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setConfigModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveConfig} disabled={savingConfig}>
              {savingConfig ? "Saving…" : "Save check-in form"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

const MOOD_FACES  = ["","😢","😕","😐","🙂","😄"];
const MOOD_COLORS = ["","#e74c3c","#e67e22","#f1c40f","#2ecc71","#27ae60"];

function MoodBadge({ score, label }) {
  if (!score) return null;
  return (
    <span className="mood-badge" style={{ background: MOOD_COLORS[score] + "22", color: MOOD_COLORS[score] }}>
      {MOOD_FACES[score]} {label || `${score}/5`}
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
