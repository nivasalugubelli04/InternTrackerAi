import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SearchInput } from '../components/ui/SearchInput';

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

function pct(v: number) { 
  return `${(v * 100).toFixed(1)}%`; 
}

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
            Skill Match Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
            Observed correlation rates between student portfolio skills and hiring stage success metrics.
          </p>
        </div>
        <SearchInput 
          placeholder="Filter skills..." 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
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
        ⚠️ <strong>Important Methodology Note:</strong> These statistics represent observed associations within the user database and do not imply causal relationships. Outcomes are influenced by multiple confounding student variables.
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Loading skill correlation analytics...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filtered.map((row) => (
            <Card key={row.skillName} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)' }}>
                    {row.skillName}
                  </div>
                  <Badge variant="primary">
                    {row.skillCategory}
                  </Badge>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '20px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-display)' }}>
                      {pct(row.interviewConversionRate)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
                      Interview
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-purple)', fontFamily: 'var(--font-display)' }}>
                      {pct(row.offerConversionRate)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
                      Offer rate
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', fontFamily: 'var(--font-display)' }}>
                      {row.usersWithSkill.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
                      Students
                    </div>
                  </div>
                </div>
              </div>

              <div 
                style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-muted)', 
                  fontStyle: 'italic', 
                  borderTop: '1px solid var(--border-glass)', 
                  paddingTop: '12px',
                  lineHeight: '1.5' 
                }}
              >
                {row.observationNote}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
