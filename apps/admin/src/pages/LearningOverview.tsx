import React, { useEffect, useState } from 'react';

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
  const [error, setError] = useState<string | null>(null);

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
      setError(e.message);
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
    <div className="learning-overview-page">
      <style>{`
        .learning-overview-page { padding: 32px; max-width: 1400px; margin: 0 auto; }
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .page-title { font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
        
        .btn-add { padding: 10px 20px; background: linear-gradient(135deg, #10b981, #3b82f6); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
        .btn-add:hover { opacity: 0.9; }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 32px; }
        .stat-card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; text-align: center; }
        .stat-num { font-size: 32px; font-weight: 800; color: white; margin-top: 8px; }
        .stat-label { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }

        .sections-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .section-card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; }
        .section-title { font-size: 18px; font-weight: 600; color: white; margin-bottom: 20px; }

        .list-items { display: flex; flex-direction: column; gap: 12px; }
        .list-item { background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
        .item-info { display: flex; flex-direction: column; gap: 4px; }
        .item-name { font-size: 15px; font-weight: 600; color: white; }
        .item-meta { font-size: 12px; color: var(--text-muted); }
        .badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; }
        .badge-type { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .badge-level { background: rgba(16, 185, 129, 0.15); color: #34d399; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 28px; width: 450px; }
        .modal-header { font-size: 20px; font-weight: 700; color: white; margin-bottom: 20px; }
        
        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
        .form-control { width: 100%; padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 8px; color: white; font-size: 14px; }
        .form-control:focus { border-color: #10b981; outline: none; }
        
        .btn-modal-submit { width: 100%; padding: 12px; background: linear-gradient(135deg, #10b981, #3b82f6); border: none; border-radius: 8px; color: white; font-weight: 700; cursor: pointer; font-size: 14px; margin-top: 10px; }
        .btn-cancel { width: 100%; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 8px; color: white; font-weight: 700; cursor: pointer; font-size: 14px; margin-top: 8px; }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Learning Management</h1>
          <p className="subtitle">Configure modules templates, learning catalog resources, and monitor completions</p>
        </div>
        <button className="btn-add" onClick={() => setShowAddRes(true)}>Add Reference Resource</button>
      </div>

      {!loading && analytics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Enrollments</div>
            <div className="stat-num">{analytics.totalEnrollments}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed Modules</div>
            <div className="stat-num">{analytics.completedEnrollments}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completion Rate</div>
            <div className="stat-num">{analytics.completionRate.toFixed(1)}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Learning Goals</div>
            <div className="stat-num">{analytics.totalGoalsCreated}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading catalog...</div>
      ) : (
        <div className="sections-grid">
          <div className="section-card">
            <div className="section-title">Template Learning Modules</div>
            <div className="list-items">
              {modules.map((m) => (
                <div key={m.id} className="list-item">
                  <div className="item-info">
                    <div className="item-name">{m.title}</div>
                    <div className="item-meta">
                      Duration: {m.estimatedDuration}m | Content: {m.contentType}
                    </div>
                  </div>
                  <span className="badge badge-level">{m.level}</span>
                </div>
              ))}
              {modules.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No modules configured.</div>
              )}
            </div>
          </div>

          <div className="section-card">
            <div className="section-title">External Reference Resources</div>
            <div className="list-items">
              {resources.map((r) => (
                <div key={r.id} className="list-item">
                  <div className="item-info">
                    <div className="item-name">{r.title}</div>
                    <div className="item-meta">
                      Provider: {r.provider} | Difficulty: {r.difficulty}
                    </div>
                  </div>
                  <span className="badge badge-type">{r.contentType}</span>
                </div>
              ))}
              {resources.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No reference resources linked yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddRes && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">Add Reference Resource</div>
            <form onSubmit={handleAddResource}>
              <div className="form-group">
                <label className="form-label">Resource Title</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="e.g. Intro to Docker Containers"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Provider Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={resProvider}
                  onChange={(e) => setResProvider(e.target.value)}
                  placeholder="e.g. YouTube, Coursera"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Resource URL</label>
                <input
                  type="url"
                  className="form-control"
                  required
                  value={resUrl}
                  onChange={(e) => setResUrl(e.target.value)}
                  placeholder="e.g. https://youtube.com/..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Content Type</label>
                <select className="form-control" value={resType} onChange={(e) => setResType(e.target.value)}>
                  <option value="VIDEO">Video</option>
                  <option value="COURSE">Course</option>
                  <option value="DOCUMENTATION">Documentation</option>
                  <option value="TUTORIAL">Tutorial</option>
                  <option value="QUIZ">Quiz</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select className="form-control" value={resDifficulty} onChange={(e) => setResDifficulty(e.target.value)}>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Estimated Duration (mins)</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  value={resDuration}
                  onChange={(e) => setResDuration(Number(e.target.value))}
                />
              </div>

              <button type="submit" className="btn-modal-submit">Create Reference</button>
              <button type="button" className="btn-cancel" onClick={() => setShowAddRes(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
