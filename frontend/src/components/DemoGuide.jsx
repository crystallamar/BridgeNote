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
    chatDemo: "Try: \"I have a big meeting tomorrow and I can't stop catastrophizing.\"",
    checkinNote: "Sliders: Anxiety + Energy. Buttons: GRAPES + Self-care. The AI chatbot greets Alex by name and references work-performance context from the therapist's notes.",
  },
  {
    id: "client-002",
    name: "Jordan R.",
    emoji: "🎨",
    tag: "Depression · GRAPES focus",
    color: "#9b59b6",
    summary: "Artist and empath working through moderate depression. Therapist uses the GRAPES framework daily. Isolation is the biggest warning sign — connection is the medicine.",
    context: [
      "Treatment goals: daily GRAPES practice, re-engage with art and cooking, reduce isolation",
      "Diagnoses: MDD (moderate) · Medication: Bupropion 150mg",
      "Key triggers: isolation, canceled plans, social comparison",
      "Last session: celebrated 5/7 GRAPES days — best streak in months",
    ],
    chatDemo: "Try: \"I canceled plans again and I know it makes things worse. I just couldn't do it.\"",
    checkinNote: "Sliders: Depression + Motivation. Buttons: GRAPES (primary), Self-care, Connections. GRAPES completion rates are visible in the Check-ins tab.",
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
    chatDemo: "Try: \"I had a nightmare last night. I'm tired and on edge today.\" — the AI will offer grounding techniques like 5-4-3-2-1.",
    checkinNote: "Sliders: Feeling safe + Anxiety. Buttons: Grounding practices (5-4-3-2-1, box breathing, body scan) + Self-care. Best client to demo the safety guardrail — try expressing distress.",
  },
  {
    id: "client-004",
    name: "Maya K.",
    emoji: "📚",
    tag: "Anxiety · Depression · Student (pre-med)",
    color: "#e67e22",
    summary: "Sophomore at a top university in a pre-med program. First-generation college student from a low-income immigrant family. Came to therapy reluctantly — sees it as vulnerability. Meets every other week due to financial constraints.",
    context: [
      "Treatment goals: self-compassion, separate self-worth from grades, challenge imposter syndrome",
      "Diagnoses: GAD, MDD (mild-moderate) · No medication currently",
      "Key triggers: exam results, calls home about grades, seeing peers succeed, scholarship pressure",
      "Last session: got a lower midterm grade, catastrophized about losing scholarship — walked through actual requirements vs. fear",
      "Session frequency: every other week (financial constraint)",
    ],
    chatDemo: "Try: \"I got a bad grade and I feel like everything is ruined. My parents sacrificed so much for me to be here.\"",
    checkinNote: "Sliders: Anxiety + Energy. Buttons: Academic check-in + GRAPES + Self-care. Dashboard shows per-slider trend charts — one graph per metric.",
  },
];

const FEATURES = [
  { icon: "📅", label: "Calendar date picker", desc: "Pick any past date for a check-in — useful for late-night logging or backdating a missed day." },
  { icon: "✨", label: "AI journal prompts", desc: "Claude generates a personalized prompt based on mood + therapist context. Hit ↺ to get a genuinely different one." },
  { icon: "💬", label: "Conversation starters", desc: "Chat opens with 3 AI-generated starter questions. Tapping one seeds the chatbot's first message without counting as user input." },
  { icon: "🛡️", label: "Safety guardrail", desc: "Every chatbot automatically detects SI/self-harm language and responds with de-escalation, crisis resources (988, Crisis Text Line), and human support reminders." },
  { icon: "📊", label: "Per-slider trend charts", desc: "Therapist dashboard shows one chart per slider metric — separate graphs make it easy to spot isolated changes." },
  { icon: "⚙️", label: "Live config sync", desc: "When a therapist updates a client's check-in form, the change reflects on the client side instantly (same browser session)." },
  { icon: "🧠", label: "AI client overview", desc: "Dashboard auto-summarizes each chatbot session for the therapist — themes, concerns, coping strategies, and tone." },
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

        <div className="guide-features">
          <h3 className="guide-features-title">Feature highlights</h3>
          <div className="guide-features-grid">
            {FEATURES.map(f => (
              <div key={f.label} className="guide-feature-item">
                <span className="guide-feature-icon">{f.icon}</span>
                <div>
                  <strong>{f.label}</strong>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="guide-footer">
          <p>Switch between clients using the <strong>Client dropdown</strong> in the navbar.</p>
          <p>Run <code>python seed_demo.py</code> in the backend to populate Redis with sample data.</p>
        </div>
      </div>
    </div>
  );
}
