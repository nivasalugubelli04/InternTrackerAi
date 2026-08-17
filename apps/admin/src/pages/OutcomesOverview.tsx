import { useEffect, useState } from 'react';
import { Card, StatCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

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

  useEffect(() => { 
    fetchData(); 
  }, [periodDays]);

  const maxCount = overview?.platformFunnel.stages.reduce((m, s) => Math.max(m, s.count), 1) ?? 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="anim-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 
            style={{ 
              fontSize: '28px', 
              fontWeight: 800, 
              fontFamily: 'var(--font-display)', 
              background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em' 
            }}
          >
            Placement Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
            Platform-wide student recruitment progress funnel, conversion tracking, and pipeline drops.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant="text"
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  color: periodDays === d ? 'white' : 'var(--text-secondary)',
                  backgroundColor: periodDays === d ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  border: periodDays === d ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent'
                }}
                onClick={() => setPeriodDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
          <a
            href={`${API_BASE}/export?type=funnel`}
            style={{ textDecoration: 'none' }}
          >
            <Button variant="secondary">↓ Export CSV</Button>
          </a>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px', color: '#ef4444', fontSize: '14px' }}>
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px', color: 'var(--text-secondary)' }}>
          Computing career placement outcomes...
        </div>
      ) : overview ? (
        <>
          {/* KPI Dashboard */}
          <div className="grid-cols-4">
            <StatCard 
              title="Active Students" 
              value={overview.totalActiveUsers.toLocaleString()} 
              icon={<TrendingUpIcon />} 
            />
            <StatCard 
              title="Total Applications" 
              value={overview.totalApplicationsInPeriod.toLocaleString()} 
              subtitle={`Submitted in past ${periodDays} days`}
              icon={<TrendingUpIcon />} 
            />
            <StatCard 
              title="Organizations" 
              value={overview.totalOrganizations.toLocaleString()} 
              icon={<TrendingUpIcon />} 
            />
            <StatCard 
              title="Data Integrity" 
              value={`${overview.dataQuality?.qualityScore?.toFixed(1) || '—'}%`} 
              subtitle="Funnel database quality metric"
              icon={<TrendingUpIcon />} 
              trend={overview.dataQuality ? (overview.dataQuality.qualityScore >= 90 ? 'Healthy' : 'Investigate') : '—'}
              trendType={overview.dataQuality ? (overview.dataQuality.qualityScore >= 90 ? 'success' : 'warning') : 'neutral'}
            />
          </div>

          {/* Funnel chart and conversions */}
          <div className="grid-cols-2">
            <Card>
              <h3 
                style={{ 
                  marginBottom: '24px', 
                  fontSize: '16px', 
                  fontWeight: 700, 
                  color: 'white',
                  fontFamily: 'var(--font-display)',
                  borderBottom: '1px solid var(--border-glass)',
                  paddingBottom: '12px'
                }}
              >
                🔻 Recruitment Funnel
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {overview.platformFunnel.stages.map((stage, i) => (
                  <div key={stage.stage} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '150px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{stage.stage}</div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '6px', height: '24px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(4, (stage.count / maxCount) * 100)}%`,
                          background: `linear-gradient(90deg, ${STAGE_COLORS[i % STAGE_COLORS.length]}, ${STAGE_COLORS[(i + 1) % STAGE_COLORS.length]})`,
                          transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        title={stage.definition}
                      />
                    </div>
                    <div style={{ width: '70px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: 'white' }}>{stage.count.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                {overview.platformFunnel.denominatorNote}
              </p>
            </Card>

            <Card>
              <h3 
                style={{ 
                  marginBottom: '24px', 
                  fontSize: '16px', 
                  fontWeight: 700, 
                  color: 'white',
                  fontFamily: 'var(--font-display)',
                  borderBottom: '1px solid var(--border-glass)',
                  paddingBottom: '12px'
                }}
              >
                ⚡ Stage Transition Conversion
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {overview.platformFunnel.stages.slice(1).map((s) => (
                  <div key={s.stage} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{s.stage}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>From preceding pipeline stage</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Badge variant={s.conversionFromPrevious !== null && s.conversionFromPrevious >= 0.3 ? 'success' : 'primary'}>
                        {pct(s.conversionFromPrevious)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

// Simple internal icon component since it is only needed here
function TrendingUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  );
}
