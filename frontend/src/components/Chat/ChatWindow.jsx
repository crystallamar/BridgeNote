import { useState, useRef, useEffect } from "react";
import { useChat } from "../../hooks/useChat";
import "./ChatWindow.css";

const SUGGESTED_STARTERS = [
  "How are you feeling today?",
  "I'd like to talk about something on my mind.",
  "Can you help me with a coping strategy?",
  "I want to reflect on my week.",
];

export default function ChatWindow({ clientId }) {
  const { messages, sendMessage, isStreaming, reset } = useChat(clientId);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-avatar">B</div>
        <div>
          <h2>BridgeNote</h2>
          <p className="chat-subtitle">Your between-session support space</p>
        </div>
        <button className="new-chat-btn" onClick={reset} title="New conversation">
          + New
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-welcome">Hi, I'm here to support you between sessions.</p>
            <p className="chat-welcome-sub">What's on your mind today?</p>
            <div className="starters">
              {SUGGESTED_STARTERS.map((s) => (
                <button key={s} className="starter-btn" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message message--${msg.role} ${msg.error ? "message--error" : ""}`}>
            <div className="message-bubble">
              {msg.content || (msg.role === "assistant" && isStreaming && i === messages.length - 1 ? (
                <span className="typing-indicator"><span /><span /><span /></span>
              ) : null)}
            </div>
            {msg.timestamp && (
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message… (Enter to send)"
          rows={2}
          disabled={isStreaming}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
        >
          {isStreaming ? "…" : "Send"}
        </button>
      </div>

      <p className="chat-disclaimer">
        BridgeNote is not a crisis service. If you're in crisis, call or text 988.
      </p>
    </div>
  );
}
