import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { adminClient } from '../api/admin-client';
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Brain,
  History,
  Target,
  ArrowRight,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  confidence?: string;
  evidence?: string[];
  keyInsights?: string[];
  suggestedFollowUps?: string[];
  proposal?: any;
  createdAt: string;
}

export default function CareerCopilot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [homeSummary, setHomeSummary] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchHomeSummary();
  }, []);

  const fetchHomeSummary = async () => {
    try {
      const res = await adminClient.get('/copilot/home');
      setHomeSummary(res.data);
    } catch {
      // Fallback
      setHomeSummary({
        greeting: 'Welcome to your AI Career Copilot.',
        currentRole: 'AI & Software Engineer',
        topPriority: {
          title: 'Deploy verified project evidence to portfolio',
          estimatedMinutes: 45,
          urgency: 'HIGH',
        },
        activeOpportunitiesCount: 14,
        openSkillGapsCount: 2,
        suggestedPrompts: [
          'What should I focus on today?',
          'What is my biggest weakness?',
          'Find internships matching my profile',
          'What happens if I focus on MLOps?',
        ],
      });
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await adminClient.post('/copilot/messages', {
        message: textToSend,
        conversationId,
      });

      if (!conversationId && res.data.conversationId) {
        setConversationId(res.data.conversationId);
      }

      const asstMsg: ChatMessage = {
        id: res.data.messageId || `a-${Date.now()}`,
        role: 'assistant',
        content: res.data.response.summary,
        intent: res.data.intent,
        confidence: res.data.response.confidence,
        evidence: res.data.response.evidence,
        keyInsights: res.data.response.keyInsights,
        suggestedFollowUps: res.data.response.suggestedFollowUps,
        proposal: res.data.proposal,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, asstMsg]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I could not process this request right now. Please check your connectivity.',
        confidence: 'LIMITED',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProposal = async (proposalId: string, idx: number) => {
    try {
      await adminClient.post(`/copilot/proposals/${proposalId}/confirm`, {});
      setMessages((prev) =>
        prev.map((m, i) =>
          i === idx && m.proposal ? { ...m, proposal: { ...m.proposal, status: 'CONFIRMED' } } : m,
        ),
      );
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-[#E7EAF0]">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#EAF3FF] rounded-lg">
            <Bot className="w-6 h-6 text-[#246BFE]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#111111]">Personal AI Career Copilot</h1>
            <p className="text-sm text-[#6B7280]">
              Unified conversational intelligence connected to your complete career ecosystem.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">Phase 48 Active</Badge>
          <Badge variant="neutral">Deterministic Fallback Ready</Badge>
        </div>
      </div>

      {/* Split Pane: Main Chat & Right Context Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Conversation Thread */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="flex flex-col h-[650px] p-0 overflow-hidden border border-[#E7EAF0]">
            {/* Messages Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#F8FAFC]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center p-8">
                  <div className="p-4 bg-[#EAF3FF] rounded-full mb-3">
                    <Sparkles className="w-8 h-8 text-[#246BFE]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#111111]">How can I assist your career today?</h3>
                  <p className="text-sm text-[#6B7280] max-w-md mt-1 mb-6">
                    Ask questions about daily priorities, weekly sprints, skill weaknesses, opportunity matches, or run what-if career simulations.
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                    {homeSummary?.suggestedPrompts?.slice(0, 4).map((prompt: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left p-3 text-xs font-medium text-[#246BFE] bg-white rounded-lg border border-[#E7EAF0] hover:bg-[#EAF3FF] transition"
                      >
                        "{prompt}"
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'user' ? (
                      <div className="max-w-[75%] bg-[#246BFE] text-white p-4 rounded-2xl rounded-tr-sm shadow-sm">
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ) : (
                      <div className="max-w-[85%] bg-white border border-[#E7EAF0] p-5 rounded-2xl rounded-tl-sm shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-[#246BFE] tracking-wide uppercase">
                            AI Copilot Response
                          </span>
                          {msg.confidence && (
                            <Badge
                              variant={
                                msg.confidence === 'HIGH'
                                  ? 'success'
                                  : msg.confidence === 'MEDIUM'
                                    ? 'warning'
                                    : 'neutral'
                              }
                            >
                              {msg.confidence} Confidence
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm font-medium text-[#111111] leading-relaxed">
                          {msg.content}
                        </p>

                        {msg.keyInsights && msg.keyInsights.length > 0 && (
                          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E7EAF0] text-xs space-y-1">
                            <span className="font-bold text-[#4B5563] uppercase">Key Insights:</span>
                            {msg.keyInsights.map((ins, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-[#374151]">
                                <span className="text-[#246BFE]">•</span>
                                <span>{ins}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {msg.evidence && msg.evidence.length > 0 && (
                          <div className="text-xs text-[#6B7280] space-y-0.5">
                            <span className="font-semibold text-[#4B5563]">Grounded Evidence:</span>
                            {msg.evidence.map((ev, idx) => (
                              <div key={idx}>✓ {ev}</div>
                            ))}
                          </div>
                        )}

                        {/* Proposal Card */}
                        {msg.proposal && (
                          <div
                            className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                              msg.proposal.status === 'CONFIRMED'
                                ? 'bg-[#E9FBEA] border-[#79F28A]'
                                : 'bg-[#F3F7FF] border-[#246BFE]'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#1456D9]">
                                {msg.proposal.status === 'CONFIRMED'
                                  ? 'ACTION APPLIED TO PLAN'
                                  : 'PROPOSED ACTION'}
                              </span>
                            </div>
                            <p className="font-bold text-[#111111]">{msg.proposal.title}</p>
                            <p className="text-[#4B5563]">{msg.proposal.description}</p>
                            {msg.proposal.status !== 'CONFIRMED' && (
                              <Button
                                size="sm"
                                onClick={() => handleConfirmProposal(msg.proposal.id, i)}
                                className="mt-2 w-full"
                              >
                                Add to Execution Plan
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Suggested Followups */}
                        {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-1.5">
                            {msg.suggestedFollowUps.map((chip, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendMessage(chip)}
                                className="text-[11px] font-medium text-[#246BFE] bg-[#EAF3FF] hover:bg-[#D8E8FE] px-2.5 py-1 rounded-full transition"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <div className="p-4 bg-white border-t border-[#E7EAF0] flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                placeholder="Ask anything about your career plan, skills, opportunities, or simulations..."
                className="flex-1 border border-[#E7EAF0] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#246BFE]"
              />
              <Button
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || loading}
              >
                {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Copilot Intelligence Dashboard */}
        <div className="space-y-4">
          <Card className="p-5 border border-[#E7EAF0] space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#246BFE]" />
              <h2 className="font-bold text-[#111111]">Career Intelligence State</h2>
            </div>

            <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E7EAF0] space-y-1">
              <span className="text-xs text-[#6B7280]">Target Career Role</span>
              <p className="font-bold text-[#111111]">{homeSummary?.currentRole || 'Software Engineer'}</p>
            </div>

            {homeSummary?.topPriority && (
              <div className="bg-[#F3F7FF] p-3 rounded-lg border border-[#246BFE] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#246BFE] uppercase">Top Priority Today</span>
                  <Badge variant="error">{homeSummary.topPriority.urgency}</Badge>
                </div>
                <p className="text-sm font-bold text-[#111111]">{homeSummary.topPriority.title}</p>
                <span className="text-xs text-[#6B7280]">
                  Estimated: {homeSummary.topPriority.estimatedMinutes} mins
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E7EAF0]">
                <p className="text-xl font-bold text-[#111111]">
                  {homeSummary?.activeOpportunitiesCount || 0}
                </p>
                <span className="text-xs text-[#6B7280]">Active Matches</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E7EAF0]">
                <p className="text-xl font-bold text-[#111111]">
                  {homeSummary?.openSkillGapsCount || 0}
                </p>
                <span className="text-xs text-[#6B7280]">Open Gaps</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 border border-[#E7EAF0] space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#246BFE]" />
              <h3 className="font-bold text-[#111111]">Quick Copilot Actions</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Plan My Day', q: 'What should I focus on today?' },
                { label: 'Plan My Week', q: 'What should I do this week?' },
                { label: 'Check Biggest Weakness', q: 'What is my biggest weakness?' },
                { label: 'Simulate MLOps Focus', q: 'What happens if I focus on MLOps?' },
                { label: 'Show Career Progress', q: 'Show my career progress' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(action.q)}
                  className="w-full flex justify-between items-center p-2.5 text-xs font-semibold text-[#111111] bg-[#F8FAFC] hover:bg-[#EAF3FF] rounded-lg border border-[#E7EAF0] transition"
                >
                  <span>{action.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#246BFE]" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
