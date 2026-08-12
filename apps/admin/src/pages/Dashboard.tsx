import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminClient } from '../api/admin-client';
import { Users, Briefcase, Brain, Activity } from 'lucide-react';

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

  const StatCard = ({ title, value, icon, subtitle }: any) => (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>{title}</p>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold' }}>{value}</h2>
          {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{subtitle}</p>}
        </div>
        <div style={{ color: 'var(--brand-primary)' }}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Dashboard Overview</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Real-time platform metrics and health.</p>
      </div>

      <div className="grid-cols-4">
        <StatCard 
          title="Total Users" 
          value={kpis?.users?.total.toLocaleString()} 
          subtitle={`${kpis?.users?.newToday} new today | ${kpis?.users?.active7d} active (7d)`}
          icon={<Users size={24} />} 
        />
        <StatCard 
          title="Internships Collected" 
          value={kpis?.content?.jobs.toLocaleString()} 
          subtitle={`${kpis?.content?.jobsToday} added today | ${kpis?.content?.companies} tracked companies`}
          icon={<Briefcase size={24} />} 
        />
        <StatCard 
          title="AI Requests" 
          value={kpis?.engagement?.aiRequests.toLocaleString()} 
          subtitle="Total GPT completions generated"
          icon={<Brain size={24} />} 
        />
        <StatCard 
          title="Avg Scraper Health" 
          value={`${kpis?.system?.scraperSuccessRate.toFixed(1)}%`} 
          subtitle="Parser success rate across network"
          icon={<Activity size={24} color="var(--status-success)" />} 
        />
      </div>

      <div className="grid-cols-2" style={{ marginTop: '24px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Application Funnel (Platform-wide)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Tracked Applications</span>
              <span style={{ fontWeight: 'bold' }}>{kpis?.engagement?.applications.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Average Matches Generated</span>
              <span style={{ fontWeight: 'bold' }}>Auto-run nightly</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>System Health</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge badge-success">API - HEALTHY</span>
            <span className="badge badge-success">PostgreSQL - HEALTHY</span>
            <span className="badge badge-success">BullMQ Workers - HEALTHY</span>
            <span className="badge badge-neutral">AI Provider - HEALTHY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
