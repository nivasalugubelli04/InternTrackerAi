import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, BarChart3, AlertCircle, Award, Target, BookOpen,
  Calendar, Clock, UserCheck, FolderGit2, FileText, CheckCircle2, ChevronRight, HelpCircle
} from 'lucide-react';
import { adminClient } from '../api/admin-client';
import { Card, StatCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, Tbody, Td, Th, Thead, Tr } from '../components/ui/Table';

export default function CareerAnalytics() {
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'skills' | 'reviews'>('overview');

  // Fetch Overview Data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['career-analytics-overview', days],
    queryFn: async () => {
      const res = await adminClient.get(`/analytics/overview?days=${days}`);
      return res.data;
    },
  });

  // Fetch Bottlenecks
  const { data: bottleneckData } = useQuery({
    queryKey: ['career-analytics-bottlenecks', days],
    queryFn: async () => {
      const res = await adminClient.get(`/analytics/bottlenecks?days=${days}`);
      return res.data;
    },
  });

  // Fetch AI Insights
  const { data: insightsData } = useQuery({
    queryKey: ['career-analytics-insights', days],
    queryFn: async () => {
      const res = await adminClient.get(`/analytics/insights?days=${days}`);
      return res.data;
    },
  });

  // Fetch Weekly/Monthly Review
  const { data: weeklyReview } = useQuery({
    queryKey: ['career-analytics-weekly'],
    queryFn: async () => {
      const res = await adminClient.get('/analytics/weekly-review');
      return res.data;
    },
  });

  const { data: monthlyReview } = useQuery({
    queryKey: ['career-analytics-monthly'],
    queryFn: async () => {
      const res = await adminClient.get('/analytics/monthly-review');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'var(--text-secondary)' }}>
        <Clock style={{ marginRight: '8px', animation: 'spin 1.5s linear infinite' }} />
        Compiling placement outcomes & calculating funnel conversions...
      </div>
    );
  }

  const funnel = analyticsData?.funnel;
  const counts = funnel?.counts || { discovered: 0, saved: 0, started: 0, submitted: 0, interview: 0, offer: 0 };
  const conversions = funnel?.conversions || { savedToApplied: null, appliedToInterview: null, interviewToOffer: null, sampleSize: 0, insufficientData: true };

  const roles = analyticsData?.roles || [];
  const sources = analyticsData?.sources || [];
  const resumes = analyticsData?.resume || [];
  const portfolio = analyticsData?.portfolio || [];
  const skills = analyticsData?.skills || { highDemandSkills: [], missingEvidenceGaps: [], strongEvidenceSkills: [] };
  const interview = analyticsData?.interview || { totalMocks: 0, averageScore: 0, trend: 'INSUFFICIENT_DATA', categories: [] };
  const actions = analyticsData?.actions || { actionsCompleted: 0, actionsPending: 0, completionRate: 0, observedCorrelation: '' };

  return (
    <div className="anim-fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* ── TOP BAR & CONTROLS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Career Intelligence Dashboard
          </span>
          <h1 style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'white', marginTop: '4px' }}>
            Outcome Analytics
          </h1>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: days === d ? 'var(--brand-primary)' : 'transparent',
                color: days === d ? 'white' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Last {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* ── SUMMARY STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard
          title="Career Momentum"
          value={conversions.sampleSize > 0 ? `${Math.round(actions.completionRate)}%` : 'Building'}
          icon={<TrendingUp size={20} />}
          subtitle="Completion & outcome activity"
        />
        <StatCard
          title="Applications Sent"
          value={counts.submitted}
          icon={<FileText size={20} />}
          subtitle={`${days} days range`}
        />
        <StatCard
          title="Interviews Progressed"
          value={counts.interview}
          icon={<UserCheck size={20} />}
          subtitle="Progression events tracked"
        />
        <StatCard
          title="Prep Completion"
          value={interview.totalMocks > 0 ? `${interview.averageScore}/100` : 'No Mocks'}
          icon={<Award size={20} />}
          subtitle={`Score trend: ${interview.trend}`}
        />
      </div>

      {/* ── MAIN WORKSPACE CONTENT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Left Side: Funnel + Detailed Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* VISUAL CAREER FUNNEL */}
          <Card>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} style={{ color: 'var(--brand-primary)' }} />
              Placement Conversion Funnel
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'OPPORTUNITIES DISCOVERED', count: counts.discovered, pct: 100, color: 'var(--brand-primary)' },
                { label: 'OPPORTUNITIES SAVED', count: counts.saved, pct: counts.discovered > 0 ? (counts.saved / counts.discovered) * 100 : 0, color: 'var(--accent-purple)' },
                { label: 'APPLICATIONS STARTED', count: counts.started, pct: counts.saved > 0 ? (counts.started / counts.saved) * 100 : 0, color: 'var(--p30-warning)' },
                { label: 'APPLICATIONS SUBMITTED', count: counts.submitted, pct: counts.started > 0 ? (counts.submitted / counts.started) * 100 : 0, color: 'var(--p30-primary)' },
                { label: 'INTERVIEWS PROGRESSION', count: counts.interview, pct: counts.submitted > 0 ? (counts.interview / counts.submitted) * 100 : 0, color: 'var(--p30-green)' },
                { label: 'OFFERS RECEIVED', count: counts.offer, pct: counts.interview > 0 ? (counts.offer / counts.interview) * 100 : 0, color: 'var(--status-success)' }
              ].map((stage, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '220px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {stage.label}
                  </div>
                  <div style={{ flex: 1, height: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', position: 'relative', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${stage.pct}%`, 
                        background: stage.color, 
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' 
                      }} 
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: 'white' }}>
                      {stage.count} ({Math.round(stage.pct)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* DETAIL WORKSPACE TABS */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', gap: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
            {[
              { key: 'overview', label: 'Dashboard & Insights', icon: <TrendingUp size={15} /> },
              { key: 'evidence', label: 'Evidence & Resumes', icon: <FileText size={15} /> },
              { key: 'skills', label: 'Skills & Readiness', icon: <BookOpen size={15} /> },
              { key: 'reviews', label: 'Periodic Reviews', icon: <Calendar size={15} /> }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTab === tab.key ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  padding: '8px 4px',
                  borderBottom: activeTab === tab.key ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB PANELS */}
          <div>

            {/* TAB PANEL: OVERVIEW */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* AI INSIGHTS CARD */}
                <Card style={{ border: '1px solid rgba(99, 102, 241, 0.25)', background: 'rgba(99, 102, 241, 0.02)' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Target size={16} />
                    Evidence-Based Strategy Insights
                  </h4>
                  
                  {insightsData?.insights?.map((ins: any, idx: number) => (
                    <div key={idx} style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h5 style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>{ins.title}</h5>
                        <Badge variant={ins.confidence === 'HIGH' ? 'success' : ins.confidence === 'MEDIUM' ? 'primary' : 'warning'}>
                          {ins.confidence} CONFIDENCE
                        </Badge>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        {ins.body}
                      </p>
                    </div>
                  ))}
                </Card>

                {/* Conversion metrics table */}
                <Card>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Conversion Metrics & Funnel Rates</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>SAVED → APPLIED</p>
                      <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginTop: '4px' }}>
                        {conversions.savedToApplied !== null ? `${Math.round(conversions.savedToApplied)}%` : 'n < 3'}
                      </h3>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>APPLIED → INTERVIEW</p>
                      <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginTop: '4px' }}>
                        {conversions.appliedToInterview !== null ? `${Math.round(conversions.appliedToInterview)}%` : 'n < 3'}
                      </h3>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>INTERVIEW → OFFER</p>
                      <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginTop: '4px' }}>
                        {conversions.interviewToOffer !== null ? `${Math.round(conversions.interviewToOffer)}%` : 'n < 3'}
                      </h3>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB PANEL: EVIDENCE & RESUMES */}
            {activeTab === 'evidence' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Card>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '14px' }}>Resume Version Effectiveness</h4>
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Resume Version Name</Th>
                        <Th style={{ textAlign: 'center' }}>Applications</Th>
                        <Th style={{ textAlign: 'center' }}>Interviews</Th>
                        <Th style={{ textAlign: 'center' }}>Avg Alignment</Th>
                        <Th style={{ textAlign: 'right' }}>Interview Rate</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {resumes.map((res: any, idx: number) => (
                        <Tr key={idx}>
                          <Td style={{ fontWeight: 600, color: 'white' }}>{res.title}</Td>
                          <Td style={{ textAlign: 'center' }}>{res.total}</Td>
                          <Td style={{ textAlign: 'center' }}>{res.interviews}</Td>
                          <Td style={{ textAlign: 'center' }}>{res.avgAlignment}%</Td>
                          <Td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--brand-primary)' }}>
                            {res.interviewRate !== null ? `${Math.round(res.interviewRate)}%` : 'n < 3'}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Card>

                <Card>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '14px' }}>Project Highlight Relevance</h4>
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Highlighted Project Title</Th>
                        <Th style={{ textAlign: 'center' }}>Highlighted Count</Th>
                        <Th style={{ textAlign: 'center' }}>Interviews Associated</Th>
                        <Th style={{ textAlign: 'right' }}>Association Rate</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {portfolio.map((proj: any, idx: number) => (
                        <Tr key={idx}>
                          <Td style={{ fontWeight: 600, color: 'white' }}>{proj.title}</Td>
                          <Td style={{ textAlign: 'center' }}>{proj.highlightedCount}</Td>
                          <Td style={{ textAlign: 'center' }}>{proj.interviewCount}</Td>
                          <Td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--p30-green)' }}>
                            {proj.associationRate !== null ? `${Math.round(proj.associationRate)}%` : 'n < 3'}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Card>
              </div>
            )}

            {/* TAB PANEL: SKILLS & READINESS */}
            {activeTab === 'skills' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>Skill Gaps & Target Opportunity Frequency</h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, listStyle: 'none' }}>
                    {skills.highDemandSkills.map((sk: any, idx: number) => (
                      <li key={idx} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{sk.name}</span>
                        <Badge variant="primary">{sk.requestedCount} opportunities</Badge>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>Mock Interview Simulator Readiness</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {interview.categories.map((cat: any, idx: number) => (
                      <div key={idx} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
                          <span>{cat.name}</span>
                          <span style={{ color: 'var(--brand-primary)' }}>{cat.score}%</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${cat.score}%`, background: 'var(--brand-primary)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB PANEL: PERIODIC REVIEWS */}
            {activeTab === 'reviews' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Weekly review */}
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>Weekly Progress Log</h4>
                    <Badge variant="neutral">{weeklyReview?.period}</Badge>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {weeklyReview?.summary}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <div style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{weeklyReview?.applicationsSubmitted}</span>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>APPLICATIONS</p>
                    </div>
                    <div style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{weeklyReview?.interviewsScheduled}</span>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>INTERVIEWS</p>
                    </div>
                  </div>
                </Card>

                {/* Monthly review */}
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>Monthly Summary Report</h4>
                    <Badge variant="primary">{monthlyReview?.period}</Badge>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {monthlyReview?.summary}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <div style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{monthlyReview?.applicationsSubmitted}</span>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>APPLICATIONS</p>
                    </div>
                    <div style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{monthlyReview?.skillsAcquired}</span>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>SKILLS ACQUIRED</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

          </div>

        </div>

        {/* Right Side Sidebar: BottleneckExplanationCard + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* BOTTLENECK ALERT CARD */}
          {bottleneckData && (
            <Card style={{ border: `1px solid ${bottleneckData.stage === 'EXECUTION' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}` }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: bottleneckData.stage === 'EXECUTION' ? 'var(--status-success)' : 'var(--status-error)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                <AlertCircle size={16} />
                Bottleneck Warning: {bottleneckData.stage}
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>OBSERVED PATTERN</p>
                  <p style={{ fontSize: '13px', color: 'white', marginTop: '4px', fontWeight: 600 }}>{bottleneckData.observed}</p>
                </div>

                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>POSSIBLE EXPLANATION</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{bottleneckData.interpretation}</p>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(99,102,241,0.03)', border: '1px dashed var(--brand-primary)' }}>
                  <p style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase' }}>RECOMMENDED FOCUS</p>
                  <p style={{ fontSize: '13px', color: 'white', marginTop: '4px', fontWeight: 700 }}>{bottleneckData.recommendation}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Action completion effectiveness metrics */}
          <Card>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Completed Strategy Action Effectiveness</h4>
            <div style={{ height: '120px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'white' }}>{Math.round(actions.completionRate)}%</h2>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Completion Ratio</span>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0, padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
              {actions.observedCorrelation}
            </p>
          </Card>

        </div>

      </div>

    </div>
  );
}
