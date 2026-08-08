import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Spinner } from '../../components/ui/Spinner';
import { Divider } from '../../components/ui/Divider';

interface Overview { totalClicks: number; totalUrls: number; activeUrls: number; }
interface ClickDay { date: string; clicks: number; }
interface Referrer { referrer: string; count: number; }
interface BrowserOS { browsers: Array<{ name: string; count: number }>; os: Array<{ name: string; count: number }>; }
interface TopLink { id: string; shortCode: string; originalUrl: string; title: string | null; isActive: boolean; tenant: { name: string; slug: string }; clickCount: number; }
interface TenantActivity { id: string; name: string; slug: string; linkCount: number; clickCount: number; }

export const AdminAnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<Overview>({ totalClicks: 0, totalUrls: 0, activeUrls: 0 });
  const [clicksData, setClicksData] = useState<ClickDay[]>([]);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [devices, setDevices] = useState<BrowserOS>({ browsers: [], os: [] });
  const [topLinks, setTopLinks] = useState<TopLink[]>([]);
  const [tenantActivity, setTenantActivity] = useState<TenantActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/analytics/overview'),
      api.get('/admin/analytics/clicks', { params: { days: 30 } }),
      api.get('/admin/analytics/referrers', { params: { limit: 5 } }),
      api.get('/admin/analytics/user-agents', { params: { limit: 5 } }),
      api.get('/admin/analytics/top-links', { params: { limit: 8 } }),
      api.get('/admin/analytics/tenant-activity', { params: { limit: 10 } }),
    ]).then(([ov, cl, ref, ua, tl, ta]) => {
      setOverview(ov.data);
      setClicksData(cl.data);
      setReferrers(ref.data);
      setDevices(ua.data);
      setTopLinks(tl.data);
      setTenantActivity(ta.data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  // SVG sparkline
  const w = 800; const h = 160; const padY = 16;
  const maxClicks = Math.max(...clicksData.map((d) => d.clicks), 1);
  const pts = clicksData.map((d, i) => ({
    x: (i * (w)) / Math.max(clicksData.length - 1, 1),
    y: h - padY - (d.clicks * (h - padY * 2)) / maxClicks,
  }));
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const lastPt = pts[pts.length - 1];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '12px', color: 'var(--muted-fg)' }}>
        <Spinner size={20} />
        <span className="font-mono" style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Loading analytics
        </span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Platform Administration"
        title="Analytics"
        subtitle="Aggregate metrics across all tenants and all short links."
      />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', marginBottom: '40px' }}>
        <StatCard label="Total Clicks" value={overview.totalClicks.toLocaleString()} />
        <StatCard label="Total Links" value={overview.totalUrls.toLocaleString()} />
        <StatCard label="Active Links" value={overview.activeUrls.toLocaleString()} />
      </div>

      {/* Sparkline */}
      <div style={{ border: '1px solid var(--border)', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <div>
            <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>
              Platform clicks over time
            </p>
            <p className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)' }}>
              Last 30 Days
            </p>
          </div>
        </div>
        <div style={{ padding: '16px 0 0', overflowX: 'auto' }}>
          {clicksData.length <= 1 ? (
            <div style={{ padding: '48px 24px', color: 'var(--muted-fg)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              No click data yet
            </div>
          ) : (
            <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', minWidth: '400px', height: 'auto', display: 'block' }} role="img" aria-label="Platform click trend">
              <defs>
                <linearGradient id="admin-chart-fade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75, 1].map((r) => (
                <line key={r} x1={0} y1={padY + (1 - r) * (h - padY * 2)} x2={w} y2={padY + (1 - r) * (h - padY * 2)} stroke="var(--border)" strokeWidth="1" />
              ))}
              {pts.length > 1 && (
                <path d={`M ${pts[0].x},${h} ${pts.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${pts[pts.length - 1].x},${h} Z`} fill="url(#admin-chart-fade)" />
              )}
              {polyline && <polyline fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={polyline} />}
              {lastPt && <circle cx={lastPt.x} cy={lastPt.y} r="4" fill="var(--accent)" />}
            </svg>
          )}
        </div>
        {clicksData.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 24px 20px' }}>
            <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--muted-fg)' }}>
              {new Date(clicksData[0].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </span>
            <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--muted-fg)' }}>
              {new Date(clicksData[clicksData.length - 1].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        )}
      </div>

      {/* Tenant Activity + Top Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1px', background: 'var(--border)', marginBottom: '40px' }}>
        {/* Tenant Activity */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '28px' }}>
          <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>Top Tenants</p>
          <p className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)', marginBottom: '20px' }}>Tenant Activity</p>
          {tenantActivity.length === 0 ? (
            <p className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--muted-fg)' }}>No data yet</p>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px 16px', marginBottom: '12px' }}>
                <span className="font-mono" style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)' }}>Tenant</span>
                <span className="font-mono" style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)' }}>Links</span>
                <span className="font-mono" style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)' }}>Clicks</span>
              </div>
              <Divider />
              {tenantActivity.map((t) => (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px 16px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--fg)' }}>{t.name}</div>
                    <div className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--muted-fg)' }}>{t.slug}</div>
                  </div>
                  <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--fg)', fontWeight: 600, alignSelf: 'center' }}>{t.linkCount}</span>
                  <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--fg)', fontWeight: 600, alignSelf: 'center' }}>{t.clickCount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Links */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderLeft: 'none', padding: '28px' }}>
          <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>Most Clicked</p>
          <p className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)', marginBottom: '20px' }}>Top Links</p>
          {topLinks.length === 0 ? (
            <p className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--muted-fg)' }}>No links yet</p>
          ) : (
            <div>
              {topLinks.map((l) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)', gap: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.title || l.shortCode}
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--muted-fg)' }}>
                      /{l.shortCode} · {l.tenant.name}
                    </div>
                  </div>
                  <span className="font-mono" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                    {l.clickCount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Referrers + Browsers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1px', background: 'var(--border)' }}>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '28px' }}>
          <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>Traffic Sources</p>
          <p className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)', marginBottom: '24px' }}>Referrers</p>
          {referrers.length === 0 ? (
            <p className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--muted-fg)' }}>No referrer data</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {referrers.map((r) => {
                const pct = overview.totalClicks > 0 ? (r.count / overview.totalClicks) * 100 : 0;
                return (
                  <div key={r.referrer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--fg)' }}>{r.referrer}</span>
                      <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted-fg)' }}>{r.count.toLocaleString()} · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderLeft: 'none', padding: '28px' }}>
          <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>Visitor Environment</p>
          <p className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)', marginBottom: '24px' }}>Browsers & OS</p>
          <p className="font-mono" style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '12px' }}>Top Browsers</p>
          {devices.browsers.map((b) => (
            <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--fg)' }}>{b.name}</span>
              <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--fg)' }}>{b.count}</span>
            </div>
          ))}
          <Divider />
          <p className="font-mono" style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)', margin: '24px 0 12px' }}>Top OS</p>
          {devices.os.map((o) => (
            <div key={o.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--fg)' }}>{o.name}</span>
              <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--fg)' }}>{o.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
