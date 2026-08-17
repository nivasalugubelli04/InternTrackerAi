import React, { useEffect, useState } from 'react';

const API_BASE = '/api/v1/admin/skills';
const PUBLIC_API_BASE = '/api/v1/skills';

function getHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json',
  };
}

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string | null;
  aliases: string[];
  status: string;
}

export default function SkillsExplorer() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('PROGRAMMING');
  const [description, setDescription] = useState('');
  const [aliases, setAliases] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?page=${page}&limit=10&search=${search}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch admin skills list');
      const data = await res.json();
      setSkills(data.items);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [page, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      category,
      description: description.trim() || undefined,
      aliases: aliases.split(',').map((a) => a.trim()).filter(Boolean),
    };

    try {
      let res;
      if (editingId) {
        res = await fetch(`${API_BASE}/${editingId}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(API_BASE, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error('Failed to save skill');
      
      // Reset form
      setName('');
      setDescription('');
      setAliases('');
      setEditingId(null);
      fetchSkills();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEdit = (skill: Skill) => {
    setEditingId(skill.id);
    setName(skill.name);
    setCategory(skill.category);
    setDescription(skill.description || '');
    setAliases(skill.aliases.join(', '));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete skill');
      fetchSkills();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="skills-explorer-page">
      <style>{`
        .skills-explorer-page { padding: 32px; max-width: 1400px; margin: 0 auto; }
        .explorer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .explorer-title { font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
        
        .main-grid { display: grid; grid-template-columns: 1fr 350px; gap: 24px; }
        .card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; }
        .card-title { font-size: 18px; font-weight: 600; color: white; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        
        .search-input { width: 100%; padding: 12px 16px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 8px; color: white; margin-bottom: 20px; font-size: 14px; }
        .search-input:focus { border-color: #10b981; outline: none; }
        
        .skills-table { width: 100%; border-collapse: collapse; text-align: left; }
        .skills-table th { padding: 12px 16px; border-bottom: 2px solid var(--border-subtle); color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
        .skills-table td { padding: 16px; border-bottom: 1px solid var(--border-subtle); font-size: 14px; color: white; vertical-align: top; }
        .alias-badge { display: inline-block; background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; padding: 2px 8px; font-size: 12px; margin-right: 4px; margin-bottom: 4px; }
        .status-badge { display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: 12px; text-transform: uppercase; }
        .status-active { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .action-btn { background: none; border: none; cursor: pointer; font-weight: 600; padding: 4px 8px; border-radius: 4px; font-size: 13px; transition: background 0.2s; }
        .btn-edit { color: #60a5fa; }
        .btn-edit:hover { background: rgba(59, 130, 246, 0.1); }
        .btn-delete { color: #f87171; margin-left: 8px; }
        .btn-delete:hover { background: rgba(248, 113, 113, 0.1); }

        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
        .form-control { width: 100%; padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 8px; color: white; font-size: 14px; }
        .form-control:focus { border-color: #10b981; outline: none; }
        .btn-submit { width: 100%; padding: 12px; background: linear-gradient(135deg, #10b981, #3b82f6); border: none; border-radius: 8px; color: white; font-weight: 700; cursor: pointer; font-size: 14px; margin-top: 10px; }
        .btn-submit:hover { opacity: 0.9; }

        .pagination { display: flex; align-items: center; justify-content: space-between; margin-top: 20px; }
        .btn-page { background: var(--bg-primary); border: 1px solid var(--border-subtle); color: white; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 13px; }
        .btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <div className="explorer-header">
        <div>
          <h1 className="explorer-title">Skill Graph Taxonomy</h1>
          <p className="subtitle">Admin control interface to manage skills, categories, and alias mappings</p>
        </div>
      </div>

      <div className="main-grid">
        <div className="card">
          <div className="card-title">Skills Catalog</div>
          <input
            type="text"
            className="search-input"
            placeholder="Search skills or aliases..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />

          {loading ? (
            <div style={{ color: 'var(--text-muted)' }}>Loading taxonomy...</div>
          ) : (
            <>
              <table className="skills-table">
                <thead>
                  <tr>
                    <th>Skill Name</th>
                    <th>Category</th>
                    <th>Aliases</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((skill) => (
                    <tr key={skill.id}>
                      <td>
                        <strong>{skill.name}</strong>
                        {skill.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {skill.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{skill.category}</span>
                      </td>
                      <td>
                        {skill.aliases.map((alias) => (
                          <span key={alias} className="alias-badge">{alias}</span>
                        ))}
                      </td>
                      <td>
                        <span className="status-badge status-active">{skill.status}</span>
                      </td>
                      <td>
                        <button className="action-btn btn-edit" onClick={() => handleEdit(skill)}>Edit</button>
                        <button className="action-btn btn-delete" onClick={() => handleDelete(skill.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pagination">
                <button
                  className="btn-page"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Page {page} of {Math.max(1, Math.ceil(total / 10))} ({total} total skills)
                </span>
                <button
                  className="btn-page"
                  disabled={page * 10 >= total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-title">{editingId ? 'Modify Skill' : 'Add New Skill'}</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Skill Name</label>
              <input
                type="text"
                className="form-control"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kotlin"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="PROGRAMMING">Programming Languages</option>
                <option value="FRONTEND">Frontend Development</option>
                <option value="BACKEND">Backend Development</option>
                <option value="DATABASE">Databases</option>
                <option value="CLOUD">Cloud Solutions</option>
                <option value="DEVOPS">DevOps & Platforms</option>
                <option value="AI_ML">Artificial Intelligence / ML</option>
                <option value="MOBILE">Mobile Applications</option>
                <option value="TESTING">Testing / Automation</option>
                <option value="SOFT_SKILLS">Soft Skills</option>
                <option value="OTHER">Other Categories</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Aliases (Comma separated)</label>
              <input
                type="text"
                className="form-control"
                value={aliases}
                onChange={(e) => setAliases(e.target.value)}
                placeholder="JS, ReactJS, Node"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                style={{ height: '80px', resize: 'vertical' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter details about this skill..."
              />
            </div>

            <button type="submit" className="btn-submit">
              {editingId ? 'Save Updates' : 'Register Skill'}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn-submit"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', marginTop: '8px' }}
                onClick={() => {
                  setEditingId(null);
                  setName('');
                  setDescription('');
                  setAliases('');
                }}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
