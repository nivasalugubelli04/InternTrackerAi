import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface IntegrationEvent {
  id: string;
  provider: string;
  eventType: string;
  details?: Record<string, any>;
  createdAt: string;
}

const IntegrationSyncHistory: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/integrations/events', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load integration events.');
      const data = await res.json();
      setEvents(data);
    } catch {
      setError('Could not load sync history.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
      `}</style>

      <button onClick={() => navigate('/integrations')} style={styles.backBtn}>← External Integrations</button>
      <h1 style={styles.title}>Integration Sync History & Audit Log</h1>
      <p style={styles.subtitle}>Security event logs and sync activity audit trail</p>

      {error && <div style={styles.errorCard}>{error}</div>}

      {!loading && !error && (
        <div style={{ animation: 'fadeUp 0.3s ease', marginTop: 24 }}>
          {events.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📜</div>
              <div style={{ color: '#6B7280', fontSize: 14 }}>No integration audit events logged yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.map((e) => (
                <div key={e.id} style={styles.eventRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={styles.eventBadge}>{e.provider}</span>
                    <span style={{ fontSize: 14, color: '#F9FAFB', fontWeight: 600 }}>{e.eventType}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {new Date(e.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'Inter', sans-serif", background: '#0D1421', minHeight: '100vh', padding: '32px 40px', color: '#F9FAFB' },
  backBtn: { background: 'transparent', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer', padding: '0 0 12px 0', fontFamily: "'Inter', sans-serif", display: 'block' },
  title: { fontSize: 26, fontWeight: 800, color: '#F9FAFB', margin: '0 0 6px 0' },
  subtitle: { fontSize: 14, color: '#6B7280', margin: 0 },
  eventRow: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  eventBadge: { background: '#246BFE22', color: '#246BFE', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  emptyState: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 16, padding: '60px 40px', textAlign: 'center' as const },
  errorCard: { background: '#EF444411', border: '1px solid #EF444433', borderRadius: 12, padding: '14px 18px', color: '#EF4444', fontSize: 13, marginTop: 24 },
};

export default IntegrationSyncHistory;
