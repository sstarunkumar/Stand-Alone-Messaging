import UserPanel from './components/UserPanel';

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Top bar */}
      <div style={{ padding: '8px 20px', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>NOS Messaging</span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span style={{ opacity: 0.55, fontSize: 12 }}>Case-Centric Messaging — Test Harness</span>
        <div style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.4 }}>Customer (left) · Case Manager (right)</div>
      </div>

      {/* Two-panel layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <UserPanel
          panelRole="CUSTOMER"
          defaultUserId="customer_001"
          accentColor="#1a73e8"
          label="Customer"
        />
        <div style={{ width: 2, background: '#cbd5e1', flexShrink: 0 }} />
        <UserPanel
          panelRole="CASE_MANAGER"
          defaultUserId="manager_001"
          accentColor="#15803d"
          label="Case Manager"
        />
      </div>
    </div>
  );
}
