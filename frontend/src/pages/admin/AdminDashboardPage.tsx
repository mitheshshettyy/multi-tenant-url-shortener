import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Spinner } from '../../components/ui/Spinner';
import { Divider } from '../../components/ui/Divider';
import { Link } from 'react-router-dom';
import { Building2, Users2, Link2, MousePointerClick, TrendingUp, ArrowRight } from 'lucide-react';

interface Stats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalLinks: number;
  totalClicks: number;
  avgClicksPerLink: number;
  newTenants: number;
  newUsers: number;
}

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => {
      setStats(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '12px', color: 'var(--muted-fg)' }}>
        <Spinner size={20} />
        <span className="font-mono" style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Loading platform data
        </span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Platform Administration"
        title="Overview"
        subtitle="Real-time aggregate statistics across all tenants."
      />

      {/* Primary stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1px',
          background: 'var(--border)',
          border: '1px solid var(--border)',
          marginBottom: '40px',
        }}
      >
        <StatCard label="Total Tenants" value={stats?.totalTenants ?? 0} ghost="T" />
        <StatCard label="Active Tenants" value={stats?.activeTenants ?? 0} ghost="A" />
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} ghost="U" />
        <StatCard label="Total Links" value={stats?.totalLinks ?? 0} ghost="L" />
        <StatCard label="Total Clicks" value={stats?.totalClicks.toLocaleString() ?? 0} ghost="C" />
        <StatCard label="Avg Clicks/Link" value={stats?.avgClicksPerLink ?? 0} ghost="~" />
      </div>

      {/* 30-day growth row */}
      <div style={{ border: '1px solid var(--border)', marginBottom: '40px', padding: '28px' }}>
        <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>
          30-Day Growth
        </p>
        <p className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)', marginBottom: '28px' }}>
          New Activity
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <TrendingUp size={28} strokeWidth={1} style={{ color: 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
            <div>
              <p className="font-display" style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--fg)' }}>
                {stats?.newTenants ?? 0}
              </p>
              <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)' }}>
                New Tenants
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Users2 size={28} strokeWidth={1} style={{ color: 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
            <div>
              <p className="font-display" style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--fg)' }}>
                {stats?.newUsers ?? 0}
              </p>
              <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)' }}>
                New Users
              </p>
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* Quick nav links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', background: 'var(--border)', marginTop: '40px', border: '1px solid var(--border)' }}>
        {[
          { to: '/admin/tenants', label: 'Manage Tenants', icon: <Building2 size={18} strokeWidth={1.5} /> },
          { to: '/admin/users', label: 'Manage Users', icon: <Users2 size={18} strokeWidth={1.5} /> },
          { to: '/admin/links', label: 'Manage Links', icon: <Link2 size={18} strokeWidth={1.5} /> },
          { to: '/admin/analytics', label: 'Platform Analytics', icon: <MousePointerClick size={18} strokeWidth={1.5} /> },
        ].map(({ to, label, icon }) => (
          <Link
            key={to}
            to={to}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px',
              background: 'var(--bg)',
              textDecoration: 'none',
              color: 'var(--muted-fg)',
              transition: 'color 150ms, background 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.background = 'var(--surface)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-fg)'; e.currentTarget.style.background = 'var(--bg)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {icon}
              <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{label}</span>
            </div>
            <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
};
