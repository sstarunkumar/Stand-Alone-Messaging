import { useState } from 'react';
import type { CaseItem, Message } from './UserPanel';

function shortId(id: string): string {
  return id.length > 8 ? `…${id.slice(-6)}` : id;
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

interface Props {
  cases: CaseItem[];
  selectedCaseId: string | null;
  currentResolvedUserId: string;
  accentColor: string;
  onSelectCase: (caseId: string) => void;
  onAddCase: (
    caseId: string,
    customerId: string,
    caseManagerId: string,
    caseNumber: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Admin's view of every case chat in the system (not just ones they're a party to).
 * Provisioning (pairing a customer + case manager into a chat) lives here rather than
 * on the customer/manager panels — that's a backend/system action in the real NOS
 * integration (see API.md §3), so only an admin token can call POST /api/cases.
 */
export default function AdminCaseList({ cases, selectedCaseId, currentResolvedUserId, accentColor, onSelectCase, onAddCase }: Props) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formCaseId, setFormCaseId] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formManagerId, setFormManagerId] = useState('');
  const [formCaseNumber, setFormCaseNumber] = useState('');
  const [formError, setFormError] = useState('');
  const [adding, setAdding] = useState(false);

  function caseTitle(c: CaseItem): string {
    return c.caseNumber ?? c.caseId;
  }

  function lastMsgPreview(lastMsg: Message | undefined): string {
    if (!lastMsg) return 'No messages yet';
    const prefix = lastMsg.senderId === currentResolvedUserId ? 'You' : lastMsg.senderRole;
    const text = lastMsg.content.length > 32 ? lastMsg.content.slice(0, 32) + '…' : lastMsg.content;
    return `${prefix}: ${text}`;
  }

  const filtered = search.trim()
    ? cases.filter((c) => caseTitle(c).toLowerCase().includes(search.toLowerCase()))
    : cases;

  async function handleAdd() {
    if (!formCaseId.trim() || !formCustomerId.trim() || !formManagerId.trim()) {
      setFormError('Case ID, customer ID, and manager ID are required');
      return;
    }
    setAdding(true);
    setFormError('');
    const result = await onAddCase(formCaseId.trim(), formCustomerId.trim(), formManagerId.trim(), formCaseNumber.trim());
    setAdding(false);
    if (result.success) {
      setShowForm(false);
      setFormCaseId('');
      setFormCustomerId('');
      setFormManagerId('');
      setFormCaseNumber('');
    } else {
      setFormError(result.error ?? 'Failed to provision case chat');
    }
  }

  return (
    <div style={{ width: 270, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: 'white', flexShrink: 0 }}>
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: '#0f172a', letterSpacing: -0.2 }}>All Case Conversations</span>
          <button
            onClick={() => { setShowForm((v) => !v); setFormError(''); }}
            title={showForm ? 'Cancel' : 'Provision a case chat'}
            style={{
              width: 26, height: 26, borderRadius: '50%', background: showForm ? '#e2e8f0' : accentColor,
              border: 'none', color: showForm ? '#475569' : 'white',
              fontSize: 18, fontWeight: 300, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {showForm ? '×' : '+'}
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8' }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cases…"
            style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {showForm && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Provision case chat
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input placeholder="Case ID (e.g. case1, case2, or an ObjectId)" value={formCaseId} onChange={(e) => setFormCaseId(e.target.value)} style={miniInput} />
            <input placeholder="Customer ID (e.g. cust1)" value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)} style={miniInput} />
            <input placeholder="Case Manager ID (e.g. cm1)" value={formManagerId} onChange={(e) => setFormManagerId(e.target.value)} style={miniInput} />
            <input placeholder="Case number / label (optional)" value={formCaseNumber} onChange={(e) => setFormCaseNumber(e.target.value)} style={miniInput} />
            {formError && <div style={{ fontSize: 11, color: '#dc2626' }}>{formError}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <button onClick={() => setShowForm(false)} style={{ ...miniBtn, background: '#e2e8f0', color: '#475569', flex: 1 }}>Cancel</button>
              <button onClick={handleAdd} disabled={adding} style={{ ...miniBtn, background: accentColor, color: 'white', flex: 2 }}>
                {adding ? 'Provisioning…' : 'Provision'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '32px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 12, lineHeight: 1.6 }}>
            {cases.length === 0 ? <>No case chats exist yet.<br />Click <strong>+</strong> to provision one.</> : 'No cases match your search'}
          </div>
        )}

        {filtered.map((c) => {
          const lastMsg = c.messages?.[0];
          const unread = c.unreadCount ?? 0;
          const isSelected = c.caseId === selectedCaseId;
          const title = caseTitle(c);

          return (
            <div
              key={c.caseId}
              onClick={() => onSelectCase(c.caseId)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                background: isSelected ? `${accentColor}12` : 'white',
                borderLeft: `3px solid ${isSelected ? accentColor : 'transparent'}`,
                borderBottom: '1px solid #f8fafc',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                  {title}
                </span>
                {lastMsg && (
                  <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>{formatTime(lastMsg.createdAt)}</span>
                )}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
                Customer {shortId(c.customerId)} ↔ Manager {shortId(c.caseManagerId)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {lastMsgPreview(lastMsg)}
                </span>
                {unread > 0 && (
                  <div
                    title="Total unread across both parties"
                    style={{
                      background: '#f59e0b', color: 'white', borderRadius: 10,
                      minWidth: 18, height: 18, fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 5px', flexShrink: 0, marginLeft: 6,
                    }}
                  >
                    {unread > 99 ? '99+' : unread}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const miniInput: React.CSSProperties = {
  padding: '6px 9px', borderRadius: 5, border: '1px solid #e2e8f0',
  fontSize: 12, width: '100%', outline: 'none', boxSizing: 'border-box',
};

const miniBtn: React.CSSProperties = {
  padding: '6px 0', border: 'none', borderRadius: 5,
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
};
