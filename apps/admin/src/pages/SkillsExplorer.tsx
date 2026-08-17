import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { FormGroup, FormLabel, FormControl } from '../components/ui/Form';
import { SearchInput } from '../components/ui/SearchInput';

const API_BASE = '/api/v1/admin/skills';

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
      console.error(e.message);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="anim-fade-in">
      <div>
        <h1 
          style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            fontFamily: 'var(--font-display)', 
            background: 'linear-gradient(135deg, white, var(--text-secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em' 
          }}
        >
          Skill Graph Taxonomy
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
          Manage catalog skill descriptors, category mappings, and matching aliases.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'start' }} className="skills-main-grid">
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', flexWrap: 'wrap', gap: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)' }}>Skills Catalog</span>
            <SearchInput 
              placeholder="Search skills or aliases..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Loading skill taxonomies...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Skill</TableHeaderCell>
                    <TableHeaderCell>Category</TableHeaderCell>
                    <TableHeaderCell>Aliases</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell style={{ textAlign: 'right' }}>Actions</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skills.map((skill) => (
                    <TableRow key={skill.id}>
                      <TableCell>
                        <div style={{ fontWeight: 600, color: 'white' }}>{skill.name}</div>
                        {skill.description && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                            {skill.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell style={{ color: 'var(--text-secondary)' }}>{skill.category}</TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {skill.aliases.map((alias) => (
                            <Badge key={alias} variant="primary">
                              {alias}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">{skill.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <Button 
                            variant="secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => handleEdit(skill)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="danger"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => handleDelete(skill.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div 
                style={{ 
                  padding: '20px 24px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  borderTop: '1px solid var(--border-glass)' 
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Page {page} of {Math.max(1, Math.ceil(total / 10))} ({total} total skills)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button 
                    variant="secondary" 
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="secondary" 
                    disabled={page * 10 >= total}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card style={{ height: 'fit-content' }}>
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
            {editingId ? 'Modify Skill' : 'Add New Skill'}
          </h3>
          <form onSubmit={handleSubmit}>
            <FormGroup>
              <FormLabel>Skill Name</FormLabel>
              <FormControl
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kotlin"
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>Category</FormLabel>
              <FormControl
                as="select"
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
              </FormControl>
            </FormGroup>

            <FormGroup>
              <FormLabel>Aliases (Comma separated)</FormLabel>
              <FormControl
                type="text"
                value={aliases}
                onChange={(e) => setAliases(e.target.value)}
                placeholder="JS, ReactJS, Node"
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>Description</FormLabel>
              <FormControl
                as="textarea"
                style={{ height: '80px', resize: 'vertical' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter details about this skill..."
              />
            </FormGroup>

            <Button type="submit" style={{ width: '100%', marginTop: '10px' }}>
              {editingId ? 'Save Updates' : 'Register Skill'}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                style={{ width: '100%', marginTop: '8px' }}
                onClick={() => {
                  setEditingId(null);
                  setName('');
                  setDescription('');
                  setAliases('');
                }}
              >
                Cancel
              </Button>
            )}
          </form>
        </Card>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .skills-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
