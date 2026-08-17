import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FormGroup, FormLabel, FormControl } from '../components/ui/Form';

const API_BASE = '/api/v1/admin/career-paths';

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
      console.error(e.message);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="anim-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
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
            Career Pathways
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
            Configure industry-standard progression steps, milestones, and required prerequisite skills.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>Add Career Path</Button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Loading career pathways...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {paths.map((path) => (
            <Card key={path.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, var(--brand-primary), var(--accent-purple))'
                }}
              />
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)' }}>
                  {path.title}
                </h3>
                {path.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px', lineHeight: '1.5' }}>
                    {path.description}
                  </p>
                )}
                
                <div style={{ position: 'relative', paddingLeft: '24px', marginTop: '24px' }} className="step-timeline">
                  {path.steps.map((step) => (
                    <div key={step.id} style={{ position: 'relative', marginBottom: '24px' }} className="step-node">
                      <div className="step-dot"></div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Step {step.stepNumber}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginTop: '2px' }}>
                        {step.role.name}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                        {step.skills.map((cps) => (
                          <Badge key={cps.skill.name} variant="primary">
                            {cps.skill.name}
                          </Badge>
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
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showAddForm} onClose={() => setShowAddForm(false)} title="Create Career Path">
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <FormLabel>Path Title</FormLabel>
            <FormControl
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Frontend Specialist"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Description</FormLabel>
            <FormControl
              as="textarea"
              style={{ height: '80px', resize: 'none' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Standard career transitions from intern to tech lead."
            />
          </FormGroup>

          <Button type="submit" style={{ width: '100%', marginTop: '10px' }}>Create Path</Button>
          <Button type="button" variant="secondary" style={{ width: '100%', marginTop: '8px' }} onClick={() => setShowAddForm(false)}>
            Cancel
          </Button>
        </form>
      </Modal>

      <style>{`
        .step-timeline::before { 
          content: ''; 
          position: absolute; 
          left: 5px; 
          top: 6px; 
          bottom: 6px; 
          width: 2px; 
          background: rgba(139, 92, 246, 0.2); 
        }
        .step-node:last-child {
          margin-bottom: 0 !important;
        }
        .step-dot { 
          position: absolute; 
          left: -24px; 
          top: 4px; 
          width: 12px; 
          height: 12px; 
          border-radius: 50%; 
          background: var(--accent-purple); 
          border: 3px solid #141B2D; 
        }
      `}</style>
    </div>
  );
}
