import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const QUICK_ACTIONS = [
  'Deploy my AI project to the cloud',
  'Build a new machine learning project',
  'Complete a cloud computing certification',
  'Apply to 10 internship opportunities',
  'Build a REST API backend project',
  'Add 3 professional contacts from target companies',
  'Complete a data engineering course',
  'Build a full-stack web application',
];

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

interface ScenarioResult {
  title: string;
  actionDescription: string;
  targetPathTitle: string | null;
  potentialEvidenceImprovements: string[];
  potentialSkillDevelopment: string[];
  potentialAlignmentDelta: string;
  remainingGaps: string[];
  portfolioValueChange: string;
  confidence: string;
  dataLimitations: string[];
  aiNarrative: string | null;
}

interface SavedScenario {
  id: string;
  title: string;
  actionDescription: string;
  targetPathTitle: string | null;
  confidence: string;
  isApplied: boolean;
  createdAt: string;
}

const CareerScenarioPlanner: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [action, setAction] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/career-intelligence/scenarios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSavedScenarios(data);
      }
    } catch {
      // non-fatal
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleQuickPick = (text: string) => {
    setAction(text);
    setTitle(`What if I: ${text}?`);
  };

  const handleRun = async () => {
    if (!action.trim()) {
      setError('Please describe the action you want to explore.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/career-intelligence/scenarios', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || `What if I: ${action}?`,
          actionDescription: action,
          targetPathTitle: targetPath || undefined,
        }),
      });
      if (!res.ok) throw new Error('Scenario analysis failed.');
      const data = await res.json();
      setResult(data);
      loadHistory();
    } catch {
      setError("We couldn't run the scenario right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = () => {
    navigate('/career-command-center');
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        textarea:focus, select:focus, input:focus { outline: 2px solid #246BFE; outline-offset: 2px; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <button onClick={() => navigate('/career-intelligence')} style={styles.backBtn}>← Career Intelligence</button>
          <h1 style={styles.title}>🔮 Scenario Planner</h1>
          <p style={styles.subtitle}>Explore what-if scenarios — based on your recorded profile, not predictions</p>
        </div>
      </div>

      <div style={styles.twoCol}>
        {/* ── Input Panel ── */}
        <div style={styles.inputPanel}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>What would you like to explore?</h3>

            {/* Quick picks */}
            <div style={{ marginBottom: 20 }}>
              <div style={styles.miniLabel}>Quick scenarios:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {QUICK_ACTIONS.map((qa, i) => (
                  <button key={i} onClick={() => handleQuickPick(qa)} style={{ ...styles.chip, background: action === qa ? '#246BFE22' : '#1e2a3a', color: action === qa ? '#246BFE' : '#9CA3AF', border: action === qa ? '1px solid #246BFE44' : '1px solid #1E2D42' }}>
                    {qa}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom action */}
            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>Describe the action</label>
              <textarea
                value={action}
                onChange={(e) => { setAction(e.target.value); if (!title) setTitle(`What if I: ${e.target.value}?`); }}
                placeholder="e.g. Deploy my AI recommendation project using Docker and GitHub Actions..."
                style={styles.textarea}
                rows={3}
              />
            </div>

            {/* Title */}
            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>Scenario title (optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. What if I deploy my AI project?"
                style={styles.input}
              />
            </div>

            {/* Target path */}
            <div style={{ marginBottom: 24 }}>
              <label style={styles.label}>Target career path (optional)</label>
              <select value={targetPath} onChange={(e) => setTargetPath(e.target.value)} style={styles.select}>
                <option value="">— Any path —</option>
                {CAREER_PATHS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {error && <div style={styles.errorMsg}>{error}</div>}

            <button onClick={handleRun} disabled={loading} style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}>
              {loading ? '⏳ Analyzing...' : '🔍 Run Scenario Analysis'}
            </button>

            {/* Disclaimer */}
            <div style={styles.disclaimerBox}>
              ℹ️ Scenarios show potential profile effects — not guarantees. Running a scenario does <strong>not</strong> modify your profile.
            </div>
          </div>
        </div>

        {/* ── Result Panel ── */}
        <div style={styles.resultPanel}>
          {result && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>{result.title}</h3>

                {/* Confidence */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ ...styles.confidenceBadge }}>
                    📊 Confidence: {result.confidence}
                  </div>
                </div>

                {/* Evidence improvements */}
                <div style={styles.resultSection}>
                  <div style={styles.resultLabel}>Potential Evidence Improvements</div>
                  {result.potentialEvidenceImprovements.map((item, i) => (
                    <div key={i} style={styles.resultItem}>
                      <span style={{ color: '#79F28A', marginRight: 8 }}>+</span>{item}
                    </div>
                  ))}
                </div>

                {/* Skill development */}
                {result.potentialSkillDevelopment.length > 0 && (
                  <div style={styles.resultSection}>
                    <div style={styles.resultLabel}>Potential Skill Development</div>
                    {result.potentialSkillDevelopment.map((item, i) => (
                      <div key={i} style={styles.resultItem}>
                        <span style={{ color: '#246BFE', marginRight: 8 }}>→</span>{item}
                      </div>
                    ))}
                  </div>
                )}

                {/* Alignment delta */}
                <div style={styles.resultSection}>
                  <div style={styles.resultLabel}>Alignment Impact</div>
                  <div style={{ color: '#F59E0B', fontSize: 14 }}>{result.potentialAlignmentDelta}</div>
                </div>

                {/* Portfolio change */}
                <div style={styles.resultSection}>
                  <div style={styles.resultLabel}>Portfolio Value Change</div>
                  <div style={{ color: '#E5E7EB', fontSize: 14 }}>{result.portfolioValueChange}</div>
                </div>

                {/* Remaining gaps */}
                {result.remainingGaps.length > 0 && (
                  <div style={styles.resultSection}>
                    <div style={styles.resultLabel}>Remaining Gaps After This Action</div>
                    {result.remainingGaps.map((item, i) => (
                      <div key={i} style={styles.resultItem}>
                        <span style={{ color: '#6B7280', marginRight: 8 }}>○</span>{item}
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Narrative */}
                {result.aiNarrative && (
                  <div style={{ ...styles.resultSection, background: '#FFF4D822', border: '1px solid #F59E0B22', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ ...styles.resultLabel, color: '#F59E0B' }}>AI Analysis</div>
                    <div style={{ fontSize: 14, color: '#D1D5DB', lineHeight: 1.6 }}>{result.aiNarrative}</div>
                  </div>
                )}

                {/* Data limitations */}
                {result.dataLimitations.length > 0 && (
                  <div style={styles.limitationBox}>
                    <strong style={{ color: '#F59E0B', fontSize: 12 }}>DATA LIMITATIONS</strong>
                    {result.dataLimitations.map((l, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>· {l}</div>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                  <button onClick={handleCreateGoal} style={styles.btnPrimary}>
                    ✅ Create Goal from This Scenario
                  </button>
                  <button onClick={() => setResult(null)} style={styles.btnSecondary}>
                    Clear
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 10 }}>
                  Creating a goal sends it to the Priority Engine — your profile is not automatically modified.
                </div>
              </div>
            </div>
          )}

          {!result && !loading && (
            <div style={styles.emptyResult}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔮</div>
              <div style={{ color: '#6B7280', fontSize: 14 }}>
                Choose an action and run a scenario to see its potential impact on your career profile.
              </div>
            </div>
          )}

          {loading && (
            <div style={styles.emptyResult}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ color: '#6B7280', fontSize: 14 }}>Analyzing your scenario...</div>
            </div>
          )}
        </div>
      </div>

      {/* ── History ── */}
      {savedScenarios.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={styles.sectionTitle}>Previous Scenarios</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {savedScenarios.map((s) => (
              <div key={s.id} style={styles.historyCard}>
                <div style={{ fontWeight: 600, color: '#F9FAFB', fontSize: 14, marginBottom: 6 }}>{s.title}</div>
                {s.targetPathTitle && (
                  <div style={{ fontSize: 12, color: '#246BFE', marginBottom: 4 }}>Target: {s.targetPathTitle}</div>
                )}
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>{s.confidence}</div>
                <div style={{ fontSize: 11, color: '#4B5563' }}>
                  {new Date(s.createdAt).toLocaleDateString()}
                  {s.isApplied && <span style={{ color: '#79F28A', marginLeft: 8 }}>✓ Applied</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'Inter', sans-serif", background: '#0D1421', minHeight: '100vh', padding: '32px 40px', color: '#F9FAFB' },
  header: { marginBottom: 32 },
  backBtn: { background: 'transparent', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer', padding: '0 0 12px 0', fontFamily: "'Inter', sans-serif" },
  title: { fontSize: 26, fontWeight: 800, color: '#F9FAFB', margin: '0 0 6px 0' },
  subtitle: { fontSize: 14, color: '#6B7280', margin: 0 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'flex-start' },
  inputPanel: {},
  resultPanel: {},
  card: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 16, padding: '24px 26px' },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#F9FAFB', margin: '0 0 20px 0' },
  miniLabel: { fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  chip: { padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'all 0.2s' },
  label: { display: 'block', fontSize: 13, color: '#9CA3AF', marginBottom: 8, fontWeight: 500 },
  textarea: { width: '100%', background: '#0D1421', border: '1px solid #1E2D42', borderRadius: 10, color: '#F9FAFB', fontSize: 14, padding: '12px 14px', fontFamily: "'Inter', sans-serif", resize: 'vertical' as const },
  input: { width: '100%', background: '#0D1421', border: '1px solid #1E2D42', borderRadius: 10, color: '#F9FAFB', fontSize: 14, padding: '10px 14px', fontFamily: "'Inter', sans-serif" },
  select: { width: '100%', background: '#0D1421', border: '1px solid #1E2D42', borderRadius: 10, color: '#F9FAFB', fontSize: 14, padding: '10px 14px', fontFamily: "'Inter', sans-serif" },
  btnPrimary: { background: 'linear-gradient(135deg, #246BFE, #1456D9)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, padding: '12px 20px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", width: '100%' },
  btnSecondary: { background: '#1e2a3a', border: '1px solid #1E2D42', borderRadius: 10, color: '#9CA3AF', fontSize: 13, fontWeight: 500, padding: '12px 20px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  errorMsg: { background: '#EF444411', border: '1px solid #EF444433', borderRadius: 10, padding: '12px 16px', color: '#EF4444', fontSize: 13, marginBottom: 16 },
  disclaimerBox: { background: '#246BFE0A', border: '1px solid #246BFE22', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#6B7280', marginTop: 16 },
  confidenceBadge: { background: '#246BFE11', border: '1px solid #246BFE33', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: '#93B5FD', display: 'inline-block' },
  resultSection: { marginBottom: 18 },
  resultLabel: { fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 8 },
  resultItem: { fontSize: 14, color: '#D1D5DB', marginBottom: 6, display: 'flex', alignItems: 'flex-start' },
  limitationBox: { background: '#F59E0B08', border: '1px solid #F59E0B22', borderRadius: 10, padding: '12px 16px', marginTop: 16 },
  emptyResult: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 16, padding: '60px 40px', textAlign: 'center' as const },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#F9FAFB', margin: '0 0 16px 0' },
  historyCard: { background: '#131E2E', border: '1px solid #1E2D42', borderRadius: 14, padding: '16px 18px' },
};

export default CareerScenarioPlanner;
