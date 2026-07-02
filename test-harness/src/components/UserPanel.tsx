import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import CaseList from './CaseList';
import ChatView from './ChatView';

const API_URL = 'http://localhost:4000';

export interface Message {
  id: string;
  caseChatId: string;
  caseId: string;
  senderId: string;
  senderRole: string;
  content: string;
  type: string;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CaseItem {
  id: string;
  caseId: string;
  caseNumber: string | null;
  customerId: string;
  caseManagerId: string;
  lastMessageAt: string | null;
  createdAt: string;
  messages: Message[];
}

interface Props {
  panelRole: 'CUSTOMER' | 'CASE_MANAGER';
  defaultUserId: string;
  accentColor: string;
  label: string;
}

export default function UserPanel({ panelRole, defaultUserId, accentColor, label }: Props) {
  const [userId, setUserId] = useState(defaultUserId);
  const [role, setRole] = useState<'CUSTOMER' | 'CASE_MANAGER'>(panelRole);
  const [statusMsg, setStatusMsg] = useState('');
  const [view, setView] = useState<'login' | 'app'>('login');

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [messagesByCaseId, setMessagesByCaseId] = useState<Record<string, Message[]>>({});
  const [unreadByCaseId, setUnreadByCaseId] = useState<Record<string, number>>({});
  const [typingByCaseId, setTypingByCaseId] = useState<Record<string, boolean>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);

  // userId holds whatever was typed at login (e.g. "cust1") — used only as the
  // login field value and header label. All identity comparisons (mine/unread/
  // read-receipts) must use the real id the server resolved the alias to.
  const [resolvedUserId, setResolvedUserId] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef('');
  const resolvedUserIdRef = useRef('');
  const selectedCaseIdRef = useRef<string | null>(null);
  const messagesByCaseIdRef = useRef<Record<string, Message[]>>({});

  useEffect(() => { selectedCaseIdRef.current = selectedCaseId; }, [selectedCaseId]);
  useEffect(() => { messagesByCaseIdRef.current = messagesByCaseId; }, [messagesByCaseId]);

  const refreshCases = useCallback(async (token: string) => {
    const { data } = await axios.get(`${API_URL}/api/cases`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = data.data as CaseItem[];
    setCases(list);
    return list;
  }, []);

  function bumpToTop(list: CaseItem[], caseId: string, lastMessageAt: string): CaseItem[] {
    const rest = list.filter(c => c.caseId !== caseId);
    const target = list.find(c => c.caseId === caseId);
    if (!target) return list;
    return [{ ...target, lastMessageAt }, ...rest];
  }

  async function connect() {
    setStatusMsg('Connecting…');
    try {
      const { data: auth } = await axios.post(`${API_URL}/auth/token`, { userId, role });
      const token: string = auth.token;
      tokenRef.current = token;
      setResolvedUserId(auth.userId);
      resolvedUserIdRef.current = auth.userId;

      const caseList = await refreshCases(token);

      const socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });

      socket.on('connect', () => {
        // Join all existing case rooms so we receive typing + messages
        caseList.forEach((c: CaseItem) => socket.emit('join-case', c.caseId));
        setView('app');
        setStatusMsg('');
      });

      socket.on('connect_error', (err) => setStatusMsg(`Connection error: ${err.message}`));

      socket.on('new-message', (msg: Message) => {
        const { caseId } = msg;
        const currentUser = resolvedUserIdRef.current;
        const currentCaseId = selectedCaseIdRef.current;

        setMessagesByCaseId(prev => {
          const existing = prev[caseId] ?? [];
          if (existing.find(m => m.id === msg.id)) return prev;
          return { ...prev, [caseId]: [...existing, msg] };
        });

        // Update last-message preview and float the conversation to the top of the sidebar
        setCases(prev => bumpToTop(prev.map(c => c.caseId === caseId ? { ...c, messages: [msg] } : c), caseId, msg.createdAt));

        socket.emit('message-ack', msg.id);

        if (msg.senderId !== currentUser) {
          if (currentCaseId === caseId) {
            socket.emit('message-read', msg.id);
          } else {
            setUnreadByCaseId(prev => ({ ...prev, [caseId]: (prev[caseId] ?? 0) + 1 }));
          }
        }
      });

      socket.on('case-read', ({ caseId, readAt }: { caseId: string; readBy: string; readAt: string }) => {
        // The other party just bulk-read our messages in this case — flip our sent messages to "read".
        setMessagesByCaseId(prev => {
          const existing = prev[caseId];
          if (!existing) return prev;
          return {
            ...prev,
            [caseId]: existing.map(m => (m.senderId === resolvedUserIdRef.current && !m.readAt ? { ...m, readAt } : m)),
          };
        });
      });

      socket.on('message-delivered', ({ messageId, deliveredAt }: { messageId: string; deliveredAt: string }) => {
        setMessagesByCaseId(prev => {
          const updated: Record<string, Message[]> = {};
          for (const k of Object.keys(prev)) {
            updated[k] = prev[k].map(m => m.id === messageId ? { ...m, deliveredAt } : m);
          }
          return updated;
        });
      });

      socket.on('message-read', ({ messageId, readAt }: { messageId: string; readAt: string }) => {
        setMessagesByCaseId(prev => {
          const updated: Record<string, Message[]> = {};
          for (const k of Object.keys(prev)) {
            updated[k] = prev[k].map(m => m.id === messageId ? { ...m, readAt } : m);
          }
          return updated;
        });
      });

      socket.on('user-typing', ({ caseId, isTyping }: { userId: string; caseId: string; isTyping: boolean }) => {
        setTypingByCaseId(prev => ({ ...prev, [caseId]: isTyping }));
      });

      socket.on('disconnect', () => {
        setView('login');
        setStatusMsg('Disconnected');
        resetAppState();
      });

      socketRef.current = socket;
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : String(err);
      setStatusMsg(`Failed: ${msg}`);
    }
  }

  function resetAppState() {
    setCases([]);
    setSelectedCaseId(null);
    setMessagesByCaseId({});
    setUnreadByCaseId({});
    setTypingByCaseId({});
  }

  function disconnect() {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setView('login');
    setStatusMsg('');
    resetAppState();
  }

  async function markCaseReadOnServer(caseId: string) {
    try {
      await axios.put(`${API_URL}/api/cases/${caseId}/read`, {}, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
    } catch {
      // Best-effort — the other party just won't see the read receipt live.
    }
  }

  async function selectCase(newCaseId: string) {
    const socket = socketRef.current;
    if (!socket) return;

    if (selectedCaseId && selectedCaseId !== newCaseId) {
      socket.emit('typing', { caseId: selectedCaseId, isTyping: false });
    }

    socket.emit('join-case', newCaseId);
    setSelectedCaseId(newCaseId);
    setUnreadByCaseId(prev => ({ ...prev, [newCaseId]: 0 }));

    const hasUnreadFromOthers = (msgs: Message[]) =>
      msgs.some(m => m.senderId !== resolvedUserIdRef.current && !m.readAt);

    if (!messagesByCaseIdRef.current[newCaseId]) {
      setLoadingMessages(true);
      try {
        const { data } = await axios.get(`${API_URL}/api/cases/${newCaseId}/messages`, {
          headers: { Authorization: `Bearer ${tokenRef.current}` },
        });
        const msgs = data.data as Message[];
        setMessagesByCaseId(prev => ({ ...prev, [newCaseId]: msgs }));
        if (hasUnreadFromOthers(msgs)) await markCaseReadOnServer(newCaseId);
      } finally {
        setLoadingMessages(false);
      }
    } else if (hasUnreadFromOthers(messagesByCaseIdRef.current[newCaseId])) {
      await markCaseReadOnServer(newCaseId);
    }
  }

  function sendMessage(content: string) {
    const socket = socketRef.current;
    if (!socket || !selectedCaseId || !content.trim()) return;

    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      id: tempId, caseChatId: '', caseId: selectedCaseId,
      senderId: resolvedUserId, senderRole: role,
      content: content.trim(), type: 'TEXT',
      deliveredAt: null, readAt: null, createdAt: new Date().toISOString(),
    };

    const caseIdAtSend = selectedCaseId;
    setMessagesByCaseId(prev => ({ ...prev, [caseIdAtSend]: [...(prev[caseIdAtSend] ?? []), optimistic] }));
    setCases(prev => prev.map(c => c.caseId === caseIdAtSend ? { ...c, messages: [optimistic] } : c));

    socket.emit('send-message', { caseId: caseIdAtSend, content: content.trim(), tempId },
      (res: { success?: boolean; message?: Message; tempId?: string; error?: string }) => {
        if (res?.success && res.message) {
          setMessagesByCaseId(prev => ({
            ...prev,
            [caseIdAtSend]: (prev[caseIdAtSend] ?? []).map(m => m.id === tempId ? res.message! : m),
          }));
          setCases(prev => prev.map(c => c.caseId === caseIdAtSend ? { ...c, messages: [res.message!] } : c));
        } else {
          setMessagesByCaseId(prev => ({
            ...prev,
            [caseIdAtSend]: (prev[caseIdAtSend] ?? []).filter(m => m.id !== tempId),
          }));
        }
      }
    );
  }

  function sendTyping(isTyping: boolean) {
    if (selectedCaseId) socketRef.current?.emit('typing', { caseId: selectedCaseId, isTyping });
  }

  async function addCase(caseId: string, customerId: string, caseManagerId: string) {
    try {
      await axios.post(`${API_URL}/api/cases`, { caseId, customerId, caseManagerId },
        { headers: { Authorization: `Bearer ${tokenRef.current}` } });
      await refreshCases(tokenRef.current);
      socketRef.current?.emit('join-case', caseId);
      return { success: true };
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  if (view === 'login') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', minWidth: 0 }}>
        <div style={{ padding: '12px 16px', background: accentColor, color: 'white' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>○ not connected</div>
        </div>
        <div style={{ padding: 24, maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Sign in to access your case conversations</div>
          <Field label="User ID">
            <input value={userId} onChange={e => setUserId(e.target.value)} style={inputCss} placeholder="e.g. cust1, cust2, cm1, cm2..." />
          </Field>
          <Field label="Role">
            <select value={role} onChange={e => setRole(e.target.value as 'CUSTOMER' | 'CASE_MANAGER')} style={inputCss}>
              <option value="CUSTOMER">CUSTOMER</option>
              <option value="CASE_MANAGER">CASE_MANAGER</option>
            </select>
          </Field>
          <button onClick={connect} style={{ marginTop: 4, padding: '10px 0', background: accentColor, color: 'white', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Connect
          </button>
          {statusMsg && <div style={{ fontSize: 12, color: '#dc2626' }}>{statusMsg}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', background: accentColor, color: 'white', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
          <span style={{ fontSize: 12, opacity: 0.75, marginLeft: 8 }}>● {userId}</span>
        </div>
        <button onClick={disconnect} style={{ fontSize: 11, background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 5, color: 'white', padding: '4px 10px', cursor: 'pointer' }}>
          Disconnect
        </button>
      </div>

      {/* Body: sidebar + chat */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <CaseList
          cases={cases}
          selectedCaseId={selectedCaseId}
          unreadByCaseId={unreadByCaseId}
          currentUserId={userId}
          currentResolvedUserId={resolvedUserId}
          currentRole={role}
          accentColor={accentColor}
          onSelectCase={selectCase}
          onAddCase={addCase}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#f1f5f9' }}>
          {selectedCaseId ? (
            <ChatView
              key={selectedCaseId}
              caseId={selectedCaseId}
              caseTitle={cases.find(c => c.caseId === selectedCaseId)?.caseNumber ?? selectedCaseId}
              userId={resolvedUserId}
              accentColor={accentColor}
              messages={messagesByCaseId[selectedCaseId] ?? []}
              isTyping={typingByCaseId[selectedCaseId] ?? false}
              isLoading={loadingMessages}
              onSend={sendMessage}
              onTyping={sendTyping}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8' }}>
              <div style={{ fontSize: 32 }}>💬</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Select a case to start chatting</div>
              <div style={{ fontSize: 12 }}>or click + in the sidebar to add a new case</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{label}</label>
      {children}
    </div>
  );
}

const inputCss: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1',
  fontSize: 13, width: '100%', outline: 'none', background: 'white',
};
