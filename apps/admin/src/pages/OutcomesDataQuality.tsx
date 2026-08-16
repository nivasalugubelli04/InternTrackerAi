/**
 * OutcomesDataQuality — Phase 24
 * Data quality validation dashboard for admin.
 */
import React, { useEffect, useState } from 'react';

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

interface DQLog {
  id: string;
  runAt: string;
  qualityScore: number;
  totalChecked: number;
  excludedCount: number;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={140} height={140} viewBox="0 0 140 140" style={{ display: 'block', margin: '0 auto' }}>
      <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={12} />
      <circle
        cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={12}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
      />
      <text x={70} y={74} textAnchor="middle" fill="white" fontSize={28} fontWeight={800}>{score.toFixed(1)}</text>
      <text x={70} y={95} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={12}>DQ Score</text>
    </svg>
  );
}

const ISSUE_TYPES = [
  { key: 'missingTimestamp', label: 'Missing Timestamp', desc: 'Applications with APPLIED status but no appliedAt', color: '#ef4444' },
  { key: 'duplicateCount', label: 'Duplicate Records', desc: 'Same userId + jobId with multiple applications', color: '#f59e0b' },
  { key: 'invalidTransitions', label: 'Invalid Transitions', desc: 'Status changes outside valid transition matrix', color: '#8b5cf6' },
  { key: 'conflictingStatus', label: 'Time Conflicts', desc: 'acceptedAt before sentAt or submittedAt before startedAt', color: '#6366f1' },
  { key: 'excludedCount', label: 'Total Excluded', desc: 'Records excluded from metric calculations', color: '#94a3b8' },
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

  useEffect(() => { fetchReport(); }, []);

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .dq-grid { display: grid; grid-template-columns: 220px 1fr; gap: 24px; align-items: start; }
        .dq-score-card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 28px 24px; text-align: center; }
        .issues-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .issue-card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 20px; display: flex; gap: 16px; align-items: flex-start; }
        .issue-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .issue-count { font-size: 28px; font-weight: 800; color: white; }
        .issue-label { font-size: 14px; font-weight: 600; color: white; margin-top: 2px; }
        .issue-desc { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
        .run-btn { padding: 10px 20px; background: linear-gradient(135deg,#6366f1,#8b5cf6); border: none; border-radius: 10px; color: white; font-size: 14px; font-weight: 600; cursor: pointer; }
        .run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>Data Quality</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Validation results for the last 30 days of career data
          </p>
        </div>
        <button
          className="run-btn"
          disabled={running}
          onClick={() => { setRunning(true); fetchReport(); setTimeout(() => setRunning(false), 3000); }}
        >
          {running ? 'Running...' : '↻ Run Validation'}
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Running validation...</p>
      ) : report ? (
        <div className="dq-grid">
          <div className="dq-score-card">
            <ScoreRing score={report.qualityScore} />
            <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              {report.totalChecked.toLocaleString()} records checked
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              {report.excludedCount} excluded from metrics
            </div>
          </div>
          <div className="issues-grid">
            {ISSUE_TYPES.map((type) => (
              <div className="issue-card" key={type.key}>
                <div className="issue-icon" style={{ background: `${type.color}22`, color: type.color }}>
                  {type.key === 'missingTimestamp' ? '🕐' :
                   type.key === 'duplicateCount' ? '🔁' :
                   type.key === 'invalidTransitions' ? '⛔' :
                   type.key === 'conflictingStatus' ? '⚡' : '🔕'}
                </div>
                <div>
                  <div className="issue-count" style={{ color: (report as any)[type.key] > 0 ? type.color : '#10b981' }}>
                    {((report as any)[type.key] as number).toLocaleString()}
                  </div>
                  <div className="issue-label">{type.label}</div>
                  <div className="issue-desc">{type.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
