import { useEffect, useState } from 'react';
import { Card, StatCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FormGroup, FormLabel, FormControl } from '../components/ui/Form';

const API_BASE = '/api/v1/admin/learning';

function getHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json',
  };
}

interface Resource {
  id: string;
  title: string;
  provider: string;
  url: string;
  contentType: string;
  difficulty: string;
  status: string;
}

interface Module {
  id: string;
  title: string;
  level: string;
  estimatedDuration: number;
  contentType: string;
  status: string;
}

interface Analytics {
  totalEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  totalGoalsCreated: number;
}

export default function LearningOverview() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states for adding resource
  const [resTitle, setResTitle] = useState('');
  const [resProvider, setResProvider] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resType, setResType] = useState('VIDEO');
  const [resDifficulty, setResDifficulty] = useState('BEGINNER');
  const [resDuration, setResDuration] = useState(30);
  const [showAddRes, setShowAddRes] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resData, modData, anaData] = await Promise.all([
        fetch(`${API_BASE}/resources`, { headers: getHeaders() }).then((r) => r.json()),
        fetch(`${API_BASE}/modules`, { headers: getHeaders() }).then((r) => r.json()),
        fetch(`${API_BASE}/analytics`, { headers: getHeaders() }).then((r) => r.json()),
      ]);

      setResources(resData);
      setModules(modData);
      setAnalytics(anaData);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim() || !resUrl.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/resources`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: resTitle,
          provider: resProvider,
          url: resUrl,
          contentType: resType,
          difficulty: resDifficulty,
          estimatedDuration: Number(resDuration),
        }),
      });

      if (!res.ok) throw new Error('Failed to create resource reference');

      setResTitle('');
      setResProvider('');
      setResUrl('');
      setShowAddRes(false);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="anim-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 
            style={{ 
              fontSize: '28px', 
              fontWeight: 800, 
              fontFamily: 'var(--font-display)', 
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em' 
            }}
          >
            Learning Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
            Configure template learning modules, catalog resources, and monitor student completions.
          </p>
        </div>
        <Button onClick={() => setShowAddRes(true)}>Add Reference Resource</Button>
      </div>

      {!loading && analytics && (
        <div className="grid-cols-4">
          <StatCard 
            title="Total Enrollments" 
            value={analytics.totalEnrollments} 
            icon={<BookIcon />} 
          />
          <StatCard 
            title="Completed Modules" 
            value={analytics.completedEnrollments} 
            icon={<BookIcon />} 
          />
          <StatCard 
            title="Completion Rate" 
            value={`${analytics.completionRate.toFixed(1)}%`} 
            icon={<BookIcon />} 
            trend={analytics.completionRate >= 50.0 ? 'High' : 'Stable'}
            trendType={analytics.completionRate >= 50.0 ? 'success' : 'neutral'}
          />
          <StatCard 
            title="Active Roadmaps" 
            value={analytics.totalGoalsCreated} 
            icon={<BookIcon />} 
          />
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Loading learning catalogs...</p>
      ) : (
        <div className="grid-cols-2">
          <Card>
            <h3 
              style={{ 
                marginBottom: '20px', 
                fontSize: '16px', 
                fontWeight: 700, 
                color: 'white',
                fontFamily: 'var(--font-display)',
                borderBottom: '1px solid var(--border-glass)',
                paddingBottom: '12px'
              }}
            >
              Template Learning Modules
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {modules.map((m) => (
                <div 
                  key={m.id} 
                  style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: '12px', 
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{m.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Estimated: {m.estimatedDuration} mins | Format: {m.contentType}
                    </div>
                  </div>
                  <Badge variant="success">{m.level}</Badge>
                </div>
              ))}
              {modules.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                  No template modules configured.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h3 
              style={{ 
                marginBottom: '20px', 
                fontSize: '16px', 
                fontWeight: 700, 
                color: 'white',
                fontFamily: 'var(--font-display)',
                borderBottom: '1px solid var(--border-glass)',
                paddingBottom: '12px'
              }}
            >
              External Reference Resources
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {resources.map((r) => (
                <div 
                  key={r.id} 
                  style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: '12px', 
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>
                      <a href={r.url} target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
                        {r.title} ↗
                      </a>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Provider: {r.provider} | Level: {r.difficulty}
                    </div>
                  </div>
                  <Badge variant="primary">{r.contentType}</Badge>
                </div>
              ))}
              {resources.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                  No reference resources linked yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <Modal isOpen={showAddRes} onClose={() => setShowAddRes(false)} title="Add Reference Resource">
        <form onSubmit={handleAddResource}>
          <FormGroup>
            <FormLabel>Resource Title</FormLabel>
            <FormControl
              type="text"
              required
              value={resTitle}
              onChange={(e) => setResTitle(e.target.value)}
              placeholder="e.g. Intro to Docker Containers"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Provider Name</FormLabel>
            <FormControl
              type="text"
              required
              value={resProvider}
              onChange={(e) => setResProvider(e.target.value)}
              placeholder="e.g. YouTube, Coursera"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Resource URL</FormLabel>
            <FormControl
              type="url"
              required
              value={resUrl}
              onChange={(e) => setResUrl(e.target.value)}
              placeholder="e.g. https://youtube.com/..."
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Content Type</FormLabel>
            <FormControl
              as="select"
              value={resType}
              onChange={(e) => setResType(e.target.value)}
            >
              <option value="VIDEO">Video</option>
              <option value="COURSE">Course</option>
              <option value="DOCUMENTATION">Documentation</option>
              <option value="TUTORIAL">Tutorial</option>
              <option value="QUIZ">Quiz</option>
            </FormControl>
          </FormGroup>

          <FormGroup>
            <FormLabel>Difficulty</FormLabel>
            <FormControl
              as="select"
              value={resDifficulty}
              onChange={(e) => setResDifficulty(e.target.value)}
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </FormControl>
          </FormGroup>

          <FormGroup>
            <FormLabel>Estimated Duration (mins)</FormLabel>
            <FormControl
              type="number"
              required
              value={resDuration}
              onChange={(e) => setResDuration(Number(e.target.value))}
            />
          </FormGroup>

          <Button type="submit" style={{ width: '100%', marginTop: '10px' }}>Create Reference</Button>
          <Button type="button" variant="secondary" style={{ width: '100%', marginTop: '8px' }} onClick={() => setShowAddRes(false)}>
            Cancel
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function BookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  );
}
