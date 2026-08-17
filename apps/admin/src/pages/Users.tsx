import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { adminClient } from '../api/admin-client';
import { Ban, CheckCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { SearchInput } from '../components/ui/SearchInput';

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
    placeholderData: keepPreviousData,
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await adminClient.patch(`/admin/users/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });

  const resetLock = useMutation({
    mutationFn: async (id: string) => {
      await adminClient.patch(`/admin/users/${id}/reset-lock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      alert('User login attempts reset.');
    },
  });

  const usersData = data?.data || [];
  const totalPages = data?.totalPages || 0;
  const currentPage = data?.page || 1;

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
            User Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
            Manage platform accounts, roles, access controls, and rate limits.
          </p>
        </div>
        <SearchInput 
          placeholder="Search email or name..." 
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>User</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Joined</TableHeaderCell>
              <TableHeaderCell>Last Active</TableHeaderCell>
              <TableHeaderCell style={{ textAlign: 'right' }}>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading platform users...
                </TableCell>
              </TableRow>
            ) : usersData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No users found matching query.
                </TableCell>
              </TableRow>
            ) : (
              usersData.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div style={{ fontWeight: 600, color: 'white' }}>{user.firstName} {user.lastName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {user.email} {user.isEmailVerified && <span style={{ color: 'var(--status-success)', marginLeft: '4px' }}>✓</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'SUPER_ADMIN' ? 'error' : user.role === 'ADMIN' ? 'warning' : 'neutral'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'error'}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell style={{ color: 'var(--text-secondary)' }}>
                    {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell style={{ color: 'var(--text-secondary)' }}>
                    {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM dd, HH:mm') : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <Button 
                        variant={user.isActive ? 'danger' : 'secondary'}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => {
                          if (confirm(`Are you sure you want to ${user.isActive ? 'disable' : 'enable'} this user?`)) {
                            toggleStatus.mutate({ id: user.id, isActive: !user.isActive });
                          }
                        }}
                        disabled={user.role === 'SUPER_ADMIN'}
                        icon={user.isActive ? <Ban size={13} /> : <CheckCircle size={13} />}
                      >
                        {user.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button 
                        variant="secondary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => {
                          if (confirm('Reset login lock attempts for this user?')) {
                            resetLock.mutate(user.id);
                          }
                        }}
                        icon={<RotateCcw size={13} />}
                      >
                        Reset Lock
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {totalPages > 1 && (
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
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button 
                variant="secondary" 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button 
                variant="secondary" 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
