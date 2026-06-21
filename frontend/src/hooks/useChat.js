import { useState, useRef, useCallback } from "react";
import { api } from "../services/api";

export function useChat(clientId) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(null);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isStreaming) return;

      const userMsg = { role: "user", content: text, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      // Placeholder for streaming assistant response
      const assistantPlaceholder = { role: "assistant", content: "", timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, assistantPlaceholder]);

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const response = await api.streamMessage(clientId, text, conversationId);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let convId = conversationId;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop(); // keep incomplete line

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            const event = JSON.parse(raw);

            if (event.type === "conv_id") {
              convId = event.conversation_id;
              setConversationId(convId);
            } else if (event.type === "text") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + event.content,
                };
                return updated;
              });
            }
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: "Sorry, something went wrong. Please try again.",
              error: true,
            };
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [clientId, conversationId, isStreaming]
  );

  // Add a seeded assistant message (no API call — shows as AI opening question)
  const seedMessage = useCallback((content) => {
    setMessages([{ role: "assistant", content, timestamp: new Date().toISOString() }]);
    setConversationId(null);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return { messages, sendMessage, seedMessage, isStreaming, conversationId, reset };
}
