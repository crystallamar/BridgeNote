const BASE = "";  // proxied to http://localhost:8000

export const api = {
  // Check-ins
  async createCheckin(data) {
    const res = await fetch(`${BASE}/checkin/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getRecentCheckins(clientId, limit = 7) {
    const res = await fetch(`${BASE}/checkin/recent/${clientId}?limit=${limit}`);
    return res.json();
  },

  async getJournalPrompt(clientId, moodScore, moodLabel, previousPrompt = null) {
    const res = await fetch(`${BASE}/checkin/journal-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        mood_score: moodScore,
        mood_label: moodLabel,
        previous_prompt: previousPrompt,
      }),
    });
    return res.json();
  },

  // Chat
  async startConversation(clientId) {
    const res = await fetch(`${BASE}/chat/start?client_id=${clientId}`, { method: "POST" });
    return res.json();
  },

  async getChatHistory(conversationId) {
    const res = await fetch(`${BASE}/chat/history/${conversationId}`);
    return res.json();
  },

  // Therapist
  async upsertTherapistContext(context) {
    const res = await fetch(`${BASE}/therapist/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    });
    return res.json();
  },

  async getTherapistDashboard(clientId) {
    const res = await fetch(`${BASE}/therapist/dashboard/${clientId}`);
    return res.json();
  },

  async getTherapistContext(clientId) {
    const res = await fetch(`${BASE}/therapist/context/${clientId}`);
    if (!res.ok) return null;
    return res.json();
  },

  async getCheckinConfig(clientId) {
    const res = await fetch(`${BASE}/checkin/config/${clientId}`);
    if (!res.ok) return null;
    return res.json();
  },

  async saveCheckinConfig(clientId, config) {
    const res = await fetch(`${BASE}/checkin/config/${clientId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  // Streaming chat — returns an EventSource-like async generator
  streamMessage(clientId, message, conversationId = null) {
    return fetch(`${BASE}/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        message,
        conversation_id: conversationId,
      }),
    });
  },
};
