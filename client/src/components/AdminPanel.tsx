import { useState, useRef, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import AdminCaseList from "./AdminCaseList";
import ChatView from "./ChatView";
import type { CaseItem, Message } from "./UserPanel";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/+$/, "");
const ACCENT_COLOR = "#7c3aed";

/**
 * Oversight + intervention console: admin sees every case chat (not just ones they're
 * a party to) and can send into any of them like a third participant. Deliberately
 * lighter-weight than UserPanel — no unread-by-me tracking, no auto message-ack/read
 * (an admin observing a thread must never flip the customer's or manager's read
 * receipts), and cases/messages are fetched from the /api/admin/* endpoints instead.
 */
export default function AdminPanel() {
  const [userId, setUserId] = useState("adm1");
  const [statusMsg, setStatusMsg] = useState("");
  const [view, setView] = useState<"login" | "app">("login");
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "reconnecting">("connected");

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [messagesByCaseId, setMessagesByCaseId] = useState<Record<string, Message[]>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef("");
  const resolvedUserIdRef = useRef("");
  const selectedCaseIdRef = useRef<string | null>(null);
  const hasConnectedOnceRef = useRef(false);

  useEffect(() => {
    selectedCaseIdRef.current = selectedCaseId;
  }, [selectedCaseId]);

  const refreshCases = useCallback(async (token: string) => {
    const { data } = await axios.get(`${API_URL}/api/admin/cases`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = data.data as CaseItem[];
    setCases(list);
    return list;
  }, []);

  function bumpToTop(list: CaseItem[], caseId: string, lastMessageAt: string): CaseItem[] {
    const rest = list.filter((c) => c.caseId !== caseId);
    const target = list.find((c) => c.caseId === caseId);
    if (!target) return list;
    return [{ ...target, lastMessageAt }, ...rest];
  }

  async function connect() {
    setStatusMsg("Connecting…");
    try {
      const { data: auth } = await axios.post(`${API_URL}/auth/token`, { userId, role: "ADMIN" });
      const token: string = auth.token;
      tokenRef.current = token;
      setResolvedUserId(auth.userId);
      resolvedUserIdRef.current = auth.userId;

      await refreshCases(token);

      const socket = io(API_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
      });

      socket.on("connect", async () => {
        setStatusMsg("");
        if (!hasConnectedOnceRef.current) {
          hasConnectedOnceRef.current = true;
          setView("app");
          setConnectionStatus("connected");
          return;
        }
        // Reconnected after a drop — resync the case list and, if a case is open,
        // rejoin its observer room and refetch its messages.
        try {
          await refreshCases(tokenRef.current);
          const openCaseId = selectedCaseIdRef.current;
          if (openCaseId) {
            if (!socket.recovered) socket.emit("join-case", openCaseId);
            const { data } = await axios.get(`${API_URL}/api/admin/cases/${openCaseId}/messages`, {
              headers: { Authorization: `Bearer ${tokenRef.current}` },
            });
            setMessagesByCaseId((prev) => ({ ...prev, [openCaseId]: data.data as Message[] }));
          }
        } catch {
          // Best-effort resync — reselecting the case will retry.
        }
        setConnectionStatus("connected");
      });

      socket.on("connect_error", (err) => {
        if (/token/i.test(err.message)) {
          socket.disconnect();
          socketRef.current = null;
          hasConnectedOnceRef.current = false;
          setView("login");
          setConnectionStatus("connected");
          setStatusMsg(`Session expired — please reconnect. (${err.message})`);
          resetAppState();
          return;
        }
        setConnectionStatus("reconnecting");
        setStatusMsg(`Reconnecting… (${err.message})`);
      });

      socket.on("disconnect", (reason) => {
        if (reason === "io client disconnect") {
          hasConnectedOnceRef.current = false;
          setView("login");
          setStatusMsg("");
          setConnectionStatus("connected");
          resetAppState();
          return;
        }
        setConnectionStatus("reconnecting");
        setStatusMsg("Connection lost — reconnecting…");
      });

      // Never emits message-ack / message-read here — observing a thread as admin
      // must not affect the customer's or manager's delivery/read receipts.
      socket.on("new-message", (msg: Message) => {
        const { caseId } = msg;
        setMessagesByCaseId((prev) => {
          if (!prev[caseId]) return prev;
          if (prev[caseId].find((m) => m.id === msg.id)) return prev;
          return { ...prev, [caseId]: [...prev[caseId], msg] };
        });
        setCases((prev) =>
          bumpToTop(
            prev.map((c) => (c.caseId === caseId ? { ...c, messages: [msg] } : c)),
            caseId,
            msg.createdAt,
          ),
        );
      });

      socket.on(
        "user-typing",
        ({ caseId, isTyping }: { userId: string; caseId: string; isTyping: boolean }) => {
          setTypingByCaseId((prev) => ({ ...prev, [caseId]: isTyping }));
        },
      );

      socketRef.current = socket;
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.error ?? err.message) : String(err);
      setStatusMsg(`Failed: ${msg}`);
    }
  }

  const [typingByCaseId, setTypingByCaseId] = useState<Record<string, boolean>>({});

  function resetAppState() {
    setCases([]);
    setSelectedCaseId(null);
    setMessagesByCaseId({});
    setTypingByCaseId({});
  }

  function disconnect() {
    socketRef.current?.disconnect();
    socketRef.current = null;
    hasConnectedOnceRef.current = false;
    setView("login");
    setStatusMsg("");
    setConnectionStatus("connected");
    resetAppState();
  }

  async function addCase(caseId: string, customerId: string, caseManagerId: string, caseNumber: string) {
    try {
      await axios.post(
        `${API_URL}/api/cases`,
        { caseId, customerId, caseManagerId, caseNumber: caseNumber || undefined },
        { headers: { Authorization: `Bearer ${tokenRef.current}` } },
      );
      await refreshCases(tokenRef.current);
      return { success: true };
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.error ?? err.message) : String(err);
      return { success: false, error: msg };
    }
  }

  async function selectCase(newCaseId: string) {
    const socket = socketRef.current;
    if (!socket) return;

    if (selectedCaseId && selectedCaseId !== newCaseId) socket.emit("leave-case", selectedCaseId);
    socket.emit("join-case", newCaseId);
    setSelectedCaseId(newCaseId);

    if (!messagesByCaseId[newCaseId]) {
      setLoadingMessages(true);
      try {
        const { data } = await axios.get(`${API_URL}/api/admin/cases/${newCaseId}/messages`, {
          headers: { Authorization: `Bearer ${tokenRef.current}` },
        });
        setMessagesByCaseId((prev) => ({ ...prev, [newCaseId]: data.data as Message[] }));
      } finally {
        setLoadingMessages(false);
      }
    }
  }

  function sendMessage(content: string, replyToId?: string) {
    const socket = socketRef.current;
    if (!socket || !selectedCaseId || !content.trim()) return;

    const replyToMsg = replyToId ? messagesByCaseId[selectedCaseId]?.find((m) => m.id === replyToId) : undefined;
    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      caseChatId: "",
      caseId: selectedCaseId,
      senderId: resolvedUserId,
      senderRole: "ADMIN",
      content: content.trim(),
      type: "TEXT",
      deliveredAt: null,
      readAt: null,
      createdAt: new Date().toISOString(),
      replyTo: replyToMsg
        ? { id: replyToMsg.id, senderId: replyToMsg.senderId, senderRole: replyToMsg.senderRole, content: replyToMsg.content }
        : null,
    };

    const caseIdAtSend = selectedCaseId;
    setMessagesByCaseId((prev) => ({ ...prev, [caseIdAtSend]: [...(prev[caseIdAtSend] ?? []), optimistic] }));
    setCases((prev) =>
      bumpToTop(
        prev.map((c) => (c.caseId === caseIdAtSend ? { ...c, messages: [optimistic] } : c)),
        caseIdAtSend,
        optimistic.createdAt,
      ),
    );

    socket.emit(
      "send-message",
      { caseId: caseIdAtSend, content: content.trim(), tempId, replyToMessageId: replyToId },
      (res: { success?: boolean; message?: Message; tempId?: string; error?: string }) => {
        if (res?.success && res.message) {
          setMessagesByCaseId((prev) => ({
            ...prev,
            [caseIdAtSend]: (prev[caseIdAtSend] ?? []).map((m) => (m.id === tempId ? res.message! : m)),
          }));
        } else {
          setMessagesByCaseId((prev) => ({
            ...prev,
            [caseIdAtSend]: (prev[caseIdAtSend] ?? []).filter((m) => m.id !== tempId),
          }));
        }
      },
    );
  }

  function sendTyping(isTyping: boolean) {
    if (selectedCaseId) socketRef.current?.emit("typing", { caseId: selectedCaseId, isTyping });
  }

  if (view === "login") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc", minWidth: 0 }}>
        <div style={{ padding: "12px 16px", background: ACCENT_COLOR, color: "white" }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Admin</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>○ not connected</div>
        </div>
        <div style={{ padding: 24, maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
            Oversight console — view and intervene in any case conversation
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Admin ID</label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. adm1, adm2..."
              style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, width: "100%", outline: "none", background: "white", boxSizing: "border-box" }}
            />
          </div>
          <button
            onClick={connect}
            style={{ marginTop: 4, padding: "10px 0", background: ACCENT_COLOR, color: "white", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            Connect
          </button>
          {statusMsg && <div style={{ fontSize: 12, color: "#dc2626" }}>{statusMsg}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", background: ACCENT_COLOR, color: "white", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Admin</span>
          <span style={{ fontSize: 12, opacity: 0.75, marginLeft: 8 }}>● {userId}</span>
          {connectionStatus === "reconnecting" && (
            <span
              style={{
                fontSize: 11, fontWeight: 600, marginLeft: 10, padding: "2px 8px", borderRadius: 10,
                background: "rgba(0,0,0,0.2)", display: "inline-flex", alignItems: "center", gap: 5,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", animation: "nos-pulse 1.2s ease-in-out infinite" }} />
              Reconnecting…
            </span>
          )}
        </div>
        <button
          onClick={disconnect}
          style={{ fontSize: 11, background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 5, color: "white", padding: "4px 10px", cursor: "pointer" }}
        >
          Disconnect
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <AdminCaseList
          cases={cases}
          selectedCaseId={selectedCaseId}
          currentResolvedUserId={resolvedUserId}
          accentColor={ACCENT_COLOR}
          onSelectCase={selectCase}
          onAddCase={addCase}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#f1f5f9" }}>
          {selectedCaseId ? (
            <ChatView
              key={selectedCaseId}
              caseId={selectedCaseId}
              caseTitle={cases.find((c) => c.caseId === selectedCaseId)?.caseNumber ?? selectedCaseId}
              userId={resolvedUserId}
              accentColor={ACCENT_COLOR}
              messages={messagesByCaseId[selectedCaseId] ?? []}
              isTyping={typingByCaseId[selectedCaseId] ?? false}
              isLoading={loadingMessages}
              onSend={sendMessage}
              onTyping={sendTyping}
            />
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#94a3b8" }}>
              <div style={{ fontSize: 32 }}>🛡️</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Select a case to observe or step in</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
