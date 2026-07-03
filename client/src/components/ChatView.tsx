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
  onSend: (content: string, replyToId?: string) => void;
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
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
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
    onSend(input.trim(), replyTarget?.id);
    setInput("");
    setReplyTarget(null);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping(false);
    }
  }

  function scrollToMessage(id: string) {
    const el = messagesContainerRef.current?.querySelector(
      `[data-msg-id="${id}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMsgId(id);
    setTimeout(() => setHighlightedMsgId((h) => (h === id ? null : h)), 1000);
  }

  function deliveryStatus(
    msg: Message,
  ): { symbol: string; color: string; weight: number; size: number } | null {
    if (msg.senderId !== userId) return null;
    if (msg.id.startsWith("temp_"))
      return { symbol: "⋯", color: "rgba(255,255,255,0.45)", weight: 600, size: 11 };
    // "Seen" ticks are bold + a distinct saturated cyan (with a soft dark shadow for
    // pop) so they read as unmistakably different from the light, thin "delivered"
    // ticks on both the customer's blue theme and the manager's green theme.
    if (msg.readAt)
      return { symbol: "✓✓", color: "#4fe0ff", weight: 900, size: 13 };
    if (msg.deliveredAt)
      return { symbol: "✓✓", color: "rgba(255,255,255,0.6)", weight: 500, size: 11 };
    return { symbol: "✓", color: "rgba(255,255,255,0.6)", weight: 500, size: 11 };
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
        ref={messagesContainerRef}
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
              const showReplyBtn = hoveredMsgId === msg.id;

              const replyButton = (
                <button
                  onClick={() => setReplyTarget(msg)}
                  title="Reply"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: "none",
                    background: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    color: "#64748b",
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    alignSelf: "center",
                    opacity: showReplyBtn ? 1 : 0,
                    transition: "opacity 0.12s",
                  }}
                >
                  ↩
                </button>
              );

              return (
                <div
                  key={msg.id}
                  data-msg-id={msg.id}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() =>
                    setHoveredMsgId((h) => (h === msg.id ? null : h))
                  }
                  style={{
                    display: "flex",
                    justifyContent: mine ? "flex-end" : "flex-start",
                    alignItems: "flex-end",
                    gap: 4,
                    marginBottom: 3,
                  }}
                >
                  {/* Avatar for first message in a block from other person */}
                  {!mine && (
                    <div
                      style={{
                        width: 28,
                        marginRight: 2,
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
                          {msg.senderRole === "CUSTOMER" ? "C" : msg.senderRole === "ADMIN" ? "A" : "M"}
                        </div>
                      )}
                    </div>
                  )}

                  {mine && replyButton}

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
                      animation:
                        highlightedMsgId === msg.id
                          ? "nos-flash-highlight 1s ease-out"
                          : "none",
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
                    {msg.replyTo && (
                      <div
                        onClick={() => scrollToMessage(msg.replyTo!.id)}
                        style={{
                          cursor: "pointer",
                          background: mine
                            ? "rgba(255,255,255,0.18)"
                            : "rgba(15,23,42,0.05)",
                          borderLeft: `3px solid ${
                            mine ? "rgba(255,255,255,0.7)" : accentColor
                          }`,
                          borderRadius: 6,
                          padding: "5px 8px",
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            opacity: 0.85,
                            marginBottom: 1,
                          }}
                        >
                          {msg.replyTo.senderId === userId
                            ? "You"
                            : msg.replyTo.senderRole}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.75,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {msg.replyTo.content}
                        </div>
                      </div>
                    )}
                    <div style={{ wordBreak: "break-word" }}>{msg.content}</div>
                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 4,
                        textAlign: "right",
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      {/* Dim only the timestamp — the delivery ticks carry their own
                          color/weight and must not be washed out by a parent opacity,
                          or the "seen" tick loses the vividness that makes it distinct. */}
                      <span
                        style={{
                          color: mine
                            ? "rgba(255,255,255,0.75)"
                            : "rgba(30,41,59,0.55)",
                        }}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {ds && (
                        <span
                          style={{
                            color: ds.color,
                            fontWeight: ds.weight,
                            fontSize: ds.size,
                            lineHeight: 1,
                            textShadow: msg.readAt
                              ? "0 0 3px rgba(0,0,0,0.35)"
                              : "none",
                          }}
                        >
                          {ds.symbol}
                        </span>
                      )}
                    </div>
                  </div>

                  {!mine && replyButton}
                </div>
              );
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyTarget && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              width: 3,
              alignSelf: "stretch",
              background: accentColor,
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{ fontSize: 11, fontWeight: 700, color: accentColor }}
            >
              Replying to{" "}
              {replyTarget.senderId === userId ? "yourself" : replyTarget.senderRole}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#64748b",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {replyTarget.content}
            </div>
          </div>
          <button
            onClick={() => setReplyTarget(null)}
            title="Cancel reply"
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "none",
              background: "#e2e8f0",
              color: "#475569",
              fontSize: 12,
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input bar */}
      <div
        style={{
          padding: "10px 14px",
          background: "white",
          borderTop: replyTarget ? "none" : "1px solid #e2e8f0",
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
            } else if (e.key === "Escape" && replyTarget) {
              setReplyTarget(null);
            }
          }}
          placeholder={replyTarget ? "Type a reply…" : "Message ...."}
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
