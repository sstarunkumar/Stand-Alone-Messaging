import { useState, useEffect, useRef } from "react";
import type { Message } from "./UserPanel";

interface Props {
  caseId: string;
  caseTitle: string;
  userId: string;
  accentColor: string;
  messages: Message[];
  isTyping: boolean;
  isLoading: boolean;
  onSend: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
}

export default function ChatView({
  caseId,
  caseTitle,
  userId,
  accentColor,
  messages,
  isTyping,
  isLoading,
  onSend,
  onTyping,
}: Props) {
  const [input, setInput] = useState("");
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [caseId]);

  function handleInputChange(val: string) {
    setInput(val);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTyping(false);
    }, 1500);
  }

  function handleSend() {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping(false);
    }
  }

  function deliveryStatus(
    msg: Message,
  ): { symbol: string; color: string } | null {
    if (msg.senderId !== userId) return null;
    if (msg.id.startsWith("temp_"))
      return { symbol: "⋯", color: "rgba(255,255,255,0.45)" };
    if (msg.readAt) return { symbol: "✓✓", color: "#93c5fd" };
    if (msg.deliveredAt)
      return { symbol: "✓✓", color: "rgba(255,255,255,0.6)" };
    return { symbol: "✓", color: "rgba(255,255,255,0.6)" };
  }

  function groupedMessages() {
    const groups: { dateLabel: string; msgs: Message[] }[] = [];
    let lastDate = "";
    for (const msg of messages) {
      const d = new Date(msg.createdAt);
      const label = d.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (label !== lastDate) {
        groups.push({ dateLabel: label, msgs: [msg] });
        lastDate = label;
      } else {
        groups[groups.length - 1].msgs.push(msg);
      }
    }
    return groups;
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* Chat header */}
      <div
        style={{
          padding: "10px 16px",
          background: "white",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: accentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {caseTitle
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>
            {caseTitle}
          </div>
          <div
            style={{
              fontSize: 11,
              color: isTyping ? accentColor : "#94a3b8",
              transition: "color 0.2s",
            }}
          >
            {isTyping ? "typing…" : "Case conversation"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {isLoading && (
          <div
            style={{
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 12,
              padding: 24,
            }}
          >
            Loading messages…
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#cbd5e1",
              gap: 6,
              paddingTop: 60,
            }}
          >
            <div style={{ fontSize: 28 }}>💬</div>
            <div style={{ fontSize: 13 }}>No messages yet — say hello!</div>
          </div>
        )}

        {groupedMessages().map((group) => (
          <div key={group.dateLabel}>
            {/* Date divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "12px 0 8px",
              }}
            >
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
                {group.dateLabel}
              </span>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            </div>

            {group.msgs.map((msg, i) => {
              const mine = msg.senderId === userId;
              const ds = deliveryStatus(msg);
              const prevMsg = group.msgs[i - 1];
              const isFirstInBlock =
                !prevMsg || prevMsg.senderId !== msg.senderId;

              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: mine ? "flex-end" : "flex-start",
                    marginBottom: 3,
                  }}
                >
                  {/* Avatar for first message in a block from other person */}
                  {!mine && (
                    <div
                      style={{
                        width: 28,
                        marginRight: 6,
                        flexShrink: 0,
                        alignSelf: "flex-end",
                      }}
                    >
                      {isFirstInBlock && (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: accentColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {msg.senderRole === "CUSTOMER" ? "C" : "M"}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      maxWidth: "68%",
                      background: mine ? accentColor : "white",
                      color: mine ? "white" : "#1e293b",
                      borderRadius: mine
                        ? isFirstInBlock
                          ? "18px 18px 4px 18px"
                          : "18px 4px 4px 18px"
                        : isFirstInBlock
                          ? "18px 18px 18px 4px"
                          : "4px 18px 18px 4px",
                      padding: "9px 12px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                      fontSize: 14,
                      lineHeight: 1.45,
                    }}
                  >
                    {!mine && isFirstInBlock && (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          marginBottom: 3,
                          opacity: 0.5,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {msg.senderRole}
                      </div>
                    )}
                    <div style={{ wordBreak: "break-word" }}>{msg.content}</div>
                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 4,
                        opacity: mine ? 0.75 : 0.55,
                        textAlign: "right",
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {ds && (
                        <span
                          style={{
                            color: ds.color,
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          {ds.symbol}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          padding: "10px 14px",
          background: "white",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          gap: 8,
          flexShrink: 0,
          alignItems: "flex-end",
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Message ....`}
          style={{
            flex: 1,
            padding: "9px 14px",
            borderRadius: 22,
            border: "1.5px solid #e2e8f0",
            outline: "none",
            fontSize: 14,
            background: "#f8fafc",
            lineHeight: 1.4,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            border: "none",
            flexShrink: 0,
            background: input.trim() ? accentColor : "#e2e8f0",
            color: input.trim() ? "white" : "#94a3b8",
            fontSize: 16,
            cursor: input.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
