import { useState, useEffect } from "react";
import { api } from "../../services/api";
import "./CheckInForm.css";

const FACES = [
  { score: 1, emoji: "😢", label: "Struggling",  color: "#e74c3c" },
  { score: 2, emoji: "😕", label: "Difficult",   color: "#e67e22" },
  { score: 3, emoji: "😐", label: "Okay",        color: "#f1c40f" },
  { score: 4, emoji: "🙂", label: "Good",        color: "#2ecc71" },
  { score: 5, emoji: "😄", label: "Great",       color: "#27ae60" },
];

const SLIDER_DIRECTION = {
  anxiety:    "lower_better",
  depression: "lower_better",
  stress:     "lower_better",
  energy:     "higher_better",
  motivation: "higher_better",
  safety:     "higher_better",
  sleep:      "higher_better",
};

function sliderValueColor(val, key) {
  const dir = SLIDER_DIRECTION[key] || "higher_better";
  const isLow = val <= 3, isMid = val <= 6;
  if (dir === "lower_better") {
    return isLow ? "#2ecc71" : isMid ? "#f39c12" : "#e74c3c";
  }
  return isLow ? "#e74c3c" : isMid ? "#f39c12" : "#2ecc71";
}

const DEFAULT_CONFIG = {
  sliders: [
    { key: "anxiety", label: "Anxiety",  color: "#e74c3c" },
    { key: "energy",  label: "Energy",   color: "#2ecc71" },
  ],
  button_groups: [
    {
      key: "grapes",
      label: "GRAPES — what did you do today?",
      multi: true,
      items: ["Grateful", "Relax", "Accomplish", "Pleasure", "Exercise", "Social"],
    },
    {
      key: "self_care",
      label: "Self-care",
      multi: true,
      items: ["Showered", "Ate meals", "Took medication", "Got outside", "Slept well"],
    },
  ],
};

function getEntryDate() {
  const now = new Date();
  const hour = now.getHours();
  const isLateNight = hour >= 0 && hour < 4;
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  return { today, yesterdayStr, isLateNight };
}

export default function CheckInForm({ clientId, onComplete }) {
  const [step, setStep] = useState("mood");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [mood, setMood] = useState(null);
  const [sliders, setSliders] = useState({});
  const [buttons, setButtons] = useState({});
  const [journalEntry, setJournalEntry] = useState("");
  const [journalPrompt, setJournalPrompt] = useState(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [backendOnline, setBackendOnline] = useState(null); // null = unknown

  const { today, yesterdayStr, isLateNight } = getEntryDate();
  const [entryDate, setEntryDate] = useState(today);

  useEffect(() => {
    let live = true;
    api.getCheckinConfig(clientId)
      .then(cfg => {
        if (!live) return;
        if (cfg && (cfg.sliders || cfg.button_groups)) setConfig(cfg);
        setBackendOnline(true);
      })
      .catch(() => { if (live) setBackendOnline(false); });
    return () => { live = false; };
  }, [clientId]);

  // Re-fetch when therapist updates config from the dashboard (same browser session)
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.client_id !== clientId) return;
      api.getCheckinConfig(clientId)
        .then(cfg => { if (cfg && (cfg.sliders || cfg.button_groups)) setConfig(cfg); })
        .catch(() => {});
    };
    window.addEventListener("checkinConfigUpdated", handler);
    return () => window.removeEventListener("checkinConfigUpdated", handler);
  }, [clientId]);

  useEffect(() => {
    const defaults = {};
    config.sliders.forEach(s => { defaults[s.key] = 5; });
    setSliders(defaults);
    const bDefaults = {};
    config.button_groups.forEach(g => { bDefaults[g.key] = new Set(); });
    setButtons(bDefaults);
  }, [config]);

  const moodFace = FACES.find(f => f.score === mood);

  const toggleButton = (groupKey, item) => {
    setButtons(prev => {
      const next = { ...prev };
      const set = new Set(next[groupKey]);
      set.has(item) ? set.delete(item) : set.add(item);
      next[groupKey] = set;
      return next;
    });
  };

  const fetchPrompt = async (isRegen = false) => {
    setLoadingPrompt(true);
    const prev = isRegen ? journalPrompt : null;
    if (isRegen) setJournalPrompt(null);
    try {
      const { prompt } = await api.getJournalPrompt(clientId, mood, moodFace?.label, prev);
      setJournalPrompt(prompt);
    } catch {
      setJournalPrompt("What's been on your mind today? Write as much or as little as you'd like.");
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleDetailsNext = async () => {
    await fetchPrompt(false);
    setStep("journal");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const buttonSelections = {};
    Object.entries(buttons).forEach(([k, set]) => {
      buttonSelections[k] = Array.from(set);
    });
    try {
      await api.createCheckin({
        client_id: clientId,
        entry_date: entryDate,
        mood_score: mood,
        mood_label: moodFace?.label,
        slider_values: sliders,
        button_selections: buttonSelections,
        journal_entry: journalEntry || null,
      });
      setStep("done");
      onComplete?.({ mood });
    } catch {
      alert("Could not save — is the backend running? Start with: uvicorn main:app --reload");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="checkin-card checkin-done">
        <div className="done-icon">✓</div>
        <h2>Check-in saved!</h2>
        <p className="done-face">{moodFace?.emoji}</p>
        <p>You rated your mood as <strong>{moodFace?.label}</strong> for {entryDate === today ? "today" : "yesterday"}.</p>
        <p className="done-sub">Your therapist can see this. Take care of yourself. 💙</p>
      </div>
    );
  }

  return (
    <div className="checkin-card">
      {backendOnline === false && (
        <div className="offline-banner">
          ⚠️ Backend offline — entries won't be saved. Start the server to enable saving.
        </div>
      )}

      <div className="checkin-steps">
        {["mood", "details", "journal"].map((s, i) => (
          <div key={s} className={`step-dot ${step === s ? "active" : ["mood","details","journal"].indexOf(step) > i ? "done" : ""}`} />
        ))}
      </div>

      {/* ── Step 1: Date + mood face picker ── */}
      {step === "mood" && (
        <>
          <div className="date-row">
            <label className="date-label">Entry date</label>
            <div className="date-picker-wrap">
              <input
                type="date"
                className="date-picker-input"
                value={entryDate}
                max={today}
                onChange={e => e.target.value && setEntryDate(e.target.value)}
              />
              <span className="date-picker-hint">
                {entryDate === today ? "Today" : entryDate === yesterdayStr ? "Yesterday" : entryDate}
              </span>
            </div>
            {isLateNight && entryDate === today && (
              <p className="date-hint">It's late — did you mean to log this for yesterday?</p>
            )}
          </div>

          <h2>How are you feeling?</h2>
          <p className="step-hint">Tap a face to select your mood</p>

          <div className="face-row">
            {FACES.map(f => (
              <button
                key={f.score}
                className={`face-btn ${mood === f.score ? "face-btn--selected" : ""}`}
                style={mood === f.score ? { borderColor: f.color, background: f.color + "18" } : {}}
                onClick={() => setMood(f.score)}
                title={f.label}
              >
                <span className="face-emoji">{f.emoji}</span>
                <span className="face-label" style={mood === f.score ? { color: f.color } : {}}>{f.label}</span>
              </button>
            ))}
          </div>

          {mood && <div className="mood-selected" style={{ color: moodFace.color }}>{moodFace.emoji} {moodFace.label}</div>}

          <button className="btn-primary" onClick={() => setStep("details")} disabled={!mood}>
            Next
          </button>
        </>
      )}

      {/* ── Step 2: Sliders + button groups ── */}
      {step === "details" && (
        <>
          <h2>A bit more detail</h2>

          {config.sliders.length > 0 && (
            <div className="section-block">
              {config.sliders.map(s => (
                <div className="detail-row" key={s.key}>
                  <label>
                    {s.label}:&nbsp;<strong style={{ color: sliderValueColor(sliders[s.key] ?? 5, s.key) }}>{sliders[s.key] ?? 5}/10</strong>
                  </label>
                  <input
                    type="range" min="1" max="10"
                    value={sliders[s.key] ?? 5}
                    onChange={e => setSliders(prev => ({ ...prev, [s.key]: Number(e.target.value) }))}
                    style={{ accentColor: sliderValueColor(sliders[s.key] ?? 5, s.key) }}
                  />
                  <div className="slider-ends"><span>Low</span><span>High</span></div>
                </div>
              ))}
            </div>
          )}

          {config.button_groups.map(group => (
            <div className="section-block" key={group.key}>
              <p className="group-label">{group.label}</p>
              <div className="btn-group">
                {group.items.map(item => {
                  const selected = buttons[group.key]?.has(item);
                  return (
                    <button
                      key={item}
                      className={`tag-btn ${selected ? "tag-btn--on" : ""}`}
                      onClick={() => toggleButton(group.key, item)}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="btn-row">
            <button className="btn-secondary" onClick={() => setStep("mood")}>Back</button>
            <button className="btn-primary" onClick={handleDetailsNext} disabled={loadingPrompt}>
              {loadingPrompt ? "Loading…" : "Next →  Journal"}
            </button>
          </div>
        </>
      )}

      {/* ── Step 3: Optional journal ── */}
      {step === "journal" && (
        <>
          <h2>Journal <span className="optional-badge">optional</span></h2>

          <div className="journal-prompt-card">
            <p className="prompt-label">Today's prompt</p>
            {loadingPrompt ? (
              <p className="prompt-text prompt-loading">Generating a prompt for you…</p>
            ) : (
              <p className="prompt-text">{journalPrompt || "What's been on your mind today?"}</p>
            )}
            <button className="regen-btn" onClick={() => fetchPrompt(true)} disabled={loadingPrompt}>
              {loadingPrompt ? "…" : "↺ New prompt"}
            </button>
          </div>

          <p className="step-hint">Feel free to write anything — or save with nothing.</p>

          <textarea
            className="journal-textarea"
            placeholder="Write freely here… or leave blank and just save."
            value={journalEntry}
            onChange={e => setJournalEntry(e.target.value)}
            rows={5}
          />

          <div className="btn-row">
            <button className="btn-secondary" onClick={() => setStep("details")}>Back</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving…" : "Save check-in"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
