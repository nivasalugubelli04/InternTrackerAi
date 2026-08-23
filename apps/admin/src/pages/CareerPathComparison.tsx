import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CAREER_PATHS = [
  'AI Engineer',
  'Machine Learning Engineer',
  'Data Engineer',
  'Backend Engineer',
  'Full-Stack Engineer',
  'Data Scientist',
  'DevOps Engineer',
  'Mobile Engineer',
];

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

interface PathDetail {
  title: string;
  alignmentCategory: string;
  strengths: string[];
  gaps: string[];
  tradeoffs: string[];
  transferableSkills: string[];
  recommendedActions: string[];
  dataLimitations: string[];
}

interface ComparisonResult {
  pathA: PathDetail;
  pathB: PathDetail;
  sharedStrengths: string[];
  disclaimer: string;
}

const CareerPathComparison: React.FC = () => {
  const navigate = useNavigate();
  const [pathA, setPathA] = useState('AI Engineer');
  const [pathB, setPathB] = useState('Data Engineer');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (pathA === pathB) {
      setError('Please choose two different paths to compare.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/career-intelligence/compare', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pathA, pathB }),
      });
      if (!res.ok) throw new Error('Comparison failed.');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? 'Comparison failed. Please try again.');
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
        select:focus { outline: 2px solid #246BFE; outline-offset: 2px; }
      `}</style>

      <button onClick={() => navigate('/career-intelligence')} style={styles.backBtn}>← Career Intelligence</button>
      <h1 style={styles.title}>⚖️ Career Path Comparison</h1>
      <p style={styles.subtitle}>Side-by-side evidence comparison based on your current recorded profile</p>

      {/* Selectors */}
      <div style={styles.selectorRow}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Path A</label>
          <select value={pathA} onChange={(e) => setPathA(e.target.value)} style={styles.select}>
            {CAREER_PATHS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ padding: '36px 16px 0', color: '#6B7280', fontSize: 20, fontWeight: 700 }}>vs</div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Path B</label>
          <select value={pathB} onChange={(e) => setPathB(e.target.value)} style={styles.select}>
            {CAREER_PATHS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ padding: '28px 0 0', flexShrink: 0 }}>
          <button onClick={handleCompare} disabled={loading} style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ Comparing...' : '⚖️ Compare'}
          </button>
        </div>
      </div>

      {error && <div style={styles.errorMsg}>{error}</div>}

      {/* Result */}
      {result && (
        <div style={{ animation: 'fadeUp 0.3s ease', marginTop: 28 }}>
          {/* Disclaimer */}
          <div style={styles.disclaimer}>{result.disclaimer}</div>

          {/* Comparison table */}
          <div style={styles.comparisonGrid}>
            {/* Column headers */}
            <div style={{ ...styles.colHeader, borderTop: `4px solid ${alignmentColor(result.pathA.alignmentCategory)}` }}>
              <h2 style={{ ...styles.pathName, color: alignmentColor(result.pathA.alignmentCategory) }}>
                {result.pathA.title}
              </h2>
              <span style={{ ...styles.badge, background: alignmentColor(result.pathA.alignmentCategory) + '22', color: alignmentColor(result.pathA.alignmentCategory) }}>
                {alignmentLabel(result.pathA.alignmentCategory)}
              </span>
            </div>
            <div style={{ ...styles.colHeader, borderTop: `4px solid ${alignmentColor(result.pathB.alignmentCategory)}` }}>
              <h2 style={{ ...styles.pathName, color: alignmentColor(result.pathB.alignmentCategory) }}>
                {result.pathB.title}
              </h2>
              <span style={{ ...styles.badge, background: alignmentColor(result.pathB.alignmentCategory) + '22', color: alignmentColor(result.pathB.alignmentCategory) }}>
                {alignmentLabel(result.pathB.alignmentCategory)}
              </span>
            </div>

            {/* Strengths */}
            <CompareSection title="Current Strengths" items={result.pathA.strengths} color="#79F28A" icon="★" emptyText="No strengths detected yet" />
            <CompareSection title="Current Strengths" items={result.pathB.strengths} color="#79F28A" icon="★" emptyText="No strengths detected yet" />

            {/* Gaps */}
            <CompareSection title="Evidence Gaps" items={result.pathA.gaps} color="#F59E0B" icon="○" emptyText="No gaps detected" />
            <CompareSection title="Evidence Gaps" items={result.pathB.gaps} color="#F59E0B" icon="○" emptyText="No gaps detected" />

            {/* Trade-offs */}
            <CompareSection title="Trade-offs" items={result.pathA.tradeoffs} color="#6B7280" icon="↔" emptyText="No trade-offs identified" />
            <CompareSection title="Trade-offs" items={result.pathB.tradeoffs} color="#6B7280" icon="↔" emptyText="No trade-offs identified" />

            {/* Recommended actions */}
            <CompareSection title="Top Recommended Actions" items={result.pathA.recommendedActions} color="#246BFE" icon="→" emptyText="No specific actions identified" />
            <CompareSection title="Top Recommended Actions" items={result.pathB.recommendedActions} color="#246BFE" icon="→" emptyText="No specific actions identified" />
          </div>

          {/* Shared strengths */}
          {result.sharedStrengths.length > 0 && (
            <div style={styles.sharedCard}>
              <h3 style={{ ...styles.sectionTitle, marginBottom: 12 }}>🔗 Shared Strengths (Transferable Between Both Paths)</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.sharedStrengths.map((s, i) => (
                  <span key={i} style={styles.sharedChip}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Navigate deeper */}
          <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => navigate(`/career-intelligence/paths/${encodeURIComponent(pathA)}`)} style={styles.btnSecondary}>
              Explore {pathA} →
            </button>
            <button onClick={() => navigate(`/career-intelligence/paths/${encodeURIComponent(pathB)}`)} style={styles.btnSecondary}>
              Explore {pathB} →
            </button>
            <button onClick={() => navigate('/career-intelligence/scenarios')} style={styles.btnPrimary}>
              🔮 Run Scenario for Either Path
            </button>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚖️</div>
          <div style={{ color: '#6B7280', fontSize: 14 }}>Select two paths and click Compare to see your evidence side-by-side.</div>
        </div>
      )}
    </div>
  );
};

const CompareSection: React.FC<{ title: string; items: string[]; color: string; icon: string; emptyText: string }> = ({ title, items, color, icon, emptyText }) => (
  <div style={styles.compareCell}>
    <div style={styles.cellTitle}>{title}</div>
    {items.length > 0
      ? items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ color, marginRight: 8, flexShrink: 0 }}>{icon}</span>
            <span style={{ color: '#D1D5DB', fontSize: 13 }}>{item}</span>
          </div>
        ))
      : <div style={{ color: '#4B5563', fontSize: 13, fontStyle: 'italic' }}>{emptyText}</div>
    }
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'Inter', sans-serif", background: '#0D1421', minHeight: '100vh', padding: '32px 40px', color: '#F9FAFB' },
  backBtn: { background: 'transparent', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer', padding: '0 0 12px 0', fontFamily: "'Inter', sans-serif", display: 'block' },
  title: { fontSize: 26, fontWeight: 800, color: '#F9FAFB', margin: '0 0 6px 0' },
  subtitle: { fontSize: 14, color: '#6B7280', margin: '0 0 28px 0' },
  selectorRow: { display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 8 },
  label: { display: 'block', fontSize: 13, color: '#9CA3AF', marginBottom: 8, fontWeight: 500 },
  select: { width: '100%', background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 10, color: '#F9FAFB', fontSize: 14, padding: '11px 14px', fontFamily: "'Inter', sans-serif" },
  btnPrimary: { background: 'linear-gradient(135deg, #246BFE, #1456D9)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, padding: '12px 20px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' as const },
  btnSecondary: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 10, color: '#9CA3AF', fontSize: 13, fontWeight: 500, padding: '12px 20px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  errorMsg: { background: '#EF444411', border: '1px solid #EF444433', borderRadius: 10, padding: '12px 16px', color: '#EF4444', fontSize: 13, marginTop: 16 },
  disclaimer: { background: '#246BFE0A', border: '1px solid #246BFE22', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#6B7280', marginBottom: 24 },
  comparisonGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid #1E2D42', borderRadius: 16, overflow: 'hidden' },
  colHeader: { padding: '22px 24px', background: '#131E2E', borderBottom: '1px solid #1E2D42' },
  pathName: { fontSize: 20, fontWeight: 800, margin: '0 0 8px 0' },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  compareCell: { padding: '20px 24px', background: '#0F1927', borderBottom: '1px solid #1E2D42', borderRight: '1px solid #1E2D42' },
  cellTitle: { fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 12 },
  sharedCard: { background: '#131E2E', border: '1px solid #79F28A33', borderRadius: 14, padding: '20px 24px', marginTop: 24 },
  sharedChip: { background: '#79F28A11', border: '1px solid #79F28A33', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: '#79F28A' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#F9FAFB', margin: 0 },
  emptyState: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 16, padding: '60px 40px', textAlign: 'center' as const, marginTop: 28 },
};

export default CareerPathComparison;
