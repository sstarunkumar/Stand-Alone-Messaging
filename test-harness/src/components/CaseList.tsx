import { useState } from 'react';
import type { CaseItem, Message } from './UserPanel';

const AVATAR_COLORS = [
  ['#3b82f6', '#1d4ed8'], ['#10b981', '#047857'], ['#f59e0b', '#d97706'],
  ['#ef4444', '#dc2626'], ['#8b5cf6', '#7c3aed'], ['#06b6d4', '#0891b2'],
  ['#ec4899', '#db2777'], ['#14b8a6', '#0d9488'], ['#f97316', '#ea580c'],
  ['#6366f1', '#4f46e5'],
];

function avatarGradient(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] as [string, string];
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
  unreadByCaseId: Record<string, number>;
  currentUserId: string;
  currentRole: 'CUSTOMER' | 'CASE_MANAGER';
  accentColor: string;
  onSelectCase: (caseId: string) => void;
  onAddCase: (caseId: string, customerId: string, caseManagerId: string) => Promise<{ success: boolean; error?: string }>;
}

export default function CaseList({ cases, selectedCaseId, unreadByCaseId, currentUserId, currentRole, accentColor, onSelectCase, onAddCase }: Props) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formCaseId, setFormCaseId] = useState('');
  const [formCustomerId, setFormCustomerId] = useState(currentRole === 'CUSTOMER' ? currentUserId : '');
  const [formManagerId, setFormManagerId] = useState(currentRole === 'CASE_MANAGER' ? currentUserId : '');
  const [formError, setFormError] = useState('');
  const [adding, setAdding] = useState(false);

  const filtered = search.trim()
    ? cases.filter(c => c.caseId.toLowerCase().includes(search.toLowerCase()))
    : cases;

  async function handleAdd() {
    if (!formCaseId.trim() || !formCustomerId.trim() || !formManagerId.trim()) {
      setFormError('All fields are required');
      return;
    }
    setAdding(true);
    setFormError('');
    const result = await onAddCase(formCaseId.trim(), formCustomerId.trim(), formManagerId.trim());
    setAdding(false);
    if (result.success) {
      setShowForm(false);
      setFormCaseId('');
    } else {
      setFormError(result.error ?? 'Failed to add case');
    }
  }

  function lastMsgPreview(lastMsg: Message | undefined, currentUserId: string): string {
    if (!lastMsg) return 'No messages yet';
    const prefix = lastMsg.senderId === currentUserId ? 'You: ' : '';
    const text = lastMsg.content.length > 36 ? lastMsg.content.slice(0, 36) + '…' : lastMsg.content;
    return `${prefix}${text}`;
  }

  return (
    <div style={{ width: 250, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: 'white', flexShrink: 0 }}>
      {/* Sidebar header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: '#0f172a', letterSpacing: -0.2 }}>Case Conversations</span>
          <button
            onClick={() => { setShowForm(v => !v); setFormError(''); }}
            title={showForm ? 'Cancel' : 'Add case'}
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

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cases…"
            style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Add case form */}
      {showForm && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>New Case</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input placeholder="Case ID (e.g. case_002)" value={formCaseId} onChange={e => setFormCaseId(e.target.value)} style={miniInput} />
            <input placeholder="Customer ID" value={formCustomerId} onChange={e => setFormCustomerId(e.target.value)} style={miniInput} />
            <input placeholder="Case Manager ID" value={formManagerId} onChange={e => setFormManagerId(e.target.value)} style={miniInput} />
            {formError && <div style={{ fontSize: 11, color: '#dc2626' }}>{formError}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <button onClick={() => setShowForm(false)} style={{ ...miniBtn, background: '#e2e8f0', color: '#475569', flex: 1 }}>Cancel</button>
              <button onClick={handleAdd} disabled={adding} style={{ ...miniBtn, background: accentColor, color: 'white', flex: 2 }}>
                {adding ? 'Adding…' : 'Add Case'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '32px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 12, lineHeight: 1.6 }}>
            {cases.length === 0
              ? <>No cases yet.<br />Click <strong>+</strong> to add one.</>
              : 'No cases match your search'}
          </div>
        )}

        {filtered.map(c => {
          const lastMsg = c.messages?.[0];
          const unread = unreadByCaseId[c.caseId] ?? 0;
          const isSelected = c.caseId === selectedCaseId;
          const [g1, g2] = avatarGradient(c.caseId);

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
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}
            >
              {/* Gradient avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${g1}, ${g2})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 12, fontWeight: 700,
              }}>
                {c.caseId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: unread > 0 ? 700 : 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                    {c.caseId}
                  </span>
                  {lastMsg && (
                    <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                      {formatTime(lastMsg.createdAt)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: unread > 0 ? '#475569' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: unread > 0 ? 500 : 400 }}>
                    {lastMsgPreview(lastMsg, currentUserId)}
                  </span>
                  {unread > 0 && (
                    <div style={{
                      background: accentColor, color: 'white', borderRadius: 10,
                      minWidth: 18, height: 18, fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 5px', flexShrink: 0, marginLeft: 6,
                    }}>
                      {unread > 99 ? '99+' : unread}
                    </div>
                  )}
                </div>
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
