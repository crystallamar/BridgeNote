import { useState } from "react";
import "./DemoGuide.css";

const CLIENTS = [
  {
    id: "client-001",
    name: "Alex M.",
    emoji: "💼",
    tag: "GAD · Social Anxiety",
    color: "#6c63ff",
    summary: "High-functioning professional managing generalized anxiety and mild depression in remission. Primary concern: perfectionism and performance anxiety at work.",
    context: [
      "Treatment goals: reduce workplace anxiety, build sleep routine, self-compassion",
      "Diagnoses: GAD, MDD (mild, remission) · Medication: Sertraline 50mg",
      "Key triggers: performance reviews, sleep deprivation, ambiguous feedback",
      "Last session: practiced reframing before a big performance review",
    ],
    chatDemo: "Try asking: \"I have a big meeting tomorrow and I can't stop catastrophizing.\"",
    checkinNote: "Sliders: Anxiety + Energy. Buttons: GRAPES + Self-care.",
  },
  {
    id: "client-002",
    name: "Jordan R.",
    emoji: "🎨",
    tag: "Depression · GRAPES focus",
    color: "#9b59b6",
    summary: "Artist and empath working through moderate depression. Therapist uses GRAPES framework daily. Isolation is the biggest warning sign — connection is the medicine.",
    context: [
      "Treatment goals: daily GRAPES practice, re-engage with art and cooking, reduce isolation",
      "Diagnoses: MDD (moderate) · Medication: Bupropion 150mg",
      "Key triggers: isolation, canceled plans, social comparison",
      "Last session: celebrated 5/7 GRAPES days — best streak in months",
    ],
    chatDemo: "Try asking: \"I canceled plans again and I know it makes things worse. I just couldn't do it.\"",
    checkinNote: "Sliders: Depression + Motivation. Buttons: GRAPES (primary), Daily basics, Connections.",
  },
  {
    id: "client-003",
    name: "Sam T.",
    emoji: "🌊",
    tag: "PTSD Recovery",
    color: "#2ecc71",
    summary: "In stabilization phase of PTSD recovery. Focus is on grounding, sleep regulation, and window of tolerance — NOT trauma processing yet. Significant resilience and dry humor.",
    context: [
      "Treatment goals: grounding toolkit, sleep regulation, gradual social re-engagement",
      "Diagnoses: PTSD, Insomnia (trauma-related) · Medication: Prazosin 1mg, PRN Hydroxyzine",
      "Key triggers: loud noises, crowded transit, smoke smell, feeling physically cornered",
      "Last session: two nightmare-free nights, used 5-4-3-2-1 on the subway successfully",
    ],
    chatDemo: "Try asking: \"I had a nightmare last night. I'm tired and on edge today.\"",
    checkinNote: "Sliders: Feeling safe + Anxiety. Buttons: Grounding practices, Sleep quality, Body check.",
  },
];

export default function DemoGuide({ onClose }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="guide-overlay" onClick={onClose}>
      <div className="guide-modal" onClick={e => e.stopPropagation()}>
        <div className="guide-header">
          <h2>Demo Guide</h2>
          <p className="guide-subtitle">Three example clients to explore BridgeNote end-to-end</p>
          <button className="guide-close" onClick={onClose}>✕</button>
        </div>

        <div className="guide-clients">
          {CLIENTS.map(c => (
            <div key={c.id} className="guide-client" style={{ borderLeft: `4px solid ${c.color}` }}>
              <button
                className="guide-client-header"
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              >
                <span className="guide-emoji">{c.emoji}</span>
                <div className="guide-client-title">
                  <strong>{c.name}</strong>
                  <span className="guide-tag" style={{ color: c.color }}>{c.tag}</span>
                </div>
                <span className="guide-chevron">{expanded === c.id ? "▲" : "▼"}</span>
              </button>

              {expanded === c.id && (
                <div className="guide-client-body">
                  <p className="guide-summary">{c.summary}</p>
                  <div className="guide-section">
                    <p className="guide-section-label">Therapist context</p>
                    <ul>{c.context.map(l => <li key={l}>{l}</li>)}</ul>
                  </div>
                  <div className="guide-section guide-hint" style={{ background: c.color + "12", borderColor: c.color + "40" }}>
                    <p className="guide-section-label">💬 Chat demo</p>
                    <p>{c.chatDemo}</p>
                  </div>
                  <div className="guide-section">
                    <p className="guide-section-label">📋 Check-in form</p>
                    <p>{c.checkinNote}</p>
                  </div>
                  <p className="guide-id">Client ID: <code>{c.id}</code> — select from the nav dropdown</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="guide-footer">
          <p>Switch between clients using the <strong>Client dropdown</strong> in the navbar.</p>
          <p>Run <code>python seed_demo.py</code> in the backend to populate Redis with sample data.</p>
        </div>
      </div>
    </div>
  );
}
