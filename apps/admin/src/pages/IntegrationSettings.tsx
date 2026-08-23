import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProviderManifest {
  provider: 'GITHUB' | 'GOOGLE_CALENDAR' | 'PORTFOLIO_LINK' | 'DOCUMENT_IMPORT' | 'EMAIL_FEED';
  name: string;
  category: string;
  dataRequested: string[];
  purpose: string;
  syncFrequency: string;
  whatItWillNotDo: string[];
  permissions: string[];
}

interface ProviderStatusItem {
  manifest: ProviderManifest;
  connection: {
    id?: string;
    status: 'AVAILABLE' | 'CONNECTED' | 'SYNCING' | 'SYNC_FAILED' | 'DISCONNECTED' | 'REAUTH_REQUIRED' | 'PAUSED';
    lastSyncedAt?: string | null;
    errorMessage?: string | null;
    scopes: string[];
  };
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'CONNECTED':
      return { bg: '#79F28A22', color: '#79F28A', label: '✓ Connected' };
    case 'SYNCING':
      return { bg: '#246BFE22', color: '#246BFE', label: '⏳ Syncing...' };
    case 'SYNC_FAILED':
      return { bg: '#EF444422', color: '#EF4444', label: '⚠️ Sync Failed' };
    case 'DISCONNECTED':
      return { bg: '#6B728022', color: '#6B7280', label: 'Disconnected' };
    default:
      return { bg: '#1E2D42', color: '#9CA3AF', label: 'Available' };
  }
};

const providerIcon = (provider: string) => {
  switch (provider) {
    case 'GITHUB': return '🐙';
    case 'GOOGLE_CALENDAR': return '📅';
    case 'DOCUMENT_IMPORT': return '📄';
    case 'PORTFOLIO_LINK': return '🌐';
    case 'EMAIL_FEED': return '✉️';
    default: return '🔌';
  }
};

const IntegrationSettings: React.FC = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<ProviderStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeManifest, setActiveManifest] = useState<ProviderManifest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/integrations/providers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load integration providers.');
      const data = await res.json();
      setProviders(data);
    } catch {
      setError('Could not load connected accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: string) => {
    setActionLoading(provider);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/integrations/connect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          customData: { username: 'dev-user', token: 'mock_token_123' },
        }),
      });
      if (!res.ok) throw new Error('Failed to connect provider.');
      await loadProviders();
    } catch {
      alert(`Could not connect ${provider}.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSync = async (provider: string) => {
    setActionLoading(provider);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/integrations/${provider}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Sync failed.');
      await loadProviders();
    } catch {
      alert(`Sync failed for ${provider}.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (id: string, providerName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${providerName}?`)) return;
    setActionLoading(id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/integrations/${id}/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Disconnect failed.');
      await loadProviders();
    } catch {
      alert(`Could not disconnect ${providerName}.`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>External Integrations</h1>
          <p style={styles.subtitle}>Connect external career platforms · Encrypted AES-256 credentials · User-controlled sync</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/integrations/history')} style={styles.btnSecondary}>
            📜 Sync Audit Log
          </button>
          <button onClick={() => navigate('/integrations/review')} style={styles.btnPrimary}>
            📥 Review Center Queue
          </button>
        </div>
      </div>

      {error && <div style={styles.errorCard}>{error}</div>}

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={styles.skeletonCard} />
          ))}
        </div>
      )}

      {/* Provider List */}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20, animation: 'fadeUp 0.3s ease' }}>
          {providers.map((item) => {
            const badge = statusBadge(item.connection.status);
            const isConnected = item.connection.status === 'CONNECTED' || item.connection.status === 'SYNCING';
            const icon = providerIcon(item.manifest.provider);

            return (
              <div key={item.manifest.provider} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={styles.iconBox}>{icon}</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#F9FAFB' }}>{item.manifest.name}</h3>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{item.manifest.category}</div>
                    </div>
                  </div>
                  <span style={{ ...styles.badge, background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                </div>

                <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  {item.manifest.purpose}
                </p>

                {item.connection.lastSyncedAt && (
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
                    Last synced: {new Date(item.connection.lastSyncedAt).toLocaleString()}
                  </div>
                )}

                {item.connection.errorMessage && (
                  <div style={{ fontSize: 12, color: '#EF4444', background: '#EF444411', padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>
                    ⚠️ {item.connection.errorMessage}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => handleSync(item.manifest.provider)}
                        disabled={actionLoading === item.manifest.provider}
                        style={styles.btnSecondary}
                      >
                        {actionLoading === item.manifest.provider ? '⏳ Syncing...' : '🔄 Sync Now'}
                      </button>
                      <button
                        onClick={() => item.connection.id && handleDisconnect(item.connection.id, item.manifest.name)}
                        disabled={actionLoading === item.connection.id}
                        style={{ ...styles.btnSecondary, color: '#EF4444', borderColor: '#EF444433' }}
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(item.manifest.provider)}
                      disabled={actionLoading === item.manifest.provider}
                      style={styles.btnPrimary}
                    >
                      {actionLoading === item.manifest.provider ? '⏳ Connecting...' : '⚡ Connect Account'}
                    </button>
                  )}

                  <button
                    onClick={() => setActiveManifest(item.manifest)}
                    style={{ ...styles.btnSecondary, marginLeft: 'auto' }}
                  >
                    ℹ️ Permissions
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permission Transparency Drawer / Modal */}
      {activeManifest && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{providerIcon(activeManifest.provider)}</span>
                <h3 style={{ margin: 0, fontSize: 18, color: '#F9FAFB', fontWeight: 700 }}>{activeManifest.name} Permissions</h3>
              </div>
              <button onClick={() => setActiveManifest(null)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.manifestSection}>
              <div style={styles.manifestLabel}>Data Requested</div>
              {activeManifest.dataRequested.map((req, i) => (
                <div key={i} style={styles.checkItem}><span style={{ color: '#79F28A', marginRight: 8 }}>✓</span>{req}</div>
              ))}
            </div>

            <div style={styles.manifestSection}>
              <div style={styles.manifestLabel}>Sync Frequency</div>
              <div style={{ fontSize: 13, color: '#D1D5DB' }}>{activeManifest.syncFrequency}</div>
            </div>

            <div style={{ ...styles.manifestSection, background: '#EF44440A', border: '1px solid #EF444422', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ ...styles.manifestLabel, color: '#EF4444' }}>What InternTracker AI Will NEVER Do</div>
              {activeManifest.whatItWillNotDo.map((item, i) => (
                <div key={i} style={styles.checkItem}><span style={{ color: '#EF4444', marginRight: 8 }}>✕</span>{item}</div>
              ))}
            </div>

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <button onClick={() => setActiveManifest(null)} style={styles.btnPrimary}>
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'Inter', sans-serif", background: '#0D1421', minHeight: '100vh', padding: '32px 40px', color: '#F9FAFB' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 800, color: '#F9FAFB', margin: '0 0 6px 0', background: 'linear-gradient(135deg, #246BFE, #79F28A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { fontSize: 14, color: '#6B7280', margin: 0 },
  card: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 16, padding: '24px 26px', display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between' },
  skeletonCard: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 16, height: 220 },
  iconBox: { width: 44, height: 44, borderRadius: 12, background: '#1E2D42', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  btnPrimary: { background: 'linear-gradient(135deg, #246BFE, #1456D9)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, padding: '10px 18px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  btnSecondary: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 10, color: '#9CA3AF', fontSize: 13, fontWeight: 500, padding: '10px 18px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  errorCard: { background: '#EF444411', border: '1px solid #EF444433', borderRadius: 12, padding: '14px 18px', color: '#EF4444', fontSize: 13, marginBottom: 24 },
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 20, width: '100%', maxWidth: 540, padding: '28px 32px' },
  closeBtn: { background: 'transparent', border: 'none', color: '#6B7280', fontSize: 18, cursor: 'pointer' },
  manifestSection: { marginBottom: 18 },
  manifestLabel: { fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 8 },
  checkItem: { fontSize: 13, color: '#D1D5DB', marginTop: 4, display: 'flex', alignItems: 'center' },
};

export default IntegrationSettings;
