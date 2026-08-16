/**
 * OutcomesSkills — Phase 24
 * Skill association analytics with strict association-only labeling.
 */
import React, { useEffect, useState } from 'react';

const API_BASE = '/api/v1/admin/outcomes';
function getHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };
}

interface SkillRow {
  skillName: string;
  skillCategory: string;
  usersWithSkill: number;
  applications: number;
  interviews: number;
  interviewConversionRate: number;
  offerConversionRate: number;
  sampleSize: number;
  confidence: string;
  observationNote: string;
}

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }

export default function OutcomesSkills() {
  const [data, setData] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 86400000).toISOString();
    fetch(`${API_BASE}/skills?periodStart=${start}&periodEnd=${end}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = data.filter(
    (r) =>
      r.skillName.toLowerCase().includes(filter.toLowerCase()) ||
      r.skillCategory.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div style={{ padding: 32, maxWidth: 1300, margin: '0 auto' }}>
      <style>{`
        .skill-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 24px; }
        .skill-card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 20px; position: relative; overflow: hidden; transition: transform 0.2s, border-color 0.2s; }
        .skill-card:hover { transform: translateY(-2px); border-color: #6366f1; }
        .skill-name { font-size: 16px; font-weight: 700; color: white; margin-bottom: 4px; }
        .skill-cat { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .skill-metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 16px; }
        .skill-metric-val { font-size: 20px; font-weight: 800; color: #a78bfa; }
        .skill-metric-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
        .assoc-note { font-size: 11px; color: var(--text-muted); margin-top: 12px; font-style: italic; border-top: 1px solid var(--border-subtle); padding-top: 12px; line-height: 1.5; }
        .search-bar { padding: 10px 16px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-tertiary); color: white; font-size: 14px; width: 300px; }
        .search-bar::placeholder { color: var(--text-muted); }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>Skill Associations</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Observed associations between skills and outcomes · Not causal relationships
          </p>
        </div>
        <input
          className="search-bar"
          placeholder="Filter skills..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div
        style={{
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: 13,
          color: '#f59e0b',
          marginBottom: 24,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        ⚠️ These are <strong>observed associations</strong> in the dataset — not causal relationships. Multiple confounding factors may influence outcomes.
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: 32 }}>Loading skill data...</p>
      ) : (
        <div className="skill-grid">
          {filtered.map((row) => (
            <div className="skill-card" key={row.skillName}>
              <div className="skill-name">{row.skillName}</div>
              <div className="skill-cat">{row.skillCategory}</div>
              <div className="skill-metrics">
                <div>
                  <div className="skill-metric-val">{pct(row.interviewConversionRate)}</div>
                  <div className="skill-metric-label">Interview Conv.</div>
                </div>
                <div>
                  <div className="skill-metric-val">{pct(row.offerConversionRate)}</div>
                  <div className="skill-metric-label">Offer Conv.</div>
                </div>
                <div>
                  <div className="skill-metric-val" style={{ fontSize: 16 }}>{row.usersWithSkill.toLocaleString()}</div>
                  <div className="skill-metric-label">Users</div>
                </div>
              </div>
              <div className="assoc-note">{row.observationNote}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
