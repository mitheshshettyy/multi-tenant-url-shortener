import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { MousePointerClick, Link2, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Spinner } from '../components/ui/Spinner';
import { Divider } from '../components/ui/Divider';

interface Overview {
  totalClicks: number;
  totalUrls: number;
  activeUrls: number;
}

interface ClickDay {
  date: string;
  clicks: number;
}

interface Referrer {
  referrer: string;
  count: number;
}

interface BrowserOS {
  browsers: Array<{ name: string; count: number }>;
  os: Array<{ name: string; count: number }>;
}

export const AnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<Overview>({ totalClicks: 0, totalUrls: 0, activeUrls: 0 });
  const [clicksData, setClicksData] = useState<ClickDay[]>([]);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [devices, setDevices] = useState<BrowserOS>({ browsers: [], os: [] });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [ovRes, clRes, refRes, devRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/clicks', { params: { days: 30 } }),
        api.get('/analytics/referrers', { params: { limit: 5 } }),
        api.get('/analytics/user-agents', { params: { limit: 5 } }),
      ]);
      setOverview(ovRes.data);
      setClicksData(clRes.data);
      setReferrers(refRes.data);
      setDevices(devRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // SVG sparkline calculations
  const width = 800;
  const height = 160;
  const padX = 0;
  const padY = 16;
  const maxClicks = Math.max(...clicksData.map((d) => d.clicks), 1);

  const toPoint = (d: ClickDay, i: number) => {
    const x = padX + (i * (width - padX * 2)) / Math.max(clicksData.length - 1, 1);
    const y = height - padY - (d.clicks * (height - padY * 2)) / maxClicks;
    return { x, y };
  };

  const points = clicksData.map(toPoint);
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const lastPoint = points[points.length - 1];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '12px', color: 'var(--muted-fg)' }}>
        <Spinner size={20} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Loading analytics
        </span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <PageHeader
        eyebrow="Tenant Overview"
        title="Analytics"
        subtitle="Aggregate metrics and visitor data across all short URLs in your workspace."
      />

      {/* ── Stat cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1px',
          background: 'var(--border)',
          border: '1px solid var(--border)',
          marginBottom: '40px',
        }}
      >
        <StatCard
          label="Total Clicks"
          value={overview.totalClicks.toLocaleString()}
          ghost={String(Math.floor(overview.totalClicks / 1000) || '0')}
        />
        <StatCard
          label="Total Links"
          value={overview.totalUrls.toLocaleString()}
          ghost={String(overview.totalUrls)}
        />
        <StatCard
          label="Active Links"
          value={overview.activeUrls.toLocaleString()}
          ghost={String(overview.activeUrls)}
        />
      </div>

      {/* ── Sparkline chart ── */}
      <div style={{ border: '1px solid var(--border)', marginBottom: '40px' }}>
        {/* Chart header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 0',
          }}
        >
          <div>
            <p
              className="font-mono"
              style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}
            >
              Clicks over time
            </p>
            <p
              className="font-display"
              style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)' }}
            >
              Last 30 Days
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '24px', height: '2px', background: 'var(--accent)' }} aria-hidden="true" />
            <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--muted-fg)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Clicks
            </span>
          </div>
        </div>

        {/* SVG chart */}
        <div style={{ padding: '16px 0 0', overflowX: 'auto' }}>
          {clicksData.length <= 1 ? (
            <div style={{ padding: '48px 24px', color: 'var(--muted-fg)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              No click data available yet
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={{ width: '100%', minWidth: '400px', height: 'auto', display: 'block' }}
              role="img"
              aria-label="Click trend chart for last 30 days"
            >
              <defs>
                <linearGradient id="chart-fade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1={0}
                  y1={padY + (1 - ratio) * (height - padY * 2)}
                  x2={width}
                  y2={padY + (1 - ratio) * (height - padY * 2)}
                  stroke="var(--border)"
                  strokeWidth="1"
                />
              ))}

              {/* Area fill */}
              {points.length > 1 && (
                <path
                  d={`M ${points[0].x},${height} ${points.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${points[points.length - 1].x},${height} Z`}
                  fill="url(#chart-fade)"
                />
              )}

              {/* Line */}
              {polylinePoints && (
                <polyline
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
              )}

              {/* Terminal dot */}
              {lastPoint && (
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r="4"
                  fill="var(--accent)"
                />
              )}
            </svg>
          )}
        </div>

        {/* Date range labels */}
        {clicksData.length > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 24px 20px',
            }}
          >
            <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--muted-fg)', letterSpacing: '0.08em' }}>
              {new Date(clicksData[0].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </span>
            <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--muted-fg)', letterSpacing: '0.08em' }}>
              {new Date(clicksData[clicksData.length - 1].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        )}
      </div>

      {/* ── Breakdown grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1px', background: 'var(--border)' }}>

        {/* Top Referrers */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '28px' }}>
          <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>
            Traffic Sources
          </p>
          <p className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)', marginBottom: '24px' }}>
            Top Referrers
          </p>

          {referrers.length === 0 ? (
            <p className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--muted-fg)', letterSpacing: '0.05em' }}>No referrer data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {referrers.map((ref) => {
                const pct = overview.totalClicks > 0 ? (ref.count / overview.totalClicks) * 100 : 0;
                return (
                  <div key={ref.referrer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--fg)' }}>
                        {ref.referrer}
                      </span>
                      <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted-fg)', letterSpacing: '0.05em' }}>
                        {ref.count.toLocaleString()} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} aria-hidden="true" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Browsers & OS */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderLeft: 'none', padding: '28px' }}>
          <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>
            Visitor Environment
          </p>
          <p className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--fg)', marginBottom: '24px' }}>
            Browsers & OS
          </p>

          {/* Browsers */}
          <div style={{ marginBottom: '24px' }}>
            <p className="font-mono" style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '12px' }}>
              Top Browsers
            </p>
            {devices.browsers.length === 0 ? (
              <p className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--muted-fg)' }}>No data</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {devices.browsers.map((b) => (
                  <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--fg)' }}>{b.name}</span>
                    <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--fg)' }}>{b.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Divider />

          {/* OS */}
          <div style={{ marginTop: '24px' }}>
            <p className="font-mono" style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '12px' }}>
              Top Operating Systems
            </p>
            {devices.os.length === 0 ? (
              <p className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--muted-fg)' }}>No data</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {devices.os.map((o) => (
                  <div key={o.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--fg)' }}>{o.name}</span>
                    <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--fg)' }}>{o.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
