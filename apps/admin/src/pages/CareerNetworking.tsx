import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, MessageSquare, AlertCircle, Plus, Calendar, Compass,
  TrendingUp, Award, Clock, ArrowRight, UserCheck, ShieldAlert, Sparkles,
  ChevronRight, ArrowUpRight, HelpCircle, CheckCircle, Trash2, Mail
} from 'lucide-react';
import { adminClient } from '../api/admin-client';
import { Card, StatCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, Tbody, Td, Th, Thead, Tr } from '../components/ui/Table';
import { Button } from '../components/ui/Button';

export default function CareerNetworking() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'contacts' | 'outreach' | 'readiness'>('contacts');

  // Contact list state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '', role: '', company: '', industry: '', education: '',
    connectionSource: '', publicProfileUrl: '', privateNotes: '', pipelineState: 'DISCOVERED'
  });

  // Outreach Composer state
  const [selectedContactId, setSelectedContactId] = useState('');
  const [outreachGoal, setOutreachGoal] = useState('LEARN_ROLE');
  const [outreachTone, setOutreachTone] = useState('Professional');
  const [selectedProject, setSelectedProject] = useState('');

  // Referral readiness state
  const [selectedReadinessContactId, setSelectedReadinessContactId] = useState('');
  const [targetOpportunityId, setTargetOpportunityId] = useState('');

  // ── API QUERIES ──

  // Fetch Overview Counts & Follow-ups
  const { data: overviewData } = useQuery({
    queryKey: ['networking-overview'],
    queryFn: async () => {
      const res = await adminClient.get('/networking/overview');
      return res.data;
    },
  });

  // Fetch Contacts
  const { data: contactsData, isLoading: loadingContacts } = useQuery({
    queryKey: ['networking-contacts'],
    queryFn: async () => {
      const res = await adminClient.get('/networking/contacts');
      return res.data;
    },
  });

  // Fetch User Projects for evidence matching dropdown
  const { data: portfolioData } = useQuery({
    queryKey: ['portfolio-evidence'],
    queryFn: async () => {
      const res = await adminClient.get('/portfolio-intelligence/assessment'); // fallback query
      return res.data;
    },
  });

  // Fetch Opportunities for referral selection
  const { data: opportunitiesData } = useQuery({
    queryKey: ['saved-opportunities'],
    queryFn: async () => {
      const res = await adminClient.get('/opportunities'); // fallback opportunities list
      return res.data;
    },
  });

  // Generate Outreach Draft Mutation
  const outreachMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await adminClient.post('/networking/outreach/generate', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networking-contacts'] });
    },
  });

  // Create Contact Mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await adminClient.post('/networking/contacts', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networking-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['networking-overview'] });
      setShowAddModal(false);
      setNewContact({
        name: '', role: '', company: '', industry: '', education: '',
        connectionSource: '', publicProfileUrl: '', privateNotes: '', pipelineState: 'DISCOVERED'
      });
    },
  });

  // Delete Contact Mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminClient.delete(`/networking/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networking-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['networking-overview'] });
    },
  });

  // Add Interaction Log Mutation
  const addInteractionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await adminClient.post('/networking/interactions', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networking-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['networking-overview'] });
    },
  });

  // Fetch Referral Readiness
  const { data: readinessData, refetch: refetchReadiness } = useQuery({
    queryKey: ['referral-readiness', selectedReadinessContactId, targetOpportunityId],
    queryFn: async () => {
      if (!selectedReadinessContactId || !targetOpportunityId) return null;
      const res = await adminClient.get(`/networking/referral-readiness/${targetOpportunityId}?contactId=${selectedReadinessContactId}`);
      return res.data;
    },
    enabled: !!selectedReadinessContactId && !!targetOpportunityId,
  });

  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createContactMutation.mutate(newContact);
  };

  const handleOutreachSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    outreachMutation.mutate({
      contactId: selectedContactId,
      goal: outreachGoal,
      tone: outreachTone,
      projectId: selectedProject,
    });
  };

  const handleMarkSent = (contactId: string) => {
    addInteractionMutation.mutate({
      contactId,
      type: 'OUTREACH_SENT',
      description: 'Personalized AI outreach draft sent to contact via LinkedIn/Email.',
    });
  };

  return (
    <div className="anim-fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Referral & Relationship CRM
          </span>
          <h1 style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'white', marginTop: '4px' }}>
            Networking Intelligence
          </h1>
        </div>

        <Button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--brand-primary)' }}>
          <Plus size={16} />
          Add Professional Contact
        </Button>
      </div>

      {/* ── OVERVIEW STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard
          title="Total Network Size"
          value={overviewData?.counts?.totalContacts || 0}
          icon={<Users size={20} />}
          subtitle="User-recorded professionals"
        />
        <StatCard
          title="Outreach Attempted"
          value={overviewData?.counts?.contacted || 0}
          icon={<Mail size={20} />}
          subtitle="Outbound intro messages sent"
        />
        <StatCard
          title="Active Discussions"
          value={overviewData?.counts?.activeConversations || 0}
          icon={<MessageSquare size={20} />}
          subtitle="Two-way advice conversations"
        />
        <StatCard
          title="Referrals Discussed"
          value={overviewData?.counts?.referralDiscussed || 0}
          icon={<Award size={20} />}
          subtitle="Recorded referral progressions"
        />
      </div>

      {/* ── WORKSPACE SPLIT LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.2fr', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* LEFT COLUMN: Main Tabs Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* TABS SELECTOR */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', gap: '20px', paddingBottom: '8px' }}>
            {[
              { key: 'contacts', label: 'Contacts & Pipeline', icon: <Users size={16} /> },
              { key: 'outreach', label: 'AI Outreach Strategy Composer', icon: <Sparkles size={16} /> },
              { key: 'readiness', label: 'Referral Readiness Evaluator', icon: <Award size={16} /> }
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

            {/* TAB PANEL 1: CONTACTS PIPELINE */}
            {activeTab === 'contacts' && (
              <Card>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '20px' }}>Professional Contacts</h3>
                
                {loadingContacts ? (
                  <p style={{ color: 'var(--text-secondary)' }}>Loading contacts...</p>
                ) : !contactsData || contactsData.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                    <p style={{ fontWeight: 600 }}>No professional contacts added yet.</p>
                    <p style={{ fontSize: '13px', marginTop: '4px' }}>Add target alumni or recruiters to construct your professional relationship layers.</p>
                  </div>
                ) : (
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Name & Role</Th>
                        <Th>Company & Industry</Th>
                        <Th>Relevance Analysis</Th>
                        <Th>Pipeline State</Th>
                        <Th style={{ textAlign: 'right' }}>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {contactsData.map((c: any) => (
                        <Tr key={c.id}>
                          <Td>
                            <span style={{ fontWeight: 700, color: 'white', fontSize: '14px' }}>{c.name}</span>
                            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{c.role}</span>
                          </Td>
                          <Td>
                            <span style={{ fontWeight: 600, color: 'white', fontSize: '13px' }}>{c.company || 'Generic Company'}</span>
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.industry || 'Tech'}</span>
                          </Td>
                          <Td>
                            <Badge variant={c.relevance?.priority === 'HIGH PRIORITY' ? 'success' : c.relevance?.priority === 'RELEVANT' ? 'primary' : 'neutral'}>
                              {c.relevance?.priority}
                            </Badge>
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.relevance?.reasons?.join(', ') || 'General context'}
                            </span>
                          </Td>
                          <Td>
                            <Badge variant="primary">{c.pipelineState.replace('_', ' ')}</Badge>
                          </Td>
                          <Td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedContactId(c.id);
                                  setActiveTab('outreach');
                                }}
                              >
                                Draft
                              </Button>
                              <button
                                onClick={() => deleteContactMutation.mutate(c.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--status-error)', cursor: 'pointer', padding: '4px' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </Card>
            )}

            {/* TAB PANEL 2: OUTREACH COMPOSER */}
            {activeTab === 'outreach' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Card>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '20px' }}>AI Outreach Strategy Draft Generator</h3>
                  
                  <form onSubmit={handleOutreachSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      
                      {/* Select Contact */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Select Contact Target</label>
                        <select
                          value={selectedContactId}
                          onChange={(e) => setSelectedContactId(e.target.value)}
                          required
                          style={{
                            padding: '10px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        >
                          <option value="" style={{ background: '#1c1c1e' }}>Choose professional contact</option>
                          {contactsData?.map((c: any) => (
                            <option key={c.id} value={c.id} style={{ background: '#1c1c1e' }}>{c.name} ({c.role} at {c.company})</option>
                          ))}
                        </select>
                      </div>

                      {/* Select Goal */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Networking Goal</label>
                        <select
                          value={outreachGoal}
                          onChange={(e) => setOutreachGoal(e.target.value)}
                          style={{
                            padding: '10px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        >
                          <option value="LEARN_ROLE" style={{ background: '#1c1c1e' }}>Learn about their role</option>
                          <option value="UNDERSTAND_COMPANY" style={{ background: '#1c1c1e' }}>Understand company culture</option>
                          <option value="GET_ADVICE" style={{ background: '#1c1c1e' }}>Request general advice</option>
                          <option value="DISCUSS_SKILLS" style={{ background: '#1c1c1e' }}>Discuss technology skills</option>
                          <option value="REQUEST_REFERRAL" style={{ background: '#1c1c1e' }}>Referral consideration request</option>
                        </select>
                      </div>

                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      
                      {/* Select Tone */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Tone Style</label>
                        <select
                          value={outreachTone}
                          onChange={(e) => setOutreachTone(e.target.value)}
                          style={{
                            padding: '10px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        >
                          <option value="Professional" style={{ background: '#1c1c1e' }}>Formal & Professional</option>
                          <option value="Casual" style={{ background: '#1c1c1e' }}>Warm & Casual</option>
                          <option value="Inquisitive" style={{ background: '#1c1c1e' }}>Curious & Learning</option>
                        </select>
                      </div>

                      {/* Highlight Project Evidence */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Select Portfolio Project Evidence (Optional)</label>
                        <select
                          value={selectedProject}
                          onChange={(e) => setSelectedProject(e.target.value)}
                          style={{
                            padding: '10px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        >
                          <option value="" style={{ background: '#1c1c1e' }}>Do not embed project details</option>
                          {portfolioData?.analyses?.map((p: any) => (
                            <option key={p.id} value={p.id} style={{ background: '#1c1c1e' }}>{p.projectId} (Complexity: {p.complexity})</option>
                          ))}
                        </select>
                      </div>

                    </div>

                    <Button
                      type="submit"
                      disabled={outreachMutation.isPending}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--brand-primary)', marginTop: '8px' }}
                    >
                      {outreachMutation.isPending ? 'Generating outreach drafts...' : 'Generate Personalized Outreach Draft'}
                    </Button>
                  </form>
                </Card>

                {/* AI Draft Reveal Panel */}
                {outreachMutation.data && (
                  <Card style={{ border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={16} style={{ color: 'var(--p30-warning)' }} />
                        AI Draft Output
                      </h4>
                      {outreachMutation.data.riskFlags?.length > 0 ? (
                        <Badge variant="warning">FABRICATION WARNING</Badge>
                      ) : (
                        <Badge variant="success">SAFETY VERIFIED</Badge>
                      )}
                    </div>

                    {/* Short Message Version */}
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>SHORT LinkedIn VERSION (UNDER 300 CHARACTERS)</span>
                      <p style={{ color: 'white', fontSize: '13px', marginTop: '6px', lineHeight: 1.4 }}>{outreachMutation.data.draftShort}</p>
                    </div>

                    {/* Detailed Message Version */}
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>DETAILED Email VERSION</span>
                      <p style={{ color: 'white', fontSize: '13px', marginTop: '6px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{outreachMutation.data.draftDetailed}</p>
                    </div>

                    {/* Risk Feedback */}
                    {outreachMutation.data.riskFlags?.length > 0 && (
                      <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldAlert size={18} style={{ color: 'var(--status-error)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--status-error)', fontWeight: 600 }}>
                          {outreachMutation.data.riskFlags.join(', ')}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <Button
                        onClick={() => handleMarkSent(selectedContactId)}
                        style={{ flex: 1, background: 'var(--p30-green)' }}
                      >
                        Mark Outreach Message Sent
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* TAB PANEL 3: REFERRAL READINESS EVALUATOR */}
            {activeTab === 'readiness' && (
              <Card>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '20px' }}>Referral Readiness Evaluator</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  
                  {/* Select Contact */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Choose Professional Contact</label>
                    <select
                      value={selectedReadinessContactId}
                      onChange={(e) => setSelectedReadinessContactId(e.target.value)}
                      style={{
                        padding: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    >
                      <option value="" style={{ background: '#1c1c1e' }}>Choose connection</option>
                      {contactsData?.map((c: any) => (
                        <option key={c.id} value={c.id} style={{ background: '#1c1c1e' }}>{c.name} ({c.role} at {c.company})</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Opportunity */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Choose Target Opportunity</label>
                    <select
                      value={targetOpportunityId}
                      onChange={(e) => setTargetOpportunityId(e.target.value)}
                      style={{
                        padding: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    >
                      <option value="" style={{ background: '#1c1c1e' }}>Choose target job</option>
                      {/* Mapping opportunities list */}
                      {opportunitiesData?.map((opp: any) => (
                        <option key={opp.id} value={opp.id} style={{ background: '#1c1c1e' }}>{opp.title} at {opp.companyId}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {readinessData && (
                  <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Readiness Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid var(--brand-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: 'white' }}>Readiness</span>
                      </div>
                      <div>
                        <Badge variant={readinessData.status === 'POSSIBLE REFERRAL REQUEST' ? 'success' : 'warning'}>
                          {readinessData.status}
                        </Badge>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                          {readinessData.recommendation}
                        </p>
                      </div>
                    </div>

                    {/* Dynamic Checklist */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {[
                        { label: 'Tailored Resume Completed', val: readinessData.checklist.resumeReady },
                        { label: 'Portfolio Evidence highlighted', val: readinessData.checklist.portfolioReady },
                        { label: 'Role/Company matches connection', val: readinessData.checklist.roleAlignment },
                        { label: 'Sufficient context built (interactions >= 2)', val: readinessData.checklist.relationshipBuilt }
                      ].map((item, idx) => (
                        <div key={idx} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CheckCircle size={16} style={{ color: item.val ? 'var(--p30-green)' : 'var(--text-muted)' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{item.label}</span>
                        </div>
                      ))}
                    </div>

                  </div>
                )}
              </Card>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: Follow-ups & Priority outreach */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* PRIORITY FOLLOW-UPS PANEL */}
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--brand-primary)' }} />
              Networking Reminders
            </h3>

            {!overviewData?.followUps || overviewData.followUps.length === 0 ? (
              <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle size={24} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <p style={{ fontSize: '12px', fontWeight: 600 }}>No priority follow-ups needed.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {overviewData.followUps.map((fu: any, idx: number) => (
                  <div key={idx} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'white', fontSize: '13px' }}>{fu.name}</span>
                      <Badge variant="warning">{fu.daysElapsed}d elapsed</Badge>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                      {fu.recommendation}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedContactId(fu.contactId);
                          setActiveTab('outreach');
                        }}
                      >
                        Draft Follow-up
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

      </div>

      {/* ── ADD CONTACT MODAL/DRAWER ── */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <Card style={{ width: '100%', maxWidth: '550px', background: '#1c1c1e', border: '1px solid var(--border-glass)', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '20px' }}>Add Connection</h3>
            
            <form onSubmit={handleAddContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Professional Role</label>
                  <input
                    type="text"
                    required
                    value={newContact.role}
                    onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                    style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Company</label>
                  <input
                    type="text"
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>University / Alumni</label>
                  <input
                    type="text"
                    value={newContact.education}
                    onChange={(e) => setNewContact({ ...newContact, education: e.target.value })}
                    style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={newContact.publicProfileUrl}
                  onChange={(e) => setNewContact({ ...newContact, publicProfileUrl: e.target.value })}
                  style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Private Notes (discuss area, reminders)</label>
                <textarea
                  rows={3}
                  value={newContact.privateNotes}
                  onChange={(e) => setNewContact({ ...newContact, privateNotes: e.target.value })}
                  style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: 'white', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" style={{ background: 'var(--brand-primary)' }}>Save Contact</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
