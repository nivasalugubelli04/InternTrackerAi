import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase, CheckCircle, Clock, AlertTriangle, FileText, FolderGit2,
  ListTodo, UserCheck, MessageSquare, ShieldAlert, Sparkles, Send,
  ThumbsUp, ThumbsDown, CheckCircle2, ChevronRight, HelpCircle, GraduationCap
} from 'lucide-react';
import { adminClient } from '../api/admin-client';
import { Card, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FormControl, FormGroup, FormLabel } from '../components/ui/Form';

export default function ApplicationPreparation() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'match' | 'resume' | 'portfolio' | 'gaps' | 'copilot' | 'interview'>('overview');

  // Copilot question state
  const [question, setQuestion] = useState('');
  const [copilotResponse, setCopilotResponse] = useState<{ question: string; answer: string; groundedEvidence: string[] } | null>(null);

  // Resume diff feedback state
  const [selectedChanges, setSelectedChanges] = useState<Record<number, boolean>>({});

  // Fetch Alignment and Match Analysis
  const { data: alignmentData, isLoading: loadingAlignment } = useQuery({
    queryKey: ['application-alignment', id],
    queryFn: async () => {
      const res = await adminClient.get(`/opportunities/${id}/alignment`);
      return res.data;
    },
    enabled: !!id,
  });

  // Fetch Preparation Checklist
  const { data: checklistData, refetch: refetchChecklist } = useQuery({
    queryKey: ['application-checklist', id],
    queryFn: async () => {
      const res = await adminClient.get(`/applications/${id}/checklist`);
      return res.data;
    },
    enabled: !!id,
  });

  // Fetch Recommended Projects
  const { data: projectsData } = useQuery({
    queryKey: ['application-projects', id],
    queryFn: async () => {
      const res = await adminClient.get(`/applications/${id}/project-recommendations`);
      return res.data;
    },
    enabled: !!id,
  });

  // Fetch Preparation Plan
  const { data: planData } = useQuery({
    queryKey: ['application-plan', id],
    queryFn: async () => {
      const res = await adminClient.get(`/opportunities/${id}/preparation-plan`);
      return res.data;
    },
    enabled: !!id,
  });

  // Fetch Resume Tailoring Draft
  const { data: resumeTailorData, refetch: refetchResumeTailor, isLoading: loadingResume } = useQuery({
    queryKey: ['application-resume-tailor', id],
    queryFn: async () => {
      const res = await adminClient.post(`/applications/${id}/resume-tailor`);
      return res.data;
    },
    enabled: !!id,
  });

  // Toggle checklist mutations
  const toggleChecklistMutation = useMutation({
    mutationFn: async ({ key, isCompleted }: { key: string; isCompleted: boolean }) => {
      await adminClient.patch(`/applications/${id}/checklist/${key}`, { isCompleted });
    },
    onSuccess: () => {
      refetchChecklist();
      queryClient.invalidateQueries({ queryKey: ['application-alignment', id] });
    },
  });

  // Ask Copilot mutation
  const askCopilotMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await adminClient.post(`/applications/${id}/copilot/ask`, { question: q });
      return res.data;
    },
    onSuccess: (data) => {
      setCopilotResponse(data);
    },
  });

  // Approve resume draft mutation
  const approveResumeMutation = useMutation({
    mutationFn: async (draftId: string) => {
      await adminClient.post(`/applications/${id}/resume-tailor/approve`, { draftId });
    },
    onSuccess: () => {
      refetchResumeTailor();
      queryClient.invalidateQueries({ queryKey: ['application-alignment', id] });
      alert('Tailored resume version approved successfully!');
    },
  });

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    askCopilotMutation.mutate(question);
  };

  if (loadingAlignment) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'var(--text-secondary)' }}>
        <Clock style={{ marginRight: '8px', animation: 'spin 1.5s linear infinite' }} />
        Analyzing alignment metrics & matching professional evidence...
      </div>
    );
  }

  const alignment = alignmentData?.alignment;
  const matchDetails = alignmentData?.alignment?.explanationJson?.explanationItems || [];
  const quickWins = alignmentData?.alignment?.explanationJson?.quickWins || [];
  const gaps = alignmentData?.alignment?.explanationJson?.gaps || [];

  return (
    <div className="anim-fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* ── TOP BAR: OPPORTUNITY DETAILS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Application Copilot Workspace
          </span>
          <h1 style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'white', marginTop: '4px' }}>
            {alignmentData?.alignment?.application?.jobTitleSnapshot || 'Role Title'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            {alignmentData?.alignment?.application?.companyNameSnapshot} &bull; {alignmentData?.alignment?.application?.locationSnapshot}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', fontWeight: 600 }}>STATUS</p>
            <Badge variant="primary" style={{ marginTop: '4px', textTransform: 'uppercase' }}>
              {alignmentData?.alignment?.application?.status}
            </Badge>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', fontWeight: 600 }}>PROFILE ALIGNMENT</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--p30-green)' }}>
                {alignment?.overallAlignment}%
              </span>
              <Badge variant={alignment?.overallAlignment >= 75 ? 'success' : 'warning'}>
                {alignment?.readinessLevel.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ── ALIGNMENT CARDS GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard
          title="Required Skill Coverage"
          value={`${Math.round(alignment?.requiredSkillCoverage || 0)}%`}
          icon={<UserCheck size={20} />}
          subtitle="Mandatory qualifications matched"
        />
        <StatCard
          title="Evidence Strength"
          value={`${Math.round(alignment?.evidenceCoverage || 0)}%`}
          icon={<Sparkles size={20} />}
          subtitle="Verified evidence graph validation"
        />
        <StatCard
          title="Portfolio Relevance"
          value={`${Math.round(alignment?.portfolioRelevance || 0)}%`}
          icon={<FolderGit2 size={20} />}
          subtitle="Project and experience similarity score"
        />
        <StatCard
          title="Interview Readiness"
          value={`${Math.round(alignment?.interviewReadiness || 0)}%`}
          icon={<MessageSquare size={20} />}
          subtitle="Based on mock simulations practice"
        />
      </div>

      {/* ── MAIN WORKSPACE TABS ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', gap: '24px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
        {[
          { key: 'overview', label: 'Overview & Checklist', icon: <ListTodo size={16} /> },
          { key: 'match', label: 'Match Analysis', icon: <Sparkles size={16} /> },
          { key: 'resume', label: 'Resume tailoring', icon: <FileText size={16} /> },
          { key: 'portfolio', label: 'Portfolio selector', icon: <FolderGit2 size={16} /> },
          { key: 'gaps', label: 'Gap strategy', icon: <ShieldAlert size={16} /> },
          { key: 'copilot', label: 'Copilot QA', icon: <MessageSquare size={16} /> },
          { key: 'interview', label: 'Interview defence', icon: <GraduationCap size={16} /> }
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

      {/* ── TAB PANELS ── */}
      <div style={{ marginTop: '16px' }}>

        {/* PANEL: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ListTodo size={18} style={{ color: 'var(--brand-primary)' }} />
                    Application Preparation Checklist
                  </h3>
                  <Badge variant="neutral">{checklistData?.filter((c: any) => c.isCompleted).length} / {checklistData?.length} Done</Badge>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {checklistData?.map((item: any) => (
                    <div 
                      key={item.key} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '12px', 
                        padding: '12px', 
                        background: 'rgba(255,255,255,0.02)', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-glass)' 
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={(e) => toggleChecklistMutation.mutate({ key: item.itemKey, isCompleted: e.target.checked })}
                        style={{ marginTop: '3px', cursor: 'pointer', transform: 'scale(1.15)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: item.isCompleted ? 'var(--text-muted)' : 'white', textDecoration: item.isCompleted ? 'line-through' : 'none' }}>
                          {item.title}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Action Plan steps */}
              <Card>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} style={{ color: 'var(--p30-warning)' }} />
                  Custom Action Plan
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {planData?.stepsJson?.map((step: any, idx: number) => (
                    <div 
                      key={idx}
                      style={{ 
                        padding: '16px', 
                        borderRadius: '12px', 
                        background: 'rgba(99, 102, 241, 0.03)', 
                        borderLeft: `4px solid ${step.priority === 'NOW' ? 'var(--status-error)' : 'var(--brand-primary)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', background: step.priority === 'NOW' ? 'var(--status-error)' : 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                            {step.priority}
                          </span>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{step.title}</p>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{step.description}</p>
                      </div>
                      <Link to={step.linkTarget}>
                        <Button variant="secondary" size="sm">Go to Action</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Sidebar quick wins */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Card style={{ border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <ThumbsUp size={16} />
                  Quick Wins Detected
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {quickWins.map((win: any, idx: number) => (
                    <div key={idx} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.05)', border: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{win.title}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{win.description}</p>
                      <p style={{ fontSize: '10px', color: 'var(--brand-primary)', fontWeight: 700, marginTop: '6px', textTransform: 'uppercase' }}>EFFORT: {win.effort}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card style={{ border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--status-error)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <AlertTriangle size={16} />
                  Top Gaps Identified
                </h4>
                <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {gaps.map((gap: string, idx: number) => (
                    <li key={idx} style={{ lineHeight: 1.4 }}>{gap}</li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}

        {/* PANEL: MATCH ANALYSIS */}
        {activeTab === 'match' && (
          <Card>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              Extracted Job Requirements Alignment
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {matchDetails.map((item: any, idx: number) => (
                <div 
                  key={idx} 
                  style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid var(--border-glass)',
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 3fr',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>{item.name}</p>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700, display: 'inline-block', marginTop: '4px' }}>
                      {item.classification}
                    </span>
                  </div>

                  <div>
                    <Badge variant={
                      item.matchType === 'STRONG_MATCH' ? 'success' :
                      item.matchType === 'DEMONSTRATED_MATCH' ? 'primary' :
                      item.matchType === 'GROWING_MATCH' ? 'warning' : 'error'
                    }>
                      {item.matchType.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* PANEL: RESUME TAILORING */}
        {activeTab === 'resume' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>Resume Tailoring Plan</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Side-by-side diff comparing original vs suggested adjustments.</p>
                </div>
                {resumeTailorData?.status === 'DRAFT' && (
                  <Button onClick={() => approveResumeMutation.mutate(resumeTailorData.id)}>
                    Approve and Sync Tailoring
                  </Button>
                )}
              </div>

              {loadingResume ? (
                <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Generating optimization draft...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Left: Original */}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>Original Resume</h4>
                    <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', minHeight: '300px' }}>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '16px' }}>
                        "{resumeTailorData?.originalContentJson?.summary || 'No summary available.'}"
                      </p>
                      <h5 style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Experience & Projects</h5>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {resumeTailorData?.originalContentJson?.experience?.map((exp: any, idx: number) => (
                          <li key={idx} style={{ padding: '8px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }}>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{exp.role || exp.title}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{exp.company}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{exp.description}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Right: Suggested Tailoring */}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '12px', textTransform: 'uppercase' }}>Suggested Tailoring</h4>
                    <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(99,102,241,0.02)', border: '1px solid rgba(99,102,241,0.15)', minHeight: '300px' }}>
                      <p style={{ fontSize: '14px', color: 'white', fontStyle: 'italic', marginBottom: '16px', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                        "{resumeTailorData?.tailoredContentJson?.summary}"
                      </p>
                      <h5 style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Optimized Bullet Achievements</h5>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {resumeTailorData?.tailoredContentJson?.experience?.map((exp: any, idx: number) => (
                          <li key={idx} style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid var(--p30-green)' }}>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{exp.role}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{exp.company}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '4px' }}>{exp.description}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Change explanation reasons card */}
            <Card>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Tailoring Explanation (Factual Grounding)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {resumeTailorData?.explanationJson?.map((ex: any, idx: number) => (
                  <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>Section: {ex.section}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}><strong style={{ color: 'white' }}>Reason:</strong> {ex.reason}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* PANEL: PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <Card>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Ranked Project Highlights</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Ranked based on technical overlap and evidence matching metrics.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {projectsData?.map((proj: any, idx: number) => (
                <div 
                  key={idx}
                  style={{ 
                    padding: '20px', 
                    borderRadius: '12px', 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    gap: '20px',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{ background: 'var(--brand-light)', padding: '12px', borderRadius: '10px', color: 'var(--brand-primary)', fontWeight: 800, fontSize: '18px' }}>
                    #{proj.rank}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>{proj.projectTitle}</h4>
                      <Badge variant="success">RELEVANCE: {proj.relevanceScore}%</Badge>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      {proj.whyHighlighted}
                    </p>
                    <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid var(--brand-primary)' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>Tailored Contribution Highlight:</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{proj.tailoredContribution || 'Factual implementation details'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* PANEL: GAPS */}
        {activeTab === 'gaps' && (
          <Card>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Missing Skill & Evidence Gaps</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {gaps.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No major skill or evidence gaps detected! You are ready to apply.</p>
              ) : (
                gaps.map((gap: string, idx: number) => (
                  <div 
                    key={idx}
                    style={{ 
                      padding: '16px', 
                      borderRadius: '8px', 
                      background: 'rgba(239, 68, 68, 0.02)', 
                      border: '1px solid rgba(239, 68, 68, 0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{gap}</p>
                    <Link to="/learning">
                      <Button variant="secondary" size="sm">Go Bridge Gap</Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* PANEL: COPILOT */}
        {activeTab === 'copilot' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <Card>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Ask Copilot</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Ask role-specific questions and retrieve evidence-grounded responses.</p>
              
              <form onSubmit={handleAsk}>
                <FormGroup>
                  <FormLabel>Application Question</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="e.g. Describe a challenge you overcame utilizing Python."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                </FormGroup>
                <Button type="submit" style={{ marginTop: '12px' }}>
                  Ask Copilot
                </Button>
              </form>
            </Card>

            <Card>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Grounded AI Answer</h3>
              {copilotResponse ? (
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-primary)' }}>QUESTION: "{copilotResponse.question}"</p>
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)', minHeight: '120px', marginTop: '12px', fontSize: '14px', lineHeight: 1.5, color: 'white' }}>
                    {copilotResponse.answer}
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>GROUNDED SKILLS:</span>
                    {copilotResponse.groundedEvidence.map((s, i) => (
                      <Badge key={i} variant="primary">{s}</Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
                  Ask a question to see an answer grounded strictly in your portfolio details.
                </div>
              )}
            </Card>
          </div>
        )}

        {/* PANEL: INTERVIEW */}
        {activeTab === 'interview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <Card>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Likely Technical Interview Topics</h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, listStyle: 'none' }}>
                {matchDetails.slice(0, 3).map((item: any, idx: number) => (
                  <li 
                    key={idx} 
                    style={{ 
                      padding: '12px', 
                      background: 'rgba(255,255,255,0.01)', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-glass)',
                      borderLeft: '4px solid var(--brand-primary)'
                    }}
                  >
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{item.name} Core Fundamentals</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Review architecture, core methods, and typical interview questions in our simulator.</p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Project Defence Areas</h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, listStyle: 'none' }}>
                {projectsData?.slice(0, 2).map((proj: any, idx: number) => (
                  <li 
                    key={idx} 
                    style={{ 
                      padding: '12px', 
                      background: 'rgba(255,255,255,0.01)', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-glass)',
                      borderLeft: '4px solid var(--p30-green)'
                    }}
                  >
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Defence: {proj.projectTitle}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}><strong style={{ color: 'white' }}>Key:</strong> Be ready to explain technology trade-offs, architecture decisions, and challenges implementing role requirements.</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
