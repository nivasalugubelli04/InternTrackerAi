/**
 * OutcomesOverview — Phase 24 Admin Dashboard
 *
 * Platform-wide career outcomes overview with funnel visualization,
 * time-to-stage metrics, trend indicators, and data quality status.
 */
import React, { useEffect, useState } from 'react';

const API_BASE = '/api/v1/admin/outcomes';

function getHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json',
  };
}

interface FunnelStage {
  stage: string;
  count: number;
  conversionFromPrevious: number | null;
  dropOffRate: number | null;
  definition: string;
}

interface FunnelData {
  stages: FunnelStage[];
  sampleSize: number;
  denominatorNote: string;
}

interface DataQuality {
  qualityScore: number;
  runAt: string;
}

interface OverviewData {
  platformFunnel: FunnelData;
  totalActiveUsers: number;
  totalOrganizations: number;
  totalApplicationsInPeriod: number;
  dataQuality: DataQuality | null;
}

const STAGE_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#818cf8', '#4f46e5', '#4338ca', '#3730a3', '#312e81',
];

function pct(val: number | null): string {
  if (val === null) return '—';
  return `${(val * 100).toFixed(1)}%`;
}

export default function OutcomesOverview() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState(30);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const end = new Date().toISOString();
      const start = new Date(Date.now() - periodDays * 86400000).toISOString();
      const res = await fetch(
        `${API_BASE}/overview?periodStart=${start}&periodEnd=${end}`,
        { headers: getHeaders() },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOverview(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [periodDays]);

  const maxCount = overview?.platformFunnel.stages.reduce((m, s) => Math.max(m, s.count), 1) ?? 1;

  return (
    <div className="outcomes-page">
      <style>{`
        .outcomes-page { padding: 32px; max-width: 1400px; margin: 0 auto; }
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .page-title { font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #6366f1, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .page-subtitle { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
        .kpi-card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 20px; position: relative; overflow: hidden; }
        .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #6366f1, #a78bfa); }
        .kpi-value { font-size: 32px; font-weight: 800; color: white; }
        .kpi-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
        .funnel-card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        .funnel-title { font-size: 18px; font-weight: 600; color: white; margin-bottom: 20px; }
        .funnel-stage { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
        .funnel-bar-wrap { flex: 1; }
        .funnel-bar { height: 36px; border-radius: 8px; display: flex; align-items: center; padding: 0 12px; font-size: 14px; font-weight: 600; color: white; transition: width 0.6s ease; position: relative; }
        .funnel-stage-name { width: 180px; font-size: 14px; color: var(--text-secondary); }
        .funnel-count { width: 80px; text-align: right; font-size: 14px; font-weight: 700; color: white; }
        .funnel-conv { width: 90px; text-align: right; font-size: 12px; color: #a78bfa; }
        .dq-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
        .dq-good { background: rgba(16,185,129,0.15); color: #10b981; }
        .dq-warn { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .dq-bad { background: rgba(239,68,68,0.15); color: #ef4444; }
        .period-selector { display: flex; gap: 8px; }
        .period-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-tertiary); color: var(--text-secondary); cursor: pointer; font-size: 13px; transition: all 0.2s; }
        .period-btn.active, .period-btn:hover { border-color: #6366f1; background: rgba(99,102,241,0.1); color: #a78bfa; }
        .export-btn { padding: 8px 16px; border-radius: 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; color: white; font-size: 13px; font-weight: 600; cursor: pointer; }
        .loading-state { display: flex; align-items: center; justify-content: center; height: 300px; color: var(--text-muted); }
        .error-state { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 16px; color: #ef4444; }
      `}</style>

      <div className="page-header">
        <div>
          <div className="page-title">Career Outcomes</div>
          <div className="page-subtitle">Platform-wide placement intelligence · Phase 24</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="period-selector">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                className={`period-btn ${periodDays === d ? 'active' : ''}`}
                onClick={() => setPeriodDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
          <a
            href={`${API_BASE}/export?type=funnel`}
            className="export-btn"
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            ↓ Export CSV
          </a>
        </div>
      </div>

      {error && <div className="error-state">⚠ {error}</div>}

      {loading ? (
        <div className="loading-state">
          <div>Computing outcomes...</div>
        </div>
      ) : overview ? (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-value">{overview.totalActiveUsers.toLocaleString()}</div>
              <div className="kpi-label">Active Users</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{overview.totalApplicationsInPeriod.toLocaleString()}</div>
              <div className="kpi-label">Applications ({periodDays}d)</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{overview.totalOrganizations.toLocaleString()}</div>
              <div className="kpi-label">Organizations</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value" style={{ fontSize: 20 }}>
                {overview.dataQuality ? (
                  <span className={`dq-badge ${
                    overview.dataQuality.qualityScore >= 90 ? 'dq-good' :
                    overview.dataQuality.qualityScore >= 70 ? 'dq-warn' : 'dq-bad'
                  }`}>
                    {overview.dataQuality.qualityScore.toFixed(1)}%
                  </span>
                ) : '—'}
              </div>
              <div className="kpi-label">Data Quality Score</div>
            </div>
            {/* Conversion rates from funnel */}
            {overview.platformFunnel.stages.slice(4, 8).map((s) => (
              <div className="kpi-card" key={s.stage}>
                <div className="kpi-value" style={{ fontSize: 26, color: '#a78bfa' }}>
                  {pct(s.conversionFromPrevious)}
                </div>
                <div className="kpi-label">{s.stage} Conv.</div>
              </div>
            ))}
          </div>

          {/* Funnel Visualization */}
          <div className="funnel-card">
            <div className="funnel-title">🔻 Career Outcomes Funnel</div>
            {overview.platformFunnel.stages.map((stage, i) => (
              <div className="funnel-stage" key={stage.stage}>
                <div className="funnel-stage-name">{stage.stage}</div>
                <div className="funnel-bar-wrap">
                  <div
                    className="funnel-bar"
                    style={{
                      width: `${Math.max(4, (stage.count / maxCount) * 100)}%`,
                      background: `linear-gradient(90deg, ${STAGE_COLORS[i]}, ${STAGE_COLORS[Math.min(i + 1, STAGE_COLORS.length - 1)]})`,
                    }}
                    title={stage.definition}
                  />
                </div>
                <div className="funnel-count">{stage.count.toLocaleString()}</div>
                <div className="funnel-conv">
                  {stage.conversionFromPrevious !== null
                    ? `→ ${pct(stage.conversionFromPrevious)}`
                    : ''}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {overview.platformFunnel.denominatorNote}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
