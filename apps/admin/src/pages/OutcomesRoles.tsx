/**
 * OutcomesRoles — Phase 24
 * Role-bucketed outcome analytics with skill associations.
 */
import React, { useEffect, useState } from 'react';

const API_BASE = '/api/v1/admin/outcomes';
function getHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };
}

interface RoleRow {
  role: string;
  applications: number;
  interviews: number;
  offers: number;
  hires: number;
  interviewConversionRate: number;
  offerConversionRate: number;
  hireRate: number;
  sampleSize: number;
  confidence: string;
}

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }

const CONFIDENCE_COLOR: Record<string, string> = {
  HIGH: '#10b981', MEDIUM: '#f59e0b', LOW: '#ef4444',
};

export default function OutcomesRoles() {
  const [data, setData] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<keyof RoleRow>('applications');

  useEffect(() => {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 86400000).toISOString();
    fetch(`${API_BASE}/roles?periodStart=${start}&periodEnd=${end}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...data].sort((a, b) => (b[sort] as number) - (a[sort] as number));
  const maxApps = sorted.reduce((m, r) => Math.max(m, r.applications), 1);

  return (
    <div style={{ padding: 32, maxWidth: 1300, margin: '0 auto' }}>
      <style>{`
        .roles-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
        .roles-table th { background: var(--bg-tertiary); padding: 12px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); text-align: left; cursor: pointer; user-select: none; }
        .roles-table th:hover { color: #a78bfa; }
        .roles-table td { background: var(--bg-secondary); padding: 14px 16px; font-size: 14px; color: white; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); }
        .roles-table td:first-child { border-left: 1px solid var(--border-subtle); border-radius: 8px 0 0 8px; }
        .roles-table td:last-child { border-right: 1px solid var(--border-subtle); border-radius: 0 8px 8px 0; }
        .bar-cell { position: relative; }
        .mini-bar { height: 8px; border-radius: 4px; background: linear-gradient(90deg, #6366f1, #a78bfa); opacity: 0.8; }
        .conf-badge { display: inline-block; padding: 2px 8px; border-radius: 100px; font-size: 11px; font-weight: 600; }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>Role Outcomes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Application and conversion rates by role category · last 30 days
          </p>
        </div>
        <a
          href={`${API_BASE}/export?type=roles`}
          style={{ padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
        >↓ Export CSV</a>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: 32 }}>Loading role data...</p>
      ) : (
        <table className="roles-table">
          <thead>
            <tr>
              {[
                ['role', 'Role'],
                ['applications', 'Applications'],
                ['interviewConversionRate', 'Interview Conv.'],
                ['offerConversionRate', 'Offer Conv.'],
                ['hireRate', 'Hire Rate'],
                ['sampleSize', 'n'],
                ['confidence', 'Confidence'],
              ].map(([key, label]) => (
                <th key={key} onClick={() => key !== 'role' && key !== 'confidence' && setSort(key as keyof RoleRow)}>
                  {label} {sort === key ? '↓' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.role}>
                <td style={{ fontWeight: 600 }}>{row.role}</td>
                <td className="bar-cell">
                  <div style={{ marginBottom: 4 }}>{row.applications.toLocaleString()}</div>
                  <div className="mini-bar" style={{ width: `${(row.applications / maxApps) * 100}%` }} />
                </td>
                <td style={{ color: '#a78bfa', fontWeight: 600 }}>{pct(row.interviewConversionRate)}</td>
                <td style={{ color: '#8b5cf6', fontWeight: 600 }}>{pct(row.offerConversionRate)}</td>
                <td style={{ color: '#10b981', fontWeight: 600 }}>{pct(row.hireRate)}</td>
                <td style={{ color: 'var(--text-muted)' }}>{row.sampleSize.toLocaleString()}</td>
                <td>
                  <span
                    className="conf-badge"
                    style={{
                      background: `${CONFIDENCE_COLOR[row.confidence]}22`,
                      color: CONFIDENCE_COLOR[row.confidence],
                    }}
                  >
                    {row.confidence}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
