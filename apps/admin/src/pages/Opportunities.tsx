import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Compass, Briefcase, MapPin, DollarSign, Calendar, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { adminClient } from '../api/admin-client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormControl } from '../components/ui/Form';

export default function Opportunities() {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('best_match');
  const [minMatchScore, setMinMatchScore] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch opportunities from backend
  const { data: opportunitiesResponse, isLoading } = useQuery({
    queryKey: ['admin-opportunities', q, sort, minMatchScore],
    queryFn: async () => {
      const res = await adminClient.get('/opportunities', {
        params: { q, sort, minMatchScore },
      });
      return res.data;
    },
  });

  const opportunities = opportunitiesResponse?.data ?? [];

  // Automatically select the first item on load
  useEffect(() => {
    if (opportunities.length > 0 && !selectedId) {
      setSelectedId(opportunities[0].id);
    }
  }, [opportunities, selectedId]);

  const selectedOpp = opportunities.find((o: any) => o.id === selectedId);

  // Handle Learn Skill
  const handleLearnSkill = (skill: string) => {
    alert(`⚡ AI Copilot: We've generated a personalized learning path for "${skill}". You can access it on your Learning Roadmaps page!`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'var(--status-success)';
    if (score >= 75) return 'var(--brand-primary)';
    if (score >= 60) return 'var(--status-warning)';
    return 'var(--text-muted)';
  };

  return (
    <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Top filter bar */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
        <div style={{ flex: 1 }}>
          <FormControl
            type="text"
            placeholder="Search internships, companies, skills (supports natural language queries)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div style={{ width: '200px' }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ width: '100%', height: '40px', padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <option value="best_match">🎯 Best Match</option>
            <option value="relevance">🔥 Relevance</option>
            <option value="newest">⏱ Newest</option>
            <option value="deadline_soon">📅 Deadline Soon</option>
            <option value="highest_stipend">💰 Highest Stipend</option>
            <option value="company">🏢 Company Name</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Min Score: {minMatchScore}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={minMatchScore}
            onChange={(e) => setMinMatchScore(Number(e.target.value))}
            style={{ width: '120px', accentColor: 'var(--brand-primary)' }}
          />
        </div>
      </div>

      {/* Main split viewport */}
      <div style={{ display: 'flex', flex: 1, gap: '20px', overflow: 'hidden' }}>
        {/* Left pane: Feed list */}
        <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-secondary)' }}>Loading feed...</div>
          ) : opportunities.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-secondary)' }}>No matching internships found</div>
          ) : (
            opportunities.map((opp: any) => {
              const score = opp.matchScore?.overallScore ?? 0;
              const isSelected = opp.id === selectedId;
              return (
                <div
                  key={opp.id}
                  onClick={() => setSelectedId(opp.id)}
                  style={{
                    padding: '16px',
                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-glass)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 700 }}>{opp.title}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, marginTop: '2px' }}>{opp.company?.name}</p>
                    </div>
                    {opp.matchScore && (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        backgroundColor: `${getScoreColor(score)}15`,
                        border: `1px solid ${getScoreColor(score)}44`,
                        color: getScoreColor(score),
                        fontSize: '11px',
                        fontWeight: 800
                      }}>
                        {score}%
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    <span>📍 {opp.location || 'Remote'}</span>
                    <span>💻 {opp.workMode}</span>
                    {opp.stipend && <span>💰 ₹{(opp.stipend / 1000).toFixed(0)}K</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right pane: Details */}
        <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedOpp ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Header Hero */}
              <div style={{ padding: '24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {selectedOpp.company?.industry ?? 'Technology'}
                  </span>
                  <h2 style={{ color: 'white', fontWeight: 800, fontSize: '22px', margin: '4px 0' }}>{selectedOpp.title}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px' }}>{selectedOpp.company?.name}</p>
                </div>
                {selectedOpp.matchScore && (
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    border: `4px solid ${getScoreColor(selectedOpp.matchScore.overallScore)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--bg-tertiary)'
                  }}>
                    <span style={{ color: getScoreColor(selectedOpp.matchScore.overallScore), fontWeight: 900, fontSize: '16px' }}>
                      {selectedOpp.matchScore.overallScore}%
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Match</span>
                  </div>
                )}
              </div>

              {/* Scrollable details */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Meta details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Location</p>
                    <p style={{ color: 'white', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>📍 {selectedOpp.location || 'Remote'}</p>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Work Mode</p>
                    <p style={{ color: 'white', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>🌐 {selectedOpp.workMode}</p>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Stipend</p>
                    <p style={{ color: 'var(--status-success)', fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>₹{selectedOpp.stipend ? `${(selectedOpp.stipend / 1000).toFixed(0)}K/mo` : 'Unspecified'}</p>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Duration</p>
                    <p style={{ color: 'white', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>⏱ {selectedOpp.duration || 'N/A'}</p>
                  </div>
                </div>

                {/* Match Gaps (Missing Skills) */}
                {selectedOpp.missingSkills && selectedOpp.missingSkills.length > 0 && (
                  <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '16px' }}>
                    <h4 style={{ color: 'var(--status-warning)', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <AlertTriangle size={18} /> Match Gaps Identified
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.6, marginBottom: '12px' }}>
                      To qualify for this role, you should acquire the following missing required skills:
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      {selectedOpp.missingSkills.map((skill: string) => (
                        <button
                          key={skill}
                          onClick={() => handleLearnSkill(skill)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--status-warning)',
                            borderRadius: '16px',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '11px',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          ⚡ Learn {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Match breakdown & Why this match */}
                {selectedOpp.matchScore && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Score breakdown progress bars */}
                    <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                      <h4 style={{ color: 'white', fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>🎯 Match Metrics Breakdown</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { label: 'Skills', val: selectedOpp.matchScore.skillScore },
                          { label: 'Location', val: selectedOpp.matchScore.locationScore },
                          { label: 'Role Fit', val: selectedOpp.matchScore.educationScore },
                          { label: 'CGPA', val: selectedOpp.matchScore.cgpaScore },
                          { label: 'Stipend Match', val: selectedOpp.matchScore.stipendScore },
                          { label: 'Career Alignment', val: selectedOpp.matchScore.careerGoalScore ?? 0 },
                          { label: 'Freshness', val: selectedOpp.matchScore.freshnessScore ?? 0 },
                          { label: 'Activity-based Relevance', val: selectedOpp.matchScore.behavioralScore ?? 0 },
                        ].map((metric) => (
                          <div key={metric.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              <span>{metric.label}</span>
                              <span style={{ color: getScoreColor(metric.val), fontWeight: 700 }}>{metric.val}%</span>
                            </div>
                            <div style={{ height: '4px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${metric.val}%`, height: '100%', backgroundColor: getScoreColor(metric.val) }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Reasons */}
                    <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                      <h4 style={{ color: 'white', fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>⭐ AI Recommendation Insights</h4>
                      {selectedOpp.recommendation?.reasons && selectedOpp.recommendation.reasons.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {selectedOpp.recommendation.reasons.map((r: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <CheckCircle size={14} color="var(--status-success)" style={{ marginTop: '2px', flexShrink: 0 }} />
                              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5 }}>{r.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No recommendations insight generated</p>
                      )}
                    </div>
                  </div>
                )}

                {/* About Role / Description */}
                <div>
                  <h4 style={{ color: 'white', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>📋 About the Role</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.6 }}>{selectedOpp.description}</p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button variant="secondary" onClick={() => Linking.openURL(selectedOpp.applicationUrl)}>
                  View Posting
                </Button>
                <Button onClick={() => Linking.openURL(selectedOpp.applicationUrl)}>
                  Apply Externally <ArrowRight size={16} style={{ marginLeft: '6px' }} />
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
              <Compass size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
              <h3 style={{ color: 'white', fontWeight: 700, marginBottom: '8px' }}>Select an Opportunity</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', maxWidth: '300px' }}>
                Select an internship posting from the left feed to view detailed match breakdown, recommendations and missing skills gap.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
