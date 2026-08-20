import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClient } from '../api/admin-client';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Sparkles,
  Award,
  Briefcase,
  Calendar,
  CheckCircle,
  FileText,
  TrendingUp,
  Send,
  AlertTriangle,
  Play,
  Check,
  X,
  Target,
  RefreshCw
} from 'lucide-react';

export default function CareerCommandCenter() {
  const queryClient = useQueryClient();
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Goal Form State
  const [goalType, setGoalType] = useState('APPLICATION');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState(5);
  const [goalDeadline, setGoalDeadline] = useState('');

  // Fetch Command Center State
  const { data: state, isLoading: loadingState } = useQuery({
    queryKey: ['career-command-center'],
    queryFn: async () => {
      const res = await adminClient.get('/career/command-center');
      return res.data;
    },
  });

  // Fetch Goals
  const { data: goals, isLoading: loadingGoals } = useQuery({
    queryKey: ['career-goals'],
    queryFn: async () => {
      const res = await adminClient.get('/career/goals');
      return res.data;
    },
  });

  // Fetch Weekly Review
  const { data: weeklyReview } = useQuery({
    queryKey: ['weekly-review'],
    queryFn: async () => {
      const res = await adminClient.get('/career/reviews/weekly');
      return res.data;
    },
  });

  // Action Mutation
  const completeMutation = useMutation({
    mutationFn: async (actionId: string) => {
      await adminClient.post(`/career/actions/${actionId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-command-center'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (actionId: string) => {
      await adminClient.post(`/career/actions/${actionId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-command-center'] });
    },
  });

  // Goal Mutation
  const createGoalMutation = useMutation({
    mutationFn: async (newGoal: any) => {
      await adminClient.post('/career/goals', newGoal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-goals'] });
      queryClient.invalidateQueries({ queryKey: ['career-command-center'] });
      setGoalTitle('');
      setGoalDeadline('');
    },
  });

  // Goal Update Mutation
  const adjustGoalMutation = useMutation({
    mutationFn: async ({ id, currentValue }: { id: string; currentValue: number }) => {
      await adminClient.patch(`/career/goals/${id}`, { currentValue });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-goals'] });
      queryClient.invalidateQueries({ queryKey: ['career-command-center'] });
    },
  });

  const handleSendChat = async () => {
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage;
    setChatHistory((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage('');
    setIsSending(true);

    try {
      const res = await adminClient.post('/ai/career/command', { message: userMsg });
      setChatHistory((prev) => [...prev, { role: 'assistant', content: res.data.content }]);
    } catch (e) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Chat offline. Please reference your prioritized actions checklist.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    createGoalMutation.mutate({
      type: goalType,
      title: goalTitle,
      targetValue: Number(goalTarget),
      deadline: goalDeadline || null,
    });
  };

  if (loadingState || loadingGoals) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading Career Command Center...</div>;
  }

  // Fallbacks
  const priorityActions = state?.priorityActions || [];
  const careerHealth = state?.careerHealth || { profile: 60, skills: 40, portfolio: 50, applications: 30, interview: 50 };
  const upcomingEvents = state?.upcomingEvents || [];

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
    <div
      className="anim-fade-in"
      style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr 340px',
        gap: '24px',
        width: '100%',
        minHeight: '80vh',
      }}
    >
      {/* LEFT COLUMN: Goals & Review */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Weekly Summary */}
        <Card style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <h3 style={{ color: 'white', fontSize: '15px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color={colors.primary} />
            Weekly Career Review
          </h3>
          <p style={{ color: 'var(--text-primary)', fontSize: '12px', lineHeight: 1.5 }}>
            {weeklyReview?.aiExplanation || 'No weekly details recorded yet.'}
          </p>
        </Card>

        {/* Goals Section */}
        <Card>
          <h3 style={{ color: 'white', fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={16} color={colors.primary} />
            Active Goals
          </h3>

          <form onSubmit={handleAddGoal} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-glass)',
                color: 'white',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              <option value="APPLICATION">Applications Goal</option>
              <option value="LEARNING">Learning Goal</option>
              <option value="INTERVIEW">Interview Goal</option>
              <option value="PROJECT">Project Goal</option>
            </select>

            <input
              type="text"
              placeholder="Goal title..."
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-glass)',
                color: 'white',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              required
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                min="1"
                placeholder="Target"
                value={goalTarget}
                onChange={(e) => setGoalTarget(Number(e.target.value))}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-glass)',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <input
                type="date"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                style={{
                  flex: 2,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-glass)',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                background: colors.primary,
                border: 'none',
                color: 'white',
                padding: '8px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Add Goal
            </button>
          </form>

          {/* Goal List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {goals && goals.length > 0 ? (
              goals.map((g: any) => (
                <div key={g.id} style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'white', fontWeight: 600 }}>{g.title}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{g.currentValue} / {g.targetValue}</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (g.currentValue / g.targetValue) * 100)}%`, background: colors.primary }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {g.deadline ? new Date(g.deadline).toLocaleDateString() : 'No deadline'}
                    </span>
                    {g.currentValue < g.targetValue && (
                      <button
                        onClick={() => adjustGoalMutation.mutate({ id: g.id, currentValue: g.currentValue + 1 })}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: colors.primary,
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Progress
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No goals defined.</span>
            )}
          </div>
        </Card>
      </div>

      {/* CENTER COLUMN: Focus, Actions & Events */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Focus of the day */}
        <Card style={{ background: 'rgba(36, 107, 254, 0.08)', border: '1px solid rgba(36, 107, 254, 0.3)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: colors.primary, textTransform: 'uppercase', tracking: '1px' }}>
            Today's Primary Focus
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', margin: '4px 0 8px 0', fontFamily: 'var(--font-display)' }}>
            {state?.todayFocus}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {state?.greeting}! Based on your current applications, deadlines, and learning tasks, your target path for today is prioritized below.
          </p>
        </Card>

        {/* Priority Actions */}
        <Card>
          <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
            Priority Actions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {priorityActions.length > 0 ? (
              priorityActions.map((action: any) => (
                <div
                  key={action.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge variant={action.priority === 'CRITICAL' ? 'danger' : 'primary'}>
                        {action.priority}
                      </Badge>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Est. Time: {action.estimatedTime}
                      </span>
                    </div>

                    <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 700, marginTop: '8px' }}>
                      {action.title}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                      {action.description}
                    </p>
                    <span style={{ display: 'block', fontSize: '11px', color: colors.primary, marginTop: '6px' }}>
                      Reason: {action.reason}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => completeMutation.mutate(action.id)}
                      style={{
                        background: colors.primary,
                        border: 'none',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Check size={14} />
                      Complete
                    </button>
                    <button
                      onClick={() => dismissMutation.mutate(action.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#EF4444',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <X size={14} />
                      Skip
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <CheckCircle size={32} style={{ marginBottom: '8px', color: colors.primary }} />
                <p style={{ fontSize: '13px' }}>You're all caught up!</p>
              </div>
            )}
          </div>
        </Card>

        {/* Upcoming events & forecast */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Card>
            <h4 style={{ color: 'white', fontWeight: 700, fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={15} color={colors.primary} />
              Upcoming Events
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((evt: any) => (
                  <div key={evt.id} style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'white' }}>{evt.title}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {new Date(evt.time).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No upcoming interviews.</span>
              )}
            </div>
          </Card>

          <Card>
            <h4 style={{ color: 'white', fontWeight: 700, fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={15} color={colors.primary} />
              Hiring Forecast
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {state?.forecast?.forecastText || 'Stable hiring conditions observed.'}
            </span>
            <div style={{ marginTop: '12px' }}>
              <Badge variant="primary">
                Confidence: {state?.forecast?.confidence || 'MODERATE'}
              </Badge>
            </div>
          </Card>
        </div>

      </div>

      {/* RIGHT COLUMN: Career Health & AI Assistant */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Career Health */}
        <Card>
          <h3 style={{ color: 'white', fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>
            Career Health
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(careerHealth).map(([key, val]: [string, any]) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', textTransform: 'capitalize', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>{key} Alignment</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>{val}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-glass)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${val}%`, background: colors.primary }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* AI Assistant */}
        <Card style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '340px' }}>
          <h3 style={{ color: 'white', fontSize: '15px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color={colors.primary} />
            Command Center Assistant
          </h3>

          <div
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '12px',
              overflowY: 'auto',
              maxHeight: '260px',
              marginBottom: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <strong>Advisor:</strong> Hello! Ask me anything about your focus plan or matched opportunities today.
            </div>

            {chatHistory.map((chat, idx) => (
              <div key={idx} style={{ fontSize: '12px', color: 'white' }}>
                <strong>{chat.role === 'user' ? 'You' : 'Advisor'}:</strong> {chat.content}
              </div>
            ))}

            {isSending && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Thinking...</div>}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Ask Advisor..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-glass)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <button
              onClick={handleSendChat}
              style={{
                background: colors.primary,
                border: 'none',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </Card>

      </div>
    </div>
  );
}
