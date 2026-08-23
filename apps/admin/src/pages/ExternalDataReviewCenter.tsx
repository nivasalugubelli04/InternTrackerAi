import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ReviewItem {
  id: string;
  recordId: string;
  provider: string;
  recordType: 'REPOSITORY' | 'CALENDAR_EVENT' | 'DOCUMENT_SUMMARY' | 'PORTFOLIO_LINK' | 'EMAIL_SIGNAL';
  sourceUrl?: string;
  rawJson: Record<string, any>;
  normalizedJson: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MERGED' | 'IGNORED';
  matchConfidence: 'EXACT_MATCH' | 'HIGH_SIMILARITY' | 'LOW_SIMILARITY' | 'NEW_RECORD';
  suggestedAction: string;
  targetEntityType?: string;
  targetEntityId?: string;
  createdAt: string;
}

const confidenceBadge = (conf: string) => {
  switch (conf) {
    case 'EXACT_MATCH':
      return { bg: '#79F28A22', color: '#79F28A', label: '🎯 Exact Match' };
    case 'HIGH_SIMILARITY':
      return { bg: '#246BFE22', color: '#246BFE', label: '⚡ High Similarity' };
    case 'LOW_SIMILARITY':
      return { bg: '#F59E0B22', color: '#F59E0B', label: '⚠️ Low Similarity' };
    default:
      return { bg: '#1E2D42', color: '#9CA3AF', label: '🆕 New Record' };
  }
};

const recordTypeIcon = (type: string) => {
  switch (type) {
    case 'REPOSITORY': return '🐙 Project Repository';
    case 'CALENDAR_EVENT': return '📅 Calendar Event';
    case 'DOCUMENT_SUMMARY': return '📄 Document Summary';
    case 'PORTFOLIO_LINK': return '🌐 Portfolio Link';
    case 'EMAIL_SIGNAL': return '✉️ Application Signal';
    default: return '📦 External Data';
  }
};

const ExternalDataReviewCenter: React.FC = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [history, setHistory] = useState<ReviewItem[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [inspectItem, setInspectItem] = useState<ReviewItem | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/integrations/review/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load pending review items.');
      const data = await res.json();
      setReviews(data);
    } catch {
      setError('Could not load review center. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/integrations/review/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // non-fatal
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/integrations/review/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Approve failed.');
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('Could not approve review item.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/integrations/review/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Reject failed.');
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('Could not reject item.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleIgnore = async (id: string) => {
    setProcessingId(id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/integrations/review/${id}/ignore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Ignore failed.');
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('Could not ignore item.');
    } finally {
      setProcessingId(null);
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
          <button onClick={() => navigate('/integrations')} style={styles.backBtn}>← External Integrations</button>
          <h1 style={styles.title}>External Data Review Center</h1>
          <p style={styles.subtitle}>Explicit user approval staging queue · No external data modifies Career State without user consent</p>
        </div>
      </div>

      {error && <div style={styles.errorCard}>{error}</div>}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => { setActiveTab('PENDING'); loadPending(); }}
          style={{ ...styles.tab, ...(activeTab === 'PENDING' ? styles.tabActive : {}) }}
        >
          📥 Pending Review ({reviews.length})
        </button>
        <button
          onClick={() => { setActiveTab('HISTORY'); loadHistory(); }}
          style={{ ...styles.tab, ...(activeTab === 'HISTORY' ? styles.tabActive : {}) }}
        >
          📜 Review History
        </button>
      </div>

      {/* Pending Items */}
      {activeTab === 'PENDING' && !loading && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          {reviews.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#F9FAFB', marginBottom: 6 }}>All clear! No pending external data to review.</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>Connected platforms will surface new projects, skills, or events here for your explicit approval.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {reviews.map((r) => {
                const conf = confidenceBadge(r.matchConfidence);
                const norm = r.normalizedJson;

                return (
                  <div key={r.id} style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={styles.typeBadge}>{recordTypeIcon(r.recordType)}</span>
                          <span style={{ ...styles.badge, background: conf.bg, color: conf.color }}>{conf.label}</span>
                        </div>
                        <h3 style={{ margin: '10px 0 4px 0', fontSize: 18, color: '#F9FAFB', fontWeight: 700 }}>
                          {norm['title'] || 'External Record'}
                        </h3>
                        {r.sourceUrl && (
                          <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#246BFE', textDecoration: 'none' }}>
                            🔗 {r.sourceUrl}
                          </a>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        Detected: {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Normalized Data Preview */}
                    <div style={styles.previewBox}>
                      <div style={{ fontSize: 13, color: '#D1D5DB', marginBottom: 8, lineHeight: 1.5 }}>
                        {norm['description'] || norm['summary'] || 'External career data payload.'}
                      </div>

                      {norm['technologies'] && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {(norm['technologies'] as string[]).map((t, i) => (
                            <span key={i} style={styles.techChip}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Suggested Action Bar */}
                    <div style={styles.suggestedBar}>
                      💡 <strong>Suggested Action:</strong> {r.suggestedAction.replace(/_/g, ' ')}
                    </div>

                    {/* Action CTAs */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={processingId === r.id}
                        style={styles.btnPrimary}
                      >
                        {processingId === r.id ? '⏳ Importing...' : '✓ Accept & Add to Career State'}
                      </button>
                      <button
                        onClick={() => setInspectItem(r)}
                        style={styles.btnSecondary}
                      >
                        🔍 Inspect Payload
                      </button>
                      <button
                        onClick={() => handleIgnore(r.id)}
                        disabled={processingId === r.id}
                        style={styles.btnSecondary}
                      >
                        Ignore
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={processingId === r.id}
                        style={{ ...styles.btnSecondary, color: '#EF4444', borderColor: '#EF444433' }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'HISTORY' && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {history.map((h) => (
              <div key={h.id} style={{ ...styles.card, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 12, color: '#246BFE', fontWeight: 600 }}>{h.status}</span>
                    <span style={{ fontSize: 14, color: '#F9FAFB', fontWeight: 600, marginLeft: 12 }}>
                      {h.normalizedJson['title'] || 'External Record'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>
                    {new Date(h.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payload Inspector Modal */}
      {inspectItem && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#F9FAFB' }}>Payload Inspector — {inspectItem.recordType}</h3>
              <button onClick={() => setInspectItem(null)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Normalized Schema:</div>
            <pre style={styles.jsonPre}>{JSON.stringify(inspectItem.normalizedJson, null, 2)}</pre>
            <div style={{ fontSize: 12, color: '#9CA3AF', margin: '16px 0 12px 0' }}>Raw API Payload:</div>
            <pre style={styles.jsonPre}>{JSON.stringify(inspectItem.rawJson, null, 2)}</pre>
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button onClick={() => setInspectItem(null)} style={styles.btnPrimary}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'Inter', sans-serif", background: '#0D1421', minHeight: '100vh', padding: '32px 40px', color: '#F9FAFB' },
  header: { marginBottom: 24 },
  backBtn: { background: 'transparent', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer', padding: '0 0 12px 0', fontFamily: "'Inter', sans-serif", display: 'block' },
  title: { fontSize: 28, fontWeight: 800, color: '#F9FAFB', margin: '0 0 6px 0' },
  subtitle: { fontSize: 14, color: '#6B7280', margin: 0 },
  tabs: { display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #1E2D42', paddingBottom: 0 },
  tab: { background: 'transparent', border: 'none', color: '#6B7280', fontSize: 14, fontWeight: 500, padding: '10px 18px', cursor: 'pointer', borderRadius: '8px 8px 0 0', fontFamily: "'Inter', sans-serif" },
  tabActive: { color: '#246BFE', borderBottom: '2px solid #246BFE', fontWeight: 700 },
  card: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 16, padding: '22px 24px' },
  typeBadge: { background: '#1E2D42', color: '#93B5FD', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  previewBox: { background: '#0D1421', border: '1px solid #1E2D42', borderRadius: 12, padding: '14px 16px', marginBottom: 14 },
  techChip: { background: '#246BFE11', border: '1px solid #246BFE33', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#93B5FD' },
  suggestedBar: { background: '#FFF4D811', border: '1px solid #FFF4D822', color: '#FFF4D8', fontSize: 13, padding: '10px 14px', borderRadius: 10 },
  btnPrimary: { background: 'linear-gradient(135deg, #246BFE, #1456D9)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, padding: '10px 18px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  btnSecondary: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 10, color: '#9CA3AF', fontSize: 13, fontWeight: 500, padding: '10px 18px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  emptyState: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 16, padding: '60px 40px', textAlign: 'center' as const },
  errorCard: { background: '#EF444411', border: '1px solid #EF444433', borderRadius: 12, padding: '14px 18px', color: '#EF4444', fontSize: 13, marginBottom: 24 },
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 20, width: '100%', maxWidth: 600, padding: '24px 28px', maxHeight: '80vh', overflowY: 'auto' as const },
  closeBtn: { background: 'transparent', border: 'none', color: '#6B7280', fontSize: 18, cursor: 'pointer' },
  jsonPre: { background: '#0D1421', border: '1px solid #1E2D42', borderRadius: 8, padding: 12, color: '#79F28A', fontSize: 12, overflowX: 'auto' as const },
};

export default ExternalDataReviewCenter;
