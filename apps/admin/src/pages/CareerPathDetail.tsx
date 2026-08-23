import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface CareerPath {
  pathTitle: string;
  alignmentCategory: string;
  alignmentScore: number;
  isPrimary: boolean;
  alignmentReasons: string[];
  strengths: string[];
  gaps: string[];
  tradeoffs: string[];
  transferableSkills: string[];
  recommendedActions: string[];
  dataLimitations: string[];
}

const alignmentColor = (cat: string) => {
  switch (cat) {
    case 'STRONG_ALIGNMENT': return '#79F28A';
    case 'GOOD_ALIGNMENT': return '#246BFE';
    case 'EMERGING_ALIGNMENT': return '#F59E0B';
    case 'EXPLORATORY': return '#6B7280';
    default: return '#6B7280';
  }
};

const alignmentLabel = (cat: string) => {
  switch (cat) {
    case 'STRONG_ALIGNMENT': return 'Strong Alignment';
    case 'GOOD_ALIGNMENT': return 'Good Alignment';
    case 'EMERGING_ALIGNMENT': return 'Emerging Alignment';
    case 'EXPLORATORY': return 'Exploratory';
    case 'INSUFFICIENT_DATA': return 'Insufficient Data';
    default: return cat;
  }
};

const CareerPathDetail: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate();
  const [path, setPath] = useState<CareerPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (title) loadPath(title);
  }, [title]);

  const loadPath = async (pathTitle: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const encoded = encodeURIComponent(pathTitle);
      const res = await fetch(`/api/v1/career-intelligence/paths/${encoded}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Path not found.');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPath(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load path details.');
    } finally {
      setLoading(false);
    }
  };

  const color = path ? alignmentColor(path.alignmentCategory) : '#246BFE';

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Back */}
      <button onClick={() => navigate('/career-intelligence')} style={styles.backBtn}>← Career Intelligence</button>

      {loading && (
        <div style={styles.center}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ color: '#6B7280' }}>Loading path details...</div>
        </div>
      )}

      {error && (
        <div style={{ ...styles.center, color: '#EF4444' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
          <div>{error}</div>
          <button onClick={() => navigate('/career-intelligence')} style={{ ...styles.btnPrimary, marginTop: 20, width: 'auto' }}>
            ← Back to Career Intelligence
          </button>
        </div>
      )}

      {!loading && !error && path && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          {/* Header */}
          <div style={{ ...styles.headerCard, borderTop: `4px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ ...styles.pathTitle, color }}>{path.pathTitle}</h1>
                <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ ...styles.badge, background: color + '22', color }}>
                    {alignmentLabel(path.alignmentCategory)}
                  </span>
                  {path.isPrimary && (
                    <span style={{ ...styles.badge, background: '#246BFE22', color: '#246BFE' }}>
                      ⭐ Primary Path
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 40, fontWeight: 800, color }}>{path.alignmentScore}%</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>alignment score</div>
                <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>
                  Internal estimate — not a job readiness score
                </div>
              </div>
            </div>
          </div>

          <div style={styles.twoCol}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Alignment Evidence */}
              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Why this path aligns</h3>
                <p style={styles.mutedText}>Based on your current recorded profile:</p>
                {path.alignmentReasons.map((r, i) => (
                  <div key={i} style={styles.evidenceRow}>
                    <span style={{ color: '#79F28A', marginRight: 10, fontSize: 16 }}>✓</span>
                    <span style={{ color: '#D1D5DB', fontSize: 14 }}>{r}</span>
                  </div>
                ))}
              </div>

              {/* Strengths */}
              {path.strengths.length > 0 && (
                <div style={styles.card}>
                  <h3 style={styles.sectionTitle}>Current Strengths</h3>
                  {path.strengths.map((s, i) => (
                    <div key={i} style={styles.evidenceRow}>
                      <span style={{ color: '#79F28A', marginRight: 10 }}>★</span>
                      <span style={{ color: '#D1D5DB', fontSize: 14 }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Transferable skills */}
              {path.transferableSkills.length > 0 && (
                <div style={styles.card}>
                  <h3 style={styles.sectionTitle}>Transferable Skills</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {path.transferableSkills.map((s, i) => (
                      <span key={i} style={styles.skillChip}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Evidence Gaps */}
              {path.gaps.length > 0 && (
                <div style={styles.card}>
                  <h3 style={styles.sectionTitle}>Current Evidence Gaps</h3>
                  <p style={styles.mutedText}>Not recorded in your profile yet:</p>
                  {path.gaps.map((g, i) => (
                    <div key={i} style={styles.evidenceRow}>
                      <span style={{ color: '#F59E0B', marginRight: 10 }}>○</span>
                      <span style={{ color: '#9CA3AF', fontSize: 14 }}>{g}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Trade-offs */}
              {path.tradeoffs.length > 0 && (
                <div style={styles.card}>
                  <h3 style={styles.sectionTitle}>Trade-offs</h3>
                  {path.tradeoffs.map((t, i) => (
                    <div key={i} style={styles.evidenceRow}>
                      <span style={{ color: '#6B7280', marginRight: 10 }}>↔</span>
                      <span style={{ color: '#9CA3AF', fontSize: 14 }}>{t}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommended Actions */}
              {path.recommendedActions.length > 0 && (
                <div style={styles.card}>
                  <h3 style={styles.sectionTitle}>Recommended Actions</h3>
                  {path.recommendedActions.map((a, i) => (
                    <div key={i} style={{ ...styles.evidenceRow, background: '#246BFE0A', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                      <span style={{ color: '#246BFE', marginRight: 10 }}>→</span>
                      <span style={{ color: '#D1D5DB', fontSize: 14 }}>{a}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Data limitations */}
              {path.dataLimitations.length > 0 && (
                <div style={{ background: '#F59E0B08', border: '1px solid #F59E0B22', borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, marginBottom: 8 }}>DATA LIMITATIONS</div>
                  {path.dataLimitations.map((l, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>· {l}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom actions */}
          <div style={{ marginTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(`/career-intelligence/scenarios`)}
              style={styles.btnPrimary}
            >
              🔮 Run What-If Scenario for {path.pathTitle}
            </button>
            <button
              onClick={() => navigate('/career-intelligence/compare')}
              style={styles.btnSecondary}
            >
              ⚖️ Compare with Another Path
            </button>
            <button
              onClick={() => navigate('/career-intelligence')}
              style={styles.btnSecondary}
            >
              ← Back to Overview
            </button>
          </div>

          {/* Disclaimer */}
          <div style={{ ...styles.mutedText, marginTop: 20, fontStyle: 'italic', fontSize: 12 }}>
            This analysis is based on your current recorded profile. It is decision support — not a guarantee of career outcomes or suitability.
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'Inter', sans-serif", background: '#0D1421', minHeight: '100vh', padding: '32px 40px', color: '#F9FAFB' },
  backBtn: { background: 'transparent', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer', padding: '0 0 20px 0', fontFamily: "'Inter', sans-serif", display: 'block' },
  headerCard: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 16, padding: '28px 30px', marginBottom: 28 },
  pathTitle: { fontSize: 28, fontWeight: 800, margin: 0 },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'flex-start' },
  card: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 14, padding: '20px 22px' },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#F9FAFB', margin: '0 0 12px 0' },
  mutedText: { color: '#6B7280', fontSize: 13, margin: '0 0 12px 0' },
  evidenceRow: { display: 'flex', alignItems: 'flex-start', marginBottom: 10 },
  skillChip: { background: '#246BFE11', border: '1px solid #246BFE33', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#93B5FD' },
  btnPrimary: { background: 'linear-gradient(135deg, #246BFE, #1456D9)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, padding: '11px 20px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  btnSecondary: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 10, color: '#9CA3AF', fontSize: 13, fontWeight: 500, padding: '11px 20px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  center: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center' as const },
};

export default CareerPathDetail;
