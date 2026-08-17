import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClient } from '../api/admin-client';
import { Flag, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { FormGroup, FormLabel, FormControl } from '../components/ui/Form';

export default function FeatureFlags() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: '', description: '', isEnabled: false });

  const { data: flags, isLoading } = useQuery({
    queryKey: ['adminFeatureFlags'],
    queryFn: async () => {
      const res = await adminClient.get('/admin/feature-flags');
      return res.data;
    },
  });

  const createFlag = useMutation({
    mutationFn: async (flag: typeof newFlag) => {
      await adminClient.post('/admin/feature-flags', flag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeatureFlags'] });
      setIsAdding(false);
      setNewFlag({ key: '', description: '', isEnabled: false });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create feature flag');
    }
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      await adminClient.patch(`/admin/feature-flags/${id}`, { isEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeatureFlags'] });
    },
  });

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
            Feature Flags
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
            Dynamically control platform rules, toggling algorithms, and experimental features.
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)} icon={<Plus size={16} />}>
          New Flag
        </Button>
      </div>

      {isAdding && (
        <Card style={{ border: '1px solid rgba(139, 92, 246, 0.35)', boxShadow: '0 0 20px rgba(139, 92, 246, 0.15)' }}>
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
            Create Feature Flag
          </h3>
          <div className="grid-cols-2">
            <FormGroup>
              <FormLabel>Flag Key</FormLabel>
              <FormControl 
                type="text" 
                placeholder="e.g. ENABLE_GPT4_MATCHING" 
                value={newFlag.key}
                onChange={e => setNewFlag(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Description</FormLabel>
              <FormControl 
                type="text" 
                placeholder="What does this feature flag toggle?" 
                value={newFlag.description}
                onChange={e => setNewFlag(prev => ({ ...prev, description: e.target.value }))}
              />
            </FormGroup>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={newFlag.isEnabled}
                onChange={e => setNewFlag(prev => ({ ...prev, isEnabled: e.target.checked }))}
                style={{ 
                  width: '18px', 
                  height: '18px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-glass)',
                  accentColor: 'var(--brand-primary)'
                }}
              />
              Enabled by default
            </label>
            <div style={{ flex: 1 }} />
            <Button variant="secondary" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={() => createFlag.mutate(newFlag)} disabled={!newFlag.key}>Save Flag</Button>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Flag Key</TableHeaderCell>
              <TableHeaderCell>Description</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Last Updated</TableHeaderCell>
              <TableHeaderCell style={{ textAlign: 'right' }}>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading feature flags...
                </TableCell>
              </TableRow>
            ) : flags?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No feature flags configured.
                </TableCell>
              </TableRow>
            ) : (
              flags?.map((flag: any) => (
                <TableRow key={flag.id}>
                  <TableCell>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                      <Flag size={14} color="var(--brand-primary)" />
                      {flag.key}
                    </div>
                  </TableCell>
                  <TableCell style={{ color: 'var(--text-secondary)' }}>{flag.description || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={flag.isEnabled ? 'success' : 'error'}>
                      {flag.isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell style={{ color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '13px' }}>{format(new Date(flag.updatedAt), 'MMM dd, HH:mm')}</div>
                    {flag.updatedByAdmin && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>by {flag.updatedByAdmin.email}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        variant={flag.isEnabled ? 'danger' : 'primary'}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => toggleFlag.mutate({ id: flag.id, isEnabled: !flag.isEnabled })}
                      >
                        {flag.isEnabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
