import { useQuery } from '@tanstack/react-query';
import { adminClient } from '../api/admin-client';
import { Users, Briefcase, Brain, Activity } from 'lucide-react';
import { Card, StatCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function Dashboard() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['adminKpis'],
    queryFn: async () => {
      const res = await adminClient.get('/admin/dashboard');
      return res.data;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading platform analytics...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="anim-fade-in">
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
          Dashboard Overview
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
          Real-time platform metrics, system health, and core AI processing stats.
        </p>
      </div>

      <div className="grid-cols-4">
        <StatCard 
          title="Total Students" 
          value={kpis?.users?.total?.toLocaleString()} 
          subtitle={`${kpis?.users?.newToday || 0} new today | ${kpis?.users?.active7d || 0} active (7d)`}
          icon={<Users size={20} />} 
        />
        <StatCard 
          title="Positions Tracked" 
          value={kpis?.content?.jobs?.toLocaleString()} 
          subtitle={`${kpis?.content?.jobsToday || 0} added today | ${kpis?.content?.companies || 0} tracked firms`}
          icon={<Briefcase size={20} />} 
        />
        <StatCard 
          title="AI Completions" 
          value={kpis?.engagement?.aiRequests?.toLocaleString()} 
          subtitle="Grounded prompt recommendations"
          icon={<Brain size={20} />} 
        />
        <StatCard 
          title="Scraper Accuracy" 
          value={`${kpis?.system?.scraperSuccessRate?.toFixed(1) || '100.0'}%`} 
          subtitle="Dynamic parser completion rate"
          icon={<Activity size={20} />} 
          trend="Healthy"
          trendType="success"
        />
      </div>

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
            Application Funnel (Platform-wide)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>Total Tracked Applications</span>
              <span style={{ fontWeight: 700, color: 'white' }}>{kpis?.engagement?.applications?.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>Average Match Recommendations</span>
              <span style={{ fontWeight: 700, color: 'white' }}>Auto-run nightly</span>
            </div>
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
            System Status
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Badge variant="success">API Gateway • Healthy</Badge>
            <Badge variant="success">PostgreSQL DB • Online</Badge>
            <Badge variant="success">BullMQ Daemon • Active</Badge>
            <Badge variant="primary">AI Providers • Available</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
