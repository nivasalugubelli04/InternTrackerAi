import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClient } from '../api/admin-client';
import { Flag, Plus, Edit2, Check, X } from 'lucide-react';
import { format } from 'date-fns';

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
      queryClient.invalidateQueries(['adminFeatureFlags']);
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
      queryClient.invalidateQueries(['adminFeatureFlags']);
    },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Feature Flags</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Dynamically toggle platform capabilities.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          <Plus size={18} /> New Flag
        </button>
      </div>

      {isAdding && (
        <div className="card" style={{ marginBottom: '24px', border: '1px solid var(--border-focus)' }}>
          <h3 style={{ marginBottom: '16px' }}>Create Feature Flag</h3>
          <div className="grid-cols-2" style={{ marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>Flag Key</label>
              <input 
                type="text" 
                placeholder="e.g. ENABLE_GPT4_MATCHING" 
                value={newFlag.key}
                onChange={e => setNewFlag(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', color: 'white' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>Description</label>
              <input 
                type="text" 
                placeholder="What does this toggle do?" 
                value={newFlag.description}
                onChange={e => setNewFlag(prev => ({ ...prev, description: e.target.value }))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', color: 'white' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={newFlag.isEnabled}
                onChange={e => setNewFlag(prev => ({ ...prev, isEnabled: e.target.checked }))}
                style={{ width: '16px', height: '16px' }}
              />
              Enabled by default
            </label>
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => createFlag.mutate(newFlag)} disabled={!newFlag.key}>Save Flag</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Flag Key</th>
              <th>Description</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading flags...</td></tr>
            ) : flags?.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No feature flags configured.</td></tr>
            ) : (
              flags?.map((flag: any) => (
                <tr key={flag.id}>
                  <td>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Flag size={14} color="var(--brand-primary)" />
                      {flag.key}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{flag.description || '—'}</td>
                  <td>
                    {flag.isEnabled ? (
                      <span className="badge badge-success">Enabled</span>
                    ) : (
                      <span className="badge badge-error">Disabled</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '12px' }}>{format(new Date(flag.updatedAt), 'MMM dd, HH:mm')}</div>
                    {flag.updatedByAdmin && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>by {flag.updatedByAdmin.email}</div>
                    )}
                  </td>
                  <td>
                    <button 
                      className={flag.isEnabled ? 'btn btn-danger' : 'btn btn-primary'}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => toggleFlag.mutate({ id: flag.id, isEnabled: !flag.isEnabled })}
                    >
                      {flag.isEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
