import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminClient } from '../api/admin-client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Brain, Award, ShieldAlert, ArrowRight, UserCheck, MessageSquare, Compass, Send, Check } from 'lucide-react';

export default function CareerStrategyCenter() {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Strategy data
  const { data: strategy, isLoading, refetch } = useQuery({
    queryKey: ['career-strategy'],
    queryFn: async () => {
      const res = await adminClient.get('/career/strategy');
      return res.data;
    },
  });

  // Fetch adjacent roles
  const { data: adjacentRoles } = useQuery({
    queryKey: ['adjacent-roles'],
    queryFn: async () => {
      const res = await adminClient.get('/career/adjacent-roles');
      return res.data;
    },
  });

  // Mutation for sending AI Advisor chat
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await adminClient.post('/ai/career/advisor', {
        message,
        conversationId: conversationId || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: data.message.content }
      ]);
    },
    onError: () => {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: 'Career advisor services are temporarily offline. Fallback template strategy is active.' }
      ]);
    }
  });

  const handleSendChat = (text: string) => {
    if (!text.trim()) return;
    setChatHistory((prev) => [...prev, { role: 'user', content: text }]);
    setChatMessage('');
    chatMutation.mutate(text);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatMutation.isPending]);

  if (isLoading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading Career Command Center...</div>;
  }

  const score = strategy?.overallScore ?? 0;
  const breakdown = strategy?.scoreBreakdown ?? {};

  // Custom inline style mapping for tokens
  const colors = {
    primary: '#246BFE',
    deep: '#1456D9',
    sky: '#EAF3FF',
    soft: '#F3F7FF',
    green: '#79F28A',
    softGreen: '#E9FBEA',
    aiCream: '#FFF4D8',
    text: '#111111',
    border: '#E7EAF0',
  };

  return (
    <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white', fontFamily: 'var(--font-display)' }}>
            Career Strategy Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Personalized alignment tracking, skill prioritization matrices, and live opportunity advice.
          </p>
        </div>
        <Badge variant={score >= 70 ? 'success' : 'primary'}>
          Strategy Score: {score}/100
        </Badge>
      </div>

      {/* Main Multi-Column Viewport */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Metrics & Matrices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Alignment Score Breakdown */}
          <Card>
            <h3 style={{ color: 'white', fontWeight: 700, marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color={colors.primary} />
              Strategic Alignment Score Breakdown
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Goal Setting ({breakdown.targetRoleAlignment}/20)</span>
                  <span>{Math.round((breakdown.targetRoleAlignment/20)*100)}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-glass)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(breakdown.targetRoleAlignment/20)*100}%`, background: colors.primary }} />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Skill Coverage ({breakdown.skillCoverage}/30)</span>
                  <span>{Math.round((breakdown.skillCoverage/30)*100)}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-glass)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(breakdown.skillCoverage/30)*100}%`, background: colors.primary }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Market Availability ({breakdown.opportunityAvailability}/15)</span>
                  <span>{Math.round((breakdown.opportunityAvailability/15)*100)}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-glass)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(breakdown.opportunityAvailability/15)*100}%`, background: colors.primary }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Applications Activity ({breakdown.applicationReadiness}/15)</span>
                  <span>{Math.round((breakdown.applicationReadiness/15)*100)}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-glass)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(breakdown.applicationReadiness/15)*100}%`, background: colors.primary }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Interview Performance ({breakdown.interviewReadiness}/15)</span>
                  <span>{Math.round((breakdown.interviewReadiness/15)*100)}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-glass)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(breakdown.interviewReadiness/15)*100}%`, background: colors.primary }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Portfolio Strength ({breakdown.portfolioReadiness}/5)</span>
                  <span>{Math.round((breakdown.portfolioReadiness/5)*100)}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-glass)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(breakdown.portfolioReadiness/5)*100}%`, background: colors.primary }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Skill Priority Matrix */}
          <Card>
            <h3 style={{ color: 'white', fontWeight: 700, marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color={colors.primary} />
              Skill Priority Matrix (Live Market Demand)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              
              {/* Highest Priority: High Demand + User Gap */}
              <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px' }}>
                <h4 style={{ color: '#EF4444', fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={14} /> HIGH DEMAND + GAP (Highest Priority)
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {strategy?.priorityMatrix?.highestPriority?.length > 0 ? (
                    strategy.priorityMatrix.highestPriority.map((s: string) => (
                      <span key={s} style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {s}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No gaps in high demand. Great job!</span>
                  )}
                </div>
              </div>

              {/* Maintain: High Demand + User Strong */}
              <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
                <h4 style={{ color: '#10B981', fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={14} /> HIGH DEMAND + STRONG (Maintain)
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {strategy?.priorityMatrix?.maintain?.length > 0 ? (
                    strategy.priorityMatrix.maintain.map((s: string) => (
                      <span key={s} style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {s}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No skills currently in very high demand.</span>
                  )}
                </div>
              </div>

              {/* Lower Priority: Low Demand + User Gap */}
              <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                  LOW DEMAND + GAP (Lower Priority)
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {strategy?.priorityMatrix?.lowerPriority?.length > 0 ? (
                    strategy.priorityMatrix.lowerPriority.map((s: string) => (
                      <span key={s} style={{ fontSize: '11px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px' }}>
                        {s}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Clear catalog.</span>
                  )}
                </div>
              </div>

              {/* Optional: Low Demand + User Strong */}
              <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                  LOW DEMAND + STRONG (Optional)
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {strategy?.priorityMatrix?.optional?.length > 0 ? (
                    strategy.priorityMatrix.optional.map((s: string) => (
                      <span key={s} style={{ fontSize: '11px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px' }}>
                        {s}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No optional items currently.</span>
                  )}
                </div>
              </div>

            </div>
          </Card>

          {/* Adjacent Careers Discovery */}
          <Card>
            <h3 style={{ color: 'white', fontWeight: 700, marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain size={18} color={colors.primary} />
              Adjacent Career Opportunities & Overlaps
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {adjacentRoles && adjacentRoles.length > 0 ? (
                adjacentRoles.map((role: any) => (
                  <div key={role.role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <div>
                      <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>{role.role}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                        Missing skills: {role.gapsList?.join(', ') || 'None'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Badge variant="primary">{role.overlapPercentage}% overlap</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No adjacent roles computed. Add target preferences to start.</div>
              )}
            </div>
          </Card>

        </div>

        {/* Right Column: AI Career Advisor */}
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 190px)' }}>
          <Card style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 0, overflow: 'hidden' }}>
            
            {/* Advisor Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(99, 102, 241, 0.05)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={20} color="white" />
              </div>
              <div>
                <h4 style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>AI Career Strategy Advisor</h4>
                <p style={{ color: colors.primary, fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ● Active Grounded Assistant
                </p>
              </div>
            </div>

            {/* Chat Scroll Panel */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Default Welcome Message */}
              <div style={{ display: 'flex', gap: '12px', maxWidth: '85%' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                  🤖
                </div>
                <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', lineHeight: 1.5 }}>
                  <p style={{ fontWeight: 600, marginBottom: '4px' }}>Hello!</p>
                  I am your grounded career strategist. I have analyzed your target role, skill matrix, and applications. Where would you like to focus next? Try asking:
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button onClick={() => handleSendChat("Which skills should I learn next?")} style={{ textAlign: 'left', background: 'rgba(255, 255, 255, 0.05)', color: colors.primary, border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      👉 "Which skills should I learn next?"
                    </button>
                    <button onClick={() => handleSendChat("Am I ready for internships?")} style={{ textAlign: 'left', background: 'rgba(255, 255, 255, 0.05)', color: colors.primary, border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      👉 "Am I ready for internships?"
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat History */}
              {chatHistory.map((chat, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  {chat.role !== 'user' && (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      🤖
                    </div>
                  )}
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: chat.role === 'user' ? colors.primary : 'var(--bg-secondary)',
                    color: 'white',
                    fontSize: '13px',
                    lineHeight: 1.5
                  }}>
                    {chat.content}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {chatMutation.isPending && (
                <div style={{ display: 'flex', gap: '12px', maxWidth: '85%' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    🤖
                  </div>
                  <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Thinking and fetching live parameters...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Action Panel */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--border-glass)', background: 'var(--bg-input)' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Ask advisor (e.g. Find target skills, explain readiness, prepare)..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat(chatMessage)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <Button onClick={() => handleSendChat(chatMessage)} icon={<Send size={16} />}>
                  Send
                </Button>
              </div>
            </div>

          </Card>
        </div>

      </div>

    </div>
  );
}
