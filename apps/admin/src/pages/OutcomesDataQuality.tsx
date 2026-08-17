import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const API_BASE = '/api/v1/admin/outcomes';

function getHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };
}

interface DQReport {
  totalChecked: number;
  missingTimestamp: number;
  duplicateCount: number;
  invalidTransitions: number;
  conflictingStatus: number;
  excludedCount: number;
  qualityScore: number;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 90 ? 'var(--status-success)' : score >= 70 ? 'var(--status-warning)' : 'var(--status-error)';
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={140} height={140} viewBox="0 0 140 140" style={{ display: 'block', margin: '0 auto' }}>
      <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={10} />
      <circle
        cx={70} 
        cy={70} 
        r={r} 
        fill="none" 
        stroke={color} 
        strokeWidth={10}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x={70} y={72} textAnchor="middle" fill="white" fontSize={26} fontWeight={800} fontFamily="var(--font-display)">
        {score.toFixed(1)}%
      </text>
      <text x={70} y={92} textAnchor="middle" fill="var(--text-secondary)" fontSize={11} fontWeight={600} letterSpacing="0.04em" style={{ textTransform: 'uppercase' }}>
        Score
      </text>
    </svg>
  );
}

const ISSUE_TYPES = [
  { key: 'missingTimestamp', label: 'Missing Timestamps', desc: 'Application records lacking timestamp audits', color: '#ef4444', emoji: '🕐' },
  { key: 'duplicateCount', label: 'Duplicate Applications', desc: 'Multiple applications for the same job and user', color: '#f59e0b', emoji: '🔁' },
  { key: 'invalidTransitions', label: 'Invalid State Transitions', desc: 'Recruitment status flow sequence errors', color: '#8b5cf6', emoji: '⛔' },
  { key: 'conflictingStatus', label: 'Timeline Inconsistencies', desc: 'Timestamps with negative duration changes', color: '#6366f1', emoji: '⚡' },
  { key: 'excludedCount', label: 'Excluded Records', desc: 'Irrelevant/spam postings removed from calculation', color: '#94a3b8', emoji: '🔕' },
];

export default function OutcomesDataQuality() {
  const [report, setReport] = useState<DQReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchReport = () => {
    setLoading(true);
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 86400000).toISOString();
    fetch(`${API_BASE}/data-quality?periodStart=${start}&periodEnd=${end}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => { setReport(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { 
    fetchReport(); 
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="anim-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 
            style={{ 
              fontSize: '28px', 
              fontWeight: 800, 
              fontFamily: 'var(--font-display)', 
              background: 'linear-gradient(135deg, white, var(--text-secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em' 
            }}
          >
            Database Quality validation
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
            Audit platform placement metrics for duplicate records, timeline anomalies, and broken sequence transitions.
          </p>
        </div>
        <Button
          onClick={() => { setRunning(true); fetchReport(); setTimeout(() => setRunning(false), 2000); }}
          disabled={running}
        >
          {running ? 'Running...' : '↻ Run Validation'}
        </Button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Validating outcome integrity metrics...</p>
      ) : report ? (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }} className="dq-layout-grid">
          <Card style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px', gap: '20px' }}>
            <ScoreRing score={report.qualityScore} />
            <div>
              <div style={{ fontSize: '13px', color: 'white', fontWeight: 700 }}>
                {report.totalChecked.toLocaleString()} Checked
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Total system validation log records
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border-glass)', width: '100%', paddingTop: '16px' }}>
              <div style={{ fontSize: '13px', color: 'white', fontWeight: 700 }}>
                {report.excludedCount.toLocaleString()} Excluded
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Spam or demo test applications
              </div>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="issues-grid">
            {ISSUE_TYPES.map((type) => {
              const count = (report as any)[type.key] as number;
              return (
                <Card key={type.key} style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div 
                    style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '22px', 
                      flexShrink: 0,
                      background: `rgba(255,255,255,0.03)`,
                      border: '1px solid var(--border-glass)'
                    }}
                  >
                    {type.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: count > 0 ? type.color : 'var(--status-success)', fontFamily: 'var(--font-display)' }}>
                      {count.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginTop: '2px' }}>{type.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>{type.desc}</div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 768px) {
          .dq-layout-grid {
            grid-template-columns: 1fr !important;
          }
          .issues-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
