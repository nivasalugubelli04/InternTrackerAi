import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClient } from '../api/admin-client';
import { Search, Play, Activity } from 'lucide-react';

export default function Companies() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['adminCompanies', page, search],
    queryFn: async () => {
      const res = await adminClient.get('/admin/companies', { params: { page, search } });
      return res.data;
    },
    keepPreviousData: true,
  });

  const triggerScrape = useMutation({
    mutationFn: async (id: string) => {
      await adminClient.post(`/admin/companies/${id}/scrape`);
    },
    onSuccess: () => {
      alert('Scraper job has been enqueued.');
    },
    onError: () => {
      alert('Failed to trigger scraper.');
    }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Companies & Scrapers</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor parsers and collection health.</p>
        </div>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search company..." 
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
              <th>Company</th>
              <th>Parser</th>
              <th>Jobs Collected</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No companies found.</td></tr>
            ) : (
              data?.data.map((comp: any) => (
                <tr key={comp.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{comp.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--brand-primary)' }}>
                      <a href={comp.careerUrl} target="_blank" rel="noreferrer">Careers Page</a>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{comp.parserType}</span>
                  </td>
                  <td>{comp._count.jobPostings}</td>
                  <td>
                    {comp.isActive ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-error">Disabled</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => triggerScrape.mutate(comp.id)}
                        disabled={triggerScrape.isPending}
                      >
                        <Play size={14} /> Run Scraper
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
