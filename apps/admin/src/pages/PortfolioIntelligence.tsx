import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// Setup api client helper matching admin configs
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface HealthMetric {
  overallScore: number;
  coverageScore: number;
  depthScore: number;
  docScore: number;
  recencyScore: number;
}

interface AlignmentMetric {
  targetRole: string;
  alignmentScore: number;
  requiredSkills: string[];
  strong: string[];
  growing: string[];
  missing: string[];
}

interface BrandInsights {
  brandIdentity: string;
  brandConsistency: {
    isConsistent: boolean;
    gaps: string[];
    suggestions: string[];
  };
}

interface EvidenceNode {
  skillName: string;
  category: string;
  confidence: number;
  strength: string;
  evidenceCount: number;
}

export default function PortfolioIntelligence() {
  const [intel, setIntel] = useState<{ health: HealthMetric; alignment: AlignmentMetric; brand: BrandInsights } | null>(null);
  const [evidenceMap, setEvidenceMap] = useState<{ nodes: EvidenceNode[] } | null>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'GRAPH' | 'RECOMMENDATIONS'>('GRAPH');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [intelRes, mapRes, portRes] = await Promise.all([
        api.get('/v1/portfolio/intelligence'),
        api.get('/v1/portfolio/evidence-map'),
        api.get('/v1/portfolio'),
      ]);
      setIntel(intelRes.data);
      setEvidenceMap(mapRes.data);
      setPortfolio(portRes.data);
    } catch (err) {
      console.error('Failed to load portfolio intelligence details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerProjectAnalysis = async (projectId: string) => {
    setAnalyzingId(projectId);
    try {
      await api.post(`/v1/portfolio/projects/${projectId}/analyze`);
      alert('AI analysis complete. Evidence map and alignment updated successfully.');
      await fetchData();
    } catch (err) {
      alert('Failed to analyze project.');
    } finally {
      setAnalyzingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
        <div style={{ height: '40px', width: '300px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ height: '200px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} className="skeleton" />
          <div style={{ height: '200px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} className="skeleton" />
        </div>
      </div>
    );
  }

  const health = intel?.health || { overallScore: 0, coverageScore: 0, depthScore: 0, docScore: 0, recencyScore: 0 };
  const alignment = intel?.alignment || { targetRole: 'Software Engineer', alignmentScore: 0, strong: [], growing: [], missing: [] };
  const brand = intel?.brand || { brandIdentity: '', brandConsistency: { isConsistent: true, gaps: [], suggestions: [] } };
  const projects = portfolio?.contentJson?.projects || [];

  return (
    <div style={{ padding: '24px', color: 'white', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Portfolio Evidence & Branding Engine
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Analyze candidate credentials, project complexities, and target-role consistency alignment.
        </p>
      </div>

      {/* TOP ROW: Health Assessment & Target Role Alignment */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--brand-primary)' }}>Portfolio Health Dashboard</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '8px solid rgba(36,107,254,0.15)', borderTopColor: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '24px', fontWeight: 800 }}>{health.overallScore}%</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Skill Coverage</span>
                  <span>{health.coverageScore}%</span>
                </div>
                <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                  <div style={{ width: `${health.coverageScore}%`, height: '100%', backgroundColor: '#246BFE', borderRadius: '2px' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Technical Complexity</span>
                  <span>{health.depthScore}%</span>
                </div>
                <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                  <div style={{ width: `${health.depthScore}%`, height: '100%', backgroundColor: '#79F28A', borderRadius: '2px' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Documentation coverage</span>
                  <span>{health.docScore}%</span>
                </div>
                <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                  <div style={{ width: `${health.docScore}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: '2px' }} />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '16px' }}>
            Role Alignment: {alignment.targetRole}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Strong Evidence</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {alignment.strong.map(s => (
                  <span key={s} style={{ backgroundColor: 'rgba(121,242,138,0.15)', color: '#79F28A', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{s}</span>
                ))}
                {alignment.strong.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Growing Gaps</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {alignment.growing.map(s => (
                  <span key={s} style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{s}</span>
                ))}
                {alignment.growing.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Missing Evidence</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {alignment.missing.map(s => (
                  <span key={s} style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{s}</span>
                ))}
                {alignment.missing.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* MAIN CONTAINER: Split layouts */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 300px', gap: '20px', alignItems: 'start' }}>
        {/* LEFT PANEL: Projects & declared skills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Projects List</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projects.map((p: any) => (
                <div key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</span>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', lineBreak: 'anywhere' }}>Stack: {p.technologies?.slice(0, 3).join(', ')}</p>
                  <Button
                    style={{ marginTop: '6px', fontSize: '10px', padding: '2px 8px' }}
                    onClick={() => triggerProjectAnalysis(p.id)}
                    disabled={analyzingId === p.id}
                  >
                    {analyzingId === p.id ? 'Analyzing...' : 'AI Analyze'}
                  </Button>
                </div>
              ))}
              {projects.length === 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No projects in portfolio.</span>
              )}
            </div>
          </Card>
        </div>

        {/* MIDDLE PANEL: Evidence Map Graph View */}
        <div>
          <Card style={{ padding: '24px', minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Professional Evidence Map Graph</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant={activeTab === 'GRAPH' ? 'primary' : 'secondary'} onClick={() => setActiveTab('GRAPH')}>Graph Map</Button>
                <Button variant={activeTab === 'RECOMMENDATIONS' ? 'primary' : 'secondary'} onClick={() => setActiveTab('RECOMMENDATIONS')}>Improvements</Button>
              </div>
            </div>

            {activeTab === 'GRAPH' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {evidenceMap?.nodes.map((node) => (
                  <div key={node.skillName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{node.skillName}</span>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Category: {node.category} • {node.evidenceCount} verified entries
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, backgroundColor: 'rgba(36,107,254,0.15)', color: '#246BFE' }}>
                        {node.strength}
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Confidence: {Math.round(node.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
                {(!evidenceMap || evidenceMap.nodes.length === 0) && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>No skill evidence graph nodes populated.</div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ borderLeft: '3px solid var(--status-error)', paddingLeft: '12px', marginTop: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444' }}>HIGH PRIORITY</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Incorporate automated unit testing configuration into your primary repository portfolio projects.</p>
                </div>
                <div style={{ borderLeft: '3px solid var(--status-warning)', paddingLeft: '12px', marginTop: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B' }}>MEDIUM PRIORITY</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Add deployment container configuration metadata to Python/ML projects to demonstrate DevOps capabilities.</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT PANEL: Branding Insights & Improvements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>📢 Brand Insights</h4>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '18px', display: 'block' }}>{brand.brandIdentity}</span>

            {!brand.brandConsistency.isConsistent && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '6px', padding: '10px', marginTop: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>BRAND GAP INDICATORS:</span>
                {brand.brandConsistency.gaps.map((g, i) => (
                  <p key={i} style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>• {g}</p>
                ))}
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>SUGGESTED ALIGNMENTS:</span>
              {brand.brandConsistency.suggestions.map((s, i) => (
                <p key={i} style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>• {s}</p>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
