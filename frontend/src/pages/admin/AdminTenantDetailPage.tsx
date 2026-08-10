import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft } from 'lucide-react';

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  userCount: number;
  linkCount: number;
  clickCount: number;
  users: Array<{ id: string; email: string; role: string; createdAt: string }>;
  links: Array<{ id: string; shortCode: string; originalUrl: string; title: string | null; isActive: boolean; expiresAt: string | null; createdAt: string; clickCount: number }>;
}

interface TenantAnalytics {
  totalClicks: number;
  clicksOverTime: Array<{ date: string; clicks: number }>;
  referrers: Array<{ referrer: string; count: number }>;
  browsers: Array<{ name: string; count: number }>;
  os: Array<{ name: string; count: number }>;
}

export const AdminTenantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [analytics, setAnalytics] = useState<TenantAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/admin/tenants/${id}`),
      api.get(`/admin/tenants/${id}/analytics`, { params: { days: 30 } }),
    ]).then(([td, ta]) => {
      setTenant(td.data);
      setAnalytics(ta.data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '12px', color: 'var(--muted-fg)' }}>
        <Spinner size={20} />
        <span className="font-mono" style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading tenant</span>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div style={{ padding: '64px 40px' }}>
        <p style={{ color: 'var(--muted-fg)' }}>Tenant not found.</p>
        <Link to="/admin/tenants" className="btn-ghost" style={{ marginTop: '16px' }}>
          <ArrowLeft size={14} /> Back to Tenants
        </Link>
      </div>
    );
  }

  // SVG sparkline
  const w = 600; const h = 120; const padY = 12;
  const clData = analytics?.clicksOverTime ?? [];
  const maxC = Math.max(...clData.map((d) => d.clicks), 1);
  const pts = clData.map((d, i) => ({
    x: (i * w) / Math.max(clData.length - 1, 1),
    y: h - padY - (d.clicks * (h - padY * 2)) / maxC,
  }));
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const lastPt = pts[pts.length - 1];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '8px' }}>
        <Link to="/admin/tenants" className="btn-ghost" style={{ padding: '0', fontSize: '0.8rem' }}>
          <ArrowLeft size={13} strokeWidth={1.5} /> All Tenants
        </Link>
      </div>

      <PageHeader
        eyebrow={`Tenant · ${tenant.slug}`}
        title={tenant.name}
        subtitle={`Created ${new Date(tenant.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`}
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', marginBottom: '40px' }}>
        <StatCard label="Users" value={tenant.userCount} />
        <StatCard label="Links" value={tenant.linkCount} />
        <StatCard label="Total Clicks" value={tenant.clickCount.toLocaleString()} />
      </div>

      {/* Click trend */}
      {clData.length > 1 && (
        <div style={{ border: '1px solid var(--border)', marginBottom: '40px' }}>
          <div style={{ padding: '20px 24px 0' }}>
            <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>Clicks · last 30 days</p>
            <p className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)' }}>Click Trend</p>
          </div>
          <div style={{ padding: '16px 0 0', overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', minWidth: '300px', height: 'auto', display: 'block' }} role="img" aria-label="Click trend">
              <defs>
                <linearGradient id="td-fade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.5, 1].map((r) => (
                <line key={r} x1={0} y1={padY + (1 - r) * (h - padY * 2)} x2={w} y2={padY + (1 - r) * (h - padY * 2)} stroke="var(--border)" strokeWidth="1" />
              ))}
              <path d={`M ${pts[0].x},${h} ${pts.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${pts[pts.length - 1].x},${h} Z`} fill="url(#td-fade)" />
              <polyline fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={polyline} />
              {lastPt && <circle cx={lastPt.x} cy={lastPt.y} r="4" fill="var(--accent)" />}
            </svg>
          </div>
        </div>
      )}

      {/* Users + Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1px', background: 'var(--border)', marginBottom: '40px' }}>
        {/* Users table */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '0' }}>
          <div style={{ padding: '20px 24px 16px' }}>
            <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>Members</p>
            <p className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)' }}>Users</p>
          </div>
          <table className="data-table" aria-label="Tenant users">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              {tenant.users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--fg)' }}>{u.email}</td>
                  <td>
                    <Badge variant={u.role === 'TENANT_ADMIN' ? 'role' : 'inactive'}>
                      {u.role === 'TENANT_ADMIN' ? 'Admin' : 'Member'}
                    </Badge>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted-fg)' }}>
                      {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Links table */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderLeft: 'none', padding: '0' }}>
          <div style={{ padding: '20px 24px 16px' }}>
            <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>Short links</p>
            <p className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)' }}>Links</p>
          </div>
          <table className="data-table" aria-label="Tenant links">
            <thead>
              <tr>
                <th scope="col">Short Code</th>
                <th scope="col">Clicks</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenant.links.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div className="font-mono" style={{ color: 'var(--accent)', fontSize: '0.8125rem', fontWeight: 500 }}>/{l.shortCode}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                      {l.title || l.originalUrl}
                    </div>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--fg)' }}>{l.clickCount}</span>
                  </td>
                  <td>
                    <Badge variant={l.isActive ? 'active' : 'inactive'}>{l.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Referrers */}
      {analytics && analytics.referrers.length > 0 && (
        <div style={{ border: '1px solid var(--border)', padding: '28px' }}>
          <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>Traffic Sources</p>
          <p className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)', marginBottom: '24px' }}>Referrers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {analytics.referrers.map((r) => {
              const pct = analytics.totalClicks > 0 ? (r.count / analytics.totalClicks) * 100 : 0;
              return (
                <div key={r.referrer}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--fg)' }}>{r.referrer}</span>
                    <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted-fg)' }}>{r.count} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
