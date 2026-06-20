import { useState } from "react";
import { api } from "../../services/api";
import "./CheckInForm.css";

const MOOD_LABELS = ["", "Terrible", "Bad", "Poor", "Low", "Neutral", "Okay", "Good", "Great", "Excellent", "Amazing"];
const MOOD_COLORS = ["", "#e74c3c", "#e74c3c", "#e67e22", "#e67e22", "#f39c12", "#f1c40f", "#2ecc71", "#27ae60", "#1abc9c", "#16a085"];

export default function CheckInForm({ clientId, onComplete }) {
  const [step, setStep] = useState("mood"); // mood | details | journal | done
  const [mood, setMood] = useState(5);
  const [anxiety, setAnxiety] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [sleep, setSleep] = useState(7);
  const [journalEntry, setJournalEntry] = useState("");
  const [journalPrompt, setJournalPrompt] = useState(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkinId, setCheckinId] = useState(null);

  const handleMoodNext = async () => {
    setStep("details");
  };

  const handleDetailsNext = async () => {
    setLoadingPrompt(true);
    try {
      const { prompt } = await api.getJournalPrompt(clientId, mood, MOOD_LABELS[mood]);
      setJournalPrompt(prompt);
    } catch {
      setJournalPrompt("What's been on your mind today?");
    } finally {
      setLoadingPrompt(false);
    }
    setStep("journal");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await api.createCheckin({
        client_id: clientId,
        mood_score: mood,
        mood_label: MOOD_LABELS[mood],
        anxiety_level: anxiety,
        energy_level: energy,
        sleep_hours: sleep,
        journal_entry: journalEntry || null,
      });
      setCheckinId(result.checkin_id);
      setStep("done");
      onComplete?.({ mood, journalEntry, checkinId: result.checkin_id });
    } catch (err) {
      alert("Failed to save check-in. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="checkin-card checkin-done">
        <div className="done-icon">✓</div>
        <h2>Check-in saved</h2>
        <p>Mood: <strong>{MOOD_LABELS[mood]} ({mood}/10)</strong></p>
        <p>Thanks for checking in today. Your therapist can see this.</p>
      </div>
    );
  }

  return (
    <div className="checkin-card">
      <div className="checkin-steps">
        {["mood", "details", "journal"].map((s, i) => (
          <div key={s} className={`step-dot ${step === s ? "active" : ["mood","details","journal"].indexOf(step) > i ? "done" : ""}`} />
        ))}
      </div>

      {step === "mood" && (
        <>
          <h2>How are you feeling?</h2>
          <div className="mood-score" style={{ color: MOOD_COLORS[mood] }}>{mood}</div>
          <div className="mood-label" style={{ color: MOOD_COLORS[mood] }}>{MOOD_LABELS[mood]}</div>
          <input
            type="range" min="1" max="10" value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="mood-slider"
            style={{ accentColor: MOOD_COLORS[mood] }}
          />
          <div className="slider-labels"><span>1 — Terrible</span><span>10 — Amazing</span></div>
          <button className="btn-primary" onClick={handleMoodNext}>Next</button>
        </>
      )}

      {step === "details" && (
        <>
          <h2>A bit more detail</h2>
          <div className="detail-row">
            <label>Anxiety level: <strong>{anxiety}/10</strong></label>
            <input type="range" min="1" max="10" value={anxiety} onChange={(e) => setAnxiety(Number(e.target.value))} />
          </div>
          <div className="detail-row">
            <label>Energy level: <strong>{energy}/10</strong></label>
            <input type="range" min="1" max="10" value={energy} onChange={(e) => setEnergy(Number(e.target.value))} />
          </div>
          <div className="detail-row">
            <label>Sleep last night: <strong>{sleep}h</strong></label>
            <input type="range" min="0" max="12" step="0.5" value={sleep} onChange={(e) => setSleep(Number(e.target.value))} />
          </div>
          <div className="btn-row">
            <button className="btn-secondary" onClick={() => setStep("mood")}>Back</button>
            <button className="btn-primary" onClick={handleDetailsNext} disabled={loadingPrompt}>
              {loadingPrompt ? "Loading…" : "Next"}
            </button>
          </div>
        </>
      )}

      {step === "journal" && (
        <>
          <h2>Optional journal</h2>
          {journalPrompt && (
            <p className="journal-prompt">"{journalPrompt}"</p>
          )}
          <textarea
            className="journal-textarea"
            placeholder="Write as much or as little as you'd like…"
            value={journalEntry}
            onChange={(e) => setJournalEntry(e.target.value)}
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
