import React, { useEffect, useState } from 'react';

const API_BASE = '/api/v1/admin/career-paths';
const PUBLIC_API_BASE = '/api/v1/career-paths';

function getHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json',
  };
}

interface Step {
  id: string;
  stepNumber: number;
  role: {
    name: string;
  };
  skills: {
    skill: {
      name: string;
    };
  }[];
}

interface CareerPath {
  id: string;
  title: string;
  description: string | null;
  steps: Step[];
}

export default function CareerPaths() {
  const [paths, setPaths] = useState<CareerPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New path form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchPaths = async () => {
    setLoading(true);
    try {
      // The public endpoint returns paths with pre-loaded steps
      const res = await fetch('/api/v1/career-paths', {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch career paths');
      setPaths(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaths();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title,
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to create career path');
      
      setTitle('');
      setDescription('');
      setShowAddForm(false);
      fetchPaths();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="career-paths-page">
      <style>{`
        .career-paths-page { padding: 32px; max-width: 1400px; margin: 0 auto; }
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .page-title { font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #8b5cf6, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
        
        .btn-add { padding: 10px 20px; background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
        .btn-add:hover { opacity: 0.9; }

        .paths-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px; margin-top: 24px; }
        .path-card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; position: relative; display: flex; flex-direction: column; justify-content: space-between; }
        .path-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #8b5cf6, #3b82f6); border-top-left-radius: 16px; border-top-right-radius: 16px; }
        
        .path-title { font-size: 20px; font-weight: 700; color: white; margin-bottom: 8px; }
        .path-desc { color: var(--text-secondary); font-size: 14px; margin-bottom: 20px; line-height: 1.5; }
        
        .step-timeline { position: relative; padding-left: 28px; margin-top: 10px; }
        .step-timeline::before { content: ''; position: absolute; left: 6px; top: 8px; bottom: 8px; width: 2px; background: rgba(139, 92, 246, 0.3); }
        
        .step-node { position: relative; margin-bottom: 20px; }
        .step-node:last-child { margin-bottom: 0; }
        .step-dot { position: absolute; left: -28px; top: 4px; width: 14px; height: 14px; border-radius: 50%; background: #8b5cf6; border: 3px solid var(--bg-secondary); }
        .step-num { font-size: 11px; font-weight: 800; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.05em; }
        .step-role { font-size: 15px; font-weight: 600; color: white; margin-top: 2px; }
        
        .step-skills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .step-skill-badge { background: rgba(139, 92, 246, 0.15); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 6px; padding: 2px 8px; font-size: 11px; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 28px; width: 450px; }
        .modal-header { font-size: 20px; font-weight: 700; color: white; margin-bottom: 20px; }
        
        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
        .form-control { width: 100%; padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 8px; color: white; font-size: 14px; }
        .form-control:focus { border-color: #8b5cf6; outline: none; }
        
        .btn-modal-submit { width: 100%; padding: 12px; background: linear-gradient(135deg, #8b5cf6, #3b82f6); border: none; border-radius: 8px; color: white; font-weight: 700; cursor: pointer; font-size: 14px; margin-top: 10px; }
        .btn-cancel { width: 100%; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 8px; color: white; font-weight: 700; cursor: pointer; font-size: 14px; margin-top: 8px; }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Career Paths</h1>
          <p className="subtitle">Structured career transitions, progression pathways, and step requirements</p>
        </div>
        <button className="btn-add" onClick={() => setShowAddForm(true)}>Add Career Path</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading pathways...</div>
      ) : (
        <div className="paths-list">
          {paths.map((path) => (
            <div key={path.id} className="path-card">
              <div>
                <div className="path-title">{path.title}</div>
                {path.description && <p className="path-desc">{path.description}</p>}
                
                <div className="step-timeline">
                  {path.steps.map((step) => (
                    <div key={step.id} className="step-node">
                      <div className="step-dot"></div>
                      <div className="step-num">Step {step.stepNumber}</div>
                      <div className="step-role">{step.role.name}</div>
                      <div className="step-skills">
                        {step.skills.map((cps) => (
                          <span key={cps.skill.name} className="step-skill-badge">{cps.skill.name}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {path.steps.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                      No transition steps configured.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">Create Career Path</div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Path Title</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Frontend Specialist"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  style={{ height: '80px', resize: 'none' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Standard career transitions from intern to tech lead."
                />
              </div>

              <button type="submit" className="btn-modal-submit">Create Path</button>
              <button type="button" className="btn-cancel" onClick={() => setShowAddForm(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
