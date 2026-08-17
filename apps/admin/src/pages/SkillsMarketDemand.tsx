import React, { useEffect, useState } from 'react';

const API_BASE = '/api/v1/admin/outcomes';

function getHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json',
  };
}

interface SkillDemandItem {
  skill: string;
  count: number;
  percentage: number;
  growthRate: number;
}

interface CoOccurrence {
  primarySkill: string;
  coOccurringSkill: string;
  strength: number;
  coOccurrenceCount: number;
}

interface MarketDemandData {
  topDemandedSkills: SkillDemandItem[];
  fastestGrowingSkills: SkillDemandItem[];
  topSkillCombinations: CoOccurrence[];
}

export default function SkillsMarketDemand() {
  const [data, setData] = useState<MarketDemandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      // Reuses outcome skill analytics endpoint for aggregated platform market data
      const res = await fetch(`${API_BASE}/skills`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  return (
    <div className="market-demand-page">
      <style>{`
        .market-demand-page { padding: 32px; max-width: 1400px; margin: 0 auto; }
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .page-title { font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #f59e0b, #ef4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }

        .non-causal-alert { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 32px; color: #fbbf24; font-size: 13px; line-height: 1.5; display: flex; align-items: flex-start; gap: 12px; }
        .alert-icon { font-size: 20px; margin-top: -2px; }

        .grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; }
        .card-full { grid-column: span 2; }
        .card-title { font-size: 18px; font-weight: 600; color: white; margin-bottom: 20px; }

        .demand-list { display: flex; flex-direction: column; gap: 16px; }
        .demand-row { display: flex; align-items: center; justify-content: space-between; }
        .demand-info { flex: 1; margin-right: 16px; }
        .demand-name { font-size: 15px; font-weight: 600; color: white; }
        .demand-bar-wrap { background: var(--bg-primary); border-radius: 6px; height: 10px; margin-top: 6px; overflow: hidden; position: relative; }
        .demand-bar { height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444); border-radius: 6px; }
        .demand-stat { text-align: right; min-width: 80px; }
        .stat-value { font-size: 16px; font-weight: 700; color: white; }
        .stat-pct { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

        .pairs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .pair-card { background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; }
        .pair-names { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: white; }
        .pair-connector { color: var(--text-muted); font-weight: 400; }
        .pair-strength-wrap { margin-top: 12px; }
        .pair-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; }
        .pair-progress { height: 6px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden; margin-top: 4px; }
        .pair-bar { height: 100%; background: #ef4444; border-radius: 4px; }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Market Skill Demand</h1>
          <p className="subtitle">Real-time indicators showing skill popularity, growth metrics, and combination pairings</p>
        </div>
      </div>

      <div className="non-causal-alert">
        <span className="alert-icon">⚠️</span>
        <div>
          <strong>Non-Causal Association Alert:</strong> The market signals and skill combinations below illustrate correlations and co-occurrence patterns extracted from platform internship job descriptions. These signals do not guarantee employment or prove direct causal relationships with career advancement.
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Analyzing platform market demand...</div>
      ) : (
        <div className="grid-layout">
          <div className="card">
            <div className="card-title">Top Demanded Skills</div>
            <div className="demand-list">
              {data?.topDemandedSkills.map((item) => (
                <div key={item.skill} className="demand-row">
                  <div className="demand-info">
                    <div className="demand-name">{item.skill}</div>
                    <div className="demand-bar-wrap">
                      <div className="demand-bar" style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                  <div className="demand-stat">
                    <div className="stat-value">{item.count}</div>
                    <div className="stat-pct">{item.percentage.toFixed(1)}% of jobs</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Fastest Growing Skills</div>
            <div className="demand-list">
              {data?.fastestGrowingSkills.map((item) => (
                <div key={item.skill} className="demand-row">
                  <div className="demand-info">
                    <div className="demand-name">{item.skill}</div>
                    <div className="demand-bar-wrap">
                      <div className="demand-bar" style={{ width: `${Math.min(item.percentage, 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="demand-stat">
                    <div className="stat-value">+{item.growthRate.toFixed(1)}%</div>
                    <div className="stat-pct">MoM growth</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-full">
            <div className="card-title">Frequestly Co-Occurring Skill Pairs</div>
            <div className="pairs-grid">
              {data?.topSkillCombinations.map((pair, idx) => (
                <div key={idx} className="pair-card">
                  <div className="pair-names">
                    <span>{pair.primarySkill}</span>
                    <span className="pair-connector">+</span>
                    <span>{pair.coOccurringSkill}</span>
                  </div>
                  <div className="pair-strength-wrap">
                    <div className="pair-label">
                      <span>Co-occurrence Strength</span>
                      <span>{(pair.strength * 100).toFixed(0)}%</span>
                    </div>
                    <div className="pair-progress">
                      <div className="pair-bar" style={{ width: `${pair.strength * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
