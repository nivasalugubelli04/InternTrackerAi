import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, AlertCircle, CheckCircle, Clock, FileText, ChevronRight, Play, ExternalLink, Calendar, Mail, FileCheck, Star, RefreshCw } from 'lucide-react';
import { adminClient } from '../api/admin-client';
import { Button } from '../components/ui/Button';

// Lifecycle columns
const COLUMNS = [
  { key: 'SAVED', label: 'Saved', color: '#6B7280' },
  { key: 'APPLICATION_STARTED', label: 'Started', color: '#6366F1' },
  { key: 'APPLIED', label: 'Applied', color: '#246BFE' },
  { key: 'ASSESSMENT', label: 'Assessment', color: '#06B6D4' },
  { key: 'INTERVIEW', label: 'Interview', color: '#F59E0B' },
  { key: 'OFFER', label: 'Offer', color: '#10B981' },
  { key: 'CLOSED', label: 'Closed', color: '#EF4444' }, // Rejected, Withdrawn, Expired
];

export default function Applications() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'ai' | 'timeline'>('details');

  // Cover letter editing state
  const [coverLetterText, setCoverLetterText] = useState('');
  const [notesText, setNotesText] = useState('');

  // Fetch applications
  const { data: listResponse, isLoading } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: async () => {
      const res = await adminClient.get('/applications', { params: { limit: 100 } });
      return res.data;
    },
  });
  const applications = listResponse?.data ?? [];

  // Fetch selected application details
  const { data: selectedApp, refetch: refetchDetail } = useQuery({
    queryKey: ['admin-application-detail', selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const res = await adminClient.get(`/applications/${selectedId}`);
      // Sync local notes & cover letter text when loaded
      setCoverLetterText(res.data.coverLetterText ?? '');
      setNotesText(res.data.notes ?? '');
      return res.data;
    },
    enabled: !!selectedId,
  });

  // Status transition mutation
  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await adminClient.patch(`/applications/${id}/status`, { status, note: `Status updated to ${status}` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-application-detail', selectedId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update status.');
    },
  });

  // AI Actions mutations
  const aiAnalyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminClient.post(`/applications/${id}/ai/analyze`);
      return res.data;
    },
  });

  const aiCoverLetterMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminClient.post(`/applications/${id}/ai/cover-letter`);
      setCoverLetterText(res.data.content);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-application-detail', selectedId] });
    },
  });

  const updateAppMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await adminClient.patch(`/applications/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-application-detail', selectedId] });
      alert('Notes updated successfully!');
    },
  });

  const getPriorityColor = (label: string) => {
    switch (label) {
      case 'URGENT': return 'var(--status-error)';
      case 'HIGH': return 'var(--brand-primary)';
      case 'MEDIUM': return 'var(--status-warning)';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusIndex = (status: string) => {
    const pipeline = ['SAVED', 'APPLICATION_STARTED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'FINAL_ROUND', 'OFFER', 'ACCEPTED'];
    return pipeline.indexOf(status);
  };

  // Group applications by Kanban columns
  const getColumnApps = (colKey: string) => {
    return applications.filter((app: any) => {
      if (colKey === 'CLOSED') {
        return ['REJECTED', 'WITHDRAWN', 'EXPIRED'].includes(app.status);
      }
      if (colKey === 'INTERVIEW') {
        return ['INTERVIEW', 'FINAL_ROUND'].includes(app.status);
      }
      if (colKey === 'OFFER') {
        return ['OFFER', 'ACCEPTED'].includes(app.status);
      }
      return app.status === colKey;
    });
  };

  return (
    <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', position: 'relative' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: '24px', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>
            Applications Command Pipeline
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Manage and track your internship applications through dynamic lifecycle stages and AI-generated checklists.
          </p>
        </div>
        <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-applications'] })}>
          <RefreshCw size={16} style={{ marginRight: '6px' }} /> Refresh board
        </Button>
      </div>

      {/* Kanban Board Container */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
        {COLUMNS.map((col) => {
          const colApps = getColumnApps(col.key);
          return (
            <div
              key={col.key}
              style={{
                width: '280px',
                minWidth: '280px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '16px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Column Header */}
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `4px solid ${col.color}` }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>{col.label}</span>
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                  {colApps.length}
                </span>
              </div>

              {/* Column Body list */}
              <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {colApps.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                    No applications
                  </div>
                ) : (
                  colApps.map((app: any) => {
                    const matchScore = app.job?.matchScores?.[0]?.overallScore ?? 75;
                    const isSelected = app.id === selectedId;
                    return (
                      <div
                        key={app.id}
                        onClick={() => setSelectedId(app.id)}
                        style={{
                          padding: '16px',
                          backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: getPriorityColor(app.priorityLabel),
                            backgroundColor: `${getPriorityColor(app.priorityLabel)}15`,
                            border: `1px solid ${getPriorityColor(app.priorityLabel)}25`,
                          }}>
                            {app.priorityLabel}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700 }}>
                            {matchScore}% Match
                          </span>
                        </div>
                        <h4 style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700, margin: '4px 0' }}>{app.jobTitleSnapshot}</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>{app.companyNameSnapshot}</p>
                        
                        {app.nextAction && (
                          <div style={{ fontSize: '10px', color: 'var(--brand-primary)', fontWeight: 600, display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <Clock size={10} /> Next: {app.nextAction}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Side Slider Panel (Selected Application Details) */}
      {selectedId && selectedApp && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '600px',
            backgroundColor: 'var(--bg-tertiary)',
            borderLeft: '1px solid var(--border-glass)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            animation: 'slideInRight 0.3s ease-out forwards',
          }}
        >
          {/* Slider Header */}
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 800, textTransform: 'uppercase' }}>
                {selectedApp.priorityLabel} Priority • {selectedApp.status}
              </span>
              <h3 style={{ color: 'white', fontWeight: 800, fontSize: '18px', margin: '4px 0' }}>{selectedApp.jobTitleSnapshot}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{selectedApp.companyNameSnapshot}</p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px' }}
            >
              ✕
            </button>
          </div>

          {/* Slider Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)' }}>
            {(['details', 'ai', 'timeline'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  color: activeTab === tab ? 'white' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Slider Body */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {activeTab === 'details' && (
              <>
                {/* Visual Status Progression */}
                <div>
                  <h4 style={{ color: 'white', fontSize: '12px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Visual Stage Tracker
                  </h4>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {['SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER'].map((stage, idx) => {
                      const appIdx = getStatusIndex(selectedApp.status);
                      const stageIdx = getStatusIndex(stage);
                      const isCompleted = appIdx >= stageIdx && selectedApp.status !== 'REJECTED';
                      const isCurrent = selectedApp.status === stage || (selectedApp.status === 'FINAL_ROUND' && stage === 'INTERVIEW') || (selectedApp.status === 'ACCEPTED' && stage === 'OFFER');
                      
                      return (
                        <div key={stage} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '100%',
                            height: '6px',
                            borderRadius: '3px',
                            backgroundColor: isCurrent ? 'var(--brand-primary)' : isCompleted ? 'var(--status-success)' : 'var(--bg-primary)',
                          }} />
                          <span style={{ fontSize: '9px', fontWeight: 700, color: isCurrent ? 'white' : 'var(--text-muted)' }}>{stage}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Change Status Dropdown */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                    Update Stage
                  </label>
                  <select
                    value={selectedApp.status}
                    onChange={(e) => changeStatusMutation.mutate({ id: selectedApp.id, status: e.target.value })}
                    style={{ width: '100%', height: '36px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'white', border: '1px solid var(--border-subtle)', padding: '4px 8px' }}
                  >
                    <option value="SAVED">Saved</option>
                    <option value="APPLICATION_STARTED">Started</option>
                    <option value="APPLIED">Applied</option>
                    <option value="ASSESSMENT">Assessment</option>
                    <option value="INTERVIEW">Interview</option>
                    <option value="FINAL_ROUND">Final Round</option>
                    <option value="OFFER">Offer</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="WITHDRAWN">Withdrawn</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>

                {/* Personal Notes */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ color: 'white', fontSize: '12px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>
                      Personal Notes
                    </h4>
                    <button
                      onClick={() => updateAppMutation.mutate({ id: selectedApp.id, data: { notes: notesText } })}
                      style={{ fontSize: '11px', color: 'var(--brand-primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Save Notes
                    </button>
                  </div>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Preparation thoughts, recruiter details, portal links..."
                    style={{ width: '100%', minHeight: '100px', backgroundColor: 'var(--bg-secondary)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', fontSize: '13px', lineHeight: 1.5 }}
                  />
                </div>

                {/* Document attachments */}
                <div>
                  <h4 style={{ color: 'white', fontSize: '12px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Linked Application Documents
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={14} color="var(--brand-primary)" /> Resume Version
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {selectedApp.resumeVersion?.versionName ?? 'No Resume Linked'}
                      </span>
                    </div>
                    {selectedApp.portfolioUrl && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ExternalLink size={14} color="var(--status-success)" /> Portfolio
                        </span>
                        <a href={selectedApp.portfolioUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--brand-primary)', textDecoration: 'none' }}>
                          Open Link
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'ai' && (
              <>
                {/* Score indicators */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700 }}>JOB MATCH</span>
                    <span style={{ color: 'var(--status-success)', fontSize: '32px', fontWeight: 900, marginTop: '8px' }}>
                      {selectedApp.job?.matchScores?.[0]?.overallScore ?? 75}%
                    </span>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700 }}>READINESS</span>
                    <span style={{ color: 'var(--brand-primary)', fontSize: '32px', fontWeight: 900, marginTop: '8px' }}>
                      {aiAnalyzeMutation.data?.readinessScore ?? 65}%
                    </span>
                  </div>
                </div>

                {/* AI analysis triggers */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button style={{ flex: 1 }} onClick={() => aiAnalyzeMutation.mutate(selectedApp.id)} disabled={aiAnalyzeMutation.isPending}>
                    {aiAnalyzeMutation.isPending ? 'Analyzing...' : 'Run Gap & Readiness Analysis'}
                  </Button>
                  <Button variant="secondary" style={{ flex: 1 }} onClick={() => aiCoverLetterMutation.mutate(selectedApp.id)} disabled={aiCoverLetterMutation.isPending}>
                    {aiCoverLetterMutation.isPending ? 'Drafting...' : 'AI Cover Letter Draft'}
                  </Button>
                </div>

                {/* Gap analysis result output */}
                {aiAnalyzeMutation.data && (
                  <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <h5 style={{ color: 'white', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>Strengths Alignment</h5>
                      {aiAnalyzeMutation.data.strengths.map((s: string, i: number) => (
                        <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <CheckCircle size={14} color="var(--status-success)" /> {s}
                        </div>
                      ))}
                    </div>
                    {aiAnalyzeMutation.data.potentialWeaknesses?.length > 0 && (
                      <div>
                        <h5 style={{ color: 'white', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>Potential Gaps / Improvements</h5>
                        {aiAnalyzeMutation.data.potentialWeaknesses.map((w: string, i: number) => (
                          <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '6px', marginTop: '4px' }}>
                            <AlertCircle size={14} color="var(--status-error)" /> {w}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Cover letter draft */}
                {coverLetterText && (
                  <div>
                    <h4 style={{ color: 'white', fontSize: '12px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Tailored Cover Letter
                    </h4>
                    <textarea
                      value={coverLetterText}
                      onChange={(e) => setCoverLetterText(e.target.value)}
                      style={{ width: '100%', minHeight: '200px', backgroundColor: 'var(--bg-secondary)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', fontSize: '13px', lineHeight: 1.6 }}
                    />
                    <Button variant="secondary" style={{ marginTop: '8px' }} onClick={() => updateAppMutation.mutate({ id: selectedApp.id, data: { coverLetterText } })}>
                      Save Cover Letter
                    </Button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'timeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border-glass)' }}>
                {selectedApp.events?.map((evt: any) => (
                  <div key={evt.id} style={{ position: 'relative' }}>
                    {/* Event node */}
                    <div style={{
                      position: 'absolute',
                      left: '-26px',
                      top: '2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--brand-primary)',
                      border: '2px solid var(--bg-tertiary)'
                    }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 700 }}>
                      {new Date(evt.createdAt).toLocaleString()}
                    </p>
                    <h4 style={{ color: 'white', fontSize: '13px', fontWeight: 700, margin: '2px 0' }}>{evt.toStatus}</h4>
                    {evt.note && <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>{evt.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
