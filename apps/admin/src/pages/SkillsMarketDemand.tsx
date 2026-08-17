import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';


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
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="anim-fade-in">
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
          Market Skill Demand
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
          Real-time indicators showing skill popularity, growth metrics, and co-occurrence pairings.
        </p>
      </div>

      <div
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          fontSize: '13px',
          color: 'var(--status-warning)',
          lineHeight: '1.6',
          fontWeight: 500
        }}
      >
        ⚠️ <strong>Non-Causal Association Alert:</strong> The market signals and skill combinations below illustrate correlations and co-occurrence patterns extracted from platform internship job descriptions. These signals do not guarantee employment or prove direct causal relationships with career advancement.
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Analyzing platform market demand signals...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="grid-cols-2">
            <Card>
              <h3 
                style={{ 
                  marginBottom: '20px', 
                  fontSize: '16px', 
                  fontWeight: 700, 
                  color: 'white',
                  fontFamily: 'var(--font-display)',
                  borderBottom: '1px solid var(--border-glass)',
                  paddingBottom: '12px'
                }}
              >
                Top Demanded Skills
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data?.topDemandedSkills.map((item) => (
                  <div key={item.skill} style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{item.skill}</div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '4px', height: '8px', marginTop: '8px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                        <div style={{ height: '100%', width: `${item.percentage}%`, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}></div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '80px', flexShrink: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>{item.count}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.percentage.toFixed(1)}% of jobs</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 
                style={{ 
                  marginBottom: '20px', 
                  fontSize: '16px', 
                  fontWeight: 700, 
                  color: 'white',
                  fontFamily: 'var(--font-display)',
                  borderBottom: '1px solid var(--border-glass)',
                  paddingBottom: '12px'
                }}
              >
                Fastest Growing Skills (MoM)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data?.fastestGrowingSkills.map((item) => (
                  <div key={item.skill} style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{item.skill}</div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '4px', height: '8px', marginTop: '8px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                        <div style={{ height: '100%', width: `${Math.min(item.percentage, 100)}%`, background: 'linear-gradient(90deg, var(--brand-primary), var(--accent-purple))' }}></div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '80px', flexShrink: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--status-success)' }}>+{item.growthRate.toFixed(1)}%</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>MoM growth</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <h3 
              style={{ 
                marginBottom: '20px', 
                fontSize: '16px', 
                fontWeight: 700, 
                color: 'white',
                fontFamily: 'var(--font-display)',
                borderBottom: '1px solid var(--border-glass)',
                paddingBottom: '12px'
              }}
            >
              Frequently Co-Occurring Skill Pairs
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {data?.topSkillCombinations.map((pair, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: '12px', 
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'white' }}>
                    <span>{pair.primarySkill}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>+</span>
                    <span>{pair.coOccurringSkill}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>Pairing Strength</span>
                      <span>{(pair.strength * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', marginTop: '6px', border: '1px solid var(--border-glass)' }}>
                      <div style={{ height: '100%', background: 'var(--accent-purple)', width: `${pair.strength * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
