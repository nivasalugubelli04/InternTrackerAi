import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';

const API_BASE = '/api/v1/admin/outcomes';

function getHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };
}

interface RoleRow {
  role: string;
  applications: number;
  interviews: number;
  offers: number;
  hires: number;
  interviewConversionRate: number;
  offerConversionRate: number;
  hireRate: number;
  sampleSize: number;
  confidence: string;
}

function pct(v: number) { 
  return `${(v * 100).toFixed(1)}%`; 
}

export default function OutcomesRoles() {
  const [data, setData] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort] = useState<keyof RoleRow>('applications');

  useEffect(() => {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 86400000).toISOString();
    fetch(`${API_BASE}/roles?periodStart=${start}&periodEnd=${end}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...data].sort((a, b) => (b[sort] as number) - (a[sort] as number));
  const maxApps = sorted.reduce((m, r) => Math.max(m, r.applications), 1);

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
            Role Placement Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
            Funnel conversions, application volume, and recruitment confidence bucketed by target roles.
          </p>
        </div>
        <a
          href={`${API_BASE}/export?type=roles`}
          style={{ textDecoration: 'none' }}
        >
          <Button variant="secondary">↓ Export CSV</Button>
        </a>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Loading role analytics...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Role Profile</TableHeaderCell>
                <TableHeaderCell style={{ width: '220px' }}>Applications Volume</TableHeaderCell>
                <TableHeaderCell>Interview rate</TableHeaderCell>
                <TableHeaderCell>Offer rate</TableHeaderCell>
                <TableHeaderCell>Hire rate</TableHeaderCell>
                <TableHeaderCell>Sample Size</TableHeaderCell>
                <TableHeaderCell style={{ textAlign: 'right' }}>Confidence</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.role}>
                  <TableCell style={{ fontWeight: 700, color: 'white' }}>{row.role}</TableCell>
                  <TableCell>
                    <div style={{ marginBottom: '6px', fontWeight: 600, color: 'white' }}>{row.applications.toLocaleString()}</div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '4px', height: '6px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${(row.applications / maxApps) * 100}%`,
                          background: 'linear-gradient(90deg, var(--brand-primary), var(--accent-purple))'
                        }} 
                      />
                    </div>
                  </TableCell>
                  <TableCell style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>{pct(row.interviewConversionRate)}</TableCell>
                  <TableCell style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>{pct(row.offerConversionRate)}</TableCell>
                  <TableCell style={{ color: 'var(--status-success)', fontWeight: 700 }}>{pct(row.hireRate)}</TableCell>
                  <TableCell style={{ color: 'var(--text-secondary)' }}>{row.sampleSize.toLocaleString()}</TableCell>
                  <TableCell style={{ textAlign: 'right' }}>
                    <Badge variant={row.confidence === 'HIGH' ? 'success' : row.confidence === 'MEDIUM' ? 'warning' : 'error'}>
                      {row.confidence}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
