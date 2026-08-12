import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClient } from '../api/admin-client';
import { Search, Ban, CheckCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

export default function Users() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['adminUsers', page, search],
    queryFn: async () => {
      const res = await adminClient.get('/admin/users', { params: { page, search } });
      return res.data;
    },
    keepPreviousData: true,
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await adminClient.patch(`/admin/users/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers']);
    },
  });

  const resetLock = useMutation({
    mutationFn: async (id: string) => {
      await adminClient.patch(`/admin/users/${id}/reset-lock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers']);
      alert('User login attempts reset.');
    },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>User Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage accounts and roles.</p>
        </div>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search email or name..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ 
              width: '100%', 
              padding: '10px 10px 10px 36px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-subtle)', 
              background: 'var(--bg-card)',
              color: 'var(--text-primary)'
            }} 
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No users found.</td></tr>
            ) : (
              data?.data.map((user: any) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{user.firstName} {user.lastName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {user.email} {user.isEmailVerified && <span style={{ color: 'var(--status-success)' }}>✓</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${user.role === 'SUPER_ADMIN' ? 'badge-error' : user.role === 'ADMIN' ? 'badge-warning' : 'badge-neutral'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.isActive ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-error">Disabled</span>
                    )}
                  </td>
                  <td>{format(new Date(user.createdAt), 'MMM dd, yyyy')}</td>
                  <td>{user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM dd, yyyy HH:mm') : 'Never'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className={user.isActive ? 'btn btn-danger' : 'btn btn-secondary'}
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => {
                          if (confirm(`Are you sure you want to ${user.isActive ? 'disable' : 'enable'} this user?`)) {
                            toggleStatus.mutate({ id: user.id, isActive: !user.isActive });
                          }
                        }}
                        disabled={user.role === 'SUPER_ADMIN'}
                      >
                        {user.isActive ? <><Ban size={14} /> Disable</> : <><CheckCircle size={14} /> Enable</>}
                      </button>
                      <button 
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => {
                          if (confirm('Reset login lock?')) {
                            resetLock.mutate(user.id);
                          }
                        }}
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {data && data.totalPages > 1 && (
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Page {data.page} of {data.totalPages}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary" 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button 
                className="btn btn-secondary" 
                disabled={page === data.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
