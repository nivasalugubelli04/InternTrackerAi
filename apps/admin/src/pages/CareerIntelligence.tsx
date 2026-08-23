import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CareerPath {
  pathTitle: string;
  alignmentCategory: string;
  alignmentScore: number;
  isPrimary: boolean;
  alignmentReasons: string[];
  strengths: string[];
  gaps: string[];
  tradeoffs: string[];
  recommendedActions: string[];
  dataLimitations: string[];
}

interface ReadinessDimension {
  name: string;
  state: 'STRONG' | 'DEVELOPING' | 'NEEDS_ATTENTION' | 'INSUFFICIENT_DATA';
  evidence: string[];
  recommendation: string;
}

interface Bottleneck {
  label: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  suggestedAction: string;
}

interface TrajectoryResult {
  phase: string;
  momentum: string;
  primaryPathTitle: string | null;
  alternativePathTitles: string[];
  exploratoryPathTitles: string[];
  potentialBottlenecks: string[];
  signals: string[];
  explanation: string;
  dataLimitations: string[];
}

interface CareerOverview {
  careerState: {
    targetRole: string | null;
    skills: Array<{ name: string; category: string; proficiency: string }>;
    projects: Array<{ title: string }>;
    applicationCount: number;
    portfolioMaturity: string;
    dataLimitations: string[];
  };
  trajectory: TrajectoryResult;
  primaryPath: CareerPath | null;
  alternativePaths: CareerPath[];
  readinessDimensions: ReadinessDimension[];
  potentialBottlenecks: Bottleneck[];
  goalConflicts: Array<{ type: string; description: string; recommendation: string }>;
  disclaimer: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const readinessColor = (state: string) => {
  switch (state) {
    case 'STRONG': return '#79F28A';
    case 'DEVELOPING': return '#246BFE';
    case 'NEEDS_ATTENTION': return '#F59E0B';
    default: return '#6B7280';
  }
};

const readinessLabel = (state: string) => {
  switch (state) {
    case 'STRONG': return 'Strong';
    case 'DEVELOPING': return 'Developing';
    case 'NEEDS_ATTENTION': return 'Needs Attention';
    case 'INSUFFICIENT_DATA': return 'Insufficient Data';
    default: return state;
  }
};

const phaseLabel = (phase: string) => {
  switch (phase) {
    case 'EXPLORING': return '🔍 Exploring';
    case 'BUILDING': return '🏗️ Building';
    case 'FOCUSING': return '🎯 Focusing';
    case 'SPECIALIZING': return '⚡ Specializing';
    case 'TRANSITIONING': return '🔄 Transitioning';
    default: return phase;
  }
};

const momentumLabel = (m: string) => {
  switch (m) {
    case 'ACCELERATING': return '🚀 Accelerating';
    case 'STEADY': return '✅ Steady';
    case 'SLOWING': return '⚠️ Slowing';
    case 'REFOCUSING': return '🔄 Refocusing';
    default: return '— Insufficient Data';
  }
};

const severityColor = (s: string) => {
  if (s === 'HIGH') return '#EF4444';
  if (s === 'MEDIUM') return '#F59E0B';
  return '#6B7280';
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonBlock = ({ h = 80, w = '100%' }: { h?: number; w?: string }) => (
  <div
    style={{
      height: h,
      width: w,
      background: 'linear-gradient(90deg, #1e2a3a 25%, #243347 50%, #1e2a3a 75%)',
      backgroundSize: '400% 100%',
      borderRadius: 12,
      animation: 'shimmer 1.5s infinite',
    }}
  />
);

// ─── Main Component ───────────────────────────────────────────────────────────

const CareerIntelligence: React.FC = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<CareerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'paths' | 'readiness' | 'bottlenecks' | 'conflicts'>('paths');

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/career-intelligence/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load career intelligence.');
      const data = await res.json();
      setOverview(data);
    } catch (e: any) {
      setError("We couldn't load your career intelligence right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes shimmer { 0% { background-position: -400% 0; } 100% { background-position: 400% 0; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #111827; }
        ::-webkit-scrollbar-thumb { background: #246BFE44; border-radius: 4px; }
      `}</style>

      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Career Intelligence</h1>
          <p style={styles.pageSubtitle}>
            Evidence-based career direction · Based on your current recorded profile
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/career-intelligence/scenarios')} style={styles.btnSecondary}>
            🔮 Scenario Planner
          </button>
          <button onClick={() => navigate('/career-intelligence/compare')} style={styles.btnPrimary}>
            ⚖️ Compare Paths
          </button>
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div style={styles.errorCard}>
          <span>⚠️ {error}</span>
          <button onClick={loadOverview} style={styles.retryBtn}>Try Again</button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[...Array(4)].map((_, i) => <SkeletonBlock key={i} h={110} />)}
          </div>
          <SkeletonBlock h={200} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[...Array(3)].map((_, i) => <SkeletonBlock key={i} h={280} />)}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {!loading && !error && overview && (
        <div style={{ animation: 'fadeUp 0.4s ease' }}>

          {/* ── Direction Summary Cards ── */}
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Your Career Direction</div>
              <div style={styles.summaryValue}>
                {overview.primaryPath
                  ? overview.primaryPath.pathTitle
                  : overview.careerState.targetRole ?? '—'}
              </div>
              {overview.primaryPath && (
                <div style={{ ...styles.badge, background: alignmentColor(overview.primaryPath.alignmentCategory) + '22', color: alignmentColor(overview.primaryPath.alignmentCategory) }}>
                  {alignmentLabel(overview.primaryPath.alignmentCategory)}
                </div>
              )}
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Career Trajectory</div>
              <div style={styles.summaryValue}>{phaseLabel(overview.trajectory.phase)}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                {overview.trajectory.explanation.substring(0, 80)}...
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Career Momentum</div>
              <div style={styles.summaryValue}>{momentumLabel(overview.trajectory.momentum)}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                {overview.careerState.applicationCount} applications · {overview.careerState.skills.length} skills
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Potential Bottleneck</div>
              <div style={{ fontSize: 14, color: '#F59E0B', fontWeight: 600, marginTop: 8 }}>
                {overview.potentialBottlenecks[0]?.label ?? 'None detected'}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                {overview.potentialBottlenecks[0]
                  ? '⚠️ Possible future gap'
                  : '✅ No major gaps detected'}
              </div>
            </div>
          </div>

          {/* ── Disclaimer ── */}
          <div style={styles.disclaimer}>
            ℹ️ {overview.disclaimer}
          </div>

          {/* ── Data Limitations ── */}
          {overview.careerState.dataLimitations.length > 0 && (
            <div style={styles.limitationCard}>
              <strong style={{ color: '#F59E0B' }}>Profile Data Limitations:</strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                {overview.careerState.dataLimitations.map((l, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{l}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Tabs ── */}
          <div style={styles.tabs}>
            {(['paths', 'readiness', 'bottlenecks', 'conflicts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
              >
                {tab === 'paths' && '🗺️ Career Paths'}
                {tab === 'readiness' && '📊 Readiness'}
                {tab === 'bottlenecks' && '⚠️ Bottlenecks'}
                {tab === 'conflicts' && '🎯 Goal Conflicts'}
              </button>
            ))}
          </div>

          {/* ── Tab: Career Paths ── */}
          {activeTab === 'paths' && (
            <div>
              {/* Primary path */}
              {overview.primaryPath && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={styles.sectionTitle}>Primary Career Path</h3>
                  <PathCard path={overview.primaryPath} navigate={navigate} />
                </div>
              )}

              {/* Alternative paths */}
              {overview.alternativePaths.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={styles.sectionTitle}>Alternative Paths</h3>
                  <div style={styles.pathGrid}>
                    {overview.alternativePaths.map((p, i) => (
                      <PathCard key={i} path={p} navigate={navigate} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!overview.primaryPath && overview.alternativePaths.length === 0 && (
                <EmptyState
                  icon="🗺️"
                  message="We need more career activity to identify strong patterns."
                  hint="Add skills, projects, and a career goal to explore career paths."
                />
              )}
            </div>
          )}

          {/* ── Tab: Readiness ── */}
          {activeTab === 'readiness' && (
            <div>
              <h3 style={styles.sectionTitle}>Career Readiness Dimensions</h3>
              <div style={styles.readinessGrid}>
                {overview.readinessDimensions.map((dim, i) => (
                  <ReadinessDimensionCard key={i} dim={dim} />
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Bottlenecks ── */}
          {activeTab === 'bottlenecks' && (
            <div>
              <h3 style={styles.sectionTitle}>Potential Bottlenecks</h3>
              <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 20 }}>
                These are possible future gaps based on your current recorded profile — not guaranteed problems.
              </p>
              {overview.potentialBottlenecks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {overview.potentialBottlenecks.map((b, i) => (
                    <BottleneckCard key={i} bottleneck={b} />
                  ))}
                </div>
              ) : (
                <EmptyState icon="✅" message="No major bottlenecks detected based on your current profile." hint="Keep building skills and projects to maintain this." />
              )}
            </div>
          )}

          {/* ── Tab: Goal Conflicts ── */}
          {activeTab === 'conflicts' && (
            <div>
              <h3 style={styles.sectionTitle}>Goal Conflict Analysis</h3>
              {overview.goalConflicts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {overview.goalConflicts.map((c, i) => (
                    <div key={i} style={styles.conflictCard}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ ...styles.conflictBadge, background: c.type === 'OVERLOAD' ? '#EF444422' : c.type === 'CONTRADICTION' ? '#F59E0B22' : '#79F28A22', color: c.type === 'OVERLOAD' ? '#EF4444' : c.type === 'CONTRADICTION' ? '#F59E0B' : '#79F28A' }}>
                          {c.type}
                        </span>
                      </div>
                      <p style={{ color: '#E5E7EB', fontSize: 14, margin: '0 0 8px 0' }}>{c.description}</p>
                      <p style={{ color: '#246BFE', fontSize: 13, margin: 0 }}>💡 {c.recommendation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="🎯" message="No goal conflicts detected." hint="Your current goals appear manageable and non-contradictory." />
              )}
            </div>
          )}

          {/* ── Signals Panel ── */}
          {overview.trajectory.signals.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h3 style={styles.sectionTitle}>Active Career Signals</h3>
              <div style={styles.signalsGrid}>
                {overview.trajectory.signals.map((signal, i) => (
                  <div key={i} style={styles.signalChip}>📡 {signal}</div>
                ))}
              </div>
            </div>
          )}

          {/* ── Quick Actions ── */}
          <div style={{ marginTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/career-intelligence/scenarios')} style={styles.quickAction}>
              🔮 Run What-If Scenario
            </button>
            <button onClick={() => navigate('/career-intelligence/compare')} style={styles.quickAction}>
              ⚖️ Compare Two Paths
            </button>
            <button onClick={() => navigate('/analytics')} style={styles.quickAction}>
              📊 View Career Analytics
            </button>
            <button onClick={() => navigate('/networking')} style={styles.quickAction}>
              🤝 Networking Module
            </button>
          </div>
        </div>
      )}

      {/* ── Empty State (no data) ── */}
      {!loading && !error && !overview && (
        <EmptyState
          icon="🧠"
          message="No career intelligence data available yet."
          hint="Add skills, projects, and a career goal to get started."
        />
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const PathCard: React.FC<{ path: CareerPath; navigate: ReturnType<typeof useNavigate> }> = ({ path, navigate }) => {
  const [expanded, setExpanded] = useState(false);
  const color = alignmentColor(path.alignmentCategory);

  return (
    <div style={{ ...styles.pathCard, borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h4 style={{ margin: 0, color: '#F9FAFB', fontSize: 18, fontWeight: 700 }}>{path.pathTitle}</h4>
            {path.isPrimary && <span style={{ ...styles.badge, background: '#246BFE22', color: '#246BFE' }}>Primary</span>}
          </div>
          <div style={{ ...styles.badge, background: color + '22', color, marginTop: 8 }}>
            {alignmentLabel(path.alignmentCategory)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color }}>{path.alignmentScore}%</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>alignment score</div>
        </div>
      </div>

      {/* Alignment reasons */}
      <div style={{ marginTop: 14 }}>
        <div style={styles.miniLabel}>Based on:</div>
        {path.alignmentReasons.map((r, i) => (
          <div key={i} style={styles.checkRow}>
            <span style={{ color: '#79F28A', marginRight: 6 }}>✓</span>
            <span style={{ color: '#D1D5DB', fontSize: 13 }}>{r}</span>
          </div>
        ))}
      </div>

      {expanded && (
        <div>
          {/* Strengths */}
          {path.strengths.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={styles.miniLabel}>Strengths:</div>
              {path.strengths.map((s, i) => (
                <div key={i} style={styles.checkRow}>
                  <span style={{ color: '#79F28A', marginRight: 6 }}>★</span>
                  <span style={{ color: '#D1D5DB', fontSize: 13 }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Gaps */}
          {path.gaps.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={styles.miniLabel}>Current Gaps:</div>
              {path.gaps.map((g, i) => (
                <div key={i} style={styles.checkRow}>
                  <span style={{ color: '#F59E0B', marginRight: 6 }}>○</span>
                  <span style={{ color: '#9CA3AF', fontSize: 13 }}>{g}</span>
                </div>
              ))}
            </div>
          )}

          {/* Trade-offs */}
          {path.tradeoffs.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={styles.miniLabel}>Trade-offs:</div>
              {path.tradeoffs.map((t, i) => (
                <div key={i} style={{ ...styles.checkRow, marginTop: 6 }}>
                  <span style={{ color: '#6B7280', marginRight: 6 }}>↔</span>
                  <span style={{ color: '#9CA3AF', fontSize: 13 }}>{t}</span>
                </div>
              ))}
            </div>
          )}

          {/* Data limitations */}
          {path.dataLimitations.length > 0 && (
            <div style={{ marginTop: 14, background: '#F59E0B11', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>DATA LIMITATIONS</div>
              {path.dataLimitations.map((l, i) => (
                <div key={i} style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{l}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        <button
          onClick={() => navigate(`/career-intelligence/paths/${encodeURIComponent(path.pathTitle)}`)}
          style={styles.btnPrimary}
        >
          Explore Path →
        </button>
        <button onClick={() => setExpanded(!expanded)} style={styles.btnSecondary}>
          {expanded ? 'Less' : 'More Details'}
        </button>
      </div>
    </div>
  );
};

const ReadinessDimensionCard: React.FC<{ dim: ReadinessDimension }> = ({ dim }) => {
  const color = readinessColor(dim.state);
  return (
    <div style={styles.readinessCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 600, color: '#F9FAFB', fontSize: 14 }}>{dim.name}</div>
        <span style={{ ...styles.badge, background: color + '22', color, fontSize: 11 }}>
          {readinessLabel(dim.state)}
        </span>
      </div>
      {/* Progress bar */}
      <div style={{ background: '#1e2a3a', borderRadius: 4, height: 4, marginBottom: 10 }}>
        <div style={{
          height: 4, borderRadius: 4, background: color,
          width: dim.state === 'STRONG' ? '90%' : dim.state === 'DEVELOPING' ? '55%' : dim.state === 'NEEDS_ATTENTION' ? '25%' : '10%',
          transition: 'width 0.5s ease',
        }} />
      </div>
      {/* Evidence */}
      {dim.evidence.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {dim.evidence.slice(0, 2).map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>· {e}</div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>{dim.recommendation}</div>
    </div>
  );
};

const BottleneckCard: React.FC<{ bottleneck: Bottleneck }> = ({ bottleneck }) => {
  const color = severityColor(bottleneck.severity);
  return (
    <div style={{ ...styles.bottleneckCard, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ ...styles.badge, background: color + '22', color, fontSize: 11 }}>
          {bottleneck.severity} PRIORITY
        </span>
        <span style={{ fontWeight: 600, color: '#F9FAFB', fontSize: 14 }}>{bottleneck.label}</span>
      </div>
      <p style={{ color: '#9CA3AF', fontSize: 13, margin: '0 0 8px 0' }}>{bottleneck.explanation}</p>
      <div style={{ fontSize: 13, color: '#246BFE' }}>💡 Suggested: {bottleneck.suggestedAction}</div>
    </div>
  );
};

const EmptyState: React.FC<{ icon: string; message: string; hint: string }> = ({ icon, message, hint }) => (
  <div style={styles.emptyState}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontWeight: 600, color: '#F9FAFB', marginBottom: 8 }}>{message}</div>
    <div style={{ fontSize: 13, color: '#6B7280' }}>{hint}</div>
  </div>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Inter', sans-serif",
    background: '#0D1421',
    minHeight: '100vh',
    padding: '32px 40px',
    color: '#F9FAFB',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: '#F9FAFB',
    margin: 0,
    background: 'linear-gradient(135deg, #246BFE, #79F28A)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    margin: '6px 0 0 0',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    background: '#131E2E',
    border: '1px solid #1E2D42',
    borderRadius: 16,
    padding: '20px 22px',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#F9FAFB',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    marginTop: 8,
  },
  disclaimer: {
    background: '#131E2E',
    border: '1px solid #1E2D42',
    borderRadius: 12,
    padding: '12px 18px',
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  limitationCard: {
    background: '#F59E0B0A',
    border: '1px solid #F59E0B33',
    borderRadius: 12,
    padding: '14px 18px',
    marginBottom: 24,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
    borderBottom: '1px solid #1E2D42',
    paddingBottom: 0,
  },
  tab: {
    background: 'transparent',
    border: 'none',
    color: '#6B7280',
    fontSize: 14,
    fontWeight: 500,
    padding: '10px 20px',
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
    transition: 'all 0.2s',
    fontFamily: "'Inter', sans-serif",
  },
  tabActive: {
    color: '#246BFE',
    borderBottom: '2px solid #246BFE',
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#F9FAFB',
    margin: '0 0 16px 0',
  },
  pathGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: 20,
  },
  pathCard: {
    background: '#131E2E',
    border: '1px solid #1E2D42',
    borderRadius: 16,
    padding: '22px 24px',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  readinessGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  readinessCard: {
    background: '#131E2E',
    border: '1px solid #1E2D42',
    borderRadius: 14,
    padding: '18px 20px',
  },
  bottleneckCard: {
    background: '#131E2E',
    border: '1px solid #1E2D42',
    borderRadius: 14,
    padding: '18px 20px',
  },
  conflictCard: {
    background: '#131E2E',
    border: '1px solid #1E2D42',
    borderRadius: 14,
    padding: '18px 20px',
  },
  conflictBadge: {
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
  },
  miniLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    marginBottom: 6,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  signalsGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  signalChip: {
    background: '#246BFE11',
    border: '1px solid #246BFE33',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 13,
    color: '#93B5FD',
  },
  quickAction: {
    background: '#131E2E',
    border: '1px solid #246BFE44',
    borderRadius: 10,
    color: '#246BFE',
    fontSize: 13,
    fontWeight: 600,
    padding: '10px 18px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #246BFE, #1456D9)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    padding: '10px 18px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'opacity 0.2s',
  },
  btnSecondary: {
    background: '#131E2E',
    border: '1px solid #1E2D42',
    borderRadius: 10,
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: 500,
    padding: '10px 18px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'border-color 0.2s',
  },
  retryBtn: {
    background: '#246BFE',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 14px',
    cursor: 'pointer',
    marginLeft: 16,
    fontFamily: "'Inter', sans-serif",
  },
  errorCard: {
    background: '#EF444411',
    border: '1px solid #EF444433',
    borderRadius: 12,
    padding: '16px 20px',
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyState: {
    background: '#131E2E',
    border: '1px solid #1E2D42',
    borderRadius: 16,
    padding: '60px 40px',
    textAlign: 'center' as const,
    marginTop: 20,
  },
};

export default CareerIntelligence;
