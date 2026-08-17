import { useState } from 'react';
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { adminClient } from '../api/admin-client';
import { Play } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { SearchInput } from '../components/ui/SearchInput';

export default function Companies() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['adminCompanies', page, search],
    queryFn: async () => {
      const res = await adminClient.get('/admin/companies', { params: { page, search } });
      return res.data;
    },
    placeholderData: keepPreviousData,
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

  const companiesData = data?.data || [];
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
            Companies & Scrapers
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
            Monitor tracked internship websites, scraper configs, and execution queues.
          </p>
        </div>
        <SearchInput 
          placeholder="Search company..." 
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Company</TableHeaderCell>
              <TableHeaderCell>Parser</TableHeaderCell>
              <TableHeaderCell>Jobs Collected</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell style={{ textAlign: 'right' }}>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading companies & scrapers...
                </TableCell>
              </TableRow>
            ) : companiesData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No companies found matching query.
                </TableCell>
              </TableRow>
            ) : (
              companiesData.map((comp: any) => (
                <TableRow key={comp.id}>
                  <TableCell>
                    <div style={{ fontWeight: 600, color: 'white' }}>{comp.name}</div>
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>
                      <a href={comp.careerUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none' }}>
                        Careers Page ↗
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{comp.parserType}</Badge>
                  </TableCell>
                  <TableCell style={{ color: 'white', fontWeight: 600 }}>{comp._count?.jobPostings ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={comp.isActive ? 'success' : 'error'}>
                      {comp.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => triggerScrape.mutate(comp.id)}
                        disabled={triggerScrape.isPending}
                        icon={<Play size={12} />}
                      >
                        Run Scraper
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
